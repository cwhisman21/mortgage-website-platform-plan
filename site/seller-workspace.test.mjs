import test from "node:test";
import assert from "node:assert/strict";

import {
  applySellerRowEdit,
  calculateSellerNetSheet,
  calculateStatutoryTransferTax,
  calculateSellerProceeds,
  confirmSellerValue,
  createFixtureSellerAdapters,
  defaultExpectedCloseDate,
  formatSellerCurrency,
  normalizeSellerObligations,
  prorateAnnualCents,
  resetSellerAssumptions,
  resolveSellerCostRows,
  resolveSellerAssumptions,
  selectSellerValue,
  setSellerOptionalRow,
} from "./seller-workspace.mjs";

const fixture = {
  addressSuggestions: [
    {
      id: "property-harbor-view",
      displayAddress: "1842 Harbor View Drive, San Diego, CA 92109",
      stateCode: "CA",
      searchTerms: ["1842 harbor", "san diego", "92109"],
    },
    {
      id: "property-barton-springs",
      displayAddress: "915 Barton Springs Road, Austin, TX 78704",
      stateCode: "TX",
      searchTerms: ["915 barton", "austin", "78704"],
    },
  ],
  valuations: {
    "property-harbor-view": {
      propertyId: "property-harbor-view",
      lowCents: 69_500_000,
      baseCents: 72_500_000,
      highCents: 75_500_000,
      asOf: "2026-07-16",
      sourceLabel: "Property value estimate",
      methodologyKey: "property.estimated-value",
    },
  },
  assumptionRegistry: {
    national: {
      stateCode: "US",
      asOf: "2026-07-16",
      sourceLabel: "National seller-cost starting assumptions",
      rows: [
        { id: "agentCompensation", label: "Agent compensation", mode: "percent", value: 0.05 },
        { id: "titleEscrowTransfer", label: "Title, escrow, and transfer costs", mode: "percent", value: 0.015 },
        { id: "repairsConcessions", label: "Repairs and seller concessions", mode: "percent", value: 0.02 },
        { id: "otherSellerCosts", label: "Other seller costs", mode: "fixed", value: 1_387_500 },
      ],
    },
    states: {
      CA: {
        stateCode: "CA",
        asOf: "2026-07-16",
        sourceLabel: "California seller-cost starting assumptions",
        rows: [
          { id: "agentCompensation", label: "Agent compensation", mode: "percent", value: 0.05 },
          { id: "titleEscrowTransfer", label: "Title, escrow, and transfer costs", mode: "percent", value: 0.015 },
          { id: "repairsConcessions", label: "Repairs and seller concessions", mode: "percent", value: 0.02 },
          { id: "otherSellerCosts", label: "Other seller costs", mode: "fixed", value: 1_387_500 },
        ],
      },
    },
  },
  statementExtraction: {
    acceptedTypes: ["application/pdf", "image/png", "image/jpeg"],
    suggestedPayoffCents: 41_800_000,
    statementDate: "2026-07-01",
    sourceFieldLabel: "Unpaid principal balance",
  },
};

test("selectSellerValue clamps and snaps to the valuation range", () => {
  const valuation = { lowCents: 69_500_000, baseCents: 72_500_000, highCents: 75_500_000 };

  assert.deepEqual(selectSellerValue(valuation), {
    lowCents: 69_500_000,
    selectedCents: 72_500_000,
    highCents: 75_500_000,
    stepCents: 100_000,
  });
  assert.equal(selectSellerValue(valuation, 72_560_000).selectedCents, 72_600_000);
  assert.equal(selectSellerValue(valuation, 1).selectedCents, 69_500_000);
  assert.equal(selectSellerValue(valuation, 99_999_999).selectedCents, 75_500_000);
});

test("defaultExpectedCloseDate is thirty local calendar days later", () => {
  assert.equal(defaultExpectedCloseDate(new Date("2026-07-16T12:00:00-07:00")), "2026-08-15");
});

test("normalizeSellerObligations accepts explicit zero balances", () => {
  assert.deepEqual(normalizeSellerObligations({
    firstMortgageCents: 41_800_000,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  }), {
    firstMortgageCents: 41_800_000,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  });
});

test("San Diego transfer tax uses 55 cents per 500 dollars or fraction", () => {
  assert.equal(calculateStatutoryTransferTax({
    taxableCents: 72_500_000,
    incrementCents: 50_000,
    rateCentsPerIncrement: 55,
  }), 79_750);
});

test("annual proration uses UTC calendar days and the closing date", () => {
  assert.equal(prorateAnnualCents({
    annualCents: 870_000,
    periodStartDate: "2026-07-01",
    closingDate: "2026-08-15",
  }), 107_260);
});

test("annual proration rounds a fractional cent at the row level", () => {
  assert.equal(prorateAnnualCents({
    annualCents: 1,
    periodStartDate: "2026-01-01",
    closingDate: "2026-07-03",
  }), 1);
});

test("cost rows prefer city rules and materialize annual tax data", () => {
  const rows = resolveSellerCostRows({
    defaultRows: [{ id: "settlement", group: "sellingExpenses", label: "Settlement", mode: "fixed_amount", value: 100, optional: false }],
    optionalRows: [{ id: "warranty", group: "sellingExpenses", label: "Warranty", mode: "fixed_amount", value: 0, optional: true }],
    jurisdictions: {
      CA: { rows: [{ id: "transfer", group: "sellingExpenses", label: "State tax", mode: "fixed_amount", value: 100, optional: false }] },
      "CA:SAN-DIEGO": { rows: [
        { id: "transfer", group: "sellingExpenses", label: "City tax", mode: "fixed_amount", value: 200, optional: false },
        { id: "proration", group: "obligations", label: "Tax proration", mode: "prorated_annual", valueKey: "annualPropertyTaxCents", periodStartMonthDay: "07-01", optional: false },
      ] },
    },
  }, {
    stateCode: "ca",
    countyKey: "SAN-DIEGO-COUNTY",
    cityKey: "SAN-DIEGO",
    annualPropertyTaxCents: 870_000,
  });

  assert.equal(rows.find((row) => row.id === "transfer").value, 200);
  assert.deepEqual(rows.find((row) => row.id === "proration"), {
    id: "proration",
    group: "obligations",
    label: "Tax proration",
    mode: "prorated_annual",
    periodStartMonthDay: "07-01",
    optional: false,
    annualCents: 870_000,
  });
});

test("net sheet omits inactive optional rows and applies typed overrides", () => {
  const input = {
    valueRange: { lowCents: 10_000_000, selectedCents: 10_000_000, highCents: 10_000_000, stepCents: 100_000 },
    obligations: { firstMortgageCents: 0, secondMortgageHelocCents: 0, otherLiensCents: 0 },
    expectedClosingDate: "2026-08-15",
    costRows: [
      { id: "listing", group: "sellingExpenses", label: "Listing", mode: "percent_of_sale_price", value: 0.025, optional: false },
      { id: "warranty", group: "sellingExpenses", label: "Warranty", mode: "fixed_amount", value: 250_000, optional: true },
    ],
  };

  const hidden = calculateSellerNetSheet({ ...input, activeOptionalIds: [], overrides: {} });
  const active = calculateSellerNetSheet({
    ...input,
    activeOptionalIds: ["warranty"],
    overrides: { listing: { mode: "fixed_amount", value: 100_000 } },
  });

  assert.deepEqual(hidden.groups.sellingExpenses.map((row) => row.id), ["listing"]);
  assert.equal(active.totalSellingExpensesCents, 350_000);
  assert.equal(active.groups.sellingExpenses[0].isOverride, true);
});

test("low selected and high scenarios reuse the same assumptions", () => {
  const result = calculateSellerNetSheet({
    valueRange: { lowCents: 69_500_000, selectedCents: 72_500_000, highCents: 75_500_000, stepCents: 100_000 },
    obligations: { firstMortgageCents: 41_800_000, secondMortgageHelocCents: 2_000_000, otherLiensCents: 500_000 },
    expectedClosingDate: "2026-08-15",
    activeOptionalIds: [],
    overrides: {},
    costRows: [
      { id: "listing", group: "sellingExpenses", label: "Listing-side compensation", mode: "percent_of_sale_price", value: 0.025, optional: false },
      { id: "settlement", group: "sellingExpenses", label: "Seller title, escrow, and settlement services", mode: "fixed_amount", value: 725_000, optional: false },
    ],
  });

  assert.equal(result.scenarios.low.amountCents, 22_737_500);
  assert.equal(result.scenarios.selected.amountCents, 25_662_500);
  assert.equal(result.scenarios.high.amountCents, 28_587_500);
  assert.equal(result.totalSellingExpensesCents, 2_537_500);
  assert.equal(result.totalObligationsCents, 44_300_000);
});

function editableSellerState() {
  const state = {
    valueRange: { lowCents: 69_500_000, selectedCents: 72_500_000, highCents: 75_500_000, stepCents: 100_000 },
    obligations: { firstMortgageCents: 41_800_000, secondMortgageHelocCents: 2_000_000, otherLiensCents: 500_000 },
    expectedClosingDate: "2026-08-15",
    activeOptionalIds: [],
    overrides: {},
    costRows: [
      { id: "listing", group: "sellingExpenses", label: "Listing-side compensation", mode: "percent_of_sale_price", value: 0.025, optional: false },
      { id: "transfer", group: "sellingExpenses", label: "Transfer tax", mode: "statutory_transfer_tax", incrementCents: 50_000, rateCentsPerIncrement: 55, optional: false },
      { id: "proration", group: "obligations", label: "Property-tax proration", mode: "prorated_annual", annualCents: 870_000, periodStartMonthDay: "07-01", optional: false },
      { id: "warranty", group: "sellingExpenses", label: "Home warranty", mode: "fixed_amount", value: 60_000, optional: true },
      { id: "hoaPastDue", group: "obligations", label: "HOA past-due assessments", mode: "fixed_amount", value: 0, optional: true },
    ],
  };
  return { ...state, netSheet: calculateSellerNetSheet(state) };
}

test("applySellerRowEdit converts a displayed percentage and recalculates every scenario", () => {
  const original = editableSellerState();
  const edited = applySellerRowEdit(original, {
    rowId: "listing",
    mode: "percent_of_sale_price",
    value: 3,
  });

  assert.deepEqual(edited.overrides.listing, { mode: "percent_of_sale_price", value: 0.03 });
  assert.equal(edited.netSheet.groups.sellingExpenses[0].amountCents, 2_175_000);
  assert.equal(edited.netSheet.scenarios.low.amountCents - original.netSheet.scenarios.low.amountCents, -347_500);
  assert.equal(edited.netSheet.scenarios.high.amountCents - original.netSheet.scenarios.high.amountCents, -377_500);
  assert.deepEqual(original.overrides, {});
});

test("applySellerRowEdit turns statutory and proration amounts into fixed local overrides", () => {
  const statutory = applySellerRowEdit(editableSellerState(), {
    rowId: "transfer",
    mode: "statutory_transfer_tax",
    value: 123_456,
  });
  const prorated = applySellerRowEdit(statutory, {
    rowId: "proration",
    mode: "prorated_annual",
    value: 222_222,
  });

  assert.deepEqual(prorated.overrides.transfer, { mode: "fixed_amount", value: 123_456 });
  assert.deepEqual(prorated.overrides.proration, { mode: "fixed_amount", value: 222_222 });
  assert.equal(prorated.netSheet.groups.obligations.at(-1).amountCents, 222_222);
});

test("applySellerRowEdit updates confirmed obligations without creating cost overrides", () => {
  const edited = applySellerRowEdit(editableSellerState(), {
    rowId: "secondMortgageHelocPayoff",
    mode: "customer_entered",
    value: 3_250_000,
  });

  assert.equal(edited.obligations.secondMortgageHelocCents, 3_250_000);
  assert.equal(edited.netSheet.groups.obligations[1].amountCents, 3_250_000);
  assert.deepEqual(edited.overrides, {});
});

test("close-date edits clear proration overrides and recalculate from the registry row", () => {
  const overridden = applySellerRowEdit(editableSellerState(), {
    rowId: "proration",
    mode: "prorated_annual",
    value: 222_222,
  });
  const edited = applySellerRowEdit(overridden, {
    rowId: "expectedClosingDate",
    mode: "date",
    value: "2026-09-15",
  });

  assert.equal(edited.expectedClosingDate, "2026-09-15");
  assert.equal(Object.hasOwn(edited.overrides, "proration"), false);
  assert.notEqual(edited.netSheet.groups.obligations.at(-1).amountCents, 222_222);
});

test("sale-price edits reuse the bounded slider rules", () => {
  const edited = applySellerRowEdit(editableSellerState(), {
    rowId: "salePrice",
    mode: "sale_price",
    value: 74_460_000,
  });

  assert.equal(edited.valueRange.selectedCents, 74_500_000);
  assert.equal(edited.netSheet.selectedSalePriceCents, 74_500_000);
});

test("optional rows add to their registry group and removal also clears the override", () => {
  const original = editableSellerState();
  const added = setSellerOptionalRow(original, "hoaPastDue", true);
  const edited = applySellerRowEdit(added, {
    rowId: "hoaPastDue",
    mode: "fixed_amount",
    value: 75_000,
  });
  const removed = setSellerOptionalRow(edited, "hoaPastDue", false);

  assert.deepEqual(added.activeOptionalIds, ["hoaPastDue"]);
  assert.equal(added.netSheet.groups.obligations.at(-1).id, "hoaPastDue");
  assert.deepEqual(edited.overrides.hoaPastDue, { mode: "fixed_amount", value: 75_000 });
  assert.deepEqual(removed.activeOptionalIds, []);
  assert.equal(Object.hasOwn(removed.overrides, "hoaPastDue"), false);
  assert.equal(removed.netSheet.groups.obligations.some((row) => row.id === "hoaPastDue"), false);
  assert.deepEqual(original.activeOptionalIds, []);
});

test("reset clears optional rows and overrides while preserving confirmed seller inputs", () => {
  const address = { id: "property-harbor-view", displayAddress: "1842 Harbor View Drive" };
  const original = {
    ...setSellerOptionalRow(editableSellerState(), "warranty", true),
    address,
  };
  const overridden = applySellerRowEdit(original, {
    rowId: "warranty",
    mode: "fixed_amount",
    value: 80_000,
  });
  const reset = resetSellerAssumptions(overridden);

  assert.deepEqual(reset.activeOptionalIds, []);
  assert.deepEqual(reset.overrides, {});
  assert.equal(reset.address, address);
  assert.equal(reset.valueRange, overridden.valueRange);
  assert.equal(reset.expectedClosingDate, "2026-08-15");
  assert.equal(reset.obligations, overridden.obligations);
  assert.equal(reset.netSheet.groups.sellingExpenses.some((row) => row.id === "warranty"), false);
});

test("fixture adapters return exact matching addresses without mutating fixtures", async () => {
  const original = structuredClone(fixture);
  const adapters = createFixtureSellerAdapters(fixture);

  const results = await adapters.address.search("92109");

  assert.deepEqual(results, [fixture.addressSuggestions[0]]);
  results[0].displayAddress = "changed";
  assert.deepEqual(fixture, original);
});

test("fixture adapters normalize valuation and statement suggestions", async () => {
  const adapters = createFixtureSellerAdapters(fixture);

  const valuation = await adapters.valuation.get("property-harbor-view");
  const statement = await adapters.statement.read({ name: "statement.pdf", type: "application/pdf", size: 250_000 });

  assert.equal(valuation.baseCents, 72_500_000);
  assert.deepEqual(statement, {
    fileName: "statement.pdf",
    status: "suggested",
    suggestedPayoffCents: 41_800_000,
    statementDate: "2026-07-01",
    sourceFieldLabel: "Unpaid principal balance",
  });
  await assert.rejects(
    adapters.statement.read({ name: "statement.txt", type: "text/plain", size: 100 }),
    /supported PDF, PNG, or JPEG/i,
  );
});

test("manual value confirmation preserves the source range relationship", () => {
  const confirmed = confirmSellerValue(fixture.valuations["property-harbor-view"], 80_000_000);

  assert.equal(confirmed.baseCents, 80_000_000);
  assert.equal(confirmed.lowCents, 76_689_655);
  assert.equal(confirmed.highCents, 83_310_345);
  assert.equal(confirmed.isManual, true);
});

test("state assumptions use a controlled national fallback", () => {
  const california = resolveSellerAssumptions(fixture.assumptionRegistry, "ca");
  const fallback = resolveSellerAssumptions(fixture.assumptionRegistry, "NV");

  assert.equal(california.stateCode, "CA");
  assert.equal(california.isFallback, false);
  assert.equal(fallback.stateCode, "US");
  assert.equal(fallback.requestedStateCode, "NV");
  assert.equal(fallback.isFallback, true);
  california.rows[0].value = 9;
  assert.equal(fixture.assumptionRegistry.states.CA.rows[0].value, 0.05);
});

test("proceeds calculate low base and high paths with percent and fixed costs", () => {
  const assumptions = resolveSellerAssumptions(fixture.assumptionRegistry, "CA");
  const result = calculateSellerProceeds({
    values: confirmSellerValue(fixture.valuations["property-harbor-view"]),
    payoffCents: 41_800_000,
    assumptions,
  });

  assert.equal(result.paths.base.salePriceCents, 72_500_000);
  assert.equal(result.paths.base.costs.agentCompensation, 3_625_000);
  assert.equal(result.paths.base.costs.titleEscrowTransfer, 1_087_500);
  assert.equal(result.paths.base.costs.repairsConcessions, 1_450_000);
  assert.equal(result.paths.base.costs.otherSellerCosts, 1_387_500);
  assert.equal(result.paths.base.totalSellingCostsCents, 7_550_000);
  assert.equal(result.paths.base.netCents, 23_150_000);
  assert.equal(result.paths.base.kind, "proceeds");
  assert.ok(result.paths.low.netCents < result.paths.base.netCents);
  assert.ok(result.paths.high.netCents > result.paths.base.netCents);
});

test("a fixed homeowner override applies to every value path", () => {
  const assumptions = resolveSellerAssumptions(fixture.assumptionRegistry, "CA");
  const result = calculateSellerProceeds({
    values: confirmSellerValue(fixture.valuations["property-harbor-view"]),
    payoffCents: 41_800_000,
    assumptions,
    overrides: { agentCompensation: 2_000_000 },
  });

  assert.equal(result.paths.low.costs.agentCompensation, 2_000_000);
  assert.equal(result.paths.base.costs.agentCompensation, 2_000_000);
  assert.equal(result.paths.high.costs.agentCompensation, 2_000_000);
  assert.equal(result.overrides.agentCompensation, 2_000_000);
});

test("calculations round to integer cents and expose a shortfall", () => {
  const result = calculateSellerProceeds({
    values: { lowCents: 10_000_001, baseCents: 10_000_003, highCents: 10_000_005 },
    payoffCents: 11_000_000,
    assumptions: {
      rows: [{ id: "sellingCost", label: "Selling cost", mode: "percent", value: 0.033333 }],
    },
  });

  assert.equal(Number.isInteger(result.paths.base.costs.sellingCost), true);
  assert.equal(result.paths.base.kind, "shortfall");
  assert.equal(result.paths.base.amountCents, Math.abs(result.paths.base.netCents));
});

test("currency formatting accepts cents and preserves signs", () => {
  assert.equal(formatSellerCurrency(23_150_000), "$231,500");
  assert.equal(formatSellerCurrency(-1_234_56), "-$1,234.56");
});

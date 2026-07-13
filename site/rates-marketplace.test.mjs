import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

async function loadMarketplaceModule() {
  return import("./rates-marketplace.mjs");
}

function loadFixture() {
  const source = fs.readFileSync(
    new URL("../mock-data/rates-marketplace-fixtures.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(source);
}

test("resolves each field in URL, account, cache, default order", async () => {
  const { MARKETPLACE_DEFAULTS, resolveScenarioContext } =
    await loadMarketplaceModule();

  const resolved = resolveScenarioContext({
    url: new URLSearchParams("zip=92109&term=15"),
    account: { zip: "78701", creditRange: "740-779" },
    cache: { zip: "33602", occupancy: "secondary" },
    defaults: MARKETPLACE_DEFAULTS,
  });

  assert.equal(resolved.zip, "92109");
  assert.equal(resolved.term, 15);
  assert.equal(resolved.creditRange, "740-779");
  assert.equal(resolved.occupancy, "secondary");
  assert.equal("geolocation" in resolved, false);
});

test("ignores malformed URL fields individually and falls back per field", async () => {
  const { MARKETPLACE_DEFAULTS, resolveScenarioContext } =
    await loadMarketplaceModule();

  const resolved = resolveScenarioContext({
    url: new URLSearchParams(
      "zip=94A12&term=banana&occupancy=spaceship&creditRange=780%2B&showVa=true",
    ),
    account: { zip: "78701", term: 20, occupancy: "primary" },
    cache: { zip: "33602", propertyType: "condo", showVa: false },
    defaults: MARKETPLACE_DEFAULTS,
  });

  assert.equal(resolved.zip, "78701");
  assert.equal(resolved.term, 20);
  assert.equal(resolved.occupancy, "primary");
  assert.equal(resolved.creditRange, "780+");
  assert.equal(resolved.showVa, true);
  assert.equal(resolved.propertyType, "condo");
});

test("preserves purchase and refinance values independently inside one scenario state", async () => {
  const { MARKETPLACE_DEFAULTS, resolveScenarioContext } =
    await loadMarketplaceModule();

  const resolved = resolveScenarioContext({
    url: new URLSearchParams(
      "mortgageType=refinance&propertyValue=880000&loanBalance=510000&cashOut=true",
    ),
    account: {
      purchasePrice: 1060000,
      downPaymentAmount: 212000,
      downPaymentPercent: 20,
    },
    cache: {
      propertyValue: 750000,
      loanBalance: 425000,
      purchasePrice: 980000,
    },
    defaults: MARKETPLACE_DEFAULTS,
  });

  assert.equal(resolved.mortgageType, "refinance");
  assert.equal(resolved.purchasePrice, 1060000);
  assert.equal(resolved.downPaymentAmount, 212000);
  assert.equal(resolved.downPaymentPercent, 20);
  assert.equal(resolved.propertyValue, 880000);
  assert.equal(resolved.loanBalance, 510000);
  assert.equal(resolved.cashOut, true);
});

test("synchronizes down payment dollars and percent in both directions", async () => {
  const { updateDownPayment } = await loadMarketplaceModule();
  const scenario = {
    mortgageType: "purchase",
    purchasePrice: 1060000,
    downPaymentAmount: 212000,
    downPaymentPercent: 20,
  };

  const byPercent = updateDownPayment(scenario, { downPaymentPercent: 10 });
  const byAmount = updateDownPayment(scenario, { downPaymentAmount: 159000 });

  assert.equal(byPercent.downPaymentPercent, 10);
  assert.equal(byPercent.downPaymentAmount, 106000);
  assert.equal(byAmount.downPaymentAmount, 159000);
  assert.equal(byAmount.downPaymentPercent, 15);
});

test("supports valid zero-dollar and zero-percent purchase down payments", async () => {
  const {
    MARKETPLACE_DEFAULTS,
    resolveScenarioContext,
    updateDownPayment,
    validateScenario,
  } = await loadMarketplaceModule();
  const scenario = {
    ...MARKETPLACE_DEFAULTS,
    mortgageType: "purchase",
    purchasePrice: 500000,
    downPaymentAmount: 0,
    downPaymentPercent: 0,
  };

  const resolved = resolveScenarioContext({
    url: new URLSearchParams("purchasePrice=500000&downPaymentAmount=0&downPaymentPercent=0"),
    defaults: MARKETPLACE_DEFAULTS,
  });
  const byAmount = updateDownPayment(scenario, { downPaymentAmount: 0 });
  const validation = validateScenario(scenario);

  assert.equal(resolved.downPaymentAmount, 0);
  assert.equal(resolved.downPaymentPercent, 0);
  assert.equal(byAmount.downPaymentAmount, 0);
  assert.equal(byAmount.downPaymentPercent, 0);
  assert.equal(validation.valid, true);
  assert.equal("downPaymentAmount" in validation.errors, false);
});

test("flags impossible purchase and refinance amounts", async () => {
  const { validateScenario } = await loadMarketplaceModule();

  const purchase = validateScenario({
    mortgageType: "purchase",
    purchasePrice: 500000,
    downPaymentAmount: 600000,
    downPaymentPercent: 120,
    zip: "92109",
    creditRange: "780+",
    term: 30,
    occupancy: "primary",
    propertyType: "singleFamily",
  });
  const refinance = validateScenario({
    mortgageType: "refinance",
    propertyValue: 450000,
    loanBalance: 500000,
    cashOut: false,
    zip: "92109",
    creditRange: "740-779",
    term: 30,
    occupancy: "primary",
    propertyType: "singleFamily",
  });

  assert.equal(purchase.valid, false);
  assert.match(purchase.errors.downPaymentAmount, /cannot exceed purchase price/i);
  assert.equal(refinance.valid, false);
  assert.match(refinance.errors.loanBalance, /cannot exceed property value/i);
});

test("normalizes the fixture contract", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());

  assert.equal(fixture.version, "snap-rates-marketplace-v1");
  assert.equal(fixture.offers.length, 40);
  assert.ok(fixture.disclosure.includes("These sample offers illustrate"));
});

test("rejects duplicate offer ids in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...fixture,
        offers: [
          fixture.offers[0],
          { ...fixture.offers[0] },
        ],
      }),
    /duplicate/i,
  );
});

test("rejects invalid result types in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...fixture,
        offers: [{ ...fixture.offers[0], id: "company-harbor-purchase-30-copy", resultType: "broker" }],
      }),
    /result type/i,
  );
});

test("rejects missing prequalification keys in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...fixture,
        offers: [{ ...fixture.offers[0], id: "company-harbor-purchase-30-copy", prequalKey: "" }],
      }),
    /prequalification key/i,
  );
});

test("rejects invalid headline financial values in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...fixture,
        offers: [{ ...fixture.offers[0], id: "company-harbor-purchase-30-copy", upfrontCost: -1 }],
      }),
    /finite nonnegative/i,
  );
  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...fixture,
        offers: [{ ...fixture.offers[0], id: "company-harbor-purchase-30-copy", rate: Number.NaN }],
      }),
    /finite nonnegative/i,
  );
});

test("rejects invalid nested fee-line amounts in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const rawFixture = loadFixture();

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...rawFixture,
        detailsTemplates: {
          ...rawFixture.detailsTemplates,
          purchaseStandard: {
            ...rawFixture.detailsTemplates.purchaseStandard,
            feeLines: [{ label: "Origination", amount: -25 }],
          },
        },
      }),
    /fee line/i,
  );
  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...rawFixture,
        detailsTemplates: {
          ...rawFixture.detailsTemplates,
          purchaseStandard: {
            ...rawFixture.detailsTemplates.purchaseStandard,
            feeLines: [{ label: "Origination", amount: "NaN" }],
          },
        },
      }),
    /fee line/i,
  );
});

test("rejects invalid nested payment assumptions in the fixture schema", async () => {
  const { normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const rawFixture = loadFixture();

  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...rawFixture,
        paymentAssumptionTemplates: {
          ...rawFixture.paymentAssumptionTemplates,
          purchaseStandard: {
            ...rawFixture.paymentAssumptionTemplates.purchaseStandard,
            homeownersInsurance: -10,
          },
        },
      }),
    /payment assumption/i,
  );
  assert.throws(
    () =>
      normalizeMarketplaceFixture({
        ...rawFixture,
        paymentAssumptionTemplates: {
          ...rawFixture.paymentAssumptionTemplates,
          purchaseStandard: {
            ...rawFixture.paymentAssumptionTemplates.purchaseStandard,
            propertyTax: "oops",
          },
        },
      }),
    /payment assumption/i,
  );
});

test("filters by company or loan officer and applies all six approved sorts", async () => {
  const { MARKETPLACE_DEFAULTS, filterAndSortOffers, normalizeMarketplaceFixture } =
    await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const sorts = {
    lowestEightYearCost: "eightYearCost",
    lowestApr: "apr",
    lowestRate: "rate",
    lowestMonthlyPayment: "principalAndInterest",
    lowestUpfrontCost: "upfrontCost",
    highestRating: "rating",
  };

  const companies = filterAndSortOffers({
    offers: fixture.offers,
    scenario: { ...MARKETPLACE_DEFAULTS, mortgageType: "purchase" },
    resultType: "company",
    sort: "lowestEightYearCost",
  });
  const loanOfficers = filterAndSortOffers({
    offers: fixture.offers,
    scenario: { ...MARKETPLACE_DEFAULTS, mortgageType: "refinance" },
    resultType: "loanOfficer",
    sort: "lowestEightYearCost",
  });

  assert.equal(companies.every((offer) => offer.resultType === "company"), true);
  assert.equal(loanOfficers.every((offer) => offer.resultType === "loanOfficer"), true);
  assert.equal(companies.length >= 10, true);
  assert.equal(loanOfficers.length >= 10, true);

  for (const [sort, field] of Object.entries(sorts)) {
    const results = filterAndSortOffers({
      offers: fixture.offers,
      scenario: { ...MARKETPLACE_DEFAULTS, mortgageType: "purchase" },
      resultType: "company",
      sort,
    });
    const [first, second] = results;
    assert.ok(first);
    assert.ok(second);
    if (sort === "highestRating") {
      assert.ok(first[field] >= second[field], sort);
    } else {
      assert.ok(first[field] <= second[field], sort);
    }
  }
});

test("uses eight-item first-page pagination and exhausts show-more offers", async () => {
  const {
    MARKETPLACE_DEFAULTS,
    createFixtureMarketplaceAdapter,
    normalizeMarketplaceFixture,
  } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const adapter = createFixtureMarketplaceAdapter(fixture);

  const firstPage = adapter.listOffers({
    scenario: { ...MARKETPLACE_DEFAULTS, mortgageType: "purchase" },
    resultType: "company",
    sort: "lowestEightYearCost",
  });
  const secondPage = adapter.listOffers({
    scenario: { ...MARKETPLACE_DEFAULTS, mortgageType: "purchase" },
    resultType: "company",
    sort: "lowestEightYearCost",
    page: 2,
  });

  assert.equal(firstPage.items.length, 8);
  assert.equal(firstPage.hasMore, true);
  assert.equal(secondPage.items.length, 2);
  assert.equal(secondPage.hasMore, false);
  assert.equal(firstPage.total, 10);
});

test("serializes approved state only and parses cache without private fields", async () => {
  const {
    MARKETPLACE_DEFAULTS,
    parseMarketplaceState,
    serializeMarketplaceState,
  } = await loadMarketplaceModule();

  const serialized = serializeMarketplaceState({
    ...MARKETPLACE_DEFAULTS,
    zip: "02108",
    term: 15,
    resultType: "loanOfficer",
    expandedOfferId: "loan-officer-summit-purchase-15",
    annualIncome: 240000,
    email: "hidden@example.com",
    token: "secret",
    geolocation: { lat: 1, lng: 2 },
  });
  const parsed = parseMarketplaceState(
    JSON.stringify({
      ...JSON.parse(serialized),
      occupancy: "secondary",
      name: "Private Borrower",
      ssn: "111-22-3333",
      debtAmount: 14000,
      propertyType: "condo",
      impossible: true,
    }),
  );

  assert.equal(serialized.includes("hidden@example.com"), false);
  assert.equal(parsed.zip, "02108");
  assert.equal(parsed.term, 15);
  assert.equal(parsed.resultType, "loanOfficer");
  assert.equal(parsed.occupancy, "secondary");
  assert.equal(parsed.propertyType, "condo");
  assert.equal("name" in parsed, false);
  assert.equal("ssn" in parsed, false);
  assert.equal("debtAmount" in parsed, false);
  assert.equal("geolocation" in parsed, false);
});

test("summarizes scenarios and builds fixture-only offer, reviews, and prequal handoff records", async () => {
  const {
    createFixtureMarketplaceAdapter,
    normalizeMarketplaceFixture,
    summarizeScenario,
  } = await loadMarketplaceModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const adapter = createFixtureMarketplaceAdapter(fixture);
  const scenario = {
    mortgageType: "purchase",
    zip: "92109",
    purchasePrice: 1060000,
    downPaymentAmount: 212000,
    downPaymentPercent: 20,
    creditRange: "780+",
    term: 30,
    occupancy: "primary",
  };

  const summary = summarizeScenario(scenario);
  const offer = adapter.getOffer("company-harbor-purchase-30");
  const reviews = adapter.getReviews("company-harbor-purchase-30");
  const handoff = adapter.createPrequalHandoff({
    offerId: "company-harbor-purchase-30",
    scenario,
  });

  assert.equal(
    summary,
    "Purchase | 92109 | $1,060,000 price | 20% down | 780+ credit | 30-year | Primary home",
  );
  assert.equal(offer.prequalKey, "fixture-harbor-purchase");
  assert.equal(reviews.readOnly, true);
  assert.equal(Array.isArray(reviews.items), true);
  assert.equal(handoff.offerId, "company-harbor-purchase-30");
  assert.equal(handoff.prequalKey, "fixture-harbor-purchase");
  assert.equal(handoff.scenarioSummary, summary);
});

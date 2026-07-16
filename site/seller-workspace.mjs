const VALUE_KEYS = Object.freeze(["low", "base", "high"]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function integerCents(value, label, { allowZero = true } = {}) {
  const cents = Number(value);
  if (!Number.isFinite(cents) || !Number.isInteger(cents) || cents < 0 || (!allowZero && cents === 0)) {
    throw new Error(`${label} must be a positive integer-cent amount`);
  }
  return cents;
}

function normalizedStateCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizedValuation(value) {
  if (!value || typeof value !== "object") throw new Error("A valuation record is required");
  const valuation = {
    ...clone(value),
    lowCents: integerCents(value.lowCents, "Low value", { allowZero: false }),
    baseCents: integerCents(value.baseCents, "Base value", { allowZero: false }),
    highCents: integerCents(value.highCents, "High value", { allowZero: false }),
  };
  if (valuation.lowCents > valuation.baseCents || valuation.baseCents > valuation.highCents) {
    throw new Error("Valuation amounts must be ordered low, base, and high");
  }
  return valuation;
}

function normalizedAssumptionRow(row) {
  if (!row?.id || !row?.label || !["percent", "fixed"].includes(row.mode)) {
    throw new Error("Each seller-cost assumption requires an id, label, and percent or fixed mode");
  }
  const value = Number(row.value);
  if (!Number.isFinite(value) || value < 0 || (row.mode === "fixed" && !Number.isInteger(value))) {
    throw new Error(`Seller-cost assumption ${row.id} has an invalid value`);
  }
  return { ...clone(row), value };
}

export function createFixtureSellerAdapters(fixture = {}) {
  const suggestions = clone(fixture.addressSuggestions || []);
  const valuations = clone(fixture.valuations || {});
  const statementFixture = clone(fixture.statementExtraction || {});

  return Object.freeze({
    address: Object.freeze({
      async search(query) {
        const needle = String(query || "").trim().toLowerCase();
        if (!needle) return [];
        return clone(suggestions.filter((suggestion) => {
          const haystack = [suggestion.displayAddress, ...(suggestion.searchTerms || [])]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        }));
      },
    }),
    valuation: Object.freeze({
      async get(propertyId) {
        const record = valuations[propertyId];
        return record ? normalizedValuation(record) : null;
      },
    }),
    statement: Object.freeze({
      async read(file) {
        const acceptedTypes = Array.isArray(statementFixture.acceptedTypes)
          ? statementFixture.acceptedTypes
          : [];
        if (!file?.name || !acceptedTypes.includes(file.type)) {
          throw new Error("Choose a supported PDF, PNG, or JPEG mortgage statement");
        }
        return {
          fileName: String(file.name),
          status: "suggested",
          suggestedPayoffCents: integerCents(
            statementFixture.suggestedPayoffCents,
            "Suggested payoff",
            { allowZero: false },
          ),
          statementDate: String(statementFixture.statementDate || ""),
          sourceFieldLabel: String(statementFixture.sourceFieldLabel || "Mortgage payoff"),
        };
      },
    }),
  });
}

export function confirmSellerValue(valuation, baseOverride) {
  const source = normalizedValuation(valuation);
  if (baseOverride === undefined || baseOverride === null || baseOverride === "") {
    return { ...source, isManual: false };
  }

  const baseCents = integerCents(baseOverride, "Confirmed value", { allowZero: false });
  const lowRatio = source.lowCents / source.baseCents;
  const highRatio = source.highCents / source.baseCents;
  return {
    ...source,
    lowCents: Math.round(baseCents * lowRatio),
    baseCents,
    highCents: Math.round(baseCents * highRatio),
    isManual: true,
  };
}

export function resolveSellerAssumptions(registry = {}, stateCode) {
  const requestedStateCode = normalizedStateCode(stateCode);
  const stateRecord = registry.states?.[requestedStateCode];
  const source = stateRecord || registry.national;
  if (!source) throw new Error("Seller-cost assumptions require a national fallback");
  const rows = (source.rows || []).map(normalizedAssumptionRow);
  if (!rows.length) throw new Error("Seller-cost assumptions require at least one cost row");
  const duplicate = rows.find((row, index) => rows.findIndex((candidate) => candidate.id === row.id) !== index);
  if (duplicate) throw new Error(`Duplicate seller-cost assumption ${duplicate.id}`);
  return {
    ...clone(source),
    stateCode: normalizedStateCode(source.stateCode) || "US",
    requestedStateCode,
    rows,
    isFallback: !stateRecord,
  };
}

function costForPath(row, salePriceCents, override) {
  if (override !== undefined) return integerCents(override, `${row.label} override`);
  if (row.mode === "fixed") return integerCents(row.value, row.label);
  return Math.round(salePriceCents * row.value);
}

function calculatePath(key, salePriceCents, payoffCents, rows, overrides) {
  const costs = Object.fromEntries(rows.map((row) => [
    row.id,
    costForPath(row, salePriceCents, overrides[row.id]),
  ]));
  const totalSellingCostsCents = Object.values(costs).reduce((sum, value) => sum + value, 0);
  const netCents = salePriceCents - payoffCents - totalSellingCostsCents;
  return {
    key,
    salePriceCents,
    payoffCents,
    costs,
    totalSellingCostsCents,
    netCents,
    kind: netCents >= 0 ? "proceeds" : "shortfall",
    amountCents: Math.abs(netCents),
  };
}

export function calculateSellerProceeds({ values, payoffCents, assumptions, overrides = {} } = {}) {
  const confirmedValues = {
    lowCents: integerCents(values?.lowCents, "Low estimated value", { allowZero: false }),
    baseCents: integerCents(values?.baseCents, "Base estimated value", { allowZero: false }),
    highCents: integerCents(values?.highCents, "High estimated value", { allowZero: false }),
  };
  if (confirmedValues.lowCents > confirmedValues.baseCents || confirmedValues.baseCents > confirmedValues.highCents) {
    throw new Error("Estimated values must be ordered low, base, and high");
  }
  const normalizedPayoffCents = integerCents(payoffCents, "Mortgage payoff");
  const rows = (assumptions?.rows || []).map(normalizedAssumptionRow);
  if (!rows.length) throw new Error("At least one seller-cost assumption is required");
  const normalizedOverrides = Object.fromEntries(
    Object.entries(overrides || {}).map(([id, value]) => [id, integerCents(value, `${id} override`)]),
  );
  const paths = Object.fromEntries(VALUE_KEYS.map((key) => [
    key,
    calculatePath(key, confirmedValues[`${key}Cents`], normalizedPayoffCents, rows, normalizedOverrides),
  ]));
  const baseRows = rows.map((row) => ({
    ...row,
    amountCents: paths.base.costs[row.id],
    isOverride: Object.hasOwn(normalizedOverrides, row.id),
  }));

  return {
    values: confirmedValues,
    payoffCents: normalizedPayoffCents,
    assumptions: clone(assumptions),
    overrides: normalizedOverrides,
    paths,
    baseRows,
    allocation: {
      payoffCents: normalizedPayoffCents,
      sellingCostsCents: paths.base.totalSellingCostsCents,
      resultCents: paths.base.amountCents,
      resultKind: paths.base.kind,
    },
  };
}

export function formatSellerCurrency(cents) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return "$0";
  const sign = amount < 0 ? "-" : "";
  const absoluteDollars = Math.abs(amount) / 100;
  const hasCents = Math.round(Math.abs(amount)) % 100 !== 0;
  return `${sign}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absoluteDollars)}`;
}

const COST_MODES = new Set([
  "percent_of_sale_price",
  "fixed_amount",
  "statutory_transfer_tax",
  "prorated_annual",
  "customer_entered",
]);
const COST_GROUPS = new Set(["sellingExpenses", "obligations"]);

function positiveInteger(value, label) {
  return integerCents(value, label, { allowZero: false });
}

function decimalRate(value, label) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) throw new Error(`${label} must be a non-negative decimal rate`);
  return rate;
}

function utcDate(value, label) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) throw new Error(`${label} must use YYYY-MM-DD`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() !== Number(match[2]) - 1
    || date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error(`${label} must be a real calendar date`);
  }
  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizedCostRow(row) {
  if (!row?.id || !row.label || !COST_GROUPS.has(row.group) || !COST_MODES.has(row.mode)) {
    throw new Error("Each seller-cost row requires an id, label, group, and supported mode");
  }
  const normalized = { ...clone(row), optional: Boolean(row.optional) };
  if (row.mode === "percent_of_sale_price") normalized.value = decimalRate(row.value, `${row.id} value`);
  if (["fixed_amount", "customer_entered"].includes(row.mode)) {
    normalized.value = integerCents(row.value ?? 0, `${row.id} value`);
  }
  if (row.mode === "statutory_transfer_tax") {
    normalized.incrementCents = positiveInteger(row.incrementCents, `${row.id} increment`);
    normalized.rateCentsPerIncrement = positiveInteger(row.rateCentsPerIncrement, `${row.id} rate`);
  }
  if (row.mode === "prorated_annual") {
    normalized.annualCents = integerCents(row.annualCents, `${row.id} annual amount`);
    if (!/^\d{2}-\d{2}$/.test(String(row.periodStartMonthDay || ""))) {
      throw new Error(`${row.id} requires a tax-period start month and day`);
    }
  }
  return normalized;
}

function normalizedValueRange(valueRange) {
  const range = {
    lowCents: positiveInteger(valueRange?.lowCents, "Low estimated value"),
    selectedCents: positiveInteger(valueRange?.selectedCents, "Selected estimated value"),
    highCents: positiveInteger(valueRange?.highCents, "High estimated value"),
    stepCents: positiveInteger(valueRange?.stepCents, "Value step"),
  };
  if (range.lowCents > range.selectedCents || range.selectedCents > range.highCents) {
    throw new Error("Estimated values must be ordered low, selected, and high");
  }
  return range;
}

function normalizedOverride(override, rowId) {
  if (!override || !["fixed_amount", "percent_of_sale_price"].includes(override.mode)) {
    throw new Error(`${rowId} override must be fixed_amount or percent_of_sale_price`);
  }
  return {
    mode: override.mode,
    value: override.mode === "fixed_amount"
      ? integerCents(override.value, `${rowId} override`)
      : decimalRate(override.value, `${rowId} override`),
  };
}

function periodStartForClosingDate(periodStartMonthDay, closingDate) {
  const [month, day] = periodStartMonthDay.split("-").map(Number);
  const closing = utcDate(closingDate, "Expected closing date");
  let periodStart = new Date(Date.UTC(closing.getUTCFullYear(), month - 1, day));
  if (periodStart.getUTCMonth() !== month - 1 || periodStart.getUTCDate() !== day) {
    throw new Error("Tax-period start month and day must be valid");
  }
  if (periodStart > closing) periodStart = new Date(Date.UTC(closing.getUTCFullYear() - 1, month - 1, day));
  return isoDate(periodStart);
}

function amountForCostRow(row, salePriceCents, expectedClosingDate, override) {
  const effective = override || row;
  if (effective.mode === "fixed_amount") return integerCents(effective.value, `${row.id} amount`);
  if (effective.mode === "percent_of_sale_price") return Math.round(salePriceCents * decimalRate(effective.value, `${row.id} rate`));
  if (effective.mode === "customer_entered") return integerCents(effective.value, `${row.id} amount`);
  if (effective.mode === "statutory_transfer_tax") {
    return calculateStatutoryTransferTax({
      taxableCents: salePriceCents,
      incrementCents: effective.incrementCents,
      rateCentsPerIncrement: effective.rateCentsPerIncrement,
    });
  }
  return prorateAnnualCents({
    annualCents: effective.annualCents,
    periodStartDate: periodStartForClosingDate(effective.periodStartMonthDay, expectedClosingDate),
    closingDate: expectedClosingDate,
  });
}

function resultKind(amountCents) {
  return amountCents >= 0 ? "proceeds" : "shortfall";
}

export function selectSellerValue(valuation, requestedCents, stepCents = 100_000) {
  const source = normalizedValuation(valuation);
  const step = positiveInteger(stepCents, "Value step");
  const requested = requestedCents === undefined || requestedCents === null || requestedCents === ""
    ? source.baseCents
    : positiveInteger(requestedCents, "Selected value");
  const clamped = Math.min(source.highCents, Math.max(source.lowCents, requested));
  const snapped = source.lowCents + Math.round((clamped - source.lowCents) / step) * step;

  return {
    lowCents: source.lowCents,
    selectedCents: Math.min(source.highCents, Math.max(source.lowCents, snapped)),
    highCents: source.highCents,
    stepCents: step,
  };
}

export function defaultExpectedCloseDate(now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) throw new Error("A valid current date is required");
  const closing = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 30);
  return [closing.getFullYear(), String(closing.getMonth() + 1).padStart(2, "0"), String(closing.getDate()).padStart(2, "0")].join("-");
}

export function normalizeSellerObligations(input = {}) {
  return {
    firstMortgageCents: integerCents(input.firstMortgageCents, "First mortgage payoff"),
    secondMortgageHelocCents: integerCents(input.secondMortgageHelocCents, "Second mortgage or HELOC payoff"),
    otherLiensCents: integerCents(input.otherLiensCents, "Other liens"),
  };
}

export function prorateAnnualCents({ annualCents, periodStartDate, closingDate } = {}) {
  const annual = integerCents(annualCents, "Annual amount");
  const start = utcDate(periodStartDate, "Tax-period start date");
  const closing = utcDate(closingDate, "Expected closing date");
  if (closing < start) throw new Error("Expected closing date cannot be before the tax-period start date");
  const nextPeriodStart = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()));
  const elapsedDays = (closing - start) / 86_400_000;
  const periodDays = (nextPeriodStart - start) / 86_400_000;
  return Math.round((annual * elapsedDays) / periodDays);
}

export function calculateStatutoryTransferTax({ taxableCents, incrementCents, rateCentsPerIncrement } = {}) {
  const taxable = integerCents(taxableCents, "Taxable amount");
  const increment = positiveInteger(incrementCents, "Tax increment");
  const rate = positiveInteger(rateCentsPerIncrement, "Tax rate");
  return Math.ceil(taxable / increment) * rate;
}

export function resolveSellerCostRows(registry = {}, location = {}) {
  const stateCode = normalizedStateCode(location.stateCode);
  if (!stateCode) throw new Error("Seller cost rows require a state code");
  const defaultRows = Array.isArray(registry.defaultRows) ? registry.defaultRows : [];
  const optionalRows = Array.isArray(registry.optionalRows) ? registry.optionalRows : [];
  if (!defaultRows.length) throw new Error("Seller cost rows require default rows");

  const rowsById = new Map([...defaultRows, ...optionalRows].map((row) => [row.id, clone(row)]));
  const jurisdictionKeys = [stateCode, `${stateCode}:${location.countyKey || ""}`, `${stateCode}:${location.cityKey || ""}`];
  for (const key of [...new Set(jurisdictionKeys)]) {
    for (const row of registry.jurisdictions?.[key]?.rows || []) rowsById.set(row.id, clone(row));
  }

  return [...rowsById.values()].map((row) => {
    if (row.mode !== "prorated_annual") return normalizedCostRow(row);
    const annualCents = integerCents(location[row.valueKey], `${row.id} annual amount`);
    const { valueKey, ...materialized } = row;
    return normalizedCostRow({ ...materialized, annualCents });
  });
}

export function calculateSellerNetSheet({
  valueRange,
  obligations,
  expectedClosingDate,
  costRows,
  activeOptionalIds = [],
  overrides = {},
} = {}) {
  const range = normalizedValueRange(valueRange);
  const normalizedObligations = normalizeSellerObligations(obligations);
  utcDate(expectedClosingDate, "Expected closing date");
  const activeOptionalIdSet = new Set(activeOptionalIds || []);
  const rows = (costRows || []).map(normalizedCostRow).filter((row) => !row.optional || activeOptionalIdSet.has(row.id));
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  if (rowsById.size !== rows.length) throw new Error("Seller cost rows must use unique ids");
  const normalizedOverrides = Object.fromEntries(Object.entries(overrides || {}).map(([id, override]) => {
    if (!rowsById.has(id)) throw new Error(`Unknown or inactive seller-cost override ${id}`);
    return [id, normalizedOverride(override, id)];
  }));
  const baseObligationRows = [
    { id: "firstMortgagePayoff", label: "First mortgage payoff", amountCents: normalizedObligations.firstMortgageCents, mode: "customer_entered", optional: false, isOverride: false },
    { id: "secondMortgageHelocPayoff", label: "Second mortgage or HELOC payoff", amountCents: normalizedObligations.secondMortgageHelocCents, mode: "customer_entered", optional: false, isOverride: false },
    { id: "otherLiens", label: "Other liens", amountCents: normalizedObligations.otherLiensCents, mode: "customer_entered", optional: false, isOverride: false },
  ];
  const fixedObligationsCents = baseObligationRows.reduce((sum, row) => sum + row.amountCents, 0);

  function scenarioFor(salePriceCents, includeRows = false) {
    const evaluatedRows = rows.map((row) => ({
      id: row.id,
      label: row.label,
      amountCents: amountForCostRow(row, salePriceCents, expectedClosingDate, normalizedOverrides[row.id]),
      mode: row.mode,
      optional: row.optional,
      isOverride: Object.hasOwn(normalizedOverrides, row.id),
    }));
    const sellingExpenses = evaluatedRows.filter((row) => rowsById.get(row.id).group === "sellingExpenses");
    const rowObligations = evaluatedRows.filter((row) => rowsById.get(row.id).group === "obligations");
    const totalSellingExpensesCents = sellingExpenses.reduce((sum, row) => sum + row.amountCents, 0);
    const totalObligationsCents = fixedObligationsCents + rowObligations.reduce((sum, row) => sum + row.amountCents, 0);
    const projectedNetCents = salePriceCents - totalSellingExpensesCents - totalObligationsCents;
    const scenario = {
      salePriceCents,
      kind: resultKind(projectedNetCents),
      amountCents: Math.abs(projectedNetCents),
    };
    return includeRows ? { scenario, sellingExpenses, obligations: [...baseObligationRows, ...rowObligations], totalSellingExpensesCents, totalObligationsCents, projectedNetCents } : scenario;
  }

  const selected = scenarioFor(range.selectedCents, true);
  return {
    selectedSalePriceCents: range.selectedCents,
    groups: {
      sellingExpenses: selected.sellingExpenses,
      obligations: selected.obligations,
    },
    totalSellingExpensesCents: selected.totalSellingExpensesCents,
    netBeforeObligationsCents: range.selectedCents - selected.totalSellingExpensesCents,
    totalObligationsCents: selected.totalObligationsCents,
    projected: {
      kind: resultKind(selected.projectedNetCents),
      amountCents: Math.abs(selected.projectedNetCents),
    },
    scenarios: {
      low: scenarioFor(range.lowCents),
      selected: selected.scenario,
      high: scenarioFor(range.highCents),
    },
  };
}

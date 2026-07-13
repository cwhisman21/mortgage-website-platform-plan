const ALLOWED_VALUES = {
  mortgageType: ["purchase", "refinance"],
  resultType: ["company", "loanOfficer"],
  sort: [
    "lowestEightYearCost",
    "lowestApr",
    "lowestRate",
    "lowestMonthlyPayment",
    "lowestUpfrontCost",
    "highestRating",
  ],
  creditRange: ["620-679", "680-719", "720-739", "740-779", "780+"],
  term: [10, 15, 20, 30],
  occupancy: ["primary", "secondary", "rental"],
  propertyType: ["singleFamily", "condo", "townhome", "multiFamily"],
  dti: ["below40", "40plus"],
  points: ["all", "0", "0-1", "1-2"],
};

const SORT_FIELD_MAP = {
  lowestEightYearCost: { field: "eightYearCost", direction: "asc" },
  lowestApr: { field: "apr", direction: "asc" },
  lowestRate: { field: "rate", direction: "asc" },
  lowestMonthlyPayment: { field: "principalAndInterest", direction: "asc" },
  lowestUpfrontCost: { field: "upfrontCost", direction: "asc" },
  highestRating: { field: "rating", direction: "desc" },
};

const STATE_FIELD_ORDER = [
  "mortgageType",
  "zip",
  "creditRange",
  "term",
  "showFha",
  "showVa",
  "dti",
  "points",
  "propertyType",
  "occupancy",
  "purchasePrice",
  "downPaymentAmount",
  "downPaymentPercent",
  "propertyValue",
  "loanBalance",
  "cashOut",
  "sort",
  "resultType",
  "visibleCount",
  "expandedOfferId",
  "expandedTab",
];

const PRIVATE_FIELD_DENYLIST = new Set([
  "name",
  "email",
  "phone",
  "ssn",
  "dateOfBirth",
  "income",
  "annualIncome",
  "assetValue",
  "debtAmount",
  "token",
  "authToken",
  "geolocation",
]);

const DEFAULT_VISIBLE_COUNT = 8;
const DEFAULT_EXPANDED_TAB = "details";
const EMPTY_DISTRIBUTION = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

export const MARKETPLACE_DEFAULTS = Object.freeze({
  mortgageType: "purchase",
  zip: "92109",
  creditRange: "780+",
  term: 30,
  showFha: true,
  showVa: true,
  dti: "below40",
  points: "all",
  propertyType: "singleFamily",
  occupancy: "primary",
  purchasePrice: 1060000,
  downPaymentAmount: 212000,
  downPaymentPercent: 20,
  propertyValue: 880000,
  loanBalance: 510000,
  cashOut: false,
  sort: "lowestEightYearCost",
  resultType: "company",
  visibleCount: DEFAULT_VISIBLE_COUNT,
  expandedOfferId: null,
  expandedTab: DEFAULT_EXPANDED_TAB,
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isAllowed(field, value) {
  return ALLOWED_VALUES[field].includes(value);
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return undefined;
}

function parseCurrency(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return undefined;
  const normalized = Number(value.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(normalized) ? Math.round(normalized) : undefined;
}

function parsePercentage(value) {
  if (typeof value === "number" && Number.isFinite(value)) return roundTo(value, 2);
  if (typeof value !== "string") return undefined;
  const normalized = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(normalized) ? roundTo(normalized, 2) : undefined;
}

function parsePositiveInt(value) {
  const normalized = parseCurrency(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : undefined;
}

function parseNonNegativeInt(value) {
  const normalized = parseCurrency(value);
  return Number.isInteger(normalized) && normalized >= 0 ? normalized : undefined;
}

function parseZip(value) {
  if (typeof value !== "string") return undefined;
  return /^\d{5}$/.test(value) ? value : undefined;
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseField(field, value) {
  if (value == null) return undefined;
  switch (field) {
    case "mortgageType":
    case "creditRange":
    case "occupancy":
    case "propertyType":
    case "dti":
    case "points":
    case "sort":
    case "resultType":
      return isAllowed(field, value) ? value : undefined;
    case "term":
      return isAllowed("term", Number(value)) ? Number(value) : undefined;
    case "showFha":
    case "showVa":
    case "cashOut":
      return parseBoolean(value);
    case "purchasePrice":
    case "propertyValue":
    case "loanBalance":
      return parsePositiveInt(value);
    case "downPaymentAmount":
      return parseNonNegativeInt(value);
    case "downPaymentPercent": {
      const percent = parsePercentage(value);
      return percent != null && percent >= 0 && percent <= 100 ? percent : undefined;
    }
    case "zip":
      return parseZip(value);
    case "visibleCount": {
      const count = parsePositiveInt(value);
      return count != null ? count : undefined;
    }
    case "expandedOfferId":
      return typeof value === "string" && value.trim() ? value : undefined;
    case "expandedTab":
      return ["details", "payment", "reviews"].includes(value) ? value : undefined;
    default:
      return undefined;
  }
}

function getSourceValue(source, field) {
  if (!source) return undefined;
  if (source instanceof URLSearchParams) return source.get(field);
  return source[field];
}

function normalizeStateRecord(raw) {
  const normalized = {};
  for (const field of STATE_FIELD_ORDER) {
    const parsed = parseField(field, raw[field]);
    if (parsed !== undefined) normalized[field] = parsed;
  }
  return normalized;
}

function formatCurrency(value) {
  return `$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPercent(value) {
  return Number.isInteger(value) ? String(value) : roundTo(value, 2).toString();
}

function offerMatchesPoints(pointsValue, bucket) {
  if (bucket === "all") return true;
  if (bucket === "0") return pointsValue === 0;
  if (bucket === "0-1") return pointsValue >= 0 && pointsValue <= 1;
  if (bucket === "1-2") return pointsValue > 1 && pointsValue <= 2;
  return true;
}

function assertFiniteNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite nonnegative number.`);
  }
}

function normalizeNonNegativeNumber(value, label) {
  const normalized = Number(value);
  assertFiniteNonNegative(normalized, label);
  return normalized;
}

function materializeTemplateRecord(record, templates, fallbackKey) {
  if (record && typeof record === "object") {
    return clone(record);
  }
  if (typeof fallbackKey === "string" && templates?.[fallbackKey]) {
    return clone(templates[fallbackKey]);
  }
  return undefined;
}

function normalizeOffer(rawOffer, templates = {}) {
  const offer = clone(rawOffer);
  if (!offer?.id) throw new Error("Marketplace offer is missing an id.");
  if (!isAllowed("resultType", offer.resultType)) {
    throw new Error(`Marketplace offer ${offer.id} has an invalid result type.`);
  }
  if (!isAllowed("mortgageType", offer.mortgageType)) {
    throw new Error(`Marketplace offer ${offer.id} has an invalid mortgage type.`);
  }
  if (!offer.prequalKey || typeof offer.prequalKey !== "string") {
    throw new Error(`Marketplace offer ${offer.id} is missing a prequalification key.`);
  }

  for (const field of [
    "rate",
    "apr",
    "points",
    "principalAndInterest",
    "upfrontCost",
    "eightYearCost",
    "rating",
    "reviewCount",
  ]) {
    assertFiniteNonNegative(offer[field], `Marketplace offer ${offer.id} ${field}`);
  }

  if (!ALLOWED_VALUES.term.includes(Number(offer.term))) {
    throw new Error(`Marketplace offer ${offer.id} has an invalid term.`);
  }

  offer.propertyTypes = Array.isArray(offer.propertyTypes)
    ? offer.propertyTypes.filter((value) => isAllowed("propertyType", value))
    : [...ALLOWED_VALUES.propertyType];
  offer.occupancyTypes = Array.isArray(offer.occupancyTypes)
    ? offer.occupancyTypes.filter((value) => isAllowed("occupancy", value))
    : [...ALLOWED_VALUES.occupancy];
  offer.dtiBands = Array.isArray(offer.dtiBands)
    ? offer.dtiBands.filter((value) => isAllowed("dti", value))
    : [...ALLOWED_VALUES.dti];

  offer.details =
    materializeTemplateRecord(offer.details, templates.detailsTemplates, offer.detailsKey) || {
      summary: "",
      feeLines: [],
      footnotes: [],
      assumptions: [],
    };
  offer.details.feeLines = Array.isArray(offer.details.feeLines)
    ? offer.details.feeLines.map((line, index) => ({
        label: line.label,
        amount: normalizeNonNegativeNumber(
          line.amount,
          `Marketplace offer ${offer.id} fee line ${index + 1} amount`,
        ),
      }))
    : [];
  offer.details.footnotes = Array.isArray(offer.details.footnotes)
    ? offer.details.footnotes
    : [];
  offer.details.assumptions = Array.isArray(offer.details.assumptions)
    ? offer.details.assumptions
    : [];

  const paymentAssumptions =
    materializeTemplateRecord(
      offer.paymentAssumptions,
      templates.paymentAssumptionTemplates,
      offer.paymentAssumptionsKey,
    ) || {};
  offer.paymentAssumptions = {
    homeownersInsurance: normalizeNonNegativeNumber(
      paymentAssumptions.homeownersInsurance ?? 0,
      `Marketplace offer ${offer.id} payment assumption homeownersInsurance`,
    ),
    propertyTax: normalizeNonNegativeNumber(
      paymentAssumptions.propertyTax ?? 0,
      `Marketplace offer ${offer.id} payment assumption propertyTax`,
    ),
    hoaDues: normalizeNonNegativeNumber(
      paymentAssumptions.hoaDues ?? 0,
      `Marketplace offer ${offer.id} payment assumption hoaDues`,
    ),
    mortgageInsurance: normalizeNonNegativeNumber(
      paymentAssumptions.mortgageInsurance ?? 0,
      `Marketplace offer ${offer.id} payment assumption mortgageInsurance`,
    ),
  };

  const reviewTemplate =
    materializeTemplateRecord(offer.reviews, templates.reviewTemplates, offer.reviewsKey) || {};
  offer.reviews = {
    readOnly: true,
    source: reviewTemplate.source || "Fixture review data for sample marketplace display.",
    aggregateRating: Number(reviewTemplate.aggregateRating ?? offer.rating),
    distribution: {
      ...EMPTY_DISTRIBUTION,
      ...(reviewTemplate.distribution || {}),
    },
    items: Array.isArray(reviewTemplate.items)
      ? reviewTemplate.items.map((item, index) => ({
          id: item.id || `${offer.id}-review-${index + 1}`,
          ...item,
        }))
      : [],
  };

  return offer;
}

export function normalizeMarketplaceFixture(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Marketplace fixture must be an object.");
  }
  if (raw.version !== "snap-rates-marketplace-v1") {
    throw new Error("Marketplace fixture version must be snap-rates-marketplace-v1.");
  }
  if (typeof raw.disclosure !== "string" || !raw.disclosure.trim()) {
    throw new Error("Marketplace fixture disclosure is required.");
  }
  if (!Array.isArray(raw.offers)) {
    throw new Error("Marketplace fixture offers must be an array.");
  }

  const ids = new Set();
  const templates = {
    detailsTemplates: raw.detailsTemplates || {},
    paymentAssumptionTemplates: raw.paymentAssumptionTemplates || {},
    reviewTemplates: raw.reviewTemplates || {},
  };
  const offers = raw.offers.map((offer) => {
    if (ids.has(offer.id)) {
      throw new Error(`Marketplace fixture contains duplicate offer id ${offer.id}.`);
    }
    ids.add(offer.id);
    return normalizeOffer(offer, templates);
  });

  return {
    version: raw.version,
    disclosure: raw.disclosure,
    sampleOfferDisclosure: raw.sampleOfferDisclosure || "",
    allowedValues: clone(raw.allowedValues || ALLOWED_VALUES),
    offers,
  };
}

export function resolveScenarioContext({
  url,
  account,
  cache,
  defaults = MARKETPLACE_DEFAULTS,
} = {}) {
  const fallbackDefaults = normalizeStateRecord({
    ...MARKETPLACE_DEFAULTS,
    ...normalizeStateRecord(defaults),
  });
  const resolved = {};

  for (const field of STATE_FIELD_ORDER) {
    const value =
      parseField(field, getSourceValue(url, field)) ??
      parseField(field, account?.[field]) ??
      parseField(field, cache?.[field]) ??
      parseField(field, fallbackDefaults[field]) ??
      parseField(field, MARKETPLACE_DEFAULTS[field]);

    if (value !== undefined) {
      resolved[field] = value;
    }
  }

  if (resolved.mortgageType === "purchase") {
    if (resolved.purchasePrice && resolved.downPaymentPercent != null && resolved.downPaymentAmount == null) {
      Object.assign(
        resolved,
        updateDownPayment(resolved, { downPaymentPercent: resolved.downPaymentPercent }),
      );
    } else if (resolved.purchasePrice && resolved.downPaymentAmount != null && resolved.downPaymentPercent == null) {
      Object.assign(
        resolved,
        updateDownPayment(resolved, { downPaymentAmount: resolved.downPaymentAmount }),
      );
    }
  }

  delete resolved.geolocation;
  return resolved;
}

export function validateScenario(scenario = {}) {
  const errors = {};
  const mortgageType = parseField("mortgageType", scenario.mortgageType) ?? MARKETPLACE_DEFAULTS.mortgageType;

  if (!parseField("zip", scenario.zip)) {
    errors.zip = "Enter a valid 5-digit ZIP code.";
  }
  if (!parseField("creditRange", scenario.creditRange)) {
    errors.creditRange = "Choose a valid credit range.";
  }
  if (!parseField("term", scenario.term)) {
    errors.term = "Choose a valid loan term.";
  }
  if (!parseField("occupancy", scenario.occupancy)) {
    errors.occupancy = "Choose a valid property use.";
  }
  if (!parseField("propertyType", scenario.propertyType)) {
    errors.propertyType = "Choose a valid property type.";
  }

  if (mortgageType === "purchase") {
    if (!parsePositiveInt(scenario.purchasePrice)) {
      errors.purchasePrice = "Enter a purchase price greater than zero.";
    }
    if (parseNonNegativeInt(scenario.downPaymentAmount) == null) {
      errors.downPaymentAmount = "Enter a down payment amount greater than or equal to zero.";
    }
    if (parseField("downPaymentPercent", scenario.downPaymentPercent) == null) {
      errors.downPaymentPercent = "Enter a valid down payment percent.";
    }
    if (
      parsePositiveInt(scenario.purchasePrice) != null &&
      parseNonNegativeInt(scenario.downPaymentAmount) != null &&
      scenario.downPaymentAmount > scenario.purchasePrice
    ) {
      errors.downPaymentAmount = "Down payment amount cannot exceed purchase price.";
    }
  }

  if (mortgageType === "refinance") {
    if (!parsePositiveInt(scenario.propertyValue)) {
      errors.propertyValue = "Enter a property value greater than zero.";
    }
    if (!parsePositiveInt(scenario.loanBalance)) {
      errors.loanBalance = "Enter a loan balance greater than zero.";
    }
    if (
      parsePositiveInt(scenario.propertyValue) != null &&
      parsePositiveInt(scenario.loanBalance) != null &&
      scenario.loanBalance > scenario.propertyValue
    ) {
      errors.loanBalance = "Loan balance cannot exceed property value.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function updateDownPayment(scenario = {}, change = {}) {
  const purchasePrice = parsePositiveInt(scenario.purchasePrice);
  if (!purchasePrice) return { ...scenario };

  if (change.downPaymentPercent != null) {
    const downPaymentPercent = parseField("downPaymentPercent", change.downPaymentPercent);
    if (downPaymentPercent == null) return { ...scenario };
    return {
      ...scenario,
      downPaymentPercent,
      downPaymentAmount: Math.round((purchasePrice * downPaymentPercent) / 100),
    };
  }

  if (change.downPaymentAmount != null) {
    const downPaymentAmount = parseNonNegativeInt(change.downPaymentAmount);
    if (downPaymentAmount == null) return { ...scenario };
    return {
      ...scenario,
      downPaymentAmount,
      downPaymentPercent: roundTo((downPaymentAmount / purchasePrice) * 100, 2),
    };
  }

  return { ...scenario };
}

export function filterAndSortOffers({
  offers = [],
  scenario = MARKETPLACE_DEFAULTS,
  resultType = MARKETPLACE_DEFAULTS.resultType,
  sort = MARKETPLACE_DEFAULTS.sort,
} = {}) {
  const normalizedResultType =
    parseField("resultType", resultType) ?? MARKETPLACE_DEFAULTS.resultType;
  const normalizedSort = parseField("sort", sort) ?? MARKETPLACE_DEFAULTS.sort;
  const normalizedScenario = resolveScenarioContext({
    account: scenario,
    defaults: MARKETPLACE_DEFAULTS,
  });
  const sortConfig = SORT_FIELD_MAP[normalizedSort];

  return offers
    .filter((offer) => offer.resultType === normalizedResultType)
    .filter((offer) => offer.mortgageType === normalizedScenario.mortgageType)
    .filter((offer) => Number(offer.term) === normalizedScenario.term)
    .filter((offer) => offer.propertyTypes.includes(normalizedScenario.propertyType))
    .filter((offer) => offer.occupancyTypes.includes(normalizedScenario.occupancy))
    .filter((offer) => offer.dtiBands.includes(normalizedScenario.dti))
    .filter((offer) => normalizedScenario.showFha || offer.loanFamily !== "fha")
    .filter((offer) => normalizedScenario.showVa || offer.loanFamily !== "va")
    .filter((offer) => offerMatchesPoints(offer.points, normalizedScenario.points))
    .sort((left, right) => {
      const leftValue = left[sortConfig.field];
      const rightValue = right[sortConfig.field];
      if (leftValue === rightValue) return left.id.localeCompare(right.id);
      if (sortConfig.direction === "desc") return rightValue - leftValue;
      return leftValue - rightValue;
    });
}

export function summarizeScenario(scenario = {}) {
  const mortgageType = scenario.mortgageType === "refinance" ? "Refinance" : "Purchase";
  const occupancyLabel = {
    primary: "Primary home",
    secondary: "Second home",
    rental: "Investment property",
  }[scenario.occupancy] || "Primary home";

  if (scenario.mortgageType === "refinance") {
    return [
      mortgageType,
      scenario.zip,
      `${formatCurrency(scenario.propertyValue)} value`,
      `${formatCurrency(scenario.loanBalance)} loan balance`,
      `${scenario.creditRange} credit`,
      `${scenario.term}-year`,
      occupancyLabel,
    ].join(" | ");
  }

  return [
    mortgageType,
    scenario.zip,
    `${formatCurrency(scenario.purchasePrice)} price`,
    `${formatPercent(scenario.downPaymentPercent)}% down`,
    `${scenario.creditRange} credit`,
    `${scenario.term}-year`,
    occupancyLabel,
  ].join(" | ");
}

export function serializeMarketplaceState(state = {}) {
  const sanitized = {};
  for (const field of STATE_FIELD_ORDER) {
    const parsed = parseField(field, state[field]);
    if (parsed !== undefined) {
      sanitized[field] = parsed;
    }
  }
  for (const deniedField of PRIVATE_FIELD_DENYLIST) {
    delete sanitized[deniedField];
  }
  return JSON.stringify(sanitized);
}

export function parseMarketplaceState(value) {
  let parsedValue = value;
  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!parsedValue || typeof parsedValue !== "object") {
    return {};
  }

  const sanitized = {};
  for (const field of STATE_FIELD_ORDER) {
    if (PRIVATE_FIELD_DENYLIST.has(field)) continue;
    const parsed = parseField(field, parsedValue[field]);
    if (parsed !== undefined) {
      sanitized[field] = parsed;
    }
  }
  return sanitized;
}

export function createFixtureMarketplaceAdapter(fixture) {
  const normalizedFixture = normalizeMarketplaceFixture(fixture);
  const offersById = new Map(normalizedFixture.offers.map((offer) => [offer.id, offer]));

  return {
    listOffers(query = {}) {
      const page = parsePositiveInt(query.page) ?? 1;
      const pageSize = parsePositiveInt(query.pageSize) ?? DEFAULT_VISIBLE_COUNT;
      const allItems = filterAndSortOffers({
        offers: normalizedFixture.offers,
        scenario: query.scenario || MARKETPLACE_DEFAULTS,
        resultType: query.resultType,
        sort: query.sort,
      });
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        items: clone(allItems.slice(start, end)),
        total: allItems.length,
        page,
        pageSize,
        hasMore: end < allItems.length,
      };
    },

    getOffer(id) {
      return clone(offersById.get(id) || null);
    },

    getReviews(id) {
      const offer = offersById.get(id);
      if (!offer) {
        return {
          readOnly: true,
          source: "",
          aggregateRating: 0,
          distribution: clone(EMPTY_DISTRIBUTION),
          items: [],
        };
      }
      return clone(offer.reviews);
    },

    createPrequalHandoff({ offerId, scenario }) {
      const offer = offersById.get(offerId);
      if (!offer) return null;
      const resolvedScenario = resolveScenarioContext({
        account: scenario,
        defaults: MARKETPLACE_DEFAULTS,
      });

      return {
        offerId: offer.id,
        prequalKey: offer.prequalKey,
        resultType: offer.resultType,
        displayName: offer.displayName,
        profileRoute: offer.profileRoute,
        productLabel: offer.productLabel,
        rate: offer.rate,
        apr: offer.apr,
        points: offer.points,
        principalAndInterest: offer.principalAndInterest,
        upfrontCost: offer.upfrontCost,
        eightYearCost: offer.eightYearCost,
        scenario: clone(parseMarketplaceState(serializeMarketplaceState(resolvedScenario))),
        scenarioSummary: summarizeScenario(resolvedScenario),
      };
    },
  };
}

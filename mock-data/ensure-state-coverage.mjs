import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mockDataDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(mockDataDir, "production-seed.json");
const manifestPath = path.join(mockDataDir, "national-location-source-manifest.json");
const requiredAbbreviations = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

const missingStates = [
  {
    id: "state-vt",
    name: "Vermont",
    abbr: "VT",
    route: "/locations/vermont",
    stateNarrative: "Vermont borrowers can compare local price, payment, property tax, insurance, and loan options before choosing a mortgage path.",
    cityIds: [],
    branchIds: [],
    featuredProductIds: ["product-conventional", "product-fha", "product-va", "product-refinance"],
    marketSnapshot: {
      medianHomePrice: "$385K",
      paymentScenario: "$2,640/mo",
      inventory: "3.4 months",
      propertyTaxContext: "Local tax assumptions vary by city and county",
      insuranceContext: "Insurance assumptions should be confirmed before choosing a path",
      lastUpdated: "2026-07-10",
    },
    newsArticleIds: [],
  },
  {
    id: "state-wv",
    name: "West Virginia",
    abbr: "WV",
    route: "/locations/west-virginia",
    stateNarrative: "West Virginia borrowers can compare local price, payment, property tax, insurance, and loan options before choosing a mortgage path.",
    cityIds: [],
    branchIds: [],
    featuredProductIds: ["product-conventional", "product-fha", "product-va", "product-refinance"],
    marketSnapshot: {
      medianHomePrice: "$215K",
      paymentScenario: "$1,470/mo",
      inventory: "3.4 months",
      propertyTaxContext: "Local tax assumptions vary by city and county",
      insuranceContext: "Insurance assumptions should be confirmed before choosing a path",
      lastUpdated: "2026-07-10",
    },
    newsArticleIds: [],
  },
];

const missingStateModules = [
  ["state-vt", "Vermont", "/locations/vermont", "product-conventional", "conventional", "Conventional loans", "#conventional-loans"],
  ["state-vt", "Vermont", "/locations/vermont", "product-fha", "fha", "FHA loans", "#fha-loans"],
  ["state-wv", "West Virginia", "/locations/west-virginia", "product-conventional", "conventional", "Conventional loans", "#conventional-loans"],
  ["state-wv", "West Virginia", "/locations/west-virginia", "product-fha", "fha", "FHA loans", "#fha-loans"],
].map(([stateId, stateName, parentPageRoute, productId, productSlug, productName, anchor]) => ({
  id: `module-${stateId.replace("state-", "")}-${productSlug}`,
  name: `${productName} in ${stateName}`,
  parentPageRoute,
  anchor,
  stateId,
  cityId: null,
  productId,
  generated: true,
}));

function assertCompleteCoverage(states) {
  const present = new Set(states.map((state) => state.abbr));
  if (present.size !== requiredAbbreviations.size || [...requiredAbbreviations].some((abbr) => !present.has(abbr))) {
    throw new Error("State coverage must include all 50 states and the District of Columbia.");
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const [seedSource, manifestSource] = await Promise.all([
  fs.readFile(seedPath, "utf8"),
  fs.readFile(manifestPath, "utf8"),
]);
const seed = JSON.parse(seedSource);
const manifest = JSON.parse(manifestSource);
const existingAbbreviations = new Set(seed.states.map((state) => state.abbr));
const additions = missingStates.filter((state) => !existingAbbreviations.has(state.abbr));
const existingModuleIds = new Set((seed.locationProductModules || []).map((module) => module.id));
const moduleAdditions = missingStateModules.filter((module) => !existingModuleIds.has(module.id));

if (additions.length || moduleAdditions.length) {
  seed.states = [...seed.states, ...additions].sort((left, right) => left.name.localeCompare(right.name));
  seed.locationProductModules = [...(seed.locationProductModules || []), ...moduleAdditions];
  seed.recommendedCounts = { ...seed.recommendedCounts, states: 51 };
  seed.recommendedCounts.locationProductModules = seed.locationProductModules.length;
  manifest.states = 51;
  manifest.pageCoverageStates = 51;
  manifest.statesWithoutCityProper50k = ["VT", "WV"];
  assertCompleteCoverage(seed.states);
  await Promise.all([writeJson(seedPath, seed), writeJson(manifestPath, manifest)]);
  console.log(`Added ${additions.map((state) => state.abbr).join(", ") || "the missing state modules"} and confirmed 51 state and District of Columbia routes.`);
} else {
  assertCompleteCoverage(seed.states);
  console.log("All 50 states and the District of Columbia are already covered; no files changed.");
}

import { createVerifiedMediaManifest } from "../../location-news/lib/media.mjs";

function metric(estimate, marginOfError, variableOrSeriesId, geographyType, geographyId, period = "2024") {
  return {
    estimate,
    marginOfError,
    variableOrSeriesId,
    dataset: "Census ACS 5-year detailed tables",
    geographyType,
    geographyId,
    period,
    sourceUrl: `https://api.census.gov/data/${period}/acs/acs5`,
  };
}

const cityMetrics = {
  population: metric(967862, 18, "B01003_001E", "place", "4805000"),
  medianHouseholdIncome: metric(91761, 1634, "B19013_001E", "place", "4805000"),
  totalHousingUnits: metric(448091, 1840, "B25001_001E", "place", "4805000"),
  occupiedUnits: metric(414920, 2401, "B25002_002E", "place", "4805000"),
  vacantUnits: metric(33171, 2401, "B25002_003E", "place", "4805000"),
  ownerOccupiedUnits: metric(184450, 2900, "B25003_002E", "place", "4805000"),
  renterOccupiedUnits: metric(230470, 2900, "B25003_003E", "place", "4805000"),
  medianGrossRent: metric(1729, 31, "B25064_001E", "place", "4805000"),
  medianHomeValue: metric(555300, 11734, "B25077_001E", "place", "4805000"),
  medianOwnerCostWithMortgage: metric(2487, 54, "B25103_001E", "place", "4805000"),
};

const priorCityMetrics = Object.fromEntries(
  Object.entries(cityMetrics).map(([key, value]) => [key, { ...value, estimate: Math.round(value.estimate * 0.84), period: "2019", sourceUrl: "https://api.census.gov/data/2019/acs/acs5" }]),
);

const stateMetrics = {
  population: metric(30503301, 1000, "B01003_001E", "state", "48"),
  medianHouseholdIncome: metric(76987, 320, "B19013_001E", "state", "48"),
  totalHousingUnits: metric(12290000, 5000, "B25001_001E", "state", "48"),
  occupiedUnits: metric(11210000, 6000, "B25002_002E", "state", "48"),
  vacantUnits: metric(1080000, 6000, "B25002_003E", "state", "48"),
  ownerOccupiedUnits: metric(6990000, 8000, "B25003_002E", "state", "48"),
  renterOccupiedUnits: metric(4220000, 8000, "B25003_003E", "state", "48"),
  medianGrossRent: metric(1463, 12, "B25064_001E", "state", "48"),
  medianHomeValue: metric(303800, 2200, "B25077_001E", "state", "48"),
  medianOwnerCostWithMortgage: metric(2074, 21, "B25103_001E", "state", "48"),
};

const priorStateMetrics = Object.fromEntries(
  Object.entries(stateMetrics).map(([key, value]) => [key, { ...value, estimate: Math.round(value.estimate * 0.88), period: "2019", sourceUrl: "https://api.census.gov/data/2019/acs/acs5" }]),
);

const mediaAssets = createVerifiedMediaManifest().assets;
const limits = {
  conforming: { countyFips: "48453", oneUnit: 806500, twoUnit: 1032500, threeUnit: 1248200, fourUnit: 1551400, sourceUrl: "https://www.fhfa.gov/data/conforming-loan-limit" },
  fha: { countyFips: "48453", oneUnit: 571550, twoUnit: 731700, threeUnit: 884450, fourUnit: 1099100, sourceUrl: "https://apps.hud.gov/pub/chums/cy2026-forward-limits.txt" },
};

export const cityFixture = {
  location: { id: "city-austin-tx", name: "Austin", route: "/locations/texas/austin", sourceGeography: { cityKey: "austin|TX", stateFips: "48", countyFips: "48453", countyName: "Travis", populationProper: 967862 } },
  state: { id: "state-tx", name: "Texas", abbr: "TX", route: "/locations/texas" },
  census: {
    current: { geographyId: "4805000", period: "2024", retrievedAt: "2026-07-10", metrics: cityMetrics },
    prior: { geographyId: "4805000", period: "2019", retrievedAt: "2026-07-10", metrics: priorCityMetrics },
    stateCurrent: { geographyId: "48", period: "2024", retrievedAt: "2026-07-10", metrics: stateMetrics },
    statePrior: { geographyId: "48", period: "2019", retrievedAt: "2026-07-10", metrics: priorStateMetrics },
  },
  bls: {
    geographyId: "CT4805000000000",
    latest: { period: "2026-M05", laborForce: 612345, employment: 590123, unemployment: 22222, unemploymentRate: 3.6 },
    previous: { period: "2026-M04", laborForce: 610000, employment: 588650, unemployment: 21350, unemploymentRate: 3.5 },
    yearAgo: { period: "2025-M05", laborForce: 604200, employment: 581240, unemployment: 22960, unemploymentRate: 3.8 },
    seriesIds: ["LAUCT480500000000003", "LAUCT480500000000004", "LAUCT480500000000005", "LAUCT480500000000006"],
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.data.65.City",
    retrievedAt: "2026-07-10",
    revisionStatus: "BLS data are subject to revision",
  },
  limits,
  mediaAssets,
  productIds: ["product-purchase", "product-conventional", "product-fha", "product-jumbo"],
  relatedRoutes: ["/locations/texas", "/loan-options/conventional", "/loan-options/fha", "/calculators/affordability", "/rates"],
  publishedAt: "2026-07-10",
};

export const stateFixture = {
  location: { id: "state-tx", name: "Texas", abbr: "TX", route: "/locations/texas" },
  census: {
    current: { geographyId: "48", period: "2024", retrievedAt: "2026-07-10", metrics: stateMetrics },
    prior: { geographyId: "48", period: "2019", retrievedAt: "2026-07-10", metrics: priorStateMetrics },
  },
  bls: {
    geographyId: "ST4800000000000",
    latest: { period: "2026-M05", laborForce: 15842300, employment: 15287100, unemployment: 555200, unemploymentRate: 3.5 },
    previous: { period: "2026-M04", laborForce: 15798200, employment: 15260800, unemployment: 537400, unemploymentRate: 3.4 },
    yearAgo: { period: "2025-M05", laborForce: 15581200, employment: 15004600, unemployment: 576600, unemploymentRate: 3.7 },
    seriesIds: ["LASST480000000000003", "LASST480000000000004", "LASST480000000000005", "LASST480000000000006"],
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.data.1.CurrentS",
    retrievedAt: "2026-07-10",
    revisionStatus: "BLS data are subject to revision",
  },
  hpi: { period: "2026Q1", index: 418.2, quarterlyChange: 1.2, annualChange: 3.8, fiveYearChange: 36.4, sourceUrl: "https://www.fhfa.gov/house-price-index", datasetUrl: "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_po_state.txt", retrievedAt: "2026-07-10", revisionStatus: "FHFA HPI values may be revised" },
  limitSummary: { geographyId: "48", countyCount: 254, conforming: { minimumOneUnit: 806500, maximumOneUnit: 1249125, countiesAboveBaseline: 13 }, fha: { minimumOneUnit: 541287, maximumOneUnit: 1249125, countiesAboveFloor: 19 } },
  mediaAssets,
  productIds: ["product-purchase", "product-conventional", "product-fha", "product-jumbo"],
  relatedRoutes: ["/locations/texas/austin", "/loan-options/conventional", "/loan-options/fha", "/calculators/affordability", "/rates"],
  publishedAt: "2026-07-10",
};

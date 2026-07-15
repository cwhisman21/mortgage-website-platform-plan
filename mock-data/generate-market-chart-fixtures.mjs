import fs from "node:fs/promises";

const root = new URL("./", import.meta.url);
const seed = JSON.parse(await fs.readFile(new URL("production-seed.json", root), "utf8"));

const seededValue = (seedValue, min, max) => {
  let hash = 0;
  for (const character of seedValue) hash = (hash * 31 + character.charCodeAt(0)) % 10007;
  return min + (hash / 10007) * (max - min);
};

const roundTo = (value, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const trendPoints = (seedValue, labels, { startMin, startMax, movementMin, movementMax, decimals }) => {
  let value = seededValue(`start|${seedValue}`, startMin, startMax);
  const points = labels.map((label, index) => {
    if (index > 0) value += seededValue(`${label}|${seedValue}|${index}`, movementMin, movementMax);
    return { label, value: roundTo(value, decimals) };
  });

  if (new Set(points.map((point) => point.value)).size === 1) {
    points[points.length - 1].value = roundTo(points[points.length - 1].value + 10 ** -decimals, decimals);
  }

  return points;
};

const moneyValue = (displayValue) => {
  const clean = String(displayValue || "").replace(/[$,]/g, "");
  return clean.endsWith("M") ? Number(clean.slice(0, -1)) * 1000000 : Number(clean.replace("K", "")) * 1000;
};

const displayMoney = (value) => "$" + Math.round(value).toLocaleString("en-US");
const validMoney = (displayValue, fallback) => Number.isFinite(moneyValue(displayValue)) ? moneyValue(displayValue) : fallback;
const roundedDollar = (value) => Math.max(0, Math.round(value / 1000) * 1000);
const asRows = (points, formatter = (value) => String(value)) => points.map((point) => [point.label, formatter(point.value)]);
const illustrativePoints = (points) => points.map((point) => ({ ...point, status: "illustrative_assumption" }));

const sources = [
  { id: "illustrative-assumptions", kind: "internal_assumption", label: "Illustrative example values", cadence: "Scenario-specific", integrationKey: "planning.assumptions" },
  { id: "fhfa-hpi", kind: "background_reference", label: "FHFA House Price Index", url: "https://www.fhfa.gov/reports/house-price-index/2026/Q1", cadence: "Quarterly release", asOf: "2026 Q1", integrationKey: "market.hpi" },
  { id: "freddie-pmms", kind: "official_observation", label: "Freddie Mac Primary Mortgage Market Survey archive", url: "https://www.freddiemac.com/pmms/archive", cadence: "Weekly", asOf: "July 9, 2026", integrationKey: "rates.pmms" },
  { id: "census-acs", kind: "background_reference", label: "U.S. Census Bureau American Community Survey", url: "https://www.census.gov/programs-surveys/acs/news/updates/2026.html", cadence: "Annual", asOf: "2024 ACS 5-year estimates (2020-2024), released January 29, 2026", integrationKey: "market.demographics" },
  { id: "bls-laus", kind: "background_reference", label: "BLS Local Area Unemployment Statistics", url: "https://www.bls.gov/lau/", cadence: "Monthly", asOf: "May 2026", integrationKey: "market.employment" },
  { id: "fhfa-conforming-limits", kind: "background_reference", label: "FHFA 2026 conforming loan limits", url: "https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026", cadence: "Annual", asOf: "2026 limits", integrationKey: "limits.conforming" },
  { id: "hud-fha-limits", kind: "background_reference", label: "HUD 2026 FHA mortgage limits", url: "https://www.hud.gov/sites/dfiles/hudclips/documents/2025-23hsgml.pdf", cadence: "Annual", asOf: "2026 limits", integrationKey: "limits.fha" },
  { id: "cfpb-loan-estimate", kind: "background_reference", label: "CFPB Loan Estimate explainer", url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/", cadence: "Consumer reference", asOf: "Reviewed July 13, 2026", integrationKey: "calculator.background" },
];

const quarterLabels = ["2024 Q2", "2024 Q3", "2024 Q4", "2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1"];
const planningMode = "planning_illustration";

function priceTrendFixture(scope, location) {
  const points = trendPoints(location.id, quarterLabels, {
    startMin: 96,
    startMax: 104,
    movementMin: -0.45,
    movementMax: 1.25,
    decimals: 1,
  });
  return {
    chartId: "market.price_trend", entityId: location.id, scope,
    title: `How an example home-price index can move in ${location.name}`,
    summary: "These example values show how a home-price index can move over time. They are not observed prices, an FHFA series, or a property valuation.",
    chartType: "line", unit: "Example index", frequency: "Example quarterly periods", geography: location.name,
    sourceId: "illustrative-assumptions", backgroundSourceIds: ["fhfa-hpi"],
    integrationKey: `market.hpi.${scope}`, dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Example period", "Example index value"], rows: asRows(points) },
  };
}

function locationCompareFixture(scope, location) {
  const local = validMoney(location.marketSnapshot?.medianHomePrice, seededValue(`local|${location.id}`, 180000, 720000));
  const national = roundedDollar(seededValue(`national|${location.id}`, 360000, 520000));
  const points = scope === "state"
    ? [
      { label: location.name, value: roundedDollar(local) },
      { label: "U.S. example baseline", value: national },
    ]
    : [
      { label: location.name, value: roundedDollar(local) },
      { label: "State example baseline", value: roundedDollar(local * seededValue(`state|${location.id}`, 0.78, 1.22)) },
      { label: "U.S. example baseline", value: national },
    ];
  return {
    chartId: "market.location_compare", entityId: location.id, scope,
    title: `${location.name} example home-price comparison`,
    summary: "These example values compare hypothetical areas. They are not ACS estimates, observed local prices, or appraisals.",
    chartType: "bar", unit: "Example dollars", frequency: "Example annual comparison", geography: location.name,
    sourceId: "illustrative-assumptions", backgroundSourceIds: ["census-acs"],
    integrationKey: `market.comparison.${scope}`, dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Example area", "Example home-price value"], rows: asRows(points, displayMoney) },
  };
}

function paymentBreakdownFixture(city) {
  const total = validMoney(city.marketSnapshot?.paymentScenario, 2800);
  const points = [
    { label: "Principal and interest", value: Math.round(total * 0.68) },
    { label: "Property taxes", value: Math.round(total * 0.17) },
    { label: "Homeowners insurance", value: Math.round(total * 0.1) },
    { label: "Mortgage insurance", value: total - Math.round(total * 0.68) - Math.round(total * 0.17) - Math.round(total * 0.1) },
  ];
  return {
    chartId: "market.payment_breakdown", entityId: city.id, scope: "city",
    title: `${city.name} example monthly payment breakdown`,
    summary: "This example payment is not a local cost estimate, quote, APR, or Loan Estimate.",
    chartType: "payment", unit: "Example monthly dollars", frequency: "One example scenario", geography: city.name,
    sourceId: "illustrative-assumptions", backgroundSourceIds: ["cfpb-loan-estimate"],
    integrationKey: "market.payment.city", dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Payment component", "Example monthly amount"], rows: asRows(points, displayMoney) },
  };
}

function ratesBenchmarkFixture() {
  const points = [
    { label: "May 14, 2026", value: 6.36, status: "official_observation" },
    { label: "May 28, 2026", value: 6.53, status: "official_observation" },
    { label: "June 11, 2026", value: 6.52, status: "official_observation" },
    { label: "June 25, 2026", value: 6.49, status: "official_observation" },
    { label: "July 2, 2026", value: 6.43, status: "official_observation" },
    { label: "July 9, 2026", value: 6.49, status: "official_observation" },
  ];
  return {
    chartId: "rates.benchmark_trend", entityId: "rates-mortgage", scope: "rates",
    title: "National 30-year fixed mortgage rate benchmark",
    summary: "Freddie Mac PMMS national weekly averages. This public benchmark is not a Snap offer, APR, or personalized rate.",
    chartType: "line", unit: "30-year fixed rate (%)", frequency: "Weekly", geography: "United States",
    geographyType: "national", geographyId: "US", seriesId: "PMMS 30-year fixed-rate mortgage average",
    sourceId: "freddie-pmms", asOf: "July 9, 2026", reviewedAt: "July 13, 2026",
    revisionStatus: "Official weekly archive releases",
    methodologyOrLimitation: "National survey averages are not loan offers, APRs, personalized rates, or local quotes.",
    integrationKey: "rates.benchmark", dataMode: "official_observation", points,
    table: { headers: ["Freddie Mac release date", "National weekly average"], rows: asRows(points, (value) => value.toFixed(2) + "%") },
  };
}

function productScenarioFixture(product) {
  const propertyValue = roundedDollar(product.id === "product-jumbo"
    ? seededValue(`property|${product.id}`, 900000, 1400000)
    : seededValue(`property|${product.id}`, 300000, 680000));
  let points;

  if (product.id === "product-home-equity") {
    const existingBalance = roundedDollar(propertyValue * seededValue(`balance|${product.id}`, 0.42, 0.66));
    points = [
      { label: "Estimated home value", value: propertyValue },
      { label: "Existing loan balance", value: existingBalance },
      { label: "Available equity", value: propertyValue - existingBalance },
    ];
  } else if (product.id.includes("refinance") || product.id === "product-cash-out-refinance") {
    const currentBalance = roundedDollar(propertyValue * seededValue(`balance|${product.id}`, 0.48, 0.7));
    const refinanceAmount = product.id === "product-cash-out-refinance"
      ? Math.min(roundedDollar(currentBalance + propertyValue * seededValue(`cash|${product.id}`, 0.04, 0.12)), roundedDollar(propertyValue * 0.8))
      : currentBalance;
    points = [
      { label: "Estimated home value", value: propertyValue },
      { label: "Current loan balance", value: currentBalance },
      { label: "New financing amount", value: refinanceAmount },
    ];
  } else {
    const downPaymentRate = product.id === "product-va" ? 0 : product.id === "product-fha" ? 0.035 : product.id === "product-jumbo" ? 0.2 : seededValue(`down|${product.id}`, 0.08, 0.18);
    const downPayment = roundedDollar(propertyValue * downPaymentRate);
    points = [
      { label: "Purchase price", value: propertyValue },
      { label: "Down payment", value: downPayment },
      { label: "Loan amount", value: propertyValue - downPayment },
    ];
  }

  return {
    chartId: "product.scenario_compare", entityId: product.id, scope: "product",
    title: `${product.name} example financing scenario`,
    summary: "These values illustrate one financing scenario. They are not program eligibility, a loan approval, or a quote.",
    chartType: "bar", unit: "Example dollars", frequency: "One example scenario", geography: "Example scenario (not a geographic observation)",
    sourceId: "illustrative-assumptions", backgroundSourceIds: [product.id.includes("fha") ? "hud-fha-limits" : "fhfa-conforming-limits"],
    integrationKey: "product.scenario", dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Scenario measure", "Example amount"], rows: asRows(points, displayMoney) },
  };
}

function calculatorBreakdownFixture(calculator) {
  const total = Math.round(seededValue(`calculator|${calculator.id}`, 2200, 3900));
  const points = [
    { label: "Principal and interest", value: Math.round(total * 0.7) },
    { label: "Taxes", value: Math.round(total * 0.17) },
    { label: "Insurance", value: total - Math.round(total * 0.7) - Math.round(total * 0.17) },
  ];
  return {
    chartId: "calculator.payment_breakdown", entityId: calculator.id, scope: "calculator",
    title: `${calculator.name} example breakdown`,
    summary: "The starting values show how the monthly components fit together. Change the inputs to see how the estimate moves.",
    chartType: "payment", unit: "Example monthly dollars", frequency: "One example scenario", geography: "Example scenario (not a geographic observation)",
    sourceId: "illustrative-assumptions", backgroundSourceIds: ["cfpb-loan-estimate"],
    integrationKey: "calculator.breakdown", dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Payment component", "Example monthly amount"], rows: asRows(points, displayMoney) },
  };
}

function articleEvidenceFixture(article) {
  const points = trendPoints(article.id, quarterLabels.slice(-4), {
    startMin: 97,
    startMax: 103,
    movementMin: -0.35,
    movementMax: 1.1,
    decimals: 1,
  });
  return {
    chartId: "article.evidence", entityId: article.id, scope: "article",
    title: `Example chart for ${article.title}`,
    summary: "These index values illustrate a possible pattern. They are not article evidence, an FHFA series, or a local valuation.",
    chartType: "line", unit: "Example index", frequency: "Example quarterly periods", geography: "Example scenario (not a geographic observation)",
    sourceId: "illustrative-assumptions", backgroundSourceIds: ["fhfa-hpi"],
    integrationKey: "article.evidence", dataMode: planningMode, points: illustrativePoints(points),
    table: { headers: ["Example period", "Example index value"], rows: asRows(points) },
  };
}

function snapshotSource(scope, entityId) {
  return { scope, entityId, sourceIds: ["illustrative-assumptions"], backgroundSourceIds: ["fhfa-hpi", "census-acs", "bls-laus"], integrationKey: `market.${scope}`, dataMode: planningMode };
}

const charts = [
  ratesBenchmarkFixture(),
  ...seed.states.flatMap((state) => [priceTrendFixture("state", state), locationCompareFixture("state", state)]),
  ...seed.cities.flatMap((city) => [priceTrendFixture("city", city), paymentBreakdownFixture(city)]),
  ...seed.products.map(productScenarioFixture),
  ...seed.calculators.map(calculatorBreakdownFixture),
  ...seed.articles.map(articleEvidenceFixture),
];

const snapshotSources = [
  { scope: "locations_snapshot", entityId: "locations", sourceIds: ["illustrative-assumptions"], backgroundSourceIds: ["fhfa-hpi", "census-acs", "bls-laus"], integrationKey: "market.locations.snapshot", dataMode: planningMode },
  ...seed.states.map((state) => snapshotSource("state_snapshot", state.id)),
  ...seed.cities.map((city) => snapshotSource("city_snapshot", city.id)),
  { scope: "rates_snapshot", entityId: "rates-mortgage", sourceIds: ["freddie-pmms"], integrationKey: "rates.benchmarks", dataMode: "official_observation" },
];

await fs.writeFile(new URL("market-chart-fixtures.json", root), JSON.stringify({ version: "market-chart-fixtures-v1", sources, charts, snapshotSources }, null, 2) + "\n");

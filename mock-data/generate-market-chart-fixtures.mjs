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

const sources = [
  { id: "fhfa-hpi", label: "FHFA House Price Index", url: "https://www.fhfa.gov/house-price-index?tab=HPI+Datasets", cadence: "Monthly and quarterly releases", asOf: "2026 Q1", integrationKey: "market.hpi" },
  { id: "freddie-pmms", label: "Freddie Mac Primary Mortgage Market Survey", url: "https://www.freddiemac.com/pmms", cadence: "Weekly", asOf: "July 2026", integrationKey: "rates.pmms" },
  { id: "census-acs", label: "U.S. Census Bureau American Community Survey", url: "https://www.census.gov/programs-surveys/acs", cadence: "Annual", asOf: "2025 ACS release", integrationKey: "market.demographics" },
  { id: "bls-laus", label: "BLS Local Area Unemployment Statistics", url: "https://www.bls.gov/lau/", cadence: "Monthly", asOf: "May 2026", integrationKey: "market.employment" },
  { id: "fhfa-conforming-limits", label: "FHFA Conforming Loan Limits", url: "https://www.fhfa.gov/data/conforming-loan-limit", cadence: "Annual", asOf: "2026 limits", integrationKey: "limits.conforming" },
  { id: "hud-fha-limits", label: "HUD FHA Mortgage Limits", url: "https://entp.hud.gov/idapp/html/hicostlook.cfm", cadence: "Annual", asOf: "2026 limits", integrationKey: "limits.fha" },
  { id: "calculator-assumptions", label: "Mortgage planning assumptions", url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/", cadence: "Updated with calculator assumptions", asOf: "July 2026", integrationKey: "calculator.assumptions" },
];

const quarterLabels = ["2024 Q2", "2024 Q3", "2024 Q4", "2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1"];
const rateLabels = ["May 15", "May 29", "Jun 12", "Jun 26", "Jul 10"];
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
    title: `${location.name} home price planning pattern`,
    summary: "A broad index can show direction over time; it is not a property valuation or a current market release.",
    chartType: "line", unit: "Index", frequency: "Quarterly", sourceId: "fhfa-hpi", asOf: "2026 Q1",
    integrationKey: `market.hpi.${scope}`, dataMode: planningMode, points,
    table: { headers: ["Period", "Index"], rows: asRows(points) },
  };
}

function locationCompareFixture(scope, location) {
  const local = validMoney(location.marketSnapshot?.medianHomePrice, seededValue(`local|${location.id}`, 180000, 720000));
  const national = roundedDollar(seededValue(`national|${location.id}`, 360000, 520000));
  const points = scope === "state"
    ? [
      { label: location.name, value: roundedDollar(local) },
      { label: "U.S. planning baseline", value: national },
    ]
    : [
      { label: location.name, value: roundedDollar(local) },
      { label: "State planning baseline", value: roundedDollar(local * seededValue(`state|${location.id}`, 0.78, 1.22)) },
      { label: "U.S. planning baseline", value: national },
    ];
  return {
    chartId: "market.location_compare", entityId: location.id, scope,
    title: `${location.name} home price comparison`,
    summary: "Broad planning values help compare markets; they are not appraisals or property-specific values.",
    chartType: "bar", unit: "Median home price", frequency: "Annual", sourceId: "census-acs", asOf: "2025 ACS release",
    integrationKey: `market.comparison.${scope}`, dataMode: planningMode, points,
    table: { headers: ["Area", "Median home price"], rows: asRows(points, displayMoney) },
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
    title: `${city.name} sample monthly payment breakdown`,
    summary: "This planning example uses assumptions that should be confirmed for a specific property and loan.",
    chartType: "payment", unit: "Monthly payment", frequency: "Scenario estimate", sourceId: "calculator-assumptions", asOf: "July 2026",
    integrationKey: "market.payment.city", dataMode: planningMode, points,
    table: { headers: ["Payment component", "Monthly estimate"], rows: asRows(points, displayMoney) },
  };
}

function ratesBenchmarkFixture() {
  const points = trendPoints("rates-benchmark", rateLabels, {
    startMin: 6.15,
    startMax: 6.75,
    movementMin: -0.14,
    movementMax: 0.12,
    decimals: 2,
  });
  return {
    chartId: "rates.benchmark_trend", entityId: "rates-mortgage", scope: "rates",
    title: "30-year fixed planning trend",
    summary: "Weekly market patterns can frame a payment conversation; this is not a current rate quote.",
    chartType: "line", unit: "Rate", frequency: "Weekly", sourceId: "freddie-pmms", asOf: "July 2026",
    integrationKey: "rates.benchmark", dataMode: planningMode, points,
    table: { headers: ["Week", "Rate"], rows: asRows(points, (value) => value.toFixed(2) + "%") },
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
    title: `${product.name} planning scenario`,
    summary: "This comparison supports product planning and is not a loan approval or quote.",
    chartType: "bar", unit: "Dollars", frequency: "Scenario estimate", sourceId: product.id.includes("fha") ? "hud-fha-limits" : "fhfa-conforming-limits", asOf: "2026 limits",
    integrationKey: "product.scenario", dataMode: planningMode, points,
    table: { headers: ["Scenario measure", "Amount"], rows: asRows(points, displayMoney) },
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
    title: `${calculator.name} estimate breakdown`,
    summary: "The calculator updates this estimate when you change the inputs shown on the page.",
    chartType: "payment", unit: "Monthly payment", frequency: "Calculated from current inputs", sourceId: "calculator-assumptions", asOf: "July 2026",
    integrationKey: "calculator.breakdown", dataMode: planningMode, points,
    table: { headers: ["Payment component", "Monthly estimate"], rows: asRows(points, displayMoney) },
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
    title: `${article.title} supporting market pattern`,
    summary: "This chart adds broad market context to the article; it is not a current local valuation.",
    chartType: "line", unit: "Index", frequency: "Quarterly", sourceId: "fhfa-hpi", asOf: "2026 Q1",
    integrationKey: "article.evidence", dataMode: planningMode, points,
    table: { headers: ["Period", "Index"], rows: asRows(points) },
  };
}

function snapshotSource(scope, entityId) {
  return { scope, entityId, sourceIds: ["fhfa-hpi", "census-acs", "bls-laus"], integrationKey: `market.${scope}`, dataMode: planningMode };
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
  { scope: "locations_snapshot", entityId: "locations", sourceIds: ["fhfa-hpi", "census-acs", "bls-laus"], integrationKey: "market.locations.snapshot", dataMode: planningMode },
  ...seed.states.map((state) => snapshotSource("state_snapshot", state.id)),
  ...seed.cities.map((city) => snapshotSource("city_snapshot", city.id)),
  { scope: "rates_snapshot", entityId: "rates-mortgage", sourceIds: ["freddie-pmms"], integrationKey: "rates.benchmarks", dataMode: planningMode },
];

await fs.writeFile(new URL("market-chart-fixtures.json", root), JSON.stringify({ version: "market-chart-fixtures-v1", sources, charts, snapshotSources }, null, 2) + "\n");

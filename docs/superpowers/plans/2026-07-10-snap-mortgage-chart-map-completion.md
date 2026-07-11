# Snap Mortgage Chart, Map, And Content Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Complete the static Snap Mortgage public site with a source-aware SVG chart system, a direct-link U.S. locations map, complete 50-state plus D.C. coverage, and an automated guard against borrower-facing scaffolding.

**Architecture:** Keep production-seed.json as the route and content graph. Add market-chart-fixtures.json as the temporary data/integration seam, then use two small pure renderer modules for source-aware inline SVG charts and the locations map. The existing SPA remains the only application surface; no API route, backend, CMS, account implementation, or live data fetch is introduced.

**Tech Stack:** Static HTML, CSS, ES modules, Node.js built-in test runner, existing static route smoke scripts, JSON fixtures, inline SVG, existing local-news generator.

## Global Constraints

- Preserve existing public routes, borrower-facing content hierarchy, article modal behavior, CTA simulations, account behavior, and valid internal links.
- Use only borrower-facing copy in public markup. The words placeholder, wireframe, prototype, scaffold, demo, TBD, TODO, XXXX, internal status values, and implementation keys must never render publicly.
- Use controlled fixture values during this phase. Source label, URL, data vintage, cadence, table rows, and integration key are required for every chart fixture.
- Render a visible source line below every chart and snapshot-card group.
- Use inline SVG for the U.S. map and all newly introduced charts. Do not add an external charting or mapping dependency.
- Show a Snap-blue U.S. state map on a white background above the locations state cards. State selection must be a normal anchor to the existing state route. Render District of Columbia as a Snap-blue SVG star linked to its existing hub.
- Keep LO and branch pages chart-free. Add charts only to rates, calculators, product detail, editorial/article, state, city, and locations pages as described below.
- Include all 50 states plus D.C. and every city whose sourceGeography.populationProper is greater than or equal to 50,000.
- Do not stage or alter unrelated working-tree files, including the existing Figma documentation edits and .superpowers artifacts.

---

### Task 1: Establish The Chart Fixture Contract

**Files:**
- Create: mock-data/generate-market-chart-fixtures.mjs
- Create: mock-data/market-chart-fixtures.json
- Create: site/market-charts.test.mjs
- Create: site/market-charts.mjs

**Interfaces:**
- Consumes: existing source IDs in site/app.js and entity IDs from mock-data/production-seed.json.
- Produces: loadMarketChartFixtures(raw), chartFixtureFor(fixtures, chartId, entityId), renderChartFigure(fixture), and renderSnapshotSourceNote(fixtures, scope, entityId).

- [ ] **Step 1: Write the fixture and renderer contract test**

Create site/market-charts.test.mjs with fixture validation and public-markup assertions:

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  loadMarketChartFixtures,
  chartFixtureFor,
  renderChartFigure,
  renderSnapshotSourceNote,
} from "./market-charts.mjs";

const fixtures = loadMarketChartFixtures(
  JSON.parse(fs.readFileSync(new URL("../mock-data/market-chart-fixtures.json", import.meta.url), "utf8")),
);

test("every fixture supplies a source contract and accessible table", () => {
  for (const fixture of fixtures.charts) {
    assert.ok(fixture.chartId);
    assert.ok(fixture.entityId);
    assert.ok(fixture.title);
    assert.ok(fixture.unit);
    assert.ok(fixture.frequency);
    assert.ok(fixture.sourceId);
    assert.ok(fixture.integrationKey);
    assert.ok(fixture.table.headers.length);
    assert.ok(fixture.table.rows.length);
  }
});

test("chart figures keep source, vintage, and data table in public markup", () => {
  const fixture = chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage");
  const html = renderChartFigure(fixture);
  assert.match(html, /<figure/);
  assert.match(html, /Source:/);
  assert.match(html, /<details/);
  assert.match(html, /<table/);
  assert.doesNotMatch(html, /placeholder|fixture|integrationKey/i);
});

test("snapshot source note exposes source metadata without internal fields", () => {
  const html = renderSnapshotSourceNote(fixtures, "city_snapshot", "city-austin-tx");
  assert.match(html, /Source:/);
  assert.doesNotMatch(html, /status|integrationKey|fixture/i);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run:

~~~powershell
node --test site/market-charts.test.mjs
~~~

Expected: FAIL because site/market-charts.mjs and mock-data/market-chart-fixtures.json do not exist.

- [ ] **Step 3: Add deterministic fixture generation and the fixture schema**

Create mock-data/generate-market-chart-fixtures.mjs. It reads production-seed.json and writes market-chart-fixtures.json. The generator owns temporary numeric series only; it never changes routes, borrower-facing copy, source URLs, or location relationships.

Use these deterministic helpers:

~~~js
const seededValue = (seed, min, max) => {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 10007;
  return min + (hash / 10007) * (max - min);
};

const linePoints = (seed, labels) => labels.map((label, index) => ({
  label,
  value: Math.round(seededValue(seed + "-" + index, 92, 112) * 10) / 10,
}));

const moneyValue = (displayValue) => {
  const clean = String(displayValue || "").replace(/[$,]/g, "");
  return clean.endsWith("M") ? Number(clean.slice(0, -1)) * 1000000 : Number(clean.replace("K", "")) * 1000;
};
~~~

Use this exact top-level shape for the generated file:

~~~json
{
  "version": "market-chart-fixtures-v1",
  "sources": [
    {
      "id": "fhfa-hpi",
      "label": "FHFA House Price Index",
      "url": "https://www.fhfa.gov/house-price-index?tab=HPI+Datasets",
      "cadence": "Monthly and quarterly releases",
      "integrationKey": "market.hpi"
    }
  ],
  "charts": [
    {
      "chartId": "market.price_trend",
      "entityId": "state-tx",
      "scope": "state",
      "title": "Texas home price index movement",
      "summary": "A broad index can show direction over time; it is not a property valuation.",
      "chartType": "line",
      "unit": "Index",
      "frequency": "Quarterly",
      "sourceId": "fhfa-hpi",
      "vintage": "Q1 2026",
      "integrationKey": "market.hpi.state",
      "status": "integration_fixture",
      "points": [
        { "label": "2024 Q2", "value": 100 },
        { "label": "2024 Q3", "value": 102 },
        { "label": "2024 Q4", "value": 104 },
        { "label": "2025 Q1", "value": 106 }
      ],
      "table": {
        "headers": ["Period", "Index"],
        "rows": [["2024 Q2", "100"], ["2024 Q3", "102"], ["2024 Q4", "104"], ["2025 Q1", "106"]]
      }
    }
  ],
  "snapshotSources": [
    {
      "scope": "city_snapshot",
      "entityId": "city-austin-tx",
      "sourceIds": ["fhfa-hpi", "census-acs", "bls-laus"],
      "integrationKey": "market.city.snapshot",
      "status": "integration_fixture"
    }
  ]
}
~~~

Populate the source registry with FHFA HPI, Freddie Mac PMMS, Census ACS, BLS LAUS, FHFA conforming limits, HUD FHA limits, and calculator assumptions. Add records for the generic rates, calculator, product, and article chart positions plus deterministic state/city records generated from existing location IDs. Do not add long-form copy or route ownership to this file.

Build these inventories in the generator:

~~~js
const charts = [
  ratesBenchmarkFixture(),
  ...seed.states.flatMap((state) => [
    priceTrendFixture("state", state),
    locationCompareFixture("state", state),
  ]),
  ...seed.cities.flatMap((city) => [
    priceTrendFixture("city", city),
    paymentBreakdownFixture(city),
  ]),
  ...seed.products.map(productScenarioFixture),
  ...seed.calculators.map(calculatorBreakdownFixture),
  ...seed.articles.map(articleEvidenceFixture),
];

const snapshotSources = [
  { scope: "locations_snapshot", entityId: "locations", sourceIds: ["fhfa-hpi", "census-acs", "bls-laus"], integrationKey: "market.locations.snapshot", status: "integration_fixture" },
  ...seed.states.map((state) => snapshotSource("state_snapshot", state.id)),
  ...seed.cities.map((city) => snapshotSource("city_snapshot", city.id)),
  { scope: "rates_snapshot", entityId: "rates-mortgage", sourceIds: ["freddie-pmms"], integrationKey: "rates.benchmarks", status: "integration_fixture" },
];
~~~

Run:

~~~powershell
node mock-data/generate-market-chart-fixtures.mjs
~~~

Expected: mock-data/market-chart-fixtures.json contains fixture records for every required state, city, product, calculator, and legacy article renderer placement.

- [ ] **Step 4: Implement pure fixture validation and SVG chart markup**

Create site/market-charts.mjs with:

~~~js
const requiredFixtureFields = [
  "chartId", "entityId", "scope", "title", "summary", "chartType",
  "unit", "frequency", "sourceId", "vintage", "integrationKey", "points", "table",
];

export function loadMarketChartFixtures(raw) {
  if (!raw || !Array.isArray(raw.sources) || !Array.isArray(raw.charts) || !Array.isArray(raw.snapshotSources)) {
    throw new Error("Market chart fixtures must include sources, charts, and snapshotSources arrays.");
  }
  const sourceIds = new Set(raw.sources.map((source) => source.id));
  for (const fixture of raw.charts) {
    for (const field of requiredFixtureFields) {
      if (!fixture[field]) throw new Error("Market chart fixture is missing " + field + ".");
    }
    if (!sourceIds.has(fixture.sourceId)) throw new Error("Unknown chart source " + fixture.sourceId + ".");
    if (!fixture.table.headers?.length || !fixture.table.rows?.length) {
      throw new Error("Market chart fixture must include table headers and rows.");
    }
  }
  return raw;
}

export function chartFixtureFor(fixtures, chartId, entityId) {
  return fixtures.charts.find((fixture) => fixture.chartId === chartId && fixture.entityId === entityId)
    || fixtures.charts.find((fixture) => fixture.chartId === chartId && fixture.entityId === "default")
    || null;
}
~~~

Implement line, bar, and stacked-payment SVG geometry inside renderChartFigure. The function must emit a figure, figcaption, direct source anchor, visible vintage, and a details/summary data-table fallback. Use escape helpers for all text and validate source URLs against https URLs before emitting anchors.

- [ ] **Step 5: Run the test to verify it passes**

Run:

~~~powershell
node --test site/market-charts.test.mjs
~~~

Expected: PASS with three tests.

- [ ] **Step 6: Commit the isolated fixture/rendering slice**

~~~powershell
git add mock-data/generate-market-chart-fixtures.mjs mock-data/market-chart-fixtures.json site/market-charts.mjs site/market-charts.test.mjs
git commit -m "feat: add source-aware chart fixtures"
~~~

---

### Task 2: Build The Accessible SVG State Map

**Files:**
- Create: site/us-state-map.mjs
- Create: site/us-state-map.test.mjs
- Create: site/assets/us-state-map-paths.mjs

**Interfaces:**
- Consumes: state objects with id, name, abbr, and route.
- Produces: renderUsStateMap(states) returning an inline SVG navigation landmark with regular state anchors and the D.C. star anchor.

- [ ] **Step 1: Write the map-rendering test**

Create site/us-state-map.test.mjs:

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import { renderUsStateMap } from "./us-state-map.mjs";

const states = [
  { id: "state-tx", name: "Texas", abbr: "TX", route: "/locations/texas" },
  { id: "state-dc", name: "District of Columbia", abbr: "DC", route: "/locations/district-of-columbia" },
];

test("renders route-bearing state SVG anchors and a D.C. star", () => {
  const html = renderUsStateMap(states);
  assert.match(html, /<svg/);
  assert.match(html, /href="\/locations\/texas"/);
  assert.match(html, /aria-label="Open Texas mortgage market"/);
  assert.match(html, /data-state-id="state-dc"/);
  assert.match(html, /class="us-state-map-dc-star"/);
});

test("does not render an incomplete geography as a dead control", () => {
  const html = renderUsStateMap(states);
  assert.doesNotMatch(html, /href="#"/);
  assert.doesNotMatch(html, /Coming soon|placeholder|demo/i);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run:

~~~powershell
node --test site/us-state-map.test.mjs
~~~

Expected: FAIL because site/us-state-map.mjs does not exist.

- [ ] **Step 3: Add static path data and map renderer**

Create site/assets/us-state-map-paths.mjs with public-domain or permissively licensed normalized path data keyed by postal abbreviation. Include 50 state paths in a shared viewBox; do not fetch geography at runtime.

Create site/us-state-map.mjs with:

~~~js
import { US_STATE_PATHS, DC_STAR } from "./assets/us-state-map-paths.mjs";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function renderUsStateMap(states) {
  const byAbbr = new Map(states.map((state) => [state.abbr, state]));
  const stateAnchors = Object.entries(US_STATE_PATHS).map(([abbr, path]) => {
    const state = byAbbr.get(abbr);
    if (!state) return "";
    return '<a class="us-state-map-link" data-state-id="' + escapeHtml(state.id) + '" href="' + escapeHtml(state.route) + '" aria-label="Open ' + escapeHtml(state.name) + ' mortgage market"><path d="' + path + '"><title>' + escapeHtml(state.name) + '</title></path></a>';
  }).join("");
  const dc = byAbbr.get("DC");
  const dcStar = dc
    ? '<a class="us-state-map-dc-star" data-state-id="' + escapeHtml(dc.id) + '" href="' + escapeHtml(dc.route) + '" aria-label="Open District of Columbia mortgage market"><path d="' + DC_STAR + '"><title>District of Columbia</title></path></a>'
    : "";
  return '<nav class="us-state-map" aria-label="Browse mortgage markets by state"><svg viewBox="0 0 975 610" role="img" aria-label="United States mortgage market map">' + stateAnchors + dcStar + '</svg></nav>';
}
~~~

The renderer must skip only impossible missing records in development. The production coverage test in Task 5 makes missing state records a failure.

- [ ] **Step 4: Run the test to verify it passes**

Run:

~~~powershell
node --test site/us-state-map.test.mjs
~~~

Expected: PASS with two tests.

- [ ] **Step 5: Commit the isolated map slice**

~~~powershell
git add site/assets/us-state-map-paths.mjs site/us-state-map.mjs site/us-state-map.test.mjs
git commit -m "feat: add accessible state market map"
~~~

---

### Task 3: Wire Fixtures, Charts, And Map Into Existing Page Renderers

**Files:**
- Modify: site/app.js
- Modify: site/styles.css
- Modify: site/phase2-static-smoke.mjs

**Interfaces:**
- Consumes: market-chart-fixtures.json, market-charts.mjs, us-state-map.mjs, and existing seed route objects.
- Produces: source-aware chart figures and snapshot citations on required page families, plus the locations-map hero placement.

- [ ] **Step 1: Add static smoke assertions for the new integration**

Extend site/phase2-static-smoke.mjs:

~~~js
const chartFixtures = JSON.parse(read("mock-data/market-chart-fixtures.json"));
const chartModuleSource = read("site/market-charts.mjs");
const mapModuleSource = read("site/us-state-map.mjs");

if (!/MARKET_CHART_FIXTURES_URL/.test(appSource)) fail("site/app.js does not load market chart fixtures");
if (!/renderUsStateMap/.test(appSource)) fail("locations page does not render the state map");
if (!/renderChartFigure/.test(appSource)) fail("site/app.js does not render source-aware chart figures");
if (!chartFixtures.charts?.length) fail("market chart fixture inventory is empty");
if (!/us-state-map-dc-star/.test(mapModuleSource)) fail("state map does not render the D.C. star");
if (!/Source:/.test(chartModuleSource)) fail("chart module does not emit a visible source line");
~~~

Add a helper that verifies every chart fixture has title, unit, frequency, source ID, known source URL, vintage, table headers, table rows, and integration key.

- [ ] **Step 2: Run the smoke suite to verify it fails**

Run:

~~~powershell
node site/phase2-static-smoke.mjs
~~~

Expected: FAIL until app.js loads the fixture file and renders the modules.

- [ ] **Step 3: Add fixture loading and route-safe resolvers**

At the top of site/app.js:

~~~js
import {
  chartFixtureFor,
  loadMarketChartFixtures,
  renderChartFigure,
  renderSnapshotSourceNote,
} from "./market-charts.mjs";
import { renderUsStateMap } from "./us-state-map.mjs";

const MARKET_CHART_FIXTURES_URL = "/mock-data/market-chart-fixtures.json";
let marketChartFixtures = { sources: [], charts: [], snapshotSources: [] };
~~~

In boot(), add MARKET_CHART_FIXTURES_URL to Promise.all and set marketChartFixtures with loadMarketChartFixtures before render(). Use fetchOptionalJson so a fixture-load failure cannot erase existing public content. Add chartFor(chartId, entityId) and snapshotSourceFor(scope, entityId) helpers that return empty borrower-facing-safe markup when a fixture is unavailable.

- [ ] **Step 4: Replace the current chart fallback path**

Remove the canvas-specific lineChart renderer and renderCharts invocation. Replace the three existing hard-coded line-chart placements with chartFor calls:

~~~js
chartFor("rates.benchmark_trend", "rates-mortgage")
chartFor("market.price_trend", state.id)
chartFor("market.price_trend", city.id)
~~~

Add these placements:

- locationsPage: renderUsStateMap(data.states) after the locations editorial section and before the State market entry card grid.
- locationsPage: add renderSnapshotSourceNote for the shared locations/snapshot source group after Market decision signals.
- statePage: add snapshot citation beneath the hero snapshot and a location comparison chart after the price trend.
- cityPage: add snapshot citation beneath the hero snapshot and a payment breakdown or nearby comparison figure beside the existing scenario table.
- ratesPage: add a snapshot citation beneath Current rate benchmarks.
- productPage: add product.scenario_compare after the product-fit education block.
- calculatorPage: reserve a data-calculator-breakdown container and populate it from visible calculator inputs after submit.
- articlePage and hydrated news article renderer: render article.evidence only where the fixture exists for the route/article ID.

Do not add a data visualization to loanOfficerPage or branchPage.

- [ ] **Step 5: Add in-place table behavior**

Use native details/summary markup emitted by market-charts.mjs. Do not add click listeners, a modal, or history state for charts. The browser must retain the normal disclosure behavior without JavaScript.

- [ ] **Step 6: Add responsive chart/map styles**

Add CSS for:

~~~css
.us-state-map { margin: 0 auto 28px; max-width: 1040px; }
.us-state-map svg { display: block; width: 100%; height: auto; background: #fff; }
.us-state-map-link path { fill: var(--snap-blue); stroke: #fff; stroke-width: 1.3; transition: fill 160ms ease, transform 160ms ease; }
.us-state-map-link:hover path,
.us-state-map-link:focus-visible path { fill: var(--navy); outline: none; }
.us-state-map-link:focus-visible { outline: 3px solid var(--snap-amber); outline-offset: 4px; }
.us-state-map-dc-star path { fill: var(--snap-blue); stroke: #fff; stroke-width: 1.3; }
.market-chart-figure { margin: 0; }
.market-chart-source { margin-top: 12px; color: var(--ink-soft); font-size: 13px; }
.market-chart-details { margin-top: 12px; }
.market-chart-details summary { cursor: pointer; color: var(--snap-blue); font-weight: 800; }
~~~

At the mobile breakpoint, retain a readable SVG height, let the table use the existing table-wrap horizontal scroll, and prevent the map or source line from overflowing its section.

- [ ] **Step 7: Run the smoke suite to verify it passes**

Run:

~~~powershell
node site/phase2-static-smoke.mjs
~~~

Expected: PASS and reports the checked route count.

- [ ] **Step 8: Commit the renderer integration**

~~~powershell
git add site/app.js site/styles.css site/phase2-static-smoke.mjs
git commit -m "feat: render source-aware public market visuals"
~~~

---

### Task 4: Complete State And City Coverage Without Erasing Existing Content

**Files:**
- Modify: mock-data/generate-national-locations.mjs
- Create: mock-data/ensure-state-coverage.mjs
- Modify: mock-data/tests/national-location-geography.test.mjs
- Modify: mock-data/production-seed.json
- Modify: mock-data/national-location-source-manifest.json
- Modify: mock-data/generate-location-news.mjs
- Modify: mock-data/location-news-index.json
- Create: mock-data/location-news/vermont/state.json
- Create: mock-data/location-news/west-virginia/state.json
- Create: site/generated/learning-center/market-news/vt-state-home-price-movement.html
- Create: site/generated/learning-center/market-news/wv-state-home-price-movement.html

**Interfaces:**
- Consumes: stateNames, existing seed records, the current national geography manifest, existing source cache, and the location-news evidence generator.
- Produces: 51 route-bearing state records (50 states plus D.C.), unchanged qualifying city inventory, preserved location-news corpus, and generated Vermont/West Virginia state news bundles.

- [ ] **Step 1: Expand geography coverage tests**

Add these tests to mock-data/tests/national-location-geography.test.mjs:

~~~js
test("covers every state and District of Columbia", () => {
  const required = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
    "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
    "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
    "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  ]);
  const present = new Set(seed.states.map((state) => state.abbr));
  assert.deepEqual(present, required);
});

test("every qualifying city has a state parent and a valid route", () => {
  const states = new Set(seed.states.map((state) => state.id));
  for (const city of seed.cities) {
    assert.ok(city.sourceGeography.populationProper >= 50000);
    assert.ok(states.has(city.stateId));
    assert.match(city.route, /^\/locations\/[a-z0-9-]+\/[a-z0-9-]+$/);
  }
});
~~~

- [ ] **Step 2: Run the coverage test to verify it fails**

Run:

~~~powershell
node --test mock-data/tests/national-location-geography.test.mjs
~~~

Expected: FAIL because Vermont and West Virginia are absent.

- [ ] **Step 3: Make state coverage deterministic and regeneration-safe**

Create mock-data/ensure-state-coverage.mjs. It reads production-seed.json and national-location-source-manifest.json, adds only missing Vermont and West Virginia state records, sorts the state list by name, and updates counts without touching cities or existing relationships:

~~~js
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
      lastUpdated: "2026-07-10"
    },
    newsArticleIds: []
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
      lastUpdated: "2026-07-10"
    },
    newsArticleIds: []
  }
];
~~~

The script must write only when a state is missing, assert all 51 state/D.C. abbreviations are present afterward, set seed.recommendedCounts.states to 51, set manifest.pageCoverageStates to 51, and retain statesWithoutCityProper50k as ["VT", "WV"].

In mock-data/generate-national-locations.mjs, replace the state construction loop over rowsByStateId with a loop over Object.entries(stateNames). For every abbreviation:

~~~js
for (const [abbr, stateName] of Object.entries(stateNames)) {
  const stateId = "state-" + abbr.toLowerCase();
  const groupedRows = rowsByStateId.get(stateId) || [];
  const existing = existingStates.get(stateId);
  const cityEntries = groupedRows.map((row) => generatedCities.get(row.id)).filter(Boolean);
  statesById.set(stateId, {
    id: stateId,
    name: existing?.name || stateName,
    abbr,
    route: existing?.route || "/locations/" + slugify(stateName),
    stateNarrative: existing?.stateNarrative || stateNarratives[abbr] || stateName + " borrowers can compare price, payment, inventory, tax, insurance, and product options before choosing a mortgage path.",
    cityIds: cityEntries.map((city) => city.id),
    branchIds: existing?.branchIds || [],
    featuredProductIds: existing?.featuredProductIds || stateProducts(cityEntries, abbr),
    marketSnapshot: existing?.marketSnapshot || stateSnapshot(abbr, cityEntries),
    newsArticleIds: existing?.newsArticleIds || [],
  });
}
~~~

Preserve existing newsArticleIds on all state records. Update manifest counts to 51 state records and report states without a qualifying city as an informational field, not as omitted pages.

- [ ] **Step 4: Add targeted state-news merge support**

Extend mock-data/generate-location-news.mjs so --location-id updates only the requested location bundle while preserving all existing index records, seed newsArticleIds, source manifest totals, sitemap entries, and generated standalone pages. The merge behavior must:

~~~js
const existingIndex = JSON.parse(await fs.readFile(indexPath, "utf8"));
const retained = existingIndex.articles.filter((article) => article.locationId !== location.id);
const mergedArticles = [...retained, ...indexItems].sort((a, b) => a.route.localeCompare(b.route));
~~~

When the option is locationId, write the merged index and seed, render only the new standalone article documents, and preserve every unrelated bundle and article record.

- [ ] **Step 5: Materialize state coverage and generate the two missing news bundles**

Run the deterministic state-coverage script, then run the targeted news generator twice:

~~~powershell
node mock-data/ensure-state-coverage.mjs
node mock-data/generate-location-news.mjs --location-id state-vt --batch-size 20
node mock-data/generate-location-news.mjs --location-id state-wv --batch-size 20
~~~

Expected: state-vt and state-wv gain four source-backed news records each, their location bundles, index entries, and standalone article documents. Existing location-news counts remain intact plus eight new articles.

- [ ] **Step 6: Run coverage and corpus validation**

Run:

~~~powershell
node --test mock-data/tests/national-location-geography.test.mjs mock-data/tests/location-news-core.test.mjs mock-data/tests/location-news-compose.test.mjs mock-data/tests/location-news-validate.test.mjs
node site/phase2-static-smoke.mjs
~~~

Expected: PASS with 51 state routes, every city at or above 50,000 population, and no broken location-news relationship.

- [ ] **Step 7: Commit the coverage and generated-content slice**

~~~powershell
git add mock-data/generate-national-locations.mjs mock-data/generate-location-news.mjs mock-data/tests/national-location-geography.test.mjs mock-data/production-seed.json mock-data/national-location-source-manifest.json mock-data/location-news-index.json mock-data/location-news/vermont mock-data/location-news/west-virginia site/generated/learning-center/market-news
git commit -m "feat: complete state market coverage"
~~~

---

### Task 5: Remove Borrower-Facing Scaffolding And Add Public-Copy Guardrails

**Files:**
- Create: site/public-copy-guard.test.mjs
- Modify: site/app.js
- Modify: site/news-renderer.mjs
- Modify: site/location-news-static.mjs
- Modify: site/phase2-static-smoke.mjs

**Interfaces:**
- Consumes: public renderers, generated article renderer, and compact source registry.
- Produces: borrower-facing text that contains no internal-planning terminology or nonfunctional public navigation.

- [ ] **Step 1: Write the public-copy guard test**

Create site/public-copy-guard.test.mjs:

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  new URL("./app.js", import.meta.url),
  new URL("./news-renderer.mjs", import.meta.url),
  new URL("./location-news-static.mjs", import.meta.url),
];
const forbidden = [
  "placeholder", "wireframe", "prototype", "scaffold", "demo", "tbd", "todo", "xxxx",
  "trust layer", "answer unlock", "content graph", "editorial graph", "city dashboard",
];

test("public renderers do not carry borrower-facing scaffolding copy", () => {
  const source = files.map((file) => fs.readFileSync(file, "utf8").toLowerCase()).join("\n");
  for (const phrase of forbidden) {
    assert.equal(source.includes(phrase), false, "forbidden public phrase: " + phrase);
  }
});

test("public renderers keep ordinary crawlable anchors", () => {
  const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /href=["']#["']/);
});
~~~

- [ ] **Step 2: Run the guard test to verify current failures**

Run:

~~~powershell
node --test site/public-copy-guard.test.mjs
~~~

Expected: FAIL until every flagged phrase is removed, converted into borrower-facing meaning, or confined to non-rendered implementation metadata.

- [ ] **Step 3: Replace only visible weak/scaffolding copy**

Review app.js, news-renderer.mjs, and location-news-static.mjs. Preserve useful borrower content. For each rendered instance of forbidden language:

- Replace planning labels with a borrower question or concise explanation.
- Replace generic instructions with a direct outcome-oriented sentence.
- Remove any element that has no borrower value.
- Keep source, disclosure, and status language readable and user-facing.
- Do not modify valid route targets to hide an unfinished feature.

Add the same forbidden phrase list to phase2-static-smoke.mjs and scan all public renderer sources plus generated article documents.

- [ ] **Step 4: Run guard and existing renderer tests**

Run:

~~~powershell
node --test site/public-copy-guard.test.mjs site/news-renderer.test.mjs site/location-news-integration.test.mjs
node site/phase2-static-smoke.mjs
~~~

Expected: PASS with no public scaffolding hits and no invalid anchor destinations.

- [ ] **Step 5: Commit the copy-quality slice**

~~~powershell
git add site/public-copy-guard.test.mjs site/app.js site/news-renderer.mjs site/location-news-static.mjs site/phase2-static-smoke.mjs
git commit -m "fix: remove public scaffolding language"
~~~

---

### Task 6: Run End-To-End Static And Visual QA

**Files:**
- Modify only if a validated failure requires it: files from Tasks 1 through 5
- Test: all existing static and location-news test files

**Interfaces:**
- Consumes: final static application, fixture data, state coverage, map/chart modules, and generated articles.
- Produces: evidence that the approved page-family behavior still works across desktop and mobile.

- [ ] **Step 1: Run syntax and complete test inventory**

Run:

~~~powershell
node --check site/app.js
node --check site/market-charts.mjs
node --check site/us-state-map.mjs
node --test site/*.test.mjs mock-data/tests/*.test.mjs
node site/phase2-static-smoke.mjs
~~~

Expected: all commands exit 0.

- [ ] **Step 2: Run representative static route checks**

Run the existing smoke suite and verify these routes resolve through the SPA or generated article rewrite:

~~~text
/
/locations
/locations/vermont
/locations/west-virginia
/locations/texas
/locations/texas/austin
/rates
/loan-options/fha
/calculators/mortgage-payment
/learning-center/market-news/vt-state-home-price-movement
/learning-center/market-news/wv-state-home-price-movement
~~~

Expected: no not-found output, no missing fixture error, no empty map state link, and no missing source line on the visualized pages.

- [ ] **Step 3: Run desktop and mobile browser QA**

Start the static server using the repository's established local command. Inspect at desktop and 390 px widths:

- Locations page: map is above cards, all state links work, D.C. star is visible and links correctly, no overflow.
- State pages: Vermont, West Virginia, and Texas have source-cited snapshot/charts and working data-table disclosures.
- City page: Austin has source-cited snapshot and source-aware chart/table details.
- Rates, FHA product, calculator, and a local-news article render their approved visualization without clipped labels.
- Loan officer and branch pages retain their action-led structure and have no decorative chart.
- Header/account controls, article modal behavior, CTA simulations, and ordinary crawlable anchors continue to function.

- [ ] **Step 4: Review the final diff**

Run:

~~~powershell
git status --short
git diff --check
git diff --stat
~~~

Expected: only intended task files are changed; unrelated Figma documentation edits and .superpowers artifacts are unstaged and preserved.

- [ ] **Step 5: Commit the verified completion**

~~~powershell
git add site mock-data docs/superpowers/specs/2026-07-10-snap-mortgage-chart-map-completion-design.md docs/superpowers/plans/2026-07-10-snap-mortgage-chart-map-completion.md
git commit -m "feat: complete Snap Mortgage market visuals"
~~~

Do not push without explicit approval to update the external remote and its main branch.

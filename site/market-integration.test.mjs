import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const fixtures = JSON.parse(fs.readFileSync(new URL("../mock-data/market-chart-fixtures.json", import.meta.url), "utf8"));
const productionSeed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));

test("market chart fixtures cover the approved public surfaces", () => {
  const count = (scope) => fixtures.charts.filter((chart) => chart.scope === scope).length;

  assert.equal(count("rates"), 1);
  assert.ok(count("state") >= 102);
  assert.ok(count("city") >= 1474);
  assert.equal(count("product"), 8);
  assert.equal(count("calculator"), productionSeed.recommendedCounts.calculators);
  assert.equal(count("article"), 24);
});

test("the public app loads fixtures and renders sources on every approved chart surface", () => {
  for (const fragment of [
    'MARKET_CHART_FIXTURES_URL = "/mock-data/market-chart-fixtures.json"',
    "loadMarketChartFixtures",
    'marketChart("rates.benchmark_trend", "rates-mortgage")',
    'marketChart("market.price_trend", state.id)',
    'marketChart("market.location_compare", state.id)',
    'marketChart("market.price_trend", city.id)',
    'marketChart("market.payment_breakdown", city.id)',
    'marketChart("product.scenario_compare", product.id)',
    'marketChart("article.evidence", article.id)',
    "calculatedScenarioChart",
    "marketSnapshotReference",
  ]) {
    assert.ok(appSource.includes(fragment), `missing ${fragment}`);
  }

  assert.doesNotMatch(appSource, /function lineChart\(/);
  assert.doesNotMatch(appSource, /function renderCharts\(/);
});

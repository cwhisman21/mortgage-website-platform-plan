import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  loadMarketChartFixtures,
  chartFixtureFor,
  renderChartFigure,
  renderSnapshotSourceNote,
} from "./market-charts.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));
const fixtures = loadMarketChartFixtures(
  JSON.parse(fs.readFileSync(new URL("../mock-data/market-chart-fixtures.json", import.meta.url), "utf8")),
);

const chartCount = (chartId) => fixtures.charts.filter((fixture) => fixture.chartId === chartId).length;

test("fixtures cover every planned chart surface", () => {
  const expected = 1 + (seed.states.length * 2) + (seed.cities.length * 2) + seed.products.length + seed.calculators.length + seed.articles.length;
  assert.equal(fixtures.charts.length, expected);
  assert.equal(chartCount("rates.benchmark_trend"), 1);
  assert.equal(chartCount("market.price_trend"), seed.states.length + seed.cities.length);
  assert.equal(chartCount("market.location_compare"), seed.states.length);
  assert.equal(chartCount("market.payment_breakdown"), seed.cities.length);
  assert.equal(chartCount("product.scenario_compare"), seed.products.length);
  assert.equal(chartCount("calculator.payment_breakdown"), seed.calculators.length);
  assert.equal(chartCount("article.evidence"), seed.articles.length);
});

test("fixtures are coherent and retain visible movement", () => {
  for (const fixture of fixtures.charts) {
    assert.ok(fixture.chartId);
    assert.ok(fixture.entityId);
    assert.ok(fixture.title);
    assert.ok(fixture.unit);
    assert.ok(fixture.frequency);
    assert.ok(fixture.sourceId);
    assert.ok(fixture.integrationKey);
    assert.ok(fixture.asOf);
    assert.ok(fixture.table.headers.length);
    assert.equal(fixture.table.rows.length, fixture.points.length);
    if (fixture.chartType === "line" || fixture.chartType === "bar") {
      assert.ok(new Set(fixture.points.map((point) => point.value)).size > 1, `${fixture.chartId}/${fixture.entityId} should show movement or contrast`);
    }
  }

  for (const fixture of fixtures.charts.filter((item) => item.chartId === "product.scenario_compare")) {
    const values = Object.fromEntries(fixture.points.map((point) => [point.label, point.value]));
    if (values["Purchase price"] !== undefined) {
      assert.equal(values["Purchase price"] - values["Down payment"], values["Loan amount"]);
    }
    if (values["Estimated home value"] !== undefined && values["Existing loan balance"] !== undefined) {
      if (values["Available equity"] !== undefined) {
        assert.equal(values["Estimated home value"] - values["Existing loan balance"], values["Available equity"]);
      }
      if (values["New financing amount"] !== undefined) {
        assert.ok(values["New financing amount"] <= values["Estimated home value"]);
      }
    }
  }
});

test("chart figures keep the reference, date, and data table in public markup", () => {
  const fixture = chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage");
  const html = renderChartFigure(fixture);
  assert.match(html, /<figure/);
  assert.match(html, /Planning illustration\. Reference:/);
  assert.match(html, /href="https:\/\//);
  assert.match(html, /As of:/);
  assert.match(html, /<details/);
  assert.match(html, /<table/);
  assert.match(html, /role="img"/);
  assert.doesNotMatch(html, /placeholder|fixture|integrationKey|status|Source unavailable/i);
});

test("snapshot source note exposes reference dates without internal fields", () => {
  const html = renderSnapshotSourceNote(fixtures, "city_snapshot", "city-austin-tx");
  assert.match(html, /Market planning references:/);
  assert.match(html, /Reference dates:/);
  assert.doesNotMatch(html, /vintage|cadence|status|integrationKey|fixture/i);
});

test("fixture loader rejects invalid chart contracts", () => {
  const invalid = {
    sources: [{ id: "source", label: "Source", cadence: "Annual", asOf: "2026" }],
    charts: [{
      chartId: "chart", entityId: "entity", scope: "scope", title: "Title", summary: "Summary",
      chartType: "unknown", unit: "Unit", frequency: "Annual", sourceId: "source", asOf: "2026", integrationKey: "key",
      points: [], table: { headers: ["A", "B"], rows: [] },
    }],
    snapshotSources: [],
  };
  assert.throws(() => loadMarketChartFixtures(invalid), /Unsupported market chart type/);
});

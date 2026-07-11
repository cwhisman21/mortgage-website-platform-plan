import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  loadMarketChartFixtures,
  chartFixtureFor,
  computeChartTooltipPosition,
  renderChartFigure,
  renderSnapshotSourceNote,
  wireMarketChartInteractions,
} from "./market-charts.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));
const fixtures = loadMarketChartFixtures(
  JSON.parse(fs.readFileSync(new URL("../mock-data/market-chart-fixtures.json", import.meta.url), "utf8")),
);

const chartCount = (chartId) => fixtures.charts.filter((fixture) => fixture.chartId === chartId).length;

function chartInteractionHarness() {
  const listeners = new Map();
  const root = {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type, event) {
      for (const handler of listeners.get(type) || []) handler(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((count, handlers) => count + handlers.size, 0);
    },
  };
  const rectangle = { left: 0, top: 0, width: 640, height: 400 };
  const tooltip = () => {
    const fields = new Map([
      ["[data-chart-tooltip-label]", { textContent: "" }],
      ["[data-chart-tooltip-value]", { textContent: "" }],
      ["[data-chart-tooltip-source]", { textContent: "" }],
      ["[data-chart-tooltip-as-of]", { textContent: "" }],
    ]);
    return {
      hidden: true,
      style: {},
      querySelector(selector) { return fields.get(selector) || null; },
      getBoundingClientRect() { return { ...rectangle, width: 180, height: 90 }; },
    };
  };
  const figure = (chartTooltip) => ({
    querySelector(selector) { return selector === "[data-chart-tooltip]" ? chartTooltip : null; },
    getBoundingClientRect() { return rectangle; },
  });
  const mark = (chartFigure, label) => {
    const attributes = new Map();
    return {
      dataset: { chartLabel: label, chartValue: "$100", chartSource: "Source", chartAsOf: "2026-07-11" },
      closest(selector) {
        if (selector === ".market-chart-mark") return this;
        return selector === "[data-market-chart]" ? chartFigure : null;
      },
      contains(target) { return target === this; },
      matches() { return false; },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      hasAttribute(name) { return attributes.has(name); },
      getBoundingClientRect() { return { ...rectangle, width: 16, height: 16 }; },
    };
  };
  const tooltipA = tooltip();
  const tooltipB = tooltip();
  const markA = mark(figure(tooltipA), "A");
  const markB = mark(figure(tooltipB), "B");
  const touch = (target) => root.dispatch("pointerdown", { pointerType: "touch", target, clientX: 20, clientY: 20 });
  return { root, tooltipA, tooltipB, markA, markB, touch };
}

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

test("line, bar, and payment charts expose the shared tooltip contract", () => {
  const samples = [
    chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage"),
    chartFixtureFor(fixtures, "market.location_compare", "state-tx"),
    chartFixtureFor(fixtures, "calculator.payment_breakdown", "calc-payment"),
  ];

  for (const fixture of samples) {
    const html = renderChartFigure(fixture);
    assert.equal((html.match(/class="market-chart-mark"/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-label=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-value=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-source=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-as-of=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-tooltip(?:\s|>)/g) || []).length, 1);
    assert.match(html, /role="tooltip" hidden/);
    assert.doesNotMatch(html, /<title>/);
  }
});

test("line charts provide a larger transparent hit target", () => {
  const fixture = chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage");
  const html = renderChartFigure(fixture);
  assert.equal((html.match(/class="market-chart-hit-target"/g) || []).length, fixture.points.length);
  assert.match(html, /class="market-chart-hit-target"[^>]*r="16"/);
});

test("chart tooltip attributes escape public values", () => {
  const fixture = {
    ...chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage"),
    points: [{ label: "Unsafe", value: 1 }, { label: "Safe", value: 2 }],
    table: {
      headers: ["Period", "Value"],
      rows: [["<img src=x>", "\"quoted\""], ["Safe", "2%"]],
    },
  };
  const html = renderChartFigure(fixture);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /data-chart-label="&lt;img src=x&gt;"/);
  assert.match(html, /data-chart-value="&quot;quoted&quot;"/);
});

test("tooltip positioning follows the point and clamps inside the figure", () => {
  assert.deepEqual(computeChartTooltipPosition({
    figureWidth: 640,
    figureHeight: 400,
    tooltipWidth: 180,
    tooltipHeight: 90,
    x: 320,
    y: 200,
  }), { left: 332, top: 98 });

  assert.deepEqual(computeChartTooltipPosition({
    figureWidth: 320,
    figureHeight: 220,
    tooltipWidth: 180,
    tooltipHeight: 90,
    x: 315,
    y: 12,
  }), { left: 132, top: 24 });
});

test("delegated touch interactions hide prior figure tooltips and teardown clears all state", () => {
  const harness = chartInteractionHarness();
  const teardown = wireMarketChartInteractions(harness.root);

  harness.touch(harness.markA);
  assert.equal(harness.tooltipA.hidden, false);
  assert.equal(harness.markA.hasAttribute("data-chart-active"), true);

  harness.touch(harness.markB);
  assert.equal(harness.tooltipA.hidden, true);
  assert.equal(harness.markA.hasAttribute("data-chart-active"), false);
  assert.equal(harness.tooltipB.hidden, false);
  assert.equal(harness.markB.hasAttribute("data-chart-active"), true);

  harness.root.dispatch("pointerdown", { pointerType: "touch", target: {} });
  assert.equal(harness.tooltipA.hidden, true);
  assert.equal(harness.tooltipB.hidden, true);

  harness.touch(harness.markA);
  harness.touch(harness.markB);
  teardown();
  assert.equal(harness.tooltipA.hidden, true);
  assert.equal(harness.tooltipB.hidden, true);
  assert.equal(harness.root.listenerCount(), 0);
});

test("stylesheet covers chart marks, tooltips, and reduced motion", () => {
  const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(stylesheet, /\.market-chart-tooltip\s*\{/);
  assert.match(stylesheet, /\.market-chart-hit-target\s*\{/);
  assert.match(stylesheet, /\[data-chart-active="true"\]/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
});

test("keyboard chart marks retain an explicit high-contrast focus ring", () => {
  const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(stylesheet, /\.market-chart-mark:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--navy\);[^}]*outline-offset:\s*3px;/);
  assert.doesNotMatch(stylesheet, /\.market-chart-mark\s*\{[^}]*outline:\s*none;/);
});

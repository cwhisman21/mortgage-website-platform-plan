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

function markMarkup(html, label) {
  const mark = [...html.matchAll(/<g class="market-chart-mark"[\s\S]*?<\/g>/g)]
    .find(([markup]) => markup.includes(`data-chart-label="${label}"`));
  assert.ok(mark, `missing chart mark for ${label}`);
  return mark[0];
}

function rectMarkup(mark, className) {
  const rect = [...mark.matchAll(/<rect\b[^>]*>/g)]
    .find(([markup]) => markup.includes(`class="${className}"`));
  assert.ok(rect, `missing ${className} rect`);
  return rect[0];
}

function rectGeometry(mark, className) {
  const markup = rectMarkup(mark, className);
  const attribute = (name) => Number(markup.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]);
  return { x: attribute("x"), y: attribute("y"), width: attribute("width"), height: attribute("height") };
}

function paymentFixture(values) {
  const sourceFixture = chartFixtureFor(fixtures, "calculator.payment_breakdown", "calc-payment");
  return {
    ...sourceFixture,
    title: "Synthetic zero payment breakdown",
    points: values.map((value, index) => ({ label: `Component ${index + 1}`, value })),
    table: {
      headers: ["Payment component", "Monthly estimate"],
      rows: values.map((value, index) => [`Component ${index + 1}`, `$${value}`]),
    },
  };
}

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
      ["[data-chart-tooltip-context]", { textContent: "" }],
      ["[data-chart-tooltip-status]", { textContent: "" }],
      ["[data-chart-tooltip-as-of]", { textContent: "", hidden: false }],
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
      dataset: {
        chartLabel: label,
        chartValue: "$100",
        chartSource: "Source",
        chartContext: "United States | Rate | Weekly",
        chartStatus: "Official observation",
        chartAsOf: "July 9, 2026",
      },
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
    assert.equal(Boolean(fixture.asOf), fixture.dataMode === "official_observation");
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

test("the rate trend uses exact Freddie Mac PMMS releases through July 9, 2026", () => {
  const fixture = chartFixtureFor(fixtures, "rates.benchmark_trend", "rates-mortgage");
  assert.equal(fixture.dataMode, "official_observation");
  assert.equal(fixture.sourceId, "freddie-pmms");
  assert.equal(fixture.asOf, "July 9, 2026");
  assert.equal(fixture.geography, "United States");
  assert.deepEqual(fixture.points.map(({ label, value }) => ({ label, value })), [
    { label: "May 14, 2026", value: 6.36 },
    { label: "May 28, 2026", value: 6.53 },
    { label: "June 11, 2026", value: 6.52 },
    { label: "June 25, 2026", value: 6.49 },
    { label: "July 2, 2026", value: 6.43 },
    { label: "July 9, 2026", value: 6.49 },
  ]);
  assert.equal(fixture._source.url, "https://www.freddiemac.com/pmms/archive");

  const html = renderChartFigure(fixture);
  assert.match(html, /<figure/);
  assert.match(html, /Source:/);
  assert.match(html, /As of: July 9, 2026/);
  assert.match(html, /national weekly average/i);
  assert.match(html, /not a Snap offer, APR, or personalized rate/i);
  assert.match(html, /<details/);
  assert.match(html, /<table/);
  assert.match(html, /role="img"/);
  assert.doesNotMatch(html, /placeholder|fixture|integrationKey|Source unavailable/i);
});

test("the ACS registry carries the correct 2020-2024 vintage and release date", () => {
  const source = fixtures.sources.find(({ id }) => id === "census-acs");
  assert.equal(source.asOf, "2024 ACS 5-year estimates (2020-2024), released January 29, 2026");
});

test("synthetic charts attribute values to internal assumptions and agencies only as background", () => {
  const planningFixtures = fixtures.charts.filter(({ dataMode }) => dataMode === "planning_illustration");
  assert.ok(planningFixtures.length > 0);

  for (const fixture of planningFixtures) {
    assert.equal(fixture.sourceId, "illustrative-assumptions");
    assert.equal(fixture._source.kind, "internal_assumption");
    assert.equal(fixture.asOf, undefined);
    assert.ok(fixture.backgroundSourceIds?.length, `${fixture.chartId}/${fixture.entityId} needs a background reference`);
    assert.ok(fixture.points.every(({ status }) => status === "illustrative_assumption"));
    assert.ok(fixture.table.headers.some((header) => /example|illustrative/i.test(header)), `${fixture.chartId}/${fixture.entityId} must label table values as examples`);

    const html = renderChartFigure(fixture);
    assert.match(html, /Example values:/);
    assert.match(html, /not observed market data/i);
    assert.match(html, /Background references:/);
    assert.match(html, /did not publish the displayed examples/i);
    assert.doesNotMatch(html, /As of:/);
    assert.match(html, /data-chart-status="Illustrative assumption; not observed market data\."/);
  }
});

test("snapshot source note separates assumptions from official background references", () => {
  const html = renderSnapshotSourceNote(fixtures, "city_snapshot", "city-austin-tx");
  assert.match(html, /Example values:/);
  assert.match(html, /not observed local market data/i);
  assert.match(html, /Background references:/);
  assert.match(html, /did not publish the displayed examples/i);
  assert.doesNotMatch(html, /vintage|cadence|status|integrationKey|fixture/i);
});

test("fixture loader rejects invalid chart contracts", () => {
  const invalid = {
    sources: [{ id: "source", kind: "official_observation", label: "Source", cadence: "Annual", asOf: "2026" }],
    charts: [{
      chartId: "chart", entityId: "entity", scope: "scope", title: "Title", summary: "Summary",
      chartType: "unknown", unit: "Unit", frequency: "Annual", geography: "United States", sourceId: "source", asOf: "2026", integrationKey: "key",
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
    assert.equal((html.match(/data-chart-context=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-status=/g) || []).length, fixture.points.length);
    assert.equal((html.match(/data-chart-as-of=/g) || []).length, fixture.dataMode === "official_observation" ? fixture.points.length : 0);
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

test("the shipped VA zero down payment keeps its zero-height data bar and gets a minimum hit target", () => {
  const fixture = chartFixtureFor(fixtures, "product.scenario_compare", "product-va");
  const html = renderChartFigure(fixture);
  const downPayment = markMarkup(html, "Down payment");
  const visibleBar = rectGeometry(downPayment, "market-chart-bar");
  const hitTarget = rectGeometry(downPayment, "market-chart-hit-target");

  assert.equal(visibleBar.height, 0);
  assert.ok(hitTarget.width >= 16);
  assert.ok(hitTarget.height >= 16);
  assert.ok(hitTarget.x >= 0 && hitTarget.y >= 0);
  assert.ok(hitTarget.x + hitTarget.width <= 640);
  assert.ok(hitTarget.y + hitTarget.height <= 250);
  assert.equal((html.match(/class="market-chart-hit-target"/g) || []).length, fixture.points.length);
});

test("payment marks give zero segments distinct bounded hit targets without changing their visible widths", () => {
  const scenarios = [
    [0, 0, 100],
    [100, 0, 100],
    [100, 0, 0],
    [0, 0, 0],
    Array.from({ length: 33 }, () => 0),
  ];

  for (const values of scenarios) {
    const fixture = paymentFixture(values);
    const html = renderChartFigure(fixture);
    const targets = fixture.points.map((point) => rectGeometry(markMarkup(html, point.label), "market-chart-hit-target"));

    assert.equal((html.match(/class="market-chart-mark"/g) || []).length, values.length);
    assert.equal((html.match(/class="market-chart-hit-target"/g) || []).length, values.length);
    targets.forEach((target) => {
      assert.ok(target.width >= 16);
      assert.ok(target.height >= 16);
      assert.ok(target.x >= 32 && target.y >= 0);
      assert.ok(target.x + target.width <= 608);
      assert.ok(target.y + target.height <= 250);
    });

    values.forEach((value, index) => {
      const visibleBar = rectGeometry(markMarkup(html, `Component ${index + 1}`), "market-chart-bar");
      if (value === 0) {
        assert.equal(visibleBar.width, 0);
        assert.ok(targets[index].y >= visibleBar.y + visibleBar.height);
      } else {
        assert.deepEqual(targets[index], visibleBar);
      }
    });

    for (let index = 1; index < values.length; index += 1) {
      if (values[index - 1] !== 0 || values[index] !== 0) continue;
      assert.ok(targets[index - 1].x + targets[index - 1].width <= targets[index].x || targets[index].x + targets[index].width <= targets[index - 1].x);
    }
  }
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

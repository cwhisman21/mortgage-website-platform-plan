# Market Chart Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every line point, bar, and payment segment reveal its label, formatted value, source, and date by mouse, keyboard, and touch.

**Architecture:** Extend the shared chart renderer with one escaped chart-mark contract and one tooltip per figure. Attach a single delegated interaction initializer to the stable app root so fixture charts and calculator-generated charts behave identically without page-specific listeners.

**Tech Stack:** Static ES modules, inline SVG, delegated Pointer Events, semantic HTML/CSS, Node test runner, local Chrome browser verification.

## Global Constraints

- Tooltip content includes label, formatted value, source name, and public as-of date.
- Preserve the existing source line and expandable data table.
- Apply to line, bar, and payment charts across rates, locations, products, calculators, and articles.
- Support mouse, keyboard, touch, and Escape dismissal.
- Keep tooltip placement inside the chart figure and prevent page overflow.
- Calculator-generated charts must work without separate rewiring.
- Do not add a charting or tooltip dependency.

---

### Task 1: Add the reusable chart-mark and tooltip markup contract

**Files:**
- Modify: `site/market-charts.mjs`
- Test: `site/market-charts.test.mjs`

**Interfaces:**
- Consumes: validated fixture table rows and `_source` metadata.
- Produces: `.market-chart-mark` groups with `data-chart-label`, `data-chart-value`, `data-chart-source`, and `data-chart-as-of`; one `[data-chart-tooltip]` element per figure.

- [ ] **Step 1: Write the failing markup tests**

Append to `site/market-charts.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the markup tests and verify they fail**

Run:

```powershell
node --test site\market-charts.test.mjs
```

Expected: FAIL because chart marks and tooltip markup are not present.

- [ ] **Step 3: Add escaped mark-detail helpers**

Remove the existing `pointLabel()` helper, then add these helpers after `seriesDescription()` in `site/market-charts.mjs`:

```js
function pointDetails(fixture, index) {
  const row = fixture.table.rows[index] || [];
  const label = String(row[0] ?? fixture.points[index].label);
  const value = String(row.slice(1).join(" | ") || fixture.points[index].value);
  const source = String(fixture._source?.label || "Source");
  const asOf = String(fixture.asOf);
  return { label, value, source, asOf };
}

function markAttributes(fixture, index) {
  const details = pointDetails(fixture, index);
  const accessibleName = `${details.label}: ${details.value}. Source: ${details.source}. As of: ${details.asOf}.`;
  return `class="market-chart-mark" tabindex="0" role="img" aria-label="${escapeHtml(accessibleName)}" data-chart-label="${escapeHtml(details.label)}" data-chart-value="${escapeHtml(details.value)}" data-chart-source="${escapeHtml(details.source)}" data-chart-as-of="${escapeHtml(details.asOf)}"`;
}

function tooltipMarkup() {
  return `<div class="market-chart-tooltip" role="tooltip" data-chart-tooltip hidden><strong data-chart-tooltip-label></strong><span data-chart-tooltip-value></span><small><span data-chart-tooltip-source></span><span data-chart-tooltip-as-of></span></small></div>`;
}
```

- [ ] **Step 4: Render interactive groups for all chart types**

Replace `lineSvg()` with:

```js
function lineSvg(fixture) {
  const values = fixture.points.map((point) => number(point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 640;
  const height = 250;
  const pad = 32;
  const xy = (value, index) => `${pad + (index * (width - pad * 2)) / Math.max(fixture.points.length - 1, 1)},${height - pad - ((value - min) / span) * (height - pad * 2)}`;
  const marks = fixture.points.map((point, index) => {
    const [cx, cy] = xy(number(point.value), index).split(",");
    return `<g ${markAttributes(fixture, index)}><circle class="market-chart-hit-target" cx="${cx}" cy="${cy}" r="16"/><circle class="market-chart-point" cx="${cx}" cy="${cy}" r="5" fill="currentColor"/></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" focusable="false" aria-label="${escapeHtml(seriesDescription(fixture))}"><path d="M${pad} ${height - pad}H${width - pad}" stroke="currentColor" opacity=".25"/><polyline fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${fixture.points.map((point, index) => xy(number(point.value), index)).join(" ")}"/>${marks}</svg>`;
}
```

Replace `barSvg()` with:

```js
function barSvg(fixture, stacked = false) {
  const values = fixture.points.map((point) => Math.max(number(point.value), 0));
  const max = stacked ? values.reduce((sum, value) => sum + value, 0) || 1 : Math.max(...values, 1);
  const width = 640;
  const height = 250;
  const pad = 32;
  const svgOpen = `<svg viewBox="0 0 ${width} ${height}" role="img" focusable="false" aria-label="${escapeHtml(seriesDescription(fixture))}">`;

  if (stacked) {
    let offset = pad;
    const marks = values.map((value, index) => {
      const barWidth = (value / max) * (width - pad * 2);
      const rect = `<g ${markAttributes(fixture, index)}><rect class="market-chart-bar" x="${offset}" y="80" width="${barWidth}" height="90" fill="currentColor" opacity="${0.45 + index * 0.12}"/></g>`;
      offset += barWidth;
      return rect;
    }).join("");
    return `${svgOpen}${marks}</svg>`;
  }

  const gap = 18;
  const available = width - pad * 2;
  const barWidth = Math.max(available / fixture.points.length - gap, 8);
  const marks = values.map((value, index) => {
    const barHeight = (value / max) * (height - pad * 2);
    return `<g ${markAttributes(fixture, index)}><rect class="market-chart-bar" x="${pad + index * (barWidth + gap)}" y="${height - pad - barHeight}" width="${barWidth}" height="${barHeight}" fill="currentColor"/></g>`;
  }).join("");
  return `${svgOpen}<path d="M${pad} ${height - pad}H${width - pad}" stroke="currentColor" opacity=".25"/>${marks}</svg>`;
}
```

In `renderChartFigure()`, add `data-market-chart` to the `<figure>` and insert `${tooltipMarkup()}` immediately after `${graphic}`:

```js
return `<figure class="market-chart-figure market-chart-${fixture.chartType}" data-market-chart><figcaption><strong>${escapeHtml(fixture.title)}</strong><p>${escapeHtml(fixture.summary)}</p></figcaption>${graphic}${tooltipMarkup()}<p class="market-chart-source">${sourceLead} ${sourceMarkup}. As of: ${escapeHtml(fixture.asOf)}.</p>${dataTable(fixture)}</figure>`;
```

- [ ] **Step 5: Run the markup tests and verify they pass**

Run:

```powershell
node --test site\market-charts.test.mjs site\market-integration.test.mjs
```

Expected: all chart tests pass.

- [ ] **Step 6: Commit the markup contract**

```powershell
git add site/market-charts.mjs site/market-charts.test.mjs
git commit -m "feat: add interactive chart mark metadata"
```

### Task 2: Add delegated mouse, keyboard, and touch behavior

**Files:**
- Modify: `site/market-charts.mjs`
- Modify: `site/market-charts.test.mjs`
- Modify: `site/app.js`

**Interfaces:**
- Consumes: the mark and tooltip attributes from Task 1.
- Produces: `computeChartTooltipPosition(input): { left: number, top: number }` and `wireMarketChartInteractions(root): () => void`.

- [ ] **Step 1: Write failing position tests**

Import `computeChartTooltipPosition` in `site/market-charts.test.mjs` and append:

```js
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
```

- [ ] **Step 2: Run the position test and verify it fails**

Run:

```powershell
node --test site\market-charts.test.mjs
```

Expected: FAIL because `computeChartTooltipPosition` is not exported.

- [ ] **Step 3: Implement clamped positioning**

Add to `site/market-charts.mjs`:

```js
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export function computeChartTooltipPosition({
  figureWidth,
  figureHeight,
  tooltipWidth,
  tooltipHeight,
  x,
  y,
  gap = 12,
  padding = 8,
}) {
  let top = y - tooltipHeight - gap;
  if (top < padding) top = y + gap;
  return {
    left: Math.round(clamp(x + gap, padding, figureWidth - tooltipWidth - padding)),
    top: Math.round(clamp(top, padding, figureHeight - tooltipHeight - padding)),
  };
}
```

- [ ] **Step 4: Implement the delegated initializer**

Add this export after the positioning helper:

```js
export function wireMarketChartInteractions(root) {
  if (!root?.addEventListener) return () => {};

  let activeMark = null;
  let touchPinned = false;
  const listeners = [];
  const on = (type, handler) => {
    root.addEventListener(type, handler);
    listeners.push([type, handler]);
  };
  const markFrom = (target) => typeof target?.closest === "function" ? target.closest(".market-chart-mark") : null;

  const hide = () => {
    if (!activeMark) return;
    const tooltip = activeMark.closest("[data-market-chart]")?.querySelector("[data-chart-tooltip]");
    activeMark.removeAttribute("data-chart-active");
    if (tooltip) tooltip.hidden = true;
    activeMark = null;
    touchPinned = false;
  };

  const show = (mark, event) => {
    const figure = mark?.closest("[data-market-chart]");
    const tooltip = figure?.querySelector("[data-chart-tooltip]");
    if (!figure || !tooltip) return;

    if (activeMark && activeMark !== mark) activeMark.removeAttribute("data-chart-active");
    activeMark = mark;
    mark.setAttribute("data-chart-active", "true");
    tooltip.querySelector("[data-chart-tooltip-label]").textContent = mark.dataset.chartLabel;
    tooltip.querySelector("[data-chart-tooltip-value]").textContent = mark.dataset.chartValue;
    tooltip.querySelector("[data-chart-tooltip-source]").textContent = mark.dataset.chartSource;
    tooltip.querySelector("[data-chart-tooltip-as-of]").textContent = `As of ${mark.dataset.chartAsOf}`;
    tooltip.hidden = false;

    const figureRect = figure.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const hasPointer = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
    const x = hasPointer ? event.clientX - figureRect.left : markRect.left + markRect.width / 2 - figureRect.left;
    const y = hasPointer ? event.clientY - figureRect.top : markRect.top - figureRect.top;
    const position = computeChartTooltipPosition({
      figureWidth: figureRect.width,
      figureHeight: figureRect.height,
      tooltipWidth: tooltipRect.width,
      tooltipHeight: tooltipRect.height,
      x,
      y,
    });
    tooltip.style.left = `${position.left}px`;
    tooltip.style.top = `${position.top}px`;
  };

  on("pointerover", (event) => {
    const mark = markFrom(event.target);
    if (mark && event.pointerType !== "touch") show(mark, event);
  });
  on("pointermove", (event) => {
    const mark = markFrom(event.target);
    if (mark && mark === activeMark && !touchPinned) show(mark, event);
  });
  on("pointerout", (event) => {
    const mark = markFrom(event.target);
    if (!mark || mark.contains(event.relatedTarget) || touchPinned || mark.matches(":focus")) return;
    hide();
  });
  on("pointerdown", (event) => {
    const mark = markFrom(event.target);
    if (event.pointerType === "touch" && mark) {
      touchPinned = true;
      show(mark, event);
      return;
    }
    if (!mark && activeMark) hide();
  });
  on("focusin", (event) => {
    const mark = markFrom(event.target);
    if (mark) {
      touchPinned = false;
      show(mark);
    }
  });
  on("focusout", (event) => {
    const mark = markFrom(event.target);
    if (mark && !mark.contains(event.relatedTarget)) hide();
  });
  on("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  return () => {
    hide();
    listeners.forEach(([type, handler]) => root.removeEventListener(type, handler));
  };
}
```

- [ ] **Step 5: Wire the stable application root once**

Add `wireMarketChartInteractions` to the existing import from `/site/market-charts.mjs`, then call it immediately after the `app` constant is created:

```js
const app = document.getElementById("app");
wireMarketChartInteractions(app);
```

Do not add chart listeners inside `wireInteractions()` or calculator submission handlers. Event delegation must cover all later chart replacements.

- [ ] **Step 6: Run the focused tests**

Run:

```powershell
node --test site\market-charts.test.mjs site\market-integration.test.mjs
node --check site\app.js
```

Expected: all tests pass and `app.js` syntax exits `0`.

- [ ] **Step 7: Commit the interaction behavior**

```powershell
git add site/market-charts.mjs site/market-charts.test.mjs site/app.js
git commit -m "feat: add delegated chart tooltip interactions"
```

### Task 3: Style active marks and verify every chart surface

**Files:**
- Modify: `site/market-charts.test.mjs`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: chart-mark and tooltip classes from Tasks 1 and 2.
- Produces: visible active states and a clamped dark-navy tooltip with reduced-motion support.

- [ ] **Step 1: Add a failing stylesheet contract test**

Append to `site/market-charts.test.mjs`:

```js
test("stylesheet covers chart marks, tooltips, and reduced motion", () => {
  const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(stylesheet, /\.market-chart-tooltip\s*\{/);
  assert.match(stylesheet, /\.market-chart-hit-target\s*\{/);
  assert.match(stylesheet, /\[data-chart-active="true"\]/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
});
```

- [ ] **Step 2: Run the stylesheet test and verify it fails**

Run:

```powershell
node --test site\market-charts.test.mjs
```

Expected: FAIL because tooltip and active-mark styles are absent.

- [ ] **Step 3: Add tooltip and mark styling**

Add after the existing `.market-chart-figure svg` rule:

```css
.market-chart-figure {
  position: relative;
}

.market-chart-mark {
  cursor: crosshair;
  outline: none;
}

.market-chart-hit-target {
  fill: transparent;
  stroke: none;
  pointer-events: all;
}

.market-chart-point,
.market-chart-bar {
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 140ms ease, stroke 140ms ease, stroke-width 140ms ease, transform 140ms ease;
}

.market-chart-mark:hover .market-chart-point,
.market-chart-mark:focus-visible .market-chart-point,
.market-chart-mark[data-chart-active="true"] .market-chart-point,
.market-chart-mark:hover .market-chart-bar,
.market-chart-mark:focus-visible .market-chart-bar,
.market-chart-mark[data-chart-active="true"] .market-chart-bar {
  opacity: 1;
  stroke: var(--snap-amber);
  stroke-width: 4;
  transform: scale(1.025);
}

.market-chart-tooltip {
  position: absolute;
  z-index: 4;
  display: grid;
  gap: 3px;
  width: max-content;
  max-width: min(240px, calc(100% - 16px));
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--navy);
  box-shadow: 0 12px 28px rgba(16, 37, 74, 0.22);
  color: #fff;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.market-chart-tooltip[hidden] {
  display: none;
}

.market-chart-tooltip strong,
.market-chart-tooltip span,
.market-chart-tooltip small {
  display: block;
}

.market-chart-tooltip > span {
  font-size: 16px;
  font-weight: 900;
}

.market-chart-tooltip small {
  margin-top: 3px;
  color: #dce8f7;
  font-size: 11px;
  line-height: 1.35;
}

@media (prefers-reduced-motion: reduce) {
  .market-chart-point,
  .market-chart-bar,
  .market-chart-tooltip {
    transition: none;
  }
}
```

- [ ] **Step 4: Run complete automated validation**

Run:

```powershell
node --test site\market-charts.test.mjs site\market-integration.test.mjs
node --test site\*.test.mjs mock-data\tests\*.test.mjs
node site\phase2-static-smoke.mjs
node --check site\app.js
git diff --check
```

Expected: all tests pass, static smoke has no missing routes, syntax exits `0`, and diff check is clean.

- [ ] **Step 5: Verify pointer, keyboard, touch, and dynamic charts in Chrome**

Using `http://127.0.0.1:4176`:

1. Open `/rates`, hover the first line point, and confirm label, formatted value, source, and date are visible.
2. Move the pointer to the rightmost point and confirm the tooltip remains inside the figure.
3. Tab to a point, confirm the tooltip opens, then press Escape and confirm it closes.
4. Open `/locations/texas`, hover a comparison bar and confirm the bar highlight and tooltip.
5. Open `/calculators/mortgage-payment`, submit the form, then hover a newly rendered payment segment and confirm its tooltip works without another initializer call.
6. Emulate a touch pointer on one mark, then touch outside the chart and confirm dismissal.
7. At `390x844`, confirm `document.documentElement.scrollWidth === window.innerWidth`.
8. Confirm the browser records no `pageerror` or error-level console messages.

- [ ] **Step 6: Commit the visual and accessibility task**

```powershell
git add site/market-charts.test.mjs site/styles.css
git commit -m "style: add accessible chart data tooltips"
```

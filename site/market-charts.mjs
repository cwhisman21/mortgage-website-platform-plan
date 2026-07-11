const requiredFixtureFields = [
  "chartId", "entityId", "scope", "title", "summary", "chartType",
  "unit", "frequency", "sourceId", "asOf", "integrationKey", "points", "table",
];

const chartTypes = new Set(["line", "bar", "payment"]);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const safeUrl = (value) => {
  try { return new URL(value).protocol === "https:" ? value : null; } catch { return null; }
};
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const assertFixture = (condition, message) => {
  if (!condition) throw new Error(message);
};

function validateSource(source) {
  assertFixture(source && nonEmptyString(source.id), "Market chart source is missing an id.");
  assertFixture(nonEmptyString(source.label), `Market chart source ${source.id} is missing a label.`);
  assertFixture(nonEmptyString(source.asOf), `Market chart source ${source.id} is missing an asOf value.`);
  assertFixture(nonEmptyString(source.cadence), `Market chart source ${source.id} is missing a cadence.`);
  return { ...source };
}

function validateChartFixture(fixture, sourceById) {
  for (const field of requiredFixtureFields) {
    assertFixture(fixture && fixture[field], `Market chart fixture is missing ${field}.`);
  }
  assertFixture(chartTypes.has(fixture.chartType), `Unsupported market chart type ${fixture.chartType}.`);
  assertFixture(sourceById.has(fixture.sourceId), `Unknown chart source ${fixture.sourceId}.`);
  assertFixture(Array.isArray(fixture.points) && fixture.points.length >= 2, "Market chart fixture must include at least two points.");
  fixture.points.forEach((point) => {
    assertFixture(point && nonEmptyString(point.label), "Market chart point is missing a label.");
    assertFixture(Number.isFinite(Number(point.value)), `Market chart point ${point.label} must have a numeric value.`);
  });
  assertFixture(Array.isArray(fixture.table.headers) && fixture.table.headers.length >= 2, "Market chart fixture must include table headers.");
  assertFixture(Array.isArray(fixture.table.rows) && fixture.table.rows.length === fixture.points.length, "Market chart table rows must match its points.");
  fixture.table.rows.forEach((row) => {
    assertFixture(Array.isArray(row) && row.length === fixture.table.headers.length, "Market chart table row does not match its headers.");
  });
  return { ...fixture, _source: sourceById.get(fixture.sourceId) };
}

export function loadMarketChartFixtures(raw) {
  assertFixture(raw && Array.isArray(raw.sources) && Array.isArray(raw.charts) && Array.isArray(raw.snapshotSources), "Market chart fixtures must include sources, charts, and snapshotSources arrays.");
  const sources = raw.sources.map(validateSource);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  assertFixture(sourceById.size === sources.length, "Market chart source ids must be unique.");
  const charts = raw.charts.map((fixture) => validateChartFixture(fixture, sourceById));
  const snapshotSources = raw.snapshotSources.map((note) => {
    assertFixture(note && nonEmptyString(note.scope) && nonEmptyString(note.entityId), "Market chart snapshot source is missing scope or entityId.");
    assertFixture(Array.isArray(note.sourceIds) && note.sourceIds.length > 0, "Market chart snapshot source must include source ids.");
    note.sourceIds.forEach((sourceId) => assertFixture(sourceById.has(sourceId), `Unknown snapshot source ${sourceId}.`));
    return { ...note };
  });
  return { ...raw, sources, charts, snapshotSources };
}

export function chartFixtureFor(fixtures, chartId, entityId) {
  return fixtures?.charts?.find((fixture) => fixture.chartId === chartId && fixture.entityId === entityId)
    || fixtures?.charts?.find((fixture) => fixture.chartId === chartId && fixture.entityId === "default")
    || null;
}

function seriesDescription(fixture) {
  return `${fixture.title}. ${fixture.table.rows.map((row) => row.join(": ")).join("; ")}.`;
}

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
  return `<div class="market-chart-tooltip" role="tooltip" hidden data-chart-tooltip><strong data-chart-tooltip-label></strong><span data-chart-tooltip-value></span><small><span data-chart-tooltip-source></span><span data-chart-tooltip-as-of></span></small></div>`;
}

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

function dataTable(fixture) {
  return `<details class="market-chart-details"><summary>View data table</summary><div class="table-wrap"><table aria-label="${escapeHtml(fixture.title)} data table"><thead><tr>${fixture.table.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${fixture.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
}

export function renderChartFigure(fixture) {
  if (!fixture) return "";
  const source = fixture._source;
  const sourceUrl = safeUrl(source?.url);
  const graphic = fixture.chartType === "line" ? lineSvg(fixture) : barSvg(fixture, fixture.chartType === "payment");
  const sourceMarkup = sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a>` : escapeHtml(source?.label || "Source unavailable");
  const sourceLead = fixture.dataMode === "planning_illustration"
    ? "Planning illustration. Reference:"
    : fixture.dataMode === "input_estimate"
      ? "Estimate based on the inputs shown. Reference:"
      : "Source:";
  return `<figure class="market-chart-figure market-chart-${fixture.chartType}" data-market-chart><figcaption><strong>${escapeHtml(fixture.title)}</strong><p>${escapeHtml(fixture.summary)}</p></figcaption>${graphic}${tooltipMarkup()}<p class="market-chart-source">${sourceLead} ${sourceMarkup}. As of: ${escapeHtml(fixture.asOf)}.</p>${dataTable(fixture)}</figure>`;
}

export function renderSnapshotSourceNote(fixtures, scope, entityId) {
  const note = fixtures?.snapshotSources?.find((item) => item.scope === scope && item.entityId === entityId);
  if (!note) return "";
  const sourceById = new Map((fixtures.sources || []).map((source) => [source.id, source]));
  const sources = note.sourceIds.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
  if (!sources.length) return "";
  const links = sources.map((source) => { const url = safeUrl(source.url); return url ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a>` : escapeHtml(source.label); });
  const lead = note.dataMode === "planning_illustration" ? "Market planning references:" : "Sources:";
  return `<p class="market-chart-source">${lead} ${links.join(", ")}. Reference dates: ${escapeHtml(sources.map((source) => source.asOf).join("; "))}.</p>`;
}

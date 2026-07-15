const requiredFixtureFields = [
  "chartId", "entityId", "scope", "title", "summary", "chartType",
  "unit", "frequency", "geography", "sourceId", "integrationKey", "points", "table",
];

const chartTypes = new Set(["line", "bar", "payment"]);
const sourceKinds = new Set(["internal_assumption", "background_reference", "official_observation"]);
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
  assertFixture(sourceKinds.has(source.kind), `Market chart source ${source.id} has an unsupported kind.`);
  assertFixture(nonEmptyString(source.cadence), `Market chart source ${source.id} is missing a cadence.`);
  if (source.kind !== "internal_assumption") {
    assertFixture(nonEmptyString(source.asOf), `Market chart source ${source.id} is missing an asOf value.`);
  }
  return { ...source };
}

function validateChartFixture(fixture, sourceById) {
  for (const field of requiredFixtureFields) {
    assertFixture(fixture && fixture[field], `Market chart fixture is missing ${field}.`);
  }
  assertFixture(chartTypes.has(fixture.chartType), `Unsupported market chart type ${fixture.chartType}.`);
  assertFixture(sourceById.has(fixture.sourceId), `Unknown chart source ${fixture.sourceId}.`);
  const source = sourceById.get(fixture.sourceId);
  assertFixture(Array.isArray(fixture.points) && fixture.points.length >= 2, "Market chart fixture must include at least two points.");
  fixture.points.forEach((point) => {
    assertFixture(point && nonEmptyString(point.label), "Market chart point is missing a label.");
    assertFixture(Number.isFinite(Number(point.value)), `Market chart point ${point.label} must have a numeric value.`);
  });
  if (fixture.dataMode === "planning_illustration") {
    assertFixture(source.kind === "internal_assumption", "Planning charts must use an internal assumption source.");
    assertFixture(!fixture.asOf, "Planning charts must not carry an observation asOf date.");
    assertFixture(Array.isArray(fixture.backgroundSourceIds) && fixture.backgroundSourceIds.length > 0, "Planning charts must include background source ids.");
    assertFixture(fixture.points.every((point) => point.status === "illustrative_assumption"), "Planning chart points must be labeled as illustrative assumptions.");
  } else if (fixture.dataMode === "official_observation") {
    assertFixture(source.kind === "official_observation", "Official charts must use an official observation source.");
    assertFixture(nonEmptyString(fixture.asOf), "Official charts must include an asOf date.");
    assertFixture(fixture.points.every((point) => point.status === "official_observation"), "Official chart points must be labeled as official observations.");
  }
  const backgroundSourceIds = fixture.backgroundSourceIds || [];
  backgroundSourceIds.forEach((sourceId) => assertFixture(sourceById.has(sourceId), `Unknown chart background source ${sourceId}.`));
  assertFixture(Array.isArray(fixture.table.headers) && fixture.table.headers.length >= 2, "Market chart fixture must include table headers.");
  assertFixture(Array.isArray(fixture.table.rows) && fixture.table.rows.length === fixture.points.length, "Market chart table rows must match its points.");
  fixture.table.rows.forEach((row) => {
    assertFixture(Array.isArray(row) && row.length === fixture.table.headers.length, "Market chart table row does not match its headers.");
  });
  return { ...fixture, _source: source, _backgroundSources: backgroundSourceIds.map((sourceId) => sourceById.get(sourceId)) };
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
    (note.backgroundSourceIds || []).forEach((sourceId) => assertFixture(sourceById.has(sourceId), `Unknown snapshot background source ${sourceId}.`));
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
const minimumHitTargetSize = 16;

function rectangularHitTarget(x, y, markWidth, markHeight, viewBoxWidth, viewBoxHeight) {
  const width = Math.max(markWidth, minimumHitTargetSize);
  const height = Math.max(markHeight, minimumHitTargetSize);
  return {
    x: clamp(x - (width - markWidth) / 2, 0, viewBoxWidth - width),
    y: clamp(y - (height - markHeight) / 2, 0, viewBoxHeight - height),
    width,
    height,
  };
}

function hitTargetMarkup({ x, y, width, height }) {
  return `<rect class="market-chart-hit-target" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
}

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

  const hideMark = (mark) => {
    const tooltip = mark?.closest("[data-market-chart]")?.querySelector("[data-chart-tooltip]");
    mark?.removeAttribute("data-chart-active");
    if (tooltip) tooltip.hidden = true;
  };

  const hide = () => {
    if (!activeMark) return;
    hideMark(activeMark);
    activeMark = null;
    touchPinned = false;
  };

  const show = (mark, event) => {
    const figure = mark?.closest("[data-market-chart]");
    const tooltip = figure?.querySelector("[data-chart-tooltip]");
    if (!figure || !tooltip) return;

    if (activeMark && activeMark !== mark) hideMark(activeMark);
    activeMark = mark;
    mark.setAttribute("data-chart-active", "true");
    tooltip.querySelector("[data-chart-tooltip-label]").textContent = mark.dataset.chartLabel;
    tooltip.querySelector("[data-chart-tooltip-value]").textContent = mark.dataset.chartValue;
    tooltip.querySelector("[data-chart-tooltip-source]").textContent = mark.dataset.chartSource;
    tooltip.querySelector("[data-chart-tooltip-context]").textContent = mark.dataset.chartContext;
    tooltip.querySelector("[data-chart-tooltip-status]").textContent = mark.dataset.chartStatus;
    const asOf = tooltip.querySelector("[data-chart-tooltip-as-of]");
    asOf.textContent = mark.dataset.chartAsOf ? `As of ${mark.dataset.chartAsOf}` : "";
    asOf.hidden = !mark.dataset.chartAsOf;
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
  const point = fixture.points[index];
  const label = String(row[0] ?? fixture.points[index].label);
  const value = String(row.slice(1).join(" | ") || fixture.points[index].value);
  const source = String(fixture._source?.label || "Source");
  const context = `${fixture.geography} | ${fixture.unit} | ${fixture.frequency}`;
  const status = point.status === "illustrative_assumption"
    ? "Illustrative assumption; not observed market data."
    : "Official Freddie Mac PMMS weekly average.";
  const asOf = fixture.asOf ? String(fixture.asOf) : "";
  return { label, value, source, context, status, asOf };
}

function markAttributes(fixture, index) {
  const details = pointDetails(fixture, index);
  const accessibleName = `${details.label}: ${details.value}. ${details.context}. Source: ${details.source}. ${details.status}${details.asOf ? ` As of: ${details.asOf}.` : ""}`;
  const asOfAttribute = details.asOf ? ` data-chart-as-of="${escapeHtml(details.asOf)}"` : "";
  return `class="market-chart-mark" tabindex="0" role="img" aria-label="${escapeHtml(accessibleName)}" data-chart-label="${escapeHtml(details.label)}" data-chart-value="${escapeHtml(details.value)}" data-chart-source="${escapeHtml(details.source)}" data-chart-context="${escapeHtml(details.context)}" data-chart-status="${escapeHtml(details.status)}"${asOfAttribute}`;
}

function tooltipMarkup() {
  return `<div class="market-chart-tooltip" role="tooltip" hidden data-chart-tooltip><strong data-chart-tooltip-label></strong><span data-chart-tooltip-value></span><small><span data-chart-tooltip-context></span><span data-chart-tooltip-source></span><span data-chart-tooltip-status></span><span data-chart-tooltip-as-of></span></small></div>`;
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
    const segmentWidths = values.map((value) => (value / max) * (width - pad * 2));
    let segmentOffset = pad;
    const segments = segmentWidths.map((barWidth) => {
      const segment = { x: segmentOffset, width: barWidth };
      segmentOffset += barWidth;
      return segment;
    });
    const zeroTargets = new Map();
    for (let index = 0; index < values.length;) {
      if (values[index] !== 0) {
        index += 1;
        continue;
      }
      const start = index;
      while (index < values.length && values[index] === 0) index += 1;
      const targetsPerRow = Math.floor((width - pad * 2 - minimumHitTargetSize) / 18) + 1;
      for (let rowStart = start; rowStart < index; rowStart += targetsPerRow) {
        const rowEnd = Math.min(rowStart + targetsPerRow, index);
        const rowWidth = minimumHitTargetSize + (rowEnd - rowStart - 1) * 18;
        const targetStart = clamp(segments[start].x - rowWidth / 2, pad, width - pad - rowWidth);
        for (let zeroIndex = rowStart; zeroIndex < rowEnd; zeroIndex += 1) {
          zeroTargets.set(zeroIndex, {
            x: targetStart + (zeroIndex - rowStart) * 18,
            y: 176 + Math.floor((rowStart - start) / targetsPerRow) * 18,
            width: minimumHitTargetSize,
            height: minimumHitTargetSize,
          });
        }
      }
    }
    const marks = segments.map(({ x, width: barWidth }, index) => {
      const hitTarget = zeroTargets.get(index) || { x, y: 80, width: barWidth, height: 90 };
      const rect = `<g ${markAttributes(fixture, index)}>${hitTargetMarkup(hitTarget)}<rect class="market-chart-bar" x="${x}" y="80" width="${barWidth}" height="90" fill="currentColor" opacity="${0.45 + index * 0.12}"/></g>`;
      return rect;
    }).join("");
    return `${svgOpen}${marks}</svg>`;
  }
  const gap = 18;
  const available = width - pad * 2;
  const barWidth = Math.max(available / fixture.points.length - gap, 8);
  const marks = values.map((value, index) => {
    const barHeight = (value / max) * (height - pad * 2);
    const x = pad + index * (barWidth + gap);
    const y = height - pad - barHeight;
    const hitTarget = rectangularHitTarget(x, y, barWidth, barHeight, width, height);
    return `<g ${markAttributes(fixture, index)}>${hitTargetMarkup(hitTarget)}<rect class="market-chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="currentColor"/></g>`;
  }).join("");
  return `${svgOpen}<path d="M${pad} ${height - pad}H${width - pad}" stroke="currentColor" opacity=".25"/>${marks}</svg>`;
}

function dataTable(fixture) {
  return `<details class="market-chart-details"><summary>View data table</summary><div class="table-wrap"><table aria-label="${escapeHtml(fixture.title)} data table"><thead><tr>${fixture.table.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${fixture.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
}

function sourceMarkup(source) {
  const url = safeUrl(source?.url);
  return url ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a>` : escapeHtml(source?.label || "Source unavailable");
}

export function renderChartFigure(fixture) {
  if (!fixture) return "";
  const source = fixture._source;
  const graphic = fixture.chartType === "line" ? lineSvg(fixture) : barSvg(fixture, fixture.chartType === "payment");
  const references = (fixture._backgroundSources || []).map(sourceMarkup).join(", ");
  let evidenceMarkup;
  if (fixture.dataMode === "planning_illustration") {
    evidenceMarkup = `Example values: ${sourceMarkup(source)}. These examples are built from the stated assumptions, not observed market data. Background references: ${references}. The linked agencies did not publish the displayed examples.`;
  } else if (fixture.dataMode === "input_estimate") {
    evidenceMarkup = `Estimate based on the inputs shown. Assumption source: ${sourceMarkup(source)}.${references ? ` Background references: ${references}.` : ""}`;
  } else {
    evidenceMarkup = `Source: ${sourceMarkup(source)}. As of: ${escapeHtml(fixture.asOf)}. Geography: ${escapeHtml(fixture.geography)}. ${escapeHtml(fixture.methodologyOrLimitation || "")}`;
  }
  return `<figure class="market-chart-figure market-chart-${fixture.chartType}" data-market-chart><figcaption><strong>${escapeHtml(fixture.title)}</strong><p>${escapeHtml(fixture.summary)}</p></figcaption>${graphic}${tooltipMarkup()}<p class="market-chart-source">${evidenceMarkup}</p>${dataTable(fixture)}</figure>`;
}

export function renderSnapshotSourceNote(fixtures, scope, entityId) {
  const note = fixtures?.snapshotSources?.find((item) => item.scope === scope && item.entityId === entityId);
  if (!note) return "";
  const sourceById = new Map((fixtures.sources || []).map((source) => [source.id, source]));
  const sources = note.sourceIds.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
  if (!sources.length) return "";
  if (note.dataMode === "planning_illustration") {
    const backgroundSources = (note.backgroundSourceIds || []).map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
    return `<p class="market-chart-source">Example values: these examples are not observed local market data. Background references: ${backgroundSources.map(sourceMarkup).join(", ")}. The linked agencies did not publish the displayed examples.</p>`;
  }
  return `<p class="market-chart-source">Sources: ${sources.map(sourceMarkup).join(", ")}. As of: ${escapeHtml(sources.map((source) => source.asOf).join("; "))}.</p>`;
}

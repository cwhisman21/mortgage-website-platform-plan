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

function pointLabel(fixture, index) {
  return fixture.table.rows[index]?.join(": ") || `${fixture.points[index].label}: ${fixture.points[index].value}`;
}

function lineSvg(fixture) {
  const values = fixture.points.map((point) => number(point.value));
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const width = 640; const height = 250; const pad = 32;
  const xy = (value, index) => `${pad + (index * (width - pad * 2)) / Math.max(fixture.points.length - 1, 1)},${height - pad - ((value - min) / span) * (height - pad * 2)}`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" focusable="false" aria-label="${escapeHtml(seriesDescription(fixture))}"><path d="M${pad} ${height - pad}H${width - pad}" stroke="currentColor" opacity=".25"/><polyline fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${fixture.points.map((point, index) => xy(number(point.value), index)).join(" ")}"/>${fixture.points.map((point, index) => { const [cx, cy] = xy(number(point.value), index).split(","); return `<circle cx="${cx}" cy="${cy}" r="4" fill="currentColor"><title>${escapeHtml(pointLabel(fixture, index))}</title></circle>`; }).join("")}</svg>`;
}

function barSvg(fixture, stacked = false) {
  const values = fixture.points.map((point) => Math.max(number(point.value), 0));
  const max = stacked ? values.reduce((sum, value) => sum + value, 0) || 1 : Math.max(...values, 1);
  const width = 640; const height = 250; const pad = 32;
  const svgOpen = `<svg viewBox="0 0 ${width} ${height}" role="img" focusable="false" aria-label="${escapeHtml(seriesDescription(fixture))}">`;
  if (stacked) {
    let offset = pad;
    return `${svgOpen}${values.map((value, index) => { const barWidth = (value / max) * (width - pad * 2); const rect = `<rect x="${offset}" y="80" width="${barWidth}" height="90" fill="currentColor" opacity="${0.45 + index * 0.12}"><title>${escapeHtml(pointLabel(fixture, index))}</title></rect>`; offset += barWidth; return rect; }).join("")}</svg>`;
  }
  const gap = 18; const available = width - pad * 2; const barWidth = Math.max(available / fixture.points.length - gap, 8);
  return `${svgOpen}<path d="M${pad} ${height - pad}H${width - pad}" stroke="currentColor" opacity=".25"/>${values.map((value, index) => { const barHeight = (value / max) * (height - pad * 2); return `<rect x="${pad + index * (barWidth + gap)}" y="${height - pad - barHeight}" width="${barWidth}" height="${barHeight}" fill="currentColor"><title>${escapeHtml(pointLabel(fixture, index))}</title></rect>`; }).join("")}</svg>`;
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
  return `<figure class="market-chart-figure market-chart-${fixture.chartType}"><figcaption><strong>${escapeHtml(fixture.title)}</strong><p>${escapeHtml(fixture.summary)}</p></figcaption>${graphic}<p class="market-chart-source">${sourceLead} ${sourceMarkup}. As of: ${escapeHtml(fixture.asOf)}.</p>${dataTable(fixture)}</figure>`;
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

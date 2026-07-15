import { tagForId, tagRoute } from "./tag-registry.mjs";

const SEARCH_FAMILY_LABELS = Object.freeze({
  articles: "Article",
  "topic-guides": "Topic guide",
  "local-market-news": "Local market news",
  "product-guides": "Loan option guide",
  calculators: "Calculator",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function displayableTags(tags) {
  return asArray(tags).filter((tag) => tag && tag.displayName && tagRoute(tag));
}

function routeFor(routeHref, href) {
  return routeHref(href);
}

function safeDisplayUrl(value) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f\\]/.test(candidate)) return "";
  if (/^\/(?!\/)/.test(candidate)) return candidate;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? candidate : "";
  } catch {
    return "";
  }
}

function resolvedLabel(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return String(value.displayName || value.name || value.label || "").trim();
}

function internalAuthorId(value) {
  return /^(?:author|contributor)-[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
}

function internalLocationId(value) {
  return /^(?:city|state)-[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
}

function authorLabel(record, resolveAuthor) {
  const rawAuthor = record?.author;
  const resolved = typeof resolveAuthor === "function"
    ? resolvedLabel(resolveAuthor(rawAuthor, record))
    : resolvedLabel(rawAuthor);
  return resolved && !internalAuthorId(resolved) ? resolved : "";
}

function locationLabel(record, resolveLocation) {
  for (const locationId of asArray(record?.locationIds)) {
    const resolved = typeof resolveLocation === "function"
      ? resolvedLabel(resolveLocation(locationId, record))
      : resolvedLabel(locationId);
    if (resolved && !internalLocationId(resolved)) return resolved;
  }
  return "";
}

function tagLink(tag, routeHref, attributes = "") {
  return `<a class="content-tag-link" href="${escapeHtml(routeFor(routeHref, tagRoute(tag)))}"${attributes}>${escapeHtml(tag.displayName)}</a>`;
}

export function renderPrimaryTagLinks(tags, routeHref = (href) => href) {
  const visibleTags = displayableTags(tags);
  if (!visibleTags.length) return "";

  return `
    <nav class="content-primary-tags" aria-label="Topics">
      <span class="content-tag-label">Topics</span>
      <ul>${visibleTags.map((tag) => `<li>${tagLink(tag, routeHref)}</li>`).join("")}</ul>
    </nav>
  `;
}

export function renderAdditionalTagLinks(tags, routeHref = (href) => href, { visibleLimit = 8 } = {}) {
  const visibleTags = displayableTags(tags);
  if (!visibleTags.length) return "";

  const limit = Number.isInteger(visibleLimit) && visibleLimit >= 0 ? visibleLimit : 8;
  const primaryTags = visibleTags.slice(0, limit);
  const overflowTags = visibleTags.slice(limit);
  const links = (items) => items.map((tag) => `<li>${tagLink(tag, routeHref, " data-additional-tag=\"true\"")}</li>`).join("");

  return `
    <section class="content-additional-tags" aria-labelledby="content-additional-tags-title">
      <h2 id="content-additional-tags-title">Explore related topics</h2>
      <ul class="content-additional-tags-list">${links(primaryTags)}</ul>
      ${overflowTags.length ? `<details class="content-additional-tags-more"><summary>Show more topics</summary><ul class="content-additional-tags-list">${links(overflowTags)}</ul></details>` : ""}
    </section>
  `;
}

function recordTags(record, registry, matchedTagIds) {
  const recordTagIds = asArray(record?.tagIds);
  const matchedIds = asArray(matchedTagIds).filter((id) => recordTagIds.includes(id));
  const orderedIds = [...new Set([...matchedIds, ...recordTagIds])];
  return orderedIds
    .map((id) => ({ tag: tagForId(registry, id), matched: matchedIds.includes(id) }))
    .filter(({ tag }) => tag && tag.displayName && tagRoute(tag));
}

function searchDate(record) {
  const label = record?.updatedAt ? "Updated" : record?.publishedAt ? "Published" : "";
  const value = record?.updatedAt || record?.publishedAt;
  if (!label || typeof value !== "string") return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.valueOf())) return "";
  return `${label} ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)}`;
}

export function renderSearchResultCard(record, {
  registry,
  matchedTagIds = [],
  routeHref = (href) => href,
  fallbackImage = "",
  tagLimit = 3,
  resolveAuthor,
  resolveLocation,
} = {}) {
  if (!record?.route || !record?.title) return "";

  const tags = recordTags(record, registry, matchedTagIds);
  const limit = Number.isInteger(tagLimit) && tagLimit >= 0 ? tagLimit : 3;
  const image = safeDisplayUrl(record.image) || safeDisplayUrl(fallbackImage);
  const date = searchDate(record);
  const author = authorLabel(record, resolveAuthor);
  const family = SEARCH_FAMILY_LABELS[record.family] || "";
  const location = locationLabel(record, resolveLocation);

  return `
    <article class="search-result-card">
      ${image ? `<img class="search-result-card-image" src="${escapeHtml(image)}" alt="" loading="lazy" />` : ""}
      <div class="search-result-card-content">
        ${family || location ? `<p class="search-result-card-context">${family ? `<span class="search-result-card-type">${escapeHtml(family)}</span>` : ""}${location ? `<span class="search-result-card-location">${escapeHtml(location)}</span>` : ""}</p>` : ""}
        <h3><a href="${escapeHtml(routeFor(routeHref, record.route))}">${escapeHtml(record.title)}</a></h3>
        ${record.preview ? `<p>${escapeHtml(record.preview)}</p>` : ""}
        ${author ? `<p class="search-result-card-byline">${escapeHtml(author)}</p>` : ""}
        ${date ? `<p class="search-result-card-date">${escapeHtml(date)}</p>` : ""}
        ${tags.length ? `<ul class="search-result-card-tags">${tags.slice(0, limit).map(({ tag, matched }) => `<li${matched ? ` aria-label="Matched topic: ${escapeHtml(tag.displayName)}"` : ""}>${matched ? `<span class="search-result-card-match">Matched topic: </span>` : ""}${tagLink(tag, routeHref)}</li>`).join("")}</ul>` : ""}
      </div>
    </article>
  `;
}

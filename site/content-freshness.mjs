export const FACTUAL_AUDIT_DATE = "2026-07-13";

const FRESHNESS_SCOPE = Object.freeze({
  "article-updated-at": "Article facts reviewed through this date",
  "article-published-at": "Original publication date",
  "topic-hub-last-updated": "Topic guidance reviewed through this date",
  "governing-evidence-date": "Supporting market evidence reviewed through this date",
  "market-snapshot-last-updated": "Market snapshot reviewed through this date",
  "product-copy-version": "Product guidance reviewed through this date",
  "factual-audit-date": "Page guidance reviewed through this date",
});
const FRESHNESS_BASES = new Set(Object.keys(FRESHNESS_SCOPE));

function normalizedDate(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const match = candidate.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (!match) return "";
  if (candidate.length > 10 && Number.isNaN(Date.parse(candidate))) return "";

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
  ) return "";

  return `${year}-${month}-${day}`;
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function resolution(value, basis) {
  if (!FRESHNESS_BASES.has(basis)) return null;
  const date = normalizedDate(value);
  return date ? Object.freeze({ date, basis }) : null;
}

function governingEvidenceDate(evidence) {
  if (!evidence || typeof evidence !== "object") return "";
  return [
    evidence.lastUpdated,
    evidence.reviewedAt,
    evidence.evidenceDate,
    evidence.retrievedAt,
  ].map(normalizedDate).find(Boolean) || "";
}

export function resolveContentFreshness(found, {
  canonicalTopicHub,
  governingEvidence,
  productCopyBundle = {},
  evergreen = false,
  factualAuditDate = FACTUAL_AUDIT_DATE,
} = {}) {
  const type = found?.type;
  const item = found?.item || {};

  if (["article", "newsArticle", "news"].includes(type)) {
    const updated = resolution(item.updatedAt, "article-updated-at");
    return updated || resolution(item.publishedAt, "article-published-at");
  }

  if (["topicHub", "topic-hub"].includes(type)) {
    if (item.public !== true) return null;
    return resolution(item.lastUpdated, "topic-hub-last-updated");
  }

  if (type === "blog" && canonicalTopicHub?.public === true) {
    return resolution(canonicalTopicHub.lastUpdated, "topic-hub-last-updated");
  }

  if (["state", "city"].includes(type)) {
    const evidenceDate = governingEvidenceDate(
      governingEvidence
      || item.marketSnapshot?.governingEvidence
      || item.snapshotEvidence,
    );
    if (evidenceDate) return resolution(evidenceDate, "governing-evidence-date");
    const snapshotDate = resolution(item.marketSnapshot?.lastUpdated, "market-snapshot-last-updated");
    if (snapshotDate) return snapshotDate;
    return evergreen === true
      ? resolution(factualAuditDate, "factual-audit-date")
      : null;
  }

  if (type === "product") {
    return resolution(productCopyBundle.version, "product-copy-version");
  }

  if (evergreen === true) {
    return resolution(factualAuditDate, "factual-audit-date");
  }

  return null;
}

export function renderContentFreshness(foundOrResolution, options = {}) {
  const freshness = foundOrResolution?.date && foundOrResolution?.basis
    ? resolution(foundOrResolution.date, foundOrResolution.basis)
    : resolveContentFreshness(foundOrResolution, options);
  if (!freshness) return "";

  const limitation = `${FRESHNESS_SCOPE[freshness.basis]}. Time-sensitive figures show their own as-of dates.`;
  return `<p class="content-freshness" data-content-freshness data-freshness-basis="${freshness.basis}"><span>Last updated</span> <time datetime="${freshness.date}">${displayDate(freshness.date)}</time>. <small class="content-freshness-note">${limitation}</small></p>`;
}

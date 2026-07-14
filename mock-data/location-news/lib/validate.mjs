import { createHash } from "node:crypto";
import fs from "node:fs";

const contributorDocument = JSON.parse(
  fs.readFileSync(new URL("../../editorial/contributors.json", import.meta.url), "utf8"),
);
const CONTRIBUTOR_IDS = new Set(
  (contributorDocument.contributors || []).map((contributor) => contributor.id),
);

const CITY_TYPES = new Set(["affordability_home_values", "housing_supply_tenure", "local_labor_market", "county_loan_limits"]);
const STATE_TYPES = new Set(["state_home_price_movement", "state_labor_market", "state_housing_costs", "state_loan_limit_landscape"]);
const SCAFFOLD_PATTERN = /\b(lorem ipsum|todo|tbd|placeholder|scaffold|insert (copy|text)|replace me|should explain|coming soon|example content|sample article)\b|\{\{[^}]+\}\}|\[[A-Z_]{3,}\]/i;
const UNSUPPORTED_PATTERN = /\b(guaranteed|best rate|will be approved|will qualify|government endorsed|property is worth|rates will|prices will)\b/i;
const INTERNAL_LANGUAGE_PATTERN = /\b(created by this generator|this generator|source identifiers?|structured source records?|internal generator|generated copy|generation pipeline)\b/i;
const RAW_PUBLIC_VALUE_PATTERN = /\bnews-[a-z0-9-]+-source-[a-z0-9-]+\b|\b[A-Z]\d{5}_\d{3}[EM]\b|^https?:\/\//i;
const DEAD_ROUTES = new Set(["/loan-options/conventional", "/loan-options/fha"]);
const UNSUPPORTED_CTA_PATTERN = /compare verified loan options/i;

function bodyParagraphs(article) {
  return article.sections.flatMap((section) => section.body || []);
}

function wordCount(article) {
  return bodyParagraphs(article).join(" ").split(/\s+/).filter(Boolean).length;
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Article missing ${label}`);
}

function relatedRouteParts(item) {
  return typeof item === "string" ? { route: item, label: item } : item || {};
}

export function borrowerVisibleValues(article) {
  return [
    article.title,
    article.dek,
    article.previewText,
    article.metaDescription,
    ...(article.keyTakeaways || []),
    ...(article.sections || []).flatMap((section) => [section.heading, ...(section.body || [])]),
    ...(article.tables || []).flatMap((table) => [table.title, ...(table.columns || []), ...(table.rows || []).flat()]),
    ...(article.ctaPlacements || []).flatMap((cta) => [cta.label, cta.description]),
    article.methodology,
    article.limitations,
    ...(article.sourceRecords || []).map((source) => source.citationLabel),
    ...(article.relatedRoutes || []).map((item) => relatedRouteParts(item).label),
  ].filter(Boolean).map(String);
}

function substantiveSentences(article) {
  return bodyParagraphs(article)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 12);
}

export function numericClaims(text) {
  return String(text || "").match(/\$-?\d(?:[\d,]*\d)?(?:\.\d+)?|-?\b\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})+\b/g) || [];
}

function allowedNumericDisplays(article) {
  const allowed = new Set();
  for (const fact of article.evidenceFacts) {
    allowed.add(String(fact.display));
    allowed.add(String(fact.display).replace(/^\$/, ""));
  }
  for (const record of article.sourceRecords) {
    if (!Number.isFinite(record.estimate)) continue;
    allowed.add(Number(record.estimate).toLocaleString("en-US", { maximumFractionDigits: 1 }));
    allowed.add(`$${Math.round(Number(record.estimate)).toLocaleString("en-US")}`);
    allowed.add(`${Number(record.estimate).toFixed(1)}%`);
  }
  return allowed;
}

export function validateArticle(article, { validRoutes = null } = {}) {
  for (const field of ["id", "route", "locationId", "locationType", "articleType", "authorId", "title", "dek", "previewText", "metaDescription", "publishedAt", "updatedAt", "imageId", "methodology", "limitations", "reviewStatus", "complianceStatus"]) {
    requiredString(article[field], field);
  }
  if (!CONTRIBUTOR_IDS.has(article.authorId)) throw new Error(`${article.id} has unknown contributor authorId ${article.authorId}`);
  if (!/^\/learning-center\/market-news\/[a-z0-9-]+$/.test(article.route)) throw new Error(`${article.id} has invalid route`);
  if (article.metaDescription.length < 50 || article.metaDescription.length > 160 || !/[.!?]$/.test(article.metaDescription)) throw new Error(`${article.id} has an incomplete meta description`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(article.updatedAt)) throw new Error(`${article.id} has invalid dates`);
  if (article.reviewStatus !== "editorial_reviewed" || article.complianceStatus !== "compliance_approved") throw new Error(`${article.id} is not approved for publication`);
  if (!Array.isArray(article.sections) || article.sections.length < 5) throw new Error(`${article.id} requires substantive sections`);
  const words = wordCount(article);
  if (words < 600 || words > 900) throw new Error(`${article.id} body word count ${words} is outside 600-900`);
  if (!Array.isArray(article.evidenceFacts) || article.evidenceFacts.length < 4) throw new Error(`${article.id} requires at least four evidence facts`);
  if (!article.evidenceFacts.some((fact) => fact.comparison)) throw new Error(`${article.id} requires a meaningful comparison`);
  if (!Array.isArray(article.sourceRecords) || article.sourceRecords.length < 4) throw new Error(`${article.id} requires source records`);
  const sources = new Map(article.sourceRecords.map((record) => [record.sourceId, record]));
  for (const record of article.sourceRecords) {
    for (const field of ["sourceId", "publisher", "dataset", "sourceUrl", "variableOrSeriesId", "geographyType", "period", "retrievedAt", "citationLabel"]) requiredString(record[field], `${article.id} source ${field}`);
    if (!Number.isFinite(record.estimate)) throw new Error(`${article.id} source ${record.sourceId} missing estimate`);
    if (!/^https:\/\//.test(record.sourceUrl)) throw new Error(`${article.id} source ${record.sourceId} has invalid URL`);
    if (!record.citationLabel.includes(record.publisher)) throw new Error(`${article.id} source ${record.sourceId} missing visible publisher attribution`);
  }
  const facts = new Map(article.evidenceFacts.map((evidence) => [evidence.id, evidence]));
  for (const evidence of article.evidenceFacts) {
    if (!evidence.id || !evidence.label || !evidence.display || !Array.isArray(evidence.sourceRecordIds) || !evidence.sourceRecordIds.length) throw new Error(`${article.id} has incomplete evidence fact`);
    for (const sourceId of evidence.sourceRecordIds) if (!sources.has(sourceId)) throw new Error(`${article.id} evidence references missing source ${sourceId}`);
  }
  for (const section of article.sections) {
    if (!Array.isArray(section.evidenceFactIds) || section.evidenceFactIds.length < 2) throw new Error(`${article.id} section ${section.id} requires a local evidence binding`);
    const boundFacts = section.evidenceFactIds.map((id) => facts.get(id));
    if (boundFacts.some((item) => !item)) throw new Error(`${article.id} section ${section.id} has an unknown evidence binding`);
    const sectionText = (section.body || []).join(" ");
    if (!boundFacts.some((item) => sectionText.includes(item.display))) throw new Error(`${article.id} section ${section.id} does not analyze its local evidence`);
  }
  const localGeographyTypes = article.locationType === "city" ? new Set(["place", "city", "county"]) : new Set(["state", "state_counties"]);
  const locallyScopedFacts = article.evidenceFacts.filter((evidence) => evidence.sourceRecordIds.every((sourceId) => localGeographyTypes.has(sources.get(sourceId)?.geographyType)));
  if (locallyScopedFacts.length < 4) throw new Error(`${article.id} requires at least four locally scoped evidence facts`);
  if (!Array.isArray(article.visuals) || !article.visuals.length || !article.visuals.every((visual) => Array.isArray(visual.data) && visual.data.length)) throw new Error(`${article.id} missing article visual data`);
  if (!Array.isArray(article.tables) || !article.tables.length || !article.tables.every((table) => Array.isArray(table.rows) && table.rows.length)) throw new Error(`${article.id} missing article table data`);
  if (!Array.isArray(article.ctaPlacements) || !article.ctaPlacements.length) throw new Error(`${article.id} missing contextual CTA`);
  for (const cta of article.ctaPlacements) {
    requiredString(cta.label, `${article.id} CTA label`);
    requiredString(cta.route, `${article.id} CTA route`);
    if (UNSUPPORTED_CTA_PATTERN.test(cta.label)) throw new Error(`${article.id} contains unsupported Compare verified loan options copy`);
    if (DEAD_ROUTES.has(cta.route)) throw new Error(`${article.id} contains dead route ${cta.route}`);
    if (validRoutes && !validRoutes.has(cta.route)) throw new Error(`${article.id} CTA route is not canonical: ${cta.route}`);
  }
  if (!Array.isArray(article.relatedRoutes) || article.relatedRoutes.length < 2) throw new Error(`${article.id} missing internal related routes`);
  for (const item of article.relatedRoutes) {
    const { route, label } = relatedRouteParts(item);
    requiredString(route, `${article.id} related route`);
    requiredString(label, `${article.id} related label`);
    if (!/^\//.test(route)) throw new Error(`${article.id} related route must be internal`);
    if (DEAD_ROUTES.has(route)) throw new Error(`${article.id} contains dead route ${route}`);
    if (validRoutes && !validRoutes.has(route)) throw new Error(`${article.id} related route is not canonical: ${route}`);
  }
  if (article.methodology.split(/\s+/).length < 25 || article.limitations.split(/\s+/).length < 20) throw new Error(`${article.id} methodology or limitations are incomplete`);

  const visibleValues = borrowerVisibleValues(article);
  const prose = visibleValues.join("\n");
  if (SCAFFOLD_PATTERN.test(prose)) throw new Error(`${article.id} contains scaffold language`);
  if (UNSUPPORTED_PATTERN.test(prose)) throw new Error(`${article.id} contains unsupported claim language`);
  if (INTERNAL_LANGUAGE_PATTERN.test(prose)) throw new Error(`${article.id} contains internal generator language in borrower-visible copy`);
  const rawValue = visibleValues.find((value) => RAW_PUBLIC_VALUE_PATTERN.test(value));
  if (rawValue) throw new Error(`${article.id} exposes a raw source ID or URL in borrower-visible copy: ${rawValue}`);
  const allowed = allowedNumericDisplays(article);
  for (const claim of numericClaims(bodyParagraphs(article).join(" "))) {
    if (!allowed.has(claim) && !allowed.has(claim.replace(/^\$/, ""))) throw new Error(`${article.id} numeric claim ${claim} is not supported by structured evidence`);
  }
  return article;
}

function normalizedParagraph(paragraph) {
  return String(paragraph).toLowerCase().replace(/\s+/g, " ").trim();
}

export function validateCorpus(corpus, { expectedLocationIds = null, minimumArticles = 3144, validRoutes = null } = {}) {
  const ids = new Set();
  const routes = new Set();
  const titles = new Set();
  const descriptions = new Set();
  const paragraphHashes = new Map();
  const sentenceCounts = new Map();
  const byLocation = new Map();

  for (const article of corpus) {
    validateArticle(article, { validRoutes });
    if (ids.has(article.id)) throw new Error(`Duplicate article id ${article.id}`);
    if (routes.has(article.route)) throw new Error(`Duplicate article route ${article.route}`);
    if (titles.has(article.title)) throw new Error(`Duplicate article title ${article.title}`);
    if (descriptions.has(article.metaDescription)) throw new Error(`Duplicate meta description ${article.metaDescription}`);
    ids.add(article.id);
    routes.add(article.route);
    titles.add(article.title);
    descriptions.add(article.metaDescription);
    if (!byLocation.has(article.locationId)) byLocation.set(article.locationId, []);
    byLocation.get(article.locationId).push(article);

    for (const paragraph of bodyParagraphs(article)) {
      if (paragraph.split(/\s+/).length < 35) continue;
      const hash = createHash("sha256").update(normalizedParagraph(paragraph)).digest("hex");
      const previous = paragraphHashes.get(hash);
      if (previous && previous !== article.id) throw new Error(`Duplicate substantive paragraph in ${previous} and ${article.id}`);
      paragraphHashes.set(hash, article.id);
    }
    const evidenceDisplays = [...new Set(article.evidenceFacts.map((fact) => String(fact.display)).filter(Boolean))];
    for (const paragraph of bodyParagraphs(article)) {
      if (evidenceDisplays.some((display) => paragraph.includes(display))) continue;
      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.replace(/\s+/g, " ").trim())
        .filter((sentence) => sentence.split(/\s+/).length >= 12);
      for (const sentence of sentences) sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1);
    }
  }

  if (corpus.length < minimumArticles) throw new Error(`Corpus has ${corpus.length} articles; expected at least ${minimumArticles}`);
  if (expectedLocationIds) {
    for (const locationId of expectedLocationIds) if (!byLocation.has(locationId)) throw new Error(`Empty location feed ${locationId}`);
    if (byLocation.size !== expectedLocationIds.length) throw new Error(`Corpus location coverage mismatch`);
  }
  for (const [locationId, articles] of byLocation) {
    if (articles.length !== 4) throw new Error(`${locationId} has ${articles.length} articles; expected 4`);
    const expectedTypes = locationId.startsWith("city-") ? CITY_TYPES : STATE_TYPES;
    const types = new Set(articles.map((article) => article.articleType));
    if (types.size !== 4 || [...expectedTypes].some((type) => !types.has(type))) throw new Error(`${locationId} article type coverage mismatch`);
  }
  const repeatedSentences = [...sentenceCounts]
    .filter(([, count]) => count > 8)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (repeatedSentences.length) {
    const details = repeatedSentences.map(([sentence, count]) => `${count} uses: ${sentence}`).join("\n");
    throw new Error(`Repeated unanchored article scaffolding (${repeatedSentences.length} sentences):\n${details}`);
  }
  return { articles: corpus.length, locations: byLocation.size, paragraphHashes: paragraphHashes.size, substantiveSentences: sentenceCounts.size };
}

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
const LABOR_TYPES = new Set(["local_labor_market", "state_labor_market"]);
const ACS_HOME_VALUE_TYPES = new Set(["affordability_home_values", "state_housing_costs"]);
const ANSWER_FIRST_TYPES = new Set(["local_labor_market", "state_labor_market", "state_home_price_movement"]);
const SCAFFOLD_PATTERN = /\b(lorem ipsum|todo|tbd|placeholder|scaffold|insert (copy|text)|replace me|should explain|coming soon|example content|sample article)\b|\{\{[^}]+\}\}|\[[A-Z_]{3,}\]/i;
const UNSUPPORTED_PATTERN = /\b(guaranteed|best rate|will be approved|will qualify|government endorsed|property is worth|rates will|prices will)\b/i;
const INTERNAL_LANGUAGE_PATTERN = /\b(created by this generator|this generator|source identifiers?|structured source records?|internal generator|generated copy|generation pipeline)\b/i;
const RAW_PUBLIC_VALUE_PATTERN = /\bnews-[a-z0-9-]+-source-[a-z0-9-]+\b|\b[A-Z]\d{5}_\d{3}[EM]\b|^https?:\/\//i;
const DEAD_ROUTES = new Set(["/loan-options/conventional", "/loan-options/fha"]);
const UNSUPPORTED_CTA_PATTERN = /compare verified loan options/i;
const DOUBLE_STATE_PATTERN = /,\s*([A-Z]{2}),\s*\1's\b/;
const SIGNED_DIRECTIONAL_PATTERN = /\b(?:fell|rose|increased|decreased|declined|grew|climbed|dropped)\s+-\d/i;
const USEFULNESS_PATTERN = /\b(?:can|helps?|useful|informs?|frames?|shows?|organizes?|identifies?|supports?|guides?|may matter)\b/i;
const LIMITATION_PATTERN = /\b(?:cannot|does not|do not|not a|not the|should not|rather than|too broad)\b/i;
const SIMILARITY_MIN_GROUP_SIZE = 24;
const MAX_MEAN_SHINGLE_SIMILARITY = 0.78;
const MAX_P95_SHINGLE_SIMILARITY = 0.92;
const MAX_STRUCTURAL_SIGNATURE_SHARE = 0.20;
const ARTICLE_TITLE_SUFFIXES = new Map([
  ["affordability_home_values", " home values, income, and owner costs"],
  ["housing_supply_tenure", " housing supply, ownership, and rent"],
  ["local_labor_market", " labor market: latest employment evidence"],
  ["county_loan_limits", " loan limits: 2026 conforming and FHA context"],
  ["state_home_price_movement", " home-price movement in the latest FHFA HPI"],
  ["state_labor_market", " labor market: latest employment evidence"],
  ["state_housing_costs", " housing costs, ownership, and rent in the latest ACS"],
  ["state_loan_limit_landscape", " 2026 county loan-limit landscape"],
]);

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
    if (fact.value < 0) allowed.add(String(fact.display).replace(/^-/, ""));
  }
  for (const record of article.sourceRecords) {
    if (!Number.isFinite(record.estimate)) continue;
    allowed.add(Number(record.estimate).toLocaleString("en-US", { maximumFractionDigits: 1 }));
    allowed.add(`$${Math.round(Number(record.estimate)).toLocaleString("en-US")}`);
    allowed.add(`${Number(record.estimate).toFixed(1)}%`);
    if (record.estimate < 0) allowed.add(`${Math.abs(Number(record.estimate)).toFixed(1)}%`);
  }
  return allowed;
}

function sectionMentionsFact(sectionText, item) {
  if (sectionText.includes(item.display)) return true;
  return item.value < 0 && sectionText.includes(String(item.display).replace(/^-/, ""));
}

export function validateArticle(article, { validRoutes = null } = {}) {
  for (const field of ["id", "route", "locationId", "locationType", "articleType", "authorId", "title", "dek", "previewText", "metaDescription", "publishedAt", "updatedAt", "asOf", "sourcePeriod", "imageId", "methodology", "limitations", "reviewStatus", "complianceStatus"]) {
    requiredString(article[field], field);
  }
  if (!CONTRIBUTOR_IDS.has(article.authorId)) throw new Error(`${article.id} has unknown contributor authorId ${article.authorId}`);
  if (!/^\/learning-center\/market-news\/[a-z0-9-]+$/.test(article.route)) throw new Error(`${article.id} has invalid route`);
  if (article.metaDescription.length < 50 || article.metaDescription.length > 160 || !/[.!?]$/.test(article.metaDescription) || article.metaDescription !== article.previewText) throw new Error(`${article.id} has an incomplete meta description; use one complete authored preview sentence`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(article.updatedAt)) throw new Error(`${article.id} has invalid dates`);
  if (article.reviewStatus !== "editorial_reviewed" || article.complianceStatus !== "compliance_approved") throw new Error(`${article.id} is not approved for publication`);
  if (!Array.isArray(article.sections) || article.sections.length !== 6) throw new Error(`${article.id} requires six substantive content beats`);
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
  if (![...sources.values()].some((record) => record.period === article.sourcePeriod)) {
    throw new Error(`${article.id} sourcePeriod is not bound to its governing evidence`);
  }
  const facts = new Map(article.evidenceFacts.map((evidence) => [evidence.id, evidence]));
  for (const evidence of article.evidenceFacts) {
    if (!evidence.id || !evidence.label || !evidence.display || !Array.isArray(evidence.sourceRecordIds) || !evidence.sourceRecordIds.length) throw new Error(`${article.id} has incomplete evidence fact`);
    for (const sourceId of evidence.sourceRecordIds) if (!sources.has(sourceId)) throw new Error(`${article.id} evidence references missing source ${sourceId}`);
  }
  if (LABOR_TYPES.has(article.articleType)) {
    for (const id of ["monthly-rate-change", "annual-rate-change"]) {
      const delta = facts.get(id);
      if (!delta || !/^-?\d+(?:\.\d+)? percentage points$/.test(delta.display)) {
        throw new Error(`${article.id} unemployment-rate delta ${id} must use percentage points`);
      }
    }
  }
  if (ACS_HOME_VALUE_TYPES.has(article.articleType)) {
    if (facts.has("home-value-change")) throw new Error(`${article.id} cannot publish a precise percent change across non-comparable ACS home-value vintages`);
    const articleBody = bodyParagraphs(article).join(" ");
    if (!/2019 ACS/i.test(articleBody) || !/2024 ACS/i.test(articleBody) || !/not inflation-adjusted/i.test(articleBody) || !/methodolog/i.test(articleBody)) {
      throw new Error(`${article.id} must present separate ACS nominal observations with inflation and methodology comparability limits`);
    }
  }
  for (const section of article.sections) {
    if (!Array.isArray(section.evidenceFactIds) || section.evidenceFactIds.length < 2) throw new Error(`${article.id} section ${section.id} requires a local evidence binding`);
    const boundFacts = section.evidenceFactIds.map((id) => facts.get(id));
    if (boundFacts.some((item) => !item)) throw new Error(`${article.id} section ${section.id} has an unknown evidence binding`);
    const sectionText = (section.body || []).join(" ");
    if (!boundFacts.some((item) => sectionMentionsFact(sectionText, item))) throw new Error(`${article.id} section ${section.id} does not analyze its local evidence`);
  }
  const opening = (article.sections[0].body || []).join(" ");
  const usefulnessIndex = opening.search(USEFULNESS_PATTERN);
  const limitationIndex = opening.search(LIMITATION_PATTERN);
  if (usefulnessIndex < 0 || (limitationIndex >= 0 && limitationIndex < usefulnessIndex)) {
    throw new Error(`${article.id} opening must lead with the local finding and borrower use before limitations`);
  }
  if (ANSWER_FIRST_TYPES.has(article.articleType)) {
    const displays = [...new Set(article.evidenceFacts.map((item) => String(item.display)).filter(Boolean))];
    for (const section of article.sections.slice(0, 2)) {
      const lead = (section.body || []).join(" ");
      for (const display of displays) {
        const uses = lead.split(display).length - 1;
        if (uses > 2) throw new Error(`${article.id} ${section.id} repeats evidence figure ${display} ${uses} times in an answer-first lead`);
      }
    }
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
  if (DOUBLE_STATE_PATTERN.test(prose)) throw new Error(`${article.id} contains a double-qualified city/state construction`);
  if (SIGNED_DIRECTIONAL_PATTERN.test(prose)) throw new Error(`${article.id} contains an unnatural signed directional change`);
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function articleLocationLabel(article) {
  const suffix = ARTICLE_TITLE_SUFFIXES.get(article.articleType);
  if (!suffix || !article.title?.endsWith(suffix)) return "";
  return article.title.slice(0, -suffix.length);
}

function normalizedArticleShingles(article, size = 5) {
  let text = article.sections.flatMap((section) => [section.heading, ...(section.body || [])]).join(" ").toLowerCase();
  const replaceable = [articleLocationLabel(article), ...(article.evidenceFacts || []).map((fact) => fact.display)]
    .filter(Boolean)
    .map(String)
    .sort((left, right) => right.length - left.length);
  for (const value of replaceable) text = text.replace(new RegExp(escapeRegex(value.toLowerCase()), "g"), " value ");
  const words = text
    .replace(/\$?-?\d[\d,.]*(?:%|\b)/g, " value ")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index <= words.length - size; index += 1) shingles.add(words.slice(index, index + size).join(" "));
  return shingles;
}

function jaccard(left, right) {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 1;
}

export function validateCorpusSimilarity(corpus) {
  const byType = new Map();
  for (const article of corpus) {
    if (!byType.has(article.articleType)) byType.set(article.articleType, []);
    byType.get(article.articleType).push(article);
  }

  const metrics = [];
  for (const [articleType, unsortedArticles] of byType) {
    if (unsortedArticles.length < SIMILARITY_MIN_GROUP_SIZE) continue;
    const articles = [...unsortedArticles].sort((left, right) => left.id.localeCompare(right.id));
    const similarities = [];
    for (let index = 1; index < articles.length; index += 1) {
      similarities.push(jaccard(normalizedArticleShingles(articles[index - 1]), normalizedArticleShingles(articles[index])));
    }
    similarities.sort((left, right) => left - right);
    const mean = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
    const p95 = similarities[Math.min(similarities.length - 1, Math.floor(similarities.length * 0.95))];
    const signatures = new Map();
    for (const article of articles) {
      const signature = article.sections.map((section) => `${section.id}:${section.heading}`).join("|");
      signatures.set(signature, (signatures.get(signature) || 0) + 1);
    }
    const minimumSignatures = Math.min(24, articles.length);
    const largestSignatureShare = Math.max(...signatures.values()) / articles.length;
    const result = {
      articleType,
      articles: articles.length,
      meanShingleSimilarity: mean,
      p95ShingleSimilarity: p95,
      structuralSignatures: signatures.size,
      largestSignatureShare,
    };
    metrics.push(result);

    if (mean > MAX_MEAN_SHINGLE_SIMILARITY) {
      throw new Error(`${articleType} mean five-word-shingle similarity ${mean.toFixed(3)} exceeds ${MAX_MEAN_SHINGLE_SIMILARITY.toFixed(3)}`);
    }
    if (p95 > MAX_P95_SHINGLE_SIMILARITY) {
      throw new Error(`${articleType} p95 five-word-shingle similarity ${p95.toFixed(3)} exceeds ${MAX_P95_SHINGLE_SIMILARITY.toFixed(3)}`);
    }
    if (signatures.size < minimumSignatures) {
      throw new Error(`${articleType} has only ${signatures.size} structural signatures; expected at least ${minimumSignatures}`);
    }
    if (largestSignatureShare > MAX_STRUCTURAL_SIGNATURE_SHARE) {
      throw new Error(`${articleType} largest structural signature covers ${(largestSignatureShare * 100).toFixed(1)}%`);
    }
  }
  return metrics;
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
  const similarity = validateCorpusSimilarity(corpus);
  const repeatedSentences = [...sentenceCounts]
    .filter(([, count]) => count > 8)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (repeatedSentences.length) {
    const details = repeatedSentences.map(([sentence, count]) => `${count} uses: ${sentence}`).join("\n");
    throw new Error(`Repeated unanchored article scaffolding (${repeatedSentences.length} sentences):\n${details}`);
  }
  return { articles: corpus.length, locations: byLocation.size, paragraphHashes: paragraphHashes.size, substantiveSentences: sentenceCounts.size, similarity };
}

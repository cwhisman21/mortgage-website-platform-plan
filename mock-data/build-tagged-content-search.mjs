import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONTENT_FAMILY_ORDER = Object.freeze([
  "articles", "topic-guides", "local-market-news", "product-guides", "calculators",
]);
export const TAGGED_CONTENT_REVIEWED_AT = "2026-07-14";

const APPROVED_TAG_TYPES = new Set([
  "mortgage-topic", "loan-program", "borrower-goal", "state", "city",
  "property-concept", "market-topic",
]);
const APPROVED_REVIEW_RELATIONSHIPS = new Set(["DIRECT", "NEAR", "SUPPORTING"]);
const APPROVED_REVIEW_DISPOSITIONS = new Set(["KEEP DISTINCT", "DIFFERENTIATE", "MERGE", "CANONICALIZE", "REDIRECT", "DO NOT CREATE"]);
const FORBIDDEN_PUBLIC_COPY = /\b(?:placeholder|wireframe|demo|scaffold|schema|workflow|review status|internal)\b/i;
const SENTINEL_PUBLIC_COPY = /\b(?:undefined|null)\b/i;
const UNHELPFUL_TAG_COPY = /\bsupport borrowers planning to\b/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FAMILY_RANK = new Map(CONTENT_FAMILY_ORDER.map((family, index) => [family, index]));
const SEARCH_RECORD_KEYS = new Set([
  "id", "route", "family", "title", "preview", "image", "author", "publishedAt", "updatedAt",
  "tagIds", "primaryTagIds", "locationIds", "productIds", "canonicalOrder",
]);
const PUBLIC_TAG_KEYS = new Set([
  "id", "displayName", "slug", "type", "description", "relatedTagIds", "canonicalRoute", "reviewedAt", "updatedAt", "redirectSlugs",
]);
const MAX_CANONICAL_RELATED_TAGS = 12;
const MAX_PUBLIC_RELATED_TAGS = 8;
const REVIEW_SEMANTIC_RULES = Object.freeze({
  borrowerQuestion: Object.freeze({ minimum: 24, maximum: 180, minimumWords: 5, evidence: /\b(?:borrower|financing|home|housing|loan|market|mortgage|payment|property)\b/i }),
  intent: Object.freeze({ minimum: 18, maximum: 120, minimumWords: 3, evidence: /\b(?:compare|estimate|evaluate|learn|plan|research|understand)\b/i }),
  audience: Object.freeze({ minimum: 20, maximum: 140, minimumWords: 3, evidence: /\bborrowers?\b/i }),
  entity: Object.freeze({ minimum: 3, maximum: 200, minimumWords: 1 }),
  substantiveCoverage: Object.freeze({ minimum: 12, maximum: 140, minimumWords: 2, evidence: /\b(?:article|calculator|editorial|education|explanation|guide|loan|location|market|mortgage|report|update)\b/i }),
  action: Object.freeze({ minimum: 15, maximum: 160, minimumWords: 3, evidence: /\b(?:browse|calculate|compare|estimate|explore|read|review|understand)\b/i }),
  rationale: Object.freeze({ minimum: 60, maximum: 500, minimumWords: 10 }),
});

const BORROWER_GOAL_DESCRIPTIONS = Object.freeze({
  "buy-a-home": "Explore practical guidance for preparing to buy a home, comparing loan options, and planning the costs ahead.",
  "high-cost-home-financing": "Explore guidance for financing a higher-priced home, including loan-limit context, cost planning, and questions to compare with a lender.",
  "lower-down-payment-purchase": "Explore guidance for comparing lower down payment options, upfront costs, mortgage insurance, and eligibility questions.",
  "military-or-veteran-home-financing": "Explore guidance for military and veteran home financing, including eligibility, program features, costs, and lender questions.",
  "refinance-a-mortgage": "Explore guidance for comparing refinance rates, terms, closing costs, break-even timing, and potential monthly-payment changes.",
  "refinance-and-access-equity": "Explore guidance for comparing cash-out refinance options, available equity, closing costs, and the effect on your mortgage.",
  "rent-vs-buy": "Explore guidance for comparing renting and buying across monthly costs, time horizon, maintenance, and local market conditions.",
  "standard-purchase-or-refinance": "Explore guidance for conventional purchase and refinance decisions, including qualification, down payment, costs, and loan terms.",
  "use-available-home-equity": "Explore guidance for using home equity, comparing borrowing options, estimating costs, and weighing repayment tradeoffs.",
});

const CALCULATOR_PREVIEWS = Object.freeze({
  "calc-affordability": "Compare income, monthly debts, available cash, and location assumptions to estimate a practical home price range.",
  "calc-down-payment": "Compare home price, available cash, loan program, closing costs, and mortgage insurance when planning a down payment.",
  "calc-payment": "Estimate principal and interest, taxes, insurance, and other costs to compare potential monthly mortgage payments.",
  "calc-refinance": "Compare your current loan with new rate, term, closing-cost, and break-even assumptions before considering a refinance.",
  "calc-rent-vs-buy": "Compare rent, home price, down payment, location, and timing assumptions to explore renting versus buying.",
});

const CONTROLLED_TOPIC_DESCRIPTIONS = Object.freeze({
  "tag-mortgage-topic-borrower-planning": "Explore how local employment trends and household income considerations can inform a home-buying budget, mortgage preparation, and lender questions.",
  "tag-market-topic-state-and-county-context": "Compare county loan limits within a state and learn why the property's county and loan program can affect available financing options.",
  "tag-market-topic-state-housing": "Review statewide housing costs, ownership patterns, and related context for planning a home purchase or mortgage refinance.",
  "tag-market-topic-state-market": "Review statewide home price trends, measurement limits, and questions to consider when comparing mortgage options.",
});

export const LOCATION_NEWS_TOPIC_TAGS = Object.freeze({
  "affordability": Object.freeze({ id: "tag-mortgage-topic-affordability", displayName: "Affordability", type: "mortgage-topic" }),
  "borrower-planning": Object.freeze({ id: "tag-mortgage-topic-borrower-planning", displayName: "Employment and Mortgage Planning", slug: "borrower-planning", type: "mortgage-topic" }),
  "conventional": Object.freeze({ id: "tag-loan-program-conventional-loans", displayName: "Conventional Loans", type: "loan-program" }),
  "employment": Object.freeze({ id: "tag-market-topic-employment", displayName: "Employment", type: "market-topic" }),
  "fha": Object.freeze({ id: "tag-loan-program-fha-loans", displayName: "FHA Loans", type: "loan-program" }),
  "home-price-index": Object.freeze({ id: "tag-market-topic-home-price-index", displayName: "Home Price Index", type: "market-topic" }),
  "home-values": Object.freeze({ id: "tag-market-topic-home-values", displayName: "Home Values", type: "market-topic" }),
  "housing-supply": Object.freeze({ id: "tag-market-topic-housing-supply", displayName: "Housing Supply", type: "market-topic" }),
  "jumbo": Object.freeze({ id: "tag-loan-program-jumbo-loans", displayName: "Jumbo Loans", type: "loan-program" }),
  "labor-market": Object.freeze({ id: "tag-market-topic-labor-market", displayName: "Labor Market", type: "market-topic" }),
  "loan-limits": Object.freeze({ id: "tag-mortgage-topic-loan-limits", displayName: "Loan Limits", type: "mortgage-topic" }),
  "owner-costs": Object.freeze({ id: "tag-property-concept-owner-costs", displayName: "Owner Costs", type: "property-concept" }),
  "rent": Object.freeze({ id: "tag-property-concept-rent", displayName: "Rent", type: "property-concept" }),
  "state-counties": Object.freeze({ id: "tag-market-topic-state-and-county-context", displayName: "County Loan Limits by State", slug: "state-and-county-context", type: "market-topic" }),
  "state-housing": Object.freeze({ id: "tag-market-topic-state-housing", displayName: "State Housing Costs and Ownership", slug: "state-housing", type: "market-topic" }),
  "state-market": Object.freeze({ id: "tag-market-topic-state-market", displayName: "State Home Price Trends", slug: "state-market", type: "market-topic" }),
  "tenure": Object.freeze({ id: "tag-market-topic-housing-tenure", displayName: "Housing Tenure", type: "market-topic" }),
});

const PHRASE_TAGS = [
  ["homeowners insurance", "Homeowners Insurance", "property-concept"],
  ["property tax", "Property Taxes", "property-concept"],
  ["home-price index", "Home Price Index", "market-topic"],
  ["home price", "Home Values", "market-topic"],
  ["home values", "Home Values", "market-topic"],
  ["labor market", "Labor Market", "market-topic"],
  ["mortgage insurance", "Mortgage Insurance", "mortgage-topic"],
  ["down payment", "Down Payment", "mortgage-topic"],
  ["local market", "Local Market Updates", "market-topic"],
  ["buying a home", "Buy a home", "borrower-goal"],
  ["home equity", "Home Equity / HELOC", "loan-program"],
  ["cash-out refinance", "Cash-Out Refinance", "loan-program"],
  ["insurance", "Homeowners Insurance", "property-concept"],
  ["mortgage payment", "Mortgage Payment", "mortgage-topic"],
  ["affordability", "Affordability", "mortgage-topic"],
  ["rent vs buy", "Rent vs Buy", "borrower-goal"],
];

function fail(message) {
  throw new Error(`Tagged content search validation failed: ${message}`);
}

function latestLifecycleDate(...values) {
  return values
    .filter((value) => DATE_PATTERN.test(String(value || "")))
    .reduce((latest, value) => (value > latest ? value : latest), "");
}

function semanticWords(value) {
  return (String(value || "").match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [])
    .map((word) => word.toLowerCase());
}

function hasMeaningfulWordDiversity(words) {
  if (words.length <= 1) return true;
  const frequencies = new Map();
  for (const word of words) frequencies.set(word, (frequencies.get(word) || 0) + 1);
  if (frequencies.size === 1) return false;
  const highestFrequency = Math.max(...frequencies.values());
  if (highestFrequency > Math.max(2, Math.ceil(words.length * 0.4))) return false;
  return words.length < 8 || frequencies.size / words.length >= 0.4;
}

function validateMeaningfulCompetingPageReview(item, tag) {
  for (const [field, rule] of Object.entries(REVIEW_SEMANTIC_RULES)) {
    const value = String(item[field] || "").trim();
    const words = semanticWords(value);
    if (
      value.length < rule.minimum
      || value.length > rule.maximum
      || words.length < rule.minimumWords
      || !hasMeaningfulWordDiversity(words)
      || (rule.evidence && !rule.evidence.test(value))
    ) {
      fail(`tag ${tag.id} needs meaningful competing-page review ${field}`);
    }
  }
  if (!item.borrowerQuestion.trim().endsWith("?")) {
    fail(`tag ${tag.id} needs meaningful competing-page review borrowerQuestion`);
  }
  const rationale = item.rationale.toLowerCase();
  if (!rationale.includes(item.entity.toLowerCase()) || !rationale.includes(tag.displayName.toLowerCase())) {
    fail(`tag ${tag.id} needs meaningful competing-page review rationale context`);
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesProgramTitle(title, productName) {
  const phrase = String(productName || "").toLowerCase().replace(/\s+loans?$/, "");
  const tokens = phrase.match(/[a-z0-9]+/g);
  if (!tokens?.length) return false;
  if (tokens.length === 1 && tokens[0].length <= 2) {
    return new RegExp(`(?:^|[^a-z0-9])${tokens[0]}[^a-z0-9]+loans?(?=$|[^a-z0-9])`, "i").test(String(title || ""));
  }
  const pattern = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-z0-9]+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`, "i").test(String(title || ""));
}

function titleCase(value) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.length <= 3 && /^[A-Z]+$/.test(part) ? part : `${part[0]?.toUpperCase() || ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sameOrderedValues(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function compactText(value, maximum = 320) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1).trimEnd()}...`;
}

function candidate(type, displayName, priority, identity = {}) {
  const slug = identity.slug || slugify(displayName);
  return { id: identity.id || `tag-${type}-${slug}`, type, displayName, slug, priority };
}

function addCandidate(candidates, type, displayName, priority, identity = {}) {
  const normalized = compactText(displayName, 120);
  if (!normalized || FORBIDDEN_PUBLIC_COPY.test(normalized)) return;
  const nextCandidate = candidate(type, normalized, priority, identity);
  const key = nextCandidate.id;
  const existing = candidates.get(key);
  if (!existing || priority < existing.priority) candidates.set(key, nextCandidate);
}

function tagDescription(tag) {
  const subject = tag.displayName;
  if (CONTROLLED_TOPIC_DESCRIPTIONS[tag.id]) return CONTROLLED_TOPIC_DESCRIPTIONS[tag.id];
  if (tag.type === "state" || tag.type === "city") return `Explore mortgage planning resources and local market context for ${subject}.`;
  if (tag.type === "loan-program") return `Explore ${subject.replace(/\bLoans$/, "loan")} guidance, requirements, and related mortgage planning resources.`;
  if (tag.type === "borrower-goal") {
    return BORROWER_GOAL_DESCRIPTIONS[tag.slug] || `Explore practical mortgage guidance, comparison points, and next-step questions for ${subject.toLowerCase()}.`;
  }
  return `Explore ${subject} guidance and related mortgage planning resources.`;
}

function sourcePreview(record) {
  const authoredPreview = record.previewText || record.summary || record.content?.summary || record.dek || record.heroSummary || record.metaDescription;
  if (authoredPreview) return compactText(authoredPreview);
  if (CALCULATOR_PREVIEWS[record.id]) return CALCULATOR_PREVIEWS[record.id];
  const title = record.title || record.name || "Mortgage resource";
  return compactText(`Review ${title} guidance, assumptions, and next steps.`);
}

function makeRecord(family, source, extra = {}) {
  return {
    id: source.id,
    route: source.route,
    family,
    title: source.title || source.name,
    preview: sourcePreview(source),
    image: source.image?.src || source.image || source.imageId || null,
    author: source.authorId || source.contributorId || null,
    publishedAt: source.publishedAt || null,
    updatedAt: source.updatedAt || source.lastUpdated || source.publishedAt || null,
    source,
    ...extra,
  };
}

function collectCanonicalRecords(inputs) {
  const seed = inputs.productionSeed || inputs.productionSeedData || {};
  const editorial = inputs.editorialContent || {};
  const news = inputs.locationNewsIndex || {};
  const productCopy = new Map((inputs.productCopy?.products || []).map((product) => [product.id, product]));
  const states = new Map((seed.states || []).map((state) => [state.id, state]));
  const cities = new Map((seed.cities || []).map((city) => [city.id, city]));
  const products = new Map((seed.products || []).map((product) => [product.id, { ...product, content: productCopy.get(product.id) }]));
  const records = [];

  for (const article of editorial.articles || []) records.push(makeRecord("articles", article));
  for (const hub of editorial.topicHubs || []) {
    if (hub.public !== false && hub.route && !/^editorial team$/i.test(hub.name || "")) records.push(makeRecord("topic-guides", hub));
  }
  for (const article of news.articles || []) records.push(makeRecord("local-market-news", article));
  for (const product of products.values()) records.push(makeRecord("product-guides", product));
  for (const calculator of seed.calculators || []) records.push(makeRecord("calculators", calculator));

  const ids = new Set();
  const routes = new Set();
  for (const record of records) {
    if (!record.id || !record.route || !record.title || !FAMILY_RANK.has(record.family)) fail("canonical records must include an ID, route, title, and approved family");
    if (ids.has(record.id)) fail(`duplicate canonical record ID ${record.id}`);
    if (routes.has(record.route)) fail(`duplicate canonical record route ${record.route}`);
    ids.add(record.id);
    routes.add(record.route);
  }
  return records
    .sort((left, right) => FAMILY_RANK.get(left.family) - FAMILY_RANK.get(right.family) || left.route.localeCompare(right.route))
    .map((record, canonicalOrder) => ({ ...record, canonicalOrder, states, cities, products }));
}

function candidatesForRecord(record, identityByCandidateId = new Map()) {
  const candidates = new Map();
  const { source, states, cities, products } = record;
  const isLocalNews = record.family === "local-market-news";
  const isProductGuide = record.family === "product-guides";
  const subjectPriority = isLocalNews ? 1 : 0;
  const locationPriority = isLocalNews ? 0 : 3;
  const productPriority = isLocalNews ? 4 : isProductGuide ? 0 : 1;
  const goalPriority = isLocalNews ? 9 : isProductGuide ? 1 : 5;
  const productIds = source.productIds || (record.family === "product-guides" ? [source.id] : []);
  if (!isLocalNews) {
    for (const productId of productIds) {
      const product = products.get(productId);
      if (!product) continue;
      addCandidate(candidates, "loan-program", product.name, productPriority);
      addCandidate(candidates, "borrower-goal", product.borrowerGoal, goalPriority);
    }
  }
  const title = String(source.title || source.name || "");
  for (const product of products.values()) {
    if (matchesProgramTitle(title, product.name)) addCandidate(candidates, "loan-program", product.name, subjectPriority);
  }
  for (const stateId of source.stateIds || []) {
    const state = states.get(stateId);
    if (state) addCandidate(candidates, "state", state.name, locationPriority + 1);
  }
  for (const cityId of source.cityIds || (source.locationId?.startsWith("city-") ? [source.locationId] : [])) {
    const city = cities.get(cityId);
    if (!city) continue;
    const state = states.get(city.stateId);
    addCandidate(candidates, "city", state ? `${city.name}, ${state.name}` : city.name, locationPriority);
  }
  if (source.locationId?.startsWith("state-")) {
    const state = states.get(source.locationId);
    if (state) addCandidate(candidates, "state", state.name, locationPriority);
  }
  if (record.family === "topic-guides" || record.family === "calculators") addPhraseCandidates(candidates, source.name || source.title, 0);
  for (const topicId of source.topicIds || []) {
    const topic = LOCATION_NEWS_TOPIC_TAGS[topicId];
    if (topic) addCandidate(candidates, topic.type, topic.displayName, subjectPriority, topic);
  }
  addPhraseCandidates(candidates, source.title || source.name, subjectPriority);
  for (const section of source.sections || []) addPhraseCandidates(candidates, section.heading, subjectPriority + 1);
  const resolvedCandidates = new Map();
  for (const tag of candidates.values()) {
    const id = identityByCandidateId.get(tag.id) || tag.id;
    const resolved = id === tag.id ? tag : { ...tag, id };
    const existing = resolvedCandidates.get(id);
    if (!existing || resolved.priority < existing.priority) resolvedCandidates.set(id, resolved);
  }
  return [...resolvedCandidates.values()].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

function sourceRouteIdentityKey(type, routes) {
  return `${type}\u001e${sortedUnique(routes || []).join("\u001f")}`;
}

function existingCandidateIdentityMap(catalog, existingRegistry) {
  if (!existingRegistry?.tags?.length) return new Map();
  const currentById = new Map();
  for (const record of catalog) {
    for (const tag of candidatesForRecord(record)) {
      const detail = currentById.get(tag.id) || { tag, routes: new Set() };
      detail.routes.add(record.route);
      currentById.set(tag.id, detail);
    }
  }

  const currentByKey = new Map();
  for (const detail of currentById.values()) {
    const key = sourceRouteIdentityKey(detail.tag.type, [...detail.routes]);
    currentByKey.set(key, [...(currentByKey.get(key) || []), detail.tag]);
  }
  const existingByKey = new Map();
  for (const tag of existingRegistry.tags) {
    const key = sourceRouteIdentityKey(tag.type, tag.sourceRoutes);
    existingByKey.set(key, [...(existingByKey.get(key) || []), tag]);
  }

  const currentIds = new Set(currentById.keys());
  const existingIds = new Set(existingRegistry.tags.map(({ id }) => id));
  const identities = new Map();
  for (const [key, currentMatches] of currentByKey) {
    const existingMatches = existingByKey.get(key) || [];
    if (currentMatches.length !== 1 || existingMatches.length !== 1) continue;
    const [currentTag] = currentMatches;
    const [existingTag] = existingMatches;
    if (currentTag.id === existingTag.id) continue;
    if (currentIds.has(existingTag.id) || existingIds.has(currentTag.id)) continue;
    identities.set(currentTag.id, existingTag.id);
  }
  return identities;
}

function addPhraseCandidates(candidates, value, priority) {
  const text = compactText(value, 240).toLowerCase();
  for (const [phrase, displayName, type] of PHRASE_TAGS) {
    if (text.includes(phrase)) addCandidate(candidates, type, displayName, priority);
  }
}

function reviewFor(tag, record, identityByCandidateId) {
  const candidate = candidatesForRecord(record, identityByCandidateId).find(({ id }) => id === tag.id);
  const relationship = candidate.priority <= 1 ? "DIRECT" : candidate.priority <= 4 ? "NEAR" : "SUPPORTING";
  const jobs = {
    "articles": ["How does this mortgage topic affect a borrower's decision?", "research a mortgage decision", "borrowers comparing mortgage choices", "borrower-focused mortgage explanation", "read the guidance and compare mortgage next steps"],
    "topic-guides": ["Where should a borrower start learning about this mortgage topic?", "learn about a mortgage topic", "borrowers exploring mortgage guidance", "borrower-focused mortgage topic guide", "browse the guide and compare related mortgage guidance"],
    "local-market-news": ["What does this local market evidence mean for a borrower's mortgage plan?", "understand local mortgage market evidence", "borrowers considering this local mortgage market", "dated local mortgage market update", "review local evidence and compare mortgage planning context"],
    "product-guides": ["How could this loan program fit a borrower's mortgage situation?", "compare mortgage loan options", "borrowers evaluating a mortgage program", "borrower-focused mortgage loan guide", "compare loan requirements and explore mortgage options"],
    "calculators": ["How does this input change a borrower's mortgage scenario?", "estimate a mortgage scenario", "borrowers modeling a mortgage payment", "interactive mortgage calculator", "calculate a scenario and compare mortgage assumptions"],
  }[record.family];
  const [borrowerQuestion, intent, audience, substantiveCoverage, action] = jobs;
  const disposition = "KEEP DISTINCT";
  return {
    route: record.route,
    borrowerQuestion,
    intent,
    audience,
    entity: record.title,
    substantiveCoverage,
    action,
    relationship,
    disposition,
    rationale: `${record.title} provides ${substantiveCoverage} for borrowers; ${tag.displayName} remains a distinct discovery resource that organizes relevant records across content families.`,
  };
}

function locationCompetitorsByTagId(catalog, identityByCandidateId) {
  const competitors = new Map();
  const { states, cities } = catalog[0] || {};
  if (!(states instanceof Map) || !(cities instanceof Map)) return competitors;

  for (const state of states.values()) {
    if (!state.route) continue;
    const tag = candidate("state", state.name, 0);
    competitors.set(identityByCandidateId.get(tag.id) || tag.id, { route: state.route, displayName: state.name, type: "state" });
  }
  for (const city of cities.values()) {
    const state = states.get(city.stateId);
    if (!city.route || !state) continue;
    const displayName = `${city.name}, ${state.name}`;
    const tag = candidate("city", displayName, 0);
    competitors.set(identityByCandidateId.get(tag.id) || tag.id, { route: city.route, displayName, type: "city" });
  }
  return competitors;
}

function locationCompetitorReview(tag, location) {
  const placeType = location.type === "city" ? "city" : "state";
  return {
    route: location.route,
    borrowerQuestion: `What mortgage and housing context should a borrower review for this ${placeType}?`,
    intent: "understand a local mortgage market",
    audience: `borrowers researching this ${placeType}'s mortgage market`,
    entity: location.displayName,
    substantiveCoverage: "canonical location mortgage market guide",
    action: "review market evidence and compare local mortgage resources",
    relationship: "NEAR",
    disposition: "KEEP DISTINCT",
    rationale: `${location.displayName} provides the location-specific mortgage market guide; ${tag.displayName} remains a distinct discovery resource that organizes related records across content families.`,
  };
}

function buildRegistry(catalog, { reviewedAt, existingRegistry } = {}) {
  const tagDetails = new Map();
  const routeCandidates = new Map();
  const identityByCandidateId = existingCandidateIdentityMap(catalog, existingRegistry);
  const locationCompetitors = locationCompetitorsByTagId(catalog, identityByCandidateId);
  const existingTagsById = new Map((existingRegistry?.tags || []).map((tag) => [tag.id, tag]));
  const registryReviewDate = latestLifecycleDate(
    reviewedAt,
    existingRegistry?.updatedAt,
    ...(existingRegistry?.tags || []).flatMap((tag) => [tag.reviewedAt, tag.updatedAt]),
  );
  for (const record of catalog) {
    const tags = candidatesForRecord(record, identityByCandidateId);
    routeCandidates.set(record.route, tags);
    for (const tag of tags) {
      const detail = tagDetails.get(tag.id) || { tag, routes: new Set(), related: new Set(), reviews: [] };
      detail.routes.add(record.route);
      tagDetails.set(tag.id, detail);
    }
    for (const tag of tags) {
      const detail = tagDetails.get(tag.id);
      for (const related of tags) if (related.id !== tag.id) detail.related.add(related.id);
      detail.reviews.push(reviewFor(tag, record, identityByCandidateId));
    }
  }
  const tags = [...tagDetails.values()].map(({ tag, routes, related, reviews }) => {
    const { priority, ...publicTag } = tag;
    const location = locationCompetitors.get(tag.id);
    const existingTag = existingTagsById.get(tag.id);
    const tagReviewDate = latestLifecycleDate(registryReviewDate, existingTag?.reviewedAt, existingTag?.updatedAt);
    const createdAt = DATE_PATTERN.test(existingTag?.createdAt || "") && existingTag.createdAt <= tagReviewDate
      ? existingTag.createdAt
      : tagReviewDate;
    const redirectSlugs = sortedUnique([
      ...(Array.isArray(existingTag?.redirectSlugs) ? existingTag.redirectSlugs : []),
      existingTag?.slug && existingTag.slug !== tag.slug ? existingTag.slug : null,
    ]).filter((slug) => slug !== tag.slug);
    if (location && !reviews.some(({ route }) => route === location.route)) {
      reviews.push(locationCompetitorReview(tag, location));
    }
    return {
    ...publicTag,
    description: tagDescription(tag),
    sourceRoutes: sortedUnique([...routes]),
    relatedTagIds: sortedUnique([...related]),
    canonicalRoute: `/learning-center/tags/${tag.slug}`,
    createdAt,
    reviewedAt: tagReviewDate,
    updatedAt: tagReviewDate,
    redirectSlugs,
    competingPageReview: {
      disposition: reviews.some(({ disposition }) => disposition === "KEEP DISTINCT") ? "KEEP DISTINCT" : "DIFFERENTIATE",
      routes: reviews.sort((left, right) => left.route.localeCompare(right.route)),
    },
  };
  }).sort((left, right) => left.id.localeCompare(right.id));
  const assignments = catalog.map((record) => {
    const tagIds = (routeCandidates.get(record.route) || []).map((tag) => tag.id);
    return { route: record.route, primaryTagIds: tagIds.slice(0, 3), additionalTagIds: tagIds.slice(3) };
  }).sort((left, right) => left.route.localeCompare(right.route));
  const registry = { version: 1, updatedAt: registryReviewDate, tags, assignments };
  registry.tags = registry.tags.map((tag) => ({
    ...tag,
    relatedTagIds: rankPublicRelatedTagIds(registry, tag).slice(0, MAX_CANONICAL_RELATED_TAGS),
  }));
  return registry;
}

function buildCompactIndex(catalog, registry, updatedAt) {
  const assignmentByRoute = new Map(registry.assignments.map((assignment) => [assignment.route, assignment]));
  const records = catalog.map((record) => {
    const assignment = assignmentByRoute.get(record.route);
    const tagIds = [...assignment.primaryTagIds, ...assignment.additionalTagIds];
    return {
      id: record.id,
      route: record.route,
      family: record.family,
      title: record.title,
      preview: record.preview,
      image: record.image,
      author: record.author,
      publishedAt: record.publishedAt,
      updatedAt: record.updatedAt,
      tagIds,
      primaryTagIds: assignment.primaryTagIds,
      locationIds: sortedUnique([...(record.source.stateIds || []), ...(record.source.cityIds || []), record.source.locationId]),
      productIds: sortedUnique(record.source.productIds || (record.family === "product-guides" ? [record.id] : [])),
      canonicalOrder: record.canonicalOrder,
    };
  });
  return { version: 1, updatedAt, records };
}

function assignmentRole(assignment, tagId) {
  if (assignment.primaryTagIds.includes(tagId)) return "primary";
  if (assignment.additionalTagIds.includes(tagId)) return "additional";
  return null;
}

function coOccurrenceWeight(leftRole, rightRole) {
  if (leftRole === "primary" && rightRole === "primary") return 9;
  if (leftRole === "primary" || rightRole === "primary") return 3;
  return 1;
}

function isLocationTag(tag) {
  return tag.type === "city" || tag.type === "state";
}

function isLocalMarketNewsRoute(route) {
  return String(route || "").startsWith("/learning-center/market-news/");
}

export function rankPublicRelatedTagIds(registry, tag) {
  const tagById = new Map(registry.tags.map((candidate) => [candidate.id, candidate]));
  const sourceIsLocation = isLocationTag(tag);
  const allowed = new Set(tag.relatedTagIds.filter((id) => {
    const relatedTag = tagById.get(id);
    return relatedTag && (sourceIsLocation || !isLocationTag(relatedTag));
  }));
  const scores = new Map([...allowed].map((id) => [id, { score: 0, tier: 0 }]));
  for (const assignment of registry.assignments) {
    const sourceRole = assignmentRole(assignment, tag.id);
    if (!sourceRole) continue;
    for (const candidateId of [...assignment.primaryTagIds, ...assignment.additionalTagIds]) {
      if (candidateId === tag.id || !allowed.has(candidateId)) continue;
      const candidateRole = assignmentRole(assignment, candidateId);
      const candidate = tagById.get(candidateId);
      const existing = scores.get(candidateId);
      let score = coOccurrenceWeight(sourceRole, candidateRole);
      let tier = 0;
      if (isLocationTag(tag)) {
        if (sourceRole === "primary" && candidateRole === "primary" && !isLocationTag(candidate) && isLocalMarketNewsRoute(assignment.route)) {
          tier = 3;
          score += 100;
        } else if (!isLocationTag(candidate) && candidate.type !== "loan-program" && candidate.type !== "borrower-goal") {
          tier = 2;
          score += 20;
        } else if (sourceRole === "primary" && candidateRole === "primary") {
          tier = 1;
        }
      } else if (sourceRole === "primary" && candidateRole === "primary" && isLocationTag(candidate)) {
        tier = 1;
        score += 20;
      }
      scores.set(candidateId, { score: existing.score + score, tier: Math.max(existing.tier, tier) });
    }
  }
  return [...scores]
    .sort(([leftId, left], [rightId, right]) => right.tier - left.tier
      || right.score - left.score
      || tagById.get(leftId).displayName.localeCompare(tagById.get(rightId).displayName)
      || leftId.localeCompare(rightId))
    .map(([id]) => id);
}

export function buildPublicTagRegistry(registry) {
  validateTagRegistry(registry);
  const publicTagIds = new Set(registry.tags.map(({ id }) => id));
  const tags = registry.tags.map(({ id, displayName, slug, type, description, relatedTagIds, canonicalRoute, reviewedAt, updatedAt, redirectSlugs }) => ({
    id, displayName, slug, type, description,
    relatedTagIds: rankPublicRelatedTagIds(registry, { id, relatedTagIds: relatedTagIds.filter((relatedId) => publicTagIds.has(relatedId)), type }).slice(0, MAX_PUBLIC_RELATED_TAGS),
    canonicalRoute, reviewedAt, updatedAt, redirectSlugs,
  }));
  const tagIndexes = new Map(tags.map(({ id }, index) => [id, index]));
  const assignments = registry.assignments.map(({ route, primaryTagIds, additionalTagIds }) => [
    route,
    primaryTagIds.map((id) => tagIndexes.get(id)),
    additionalTagIds.map((id) => tagIndexes.get(id)),
  ]);
  const publicRegistry = { version: 1, updatedAt: registry.updatedAt, tags, assignments };
  validatePublicTagRegistry(publicRegistry);
  return publicRegistry;
}

export function validatePublicTagRegistry(registry) {
  if (!registry || registry.version !== 1 || !DATE_PATTERN.test(registry.updatedAt || "") || !Array.isArray(registry.tags) || !Array.isArray(registry.assignments)) {
    fail("public tag registry must have version 1, YYYY-MM-DD updatedAt, tags, and assignments");
  }
  const ids = new Set();
  for (const tag of registry.tags) {
    const keys = Object.keys(tag);
    if (keys.length !== PUBLIC_TAG_KEYS.size || keys.some((key) => !PUBLIC_TAG_KEYS.has(key))) fail(`public tag ${tag.id || "without ID"} has unexpected fields`);
    if (!tag.id || ids.has(tag.id) || !APPROVED_TAG_TYPES.has(tag.type) || tag.canonicalRoute !== `/learning-center/tags/${tag.slug}` || !Array.isArray(tag.relatedTagIds) || tag.relatedTagIds.length > MAX_PUBLIC_RELATED_TAGS || !Array.isArray(tag.redirectSlugs) || !DATE_PATTERN.test(tag.reviewedAt || "") || !DATE_PATTERN.test(tag.updatedAt || "") || tag.reviewedAt > tag.updatedAt || tag.updatedAt > registry.updatedAt) fail(`invalid public tag ${tag.id || "without ID"}`);
    if (new Set(tag.relatedTagIds).size !== tag.relatedTagIds.length) fail(`public tag ${tag.id} repeats a related tag`);
    if (FORBIDDEN_PUBLIC_COPY.test(`${tag.displayName} ${tag.description}`)) fail(`forbidden public copy in public tag ${tag.id}`);
    if (UNHELPFUL_TAG_COPY.test(tag.description)) fail(`unhelpful public copy in public tag ${tag.id}`);
    ids.add(tag.id);
  }
  for (const tag of registry.tags) for (const relatedId of tag.relatedTagIds) if (!ids.has(relatedId)) fail(`public tag ${tag.id} references an invalid related tag`);
  for (const assignment of registry.assignments) {
    if (!Array.isArray(assignment) || assignment.length !== 3 || !String(assignment[0] || "").startsWith("/") || !Array.isArray(assignment[1]) || !Array.isArray(assignment[2]) || assignment[1].length < 1 || assignment[1].length > 3) {
      fail("public assignment must contain route and one to three primary tag indexes");
    }
    for (const index of [...assignment[1], ...assignment[2]]) if (!Number.isInteger(index) || index < 0 || index >= registry.tags.length) fail("public assignment references an invalid tag index");
  }
}

export function validateTagRegistry(registry) {
  if (!registry || registry.version !== 1 || !DATE_PATTERN.test(registry.updatedAt || "")) fail("registry must have version 1 and YYYY-MM-DD updatedAt");
  if (!Array.isArray(registry.tags) || !Array.isArray(registry.assignments)) fail("registry must include tags and assignments arrays");
  const ids = new Set();
  const normalizedNames = new Set();
  for (const tag of registry.tags) {
    if (!APPROVED_TAG_TYPES.has(tag.type)) fail(`tag ${tag.id} has an unapproved type`);
    if (!/^tag-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.id || "") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.slug || "")) fail("tag IDs and slugs must be stable");
    if (ids.has(tag.id)) fail(`duplicate tag ID ${tag.id}`);
    ids.add(tag.id);
    const normalizedName = slugify(tag.displayName);
    if (!normalizedName || normalizedNames.has(normalizedName)) fail(`normalized duplicate tag ${tag.displayName}`);
    normalizedNames.add(normalizedName);
    if (FORBIDDEN_PUBLIC_COPY.test(`${tag.displayName} ${tag.description}`)) fail(`forbidden public copy in tag ${tag.id}`);
    if (UNHELPFUL_TAG_COPY.test(tag.description)) fail(`unhelpful public copy in tag ${tag.id}`);
    if (!tag.description || !Array.isArray(tag.sourceRoutes) || !tag.sourceRoutes.length || tag.sourceRoutes.some((route) => !String(route).startsWith("/"))) fail(`tag ${tag.id} needs valid source routes`);
    if (!sameOrderedValues(tag.sourceRoutes, sortedUnique(tag.sourceRoutes))) fail(`tag ${tag.id} source routes must be unique and stable`);
    if (!Array.isArray(tag.relatedTagIds) || tag.relatedTagIds.length > MAX_CANONICAL_RELATED_TAGS || new Set(tag.relatedTagIds).size !== tag.relatedTagIds.length) fail(`tag ${tag.id} needs bounded unique related tags`);
    if (tag.canonicalRoute !== `/learning-center/tags/${tag.slug}`) fail(`tag ${tag.id} has an invalid canonical route`);
    if (![tag.createdAt, tag.reviewedAt, tag.updatedAt].every((date) => DATE_PATTERN.test(date || ""))) fail(`tag ${tag.id} must have valid dates`);
    if (tag.createdAt > tag.reviewedAt || tag.reviewedAt > tag.updatedAt || tag.updatedAt > registry.updatedAt) fail(`tag ${tag.id} has invalid lifecycle dates`);
    if (!Array.isArray(tag.redirectSlugs)) fail(`tag ${tag.id} redirect slugs must be an array`);
    const review = tag.competingPageReview;
    if (!APPROVED_REVIEW_DISPOSITIONS.has(review?.disposition) || !Array.isArray(review.routes) || !review.routes.length) fail(`tag ${tag.id} needs a complete competing-page review`);
    const reviewRoutes = new Set();
    for (const item of review.routes) {
      for (const field of ["route", "borrowerQuestion", "intent", "audience", "entity", "substantiveCoverage", "action", "relationship", "disposition", "rationale"]) {
        if (typeof item[field] !== "string" || !item[field].trim()) fail(`tag ${tag.id} has an incomplete competing-page review record`);
      }
      if (!item.route.startsWith("/") || !APPROVED_REVIEW_RELATIONSHIPS.has(item.relationship) || !APPROVED_REVIEW_DISPOSITIONS.has(item.disposition)) fail(`tag ${tag.id} has an invalid competing-page review record`);
      validateMeaningfulCompetingPageReview(item, tag);
      if (reviewRoutes.has(item.route)) fail(`tag ${tag.id} has a duplicate competing-page review route ${item.route}`);
      reviewRoutes.add(item.route);
    }
  }
  const tagById = new Map(registry.tags.map((tag) => [tag.id, tag]));
  for (const tag of registry.tags) {
    for (const relatedId of tag.relatedTagIds) {
      const relatedTag = tagById.get(relatedId);
      if (!relatedTag) fail(`tag ${tag.id} references an unknown related tag ${relatedId}`);
      if (!isLocationTag(tag) && isLocationTag(relatedTag)) fail(`tag ${tag.id} cannot expose location tags as broad related navigation`);
    }
  }
  const assignedRoutesByTagId = new Map([...ids].map((id) => [id, []]));
  const assignmentRoutes = new Set();
  for (const assignment of registry.assignments) {
    if (!String(assignment.route || "").startsWith("/") || !Array.isArray(assignment.primaryTagIds) || !Array.isArray(assignment.additionalTagIds) || assignment.primaryTagIds.length < 1 || assignment.primaryTagIds.length > 3) fail(`assignment ${assignment.route} must have one to three primary tags and a complete additional-tag list`);
    if (assignmentRoutes.has(assignment.route)) fail(`duplicate assignment route ${assignment.route}`);
    assignmentRoutes.add(assignment.route);
    const completeTagIds = [...assignment.primaryTagIds, ...assignment.additionalTagIds];
    if (new Set(completeTagIds).size !== completeTagIds.length) fail(`assignment ${assignment.route} repeats a tag`);
    for (const id of completeTagIds) {
      if (!ids.has(id)) fail(`assignment ${assignment.route} references an unknown tag ${id}`);
      assignedRoutesByTagId.get(id).push(assignment.route);
    }
  }
  for (const tag of registry.tags) {
    const assignedRoutes = sortedUnique(assignedRoutesByTagId.get(tag.id));
    if (!sameOrderedValues(tag.sourceRoutes, assignedRoutes)) fail(`tag ${tag.id} assignment provenance must exactly match assigned routes`);
    const reviewedRoutes = new Set(tag.competingPageReview.routes.map(({ route }) => route));
    for (const route of assignedRoutes) {
      if (!reviewedRoutes.has(route)) fail(`tag ${tag.id} assigned route ${route} is missing from its competing-page review`);
    }
  }
}

export function validateSearchIndex(searchIndex, registry) {
  if (!searchIndex || searchIndex.version !== 1 || !DATE_PATTERN.test(searchIndex.updatedAt || "") || !Array.isArray(searchIndex.records)) fail("search index must have version 1, YYYY-MM-DD updatedAt, and records");
  const tagIds = new Set(registry.tags.map((tag) => tag.id));
  const assignmentByRoute = new Map();
  for (const assignment of registry.assignments) {
    if (assignmentByRoute.has(assignment.route)) fail(`duplicate canonical assignment route ${assignment.route}`);
    assignmentByRoute.set(assignment.route, assignment);
  }
  const routes = new Set();
  const ids = new Set();
  for (const record of searchIndex.records) {
    if (!FAMILY_RANK.has(record.family) || !record.id || !String(record.route || "").startsWith("/") || !record.title || !record.preview) fail(`invalid search record ${record.id || "without ID"}`);
    if ("sections" in record || "body" in record || "localContext" in record) fail(`search record ${record.id} contains full article body data`);
    const keys = Object.keys(record);
    if (keys.length !== SEARCH_RECORD_KEYS.size || keys.some((key) => !SEARCH_RECORD_KEYS.has(key))) fail(`search record ${record.id} has an unexpected key`);
    if (ids.has(record.id)) fail(`duplicate search record ID ${record.id}`);
    ids.add(record.id);
    if (routes.has(record.route)) fail(`duplicate search route ${record.route}`);
    routes.add(record.route);
    if (!Array.isArray(record.tagIds) || !Array.isArray(record.primaryTagIds) || record.primaryTagIds.length < 1 || record.primaryTagIds.length > 3) fail(`search record ${record.id} has invalid tag assignments`);
    for (const id of record.tagIds) if (!tagIds.has(id)) fail(`search record ${record.id} references an unknown tag ${id}`);
    if (!record.primaryTagIds.every((id) => record.tagIds.includes(id))) fail(`search record ${record.id} primary tags must resolve in tagIds`);
    if (FORBIDDEN_PUBLIC_COPY.test(`${record.title} ${record.preview}`)) fail(`forbidden public copy in search record ${record.id}`);
    if (SENTINEL_PUBLIC_COPY.test(`${record.title} ${record.preview}`)) fail(`sentinel public copy in search record ${record.id}`);
    const assignment = assignmentByRoute.get(record.route);
    if (!assignment) fail(`search record ${record.id} has no canonical assignment`);
    const completeTagIds = [...assignment.primaryTagIds, ...assignment.additionalTagIds];
    if (!sameOrderedValues(record.primaryTagIds, assignment.primaryTagIds) || !sameOrderedValues(record.tagIds, completeTagIds)) {
      fail(`search record ${record.id} does not match its canonical assignment`);
    }
  }
  for (const route of assignmentByRoute.keys()) {
    if (!routes.has(route)) fail(`canonical assignment without a search record: ${route}`);
  }
}

export function buildTaggedContentSearch(inputs, {
  reviewedAt,
  updatedAt,
  existingRegistry,
  generatedAt: _generatedAt,
} = {}) {
  const lifecycleDate = reviewedAt || updatedAt || TAGGED_CONTENT_REVIEWED_AT;
  if (!DATE_PATTERN.test(lifecycleDate)) fail("a YYYY-MM-DD reviewed date is required");
  const catalog = collectCanonicalRecords(inputs);
  const registry = buildRegistry(catalog, { reviewedAt: lifecycleDate, existingRegistry });
  const searchIndex = buildCompactIndex(catalog, registry, registry.updatedAt);
  const publicTagRegistry = buildPublicTagRegistry(registry);
  validateTagRegistry(registry);
  validatePublicTagRegistry(publicTagRegistry);
  validateSearchIndex(searchIndex, registry);
  return { registry, publicTagRegistry, searchIndex };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value, { compact = false } = {}) {
  fs.writeFileSync(filePath, `${compact ? JSON.stringify(value) : JSON.stringify(value, null, 2)}\n`);
}

function runCli() {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const registryPath = path.join(directory, "tag-registry.json");
  const publicRegistryPath = path.join(directory, "public-tag-registry.json");
  const searchIndexPath = path.join(directory, "search-index.json");
  const result = buildTaggedContentSearch({
    productionSeed: readJson(path.join(directory, "production-seed.json")),
    editorialContent: readJson(path.join(directory, "editorial-content.json")),
    locationNewsIndex: readJson(path.join(directory, "location-news-index.json")),
    productCopy: readJson(path.join(directory, "product-copy.json")),
  }, {
    reviewedAt: TAGGED_CONTENT_REVIEWED_AT,
    existingRegistry: fs.existsSync(registryPath) ? readJson(registryPath) : undefined,
  });
  writeJson(registryPath, result.registry);
  writeJson(publicRegistryPath, result.publicTagRegistry, { compact: true });
  writeJson(searchIndexPath, result.searchIndex, { compact: true });
  console.log(`Accepted ${result.registry.tags.length} tags, ${result.registry.assignments.length} assignments, and ${result.searchIndex.records.length} search records: ${registryPath}, ${publicRegistryPath}, ${searchIndexPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();

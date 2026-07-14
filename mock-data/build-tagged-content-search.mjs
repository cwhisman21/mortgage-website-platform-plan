import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONTENT_FAMILY_ORDER = Object.freeze([
  "articles", "topic-guides", "local-market-news", "product-guides", "calculators",
]);

const APPROVED_TAG_TYPES = new Set([
  "mortgage-topic", "loan-program", "borrower-goal", "state", "city",
  "property-concept", "market-topic",
]);
const APPROVED_REVIEW_RELATIONSHIPS = new Set(["DIRECT", "NEAR", "SUPPORTING"]);
const APPROVED_REVIEW_DISPOSITIONS = new Set(["KEEP DISTINCT", "DIFFERENTIATE", "MERGE", "CANONICALIZE", "REDIRECT", "DO NOT CREATE"]);
const FORBIDDEN_PUBLIC_COPY = /\b(?:placeholder|wireframe|demo|scaffold|schema|workflow|review status|internal)\b/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FAMILY_RANK = new Map(CONTENT_FAMILY_ORDER.map((family, index) => [family, index]));
const SEARCH_RECORD_KEYS = new Set([
  "id", "route", "family", "title", "preview", "image", "author", "publishedAt", "updatedAt",
  "tagIds", "primaryTagIds", "locationIds", "productIds", "canonicalOrder",
]);
const PUBLIC_TAG_KEYS = new Set(["id", "displayName", "slug", "type", "description", "canonicalRoute"]);

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
  ["editorial team", "Mortgage Guidance", "mortgage-topic"],
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

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function compactText(value, maximum = 320) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1).trimEnd()}...`;
}

function candidate(type, displayName, priority) {
  const slug = slugify(displayName);
  return { id: `tag-${type}-${slug}`, type, displayName, slug, priority };
}

function addCandidate(candidates, type, displayName, priority) {
  const normalized = compactText(displayName, 120);
  if (!normalized || FORBIDDEN_PUBLIC_COPY.test(normalized)) return;
  const key = `${type}:${slugify(normalized)}`;
  const existing = candidates.get(key);
  if (!existing || priority < existing.priority) candidates.set(key, candidate(type, normalized, priority));
}

function tagDescription(tag) {
  const subject = tag.displayName;
  if (tag.type === "state" || tag.type === "city") return `Explore mortgage planning resources and local market context for ${subject}.`;
  if (tag.type === "loan-program") return `Explore ${subject.replace(/\bLoans$/, "loan")} guidance, requirements, and related mortgage planning resources.`;
  if (tag.type === "borrower-goal") return `Explore mortgage resources that support borrowers planning to ${subject.toLowerCase()}.`;
  return `Explore ${subject} guidance and related mortgage planning resources.`;
}

function sourcePreview(record) {
  return compactText(record.previewText || record.summary || record.content?.summary || record.dek || record.heroSummary || record.metaDescription || `${record.title} resources.`);
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
  for (const hub of editorial.topicHubs || []) if (hub.public !== false && hub.route) records.push(makeRecord("topic-guides", hub));
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

function candidatesForRecord(record) {
  const candidates = new Map();
  const { source, states, cities, products } = record;
  const isLocalNews = record.family === "local-market-news";
  const isProductGuide = record.family === "product-guides";
  const subjectPriority = isLocalNews ? 1 : 0;
  const locationPriority = isLocalNews ? 0 : 3;
  const productPriority = isLocalNews ? 4 : isProductGuide ? 0 : 1;
  const goalPriority = isLocalNews ? 9 : isProductGuide ? 1 : 5;
  const productIds = source.productIds || (record.family === "product-guides" ? [source.id] : []);
  for (const productId of productIds) {
    const product = products.get(productId);
    if (!product) continue;
    addCandidate(candidates, "loan-program", product.name, productPriority);
    addCandidate(candidates, "borrower-goal", product.borrowerGoal, goalPriority);
  }
  const title = String(source.title || source.name || "").toLowerCase();
  for (const product of products.values()) {
    const productPhrase = product.name.toLowerCase().replace(/\s+loans?$/, "");
    if (productPhrase && title.includes(productPhrase)) addCandidate(candidates, "loan-program", product.name, subjectPriority);
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
  for (const topicId of source.topicIds || []) addPhraseCandidates(candidates, titleCase(topicId), subjectPriority);
  addPhraseCandidates(candidates, source.title || source.name, subjectPriority);
  for (const section of source.sections || []) addPhraseCandidates(candidates, section.heading, subjectPriority + 1);
  return [...candidates.values()].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

function addPhraseCandidates(candidates, value, priority) {
  const text = compactText(value, 240).toLowerCase();
  for (const [phrase, displayName, type] of PHRASE_TAGS) {
    if (text.includes(phrase)) addCandidate(candidates, type, displayName, priority);
  }
}

function reviewFor(tag, record) {
  const candidate = candidatesForRecord(record).find(({ id }) => id === tag.id);
  const relationship = candidate.priority <= 1 ? "DIRECT" : candidate.priority <= 4 ? "NEAR" : "SUPPORTING";
  const jobs = {
    "articles": ["Learn how this mortgage topic affects a decision", "research", "borrowers comparing mortgage choices", "editorial explanation", "read guidance and compare next steps"],
    "topic-guides": ["Where should I start learning about this mortgage topic", "learn", "borrowers exploring a topic", "topic hub", "browse related guidance"],
    "local-market-news": ["What does this local evidence mean for my plan", "understand local context", "borrowers considering this market", "dated local market update", "review local evidence"],
    "product-guides": ["Does this loan program fit my situation", "compare loan options", "borrowers evaluating a program", "loan program guide", "compare loan requirements"],
    "calculators": ["How does this input change my mortgage scenario", "estimate", "borrowers modeling a payment", "interactive calculator", "calculate a scenario"],
  }[record.family];
  const [borrowerQuestion, intent, audience, substantiveCoverage, action] = jobs;
  const disposition = relationship === "DIRECT" ? "KEEP DISTINCT" : "DIFFERENTIATE";
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
    rationale: `${record.title} serves the ${substantiveCoverage} job; the ${tag.displayName} discovery page remains a separate cross-content starting point.`,
  };
}

function buildRegistry(catalog, updatedAt) {
  const tagDetails = new Map();
  const routeCandidates = new Map();
  for (const record of catalog) {
    const tags = candidatesForRecord(record);
    routeCandidates.set(record.route, tags);
    for (const tag of tags) {
      const detail = tagDetails.get(tag.id) || { tag, routes: new Set(), related: new Set(), reviews: [] };
      detail.routes.add(record.route);
      tagDetails.set(tag.id, detail);
    }
    for (const tag of tags) {
      const detail = tagDetails.get(tag.id);
      for (const related of tags) if (related.id !== tag.id) detail.related.add(related.id);
      detail.reviews.push(reviewFor(tag, record));
    }
  }
  const tags = [...tagDetails.values()].map(({ tag, routes, related, reviews }) => {
    const { priority, ...publicTag } = tag;
    return {
    ...publicTag,
    description: tagDescription(tag),
    sourceRoutes: sortedUnique([...routes]),
    relatedTagIds: sortedUnique([...related]),
    canonicalRoute: `/learning-center/tags/${tag.slug}`,
    createdAt: updatedAt,
    reviewedAt: updatedAt,
    updatedAt,
    redirectSlugs: [],
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
  return { version: 1, updatedAt, tags, assignments };
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

export function buildPublicTagRegistry(registry) {
  validateTagRegistry(registry);
  const tags = registry.tags.map(({ id, displayName, slug, type, description, canonicalRoute }) => ({
    id, displayName, slug, type, description, canonicalRoute,
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
    if (!tag.id || ids.has(tag.id) || !APPROVED_TAG_TYPES.has(tag.type) || tag.canonicalRoute !== `/learning-center/tags/${tag.slug}`) fail(`invalid public tag ${tag.id || "without ID"}`);
    if (FORBIDDEN_PUBLIC_COPY.test(`${tag.displayName} ${tag.description}`)) fail(`forbidden public copy in public tag ${tag.id}`);
    ids.add(tag.id);
  }
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
    if (!tag.description || !Array.isArray(tag.sourceRoutes) || !tag.sourceRoutes.length || tag.sourceRoutes.some((route) => !String(route).startsWith("/"))) fail(`tag ${tag.id} needs valid source routes`);
    if (tag.canonicalRoute !== `/learning-center/tags/${tag.slug}`) fail(`tag ${tag.id} has an invalid canonical route`);
    if (![tag.createdAt, tag.reviewedAt, tag.updatedAt].every((date) => DATE_PATTERN.test(date || ""))) fail(`tag ${tag.id} must have valid dates`);
    if (!Array.isArray(tag.redirectSlugs)) fail(`tag ${tag.id} redirect slugs must be an array`);
    const review = tag.competingPageReview;
    if (!APPROVED_REVIEW_DISPOSITIONS.has(review?.disposition) || !Array.isArray(review.routes) || !review.routes.length) fail(`tag ${tag.id} needs a complete competing-page review`);
    for (const item of review.routes) {
      for (const field of ["route", "borrowerQuestion", "intent", "audience", "entity", "substantiveCoverage", "action", "relationship", "disposition", "rationale"]) {
        if (typeof item[field] !== "string" || !item[field].trim()) fail(`tag ${tag.id} has an incomplete competing-page review record`);
      }
      if (!item.route.startsWith("/") || !APPROVED_REVIEW_RELATIONSHIPS.has(item.relationship) || !APPROVED_REVIEW_DISPOSITIONS.has(item.disposition)) fail(`tag ${tag.id} has an invalid competing-page review record`);
    }
  }
  for (const assignment of registry.assignments) {
    if (!String(assignment.route || "").startsWith("/") || !Array.isArray(assignment.primaryTagIds) || assignment.primaryTagIds.length < 1 || assignment.primaryTagIds.length > 3) fail(`assignment ${assignment.route} must have one to three primary tags`);
    for (const id of [...assignment.primaryTagIds, ...(assignment.additionalTagIds || [])]) if (!ids.has(id)) fail(`assignment ${assignment.route} references an unknown tag ${id}`);
  }
}

export function validateSearchIndex(searchIndex, registry) {
  if (!searchIndex || searchIndex.version !== 1 || !DATE_PATTERN.test(searchIndex.updatedAt || "") || !Array.isArray(searchIndex.records)) fail("search index must have version 1, YYYY-MM-DD updatedAt, and records");
  const tagIds = new Set(registry.tags.map((tag) => tag.id));
  const routes = new Set();
  for (const record of searchIndex.records) {
    if (!FAMILY_RANK.has(record.family) || !record.id || !String(record.route || "").startsWith("/") || !record.title || !record.preview) fail(`invalid search record ${record.id || "without ID"}`);
    if ("sections" in record || "body" in record || "localContext" in record) fail(`search record ${record.id} contains full article body data`);
    const keys = Object.keys(record);
    if (keys.length !== SEARCH_RECORD_KEYS.size || keys.some((key) => !SEARCH_RECORD_KEYS.has(key))) fail(`search record ${record.id} has an unexpected key`);
    if (routes.has(record.route)) fail(`duplicate search route ${record.route}`);
    routes.add(record.route);
    if (!Array.isArray(record.tagIds) || !Array.isArray(record.primaryTagIds) || record.primaryTagIds.length < 1 || record.primaryTagIds.length > 3) fail(`search record ${record.id} has invalid tag assignments`);
    for (const id of record.tagIds) if (!tagIds.has(id)) fail(`search record ${record.id} references an unknown tag ${id}`);
    if (!record.primaryTagIds.every((id) => record.tagIds.includes(id))) fail(`search record ${record.id} primary tags must resolve in tagIds`);
    if (FORBIDDEN_PUBLIC_COPY.test(`${record.title} ${record.preview} ${record.searchText}`)) fail(`forbidden public copy in search record ${record.id}`);
  }
}

export function buildTaggedContentSearch(inputs, { updatedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const catalog = collectCanonicalRecords(inputs);
  const registry = buildRegistry(catalog, updatedAt);
  const searchIndex = buildCompactIndex(catalog, registry, updatedAt);
  validateTagRegistry(registry);
  validateSearchIndex(searchIndex, registry);
  return { registry, searchIndex };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value, { compact = false } = {}) {
  fs.writeFileSync(filePath, `${compact ? JSON.stringify(value) : JSON.stringify(value, null, 2)}\n`);
}

function runCli() {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const result = buildTaggedContentSearch({
    productionSeed: readJson(path.join(directory, "production-seed.json")),
    editorialContent: readJson(path.join(directory, "editorial-content.json")),
    locationNewsIndex: readJson(path.join(directory, "location-news-index.json")),
    productCopy: readJson(path.join(directory, "product-copy.json")),
  });
  const publicRegistry = buildPublicTagRegistry(result.registry);
  const registryPath = path.join(directory, "tag-registry.json");
  const publicRegistryPath = path.join(directory, "public-tag-registry.json");
  const searchIndexPath = path.join(directory, "search-index.json");
  writeJson(registryPath, result.registry);
  writeJson(publicRegistryPath, publicRegistry, { compact: true });
  writeJson(searchIndexPath, result.searchIndex, { compact: true });
  console.log(`Accepted ${result.registry.tags.length} tags, ${result.registry.assignments.length} assignments, and ${result.searchIndex.records.length} search records: ${registryPath}, ${publicRegistryPath}, ${searchIndexPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const editorialDirectory = path.join(root, "editorial");
const outputPath = path.join(root, "editorial-content.json");
const localArticleIds = [
  "article-austin-market-update", "article-dallas-market-update", "article-houston-market-update",
  "article-irvine-market-update", "article-san-diego-market-update", "article-sacramento-market-update",
  "article-denver-market-update", "article-colorado-springs-market-update", "article-boulder-market-update",
  "article-tampa-market-update", "article-orlando-market-update", "article-miami-market-update",
];
const publicHubRoutes = [
  "/learning-center/local-market-updates", "/learning-center/buying-a-home", "/learning-center/refinance",
  "/learning-center/fha-loans", "/learning-center/va-loans", "/learning-center/jumbo-loans",
  "/learning-center/home-equity", "/learning-center/taxes-insurance", "/learning-center/editorial-team",
];
const requiredSourceIds = [
  "freddie-mac-pmms-2026-07-09", "fhfa-hpi-june-2026", "fhfa-conforming-loan-limits-2026",
  "hud-fha-loan-limits-2026", "va-home-loans", "cfpb-owning-a-home", "cfpb-loan-estimate",
  "cfpb-mortgage-key-terms", "cfpb-jumbo-loan", "bls-laus-may-2026", "texas-comptroller-property-tax",
  "california-doi-residential-insurance", "colorado-property-taxation", "florida-property-tax",
  "fema-floodsmart", "naic-homeowners-insurance",
];
const bannedCopy = /\b(?:dummy|mock|prototype|placeholder|wireframe|scaffold|editorial draft|compliance review|available sections|content graph|trust layer|lorem ipsum|tbd)\b/i;

function fail(message) {
  throw new Error(`Editorial content validation failed: ${message}`);
}

function readJson(fileName, { optional = false } = {}) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    if (optional) return null;
    fail(`missing ${fileName}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${fileName}: ${error.message}`);
  }
}

function unwrapList(raw, key, fileName) {
  const list = Array.isArray(raw) ? raw : raw?.[key];
  if (!Array.isArray(list)) fail(`${fileName} must contain a ${key} array`);
  return list;
}

function requireString(value, label, minimum = 1) {
  if (typeof value !== "string" || value.trim().length < minimum) fail(`${label} must be a ${minimum}-character string`);
}

function requireDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) fail(`${label} must be YYYY-MM-DD`);
}

function collectRoutes(value, routes = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectRoutes(item, routes));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectRoutes(item, routes));
  else if (typeof value === "string" && value.startsWith("/")) routes.add(value);
  return routes;
}

function normalizedArticleText(article) {
  return JSON.stringify(article).replace(/\s+/g, " ");
}

function sourceMapFor(sources) {
  const map = new Map();
  for (const source of sources) {
    requireString(source?.id, "source id");
    if (map.has(source.id)) fail(`duplicate source ID ${source.id}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)) fail(`source ${source.id} has an unstable ID`);
    for (const field of ["publisher", "title", "dataPeriod", "accessedAt", "geographicScope", "claimSupported"]) requireString(source[field], `source ${source.id}.${field}`);
    requireDate(source.accessedAt, `source ${source.id}.accessedAt`);
    if (source.authoritative !== true) fail(`source ${source.id} must be authoritative`);
    if (!/^https:\/\//.test(source.url || "")) fail(`source ${source.id} must use a direct HTTPS URL`);
    map.set(source.id, source);
  }
  for (const id of requiredSourceIds) if (!map.has(id)) fail(`source ledger is missing ${id}`);
  return map;
}

function resolveBaseArticle(fragment, baseArticles) {
  const candidateIds = [fragment.baseArticleId, fragment.articleId, fragment.id].filter(Boolean);
  const match = candidateIds.map((id) => baseArticles.byId.get(id)).find(Boolean)
    || (fragment.route ? baseArticles.byRoute.get(fragment.route) : null);
  if (!match) fail(`overlay ${fragment.id || fragment.baseArticleId || "without an ID"} does not resolve to a base article`);
  return match;
}

function sectionText(section) {
  if (typeof section?.body === "string") return section.body;
  if (Array.isArray(section?.paragraphs)) return section.paragraphs.join(" ");
  return "";
}

function validateArticle(fragment, baseArticle, contributorIds, sources, routes, isLocal) {
  const article = { ...fragment, id: baseArticle.id, route: baseArticle.route, title: baseArticle.title };
  if (fragment.id && fragment.id !== baseArticle.id && fragment.baseArticleId !== baseArticle.id && fragment.articleId !== baseArticle.id) {
    fail(`overlay ${fragment.id} does not preserve canonical article ID ${baseArticle.id}`);
  }
  if (fragment.route && fragment.route !== baseArticle.route) fail(`${baseArticle.id} does not preserve canonical route`);
  if (fragment.title && fragment.title !== baseArticle.title) fail(`${baseArticle.id} does not preserve canonical title`);
  if (!contributorIds.has(article.authorId)) fail(`${baseArticle.id} has an unknown authorId`);
  for (const field of ["summary", "dek", "metaDescription"]) requireString(article[field], `${baseArticle.id}.${field}`, 40);
  if (isLocal) {
    requireDate(article.publishedAt, `${baseArticle.id}.publishedAt`);
    requireDate(article.asOf, `${baseArticle.id}.asOf`);
    if (article.updatedAt) fail(`${baseArticle.id} is a local update and cannot use updatedAt`);
  } else {
    requireDate(article.updatedAt, `${baseArticle.id}.updatedAt`);
  }
  if (!Array.isArray(article.keyTakeaways) || article.keyTakeaways.length < 3) fail(`${baseArticle.id} needs at least three takeaways`);
  article.keyTakeaways.forEach((takeaway, index) => requireString(takeaway, `${baseArticle.id}.keyTakeaways[${index}]`, 20));
  if (!Array.isArray(article.sections) || article.sections.length < 3) fail(`${baseArticle.id} needs at least three sections`);
  article.sections.forEach((section, index) => {
    requireString(section?.heading, `${baseArticle.id}.sections[${index}].heading`, 8);
    requireString(sectionText(section), `${baseArticle.id}.sections[${index}] body`, 80);
  });
  if (!Array.isArray(article.faqs) || article.faqs.length < 2) fail(`${baseArticle.id} needs at least two FAQs`);
  article.faqs.forEach((faq, index) => {
    requireString(faq?.question, `${baseArticle.id}.faqs[${index}].question`, 12);
    requireString(faq?.answer, `${baseArticle.id}.faqs[${index}].answer`, 40);
  });
  if (!Array.isArray(article.sourceIds) || article.sourceIds.length < 2) fail(`${baseArticle.id} needs at least two source IDs`);
  article.sourceIds.forEach((id) => {
    if (!sources.has(id)) fail(`${baseArticle.id} cites missing source ${id}`);
  });
  if (!Array.isArray(article.relatedRoutes) || article.relatedRoutes.length < 2) fail(`${baseArticle.id} needs at least two related routes`);
  article.relatedRoutes.forEach((route) => {
    if (!routes.has(route) || route === article.route) fail(`${baseArticle.id} has invalid related route ${route}`);
  });
  if (bannedCopy.test(normalizedArticleText(article))) fail(`${baseArticle.id} contains banned public copy`);
  return article;
}

function validateTopicHubs(hubs, contributorIds) {
  const publicHubs = hubs.filter((hub) => hub.public === true);
  if (publicHubs.length !== publicHubRoutes.length) fail(`expected ${publicHubRoutes.length} public topic hubs, found ${publicHubs.length}`);
  if (publicHubs.map((hub) => hub.route).join("|") !== publicHubRoutes.join("|")) fail("public topic hubs must use the approved routes and order");
  if (new Set(publicHubs.map((hub) => hub.id)).size !== publicHubs.length) fail("public topic hub IDs must be unique");
  for (const hub of publicHubs) {
    const hubContributorIds = hub.contributorIds || (hub.contributorId ? [hub.contributorId] : []);
    if (!hubContributorIds.length || hubContributorIds.some((id) => !contributorIds.has(id))) fail(`${hub.id} has an unknown contributor`);
    requireString(hub.name, `${hub.id}.name`, 3);
    requireString(hub.heroSummary, `${hub.id}.heroSummary`, 40);
    requireString(hub.whyItMatters, `${hub.id}.whyItMatters`, 40);
    if (!Array.isArray(hub.overviewParagraphs) || hub.overviewParagraphs.length < 2) fail(`${hub.id} needs overview paragraphs`);
    hub.overviewParagraphs.forEach((paragraph, index) => requireString(paragraph, `${hub.id}.overviewParagraphs[${index}]`, 40));
    if (!Array.isArray(hub.startHere) || hub.startHere.length < 2) fail(`${hub.id} needs start-here steps`);
    hub.startHere.forEach((step, index) => requireString(step?.text, `${hub.id}.startHere[${index}].text`, 30));
    if (!Array.isArray(hub.comparisonPoints) || hub.comparisonPoints.length < 2) fail(`${hub.id} needs comparison points`);
    hub.comparisonPoints.forEach((point, index) => requireString(point?.text, `${hub.id}.comparisonPoints[${index}].text`, 30));
    if (!Array.isArray(hub.featuredLinkIds) || hub.featuredLinkIds.length < 1) fail(`${hub.id} needs featured links`);
    requireString(hub.closingCta?.text, `${hub.id}.closingCta.text`, 40);
    if (bannedCopy.test(normalizedArticleText(hub))) fail(`${hub.id} contains banned public copy`);
  }
  return hubs;
}

function compile() {
  const seed = readJson("production-seed.json");
  const contributors = unwrapList(readJson("editorial/contributors.json"), "contributors", "contributors.json");
  const topicHubs = unwrapList(readJson("editorial/topic-hubs.json"), "topicHubs", "topic-hubs.json");
  const ledger = unwrapList(readJson("editorial/source-ledger.json"), "sources", "source-ledger.json");
  const localFragments = unwrapList(readJson("editorial/articles-local.json"), "articles", "articles-local.json");
  const guideDocument = readJson("editorial/articles-guides.json", { optional: true });
  const guideFragments = guideDocument ? unwrapList(guideDocument, "articles", "articles-guides.json") : [];
  const baseArticles = {
    byId: new Map(seed.articles.map((article) => [article.id, article])),
    byRoute: new Map(seed.articles.map((article) => [article.route, article])),
  };
  const contributorIds = new Set(contributors.map((contributor) => contributor.id));
  if (contributorIds.size !== contributors.length) fail("contributor IDs must be unique");
  const sources = sourceMapFor(ledger);
  const routes = collectRoutes(seed);
  const localByCanonicalId = new Map(localFragments.map((fragment) => [resolveBaseArticle(fragment, baseArticles).id, fragment]));
  if (localByCanonicalId.size !== localArticleIds.length || localArticleIds.some((id) => !localByCanonicalId.has(id))) fail("local overlays must be exactly the approved twelve");
  const fragments = [...localArticleIds.map((id) => ({ fragment: localByCanonicalId.get(id), isLocal: true })), ...guideFragments.map((fragment) => ({ fragment, isLocal: false }))];
  const articles = fragments.map(({ fragment, isLocal }) => validateArticle(fragment, resolveBaseArticle(fragment, baseArticles), contributorIds, sources, routes, isLocal));
  if (new Set(articles.map((article) => article.id)).size !== articles.length) fail("each base article may have only one overlay");
  const openings = new Set();
  for (const article of articles) {
    const opening = sectionText(article.sections[0]);
    if (openings.has(opening)) fail(`${article.id} repeats opening copy`);
    openings.add(opening);
  }
  const output = {
    version: "snap-editorial-production-v1",
    contributors,
    topicHubs: validateTopicHubs(topicHubs, contributorIds),
    articles,
    sources: ledger,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

try {
  const output = compile();
  console.log(`Compiled ${output.articles.length} editorial overlays to ${path.relative(process.cwd(), outputPath)}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

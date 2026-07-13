import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const compiledPath = new URL("../mock-data/editorial-content.json", import.meta.url);
const productionSeedPath = new URL("../mock-data/production-seed.json", import.meta.url);

const localArticleIds = [
  "article-austin-market-update",
  "article-dallas-market-update",
  "article-houston-market-update",
  "article-irvine-market-update",
  "article-san-diego-market-update",
  "article-sacramento-market-update",
  "article-denver-market-update",
  "article-colorado-springs-market-update",
  "article-boulder-market-update",
  "article-tampa-market-update",
  "article-orlando-market-update",
  "article-miami-market-update",
];

const publicHubRoutes = [
  "/learning-center/local-market-updates",
  "/learning-center/buying-a-home",
  "/learning-center/refinance",
  "/learning-center/fha-loans",
  "/learning-center/va-loans",
  "/learning-center/jumbo-loans",
  "/learning-center/home-equity",
  "/learning-center/taxes-insurance",
  "/learning-center/editorial-team",
];

const bannedCopy = /\b(?:dummy|mock|prototype|placeholder|wireframe|scaffold|editorial draft|compliance review|available sections|content graph|trust layer|lorem ipsum|tbd)\b/i;

function loadCompiled() {
  return JSON.parse(fs.readFileSync(compiledPath, "utf8"));
}

function collectRoutes(value, routes = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectRoutes(item, routes));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectRoutes(item, routes));
  else if (typeof value === "string" && value.startsWith("/")) routes.add(value);
  return routes;
}

function articleText(article) {
  return [
    article.title,
    article.summary,
    article.dek,
    article.metaDescription,
    ...(article.keyTakeaways || []),
    ...(article.sections || []).flatMap((section) => [section.heading, section.body, ...(section.paragraphs || [])]),
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ].filter(Boolean).join("\n");
}

test("compiles exactly the twelve Task 5 local overlays and nine public topic hubs", () => {
  const content = loadCompiled();
  const articleIds = content.articles.map((article) => article.id);
  const publicHubs = content.topicHubs.filter((hub) => hub.public === true);

  assert.equal(content.version, "snap-editorial-production-v1");
  assert.deepEqual(articleIds, localArticleIds);
  assert.equal(new Set(articleIds).size, localArticleIds.length);
  assert.equal(publicHubs.length, publicHubRoutes.length);
  assert.equal(new Set(publicHubs.map((hub) => hub.id)).size, publicHubRoutes.length);
  assert.deepEqual(publicHubs.map((hub) => hub.route), publicHubRoutes);
  for (const hub of publicHubs) {
    assert.ok(hub.heroSummary?.length >= 40, `${hub.id} is missing heroSummary`);
    assert.ok(Array.isArray(hub.overviewParagraphs) && hub.overviewParagraphs.length >= 2, `${hub.id} is missing overview paragraphs`);
    assert.ok(hub.whyItMatters?.length >= 40, `${hub.id} is missing whyItMatters`);
    assert.ok(Array.isArray(hub.startHere) && hub.startHere.length >= 2, `${hub.id} is missing startHere`);
    assert.ok(Array.isArray(hub.comparisonPoints) && hub.comparisonPoints.length >= 2, `${hub.id} is missing comparisonPoints`);
    assert.ok(Array.isArray(hub.featuredLinkIds) && hub.featuredLinkIds.length >= 1, `${hub.id} is missing featuredLinkIds`);
    assert.ok(hub.closingCta?.text?.length >= 40, `${hub.id} is missing closingCta`);
  }
});

test("requires complete, dated, attributable local mortgage articles", () => {
  const content = loadCompiled();
  const authorIds = new Set(content.contributors.map((contributor) => contributor.id));
  const canonicalRoutes = collectRoutes(JSON.parse(fs.readFileSync(productionSeedPath, "utf8")));
  const openings = new Set();

  for (const article of content.articles) {
    assert.ok(authorIds.has(article.authorId), `${article.id} has an unknown author`);
    assert.match(article.publishedAt, /^2026-\d{2}-\d{2}$/);
    assert.match(article.asOf, /^2026-\d{2}-\d{2}$/);
    assert.equal(Boolean(article.updatedAt), false, `${article.id} is a local update, not an evergreen guide`);
    assert.match(article.route, /^\/learning-center\/[a-z0-9-]+$/);
    for (const field of ["title", "summary", "dek", "metaDescription"]) {
      assert.ok(typeof article[field] === "string" && article[field].trim().length >= 40, `${article.id} has an incomplete ${field}`);
    }
    assert.ok(Array.isArray(article.keyTakeaways) && article.keyTakeaways.length >= 3, `${article.id} needs three takeaways`);
    assert.ok(Array.isArray(article.sections) && article.sections.length >= 3, `${article.id} needs three sections`);
    assert.ok(article.sections.every((section) => section.heading?.trim() && (section.body || section.paragraphs?.join(" ") || "").trim().length >= 80), `${article.id} has a thin section`);
    assert.ok(Array.isArray(article.faqs) && article.faqs.length >= 2, `${article.id} needs two FAQs`);
    assert.ok(article.faqs.every((faq) => faq.question?.trim() && faq.answer?.trim().length >= 40), `${article.id} has an incomplete FAQ`);
    assert.ok(Array.isArray(article.relatedRoutes) && article.relatedRoutes.length >= 2, `${article.id} needs two related routes`);
    assert.ok(article.relatedRoutes.every((route) => typeof route === "string" && route !== article.route && canonicalRoutes.has(route)), `${article.id} has an invalid related route`);
    const opening = article.sections[0].body || article.sections[0].paragraphs[0];
    assert.equal(openings.has(opening), false, `${article.id} repeats opening copy`);
    openings.add(opening);
    assert.doesNotMatch(articleText(article), bannedCopy, `${article.id} contains banned public copy`);
  }
});

test("resolves every cited article source to an authoritative direct source record", () => {
  const content = loadCompiled();
  const sourceMap = new Map(content.sources.map((source) => [source.id, source]));

  for (const source of content.sources) {
    assert.match(source.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(source.authoritative, true, `${source.id} must be authoritative`);
    assert.match(source.url, /^https:\/\//, `${source.id} needs a direct URL`);
    for (const field of ["publisher", "title", "dataPeriod", "accessedAt", "geographicScope", "claimSupported"]) {
      assert.ok(typeof source[field] === "string" && source[field].trim(), `${source.id} is missing ${field}`);
    }
  }

  for (const article of content.articles) {
    assert.ok(Array.isArray(article.sourceIds) && article.sourceIds.length >= 2, `${article.id} needs two sources`);
    for (const sourceId of article.sourceIds) {
      assert.ok(sourceMap.has(sourceId), `${article.id} cites missing source ${sourceId}`);
    }
  }
});

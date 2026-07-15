import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const compiledPath = new URL("../mock-data/editorial-content.json", import.meta.url);
const productionSeedPath = new URL("../mock-data/production-seed.json", import.meta.url);
const sourceLedgerPath = new URL("../mock-data/editorial/source-ledger.json", import.meta.url);
const topicHubSourcePath = new URL("../mock-data/editorial/topic-hubs.json", import.meta.url);

const auditedArticles = [
  { id: "article-austin-market-update", route: "/learning-center/austin-mortgage-market-update", kind: "local" },
  { id: "article-dallas-market-update", route: "/learning-center/dallas-buyer-market-update", kind: "local" },
  { id: "article-houston-market-update", route: "/learning-center/houston-refinance-market-update", kind: "local" },
  { id: "article-irvine-market-update", route: "/learning-center/irvine-jumbo-market-update", kind: "local" },
  { id: "article-san-diego-market-update", route: "/learning-center/san-diego-va-affordability-update", kind: "local" },
  { id: "article-sacramento-market-update", route: "/learning-center/sacramento-move-up-market-update", kind: "local" },
  { id: "article-denver-market-update", route: "/learning-center/denver-relocation-market-update", kind: "local" },
  { id: "article-colorado-springs-market-update", route: "/learning-center/colorado-springs-va-market-update", kind: "local" },
  { id: "article-boulder-market-update", route: "/learning-center/boulder-jumbo-market-update", kind: "local" },
  { id: "article-tampa-market-update", route: "/learning-center/tampa-refinance-market-update", kind: "local" },
  { id: "article-orlando-market-update", route: "/learning-center/orlando-first-time-buyer-market-update", kind: "local" },
  { id: "article-miami-market-update", route: "/learning-center/miami-condo-jumbo-market-update", kind: "local" },
  { id: "article-texas-tax-guide", route: "/learning-center/texas-property-tax-mortgage-guide", kind: "evergreen" },
  { id: "article-california-insurance-guide", route: "/learning-center/california-tax-insurance-mortgage-guide", kind: "evergreen" },
  { id: "article-colorado-tax-guide", route: "/learning-center/colorado-property-tax-insurance-guide", kind: "evergreen" },
  { id: "article-florida-insurance-guide", route: "/learning-center/florida-insurance-mortgage-guide", kind: "evergreen" },
  { id: "article-fha-basics", route: "/learning-center/fha-loan-basics", kind: "evergreen" },
  { id: "article-va-basics", route: "/learning-center/va-loan-basics", kind: "evergreen" },
  { id: "article-jumbo-basics", route: "/learning-center/jumbo-loan-basics", kind: "evergreen" },
  { id: "article-refinance-basics", route: "/learning-center/refinance-basics", kind: "evergreen" },
  { id: "article-first-time-buyer", route: "/learning-center/first-time-buyer-local-market-checklist", kind: "evergreen" },
  { id: "article-move-up-buyer", route: "/learning-center/move-up-buyer-payment-equity-guide", kind: "evergreen" },
  { id: "article-home-equity-guide", route: "/learning-center/home-equity-options-guide", kind: "evergreen" },
  { id: "article-cash-out-guide", route: "/learning-center/cash-out-refinance-guide", kind: "evergreen" },
];

const auditedArticleIds = auditedArticles.map(({ id }) => id);
const evergreenArticleIds = auditedArticles.filter(({ kind }) => kind === "evergreen").map(({ id }) => id);
const auditedArticleById = new Map(auditedArticles.map((article) => [article.id, article]));

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

const bannedCopy = /\b(?:coming soon|demo|dummy|fixture|internal use|mock|prototype|placeholder|sample copy|scaffold|test data|wireframe|editorial draft|compliance review|available sections|content graph|trust layer|lorem ipsum|tbd)\b/i;
const breakingNewsCopy = /\b(?:breaking news|breaking update|developing story|happening now|just in|live updates?)\b/i;

function loadCompiled() {
  return JSON.parse(fs.readFileSync(compiledPath, "utf8"));
}

function loadProductionSeed() {
  return JSON.parse(fs.readFileSync(productionSeedPath, "utf8"));
}

function loadSourceLedger() {
  return JSON.parse(fs.readFileSync(sourceLedgerPath, "utf8"));
}

function loadTopicHubSource() {
  return JSON.parse(fs.readFileSync(topicHubSourcePath, "utf8"));
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
    ...(article.introduction || []),
    ...(article.keyTakeaways || []),
    ...(article.sections || []).flatMap((section) => [
      section.heading,
      section.body,
      ...(section.paragraphs || []),
      section.table?.caption,
      section.table?.note,
      ...(section.table?.columns || []),
      ...(section.table?.rows || []).flat(),
    ]),
    ...(article.ctaBreaks || []).flatMap((cta) => [cta.heading, cta.body, cta.label]),
    article.conclusion,
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ].filter(Boolean).join("\n");
}

function proseBlocks(article) {
  return [
    article.summary,
    article.dek,
    article.metaDescription,
    ...(article.introduction || []),
    ...(article.keyTakeaways || []),
    ...(article.sections || []).flatMap((section) => [
      section.body,
      ...(section.paragraphs || []),
      section.table?.caption,
      section.table?.note,
      ...(section.table?.rows || []).flat(),
    ]),
    ...(article.ctaBreaks || []).flatMap((cta) => [cta.body]),
    article.conclusion,
    ...(article.faqs || []).flatMap((faq) => [faq.answer]),
  ].filter((value) => typeof value === "string" && value.trim());
}

function normalizeProse(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findDuplicatePassages(articles, passageLength = 18) {
  const firstUseByPassage = new Map();
  const duplicates = [];

  for (const article of articles) {
    const articlePassages = new Set();
    for (const block of proseBlocks(article)) {
      const words = normalizeProse(block).split(/\s+/).filter(Boolean);
      for (let index = 0; index <= words.length - passageLength; index += 1) {
        articlePassages.add(words.slice(index, index + passageLength).join(" "));
      }
    }

    for (const passage of articlePassages) {
      const firstArticleId = firstUseByPassage.get(passage);
      if (firstArticleId && firstArticleId !== article.id) {
        duplicates.push({ firstArticleId, secondArticleId: article.id, passage });
      } else {
        firstUseByPassage.set(passage, article.id);
      }
    }
  }

  return duplicates;
}

test("compiles exactly one overlay for all 24 audited articles and nine public topic hubs", () => {
  const content = loadCompiled();
  const productionSeed = loadProductionSeed();
  const articleIds = content.articles.map((article) => article.id);
  const publicHubs = content.topicHubs.filter((hub) => hub.public === true);
  const overlayCountById = new Map(auditedArticleIds.map((id) => [id, articleIds.filter((articleId) => articleId === id).length]));
  const missingIds = auditedArticleIds.filter((id) => overlayCountById.get(id) === 0);
  const missingEvergreenIds = evergreenArticleIds.filter((id) => overlayCountById.get(id) === 0);
  const duplicateIds = auditedArticleIds.filter((id) => overlayCountById.get(id) > 1);
  const unexpectedIds = articleIds.filter((id) => !auditedArticleById.has(id));

  assert.equal(content.version, "snap-editorial-production-v1");
  assert.deepEqual(
    { missingIds, duplicateIds, unexpectedIds },
    { missingIds: [], duplicateIds: [], unexpectedIds: [] },
    `Expected exactly one compiled overlay for each audited article.\nMissing evergreen IDs:\n${missingEvergreenIds.join("\n")}`,
  );
  assert.deepEqual(articleIds, auditedArticleIds, "audited overlays must compile in the approved canonical order");

  for (const expected of auditedArticles) {
    const baseMatches = productionSeed.articles.filter((article) => article.id === expected.id);
    const baseRouteMatches = productionSeed.articles.filter((article) => article.route === expected.route);
    const overlayMatches = content.articles.filter((article) => article.id === expected.id && article.route === expected.route);
    assert.equal(baseMatches.length, 1, `${expected.id} must appear exactly once in the base production seed`);
    assert.equal(baseRouteMatches.length, 1, `${expected.route} must appear exactly once in the base production seed`);
    assert.equal(baseMatches[0].route, expected.route, `${expected.id} must preserve its audited base route`);
    assert.equal(overlayMatches.length, 1, `${expected.id} must compile exactly once at ${expected.route}`);
  }

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

test("requires complete, dated, attributable production mortgage articles", () => {
  const content = loadCompiled();
  const authorIds = new Set(content.contributors.map((contributor) => contributor.id));
  const canonicalRoutes = collectRoutes(loadProductionSeed());
  const openings = new Set();

  for (const article of content.articles) {
    const auditedArticle = auditedArticleById.get(article.id);
    assert.ok(auditedArticle, `${article.id} is not one of the 24 audited articles`);
    assert.ok(authorIds.has(article.authorId), `${article.id} has an unknown author`);
    assert.equal(article.route, auditedArticle.route, `${article.id} must preserve its audited canonical route`);

    if (auditedArticle.kind === "local") {
      assert.match(article.publishedAt, /^2026-\d{2}-\d{2}$/, `${article.id} needs a publishedAt date`);
      assert.match(article.asOf, /^2026-\d{2}-\d{2}$/, `${article.id} needs an asOf date`);
      assert.equal(Boolean(article.updatedAt), false, `${article.id} is a local update, not an evergreen guide`);
    } else {
      assert.match(article.updatedAt, /^2026-\d{2}-\d{2}$/, `${article.id} needs a Last updated date`);
      assert.notEqual(article.type, "local_market_update", `${article.id} must use evergreen guide framing`);
      assert.doesNotMatch(articleText(article), breakingNewsCopy, `${article.id} must not present evergreen guidance as breaking news`);
    }

    for (const field of ["title", "summary", "dek", "metaDescription"]) {
      assert.ok(typeof article[field] === "string" && article[field].trim().length >= 40, `${article.id} has an incomplete ${field}`);
    }
    assert.ok(Array.isArray(article.introduction) && article.introduction.length >= 2, `${article.id} needs a distinct two-paragraph introduction`);
    assert.ok(article.introduction.every((paragraph) => paragraph.trim().length >= 80), `${article.id} has a thin introduction paragraph`);
    assert.ok(Array.isArray(article.keyTakeaways) && article.keyTakeaways.length >= 3, `${article.id} needs three takeaways`);
    assert.ok(article.keyTakeaways.every((takeaway) => takeaway.trim().length >= 20), `${article.id} has a thin takeaway`);
    assert.ok(Array.isArray(article.sections) && article.sections.length >= 3, `${article.id} needs three sections`);
    assert.ok(article.sections.every((section) => section.heading?.trim() && (section.body || section.paragraphs?.join(" ") || "").trim().length >= 80), `${article.id} has a thin section`);
    const comparisonTables = article.sections.map((section) => section.table).filter(Boolean);
    assert.ok(comparisonTables.length >= 1, `${article.id} needs a useful comparison table or decision framework`);
    assert.ok(comparisonTables.every((table) => table.caption?.trim() && table.columns?.length >= 2 && table.rows?.length >= 2), `${article.id} has an incomplete comparison table`);
    assert.ok(Array.isArray(article.ctaBreaks) && article.ctaBreaks.length >= 1, `${article.id} needs a contextual CTA break`);
    assert.ok(article.ctaBreaks.every((cta) => cta.heading?.trim() && cta.body?.trim().length >= 40 && cta.label?.trim() && canonicalRoutes.has(cta.route)), `${article.id} has an incomplete or invalid CTA break`);
    assert.ok(typeof article.conclusion === "string" && article.conclusion.trim().length >= 120, `${article.id} needs a borrower-focused conclusion`);
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

test("does not repeat normalized 18-word prose passages across audited articles", () => {
  const duplicates = findDuplicatePassages(loadCompiled().articles);
  assert.deepEqual(
    duplicates,
    [],
    `Found repeated borrower-facing prose:\n${duplicates.map(({ firstArticleId, secondArticleId, passage }) => `${firstArticleId} / ${secondArticleId}: ${passage}`).join("\n")}`,
  );
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
    assert.match(source.accessedAt, /^2026-\d{2}-\d{2}$/, `${source.id} needs a dated access record`);
  }

  for (const article of content.articles) {
    assert.ok(Array.isArray(article.sourceIds) && article.sourceIds.length >= 2, `${article.id} needs two sources`);
    assert.equal(new Set(article.sourceIds).size, article.sourceIds.length, `${article.id} repeats a source ID`);
    for (const sourceId of article.sourceIds) {
      assert.ok(sourceMap.has(sourceId), `${article.id} cites missing source ${sourceId}`);
      assert.ok(article.sourceClaims?.some((sourceClaim) => sourceClaim.sourceId === sourceId && sourceClaim.claim?.trim().length >= 40), `${article.id} needs a visible claim for ${sourceId}`);
    }
  }
});

test("preserves factual review, limitation, and approval metadata for every material source", () => {
  const canonicalSources = loadSourceLedger().sources;
  const compiledSources = new Map(loadCompiled().sources.map((source) => [source.id, source]));
  const preservedFields = [
    "publisher",
    "dataPeriod",
    "accessedAt",
    "reviewedAt",
    "geographicScope",
    "limitation",
    "approvalState",
  ];

  assert.equal(compiledSources.size, canonicalSources.length, "compiled content must preserve the complete source ledger");

  for (const source of canonicalSources) {
    assert.equal(source.reviewedAt, "2026-07-13", `${source.id} needs the factual review date`);
    assert.ok(source.limitation?.trim().length >= 40, `${source.id} needs a material-use limitation`);
    assert.equal(
      source.approvalState,
      "research_reviewed_not_publication_approved",
      `${source.id} must not imply publication approval`,
    );

    const compiledSource = compiledSources.get(source.id);
    assert.ok(compiledSource, `${source.id} is missing from compiled editorial content`);
    for (const field of preservedFields) {
      assert.deepEqual(compiledSource[field], source[field], `${source.id}.${field} changed during compilation`);
    }
  }
});

test("preserves factual dates and attributable source IDs for all nine public topic hubs", () => {
  const sourceIds = new Set(loadSourceLedger().sources.map((source) => source.id));
  const canonicalHubs = loadTopicHubSource().topicHubs.filter((hub) => hub.public === true);
  const compiledHubs = new Map(loadCompiled().topicHubs.map((hub) => [hub.id, hub]));

  assert.equal(canonicalHubs.length, 9, "expected nine public topic hubs");

  for (const hub of canonicalHubs) {
    assert.equal(hub.lastUpdated, "2026-07-13", `${hub.id} needs its factual Last updated date`);
    assert.ok(Array.isArray(hub.sourceIds) && hub.sourceIds.length > 0, `${hub.id} needs claim-level source IDs`);
    assert.equal(new Set(hub.sourceIds).size, hub.sourceIds.length, `${hub.id} repeats a source ID`);
    for (const sourceId of hub.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `${hub.id} cites missing source ${sourceId}`);
    }

    const compiledHub = compiledHubs.get(hub.id);
    assert.ok(compiledHub, `${hub.id} is missing from compiled editorial content`);
    assert.equal(compiledHub.lastUpdated, hub.lastUpdated, `${hub.id}.lastUpdated changed during compilation`);
    assert.deepEqual(compiledHub.sourceIds, hub.sourceIds, `${hub.id}.sourceIds changed during compilation`);
  }
});

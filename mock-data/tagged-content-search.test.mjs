import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildPublicTagRegistry,
  buildTaggedContentSearch,
  LOCATION_NEWS_TOPIC_TAGS,
  rankPublicRelatedTagIds,
  validatePublicTagRegistry,
  validateSearchIndex,
  validateTagRegistry,
} from "./build-tagged-content-search.mjs";

const fixtureInputs = {
  productionSeed: {
    states: [{ id: "state-fl", name: "Florida", slug: "florida", route: "/locations/florida" }],
    cities: [{ id: "city-tampa-fl", name: "Tampa", stateId: "state-fl", route: "/locations/florida/tampa" }],
    products: [{ id: "product-fha", name: "FHA Loans", route: "/loan-options/fha-loans", borrowerGoal: "Buy a home" }],
    calculators: [{ id: "calc-payment", name: "Mortgage Payment Calculator", route: "/calculators/mortgage-payment" }],
  },
  editorialContent: {
    topicHubs: [{
      id: "topic-hub-fha", public: true, name: "FHA Loans", route: "/learning-center/fha-loans",
      heroSummary: "Learn how FHA loan requirements, down payments, and mortgage insurance can affect a home purchase.",
    }],
    articles: [{
      id: "article-fha-basics", title: "FHA loan basics for first-time buyers", route: "/learning-center/fha-loan-basics",
      summary: "FHA loans can help eligible buyers compare lower down payment options and mortgage insurance costs.",
      authorId: "contributor-jordan-lee", publishedAt: "2026-07-10", updatedAt: "2026-07-12",
      productIds: ["product-fha"], stateIds: ["state-fl"], sections: [{ heading: "FHA loan requirements", body: "This full body must never appear in the compact search index." }],
    }, {
      id: "article-florida-insurance", title: "Florida homeowners insurance and mortgage planning", route: "/learning-center/florida-homeowners-insurance",
      summary: "Florida buyers should include homeowners insurance estimates when comparing a monthly mortgage payment.",
      authorId: "contributor-morgan-ray", publishedAt: "2026-07-09", updatedAt: "2026-07-11",
      stateIds: ["state-fl"], sections: [{ heading: "Insurance costs in Florida", body: "This is also full article body." }],
    }],
  },
  locationNewsIndex: {
    articles: [{
      id: "news-tampa-fl-home-values", title: "Tampa home values in the latest market update", route: "/learning-center/market-news/tampa-home-values",
      previewText: "Review the latest Tampa home-value context and what it can and cannot say about a specific property.",
      authorId: "contributor-jordan-lee", publishedAt: "2026-07-13", updatedAt: "2026-07-13", locationId: "city-tampa-fl",
      topicIds: ["home-price-index", "home-values"], productIds: ["product-fha"], localContext: ["This full local-news copy must not be indexed."],
    }],
  },
};

test("builds deterministic assignments and a compact five-family index", () => {
  const first = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const second = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });

  assert.deepEqual(first, second);
  assert.ok(first.publicTagRegistry);
  assert.deepEqual(new Set(first.searchIndex.records.map(({ family }) => family)), new Set([
    "articles", "topic-guides", "local-market-news", "product-guides", "calculators",
  ]));
  for (const assignment of first.registry.assignments) {
    assert.ok(assignment.primaryTagIds.length >= 1 && assignment.primaryTagIds.length <= 3);
    assert.ok(assignment.primaryTagIds.every((id) => first.registry.tags.some((tag) => tag.id === id)));
  }
  assert.ok(first.registry.tags.every((tag) => tag.competingPageReview?.disposition));
  assert.ok(first.searchIndex.records.every((record) => !("sections" in record) && !("body" in record)));
  const paymentCalculator = first.searchIndex.records.find(({ id }) => id === "calc-payment");
  assert.equal(
    paymentCalculator.preview,
    "Estimate principal and interest, taxes, insurance, and other costs to compare potential monthly mortgage payments.",
  );
  validateTagRegistry(first.registry);
  validateSearchIndex(first.searchIndex, first.registry);
});

test("uses stable canonical tag IDs and rejects invalid registry values", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const fha = registry.tags.find((tag) => tag.slug === "fha-loans");

  assert.equal(fha.id, "tag-loan-program-fha-loans");
  assert.equal(fha.displayName, "FHA Loans");
  assert.equal(fha.type, "loan-program");
  assert.equal(fha.description, "Explore FHA loan guidance, requirements, and related mortgage planning resources.");
  assert.deepEqual(fha.sourceRoutes, ["/learning-center/fha-loan-basics", "/learning-center/fha-loans", "/loan-options/fha-loans"]);
  assert.equal(fha.canonicalRoute, "/learning-center/tags/fha-loans");
  assert.equal(fha.updatedAt, "2026-07-14");
  assert.deepEqual(fha.redirectSlugs, []);
  assert.ok(fha.competingPageReview.routes.every((review) => ["KEEP DISTINCT", "DIFFERENTIATE"].includes(review.disposition)));
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, type: "internal" }] }), /approved type/i);
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, displayName: "Demo FHA Loans" }] }), /forbidden public/i);
});

test("uses borrower-facing controlled topic labels without changing stable tag routes", () => {
  const inputs = structuredClone(fixtureInputs);
  inputs.locationNewsIndex.articles[0].topicIds = [
    "borrower-planning",
    "state-counties",
    "state-housing",
    "state-market",
  ];
  const { registry } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const expected = [
    ["tag-mortgage-topic-borrower-planning", "borrower-planning", "Employment and Mortgage Planning"],
    ["tag-market-topic-state-and-county-context", "state-and-county-context", "County Loan Limits by State"],
    ["tag-market-topic-state-housing", "state-housing", "State Housing Costs and Ownership"],
    ["tag-market-topic-state-market", "state-market", "State Home Price Trends"],
  ];

  for (const [id, slug, displayName] of expected) {
    const tag = registry.tags.find((candidate) => candidate.id === id);
    assert.ok(tag, `${id} must remain registered`);
    assert.equal(tag.slug, slug);
    assert.equal(tag.canonicalRoute, `/learning-center/tags/${slug}`);
    assert.equal(tag.displayName, displayName);
    assert.ok(tag.description.length >= 80, `${displayName} needs a useful borrower-facing description`);
  }
  assert.ok(!registry.tags.some(({ displayName }) => [
    "Borrower Planning",
    "State and County Context",
    "State Housing",
    "State Market",
  ].includes(displayName)));
});

test("rejects search records with unknown tags or full body fields", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const [record] = searchIndex.records;

  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, tagIds: ["tag-missing"] }] }, registry), /unknown tag/i);
  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, body: "Not compact" }] }, registry), /full article body/i);
  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, debug: true }] }, registry), /unexpected key/i);

  const mismatchedPrimary = structuredClone(searchIndex);
  mismatchedPrimary.records[0].primaryTagIds = mismatchedPrimary.records[0].primaryTagIds.slice(0, 1);
  assert.throws(() => validateSearchIndex(mismatchedPrimary, registry), /canonical assignment/i);

  const missingRecord = { ...searchIndex, records: searchIndex.records.slice(1) };
  assert.throws(() => validateSearchIndex(missingRecord, registry), /assignment without a search record/i);

  for (const sentinel of ["undefined resources.", "Null calculator guidance."]) {
    const invalidCopy = structuredClone(searchIndex);
    invalidCopy.records[0].preview = sentinel;
    assert.throws(() => validateSearchIndex(invalidCopy, registry), /sentinel public copy/i);
  }
});

function readCanonicalInputs() {
  return {
    productionSeed: JSON.parse(fs.readFileSync(new URL("./production-seed.json", import.meta.url), "utf8")),
    editorialContent: JSON.parse(fs.readFileSync(new URL("./editorial-content.json", import.meta.url), "utf8")),
    locationNewsIndex: JSON.parse(fs.readFileSync(new URL("./location-news-index.json", import.meta.url), "utf8")),
    productCopy: JSON.parse(fs.readFileSync(new URL("./product-copy.json", import.meta.url), "utf8")),
  };
}

test("indexes the seller proceeds workspace once with controlled primary tags", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const records = searchIndex.records.filter(({ route }) => route === "/sell");
  const assignment = registry.assignments.find(({ route }) => route === "/sell");

  assert.equal(records.length, 1);
  assert.equal(records[0].family, "topic-guides");
  assert.deepEqual(assignment.primaryTagIds, [
    "tag-market-topic-home-values",
    "tag-loan-program-home-equity-heloc",
    "tag-property-concept-owner-costs",
  ]);
  assert.deepEqual(records[0].primaryTagIds, assignment.primaryTagIds);
  assert.match(records[0].preview, /confirm known obligations/i);
  assert.match(records[0].preview, /selling costs/i);
});

test("prioritizes a city home-values story by location and subject instead of generic product goals", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const record = searchIndex.records.find(({ id }) => id === "news-austin-tx-affordability-home-values");

  assert.ok(record.primaryTagIds.includes("tag-city-austin-texas"));
  assert.ok(record.primaryTagIds.includes("tag-market-topic-home-values"));
  assert.ok(!record.primaryTagIds.includes("tag-borrower-goal-buy-a-home"));
  assert.ok(!record.primaryTagIds.includes("tag-borrower-goal-refinance-a-mortgage"));
  assert.ok(!record.tagIds.includes("tag-borrower-goal-buy-a-home"));
  assert.ok(!record.tagIds.includes("tag-borrower-goal-refinance-a-mortgage"));
  assert.ok(!record.tagIds.includes("tag-loan-program-fha-loans"));
  validateTagRegistry(registry);
});

test("keeps last-updated dates out of publishedAt", () => {
  const inputs = structuredClone(fixtureInputs);
  inputs.editorialContent.topicHubs[0].lastUpdated = "2026-07-13";
  const { searchIndex } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const hub = searchIndex.records.find(({ id }) => id === "topic-hub-fha");

  assert.equal(hub.publishedAt, null);
  assert.equal(hub.updatedAt, "2026-07-13");
});

test("records credible competing-page review fields with approved vocabulary", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const [review] = registry.tags.find(({ slug }) => slug === "fha-loans").competingPageReview.routes;

  assert.deepEqual(Object.keys(review).sort(), [
    "action", "audience", "borrowerQuestion", "disposition", "entity", "intent", "rationale", "relationship", "route", "substantiveCoverage",
  ]);
  assert.ok(["DIRECT", "NEAR", "SUPPORTING"].includes(review.relationship));
  assert.ok(["KEEP DISTINCT", "DIFFERENTIATE", "MERGE", "CANONICALIZE", "REDIRECT", "DO NOT CREATE"].includes(review.disposition));
  assert.notEqual(review.rationale, "");
});

test("rejects one-character filler in every competing-page semantic field", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const semanticFields = [
    "borrowerQuestion",
    "intent",
    "audience",
    "entity",
    "substantiveCoverage",
    "action",
    "rationale",
  ];

  for (const field of semanticFields) {
    const invalid = structuredClone(registry);
    invalid.tags.find(({ slug }) => slug === "fha-loans").competingPageReview.routes[0][field] = "x";
    assert.throws(
      () => validateTagRegistry(invalid),
      /meaningful competing-page review/i,
      `${field} must reject one-character filler`,
    );
  }
});

test("rejects length-compliant repeated-word filler in every competing-page semantic field", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const tag = registry.tags.find(({ slug }) => slug === "fha-loans");
  const review = tag.competingPageReview.routes[0];
  const repeatedFillerByField = {
    borrowerQuestion: `${"mortgage ".repeat(6).trim()}?`,
    intent: "understand understand understand",
    audience: "borrower borrower borrower",
    entity: "mortgage mortgage mortgage",
    substantiveCoverage: "guide guide guide",
    action: "review review review",
    rationale: `${review.entity} ${tag.displayName} ${"mortgage ".repeat(20).trim()}`,
  };

  for (const [field, filler] of Object.entries(repeatedFillerByField)) {
    const invalid = structuredClone(registry);
    invalid.tags.find(({ id }) => id === tag.id).competingPageReview.routes[0][field] = filler;
    assert.throws(
      () => validateTagRegistry(invalid),
      /meaningful competing-page review/i,
      `${field} must reject repeated-word filler`,
    );
  }
});

test("reviews canonical location pages as distinct competitor candidates", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const expected = [
    ["tag-state-florida", "/locations/florida"],
    ["tag-city-tampa-florida", "/locations/florida/tampa"],
  ];

  for (const [tagId, locationRoute] of expected) {
    const tag = registry.tags.find(({ id }) => id === tagId);
    const review = tag.competingPageReview.routes.find(({ route }) => route === locationRoute);
    assert.ok(review, `${tagId} must review ${locationRoute}`);
    assert.ok(["DIRECT", "NEAR", "SUPPORTING"].includes(review.relationship));
    assert.equal(review.disposition, "KEEP DISTINCT");
    assert.ok(!tag.sourceRoutes.includes(locationRoute), `${locationRoute} is a competitor, not assignment provenance`);
  }
});

test("validator joins assignments to source provenance and required review coverage", () => {
  const { registry } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const assignment = registry.assignments.find(({ route }) => route === "/learning-center/fha-loan-basics");
  const tagId = assignment.primaryTagIds[0];

  const missingSource = structuredClone(registry);
  const sourceTag = missingSource.tags.find(({ id }) => id === tagId);
  sourceTag.sourceRoutes = sourceTag.sourceRoutes.filter((route) => route !== assignment.route);
  assert.throws(() => validateTagRegistry(missingSource), /assignment provenance/i);

  const missingReview = structuredClone(registry);
  const reviewTag = missingReview.tags.find(({ id }) => id === tagId);
  reviewTag.competingPageReview.routes = reviewTag.competingPageReview.routes.filter(({ route }) => route !== assignment.route);
  assert.throws(() => validateTagRegistry(missingReview), /assigned route.*review/i);

  const extraCompetitor = structuredClone(registry);
  const competitorTag = extraCompetitor.tags.find(({ id }) => id === tagId);
  competitorTag.competingPageReview.routes.push({
    ...competitorTag.competingPageReview.routes[0],
    route: "/locations/florida",
    relationship: "NEAR",
    rationale: `${competitorTag.competingPageReview.routes[0].entity} remains a distinct reviewed entity; ${competitorTag.displayName} organizes borrower resources while the Florida route provides location-specific mortgage context.`,
  });
  assert.doesNotThrow(() => validateTagRegistry(extraCompetitor));
});

test("keeps lifecycle dates stable across routine later-date regeneration", () => {
  const initial = buildTaggedContentSearch(fixtureInputs, { reviewedAt: "2026-07-14" });
  const routineLaterRun = buildTaggedContentSearch(fixtureInputs, {
    existingRegistry: initial.registry,
    generatedAt: "2030-01-01",
  });

  assert.deepEqual(routineLaterRun.registry, initial.registry);
  assert.deepEqual(routineLaterRun.publicTagRegistry, initial.publicTagRegistry);
  assert.deepEqual(routineLaterRun.searchIndex, initial.searchIndex);

  const explicitReview = buildTaggedContentSearch(fixtureInputs, {
    existingRegistry: initial.registry,
    reviewedAt: "2026-08-01",
    generatedAt: "2030-01-01",
  });
  for (const tag of explicitReview.registry.tags) {
    assert.equal(tag.createdAt, "2026-07-14");
    assert.equal(tag.reviewedAt, "2026-08-01");
    assert.equal(tag.updatedAt, "2026-08-01");
  }

  const routineRunAfterExplicitReview = buildTaggedContentSearch(fixtureInputs, {
    existingRegistry: explicitReview.registry,
    generatedAt: "2031-01-01",
  });
  assert.equal(routineRunAfterExplicitReview.registry.updatedAt, "2026-08-01");
  assert.equal(routineRunAfterExplicitReview.publicTagRegistry.updatedAt, "2026-08-01");
  assert.equal(routineRunAfterExplicitReview.searchIndex.updatedAt, "2026-08-01");
  for (const tag of routineRunAfterExplicitReview.registry.tags) {
    assert.equal(tag.createdAt, "2026-07-14");
    assert.equal(tag.reviewedAt, "2026-08-01");
    assert.equal(tag.updatedAt, "2026-08-01");
  }
});

test("preserves registered redirect history across routine regeneration", () => {
  const initial = buildTaggedContentSearch(fixtureInputs, { reviewedAt: "2026-07-14" });
  const existingRegistry = structuredClone(initial.registry);
  const existingTag = existingRegistry.tags.find(({ slug }) => slug === "fha-loans");
  existingTag.slug = "fha-mortgages";
  existingTag.canonicalRoute = "/learning-center/tags/fha-mortgages";
  existingTag.redirectSlugs = ["fha-home-loans"];

  const regenerated = buildTaggedContentSearch(fixtureInputs, { existingRegistry });
  const canonicalTag = regenerated.registry.tags.find(({ slug }) => slug === "fha-loans");
  const publicTag = regenerated.publicTagRegistry.tags.find(({ slug }) => slug === "fha-loans");

  assert.deepEqual(canonicalTag.redirectSlugs, ["fha-home-loans", "fha-mortgages"]);
  assert.deepEqual(publicTag.redirectSlugs, canonicalTag.redirectSlugs);
});

test("reuses an automatic tag identity when its borrower-facing name changes", () => {
  const initial = buildTaggedContentSearch(fixtureInputs, { reviewedAt: "2026-07-14" });
  const renamedInputs = structuredClone(fixtureInputs);
  renamedInputs.productionSeed.products[0].name = "FHA Home Loans";
  renamedInputs.editorialContent.topicHubs[0].name = "FHA Home Loans";
  renamedInputs.editorialContent.articles[0].title = "FHA Home Loans for first-time buyers";

  const regenerated = buildTaggedContentSearch(renamedInputs, {
    existingRegistry: initial.registry,
    reviewedAt: "2026-08-01",
  });
  const renamedTag = regenerated.registry.tags.find(({ displayName }) => displayName === "FHA Home Loans");

  assert.ok(renamedTag);
  assert.equal(renamedTag.id, "tag-loan-program-fha-loans");
  assert.equal(renamedTag.slug, "fha-home-loans");
  assert.equal(renamedTag.createdAt, "2026-07-14");
  assert.deepEqual(renamedTag.redirectSlugs, ["fha-loans"]);
  assert.ok(!regenerated.registry.tags.some(({ id }) => id === "tag-loan-program-fha-home-loans"));
  assert.ok(regenerated.registry.assignments
    .filter(({ route }) => [
      "/learning-center/fha-loan-basics",
      "/learning-center/fha-loans",
      "/loan-options/fha-loans",
    ].includes(route))
    .every(({ primaryTagIds, additionalTagIds }) => [...primaryTagIds, ...additionalTagIds].includes(renamedTag.id)));
});

test("borrower-goal descriptions are specific, grammatical, and validator-enforced", () => {
  const { registry } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const goals = registry.tags.filter(({ type }) => type === "borrower-goal");
  const highCost = goals.find(({ id }) => id === "tag-borrower-goal-high-cost-home-financing");

  assert.equal(
    highCost.description,
    "Explore guidance for financing a higher-priced home, including loan-limit context, cost planning, and questions to compare with a lender.",
  );
  assert.ok(goals.every(({ description }) => !/support borrowers planning to/i.test(description)));

  const invalid = structuredClone(registry);
  invalid.tags.find(({ id }) => id === highCost.id).description = "Explore mortgage resources that support borrowers planning to high-cost home financing.";
  assert.throws(() => validateTagRegistry(invalid), /unhelpful public copy/i);
});

test("rejects duplicate canonical record IDs and routes", () => {
  const duplicateIdInputs = structuredClone(fixtureInputs);
  duplicateIdInputs.editorialContent.articles.push({ ...duplicateIdInputs.editorialContent.articles[0], route: "/learning-center/duplicate-fha" });
  assert.throws(() => buildTaggedContentSearch(duplicateIdInputs, { updatedAt: "2026-07-14" }), /duplicate canonical record ID/i);

  const duplicateRouteInputs = structuredClone(fixtureInputs);
  duplicateRouteInputs.editorialContent.articles.push({ ...duplicateRouteInputs.editorialContent.articles[0], id: "article-other", route: duplicateRouteInputs.editorialContent.articles[0].route });
  assert.throws(() => buildTaggedContentSearch(duplicateRouteInputs, { updatedAt: "2026-07-14" }), /duplicate canonical record route/i);
});

test("builds a browser-safe public registry projection within corpus payload budgets", () => {
  const { registry, publicTagRegistry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const publicRegistry = buildPublicTagRegistry(registry);

  assert.deepEqual(publicTagRegistry, publicRegistry);
  validatePublicTagRegistry(publicRegistry);
  assert.ok(publicRegistry.tags.every((tag) => !Object.hasOwn(tag, "sourceRoutes") && !Object.hasOwn(tag, "competingPageReview")));
  assert.ok(!JSON.stringify(publicRegistry).match(/competingPageReview|sourceRoutes|KEEP DISTINCT|borrowerQuestion/));
  assert.ok(Buffer.byteLength(JSON.stringify(publicRegistry)) < 1_500_000);
  assert.ok(Buffer.byteLength(JSON.stringify(searchIndex)) < 4_000_000);
  assert.deepEqual(Object.keys(searchIndex.records[0]).sort(), [
    "author", "canonicalOrder", "family", "id", "image", "locationIds", "preview", "primaryTagIds", "productIds", "publishedAt", "route", "tagIds", "title", "updatedAt",
  ]);
  assert.deepEqual(Object.keys(publicRegistry.tags[0]).sort(), [
    "canonicalRoute", "description", "displayName", "id", "redirectSlugs", "relatedTagIds", "reviewedAt", "slug", "type", "updatedAt",
  ]);
});

test("matches short program names as complete title tokens", () => {
  const inputs = structuredClone(fixtureInputs);
  inputs.productionSeed.products.push({ id: "product-va", name: "VA Loans", route: "/loan-options/va-loans", borrowerGoal: "Buy a home" });
  inputs.editorialContent.articles.push({
    id: "article-nevada-values", title: "Home values in Nevada", route: "/learning-center/nevada-home-values",
    summary: "Nevada home values can frame a market question without determining a specific property value.",
    publishedAt: "2026-07-10", updatedAt: "2026-07-10",
  });
  const { searchIndex } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const record = searchIndex.records.find(({ id }) => id === "article-nevada-values");

  assert.ok(record.tagIds.includes("tag-market-topic-home-values"));
  assert.ok(!record.tagIds.includes("tag-loan-program-va-loans"));
});

test("maps every local-news topic through the controlled topic registry before relationship products", () => {
  const inputs = readCanonicalInputs();
  const { registry, searchIndex } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const sourceById = new Map(inputs.locationNewsIndex.articles.map((article) => [article.id, article]));
  const tagById = new Map(registry.tags.map((tag) => [tag.id, tag]));
  const expectedTopicIds = [
    "affordability", "borrower-planning", "conventional", "employment", "fha", "home-price-index", "home-values", "housing-supply", "jumbo", "labor-market", "loan-limits", "owner-costs", "rent", "state-counties", "state-housing", "state-market", "tenure",
  ];

  assert.deepEqual(Object.keys(LOCATION_NEWS_TOPIC_TAGS).sort(), expectedTopicIds);
  for (const record of searchIndex.records.filter(({ family }) => family === "local-market-news")) {
    const source = sourceById.get(record.id);
    const mappedTopicIds = source.topicIds.map((topicId) => LOCATION_NEWS_TOPIC_TAGS[topicId].id);
    assert.ok(record.primaryTagIds.some((id) => ["city", "state"].includes(tagById.get(id).type)), `${record.id} lacks a primary location tag`);
    assert.ok(record.primaryTagIds.some((id) => mappedTopicIds.includes(id)), `${record.id} lacks a primary controlled topic tag`);
    assert.ok(record.primaryTagIds.filter((id) => tagById.get(id).type === "loan-program").every((id) => mappedTopicIds.includes(id)), `${record.id} promotes a relationship-only loan program`);
  }
});

test("local-news program tags require controlled topic or explicit title evidence", () => {
  const inputs = readCanonicalInputs();
  const { searchIndex } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const localRecords = searchIndex.records.filter(({ family }) => family === "local-market-news");
  const actualFhaIds = localRecords
    .filter(({ tagIds }) => tagIds.includes("tag-loan-program-fha-loans"))
    .map(({ id }) => id)
    .sort();
  const expectedFhaIds = inputs.locationNewsIndex.articles
    .filter((article) => (article.topicIds || []).includes("fha") || /(?:^|[^a-z0-9])fha[^a-z0-9]+loans?(?=$|[^a-z0-9])/i.test(article.title || ""))
    .map(({ id }) => id)
    .sort();

  assert.deepEqual(actualFhaIds, expectedFhaIds);
  assert.ok(actualFhaIds.length < localRecords.length / 2, "FHA eligibility must remain narrower than generic local-market coverage");
  assert.ok(localRecords
    .filter(({ title }) => /labor market|employment evidence/i.test(title))
    .every(({ tagIds }) => !tagIds.includes("tag-loan-program-fha-loans")));
});

test("canonical public search records contain borrower-ready text without serialization sentinels", () => {
  const inputs = readCanonicalInputs();
  const { searchIndex } = buildTaggedContentSearch(inputs, { updatedAt: "2026-07-14" });
  const findings = searchIndex.records.filter(({ title, preview }) => /\b(?:undefined|null)\b/i.test(`${title} ${preview}`));
  const calculatorRecords = searchIndex.records.filter(({ family }) => family === "calculators");

  assert.deepEqual(findings, []);
  assert.equal(calculatorRecords.length, inputs.productionSeed.calculators.length);
  assert.ok(calculatorRecords.every(({ preview }) => preview.split(/\s+/).length >= 12));
});

test("excludes team navigation labels from taxonomy and keeps non-direct reviews distinct", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  assert.ok(!registry.tags.some(({ displayName }) => displayName === "Mortgage Guidance"));
  assert.ok(!searchIndex.records.some(({ id }) => id === "blog-editorial-team"));
  const nonDirect = registry.tags.flatMap((tag) => tag.competingPageReview.routes).filter(({ relationship }) => relationship !== "DIRECT");
  assert.ok(nonDirect.length > 0);
  assert.ok(nonDirect.every(({ disposition, rationale }) => disposition === "KEEP DISTINCT" && rationale.length > 0));
});

test("caps broad semantic relations without turning program or topic tags into location directories", () => {
  const { registry, publicTagRegistry } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const tagById = new Map(registry.tags.map((tag) => [tag.id, tag]));
  const publicTagById = new Map(publicTagRegistry.tags.map((tag) => [tag.id, tag]));
  const broadTags = registry.tags.filter((tag) => ["loan-program", "mortgage-topic"].includes(tag.type) && tag.sourceRoutes.length >= 100);

  assert.ok(broadTags.length > 0);
  for (const tag of broadTags) {
    const locationRelations = tag.relatedTagIds.filter((id) => ["city", "state"].includes(tagById.get(id)?.type));
    const publicTag = publicTagById.get(tag.id);
    assert.ok(tag.relatedTagIds.length <= 12, `${tag.id} has ${tag.relatedTagIds.length} canonical relations`);
    assert.deepEqual(locationRelations, [], `${tag.id} must not become a location directory`);
    assert.ok(publicTag.relatedTagIds.length <= 8);
    assert.ok(publicTag.relatedTagIds.every((id) => !["city", "state"].includes(tagById.get(id)?.type)));
  }

  const fha = tagById.get("tag-loan-program-fha-loans");
  const fhaTypes = new Set(fha.relatedTagIds.map((id) => tagById.get(id)?.type));
  for (const type of ["loan-program", "borrower-goal", "market-topic", "mortgage-topic"]) {
    assert.ok(fhaTypes.has(type), `FHA relations must retain a useful ${type}`);
  }
});

test("ranks public related tags by semantic primary co-occurrence deterministically", () => {
  const city = { id: "tag-city-austin-texas", displayName: "Austin, Texas", type: "city", relatedTagIds: ["tag-loan-program-fha-loans", "tag-market-topic-affordability", "tag-market-topic-home-values"] };
  const registry = {
    tags: [
      city,
      { id: "tag-loan-program-fha-loans", displayName: "FHA Loans", type: "loan-program", relatedTagIds: [city.id] },
      { id: "tag-market-topic-affordability", displayName: "Affordability", type: "market-topic", relatedTagIds: [city.id] },
      { id: "tag-market-topic-home-values", displayName: "Home Values", type: "market-topic", relatedTagIds: [city.id] },
    ],
    assignments: [
      { route: "/learning-center/austin-values", primaryTagIds: [city.id, "tag-market-topic-home-values"], additionalTagIds: ["tag-loan-program-fha-loans"] },
      { route: "/learning-center/austin-affordability", primaryTagIds: [city.id, "tag-market-topic-affordability"], additionalTagIds: ["tag-loan-program-fha-loans"] },
    ],
  };

  const expected = ["tag-market-topic-affordability", "tag-market-topic-home-values", "tag-loan-program-fha-loans"];
  assert.deepEqual(rankPublicRelatedTagIds(registry, city), expected);
  assert.deepEqual(rankPublicRelatedTagIds(registry, city), expected);
});

test("prioritizes Austin's own controlled market subjects in public related links", () => {
  const { publicTagRegistry } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const austin = publicTagRegistry.tags.find(({ id }) => id === "tag-city-austin-texas");

  assert.ok(austin.relatedTagIds.includes("tag-market-topic-home-values"));
  assert.ok(austin.relatedTagIds.includes("tag-mortgage-topic-affordability"));
  assert.ok(austin.relatedTagIds.includes("tag-market-topic-housing-supply"));
  assert.ok(!austin.relatedTagIds.includes("tag-loan-program-home-purchase-loans"));
  assert.ok(!austin.relatedTagIds.includes("tag-loan-program-refinance"));
  assert.ok(austin.relatedTagIds.length <= 8);
});

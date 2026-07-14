import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildPublicTagRegistry,
  buildTaggedContentSearch,
  LOCATION_NEWS_TOPIC_TAGS,
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
  assert.deepEqual(fha.sourceRoutes, ["/learning-center/fha-loan-basics", "/learning-center/fha-loans", "/learning-center/market-news/tampa-home-values", "/loan-options/fha-loans"]);
  assert.equal(fha.canonicalRoute, "/learning-center/tags/fha-loans");
  assert.equal(fha.updatedAt, "2026-07-14");
  assert.deepEqual(fha.redirectSlugs, []);
  assert.ok(fha.competingPageReview.routes.every((review) => ["KEEP DISTINCT", "DIFFERENTIATE"].includes(review.disposition)));
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, type: "internal" }] }), /approved type/i);
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, displayName: "Demo FHA Loans" }] }), /forbidden public/i);
});

test("rejects search records with unknown tags or full body fields", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const [record] = searchIndex.records;

  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, tagIds: ["tag-missing"] }] }, registry), /unknown tag/i);
  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, body: "Not compact" }] }, registry), /full article body/i);
  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, debug: true }] }, registry), /unexpected key/i);
});

function readCanonicalInputs() {
  return {
    productionSeed: JSON.parse(fs.readFileSync(new URL("./production-seed.json", import.meta.url), "utf8")),
    editorialContent: JSON.parse(fs.readFileSync(new URL("./editorial-content.json", import.meta.url), "utf8")),
    locationNewsIndex: JSON.parse(fs.readFileSync(new URL("./location-news-index.json", import.meta.url), "utf8")),
    productCopy: JSON.parse(fs.readFileSync(new URL("./product-copy.json", import.meta.url), "utf8")),
  };
}

test("prioritizes a city home-values story by location and subject instead of generic product goals", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  const record = searchIndex.records.find(({ id }) => id === "news-austin-tx-affordability-home-values");

  assert.ok(record.primaryTagIds.includes("tag-city-austin-texas"));
  assert.ok(record.primaryTagIds.includes("tag-market-topic-home-values"));
  assert.ok(!record.primaryTagIds.includes("tag-borrower-goal-buy-a-home"));
  assert.ok(!record.primaryTagIds.includes("tag-borrower-goal-refinance-a-mortgage"));
  assert.ok(record.tagIds.includes("tag-borrower-goal-buy-a-home"));
  assert.ok(record.tagIds.includes("tag-borrower-goal-refinance-a-mortgage"));
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

test("excludes team navigation labels from taxonomy and keeps non-direct reviews distinct", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(readCanonicalInputs(), { updatedAt: "2026-07-14" });
  assert.ok(!registry.tags.some(({ displayName }) => displayName === "Mortgage Guidance"));
  assert.ok(!searchIndex.records.some(({ id }) => id === "blog-editorial-team"));
  const nonDirect = registry.tags.flatMap((tag) => tag.competingPageReview.routes).filter(({ relationship }) => relationship !== "DIRECT");
  assert.ok(nonDirect.length > 0);
  assert.ok(nonDirect.every(({ disposition, rationale }) => disposition === "KEEP DISTINCT" && rationale.length > 0));
});

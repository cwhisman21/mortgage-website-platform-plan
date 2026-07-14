import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTaggedContentSearch,
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
  assert.deepEqual(fha.competingPageReview.routes.filter(({ route }) => route !== "/learning-center/market-news/tampa-home-values"), [
    { route: "/learning-center/fha-loan-basics", relationship: "DIRECT", disposition: "KEEP_DISTINCT" },
    { route: "/learning-center/fha-loans", relationship: "DIRECT", disposition: "KEEP_DISTINCT" },
    { route: "/loan-options/fha-loans", relationship: "DIRECT", disposition: "KEEP_DISTINCT" },
  ]);
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, type: "internal" }] }), /approved type/i);
  assert.throws(() => validateTagRegistry({ ...registry, tags: [{ ...fha, displayName: "Demo FHA Loans" }] }), /forbidden public/i);
});

test("rejects search records with unknown tags or full body fields", () => {
  const { registry, searchIndex } = buildTaggedContentSearch(fixtureInputs, { updatedAt: "2026-07-14" });
  const [record] = searchIndex.records;

  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, tagIds: ["tag-missing"] }] }, registry), /unknown tag/i);
  assert.throws(() => validateSearchIndex({ ...searchIndex, records: [{ ...record, body: "Not compact" }] }, registry), /full article body/i);
});

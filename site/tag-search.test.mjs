import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeTagRegistry,
  tagForId,
  tagForSlug,
  tagRoute,
  tagsForRoute,
} from "./tag-registry.mjs";
import {
  compileTagExpression,
  groupSearchResults,
  recordMatchesExpression,
  searchRecords,
  sortSearchResults,
  suggestTags,
} from "./tag-query.mjs";
import {
  parseTagSearchState,
  sanitizeTagSearchState,
  serializeTagSearchState,
} from "./tag-state.mjs";

const tags = [
  {
    id: "fha",
    displayName: "FHA Loans",
    slug: "fha-loans",
    redirectSlugs: ["fha"],
    canonicalRoute: "/learning-center/tags/fha-loans",
  },
  {
    id: "dpa",
    displayName: "Down Payment Assistance",
    slug: "down-payment-assistance",
    redirectSlugs: [],
    canonicalRoute: "/learning-center/tags/down-payment-assistance",
  },
  {
    id: "va",
    displayName: "VA Loans",
    slug: "va-loans",
    redirectSlugs: [],
    canonicalRoute: "/learning-center/tags/va-loans",
  },
  {
    id: "florida",
    displayName: "Florida",
    slug: "florida",
    redirectSlugs: ["the-sunshine-state"],
    canonicalRoute: "/learning-center/tags/florida",
  },
];

const registry = normalizeTagRegistry({
  version: 1,
  updatedAt: "2026-07-14",
  tags,
  assignments: [
    ["/guides/fha", [0], [1, 3]],
    ["/guides/va", [2], []],
  ],
});

test("normalizes compact browser assignments and resolves canonical tag routes", () => {
  assert.deepEqual(tagsForRoute(registry, "/guides/fha"), {
    primaryTags: [tags[0]],
    additionalTags: [tags[1], tags[3]],
  });
  assert.equal(tagForId(registry, "dpa"), tags[1]);
  assert.equal(tagForSlug(registry, "fha-loans"), tags[0]);
  assert.equal(tagForSlug(registry, "FHA"), tags[0]);
  assert.equal(tagForSlug(registry, "the-sunshine-state"), tags[3]);
  assert.equal(tagRoute(tags[0]), "/learning-center/tags/fha-loans");
});

test("normalizes canonical object assignments for build and static callers", () => {
  const canonicalRegistry = normalizeTagRegistry({
    tags,
    assignments: [{
      route: "/guides/fha",
      primaryTagIds: ["fha"],
      additionalTagIds: ["dpa", "florida"],
    }],
  });

  assert.deepEqual(tagsForRoute(canonicalRegistry, "/guides/fha"), {
    primaryTags: [tags[0]],
    additionalTags: [tags[1], tags[3]],
  });
});

test("normalizes the complete public registry artifact and resolves representative routes", () => {
  const raw = JSON.parse(readFileSync(new URL("../mock-data/public-tag-registry.json", import.meta.url), "utf8"));
  const publicRegistry = normalizeTagRegistry(raw);

  assert.equal(publicRegistry.tags.length, 824);
  assert.equal(publicRegistry.assignments.length, 3197);
  assert.deepEqual(
    tagsForRoute(publicRegistry, "/buy").primaryTags.map(({ id }) => id),
    ["tag-loan-program-home-purchase-loans", "tag-borrower-goal-buy-a-home"],
  );
});

test("suggestions use only exact display-name prefixes", () => {
  assert.deepEqual(suggestTags(tags, "do", []), [tags[1]]);
  assert.deepEqual(suggestTags(tags, "assistance", []), []);
  assert.deepEqual(suggestTags(tags, "dwon", []), []);
  assert.deepEqual(suggestTags(tags, "va", new Set(["va"])), []);
});

test("AND binds before OR", () => {
  const expression = compileTagExpression(["fha", "dpa", "va"], ["AND", "OR"]);
  assert.deepEqual(expression, [["fha", "dpa"], ["va"]]);
  assert.equal(recordMatchesExpression({ tagIds: ["fha", "dpa"] }, expression), true);
  assert.equal(recordMatchesExpression({ tagIds: ["fha"] }, expression), false);
  assert.equal(recordMatchesExpression({ tagIds: ["va"] }, expression), true);
});

test("state recovery repairs connector gaps and defaults malformed connectors to AND", () => {
  const repaired = sanitizeTagSearchState({
    tagIds: ["fha", "missing", "va"],
    operators: ["OR", "invalid"],
    query: "  closing costs  ",
    sortBySection: { articles: "newest", calculators: "invalid" },
    carouselPositions: { articles: 3, calculators: -1 },
  }, registry);

  assert.deepEqual(repaired, {
    tagIds: ["fha", "va"],
    operators: ["AND"],
    query: "closing costs",
    sortBySection: { articles: "newest" },
    carouselPositions: { articles: 3 },
    ignoredTagIds: ["missing"],
  });
  assert.deepEqual(
    sanitizeTagSearchState({ tagIds: ["fha", "dpa", "va"], operators: ["OR"] }, registry).operators,
    ["OR", "AND"],
  );
  assert.deepEqual(
    sanitizeTagSearchState({ tagIds: ["fha", "va", "missing"], operators: ["OR", "AND"] }, registry).operators,
    ["OR"],
  );
});

test("query state round-trips supported non-default values and keeps valid tags", () => {
  const state = {
    tagIds: ["fha", "dpa", "va"],
    operators: ["AND", "OR"],
    query: "closing costs",
    sortBySection: { articles: "newest", calculators: "relevance" },
    carouselPositions: { articles: 4, calculators: 0 },
    ignoredTagIds: ["not-serialized"],
  };
  const search = serializeTagSearchState(state);

  assert.equal(search, "?tag=fha&op=AND&tag=dpa&op=OR&tag=va&q=closing+costs&sort.articles=newest&pos.articles=4");
  assert.deepEqual(parseTagSearchState(search, registry), {
    tagIds: ["fha", "dpa", "va"],
    operators: ["AND", "OR"],
    query: "closing costs",
    sortBySection: { articles: "newest" },
    carouselPositions: { articles: 4 },
    ignoredTagIds: [],
  });
  assert.deepEqual(parseTagSearchState("?tag=fha&tag=unknown&op=OR", registry), {
    tagIds: ["fha"],
    operators: [],
    query: "",
    sortBySection: {},
    carouselPositions: {},
    ignoredTagIds: ["unknown"],
  });
});

test("tag expressions determine eligibility before free-text relevance", () => {
  const records = [
    {
      id: "tag-match",
      tagIds: ["fha"],
      title: "Purchase planning",
      preview: "Payment steps for a home purchase.",
      canonicalOrder: 1,
      searchText: "closing costs should not be used",
    },
    {
      id: "text-only",
      tagIds: ["va"],
      title: "Closing costs explained",
      preview: "Ways to plan closing costs.",
      canonicalOrder: 0,
    },
  ];
  const results = searchRecords(records, { tagIds: ["fha"], query: "closing costs" }, registry);

  assert.deepEqual(results.map(({ id, relevance }) => [id, relevance]), [["tag-match", 0]]);
});

test("free-text ranking prefers title matches and breaks equal scores by canonical order", () => {
  const records = [
    {
      id: "preview-match",
      tagIds: [],
      title: "Mortgage guide",
      preview: "Understand FHA loans.",
      canonicalOrder: 0,
    },
    {
      id: "later-title-match",
      tagIds: [],
      title: "FHA loans explained",
      preview: "Basics.",
      canonicalOrder: 4,
    },
    {
      id: "earlier-title-match",
      tagIds: [],
      title: "FHA loans for buyers",
      preview: "Basics.",
      canonicalOrder: 2,
    },
  ];

  assert.deepEqual(
    searchRecords(records, { query: "fha loans" }, registry).map(({ id }) => id),
    ["earlier-title-match", "later-title-match", "preview-match"],
  );
});

test("result grouping follows the fixed content-family order and skips empty families", () => {
  const grouped = groupSearchResults([
    { id: "calculator", family: "calculators" },
    { id: "article", family: "articles" },
    { id: "news", family: "local-market-news" },
  ]);

  assert.deepEqual(grouped.map(({ family }) => family), ["articles", "local-market-news", "calculators"]);
  assert.deepEqual(grouped[0].records.map(({ id }) => id), ["article"]);
});

test("Newest sorts dated records first and keeps undated records deterministically last", () => {
  const records = [
    { id: "undated", canonicalOrder: 0, publishedAt: null, updatedAt: null, relevance: 99 },
    { id: "materially-updated", canonicalOrder: 2, publishedAt: "2025-12-01", updatedAt: "2026-05-01", relevance: 1 },
    { id: "recently-published", canonicalOrder: 3, publishedAt: "2026-04-01", updatedAt: null, relevance: 0 },
    { id: "same-date", canonicalOrder: 1, publishedAt: "2026-01-01", updatedAt: null, relevance: 10 },
  ];

  assert.deepEqual(sortSearchResults(records, "newest").map(({ id }) => id), [
    "materially-updated",
    "recently-published",
    "same-date",
    "undated",
  ]);
});

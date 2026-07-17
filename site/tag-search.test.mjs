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
import {
  openTagResultsModal,
  renderResultSections,
  renderTagSearchPage,
  setTagResultsScrollLock,
  staticFallbackForState,
  wireTagSearch,
} from "./tag-search-ui.mjs";

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
  assert.equal(publicRegistry.assignments.length, 3198);
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

const searchUiRecords = [
  ...Array.from({ length: 22 }, (_, index) => ({
    id: `article-${index + 1}`,
    route: `/learning-center/article-${index + 1}`,
    family: "articles",
    title: `Article ${index + 1}`,
    preview: "A borrower-facing article preview.",
    image: index === 0 ? "internal-image-id" : null,
    author: index === 0 ? "contributor-maya-brooks" : null,
    publishedAt: index === 0 ? "2026-07-10" : null,
    updatedAt: null,
    tagIds: index === 0 ? ["fha", "dpa"] : ["fha"],
    primaryTagIds: ["fha"],
    locationIds: index === 0 ? ["city-austin-tx"] : [],
    productIds: [],
    canonicalOrder: index,
  })),
  {
    id: "topic-guide",
    route: "/learning-center/buying-a-home",
    family: "topic-guides",
    title: "Buying a Home",
    preview: "Plan a home purchase.",
    tagIds: ["dpa"],
    primaryTagIds: ["dpa"],
    locationIds: [],
    productIds: [],
    canonicalOrder: 30,
  },
  {
    id: "market-news",
    route: "/learning-center/market-news/austin",
    family: "local-market-news",
    title: "Austin market update",
    preview: "Review local housing context.",
    tagIds: ["fha"],
    primaryTagIds: ["fha"],
    locationIds: ["city-austin-tx"],
    productIds: [],
    canonicalOrder: 31,
  },
  {
    id: "product-guide",
    route: "/loan-options/fha-loans",
    family: "product-guides",
    title: "FHA Loans",
    preview: "Compare an FHA loan path.",
    tagIds: ["fha"],
    primaryTagIds: ["fha"],
    locationIds: [],
    productIds: ["product-fha"],
    canonicalOrder: 32,
  },
  {
    id: "calculator",
    route: "/calculators/affordability",
    family: "calculators",
    title: "Affordability Calculator",
    preview: "Explore a planning scenario.",
    tagIds: ["fha"],
    primaryTagIds: ["fha"],
    locationIds: [],
    productIds: [],
    canonicalOrder: 33,
  },
];

const searchUiContext = {
  registry,
  state: {
    tagIds: ["fha", "dpa"],
    operators: ["OR"],
    query: "closing costs",
    sortBySection: {},
    carouselPositions: { articles: 2 },
    ignoredTagIds: ["unavailable-topic"],
  },
  matchedTagIds: ["dpa"],
  routeHref: (href) => `/spa${href}`,
  resolveAuthor: (id) => id === "contributor-maya-brooks" ? "Maya Brooks" : "",
  resolveLocation: (id) => id === "city-austin-tx" ? "Austin, TX" : "",
};

test("renders an accessible tagged-search combobox with removable tokens and named gap operators", () => {
  const html = renderTagSearchPage({
    registry,
    records: searchUiRecords,
    state: searchUiContext.state,
    ...searchUiContext,
  });

  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-autocomplete="list"/);
  assert.match(html, /aria-controls="tag-search-suggestions"/);
  assert.match(html, /id="tag-search-suggestions"[^>]*role="listbox"/);
  assert.match(html, /data-tag-token-remove="fha"[^>]*aria-label="Remove FHA Loans"/);
  assert.match(html, /data-tag-token-remove="dpa"[^>]*aria-label="Remove Down Payment Assistance"/);
  assert.match(html, /aria-label="Change the connector between FHA Loans and Down Payment Assistance"/);
  assert.match(html, /<option value="AND">AND<\/option>/);
  assert.match(html, /<option value="OR" selected>OR<\/option>/);
});

test("renders populated result families in fixed order, omits empty families, and caps carousels at 20 cards", () => {
  const groups = groupSearchResults(searchUiRecords.filter(({ family }) => family !== "topic-guides"));
  const html = renderResultSections(groups, searchUiContext);

  const headings = [
    "Articles and education",
    "Local market news",
    "Mortgage product guides",
    "Calculators and tools",
  ];
  headings.reduce((previousIndex, heading) => {
    const index = html.indexOf(heading);
    assert.ok(index > previousIndex, `${heading} is out of order`);
    return index;
  }, -1);
  assert.doesNotMatch(html, /Topic guides/);
  assert.equal((html.match(/class="tag-result-card/g) || []).length, 23);

  const articles = html.slice(
    html.indexOf('data-tag-result-family="articles"'),
    html.indexOf('data-tag-result-family="local-market-news"'),
  );
  assert.equal((articles.match(/class="tag-result-card/g) || []).length, 20);
  assert.match(articles, /22 results/);
  assert.match(articles, /data-tag-show-more="articles"/);
  assert.match(articles, /aria-label="Previous Articles and education results"/);
  assert.match(articles, /aria-label="Next Articles and education results"/);
  assert.match(articles, /data-carousel-position="2"/);
});

test("result sections preserve resolver hooks, put matched tags first, and hide internal IDs", () => {
  const html = renderResultSections(groupSearchResults([searchUiRecords[0]]), searchUiContext);

  assert.match(html, /Maya Brooks/);
  assert.match(html, /Austin, TX/);
  assert.doesNotMatch(html, /contributor-maya-brooks|city-austin-tx|internal-image-id/);
  assert.ok(
    html.indexOf("Matched topic: Down Payment Assistance") < html.indexOf(">FHA Loans<"),
    "matched tags must render before quieter related tags",
  );
});

test("renders the exact invalid-token and index-error borrower notices while retaining static fallback content", () => {
  const staticFallbackHtml = '<section id="static-tag-results"><a href="/learning-center/article-1">Article 1</a></section>';
  const html = renderTagSearchPage({
    registry,
    records: [],
    state: { ...searchUiContext.state, tagIds: ["fha"], operators: [] },
    staticFallbackHtml,
    staticFallbackTagId: "fha",
    loadError: new Error("network details must stay private"),
  });

  assert.match(html, /One search topic was unavailable, so we kept the rest of your search\./);
  assert.match(html, /Search tools are temporarily unavailable\. You can still open the resources below\./);
  assert.match(html, /id="static-tag-results"/);
  assert.doesNotMatch(html, /network details must stay private/);
});

test("scopes captured static results to the tag page that produced them", () => {
  const fallback = '<section class="static-tag-results">FHA resources</section>';

  assert.equal(staticFallbackForState(fallback, "fha", { tagIds: ["fha"] }), fallback);
  assert.equal(staticFallbackForState(fallback, "fha", { tagIds: ["va"] }), "");
  assert.equal(staticFallbackForState(fallback, "fha", { tagIds: ["fha", "dpa"] }), "");
});

test("renders a section-specific all-results modal with relevance and newest sorting", () => {
  const html = openTagResultsModal("articles", {
    ...searchUiContext,
    groups: groupSearchResults(searchUiRecords),
    document: null,
  });

  assert.equal(typeof html, "string");
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /data-tag-results-modal="articles"/);
  assert.match(html, /aria-label="Sort Articles and education results"/);
  assert.match(html, /<option value="relevance" selected>Relevance<\/option>/);
  assert.match(html, /<option value="newest">Newest<\/option>/);
  assert.match(html, /aria-label="Close Articles and education results"/);
  assert.equal((html.match(/class="tag-modal-result/g) || []).length, 22);
});

test("locks and restores both page scroll containers for the results modal", () => {
  const classes = {
    root: new Set(),
    body: new Set(),
  };
  const classList = (target) => ({
    add: (name) => classes[target].add(name),
    remove: (name) => classes[target].delete(name),
  });
  const document = {
    documentElement: { classList: classList("root") },
    body: { classList: classList("body") },
  };

  setTagResultsScrollLock(document, true);
  assert.deepEqual([...classes.root], ["tag-results-modal-open"]);
  assert.deepEqual([...classes.body], ["tag-results-modal-open"]);

  setTagResultsScrollLock(document, false);
  assert.equal(classes.root.size, 0);
  assert.equal(classes.body.size, 0);
});

test("exports the tagged-search interaction wire function", () => {
  assert.equal(typeof wireTagSearch, "function");
});

test("renders as a section for composition inside the shared page main", () => {
  const html = renderTagSearchPage({ registry, records: [], state: {} });
  assert.match(html, /^<section\b/);
  assert.doesNotMatch(html, /<main\b/);
});

test("renders a loading status without announcing a false empty result", () => {
  const html = renderTagSearchPage({ registry, records: [], state: {}, loading: true });
  assert.match(html, /data-tag-search-loading/);
  assert.match(html, /Loading mortgage resources/);
  assert.doesNotMatch(html, /No resources matched this search/);
});

function createWireHarness(inputValue = "") {
  const listeners = new Map();
  const attributes = new Map();
  const input = {
    value: inputValue,
    focusCount: 0,
    matches: (selector) => selector === "[data-tag-search-input]",
    closest: (selector) => selector === "[data-tag-search-input]" ? input : null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name),
    focus() {
      input.focusCount += 1;
    },
  };
  const suggestions = { hidden: true, innerHTML: "" };
  const root = {
    innerHTML: "",
    addEventListener(type, listener, capture = false) {
      listeners.set(`${type}:${capture}`, listener);
    },
    removeEventListener(type, listener, capture = false) {
      if (listeners.get(`${type}:${capture}`) === listener) listeners.delete(`${type}:${capture}`);
    },
    querySelector(selector) {
      if (selector === "[data-tag-search-input]") return input;
      if (selector === "[data-tag-search-suggestions]") return suggestions;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  return {
    root,
    input,
    suggestions,
    emit(type, target, properties = {}) {
      const event = {
        target,
        defaultPrevented: false,
        preventDefault() {
          event.defaultPrevented = true;
        },
        ...properties,
      };
      listeners.get(`${type}:true`)?.(event);
      listeners.get(`${type}:false`)?.(event);
      return event;
    },
  };
}

function closestTarget(selector, match, dataset = {}) {
  const target = {
    dataset,
    closest(candidate) {
      return candidate === selector ? target : null;
    },
  };
  return match ? target : { closest: () => null, dataset: {} };
}

test("wireTagSearch wraps ArrowUp to the final exact-prefix suggestion and selects it with Enter", () => {
  const harness = createWireHarness("f");
  const navigations = [];
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: {},
    navigate: (url, options) => navigations.push({ url, options }),
  });

  const arrowEvent = harness.emit("keydown", harness.input, { key: "ArrowUp" });
  assert.equal(arrowEvent.defaultPrevented, true);
  assert.equal(harness.input.getAttribute("aria-activedescendant"), "tag-search-suggestion-1");
  harness.emit("keydown", harness.input, { key: "Enter" });

  assert.deepEqual(controller.getState().tagIds, ["florida"]);
  assert.equal(navigations.at(-1).url, "/learning-center/search?tag=florida");
  controller.destroy();
});

test("wireTagSearch tokenizes only the active exact-prefix fragment and preserves surrounding query text", () => {
  const harness = createWireHarness("FHA closing costs");
  harness.input.selectionStart = 3;
  harness.input.selectionEnd = 3;
  const navigations = [];
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: {},
    navigate: (url, options) => navigations.push({ url, options }),
  });

  harness.emit("keydown", harness.input, { key: "ArrowDown" });
  harness.emit("keydown", harness.input, { key: "Enter" });

  assert.deepEqual(controller.getState().tagIds, ["fha"]);
  assert.equal(controller.getState().query, "closing costs");
  assert.equal(navigations.at(-1).url, "/learning-center/search?tag=fha&q=closing+costs");
  controller.destroy();
});

test("wireTagSearch repairs connectors after middle-token and Backspace removal", () => {
  const harness = createWireHarness("");
  const navigations = [];
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: {
      tagIds: ["fha", "dpa", "va"],
      operators: ["AND", "OR"],
    },
    navigate: (url) => navigations.push(url),
  });

  harness.emit("click", closestTarget("[data-tag-token-remove]", true, { tagTokenRemove: "dpa" }));
  assert.deepEqual(controller.getState().tagIds, ["fha", "va"]);
  assert.deepEqual(controller.getState().operators, ["OR"]);
  assert.equal(navigations.at(-1), "/learning-center/search?tag=fha&op=OR&tag=va");

  const backspaceEvent = harness.emit("keydown", harness.input, { key: "Backspace" });
  assert.equal(backspaceEvent.defaultPrevented, true);
  assert.deepEqual(controller.getState().tagIds, ["fha"]);
  assert.deepEqual(controller.getState().operators, []);
  controller.destroy();
});

test("wireTagSearch serializes native connector changes and free-text submissions", () => {
  const harness = createWireHarness("closing costs");
  const navigations = [];
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: { tagIds: ["fha", "dpa"], operators: ["AND"] },
    navigate: (url) => navigations.push(url),
  });
  const operator = closestTarget("[data-tag-operator-index]", true, { tagOperatorIndex: "0" });
  operator.value = "OR";
  harness.emit("change", operator);

  const form = {
    matches: (selector) => selector === "[data-tag-search-form]",
    querySelector: () => harness.input,
  };
  harness.emit("submit", form);

  assert.deepEqual(controller.getState().operators, ["OR"]);
  assert.equal(controller.getState().query, "closing costs");
  assert.equal(
    navigations.at(-1),
    "/learning-center/search?tag=fha&op=OR&tag=dpa&q=closing+costs",
  );
  controller.destroy();
});

test("wireTagSearch retains the matching static fallback after an index-error refresh", () => {
  const harness = createWireHarness("");
  const staticFallbackHtml = '<section id="static-tag-results">FHA resources remain available</section>';
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: { tagIds: ["fha"], operators: [] },
    staticFallbackHtml,
    staticFallbackTagId: "fha",
    loadError: new Error("index unavailable"),
    navigate: () => {},
  });
  const form = {
    matches: (selector) => selector === "[data-tag-search-form]",
    querySelector: () => harness.input,
  };

  harness.emit("submit", form);

  assert.match(harness.root.innerHTML, /id="static-tag-results"/);
  assert.match(harness.root.innerHTML, /FHA resources remain available/);
  controller.destroy();
});

test("wireTagSearch does not publish an unchanged carousel position during restoration", () => {
  const harness = createWireHarness("");
  const navigations = [];
  const timers = [];
  const track = {
    dataset: { family: "articles", carouselPosition: "0" },
    scrollLeft: 0,
    closest: (selector) => selector === "[data-tag-result-track]" ? track : null,
    querySelectorAll: () => [{ offsetLeft: 0 }, { offsetLeft: 340 }],
  };
  const controller = wireTagSearch(harness.root, {
    registry,
    records: [],
    state: { carouselPositions: {} },
    navigate: (url) => navigations.push(url),
    window: {
      setTimeout(callback) {
        timers.push(callback);
        return timers.length;
      },
      clearTimeout() {},
      matchMedia: () => ({ matches: false }),
    },
  });

  harness.emit("scroll", track);
  timers.forEach((callback) => callback());

  assert.deepEqual(navigations, []);
  assert.deepEqual(controller.getState().carouselPositions, {});
  controller.destroy();
});

# Tagged Content Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-only, progressively enhanced tag discovery and search system that connects Snap Mortgage articles, topic guides, local market news, mortgage product guides, and calculators through crawlable tag pages and an accessible Boolean search interface.

**Architecture:** A deterministic build module derives assignments from the existing canonical content sources and writes one controlled tag registry plus one compact search index. Focused browser-safe modules own registry lookup, Boolean query parsing, URL state, ranking, tag presentation, and search-result rendering; the existing SPA composes those modules while the static route generator emits useful no-JavaScript tag pages and metadata. Existing article, topic, location-news, product, calculator, navigation, CTA, and homepage behavior remains authoritative.

**Tech Stack:** Native JavaScript ES modules, Node.js built-in test runner, generated JSON artifacts, static HTML/CSS, History API, schema.org JSON-LD, existing Snap Mortgage route and rendering helpers.

## Global Constraints

- Do not modify root `index.html` or anything under `site/assets/slot-hero/`; the homepage hero is a paused work boundary.
- Do not deploy or publish without separate explicit authorization.
- Preserve the current dirty content corpus and unrelated concurrent edits; never reset, revert, overwrite, or stage unrelated files.
- Search only articles and education, topic guides, local market news, mortgage product guides, and calculators and tools.
- Exclude rates marketplace offers, loan officers, branches, account, authentication, CRM, prequalification routing, and other transactional content.
- Use one to three primary tags per indexed page and up to eight initially visible additional tags near Sources and Citations.
- Autocomplete suggests only case-insensitive prefixes of exact registered tag display names; no aliases, fuzzy matching, typo correction, or content-title suggestions.
- Serialize stable tag IDs, not display names, in query state.
- Evaluate `AND` before `OR`; no parentheses or manual grouping UI.
- Apply tag eligibility before free-text ranking.
- Render result families in this order: Articles and education; Topic guides; Local market news; Mortgage product guides; Calculators and tools.
- Limit each result carousel to 20 cards; `Show more` opens all section results in a modal with `Relevance` and `Newest` sorting.
- Single-tag routes are crawlable, indexable, self-canonical, and included in the route manifest and sitemap.
- Combined-tag and free-text states are shareable but use base-search canonical metadata, `noindex,follow`, and no sitemap entries.
- All visible copy and metadata must be borrower-facing and must not expose registry IDs, parser language, review states, generation instructions, demo language, or scaffolding terms.
- Do not invent rates, APRs, eligibility, availability, ratings, popularity, reading time, dates, or other unsupported claims.
- Preserve core static content if the compact index cannot load.
- Respect keyboard access, visible focus, modal focus trapping/restoration, reduced motion, touch scrolling, and mobile overflow constraints.

## File Structure

- `mock-data/tag-registry.json`: generated canonical public tag records, route assignments, redirect history, related-tag relationships, and competing-page review records.
- `mock-data/public-tag-registry.json`: slim browser-safe projection of public tag fields and route assignments; it contains no competing-page review inventory or internal audit data.
- `mock-data/search-index.json`: generated compact discovery records without article bodies or internal evidence.
- `mock-data/build-tagged-content-search.mjs`: deterministic canonical-source reader, extraction/assignment rules, validation, and JSON writer.
- `mock-data/tagged-content-search.test.mjs`: generator, assignment, registry, duplicate, forbidden-copy, and compact-index tests.
- `site/tag-registry.mjs`: browser-safe registry normalization, lookup, route resolution, and route-assignment helpers.
- `site/tag-query.mjs`: exact-prefix autocomplete, Boolean expression compilation/evaluation, and deterministic filtering/ranking.
- `site/tag-state.mjs`: query-string parse/serialize/recovery rules.
- `site/tag-presentation.mjs`: shared primary/additional tag markup and result-card markup.
- `site/tag-search-ui.mjs`: shared search page, fixed result groups, carousels, autocomplete, connectors, empty/error states, modal, and event wiring.
- `site/tag-search.test.mjs`: registry, query, state, grouping, rendering, and accessibility-contract tests.
- `site/editorial-renderer.mjs`, `site/news-renderer.mjs`: compose shared tag presentation into article and topic/news output.
- `site/app.js`: load the two discovery payloads, render tag/search routes, and invoke focused UI wiring.
- `site/styles.css`: stable responsive dimensions, subtle matched-tag styling, combobox, token/operator, carousel, accordion, and modal states.
- `site/public-route-manifest.mjs`, `site/document-metadata.mjs`, `site/static-route-document.mjs`, `site/location-news-static.mjs`: canonical tag route ownership, metadata, JSON-LD, static content, and sitemap inclusion.
- `mock-data/generate-static-routes.mjs`, `mock-data/generate-location-news.mjs`: load generated discovery artifacts and include tag routes in canonical outputs.

---

### Task 1: Canonical Tag Registry and Compact Search Index

**Files:**
- Create: `mock-data/build-tagged-content-search.mjs`
- Create: `mock-data/tagged-content-search.test.mjs`
- Create: `mock-data/tag-registry.json`
- Create: `mock-data/public-tag-registry.json`
- Create: `mock-data/search-index.json`

**Interfaces:**
- Consumes: `production-seed.json`, `editorial-content.json`, `location-news-index.json`, and existing route fields without mutating those sources.
- Produces: `buildTaggedContentSearch(inputs, options) -> { registry, publicTagRegistry, searchIndex }`, `buildPublicTagRegistry(registry)`, `validateTagRegistry(registry)`, `validatePublicTagRegistry(publicTagRegistry)`, `validateSearchIndex(searchIndex, registry)`, and deterministic JSON artifacts.
- Registry shape: `{ version: 1, updatedAt: "YYYY-MM-DD", tags: TagRecord[], assignments: RouteAssignment[] }`.
- `TagRecord`: `{ id, displayName, slug, type, description, sourceRoutes, relatedTagIds, canonicalRoute, createdAt, reviewedAt, updatedAt, redirectSlugs, competingPageReview }`.
- `RouteAssignment`: `{ route, primaryTagIds, additionalTagIds }`.
- Search record: `{ id, route, family, title, preview, image, author, publishedAt, updatedAt, tagIds, primaryTagIds, locationIds, productIds, canonicalOrder }`.
- Public tag projection: `{ version: 1, updatedAt, tags: [{ id, displayName, slug, type, description, relatedTagIds, canonicalRoute, reviewedAt, updatedAt, redirectSlugs }], assignments }`; it must not contain `sourceRoutes` or `competingPageReview`.

- [ ] **Step 1: Write failing generator contract tests**

Add tests that build a small fixture containing an FHA article, a Florida insurance article, a topic hub, one location-news story, one FHA product, and one calculator. Assert deterministic output, one-to-three primary tags, exact tag resolution, the approved five families, no full article body, and complete competing-page review records.

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaggedContentSearch,
  validateSearchIndex,
  validateTagRegistry,
} from "./build-tagged-content-search.mjs";

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
  validatePublicTagRegistry(first.publicTagRegistry);
  validateSearchIndex(first.searchIndex, first.registry);
});
```

- [ ] **Step 2: Run the generator test and verify the missing-module failure**

Run: `node --test mock-data/tagged-content-search.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `build-tagged-content-search.mjs`.

- [ ] **Step 3: Implement deterministic tag extraction and validation**

Implement stable slugs and IDs, an explicit approved-type set, normalized duplicate detection, forbidden internal-language validation, canonical route validation, deterministic sorting, and structured extraction rules. Product IDs, state IDs, city IDs, topic fields, location-news `topicIds`, and durable heading/title phrases may propose tags; generic adjectives, navigation phrases, and internal terms must be rejected.

```js
export const CONTENT_FAMILY_ORDER = Object.freeze([
  "articles", "topic-guides", "local-market-news", "product-guides", "calculators",
]);

const APPROVED_TAG_TYPES = new Set([
  "mortgage-topic", "loan-program", "borrower-goal", "state", "city",
  "property-concept", "market-topic",
]);
const FORBIDDEN_PUBLIC_COPY = /\b(?:placeholder|wireframe|demo|scaffold|schema|workflow|review status|internal)\b/i;

export function buildTaggedContentSearch(inputs, { updatedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const catalog = collectCanonicalRecords(inputs);
  const registry = buildRegistry(catalog, updatedAt);
  const searchIndex = buildCompactIndex(catalog, registry, updatedAt);
  validateTagRegistry(registry);
  validateSearchIndex(searchIndex, registry);
  return { registry, searchIndex };
}
```

Every accepted tag must receive a borrower-facing description, valid source routes, `/learning-center/tags/{slug}` canonical route, dates, redirect array, and a route-by-route competing-page review using `DIRECT`, `NEAR`, or `SUPPORTING` relationships and the approved disposition vocabulary. The review may keep distinct pages that discuss the same topic but perform different borrower jobs.

- [ ] **Step 4: Add a CLI writer and generate canonical artifacts**

The direct-run path reads the four existing canonical JSON inputs and writes deterministic JSON with a final newline to `mock-data/tag-registry.json`, `mock-data/public-tag-registry.json`, and `mock-data/search-index.json`. The canonical audit registry may remain formatted for review; browser artifacts use compact serialization. It logs only artifact counts and paths.

Run: `node mock-data/build-tagged-content-search.mjs`

Expected: exits 0 and reports accepted tag, assignment, and search-record counts.

- [ ] **Step 5: Run focused tests twice to prove determinism**

Run: `node --test mock-data/tagged-content-search.test.mjs`

Expected: PASS.

Run: `node mock-data/build-tagged-content-search.mjs`

Expected: exits 0 with no artifact diff on the second run.

- [ ] **Step 6: Commit Task 1 files only**

```powershell
git add -- mock-data/build-tagged-content-search.mjs mock-data/tagged-content-search.test.mjs mock-data/tag-registry.json mock-data/public-tag-registry.json mock-data/search-index.json
git commit -m "feat: generate tagged content discovery data"
```

### Task 2: Registry Lookup, Boolean Query, Ranking, and URL State

**Files:**
- Create: `site/tag-registry.mjs`
- Create: `site/tag-query.mjs`
- Create: `site/tag-state.mjs`
- Create: `site/tag-search.test.mjs`

**Interfaces:**
- Consumes: Task 1 canonical registry, browser-safe public tag registry, and search-index shapes.
- Produces: `normalizeTagRegistry(raw)`, `tagForId(registry, id)`, `tagForSlug(registry, slug)`, `tagsForRoute(registry, route)`, `tagRoute(tag)`.
- Produces: `suggestTags(tags, input, selectedIds)`, `compileTagExpression(tagIds, operators)`, `recordMatchesExpression(record, expression)`, `searchRecords(records, state, registry)`, `groupSearchResults(records)`, `sortSearchResults(records, sort)`.
- Produces: `parseTagSearchState(search, registry)`, `serializeTagSearchState(state)`, and `sanitizeTagSearchState(state, registry)`.
- Search state: `{ tagIds: string[], operators: ("AND"|"OR")[], query: string, sortBySection: Record<string,"relevance"|"newest">, carouselPositions: Record<string,number>, ignoredTagIds: string[] }`.

- [ ] **Step 1: Write failing unit tests for exact suggestions and algebraic precedence**

```js
test("suggestions use only exact display-name prefixes", () => {
  assert.deepEqual(suggestTags(tags, "do", []), [tagsById.get("down-payment-assistance")]);
  assert.deepEqual(suggestTags(tags, "assistance", []), []);
  assert.deepEqual(suggestTags(tags, "dwon", []), []);
});

test("AND binds before OR", () => {
  const expression = compileTagExpression(["fha", "dpa", "va"], ["AND", "OR"]);
  assert.deepEqual(expression, [["fha", "dpa"], ["va"]]);
  assert.equal(recordMatchesExpression({ tagIds: ["fha", "dpa"] }, expression), true);
  assert.equal(recordMatchesExpression({ tagIds: ["fha"] }, expression), false);
  assert.equal(recordMatchesExpression({ tagIds: ["va"] }, expression), true);
});
```

Also test token removal connector repair, malformed/missing connectors defaulting to `AND`, invalid IDs being ignored while valid IDs survive, query-state round trips, renamed slug resolution, tag-first eligibility, deterministic relevance ties, and `Newest` placing undated records after dated records.

- [ ] **Step 2: Run tests and verify missing exports**

Run: `node --test site/tag-search.test.mjs`

Expected: FAIL because the three focused modules do not exist.

- [ ] **Step 3: Implement registry and query helpers**

Use an `OR`-group array of `AND` terms. Free text scores only records that already satisfy the tag expression. Score title tokens before preview, registered tag names, and location/product relationships; use `canonicalOrder` as the final tie-breaker. Do not introduce a duplicate aggregate text field into the browser index.

```js
export function compileTagExpression(tagIds = [], operators = []) {
  if (!tagIds.length) return [];
  const groups = [[tagIds[0]]];
  tagIds.slice(1).forEach((id, index) => {
    const operator = operators[index] === "OR" ? "OR" : "AND";
    if (operator === "OR") groups.push([id]);
    else groups.at(-1).push(id);
  });
  return groups;
}

export function recordMatchesExpression(record, groups) {
  return !groups.length || groups.some((group) => group.every((id) => record.tagIds.includes(id)));
}
```

- [ ] **Step 4: Implement stable URL serialization and recovery**

Use repeated `tag` parameters for IDs, repeated `op` parameters for connectors, `q` for free text, `sort.{family}` for non-default modal sorts, and `pos.{family}` for non-zero carousel positions. Omit empty/default values, preserve token order, and return ignored IDs for a borrower-facing notice.

Example: `?tag=fha&op=AND&tag=down-payment-assistance&op=OR&tag=va&q=closing+costs`.

- [ ] **Step 5: Run focused tests**

Run: `node --test site/tag-search.test.mjs`

Expected: PASS with all suggestion, expression, ranking, sorting, and URL-state cases green.

- [ ] **Step 6: Commit Task 2 files only**

```powershell
git add -- site/tag-registry.mjs site/tag-query.mjs site/tag-state.mjs site/tag-search.test.mjs
git commit -m "feat: add tagged search query engine"
```

### Task 3: Shared Article, Topic, and News Tag Presentation

**Files:**
- Create: `site/tag-presentation.mjs`
- Modify: `site/editorial-renderer.mjs`
- Modify: `site/editorial-renderer.test.mjs`
- Modify: `site/news-renderer.mjs`
- Modify: `site/news-renderer.test.mjs`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: `tagsForRoute(registry, route)` and route assignments from Task 1.
- Produces: `renderPrimaryTagLinks(tags, routeHref)`, `renderAdditionalTagLinks(tags, routeHref, { visibleLimit: 8 })`, and `renderSearchResultCard(record, context)`.
- Extends render options with `tagContext: { primaryTags, additionalTags }` without changing existing callers that omit it.

- [ ] **Step 1: Add failing article/news rendering tests**

Assert that one to three primary tags render as real links before the H1, links target `/learning-center/tags/{slug}`, the first eight additional tags render near sources, the ninth remains inside a native `details` accordion, and omitted tag context preserves current output.

```js
const tagContext = {
  primaryTags: [{ id: "florida", slug: "florida", displayName: "Florida" }],
  additionalTags: Array.from({ length: 9 }, (_, index) => ({
    id: `tag-${index + 1}`, slug: `tag-${index + 1}`, displayName: `Tag ${index + 1}`,
  })),
};
const html = renderProductionArticle(article, { contributors, sources, tagContext });
assert.match(html, /class="content-primary-tags"[\s\S]*href="\/learning-center\/tags\/florida"[\s\S]*<h1>/);
assert.equal((html.match(/data-additional-tag=/g) || []).length, 9);
assert.match(html, /<details class="content-additional-tags-more">/);
```

- [ ] **Step 2: Run renderer tests and verify failure**

Run: `node --test site/editorial-renderer.test.mjs site/news-renderer.test.mjs`

Expected: FAIL because tag context is not rendered.

- [ ] **Step 3: Implement reusable borrower-facing tag markup**

Primary markup is a labeled navigation list above the title. Additional markup is a section titled `Explore related topics`; it shows eight links and, when needed, a `details` element whose summary is `Show more topics`. Links remain ordinary anchors and never reveal stable IDs.

- [ ] **Step 4: Compose tags into editorial topics/articles and location news**

Pass `tagContext` through `renderProductionArticle`, `renderProductionTopicHub`, and `renderArticleContent`. Keep existing bylines, dates, headings, sources, disclosures, related routes, and body content unchanged. Place additional tags immediately after sources when sources exist; otherwise place them before related navigation/footer content.

- [ ] **Step 5: Add responsive and focus-visible styles**

Use existing Snap color variables and compact chips with real anchor semantics. Do not use oversized pills; allow wrapping, keep 44px minimum tap height where the chip is interactive, and ensure the accordion cannot create horizontal overflow.

- [ ] **Step 6: Run focused renderer tests**

Run: `node --test site/editorial-renderer.test.mjs site/news-renderer.test.mjs site/public-copy-guard.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit Task 3 files only**

```powershell
git add -- site/tag-presentation.mjs site/editorial-renderer.mjs site/editorial-renderer.test.mjs site/news-renderer.mjs site/news-renderer.test.mjs site/styles.css
git commit -m "feat: add tags to public content pages"
```

### Task 4: Crawlable Tag Routes, Metadata, JSON-LD, and Sitemap

**Files:**
- Modify: `site/public-route-manifest.mjs`
- Modify: `site/public-route-manifest.test.mjs`
- Modify: `site/document-metadata.mjs`
- Modify: `site/document-metadata.test.mjs`
- Modify: `site/static-route-document.mjs`
- Modify: `site/static-route-document.test.mjs`
- Modify: `site/location-news-static.mjs`
- Modify: `mock-data/generate-static-routes.mjs`
- Modify: `mock-data/generate-location-news.mjs`
- Modify: `site/static-route-rewrites.test.mjs`

**Interfaces:**
- Consumes: Task 1 `tagRegistry` and `searchIndex`, Tasks 2-3 helpers.
- Produces: manifest entries `{ group: "learningCenter", type: "tag", itemId: tag.id, route: tag.canonicalRoute, source: "tagRegistry.tags" }`.
- Extends `createPublicRouteManifest({ seed, editorialContent, tagRegistry })` and `createStaticRouteContext({ ..., tagRegistry, searchIndex })`.
- Produces tag metadata with `CollectionPage` and `ItemList` JSON-LD and Article metadata with `keywords`, `about`, and `articleSection`.

- [ ] **Step 1: Add failing static-route and metadata tests**

Assert that every accepted tag owns one manifest route, `/learning-center/tags/florida` contains a breadcrumb, unique H1/introduction, factual `Last updated`, all five populated section headings, and crawlable canonical links before scripts. Assert self-canonical indexable single-tag metadata, Article tag properties, and `noindex,follow` plus base-search canonical for `/learning-center/search?...` states.

```js
const metadata = resolveDocumentMetadata({ type: "tag", item: floridaTag }, {
  path: floridaTag.canonicalRoute,
  searchRecords,
  tagRegistry,
  siteOrigin: "https://mortgage.example",
});
assert.equal(metadata.canonical, "https://mortgage.example/learning-center/tags/florida");
assert.equal(metadata.robots, "index,follow");
assert.equal(metadata.jsonLd[0]["@type"], "CollectionPage");
assert.equal(metadata.jsonLd[1]["@type"], "ItemList");
```

- [ ] **Step 2: Run focused static tests and verify failure**

Run: `node --test site/public-route-manifest.test.mjs site/document-metadata.test.mjs site/static-route-document.test.mjs site/static-route-rewrites.test.mjs`

Expected: FAIL because tag routes and metadata are not registered.

- [ ] **Step 3: Add tag routes to canonical route context**

Make the Learning Center count derive from canonical source lengths or include the exact generated tag count rather than leaving the current hard-coded 41 unchanged. Add tags to context maps and records. Load both new JSON files in `generate-static-routes.mjs`. Keep location-news route ownership separate.

- [ ] **Step 4: Render progressive static tag pages**

Render a breadcrumb (`Learning Center` -> tag), H1, description, `Last updated {reviewedAt}`, related-tag links, and fixed-order result sections. Each record is a canonical anchor card. Omit empty families. Include the search enhancement root with the single tag selected, but never require JavaScript to access the static results.

Pass route assignments into every indexed static article, topic guide, local-market-news, product-guide, and calculator renderer. Render one to three primary links above that page's H1 and the additional-tag block after Sources and Citations or, when absent, before related navigation/footer content. For every historical slug in `redirectSlugs`, generate a non-sitemap redirect document that canonicalizes and immediately routes to the current tag route; `tagForSlug` must identify both the historical and current slug so the SPA reaches the same canonical destination.

- [ ] **Step 5: Add metadata and robots application**

Extend metadata to return `robots`. Update static `renderHead` and `applyDocumentMetadata` to write `<meta name="robots">`. A path with search parameters is canonicalized to `/learning-center/search` and gets `noindex,follow`; a tag route remains self-canonical and gets `index,follow`. Preserve existing Open Graph, Twitter, author, publisher, date, and breadcrumb data.

- [ ] **Step 6: Include accepted tag routes in sitemap only**

Pass canonical tag routes and registry `updatedAt` values to `renderSitemap`. Do not add query strings, combined expressions, or free-text states. Redirect slugs remain redirect metadata and do not become duplicate sitemap entries.

- [ ] **Step 7: Run focused static tests**

Run: `node --test site/public-route-manifest.test.mjs site/document-metadata.test.mjs site/static-route-document.test.mjs site/static-route-rewrites.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit Task 4 files only**

```powershell
git add -- site/public-route-manifest.mjs site/public-route-manifest.test.mjs site/document-metadata.mjs site/document-metadata.test.mjs site/static-route-document.mjs site/static-route-document.test.mjs site/location-news-static.mjs mock-data/generate-static-routes.mjs mock-data/generate-location-news.mjs site/static-route-rewrites.test.mjs
git commit -m "feat: generate crawlable tag routes"
```

### Task 5: Interactive Search, Tokens, Operators, Carousels, and Full-Results Modal

**Files:**
- Create: `site/tag-search-ui.mjs`
- Modify: `site/tag-search.test.mjs`
- Modify: `site/app.js`
- Modify: `site/learning-center.mjs`
- Modify: `site/learning-center.test.mjs`
- Modify: `site/learning-center-integration.test.mjs`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: Tasks 1-4 modules and artifacts.
- Produces: `renderTagSearchPage({ registry, records, state, staticFallbackHtml, loadError })`, `wireTagSearch(root, context)`, `renderResultSections(groups, context)`, and `openTagResultsModal(family, context)`.
- `wireTagSearch` context: `{ registry, records, state, navigate(url,{replace,state}), track(event,payload), onStateChange(state) }`.

- [ ] **Step 1: Add failing UI contract tests**

Test rendered combobox roles/relationships, token buttons, per-gap operator labels, fixed family order, omission of empty families, a 20-card carousel cap, `Show more` family identity, matched-tag ordering, borrower-facing invalid-token/index-error notices, and full-results modal sorting controls.

```js
const html = renderTagSearchPage({ registry, records, state });
assert.match(html, /role="combobox"/);
assert.match(html, /aria-controls="tag-search-suggestions"/);
assert.match(html, /aria-label="Change the connector between FHA and Down Payment Assistance"/);
assert.ok(html.indexOf("Articles and education") < html.indexOf("Calculators and tools"));
assert.equal((sectionHtml.match(/class="tag-result-card/g) || []).length, 20);
```

- [ ] **Step 2: Run UI tests and verify failure**

Run: `node --test site/tag-search.test.mjs site/learning-center.test.mjs site/learning-center-integration.test.mjs`

Expected: FAIL because `tag-search-ui.mjs` and the enhanced route composition do not exist.

- [ ] **Step 3: Implement the accessible search composition**

Use an editable free-text input with an accessible listbox whose options are exact-prefix tags. Selecting an option creates a removable token. Insert a compact native `select` between every adjacent token with `AND` and `OR`; label it with both neighboring display names. Arrow keys move suggestions, Enter selects, Escape dismisses, and Backspace removes the final token only when the input is empty.

- [ ] **Step 4: Implement result sections and carousel state**

Use the fixed family order from Task 1. Render up to 20 cards per section, count all family matches, and use icon previous/next buttons with accessible names. Scroll with touch/keyboard without changing card dimensions or overflowing the page. Store each section's scroll index in URL/history state and restore it after SPA navigation.

- [ ] **Step 5: Implement the section modal**

Open a section-specific modal containing every matching record. Provide a labeled sort select with `Relevance` and `Newest`; preserve the query; trap focus; close on Escape/backdrop/close button; restore trigger focus; and use a full-screen sheet at the mobile breakpoint. Reuse the current modal accessibility behavior where compatible without coupling to article-modal history.

- [ ] **Step 6: Compose the SPA routes and payload loading**

Add `PUBLIC_TAG_REGISTRY_URL` and `SEARCH_INDEX_URL`. Load `mock-data/public-tag-registry.json` with normal public content data so SPA-rendered articles, topic guides, local-market news, product guides, and calculators receive their primary and additional tag links. Never fetch the canonical audit registry in the browser. Fetch the larger search index only while rendering `/learning-center/search` or `/learning-center/tags/*`. A tag route starts with its tag token; a historical slug resolves to the current tag and replaces the URL with its canonical route. Unknown IDs show `One search topic was unavailable, so we kept the rest of your search.` An index fetch failure leaves generated static content visible and shows `Search tools are temporarily unavailable. You can still open the resources below.`

Use `tagsForRoute` and the shared presentation helper on every indexed SPA page. Primary links appear above the page H1; additional links appear beside sources/citations or before related navigation/footer content. Do not add tags to rates, loan-officer, branch, account, authentication, or prequalification pages.

Replace the old first-substring Learning Center submission behavior with state serialization to `/learning-center/search`. Preserve the Learning Center home composition; update existing topic links only where they represent canonical tags.

- [ ] **Step 7: Add responsive interaction styles**

Set stable card widths with `grid-auto-columns`, prevent body-level horizontal overflow, provide visible focus, keep text within tokens/operators/cards, honor `prefers-reduced-motion`, and make the modal full-screen on mobile. Use subtle border/background emphasis plus visible `Matched topic` text so color is not the only signal.

- [ ] **Step 8: Run focused UI and regression tests**

Run: `node --test site/tag-search.test.mjs site/learning-center.test.mjs site/learning-center-integration.test.mjs site/editorial-renderer.test.mjs site/news-renderer.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit Task 5 files only**

```powershell
git add -- site/tag-search-ui.mjs site/tag-search.test.mjs site/app.js site/learning-center.mjs site/learning-center.test.mjs site/learning-center-integration.test.mjs site/styles.css
git commit -m "feat: build tagged learning center search"
```

### Task 6: Canonical Regeneration and Content-Quality Gates

**Files:**
- Modify: generated route files under `site/generated/routes/learning-center/` only as produced by canonical generators.
- Modify: `site/phase2-static-smoke.mjs`
- Modify: `site/public-content-audit.test.mjs`
- Modify: `site/public-copy-guard.test.mjs` only when a new assertion is required, not to weaken existing checks.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: current generated tag routes and smoke/audit coverage that validates every tag link and route.

- [ ] **Step 1: Add failing audit assertions**

Require every registry assignment to resolve, every primary tag to be in the complete assignment, every accepted tag route to exist, every static tag result link to resolve, every tag to have a completed competing-page review, and every public tag label/description to pass the existing scaffolding-language guard.

- [ ] **Step 2: Run audits and observe stale/missing generated routes**

Run: `node --test site/public-content-audit.test.mjs site/public-copy-guard.test.mjs`

Expected: FAIL with missing or stale tag-route output before regeneration.

- [ ] **Step 3: Run canonical generators in dependency order**

Run: `node mock-data/build-editorial-content.mjs`

Run: `node mock-data/generate-location-news.mjs`

Run: `node mock-data/build-tagged-content-search.mjs`

Run: `node mock-data/generate-location-news.mjs --attribution-only`

Run: `node mock-data/generate-static-routes.mjs`

Expected: every command exits 0. The attribution-only pass must follow the final tag build so standalone article JSON-LD, visible tag links, and sitemap dates use the final registry. Review generated diffs to confirm they are deterministic consequences of canonical sources; do not hand-edit generated HTML or unrelated location content.

- [ ] **Step 4: Apply the customer-useful content review to tag-page copy**

For every accepted tag, verify a named competing-page inventory records borrower question, intent, audience, entity, substantive coverage, action, relationship (`DIRECT`, `NEAR`, `SUPPORTING`), and disposition. Shared subject matter alone is not a duplicate. Record gaps as data errors rather than publishing generic or internal-facing copy.

- [ ] **Step 5: Run audits and static smoke**

Run: `node --test site/public-content-audit.test.mjs site/public-copy-guard.test.mjs mock-data/tagged-content-search.test.mjs`

Expected: PASS.

Run: `node site/phase2-static-smoke.mjs`

Expected: PASS with the prior 872-route baseline plus one route for every accepted tag, with zero not-found links.

- [ ] **Step 6: Commit only feature-owned generated output and audit files**

```powershell
git add -- mock-data/tag-registry.json mock-data/public-tag-registry.json mock-data/search-index.json site/generated/routes/learning-center/tags site/phase2-static-smoke.mjs site/public-content-audit.test.mjs site/public-copy-guard.test.mjs
git commit -m "test: validate tagged content routes"
```

Do not stage other generated files already dirty before this task.

### Task 7: Full Regression and Browser Verification

**Files:**
- Modify only files required to fix defects found by this task.
- Record: `.superpowers/sdd/progress.md` as ignored execution bookkeeping.

**Interfaces:**
- Consumes: complete feature branch.
- Produces: verification evidence for unit, integration, static-route, accessibility-interaction, responsive-layout, copy, and paused-boundary acceptance criteria.

- [ ] **Step 1: Run the complete supported Node test suite**

Run: `node --test site/*.test.mjs mock-data/*.test.mjs`

Expected: all tests pass with zero failures. If PowerShell expansion does not pass globs to Node, enumerate files with `Get-ChildItem` and pass their full names to `node --test` without changing test scope.

- [ ] **Step 2: Run canonical route smoke**

Run: `node site/phase2-static-smoke.mjs`

Expected: all existing and new public routes pass with zero missing routes or unresolved internal links.

- [ ] **Step 3: Verify the paused hero boundary**

Run: `Get-FileHash -Algorithm SHA256 index.html`

Expected hash: `04D4D8D3A16A38EB459C830D0D586BF6053B661FCA47A8002DEAF909C2AE0541`.

Run: `git diff --name-only -- index.html site/assets/slot-hero`

Expected: no output.

- [ ] **Step 4: Verify in a real browser at desktop, tablet, and mobile widths**

Use the existing local server and inspect `/learning-center/search`, one article, one topic guide, one local-news article, and at least two single-tag routes. At 1440x900, 768x1024, and 390x844 verify no horizontal page overflow; exact-prefix suggestions; keyboard selection/removal; independent connectors; `AND` precedence; free-text ranking; carousel controls and touch-like horizontal scrolling; modal sorting, Escape, focus trap/restoration, and mobile full-screen behavior; static links remain available when search-index loading is blocked.

- [ ] **Step 5: Verify metadata and no-JavaScript output**

Inspect generated HTML directly for a single-tag route. Confirm unique title/description/H1/introduction, self-canonical URL, `index,follow`, breadcrumb, Last updated, `CollectionPage` and `ItemList`, related-tag links, and crawlable result anchors. Confirm a combined query state updates the live document to base-search canonical and `noindex,follow` without adding a generated route.

- [ ] **Step 6: Run final diff and public-copy scans**

Run: `rg -n -i "placeholder|wireframe|demo|scaffold|review status|generation instruction" mock-data/tag-registry.json mock-data/search-index.json site/generated/routes/learning-center/tags site/tag-*.mjs`

Expected: no borrower-visible matches; code/test identifiers may be reviewed individually and must not render publicly.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 7: Resolve any defect through its owning task**

If a verification check fails, return to the task that owns the failing file, add or strengthen that task's focused regression test, implement the smallest correction, rerun the focused test, and commit only the exact files listed by that owning task. Repeat the full Task 7 verification from Step 1 after the correction. Task 7 is complete only when no uncommitted feature fix remains.

## Completion Evidence

The final report must include:

- Feature-owned files created or changed.
- Exact test commands and pass counts.
- Static-route count before and after tag routes.
- Browser viewports and interactions checked.
- Confirmation that root `index.html` retained the required SHA256 hash and `site/assets/slot-hero/` was untouched.
- Any registry/data gaps, competing-page review concerns, unsupported metadata, or tests that could not be run.
- Confirmation that no deployment or publication occurred.

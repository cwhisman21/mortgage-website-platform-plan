# Snap Mortgage Rates Marketplace, Editorial Contributors, and Production Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a frontend-only participating-provider rates marketplace, provider-specific simulated prequalification handoff, six-contributor editorial desk, fully attributed articles, and a borrower-ready production-copy pass across the Snap Mortgage public site.

**Architecture:** Keep route ownership and page composition in `site/app.js`, but move marketplace state/math/filtering and editorial relationship validation into focused ES modules. Load replaceable marketplace and editorial JSON through explicit adapters, enrich the existing production seed without changing its core entity model, and make the location-news generator apply the same deterministic contributor rules used by the browser. Preserve the existing benchmark education, calculators, location intelligence, account actions, CTA modals, and crawlable news routes below or around the new experiences.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node.js test runner, JSON fixtures, existing Snap chart/news modules, Figma file `0ISr9MuEIGMXIA1zgD9kL8`, and authoritative public mortgage/housing data sources.

## Global Constraints

- Treat all pre-existing modified and untracked files as user-owned. Read before editing, preserve their changes, and stage only files owned by this implementation.
- The homepage hero is a paused workstream. Do not modify, move, delete, integrate, or stage root `index.html`, `site/assets/slot-hero/`, slot-hero screenshots, delegated hero kits, or related hero work.
- Preserve the static-site architecture, established Snap blue visual language, current route behavior, account menu, Watchlist action, CTA modals, location-news modal enhancement, and crawlable canonical links.
- Use the approved Figma marketplace/editorial components and 14 responsive templates in file `0ISr9MuEIGMXIA1zgD9kL8` as the structural source of truth.
- Keep provider, pricing, licensing, ranking, reviews, account context, CRM, lead routing, and prequalification services behind replaceable frontend interfaces. Do not invent backend contracts.
- Mock numbers are permitted only inside the clearly disclosed sample-offer marketplace. Article and chart claims must use authoritative sources with visible dates and source links.
- Do not request or infer geolocation.
- Do not store names, email addresses, phone numbers, SSNs, dates of birth, income, assets, debts, documents, bank data, authentication tokens, credit reports, or underwriting outcomes.
- Public contributor title is exactly `Snap Mortgage Editorial Contributor`. Do not invent credentials, licenses, NMLS IDs, work history, education, locations, awards, social profiles, testimonials, or personal anecdotes.
- No company profile routes, review submission, contributor chat, contributor contact, AI response UI, real prequalification fields, decisions, eligibility, approvals, rate locks, or underwriting.
- Every borrower-visible sentence must be production-ready. Public pages may not expose `dummy`, `mock`, `prototype`, `placeholder`, `wireframe`, `scaffold`, review-state labels, internal planning terms, or substituted-template language. The borrower-facing phrase `sample offers` is allowed where it explains marketplace fixtures.
- Use `may`, `estimate`, `review`, `compare`, and `options` language. Avoid guaranteed approval, savings, eligibility, lowest-available, best-rate, or commitment claims.
- Keep core educational and SEO content visible without account, contact, or prequalification gates.
- All charts expose data by mouse, keyboard, and touch and show the source directly below the chart.
- Existing LO and branch page structure remains lightweight and unchanged except for valid related-article bylines/cards.

---

### Task 1: Marketplace Fixture Contract and Pure State Model

**Files:**
- Create: `mock-data/rates-marketplace-fixtures.json`
- Create: `site/rates-marketplace.mjs`
- Create: `site/rates-marketplace.test.mjs`
- Reference: `docs/superpowers/specs/2026-07-12-rates-marketplace-editorial-production-content-design.md`

**Interfaces:**
- Consumes: `URLSearchParams`, optional Snap account context, parsed browser cache, and the fixture JSON.
- Produces: `MARKETPLACE_DEFAULTS`, `normalizeMarketplaceFixture(raw)`, `resolveScenarioContext({ url, account, cache, defaults })`, `validateScenario(scenario)`, `updateDownPayment(scenario, change)`, `filterAndSortOffers({ offers, scenario, resultType, sort })`, `summarizeScenario(scenario)`, `serializeMarketplaceState(state)`, `parseMarketplaceState(value)`, and `createFixtureMarketplaceAdapter(fixture)`.
- The adapter returns `{ listOffers(query), getOffer(id), getReviews(id), createPrequalHandoff({ offerId, scenario }) }`; every method returns fixture data only and performs no network request.

- [ ] **Step 1: Write failing contract and state tests**

Create tests covering: fixture schema rejection, URL/account/cache/default precedence per field, malformed URL fallback, no geolocation field, independent purchase/refinance values, dollar/percent down-payment synchronization, impossible amount validation, six sorts, company/LO filtering, eight-item first page, show-more exhaustion, and cache parsing without private fields.

```js
test("resolves each field in URL, account, cache, default order", () => {
  const resolved = resolveScenarioContext({
    url: new URLSearchParams("zip=92109&term=15"),
    account: { zip: "78701", creditRange: "740-779" },
    cache: { zip: "33602", occupancy: "secondary" },
    defaults: MARKETPLACE_DEFAULTS,
  });
  assert.equal(resolved.zip, "92109");
  assert.equal(resolved.term, 15);
  assert.equal(resolved.creditRange, "740-779");
  assert.equal(resolved.occupancy, "secondary");
  assert.equal("geolocation" in resolved, false);
});
```

- [ ] **Step 2: Run the tests and verify red state**

Run: `node --test site/rates-marketplace.test.mjs`

Expected: FAIL because `site/rates-marketplace.mjs` and its exports do not exist.

- [ ] **Step 3: Add the complete fixture set**

Define version `snap-rates-marketplace-v1`, disclosure copy, allowed values, and at least 10 purchase plus 10 refinance results for each result type so the first eight and `Show more offers` can both be demonstrated. Use fictional companies and loan officers, equal financial fields, stable IDs, fictional fixture NMLS display values clearly contained within the sample-offer disclosure, valid existing LO routes only where an explicit route is supplied, read-only review records, details/fee lines, payment assumptions, and provider-specific prequalification keys.

```json
{
  "version": "snap-rates-marketplace-v1",
  "disclosure": "These sample offers illustrate how participating companies and mortgage professionals may appear on Snap. Snap may receive platform fees, and not every provider or offer is represented. Rates, APRs, payments, fees, and availability are estimates for comparison only and may change after borrower, property, and lender review.",
  "offers": [
    {
      "id": "company-harbor-purchase-30",
      "resultType": "company",
      "mortgageType": "purchase",
      "displayName": "Harborline Home Lending",
      "profileRoute": null,
      "productLabel": "30-year fixed purchase",
      "rate": 5.875,
      "apr": 6.112,
      "points": 1.0,
      "principalAndInterest": 2226,
      "upfrontCost": 7340,
      "eightYearCost": 226944,
      "rating": 4.8,
      "reviewCount": 184,
      "prequalKey": "fixture-harbor-purchase"
    }
  ]
}
```

- [ ] **Step 4: Implement normalization, state resolution, validation, math, sorting, pagination, serialization, and the fixture adapter**

Reject a fixture when IDs are duplicated, required financial values are not finite/nonnegative, a result type is not `company` or `loanOfficer`, or an offer lacks a prequalification key. Ignore malformed state fields individually. Restrict serialization to the approved nonprivate field allowlist.

- [ ] **Step 5: Verify the pure model**

Run: `node --test site/rates-marketplace.test.mjs`

Expected: all marketplace model and fixture contract tests PASS.

- [ ] **Step 6: Commit only Task 1 files**

```powershell
git add -- mock-data/rates-marketplace-fixtures.json site/rates-marketplace.mjs site/rates-marketplace.test.mjs
git commit -m "feat: add rates marketplace fixture adapter"
```

---

### Task 2: Rates Marketplace UI and Responsive Interaction

**Files:**
- Create: `site/rates-marketplace-ui.mjs`
- Create: `site/rates-marketplace-ui.test.mjs`
- Modify: `site/app.js` in imports, boot data loading, `ratesPage()`, `render()`, and `wireInteractions()`
- Modify: `site/styles.css` in a new `Rates marketplace` section and its existing mobile media queries
- Test: `site/public-copy-guard.test.mjs`

**Interfaces:**
- Consumes: Task 1 adapter/model, `navigate(path)`, the current account-context adapter result, and `trackPublicEvent(name, payload)`.
- Produces: `renderRatesMarketplace({ fixture, state })` and `wireRatesMarketplace(root, { fixture, accountContext, navigate, track })`.
- `wireRatesMarketplace` owns the comparison form, result selector, sort, update/reset, show-more, row expansion, tabs, editable payment assumptions, accessible donut details, browser cache, and query-state restoration inside `[data-rates-marketplace]`.

- [ ] **Step 1: Write failing render and interaction-contract tests**

Assert that generated markup includes all approved purchase/refinance fields, Companies/Loan Officers selector, six sorts, disclosure, scenario summary, eight initial offers, `Show more offers`, Details/Payment/Reviews tabs, read-only review source, no company-profile link, conditional valid LO link, chart keyboard controls, and data hooks for each approved analytics event.

- [ ] **Step 2: Run and verify red state**

Run: `node --test site/rates-marketplace-ui.test.mjs`

Expected: FAIL because the UI module does not exist.

- [ ] **Step 3: Build the marketplace renderer from the approved Figma templates**

Use the desktop Rates Results/Details/Payment/Reviews templates (`87:2`, `87:431`, `87:905`, `87:1378`) and mobile templates (`93:1557`, `93:1761`). Keep the comparison controls in a quiet left rail on desktop and a collapsible summary/filter region on mobile. Preserve all benchmark education, trend chart, methodology, calculators, local links, FAQs, and contextual CTAs below the marketplace.

- [ ] **Step 4: Wire progressive scenario controls and state persistence**

First visit defaults to Companies and lowest 8-year cost. Save only the Task 1 allowlist. Preserve purchase and refinance values independently. `Update` rerenders results in place; `Reset filters` returns to neutral defaults; no-match and malformed-fixture states remain useful and link to public education/LO guidance.

- [ ] **Step 5: Wire inline result panels**

Only one result is expanded at a time. Payment edits update the local total and donut segments without changing provider pricing. The donut uses focusable legend controls with `aria-describedby`, pointer/touch activation, and text values that remain visible without hover. Reviews expose source attribution and no write action.

- [ ] **Step 6: Add borrower-ready responsive styles**

Use stable grid tracks, 44px minimum controls, 8px-or-less radii, no nested decorative cards, no viewport-scaled type, zero negative letter spacing, and no horizontal scrolling at 390px. The final marketplace option may use green only as a data/result accent; the page remains Snap blue, white, navy, teal, and restrained warm accents.

- [ ] **Step 7: Verify UI and copy contracts**

Run: `node --test site/rates-marketplace-ui.test.mjs site/public-copy-guard.test.mjs`

Expected: all tests PASS and the marketplace source contains no banned fixture/planning language outside the approved `sample offers` disclosure.

- [ ] **Step 8: Commit only Task 2 files**

```powershell
git add -- site/rates-marketplace-ui.mjs site/rates-marketplace-ui.test.mjs site/app.js site/styles.css site/public-copy-guard.test.mjs
git commit -m "feat: build interactive rates marketplace"
```

---

### Task 3: Provider-Specific Prequalification Handoff

**Files:**
- Modify: `site/app.js` in route registration, metadata, `render()`, and marketplace navigation callback
- Modify: `site/styles.css` in the marketplace/handoff responsive section
- Create: `site/prequal-handoff.test.mjs`
- Modify: `site/phase2-static-smoke.mjs`

**Interfaces:**
- Consumes: `createPrequalHandoff({ offerId, scenario })` from the Task 1 adapter and allowed URL/cache state.
- Produces: route `/prequal/start`, renderer `prequalHandoffPage()`, and `returnToRatesUrl(handoff)`.

- [ ] **Step 1: Write failing route and content tests**

Assert that `/prequal/start` is registered, unknown offer IDs render a recoverable return action, known offers show provider identity/product/key values plus submitted scenario summary, no form fields exist, no decision language exists, and return navigation includes restorable comparison state.

- [ ] **Step 2: Run and verify red state**

Run: `node --test site/prequal-handoff.test.mjs`

Expected: FAIL because the handoff route is not registered.

- [ ] **Step 3: Implement the dedicated handoff page**

Match Figma desktop `93:2015` and mobile `93:2119`. Use borrower copy: `Your selected option is ready to continue` and explain that the next connected experience will carry the selected provider and comparison details into that provider's Snap prequalification path. Render no fields, application simulation, eligibility result, approval language, upload control, or external URL.

- [ ] **Step 4: Preserve Back and explicit return behavior**

The marketplace `Next` action serializes only approved state, navigates to `/prequal/start`, and records `rates_provider_next`. Browser Back and `Return to rate results` both restore mode, result type, sort, filters, visible count, expanded offer, and active tab where valid.

- [ ] **Step 5: Verify route behavior**

Run: `node --test site/prequal-handoff.test.mjs`

Run: `node site/phase2-static-smoke.mjs`

Expected: both commands PASS with `/rates` and `/prequal/start` resolving.

- [ ] **Step 6: Commit only Task 3 files**

```powershell
git add -- site/app.js site/styles.css site/prequal-handoff.test.mjs site/phase2-static-smoke.mjs
git commit -m "feat: add provider prequal handoff"
```

---

### Task 4: Contributor Registry, Directory, Profiles, and Shared Bylines

**Files:**
- Create: `mock-data/editorial/contributors.json`
- Create: `mock-data/editorial/topic-hubs.json`
- Create: `site/editorial-content.mjs`
- Create: `site/editorial-content.test.mjs`
- Modify: `site/learning-center.mjs`
- Modify: `site/app.js` in data loading/maps/routes/cards/topic/profile/article rendering
- Modify: `site/styles.css` in a new `Editorial contributors` section
- Keep: `site/assets/contributors/*.jpg`
- Remove after JPG verification: `site/assets/contributors/*.png`

**Interfaces:**
- Consumes: six contributor records, topic-hub records, base production articles, and optional editorial article overlays from Tasks 5 and 6.
- Produces: `normalizeEditorialContent(raw)`, `contributorById(content, id)`, `articlesForContributor(content, articles, id)`, `resolveArticleAuthor(article, contributors)`, `renderBylineModel(article, contributors)`, and route records for `/learning-center/authors/{slug}`.

- [ ] **Step 1: Write failing registry and relationship tests**

Test the exact six names, exact title, unique IDs/slugs/routes, required bios/beats/topics/alt text, no forbidden credential/social/contact fields, defensive silhouette fallback, related articles derived from `authorId`, and missing-author fallback attributed to `Snap Mortgage` without a dead link.

- [ ] **Step 2: Run and verify red state**

Run: `node --test site/editorial-content.test.mjs`

Expected: FAIL because the contributor registry/module does not exist.

- [ ] **Step 3: Add the approved contributor records**

Use these stable relationships:

```js
const CONTRIBUTORS = [
  ["contributor-rowan-hale", "rowan-hale", "Rowan Hale", "Rates and economy"],
  ["contributor-maya-brooks", "maya-brooks", "Maya Brooks", "Local markets"],
  ["contributor-jordan-avery", "jordan-avery", "Jordan Avery", "Home buying"],
  ["contributor-elena-park", "elena-park", "Elena Park", "Refinancing and equity"],
  ["contributor-marcus-lane", "marcus-lane", "Marcus Lane", "Loan programs"],
  ["contributor-priya-bennett", "priya-bennett", "Priya Bennett", "Mortgage data"],
];
```

Each record uses `/site/assets/contributors/{slug}.jpg`, route `/learning-center/authors/{slug}`, exact title `Snap Mortgage Editorial Contributor`, and coverage-only bios.

- [ ] **Step 4: Implement directory/profile/byline renderers**

Replace the generic editorial-team topic page with the six-person directory matching Figma desktop `94:2115` and mobile `94:2277`. Add profile routes matching `94:2413` and `94:2524`. Add headshot/name/date bylines to Learning Center article cards and linked bylines near full article headlines. Keep article structured publishing responsibility with Snap Mortgage.

- [ ] **Step 5: Optimize and verify portrait assets**

Confirm each JPG is 400x400, renders correctly, and has descriptive alt text. Resolve the absolute PNG paths inside `site/assets/contributors`, verify they remain under the workspace, then remove only the six redundant PNG files created for this work.

- [ ] **Step 6: Verify contributor pages and responsive styles**

Run: `node --test site/editorial-content.test.mjs site/learning-center.test.mjs site/learning-center-integration.test.mjs`

Expected: all tests PASS and all six author routes are produced by the route model.

- [ ] **Step 7: Commit only Task 4 files and final JPGs**

```powershell
git add -- mock-data/editorial/contributors.json mock-data/editorial/topic-hubs.json site/editorial-content.mjs site/editorial-content.test.mjs site/learning-center.mjs site/app.js site/styles.css site/assets/contributors/*.jpg
git commit -m "feat: add Snap editorial contributors"
```

---

### Task 5: Twelve Local/State Articles and Distinct Topic-Hub Copy

**Files:**
- Create: `mock-data/editorial/articles-local.json`
- Create: `mock-data/editorial/source-ledger.json`
- Create: `mock-data/build-editorial-content.mjs`
- Generate: `mock-data/editorial-content.json`
- Create: `site/editorial-production-content.test.mjs`
- Modify: `site/app.js` in editorial overlay loading and article/topic rendering
- Modify: `site/styles.css` in the production article section

**Interfaces:**
- Consumes: base article IDs/routes, contributor registry, topic hubs, and authoritative source records.
- Produces: compiled `mock-data/editorial-content.json` with `{ version, contributors, topicHubs, articles, sources }`; each article has `authorId`, `summary`, `dek`, `publishedAt` or `updatedAt`, `keyTakeaways`, `sections`, `faqs`, `sourceIds`, `relatedRoutes`, and `metaDescription`.

- [ ] **Step 1: Write failing production-content completeness tests**

Require one valid author, date, summary, at least three substantive sections, at least three takeaways, two FAQs, two authoritative source IDs, two valid internal routes, unique opening copy, and no banned public terms. Assert local updates use `publishedAt` plus explicit `asOf` and every cited source ID resolves.

- [ ] **Step 2: Run and verify red state**

Run: `node --test site/editorial-production-content.test.mjs`

Expected: FAIL because compiled editorial content does not exist.

- [ ] **Step 3: Research and record authoritative sources before drafting**

Use current primary/authoritative sources: Freddie Mac PMMS, FHFA HPI, Census/ACS, BLS, HUD, VA, CFPB, state/local tax authorities, and state insurance regulators as relevant. Record publisher, title/dataset, direct URL, data period, accessed date, geographic scope, and the exact claim supported. Do not use unsupported market figures or marketplace mock values in editorial content.

- [ ] **Step 4: Draft the twelve local/state records with dominant-topic attribution**

Cover these exact IDs and preserved routes: Austin, Dallas, Houston, Irvine, San Diego, Sacramento, Denver, Colorado Springs, Boulder, Tampa, Orlando, and Miami. Use Maya Brooks for broad local-market/inventory pieces, Elena Park for refinance/equity pieces, Marcus Lane for dominant VA/jumbo program pieces, Jordan Avery for first-time/move-up buying pieces, and Priya Bennett for data-heavy affordability pieces. Each article must interpret dated local/state data, explain what it may mean for a borrower, separate facts from scenario-dependent decisions, and include CTA/internal-link breaks.

- [ ] **Step 5: Write distinct borrower-facing copy for all nine audited topic hubs**

Create unique hero summary, overview paragraphs, `whyItMatters`, `startHere`, `comparisonPoints`, `featuredLinkIds`, and closing CTA copy for Local Market Updates, Buying a Home, Refinance, FHA Loans, VA Loans, Jumbo Loans, Home Equity, Taxes & Insurance, and Editorial Team. Do not generate headings by substituting the topic name into one sentence pattern.

- [ ] **Step 6: Compile and render structured article bodies**

The build script validates fragments before writing `mock-data/editorial-content.json`. Update `articlePage()` to render the structured introduction, takeaways, sections, comparisons/tables, contextual CTA breaks, conclusion, FAQs, sources, and related pages. Match production article Figma desktop `94:2612` and mobile `94:2764`.

- [ ] **Step 7: Verify local content and compilation**

Run: `node mock-data/build-editorial-content.mjs`

Run: `node --test site/editorial-production-content.test.mjs`

Expected: compiler exits 0; all twelve local articles and all nine hubs pass completeness, source, date, uniqueness, author, and banned-copy checks.

- [ ] **Step 8: Commit Task 5 files**

```powershell
git add -- mock-data/editorial/articles-local.json mock-data/editorial/source-ledger.json mock-data/editorial/topic-hubs.json mock-data/build-editorial-content.mjs mock-data/editorial-content.json site/editorial-production-content.test.mjs site/app.js site/styles.css
git commit -m "content: publish local mortgage editorial guides"
```

---

### Task 6: Twelve Evergreen Product/Buyer Articles

**Files:**
- Create: `mock-data/editorial/articles-guides.json`
- Modify: `mock-data/editorial/source-ledger.json`
- Regenerate: `mock-data/editorial-content.json`
- Modify: `site/editorial-production-content.test.mjs`

**Interfaces:**
- Consumes: Task 5 compiler/schema, contributor registry, source ledger, and the remaining 12 base article IDs.
- Produces: compiled overlays for four state tax/insurance explainers, four product explainers, and four borrower-intent guides.

- [ ] **Step 1: Expand failing tests to all 24 audited article IDs**

Assert every audited base route has exactly one compiled overlay and that no two articles share a normalized paragraph of 18 or more words. Evergreen pieces require `updatedAt` and must not present themselves as breaking news.

- [ ] **Step 2: Run and verify red state**

Run: `node --test site/editorial-production-content.test.mjs`

Expected: FAIL listing the 12 missing evergreen article IDs.

- [ ] **Step 3: Research and draft state tax/insurance guides**

Write Texas property tax, California tax/insurance, Colorado tax/insurance, and Florida insurance guides. Use authoritative state/local agencies plus CFPB/FEMA/NAIC sources where applicable; make dates and geographic limitations visible; attribute data-heavy pieces to Priya Bennett and local-market framing to Maya Brooks.

- [ ] **Step 4: Research and draft product explainers**

Write FHA, VA, jumbo, and refinance basics. Use HUD, VA, FHFA, CFPB, Freddie Mac, or Fannie Mae primary guidance; attribute FHA/VA/jumbo to Marcus Lane and refinance to Elena Park. Explain tradeoffs and review points without eligibility or approval claims.

- [ ] **Step 5: Research and draft borrower-intent guides**

Write first-time buyer, move-up buyer, home equity options, and cash-out refinance guides. Attribute buying guides to Jordan Avery and equity/refinance guides to Elena Park. Include borrower checklists, comparison tables or calculations where useful, contextual public links, conclusion, FAQs, and sources.

- [ ] **Step 6: Compile and verify all 24 articles**

Run: `node mock-data/build-editorial-content.mjs`

Run: `node --test site/editorial-production-content.test.mjs`

Expected: all 24 routes pass author, uniqueness, structure, source, date, related-route, and production-copy checks.

- [ ] **Step 7: Commit Task 6 files**

```powershell
git add -- mock-data/editorial/articles-guides.json mock-data/editorial/source-ledger.json mock-data/editorial-content.json site/editorial-production-content.test.mjs
git commit -m "content: publish borrower mortgage guides"
```

---

### Task 7: Deterministic Location-News Attribution and Crawlable Bylines

**Files:**
- Create: `mock-data/location-news/lib/author-assignment.mjs`
- Create: `mock-data/location-news/lib/author-assignment.test.mjs`
- Modify: `mock-data/location-news/lib/compose.mjs`
- Modify: `mock-data/location-news/lib/validate.mjs`
- Modify: `mock-data/generate-location-news.mjs`
- Modify: `site/news-renderer.mjs`
- Modify: `site/news-renderer.test.mjs`
- Modify: `site/app.js` in location-news card/modal/direct-page contributor lookup
- Regenerate: `mock-data/location-news-index.json` and generated location-news HTML only if the existing generator's deterministic output requires it
- Modify: `mock-data/tests/location-news-corpus.test.mjs`

**Interfaces:**
- Consumes: location-news `articleType`, contributor registry, compact news records, and `renderArticleContent(article, media, { author })`.
- Produces: `authorIdForLocationNews(article)` and required valid `authorId` in composed/index/static records.

- [ ] **Step 1: Write failing deterministic-assignment tests**

Use a fixed mapping: home-price/inventory/affordability/local-market pieces to Maya Brooks; labor/economic pieces to Rowan Hale; loan-limit/program pieces to Marcus Lane; tax/insurance/data-method pieces to Priya Bennett; refinance/equity pieces to Elena Park; buying-process pieces to Jordan Avery. Assert the same input always returns the same valid ID.

- [ ] **Step 2: Run and verify red state**

Run: `node --test mock-data/location-news/lib/author-assignment.test.mjs site/news-renderer.test.mjs`

Expected: FAIL because author assignment and byline rendering do not exist.

- [ ] **Step 3: Add attribution to compose, validation, index, and static rendering**

`validate.mjs` requires `authorId` and confirms it exists in the contributor registry. Extend `renderArticleContent` with an optional linked author byline showing headshot, name, and published/updated date. Cards show the same small identity/date treatment while keeping their crawlable direct article link and enhanced modal behavior.

- [ ] **Step 4: Regenerate with a clean-scope diff check**

Run the existing location-news generator. Before staging, inspect the diff and confirm changes are limited to deterministic `authorId`, byline markup, sitemap author routes/lastmod where required, and formatting caused by the current generator. Do not overwrite unrelated content changes or regenerate if the output would destroy user-owned edits; in that case, update the compact index and static renderer through the generator's incremental path.

- [ ] **Step 5: Verify corpus and static pages**

Run: `node --test mock-data/location-news/lib/author-assignment.test.mjs mock-data/tests/location-news-corpus.test.mjs site/news-renderer.test.mjs site/location-news-integration.test.mjs`

Expected: every location-news index item has one valid author; representative static pages contain linked bylines; modal/direct rendering remains valid.

- [ ] **Step 6: Commit only Task 7 attribution/generator output**

```powershell
git add -- mock-data/location-news/lib/author-assignment.mjs mock-data/location-news/lib/author-assignment.test.mjs mock-data/location-news/lib/compose.mjs mock-data/location-news/lib/validate.mjs mock-data/generate-location-news.mjs mock-data/location-news-index.json mock-data/tests/location-news-corpus.test.mjs site/news-renderer.mjs site/news-renderer.test.mjs site/app.js site/generated/learning-center/market-news site/sitemap.xml
git commit -m "feat: attribute location news contributors"
```

---

### Task 8: Site-Wide Borrower Copy, Metadata, and Link Cleanup

**Files:**
- Modify: `site/app.js`
- Modify: `site/index.html`
- Modify: `site/public-copy-guard.test.mjs`
- Create: `site/public-content-audit.test.mjs`
- Modify: `site/sitemap.xml`
- Reference: `C:/Users/caleb/OneDrive/Documents/Snap Ecosystem/learning-center-placeholder-text-audit.md`

**Interfaces:**
- Consumes: rendered route inventory from `buildMaps`, compiled editorial content, marketplace routes, contributor routes, and the audit's phrase inventory.
- Produces: production-ready public copy, complete metadata/canonical records, sitemap entries, and an automated no-scaffolding/no-dead-link gate.

- [ ] **Step 1: Expand the failing copy guard**

Add case-insensitive whole-word checks for `dummy`, `mock`, `prototype`, `placeholder`, `wireframe`, `scaffold`, `review status`, `editorial draft`, `compliance review`, `available sections`, `content graph`, `trust layer`, and the audit's shared structural passages. Permit `sample offers` only inside the marketplace disclosure. Add checks that article cards do not call `humanStatus(article.reviewStatus)`.

- [ ] **Step 2: Run and capture every current failure**

Run: `node --test site/public-copy-guard.test.mjs site/public-content-audit.test.mjs`

Expected: FAIL with the remaining borrower-visible source locations.

- [ ] **Step 3: Replace every audited public phrase**

Rewrite search guidance, loading/error/empty states, directory descriptions, calculator guardrails and result notes, topic/article copy, related-card summaries, page intros, table labels, CTAs, and disclosure headings. Keep instructional text only when it directly helps a borrower complete a visible control. Replace internal review statuses with article summary/date/byline data.

- [ ] **Step 4: Validate visible links and route ownership**

Collect hrefs from nav, cards, bylines, CTAs, sitemap, and generated pages. Each internal href must resolve through `maps.routes`, a canonical generated article, a same-page anchor, or an approved modal action. Do not add standalone Watchlist, company, or contributor-interaction routes.

- [ ] **Step 5: Update SEO metadata and sitemap**

Add canonical entries for `/prequal/start`, `/learning-center/editorial-team`, and all six author routes. Use unique borrower-facing titles/descriptions for `/rates`, the nine hubs, contributor pages, and all 24 articles. Keep article content public and linked from hubs/profiles/related sections.

- [ ] **Step 6: Verify copy, SEO, and routes**

Run: `node --test site/public-copy-guard.test.mjs site/public-content-audit.test.mjs site/learning-center-integration.test.mjs`

Run: `node site/phase2-static-smoke.mjs`

Expected: all tests PASS with zero banned public-copy findings and zero dead internal routes.

- [ ] **Step 7: Commit only Task 8 files**

```powershell
git add -- site/app.js site/index.html site/public-copy-guard.test.mjs site/public-content-audit.test.mjs site/sitemap.xml
git commit -m "fix: finish borrower-facing public copy"
```

---

### Task 9: Full Verification, Browser QA, and Independent Review

**Files:**
- Create: `docs/22-rates-editorial-production-content-validation.md`
- Create only if needed for fixes: focused tests beside the module they cover
- Do not stage: `.superpowers/`, `tmp/`, unrelated screenshots, root `index.html`, or paused hero assets

**Interfaces:**
- Consumes: all prior task commits and the 38 acceptance criteria in the approved design spec.
- Produces: an acceptance matrix with implementation proof, automated-test proof, browser proof, residual integration/compliance notes, and a clean independent-review verdict.

- [ ] **Step 1: Run syntax, JSON, unit, integration, and static route suites**

```powershell
node --check site/app.js
node -e "for (const f of ['mock-data/production-seed.json','mock-data/rates-marketplace-fixtures.json','mock-data/editorial-content.json','mock-data/location-news-index.json']) JSON.parse(require('node:fs').readFileSync(f,'utf8')); console.log('JSON OK')"
node --test site/*.test.mjs
node --test mock-data/tests/*.test.mjs mock-data/location-news/lib/*.test.mjs
node site/phase2-static-smoke.mjs
```

Expected: every command exits 0; JSON command prints `JSON OK`; no static route, content, author, source, or marketplace contract failures.

- [ ] **Step 2: Run desktop browser scenarios**

At 1440x1000 verify `/rates` initial offers, purchase/refinance switching, all filters/sorts/reset, company/LO modes, show more, all inline tabs, payment edits, donut pointer/keyboard details, `Next`, handoff summary, browser Back restoration, editorial directory, six profiles, representative articles, one state/city news modal/direct route, one LO page, and one branch page. Record console/network errors and screenshots in a temporary ignored QA folder.

- [ ] **Step 3: Run mobile browser scenarios**

At 390x844 repeat the marketplace, handoff, directory/profile/article, state/city news, LO, and branch checks. Assert `document.documentElement.scrollWidth <= window.innerWidth`, no clipped text, no overlap, and all primary controls are tappable.

- [ ] **Step 4: Verify accessibility and reduced motion**

Keyboard through navigation, account menu, marketplace controls, expansion tabs, chart legend/details, modal, bylines, and handoff return. Confirm focus visibility, modal focus trap/restore, meaningful alt text, headings, labels, live result updates, touch chart values, and no required information conveyed by color alone.

- [ ] **Step 5: Perform an independent whole-change review**

Generate a review package from the implementation base commit through HEAD. Dispatch `superpowers:requesting-code-review` with the approved spec, implementation plan, validation report, dirty-tree isolation rule, and review package. Fix every Critical or Important finding in one coordinated fix pass, rerun covering tests, then request re-review.

- [ ] **Step 6: Complete the acceptance matrix**

For each of the 38 approved acceptance criteria, record the owning file/function, exact automated test, browser scenario where applicable, and PASS result. Explicitly list simulated/external boundaries: provider data, pricing, licensing, rankings, reviews, Snap account context, provider prequalification destination, auth, backend persistence, CRM/lead routing, and analytics destination.

- [ ] **Step 7: Confirm isolation before final commit**

Run: `git status --short`

Expected: no staged root `index.html`, `site/assets/slot-hero/`, slot-hero screenshots, `.superpowers/`, or unrelated user-owned files. Review `git diff --cached --name-only` before committing.

- [ ] **Step 8: Commit validation evidence**

```powershell
git add -- docs/22-rates-editorial-production-content-validation.md
git commit -m "docs: record rates and editorial validation"
```

## Implementation Order and Review Gates

1. Execute Tasks 1 through 9 in order with a fresh implementer context per task.
2. After each task, review only the task's base-to-head diff against its task brief and Global Constraints.
3. Do not begin a task while its predecessor has unresolved Critical or Important findings.
4. Keep `.superpowers/sdd/progress.md` as the durable local ledger; never stage it.
5. Run the whole-branch review after all task reviews pass.
6. Do not deploy or claim completion until the full suite, browser QA, acceptance matrix, and independent review pass.

## Self-Review Record

- **Spec coverage:** Tasks 1-3 cover all marketplace, state precedence, filtering, result, payment, review, and prequalification requirements. Tasks 4-7 cover contributors, article ownership, production bodies, topic hubs, and location-news attribution. Task 8 covers rendered copy, links, metadata, canonicals, and sitemap. Task 9 covers all static, browser, accessibility, isolation, and independent-review gates.
- **Placeholder scan:** This plan contains no `TBD`, implementation `TODO`, or unspecified error-handling instruction. The literal banned-word list appears only as test input and policy language, never as proposed borrower copy.
- **Type consistency:** Task 1 defines the scenario/adapter functions used by Tasks 2 and 3. Task 4 defines contributor resolution used by Tasks 5-7. Task 5 defines the compiled editorial schema reused by Task 6. Task 7 extends the existing news renderer with one optional `{ author }` argument and preserves existing two-argument callers.
- **Isolation:** The paused homepage hero and unrelated dirty-tree work are excluded from every staging command and verified again in Task 9.

# Seller Workspace Implementation Plan

> **Status:** Partially superseded. Do not execute this plan's freeform value, public-result, short pro forma, account-continuation, or no-download tasks. Use `2026-07-16-seller-net-sheet-account-gate-implementation.md` for the current approved seller experience.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved public `/sell` acquisition page with an address-first modal, editable estimated-proceeds calculator, Snap Homes continuation, and the previously approved shared navigation/home/location cleanup.

**Architecture:** Add a pure seller-domain module for adapter normalization, state-aware assumptions, value-range handling, and integer-cent calculations. Add a separate DOM renderer/controller for the progressive modal and transformed results state. Register `/sell` through the canonical seed, route manifest, static renderer, metadata, sitemap, and Vercel rewrite systems; keep address, file, and financial values in page memory only.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js built-in test runner, JSON fixtures, existing Snap Mortgage route/static-generation systems, and existing account/action modal hooks.

## Global Constraints

- Preserve unrelated dirty worktree changes.
- Do not add real valuation, property-record, upload, OCR, authentication, persistence, CRM, or Snap Homes portal behavior.
- Keep seller address, filename, payoff, value, costs, and proceeds out of URLs, browser storage, generated HTML, and analytics payloads.
- Use integer cents internally and round only for display.
- Keep the full result available without an account.
- Use borrower-facing production copy; do not expose mock, demo, placeholder, or implementation language.
- Keep the approved four-link header: Rates, Learning, Loan Options, Compare Your Offer.
- Use one combined mobile navigation/account menu.
- Preserve crawlable seller education before and after progressive enhancement.

---

### Task 1: Seller Domain Model And Controlled Fixtures

**Files:**
- Create: `site/seller-workspace.mjs`
- Create: `site/seller-workspace.test.mjs`
- Create: `mock-data/seller-workspace-fixtures.json`

**Interfaces:**
- Produces: `createFixtureSellerAdapters(fixture)`, `resolveSellerAssumptions(registry, stateCode)`, `confirmSellerValue(valuation, baseOverride)`, `calculateSellerProceeds(input)`, and `formatSellerCurrency(cents)`.
- Calculation input uses integer cents for value/payoff and normalized assumption rows `{ id, label, mode, value }` where `mode` is `percent` or `fixed`.
- Calculation output exposes `paths.low`, `paths.base`, `paths.high`, itemized base rows, allocation totals, and `kind: "proceeds" | "shortfall"`.

- [ ] **Step 1: Write failing domain tests**

Cover exact-address suggestions, valuation normalization, manual value range preservation, state fallback, percent/fixed costs, fixed row overrides across all paths, cent rounding, reset inputs, and shortfall output.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `node --test site/seller-workspace.test.mjs`

Expected: FAIL because `site/seller-workspace.mjs` does not exist.

- [ ] **Step 3: Implement the pure domain functions**

Use no DOM, storage, fetch, or global state. Validate adapter records and return new objects rather than mutating fixture input.

- [ ] **Step 4: Add controlled fixtures**

Include at least three address suggestions, one California valuation with low/base/high and as-of metadata, one national fallback, California assumptions, and a mock statement extraction result. Keep the source/methodology keys in fixture data.

- [ ] **Step 5: Verify domain tests pass**

Run: `node --test site/seller-workspace.test.mjs`

Expected: all seller domain tests PASS.

### Task 2: Seller Entry, Modal, And Results UI

**Files:**
- Create: `site/seller-workspace-ui.mjs`
- Create: `site/seller-workspace-ui.test.mjs`
- Create: `site/seller-workspace.css`
- Modify: `site/index.html`

**Interfaces:**
- Consumes Task 1 domain functions and adapter contract.
- Produces: `renderSellerWorkspace(page, fixture)` and `wireSellerWorkspace(root, options)`.
- The controller exposes `destroy()` and keeps all private seller data in closure state.
- Account continuation calls injected `openAccount({ mode })`; analytics calls injected `track(name, safePayload)` with stage-only payloads.

- [ ] **Step 1: Write failing markup and interaction-contract tests**

Assert the entry hero CTA, accessible hidden dialog, three steps, address combobox/listbox hooks, value confirmation, file/manual payoff controls, result focus/live-region hooks, low/base/high hierarchy, editable pro forma rows, shortfall copy, Snap Homes actions, seller education, FAQs, sources, and tags.

- [ ] **Step 2: Verify UI tests fail**

Run: `node --test site/seller-workspace-ui.test.mjs`

Expected: FAIL because the UI module does not exist.

- [ ] **Step 3: Implement semantic rendering**

Render entry, modal, and result states from controller state. Use one dialog whose content changes by step. Render no address or financial values into URL-bearing attributes.

- [ ] **Step 4: Implement interactions**

Wire address suggestions with keyboard selection, modal focus trap/restoration, Back/Next/Close, manual value, file selection with suggested payoff, payoff confirmation, calculation, inline Edit/Apply/Cancel, Enter/Escape, reset assumptions, reduced-motion-safe transformation, and account actions.

- [ ] **Step 5: Implement responsive styling**

Match the approved Figma hierarchy at 1440 and 390 pixels. Ensure all touch targets are at least 44 pixels, modal side margins remain visible, the pro forma stacks cleanly, and no horizontal scrollbar appears at 320 pixels.

- [ ] **Step 6: Verify UI tests pass**

Run: `node --test site/seller-workspace-ui.test.mjs`

Expected: all seller UI tests PASS.

### Task 3: Canonical `/sell` Route And Static SEO

**Files:**
- Modify: `mock-data/production-seed.json`
- Modify: `site/app.js`
- Modify: `site/document-metadata.mjs`
- Modify: `site/document-metadata.test.mjs`
- Modify: `site/public-route-manifest.mjs`
- Modify: `site/public-route-manifest.test.mjs`
- Modify: `site/static-route-document.mjs`
- Modify: `site/static-route-document.test.mjs`
- Modify: `site/phase2-static-smoke.mjs`
- Modify: `site/public-content-audit.test.mjs`
- Modify: `vercel.json`

**Interfaces:**
- Add `sellerPages` to canonical seed with `seller-home`, `/sell`, production title/description, updated date, source references, and related routes.
- Register route type `seller` in runtime and static route maps.
- Load `/mock-data/seller-workspace-fixtures.json` optionally at boot and pass it to the seller renderer.

- [ ] **Step 1: Write failing route, metadata, and static-document tests**

Assert one seller singleton, canonical `/sell`, useful title/description, crawlable seller sections, address CTA, four-link static header, related links, and Vercel rewrite ownership.

- [ ] **Step 2: Verify focused tests fail**

Run: `node --test site/public-route-manifest.test.mjs site/document-metadata.test.mjs site/static-route-document.test.mjs site/static-route-rewrites.test.mjs`

Expected: FAIL because `/sell` is not registered.

- [ ] **Step 3: Add seed and route ownership**

Add the seller record, route type, manifest entry/count, runtime map, static context map, and renderer dispatch.

- [ ] **Step 4: Add static seller content and metadata**

The generated document must contain crawlable value, payoff, selling-cost, offer-comparison, closing, FAQ, source, and related-resource copy without private user values.

- [ ] **Step 5: Add Vercel rewrite and smoke ownership**

Map `/sell` to `/site/generated/routes/sell/index.html` and include the route in all canonical/sitemap audits.

- [ ] **Step 6: Verify focused route tests pass**

Run the same focused test command and expect PASS.

### Task 4: Shared Header, Homepage, Map, State Jump, And Rates Input Cleanup

**Files:**
- Modify: `site/app.js`
- Modify: `site/styles.css`
- Modify: `site/rates-marketplace.css`
- Modify: `site/locations-hero.mjs`
- Modify: `site/locations-hero.test.mjs`
- Modify: `site/rates-marketplace-ui.test.mjs`
- Create: `site/shared-navigation.test.mjs`

**Interfaces:**
- Header renders Rates, Learning, Loan Options, and Compare Your Offer.
- Desktop retains visible navigation plus account control.
- Mobile hides desktop navigation and places the four public actions plus account actions in the existing account dropdown; there is no separate navigation toggle.
- Homepage renders `I want to ...` cards including `/sell`, a full-width auto-prequal/offer CTA, and a bottom interactive state map with a collapsed `See state list` details element.

- [ ] **Step 1: Write failing shared UI tests**

Assert four header actions, one hamburger control on mobile markup, Compare Your Offer action hook, six `I want to ...` routes, removed home sections, full-width CTA labels, state-map accordion, state hero `#city-comparison` jump, transparent map surface, and borderless nested currency inputs.

- [ ] **Step 2: Verify tests fail for current markup**

Run: `node --test site/shared-navigation.test.mjs site/locations-hero.test.mjs site/rates-marketplace-ui.test.mjs`

Expected: failures identify the duplicate menu, old homepage sections, state city route, and nested input border.

- [ ] **Step 3: Consolidate header behavior**

Remove the separate `data-nav-toggle` button and listener. Add mobile-only public links inside the account dropdown. Keep outside-click and Escape closing behavior.

- [ ] **Step 4: Update homepage composition**

Remove `Compare with the numbers in view`. Replace `Choose your goal` with a full-width `Start your auto-prequal` and `Compare Your Offer` CTA. Replace `Research with the right context` with six borrower-intent cards. Add the interactive map and collapsed state-link list at the bottom.

- [ ] **Step 5: Repair location and form details**

Make state `See cities` actions jump to `#city-comparison`; apply that ID to the city section. Remove the map's white panel fill. Add a final nested-input rule setting border, radius, background, and box shadow to none so the currency shell owns the only field border.

- [ ] **Step 6: Verify shared UI tests pass**

Run the focused shared UI command and expect PASS.

### Task 5: Search/Tag Integration And Generated Outputs

**Files:**
- Modify: `mock-data/build-tagged-content-search.mjs`
- Modify generated canonical search/tag artifacts through the repository generator
- Generate: `site/generated/routes/sell/index.html`
- Modify generated `site/sitemap.xml`

**Interfaces:**
- Search builder indexes `sellerPages` as production public content.
- `/sell` receives supported controlled tags such as Home Values, Home Equity / HELOC, and borrower-planning/selling-cost terms without creating thin competing pages.

- [ ] **Step 1: Add failing search ownership coverage**

Assert `/sell` is present once in the canonical search index and that assigned tags resolve through the controlled registry.

- [ ] **Step 2: Update the canonical search builder**

Include `sellerPages` in record construction and tag-candidate extraction, using the seller page's substantive coverage and related routes.

- [ ] **Step 3: Run canonical generators**

Run the repository-supported tagged-search generator, static-route generator, and sitemap generator. Inspect generated diffs before retaining them.

- [ ] **Step 4: Verify generated outputs are fresh**

Run: `node mock-data/generate-static-routes.mjs --check`

Expected: generated static route documents are fresh.

### Task 6: Full Verification And Browser QA

**Files:**
- Test all modified and generated files.

**Interfaces:**
- Produces a locally usable `/sell` route and a verification report.

- [ ] **Step 1: Run all repository tests**

Run: `node --test --test-reporter=dot site/*.test.mjs mock-data/*.test.mjs mock-data/tests/*.test.mjs mock-data/location-news/lib/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run static route smoke and whitespace validation**

Run: `node site/phase2-static-smoke.mjs` and `git diff --check`.

Expected: every public route passes and no new whitespace errors appear.

- [ ] **Step 3: Verify in browser at desktop and mobile widths**

Exercise hero CTA, keyboard address suggestions, all modal steps, manual fallback, statement suggestion correction, result transformation, each inline edit path, reset, shortfall, Snap Homes modal, combined mobile menu, homepage seller route, map links, and state city jump.

- [ ] **Step 4: Inspect console and layout**

Confirm zero console errors and no horizontal overflow at 1440x900, 390x844, and 320x700.

- [ ] **Step 5: Report exact outputs**

List changed files, tests, simulated adapters, integration candidates, and any remaining risk. Do not push or deploy without a separate request.

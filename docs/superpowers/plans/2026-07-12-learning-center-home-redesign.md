# Learning Center Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/learning-center` with the approved long-form education hub while preserving the existing header, footer, canonical objects, routes, interactions, and public-copy constraints.

**Architecture:** Add a small pure selector module that derives the page model from canonical seed records, then render the approved sections from that model inside the existing `learningHome()` route. Scope all new presentation rules beneath a Learning Center page class so the shared site shell and unrelated routes retain their current behavior.

**Tech Stack:** Browser-native ES modules, template-literal HTML in `site/app.js`, CSS in `site/styles.css`, Node.js built-in test runner, existing static smoke and copy-guard tests.

## Global Constraints

- Preserve the existing `header()` and `footer()` output and behavior.
- Render exactly one Learning Center search form above the topic tags.
- Use only canonical objects and approved strings already present in `site/app.js` or `mock-data/production-seed.json`.
- Do not create a topic taxonomy, learning-path object, content object, CTA type, CTA copy, promotional classification, editorial copy block, or media object.
- Stop and request explicit user approval if implementation reveals a need for any new canonical object or public string.
- Preserve unrelated working-tree changes; stage only Learning Center-specific hunks if committing implementation work.
- Do not add dependencies or change the static application architecture.

## File Structure

- Create `site/learning-center.mjs`: pure canonical-record selection and de-duplication for the Learning Center home page.
- Create `site/learning-center.test.mjs`: unit tests for topic, featured article, additional article, calculator, and product selection.
- Modify `site/app.js`: import the selector, add page-specific render helpers, and replace `learningHome()` composition without changing the shared header/footer functions.
- Create `site/learning-center-integration.test.mjs`: source-level integration checks for one search form, ordering, shared CTAs, and scoped class hooks.
- Modify `site/styles.css`: Learning Center-only desktop and responsive presentation.

---

### Task 1: Canonical Learning Center Page Model

**Files:**

- Create: `site/learning-center.mjs`
- Create: `site/learning-center.test.mjs`

**Interfaces:**

- Consumes: a seed-shaped object with `blogPages`, `articles`, `calculators`, and `products` arrays.
- Produces: `buildLearningCenterModel(seed)`, returning `{ home, tags, topicCards, featuredArticles, additionalArticles, calculators, loanPaths }`.
- Selection constants: borrower topic cards exclude only `blog-editorial-team`; loan paths use `product-purchase`, `product-refinance`, `product-fha`, and `product-va` in that order.

- [ ] **Step 1: Write failing selector tests**

Create `site/learning-center.test.mjs` with focused fixtures and these assertions:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildLearningCenterModel } from "./learning-center.mjs";

const seed = {
  blogPages: [
    { id: "blog-learning-center-home", route: "/learning-center", featuredArticleIds: ["article-featured", "article-missing"] },
    { id: "blog-buying-a-home", name: "Buying a Home", route: "/learning-center/buying-a-home" },
    { id: "blog-editorial-team", name: "Editorial Team", route: "/learning-center/editorial-team" },
  ],
  articles: [
    { id: "article-featured", title: "Featured", route: "/learning-center/featured" },
    { id: "article-next", title: "Next", route: "/learning-center/next" },
  ],
  calculators: [{ id: "calc-payment", name: "Mortgage Payment Calculator", route: "/calculators/mortgage-payment" }],
  products: [
    { id: "product-va", name: "VA Loans", route: "/loan-options/va-loans" },
    { id: "product-purchase", name: "Home Purchase Loans", route: "/buy" },
    { id: "product-fha", name: "FHA Loans", route: "/loan-options/fha-loans" },
    { id: "product-refinance", name: "Refinance", route: "/refinance" },
    { id: "product-jumbo", name: "Jumbo Loans", route: "/loan-options/jumbo-loans" },
  ],
};

test("builds navigation tags from every canonical topic", () => {
  const model = buildLearningCenterModel(seed);
  assert.deepEqual(model.tags.map(({ id }) => id), ["blog-buying-a-home", "blog-editorial-team"]);
});

test("keeps Editorial Team out of the borrower topic-card grid", () => {
  const model = buildLearningCenterModel(seed);
  assert.deepEqual(model.topicCards.map(({ id }) => id), ["blog-buying-a-home"]);
});

test("resolves featured IDs, skips missing IDs, and de-duplicates additional articles", () => {
  const model = buildLearningCenterModel(seed);
  assert.deepEqual(model.featuredArticles.map(({ id }) => id), ["article-featured"]);
  assert.deepEqual(model.additionalArticles.map(({ id }) => id), ["article-next"]);
});

test("preserves calculators and selects the four approved loan paths in approved order", () => {
  const model = buildLearningCenterModel(seed);
  assert.deepEqual(model.calculators, seed.calculators);
  assert.deepEqual(model.loanPaths.map(({ id }) => id), ["product-purchase", "product-refinance", "product-fha", "product-va"]);
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `node --test site/learning-center.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `site/learning-center.mjs`.

- [ ] **Step 3: Implement the pure selector**

Create `site/learning-center.mjs`:

```js
const LEARNING_HOME_ROUTE = "/learning-center";
const EDITORIAL_TEAM_ID = "blog-editorial-team";
const LOAN_PATH_IDS = ["product-purchase", "product-refinance", "product-fha", "product-va"];

const byId = (items = []) => new Map(items.map((item) => [item.id, item]));

export function buildLearningCenterModel(seed) {
  const blogPages = seed.blogPages || [];
  const articles = seed.articles || [];
  const products = seed.products || [];
  const home = blogPages.find((page) => page.route === LEARNING_HOME_ROUTE) || null;
  const tags = blogPages.filter((page) => page.route !== LEARNING_HOME_ROUTE);
  const articleMap = byId(articles);
  const featuredArticles = (home?.featuredArticleIds || []).map((id) => articleMap.get(id)).filter(Boolean);
  const featuredIds = new Set(featuredArticles.map(({ id }) => id));
  const productMap = byId(products);

  return {
    home,
    tags,
    topicCards: tags.filter((page) => page.id !== EDITORIAL_TEAM_ID),
    featuredArticles,
    additionalArticles: articles.filter((article) => !featuredIds.has(article.id)).slice(0, 3),
    calculators: seed.calculators || [],
    loanPaths: LOAN_PATH_IDS.map((id) => productMap.get(id)).filter(Boolean),
  };
}
```

- [ ] **Step 4: Run selector tests**

Run: `node --test site/learning-center.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the selector unit**

```powershell
git add -- site/learning-center.mjs site/learning-center.test.mjs
git commit -m "test: define canonical learning center model"
```

If unrelated changes prevent a clean isolated commit, leave the verified files unstaged and record that condition in the handoff rather than staging user work.

---

### Task 2: Approved Page Composition and Interactions

**Files:**

- Modify: `site/app.js` at the import block and `learningHome()` section
- Create: `site/learning-center-integration.test.mjs`

**Interfaces:**

- Consumes: `buildLearningCenterModel(data)` from Task 1 and existing helpers `pageShell`, `hero`, `section`, `card`, `icon`, `ctaButton`, `contextualCta`, `route`, `esc`, and `humanStatus`.
- Produces: page-specific helpers `learningDiscovery(model)`, `learningArticleCard(article, index)`, `learningTopicCard(topic, index)`, `learningCalculatorCard(calculator, index)`, and `learningLoanPathCard(product, index)`.
- Preserves: existing `data-search-form`, `data-cta-action`, account modal wiring, History API routing, `header()`, and `footer()`.

- [ ] **Step 1: Write failing source-integration tests**

Create `site/learning-center-integration.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = source.indexOf("function learningDiscovery(");
const end = source.indexOf("function blogTopicPage(");
const learningSource = source.slice(start, end);

test("Learning Center renders one search form before canonical topic links", () => {
  assert.ok(start >= 0, "learningDiscovery helper is missing");
  assert.equal((learningSource.match(/data-search-form/g) || []).length, 1);
  assert.ok(learningSource.indexOf("data-search-form") < learningSource.indexOf("learning-topic-tags"));
});

test("Learning Center uses the canonical model and shared CTA helpers", () => {
  assert.match(learningSource, /buildLearningCenterModel\(data\)/);
  assert.match(learningSource, /ctaButton\("prequal"/);
  assert.match(learningSource, /contextualCta\(/);
  assert.doesNotMatch(learningSource, /popular|trending|credit score|no obligation/i);
});

test("Learning Center keeps the shared shell", () => {
  assert.match(learningSource, /return pageShell\(`/);
  assert.doesNotMatch(learningSource, /<header|<footer/);
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `node --test site/learning-center-integration.test.mjs`

Expected: FAIL because `learningDiscovery()` and the canonical-model import do not exist.

- [ ] **Step 3: Import the canonical selector**

Add to the top of `site/app.js`:

```js
import { buildLearningCenterModel } from "/site/learning-center.mjs";
```

- [ ] **Step 4: Add focused render helpers**

Immediately before `learningHome()`, add helpers that render only canonical record fields. Use this structure:

```js
function learningDiscovery(model) {
  return `
    <section class="learning-discovery section compact" aria-label="Search and browse Learning Center topics">
      <form class="learning-search search-form" data-search-form>
        <input name="query" aria-label="Search learning center" placeholder="Search FHA, taxes, Denver..." />
        <button class="button" type="submit">Search</button>
      </form>
      <nav class="learning-topic-tags tag-row" aria-label="Learning Center topics">
        ${model.tags.map((topic) => `<a class="tag" href="${route(topic.route)}">${esc(topic.name)}</a>`).join("")}
      </nav>
    </section>`;
}

function learningArticleCard(article, index) {
  return card({
    title: article.title,
    text: humanStatus(article.reviewStatus),
    href: article.route,
    iconName: "article",
    accent: accentColors[index % accentColors.length],
    linkLabel: "Read",
  });
}

function learningTopicCard(topic, index) {
  return card({
    title: topic.name,
    text: topic.purpose,
    href: topic.route,
    iconName: "guide",
    accent: accentColors[index % accentColors.length],
    linkLabel: "Open topic",
  });
}

function learningCalculatorCard(calculator, index) {
  return card({
    title: calculator.name,
    text: `Inputs include ${(calculator.captures || []).slice(0, 3).join(", ")}.`,
    href: calculator.route,
    iconName: "calculator",
    accent: accentColors[index % accentColors.length],
    linkLabel: "Calculate",
  });
}

function learningLoanPathCard(product, index) {
  return card({
    title: product.name,
    text: product.borrowerGoal,
    href: product.route,
    iconName: index % 2 ? "rates" : "home",
    accent: accentColors[index % accentColors.length],
    linkLabel: "View guide",
  });
}
```

These strings already exist in shared public templates. Do not add descriptive copy outside these existing labels and canonical fields.

- [ ] **Step 5: Replace `learningHome()` with the approved hierarchy**

Build `const model = buildLearningCenterModel(data)` and return `pageShell()` containing, in order:

```js
hero({
  eyebrow: "Learning center",
  title: "Mortgage education connected to local decisions.",
  lead: "Read market updates, product explainers, tax and insurance guides, calculator walkthroughs, and first-time buyer resources.",
  actions: `<a class="button" href="${route("/learning-center/local-market-updates")}">Market updates</a><a class="button secondary" href="${route("/learning-center/buying-a-home")}">Buying guides</a>`,
  panel: `<aside class="hero-panel visual-panel"><img src="${ASSETS.mortgage}" alt="" /><h2>What you can explore</h2><p>Mortgage topics and guides, current market references, related products and calculators, and local market links.</p></aside>`,
})
```

Then render:

1. `learningDiscovery(model)`.
2. `section("Start a prequalification conversation", ...)` using `ctaButton("prequal")` and existing `CTA_TYPES.prequal.text`.
3. `section("Featured articles", ...)` from `model.featuredArticles`.
4. `section("Topic hubs", ...)` from `model.topicCards`.
5. `section("Calculators", ...)` from `model.calculators`.
6. `section("Helpful next reads", ...)` from `model.additionalArticles`.
7. `section("Loan paths", ...)` from `model.loanPaths`.
8. `section("Ask for mortgage guidance", ...)` using `contextualCta()` and existing `CTA_TYPES.leadForm` values.

Guard each collection section with a length check so empty canonical collections omit the section. Add `learning-center-page` to a page-local wrapper inside `pageShell()`; do not change `pageShell()`, `header()`, or `footer()`.

- [ ] **Step 6: Run unit and integration tests**

Run: `node --test site/learning-center.test.mjs site/learning-center-integration.test.mjs site/public-copy-guard.test.mjs`

Expected: all tests pass, 0 fail.

- [ ] **Step 7: Commit the page composition**

Stage only the Learning Center import and render-helper hunks plus the new integration test:

```powershell
git add -- site/learning-center-integration.test.mjs
git add -p -- site/app.js
git commit -m "feat: compose canonical learning center home"
```

Do not stage unrelated pre-existing `site/app.js` changes. If hunk isolation is unsafe, skip this implementation commit and report the dirty-tree constraint.

---

### Task 3: Scoped Visual System and Responsive Verification

**Files:**

- Modify: `site/styles.css` near the shared hero/card styles and responsive media queries
- Modify: `site/learning-center-integration.test.mjs`

**Interfaces:**

- Consumes: `.learning-center-page`, `.learning-discovery`, `.learning-search`, `.learning-topic-tags`, and the existing `.grid`, `.card`, `.cta-panel`, `.hero-band`, and `.tag` primitives.
- Produces: a reference-inspired, page-scoped layout with desktop shelves and one-column mobile flow.

- [ ] **Step 1: Extend the integration test with CSS scope assertions**

Append:

```js
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("Learning Center styles are scoped and responsive", () => {
  for (const selector of [
    ".learning-center-page",
    ".learning-discovery",
    ".learning-search",
    ".learning-topic-tags",
  ]) {
    assert.ok(styles.includes(selector), `missing ${selector}`);
  }
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.learning-center-page/);
});
```

- [ ] **Step 2: Run the integration test and verify the CSS assertion fails**

Run: `node --test site/learning-center-integration.test.mjs`

Expected: FAIL with `missing .learning-center-page`.

- [ ] **Step 3: Add desktop Learning Center styles**

Add a dedicated block beneath the shared tag styles. Scope every rule under `.learning-center-page`. The block must:

- Give the page a compact reference-inspired vertical rhythm.
- Constrain `.learning-discovery` to the existing content width.
- Render `.learning-search` as one horizontal field/button row with no duplicate hero search.
- Place `.learning-topic-tags` immediately below the search and style tag links with visible hover/focus states.
- Use existing `.grid.three` and `.grid.four` primitives for shelves, adding only page-scoped spacing and card-height alignment.
- Keep CTA styling on the shared `.cta-panel` and `.button` system.
- Avoid selectors that target `.site-header` or `.site-footer`.

The core rules should follow this shape:

```css
.learning-center-page {
  padding-bottom: 24px;
  background: linear-gradient(180deg, #f7fbff 0, var(--surface) 460px);
}

.learning-center-page .learning-discovery {
  display: grid;
  gap: 14px;
  padding-top: 24px;
  padding-bottom: 24px;
}

.learning-center-page .learning-search {
  grid-template-columns: minmax(0, 1fr) auto;
  width: 100%;
  margin: 0;
}

.learning-center-page .learning-topic-tags {
  justify-content: center;
}

.learning-center-page .learning-topic-tags .tag {
  min-height: 36px;
  padding-inline: 14px;
  color: var(--snap-blue);
  text-decoration: none;
}

.learning-center-page .learning-topic-tags .tag:hover,
.learning-center-page .learning-topic-tags .tag:focus-visible {
  border-color: var(--snap-blue);
  background: var(--blue);
}

.learning-center-page .section.compact {
  padding-top: 30px;
  padding-bottom: 30px;
}

.learning-center-page .card {
  height: 100%;
}
```

- [ ] **Step 4: Add responsive rules**

Inside the existing `@media (max-width: 760px)` block, add:

```css
.learning-center-page .learning-search {
  grid-template-columns: 1fr;
}

.learning-center-page .learning-topic-tags {
  justify-content: flex-start;
}

.learning-center-page .learning-topic-tags .tag {
  max-width: 100%;
}
```

Use the existing responsive grid collapse for `.grid.two`, `.grid.three`, and `.grid.four`. Do not add horizontal scrolling.

- [ ] **Step 5: Run focused tests**

Run: `node --test site/learning-center.test.mjs site/learning-center-integration.test.mjs site/public-copy-guard.test.mjs`

Expected: all tests pass, 0 fail.

- [ ] **Step 6: Run the full static suite**

Run: `node --test site/*.test.mjs mock-data/tests/*.test.mjs`

Expected: all discovered tests pass, 0 fail.

Run: `node site/phase2-static-smoke.mjs`

Expected: `Phase 2 static smoke checks passed.`

- [ ] **Step 7: Perform browser verification**

Serve the repo with the existing local static-server workflow and inspect `/learning-center` at desktop and mobile widths. Verify:

- Existing header and footer match other routes.
- One search bar appears above the canonical topic tags.
- Search submission still navigates to canonical matches or `/learning-center/search`.
- Featured order is Austin, Florida insurance, FHA basics.
- Topic grid excludes Editorial Team; tag row includes it.
- Calculator shelf shows all five canonical calculators.
- Additional reads do not repeat featured articles.
- Loan-path shelf shows Home Purchase Loans, Refinance, FHA Loans, and VA Loans in that order.
- Existing CTA modals open from prequalification and guidance actions.
- Mobile has no horizontal overflow and maintains visible keyboard focus.

- [ ] **Step 8: Commit isolated style and test hunks**

```powershell
git add -- site/learning-center-integration.test.mjs
git add -p -- site/styles.css
git commit -m "style: redesign learning center discovery hub"
```

Do not stage unrelated pre-existing `site/styles.css` changes. If safe hunk isolation is unavailable, leave implementation changes uncommitted and report exactly which verification commands passed.


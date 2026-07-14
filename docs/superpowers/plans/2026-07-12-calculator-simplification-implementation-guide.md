# Calculator Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Snap Mortgage calculator IA and page layout while preserving product-program selection inside calculator forms.

**Architecture:** Keep the existing static SPA architecture. Add a dedicated calculator hub renderer for `/calculators`, remove the standalone VA refinance calculator from seed/presets, make individual calculator pages use a light hero followed immediately by the calculator body, and move related calculator cards to the bottom of each calculator page.

**Tech Stack:** Vanilla JavaScript SPA in `site/app.js`, CSS in `site/styles.css`, JSON seed data in `mock-data/*.json`, Vercel static deployment.

## Global Constraints

- Do not introduce a new framework.
- Do not redesign the chart component in this pass.
- Do not add a guided calculator chooser in this pass.
- Do not remove product program selection from calculator forms.
- Do not keep `/calculators/va-refinance` as a standalone calculator route.
- Preserve existing route validation and public-copy tests.
- Keep unrelated docs and existing dirty work untouched.

---

### Task 1: Replace the generic calculators directory with a simple hub

**Files:**
- Modify: `site/app.js`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: `data.calculators`, `route()`, `esc()`, `pageShell()`, `breadcrumb()`, `section()`, `card()`
- Produces: `calculatorsHubPage(directory)` renderer and `.calculator-hub-grid` styles

- [ ] **Step 1: Add a `calculatorsHubPage(directory)` function**

Add a renderer that returns:

```js
function calculatorsHubPage(directory) {
  const calculators = data.calculators.filter((calculator) => calculator.id !== "calc-va-refinance");
  return pageShell(`
    ${breadcrumb(["Calculators"], ["/calculators"])}
    <section class="section calculator-hub-hero">
      <div class="section-header">
        <div>
          <span class="eyebrow">Calculators</span>
          <h1>${esc(directory?.name || "Mortgage calculators")}</h1>
          <p>Choose a calculator, enter visible assumptions, and compare product-aware estimates before a licensed review.</p>
        </div>
      </div>
      <div class="calculator-hub-grid">
        ${calculators.map((calculator, index) => calculatorHubCard(calculator, index)).join("")}
      </div>
    </section>
  `);
}
```

- [ ] **Step 2: Add `calculatorHubCard(calculator, index)`**

Use the existing `calculatorPresets` content:

```js
function calculatorHubCard(calculator, index) {
  const preset = calculatorPresets[calculator.id] || calculatorPresets["calc-payment"];
  return `<a class="calculator-hub-card" href="${route(calculator.route)}">
    <span class="icon-bubble" style="--accent:${accentColors[index % accentColors.length]}">${icon("calculator")}</span>
    <span class="calculator-hub-card-copy">
      <strong>${esc(calculator.name)}</strong>
      <small>${esc(preset.explainer)}</small>
      <em>${esc(calculator.captures.slice(0, 5).join(" • "))}</em>
    </span>
  </a>`;
}
```

- [ ] **Step 3: Route `/calculators` to the new renderer**

In `renderRoute()`, before the generic directory branch, add a special case:

```js
else if (found.type === "directory" && found.item.route === "/calculators") html = calculatorsHubPage(found.item);
```

- [ ] **Step 4: Add hub CSS**

Add styles:

```css
.calculator-hub-hero {
  padding-top: 44px;
}

.calculator-hub-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.calculator-hub-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  min-height: 150px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: linear-gradient(180deg, #fff, #f7fbff);
  color: var(--ink);
  text-decoration: none;
  box-shadow: var(--shadow-soft);
}

.calculator-hub-card:hover {
  border-color: rgba(11, 85, 255, 0.42);
  transform: translateY(-1px);
}

.calculator-hub-card-copy {
  display: grid;
  gap: 8px;
}

.calculator-hub-card strong {
  font-size: 20px;
}

.calculator-hub-card small {
  color: var(--muted);
  line-height: 1.45;
}

.calculator-hub-card em {
  color: var(--ink-soft);
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 5: Verify syntax**

Run:

```powershell
node --check site\app.js
```

Expected: exit code 0.

---

### Task 2: Remove the standalone VA refinance calculator route

**Files:**
- Modify: `mock-data/production-seed.json`
- Modify: `mock-data/prototype-seed.json`
- Modify: `site/app.js`
- Regenerate: `mock-data/market-chart-fixtures.json`

**Interfaces:**
- Consumes: calculator seed arrays and product `relatedCalculatorIds`
- Produces: no `calc-va-refinance` route; refinance page supports VA internally

- [ ] **Step 1: Remove `calc-va-refinance` records**

In both seed files:

- Change top-level metadata `calculators` from `6` to `5`.
- Delete the calculator object with `"id": "calc-va-refinance"`.

- [ ] **Step 2: Replace product references**

In both seed files:

- Replace `calc-va-refinance` references in `relatedCalculatorIds` with `calc-refinance`.
- Remove duplicates if the array already contains `calc-refinance`.

- [ ] **Step 3: Remove the `calc-va-refinance` preset**

In `site/app.js`, delete the `"calc-va-refinance"` entry from `calculatorPresets`.

- [ ] **Step 4: Add refinance type field**

In the `"calc-refinance"` preset fields, add:

```js
["Refinance type", "refinanceType", "text", "VA streamline / IRRRL style"]
```

This preserves VA refinance as an internal option without a standalone route.

- [ ] **Step 5: Update refinance result copy**

In the refinance branch of the submit handler, read:

```js
const refinanceType = form.get("refinanceType")?.toString() || "standard refinance";
```

Include it in `note`:

```js
note = savings > 0 ? `${product.label} ${refinanceType} module shows an approximate $${Math.round(savings).toLocaleString()} monthly reduction. Estimated breakeven: ${Math.max(Math.ceil(closingCosts / savings), 1)} months.` : `${product.label} ${refinanceType} module does not show a lower principal-and-interest payment.`;
```

- [ ] **Step 6: Regenerate chart fixtures**

Run:

```powershell
node mock-data\generate-market-chart-fixtures.mjs
```

Expected: updates `mock-data/market-chart-fixtures.json` with one fewer calculator fixture than before.

- [ ] **Step 7: Verify no stale references**

Run:

```powershell
rg -n "calc-va-refinance|/calculators/va-refinance" site mock-data
```

Expected: no matches.

---

### Task 3: Simplify individual calculator page layout

**Files:**
- Modify: `site/app.js`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: `calculatorPage(calc)`, `productToggleGroup(preset)`, `relatedProducts`, `data.calculators`
- Produces: light hero, calculator body without left rail, related calculator cards near bottom

- [ ] **Step 1: Replace heavy hero + editorial intro**

In `calculatorPage(calc)`, remove the existing `hero({ ... })` and `editorialSection({ ... })` blocks.

Replace them with:

```js
<section class="section calculator-page-intro">
  ${breadcrumb(["Calculators", calc.name], ["/calculators", calc.route])}
  <span class="eyebrow">Calculator</span>
  <h1>${esc(calc.name)}</h1>
  <p>${esc(preset.explainer)}</p>
</section>
```

- [ ] **Step 2: Remove persistent left rail**

Inside the calculator section, remove:

```js
<div class="calculator-type-rail" aria-label="Calculator pages">
  ${calculatorTypeCards(calc.id)}
</div>
```

Change wrapper class from `longform-calculator-shell` to `calculator-workspace`.

- [ ] **Step 3: Add related calculator cards at bottom**

Create:

```js
function relatedCalculatorCards(activeId) {
  return data.calculators
    .filter((calculator) => calculator.id !== activeId && calculator.id !== "calc-va-refinance")
    .slice(0, 4)
    .map((calculator, index) => card({
      title: calculator.name,
      text: (calculatorPresets[calculator.id] || calculatorPresets["calc-payment"]).explainer,
      href: calculator.route,
      iconName: "calculator",
      accent: accentColors[index % accentColors.length],
      linkLabel: "View calculator"
    }))
    .join("");
}
```

Render it after product logic / interpretation:

```js
${section("Related calculators", { label: "More tools", text: "Compare another question with the same visible-assumption approach." }, `<div class="grid four">${relatedCalculatorCards(calc.id)}</div>`, "compact")}
```

- [ ] **Step 4: Add simplified page CSS**

Add:

```css
.calculator-page-intro {
  padding-top: 42px;
  padding-bottom: 20px;
}

.calculator-page-intro .breadcrumb {
  width: auto;
  margin: 0 0 18px;
  padding: 0;
}

.calculator-page-intro h1 {
  max-width: 780px;
  margin-bottom: 10px;
}

.calculator-page-intro p {
  max-width: 760px;
  color: var(--muted);
  font-size: 18px;
}

.calculator-workspace {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(340px, 0.9fr);
  gap: 18px;
  align-items: start;
}
```

Update responsive rules so `.calculator-workspace` collapses to one column at `max-width: 1040px`.

- [ ] **Step 5: Remove unused rail CSS if no longer referenced**

If `rg -n "calculator-type-rail|calculatorTypeCards"` only finds dead definitions/styles, remove:

- `calculatorTypeCards`
- `.calculator-type-rail`
- `.calculator-type-card` styles

- [ ] **Step 6: Verify syntax**

Run:

```powershell
node --check site\app.js
```

Expected: exit code 0.

---

### Task 4: Full validation and deployment

**Files:**
- Validate all modified files.
- Deploy current project if validation passes.

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: verified and deployed static site

- [ ] **Step 1: Run focused validation**

Run:

```powershell
node --check site\app.js
node site\phase2-static-smoke.mjs
node site\public-copy-guard.test.mjs
node site\market-charts.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 2: Run remaining lightweight tests**

Run:

```powershell
node site\campaign-hero.test.mjs
node site\location-news-integration.test.mjs
node site\us-state-map.test.mjs
node site\news-renderer.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 3: Deploy production**

Run:

```powershell
corepack pnpm dlx vercel --prod --yes
```

Expected: Vercel reports `ready` production deployment.

- [ ] **Step 4: Re-alias the requested URL if needed**

If Vercel promotes a generated alias rather than the requested URL, run:

```powershell
corepack pnpm dlx vercel alias set <new-deployment-url> mortgage-website-platform-plan-thinkwhale.vercel.app --scope thinkwhale
```

Expected: Vercel reports the alias now points to the new deployment.

# Seller Net Sheet Account Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing public `/sell` workspace with bounded property-value selection, pre-gate obligations, a simulated Snap Homes account unlock, a detailed editable seller net sheet, and a direct PDF download.

**Architecture:** Keep the existing address and valuation adapters, but replace the broad assumption model with a jurisdiction-aware cost registry and a pure integer-cent net-sheet calculator. The UI owns an explicit `entry -> locked -> unlocked` state machine and does not calculate or render costs/proceeds before the account callback resolves. A separate PDF module consumes the same unlocked calculation model so webpage and download cannot drift.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js built-in test runner, controlled JSON fixtures, vendored `pdf-lib` 1.17.1 ESM bundle, existing Snap Mortgage runtime/static generators, and existing account-modal hooks.

## Global Constraints

- Preserve unrelated dirty worktree changes.
- Follow `docs/superpowers/specs/2026-07-16-seller-net-sheet-account-gate-design.md`; it supersedes conflicting seller-workspace decisions.
- Do not implement real valuation, address lookup, authentication, account creation, persistence, document upload, CRM routing, lead storage, or Snap Homes portal behavior.
- Keep the selected property value visible before the account handoff.
- Do not calculate for rendering, serialize, or place any selling-cost or proceeds value in the locked DOM.
- Keep address, values, obligations, dates, overrides, PDF data, and unlock state in page memory only.
- Do not place private seller inputs in URLs, generated HTML, localStorage, sessionStorage, cookies, or analytics payloads.
- Use integer cents internally and round each calculated cost row once before summing it.
- Value selection uses a native range input bounded by the valuation low/high values with a `$1,000` step.
- Missing valuation asks for another address; there is no freeform property-value fallback.
- Optional/non-applicable rows remain hidden until `Add another cost` is used.
- Low/high use the same rates, fixed amounts, obligations, and close date as selected value; only sale price changes.
- Show the approved disclaimer once at the bottom of the web net sheet and once in the PDF.
- Use borrower-facing production copy; no demo, mock, placeholder, wireframe, scaffolding, or instructional implementation language may appear in the UI.
- Keep the canonical `/sell` route, crawlable seller education, controlled tags, shared four-link header, and combined mobile menu.
- Do not push or deploy without a separate explicit request.

---

## File Map

**Domain and data**

- Modify `site/seller-workspace.mjs`: value selection, obligation normalization, registry resolution, cost formulas, scenario calculation, and formatting.
- Modify `site/seller-workspace.test.mjs`: pure domain coverage.
- Modify `mock-data/seller-workspace-fixtures.json`: location keys, annual-tax basis, valuation metadata, and statement suggestion only.
- Create `mock-data/seller-cost-registry.json`: controlled cost rows, formulas, optional catalog, source ledger, and jurisdiction overrides.
- Create `mock-data/seller-cost-registry.test.mjs`: schema, ID, source, and jurisdiction validation.

**User experience**

- Modify `site/seller-workspace-ui.mjs`: three-step input flow, locked state, async account unlock, net sheet, editing, optional rows, and download control.
- Modify `site/seller-workspace-ui.test.mjs`: locked/unlocked markup, copy, field type, and privacy contracts.
- Modify `site/seller-workspace.css`: slider, lock panel, grouped net sheet, editing states, optional-cost selector, responsive layout, print/download feedback.
- Modify `site/app.js`: load the cost registry and return a completed simulated account-handoff result.

**PDF**

- Create `site/seller-net-sheet-pdf.mjs`: printable document model, PDF bytes, filename, and browser download.
- Create `site/seller-net-sheet-pdf.test.mjs`: document lines, filename, valid PDF bytes, metadata, and page count.
- Create `site/vendor/pdf-lib.esm.min.js`: pinned `pdf-lib` 1.17.1 ESM distribution.
- Create `site/vendor/pdf-lib-LICENSE.md`: upstream MIT license.

**Canonical/static output**

- Modify `mock-data/production-seed.json`: borrower-facing seller copy and updated source references where the old public-result promise remains.
- Modify `site/static-route-document.mjs`: crawlable seller copy and locked-analysis category preview without private values.
- Modify `site/static-route-document.test.mjs`: static privacy/copy assertions.
- Modify `site/public-copy-guard.test.mjs`: reject superseded seller wording.
- Regenerate `site/generated/routes/sell/index.html` through the canonical generator.

---

### Task 1: Replace The Seller Domain With A Net-Sheet Calculator

**Files:**
- Modify: `site/seller-workspace.mjs`
- Modify: `site/seller-workspace.test.mjs`
- Modify: `mock-data/seller-workspace-fixtures.json`
- Create: `mock-data/seller-cost-registry.json`
- Create: `mock-data/seller-cost-registry.test.mjs`

**Interfaces:**
- Preserves: `createFixtureSellerAdapters(fixture)` and `formatSellerCurrency(cents)`.
- Replaces UI use of `confirmSellerValue` with `selectSellerValue(valuation, requestedCents, stepCents = 100000)`.
- Replaces UI use of `resolveSellerAssumptions` with `resolveSellerCostRows(registry, location)`, where `location` is `{ stateCode, countyKey, cityKey, annualPropertyTaxCents }` and proration rows are materialized with an integer `annualCents` value.
- Replaces UI use of `calculateSellerProceeds` with `calculateSellerNetSheet(input)`.
- Produces: `defaultExpectedCloseDate(now)`, `normalizeSellerObligations(input)`, `prorateAnnualCents(input)`, and `calculateStatutoryTransferTax(input)`.

The normalized calculation input is:

```js
{
  valueRange: { lowCents, selectedCents, highCents, stepCents },
  obligations: {
    firstMortgageCents,
    secondMortgageHelocCents,
    otherLiensCents
  },
  expectedClosingDate: "YYYY-MM-DD",
  costRows,
  activeOptionalIds: [],
  overrides: {
    [rowId]: { mode: "fixed_amount" | "percent_of_sale_price", value: Number }
  }
}
```

The normalized result is:

```js
{
  selectedSalePriceCents,
  groups: {
    sellingExpenses: [{ id, label, amountCents, mode, optional, isOverride }],
    obligations: [{ id, label, amountCents, mode, optional, isOverride }]
  },
  totalSellingExpensesCents,
  netBeforeObligationsCents,
  totalObligationsCents,
  projected: { kind: "proceeds" | "shortfall", amountCents },
  scenarios: {
    low: { salePriceCents, kind, amountCents },
    selected: { salePriceCents, kind, amountCents },
    high: { salePriceCents, kind, amountCents }
  }
}
```

- [ ] **Step 1: Write failing range, obligation, formula, and scenario tests**

Add these concrete cases to `site/seller-workspace.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSellerNetSheet,
  calculateStatutoryTransferTax,
  defaultExpectedCloseDate,
  normalizeSellerObligations,
  prorateAnnualCents,
  resolveSellerCostRows,
  selectSellerValue,
} from "./seller-workspace.mjs";

test("selectSellerValue clamps and snaps to the valuation range", () => {
  const valuation = { lowCents: 69_500_000, baseCents: 72_500_000, highCents: 75_500_000 };
  assert.deepEqual(selectSellerValue(valuation), {
    lowCents: 69_500_000,
    selectedCents: 72_500_000,
    highCents: 75_500_000,
    stepCents: 100_000,
  });
  assert.equal(selectSellerValue(valuation, 72_560_000).selectedCents, 72_600_000);
  assert.equal(selectSellerValue(valuation, 1).selectedCents, 69_500_000);
  assert.equal(selectSellerValue(valuation, 99_999_999).selectedCents, 75_500_000);
});

test("defaultExpectedCloseDate is thirty local calendar days later", () => {
  assert.equal(defaultExpectedCloseDate(new Date("2026-07-16T12:00:00-07:00")), "2026-08-15");
});

test("normalizeSellerObligations accepts explicit zero balances", () => {
  assert.deepEqual(normalizeSellerObligations({
    firstMortgageCents: 41_800_000,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  }), {
    firstMortgageCents: 41_800_000,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  });
});

test("San Diego transfer tax uses 55 cents per 500 dollars or fraction", () => {
  assert.equal(calculateStatutoryTransferTax({
    taxableCents: 72_500_000,
    incrementCents: 50_000,
    rateCentsPerIncrement: 55,
  }), 79_750);
});

test("annual proration uses UTC calendar days and the closing date", () => {
  assert.equal(prorateAnnualCents({
    annualCents: 870_000,
    periodStartDate: "2026-07-01",
    closingDate: "2026-08-15",
  }), 107_260);
});

test("low selected and high scenarios reuse the same assumptions", () => {
  const result = calculateSellerNetSheet({
    valueRange: { lowCents: 69_500_000, selectedCents: 72_500_000, highCents: 75_500_000, stepCents: 100_000 },
    obligations: { firstMortgageCents: 41_800_000, secondMortgageHelocCents: 2_000_000, otherLiensCents: 500_000 },
    expectedClosingDate: "2026-08-15",
    activeOptionalIds: [],
    overrides: {},
    costRows: [
      { id: "listing", group: "sellingExpenses", label: "Listing-side compensation", mode: "percent_of_sale_price", value: 0.025, optional: false },
      { id: "settlement", group: "sellingExpenses", label: "Seller title, escrow, and settlement services", mode: "fixed_amount", value: 725_000, optional: false },
    ],
  });
  assert.equal(result.scenarios.low.amountCents, 22_737_500);
  assert.equal(result.scenarios.selected.amountCents, 25_662_500);
  assert.equal(result.scenarios.high.amountCents, 28_587_500);
  assert.equal(result.totalSellingExpensesCents, 2_537_500);
  assert.equal(result.totalObligationsCents, 44_300_000);
});
```

- [ ] **Step 2: Run the focused tests and verify the new exports fail**

Run:

```powershell
node --test site/seller-workspace.test.mjs
```

Expected: FAIL because the new functions are not exported.

- [ ] **Step 3: Create the controlled cost registry and its validator test**

Create `mock-data/seller-cost-registry.json` with these exact row IDs and defaults:

```json
{
  "version": 1,
  "reviewedAt": "2026-07-16",
  "defaultRows": [
    { "id": "sellerTitleEscrowSettlement", "group": "sellingExpenses", "label": "Seller title, escrow, and settlement services", "mode": "percent_of_sale_price", "value": 0.01, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable planning assumption", "asOf": "2026-07-16" },
    { "id": "listingCompensation", "group": "sellingExpenses", "label": "Listing-side compensation", "mode": "percent_of_sale_price", "value": 0.025, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable negotiated assumption", "asOf": "2026-07-16" },
    { "id": "buyerAgentCompensation", "group": "sellingExpenses", "label": "Buyer-agent compensation", "mode": "percent_of_sale_price", "value": 0.025, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable negotiated assumption", "asOf": "2026-07-16" },
    { "id": "buyerClosingCostCredit", "group": "sellingExpenses", "label": "Buyer closing-cost credit", "mode": "fixed_amount", "value": 0, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable planning assumption", "asOf": "2026-07-16" },
    { "id": "inspectionRepairs", "group": "sellingExpenses", "label": "Inspection and negotiated repairs", "mode": "percent_of_sale_price", "value": 0.01, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable planning assumption", "asOf": "2026-07-16" },
    { "id": "otherSellerCosts", "group": "sellingExpenses", "label": "Other seller costs", "mode": "fixed_amount", "value": 0, "optional": false, "sourceType": "configured_assumption", "sourceLabel": "Editable planning assumption", "asOf": "2026-07-16" },
    { "id": "propertyTaxProration", "group": "obligations", "label": "Property-tax proration", "mode": "prorated_annual", "valueKey": "annualPropertyTaxCents", "periodStartMonthDay": "07-01", "optional": false, "sourceType": "property_fixture", "sourceLabel": "Property tax planning basis", "sourceUrl": "https://www.boe.ca.gov/lawguides/property/current/ptlg/annt/170-0087.html", "asOf": "2026-07-16" }
  ],
  "optionalRows": [
    { "id": "municipalTransferTax", "group": "sellingExpenses", "label": "Municipal transfer tax", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "hoaClosingPackage", "group": "sellingExpenses", "label": "HOA resale or closing package", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "survey", "group": "sellingExpenses", "label": "Survey", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "termitePest", "group": "sellingExpenses", "label": "Termite or pest inspection and repairs", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "fhaVaSellerCosts", "group": "sellingExpenses", "label": "FHA or VA required seller costs", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "homeWarranty", "group": "sellingExpenses", "label": "Home warranty", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "attorneyLegal", "group": "sellingExpenses", "label": "Attorney or legal fees", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "radon", "group": "sellingExpenses", "label": "Radon retest or mitigation", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "wellSeptic", "group": "sellingExpenses", "label": "Well and septic inspection", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "pastDueMortgage", "group": "obligations", "label": "Past-due mortgage or equity-loan payments", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "hoaPastDue", "group": "obligations", "label": "HOA past-due assessments", "mode": "fixed_amount", "value": 0, "optional": true },
    { "id": "otherObligations", "group": "obligations", "label": "Other obligations", "mode": "fixed_amount", "value": 0, "optional": true }
  ],
  "jurisdictions": {
    "CA:SAN-DIEGO": {
      "rows": [
        { "id": "stateCountyTransferTax", "group": "sellingExpenses", "label": "State and county transfer tax", "mode": "statutory_transfer_tax", "incrementCents": 50000, "rateCentsPerIncrement": 55, "taxableBase": "sale_price", "optional": false, "sourceType": "official", "sourceLabel": "San Diego County Recorder documentary transfer tax", "sourceUrl": "https://www.sdarcc.gov/content/arcc/home/divisions/recorder-clerk/recording.html", "asOf": "2026-07-16" }
      ]
    }
  }
}
```

In `mock-data/seller-cost-registry.test.mjs`, assert unique IDs, allowed groups/modes, integer-cent fixed values, positive statutory increments/rates, ISO dates, source URLs for official/statutory rows, and no compensation row with `sourceType: "official"`.

- [ ] **Step 4: Verify the registry test fails before validation support is complete**

Run:

```powershell
node --test mock-data/seller-cost-registry.test.mjs
```

Expected: FAIL until the JSON and every required field are present.

- [ ] **Step 5: Implement the pure domain functions**

Use these mode names exactly:

```js
const COST_MODES = new Set([
  "percent_of_sale_price",
  "fixed_amount",
  "statutory_transfer_tax",
  "prorated_annual",
  "customer_entered",
]);
```

Implement range snapping relative to `lowCents`, UTC date proration, ceiling-based statutory transfer tax, jurisdiction resolution in `city -> county -> state -> default` order, optional-row filtering, fixed/percentage overrides, grouped rows, and one selected plus low/high scenario result. When a resolved row has `mode: "prorated_annual"`, replace its `valueKey` with `annualCents: location[row.valueKey]` before returning it. Do not call browser APIs from this module.

Update the Harbor View fixture with:

```json
{
  "countyKey": "SAN-DIEGO",
  "cityKey": "SAN-DIEGO",
  "annualPropertyTaxCents": 870000
}
```

Add equivalent controlled `countyKey`, `cityKey`, and `annualPropertyTaxCents` values to the Austin and Orlando fixtures. Remove `assumptionRegistry` from `seller-workspace-fixtures.json`; it is replaced by the new registry file.

- [ ] **Step 6: Run the domain and registry tests**

Run:

```powershell
node --test site/seller-workspace.test.mjs mock-data/seller-cost-registry.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the domain unit**

```powershell
git add site/seller-workspace.mjs site/seller-workspace.test.mjs mock-data/seller-workspace-fixtures.json mock-data/seller-cost-registry.json mock-data/seller-cost-registry.test.mjs
git commit -m "feat: add seller net sheet calculations"
```

### Task 2: Replace Freeform Value With The Slider And Collect Obligations

**Files:**
- Modify: `site/seller-workspace-ui.mjs`
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace.css`

**Interfaces:**
- `renderSellerWorkspace(page, fixture, options)` additionally consumes `options.costRegistry`.
- Test/visual preview values become `entry`, `value`, `obligations`, `locked`, and `unlocked`.
- UI state uses `phase: "entry" | "locked" | "unlocked"` and `dialogStep: "address" | "value" | "obligations"`.
- The locked state contains `netSheet: null` and `analysisUnlocked: false`.

At the top of `site/seller-workspace-ui.test.mjs`, load the new registry beside the existing fixture:

```js
const costRegistry = JSON.parse(fs.readFileSync(
  path.join(siteDir, "..", "mock-data", "seller-cost-registry.json"),
  "utf8",
));
```

- [ ] **Step 1: Write failing markup tests for the value and obligation steps**

Add exact assertions:

```js
test("value step uses a bounded native range without manual value entry", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "value", costRegistry });
  assert.match(html, /type="range"/);
  assert.match(html, /min="69500000"/);
  assert.match(html, /max="75500000"/);
  assert.match(html, /step="100000"/);
  assert.match(html, />Use this value</);
  assert.doesNotMatch(html, /Enter my own value|name="value" inputmode="decimal"/);
});

test("obligations step collects balances and a close date before the gate", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "obligations", costRegistry });
  assert.match(html, /name="firstMortgage"/);
  assert.match(html, /name="secondMortgageHeloc"/);
  assert.match(html, /name="otherLiens"/);
  assert.match(html, /name="expectedClosingDate" type="date"/);
  assert.match(html, /Select mortgage statement/);
});

test("missing valuation copy asks for another address", () => {
  const source = fs.readFileSync(path.join(siteDir, "seller-workspace-ui.mjs"), "utf8");
  assert.match(source, /try another address/i);
  assert.doesNotMatch(source, /Enter your own value to continue/i);
});
```

- [ ] **Step 2: Run the UI test and verify it fails on the old controls**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: FAIL because the current value step contains `Enter my own value` and the current final step has only one payoff field.

- [ ] **Step 3: Implement the value slider**

Replace `renderValueStep` with a native range control using integer-cent attributes and a visible currency output:

```html
<output data-seller-selected-value for="seller-value-range">$725,000</output>
<input id="seller-value-range" type="range"
  min="69500000" max="75500000" step="100000" value="72500000"
  data-seller-value-range />
<div class="seller-value-endpoints">
  <span>Low <strong>$695,000</strong></span>
  <span>High <strong>$755,000</strong></span>
</div>
<button class="button" type="button" data-seller-use-value>Use this value</button>
```

On `input`, update only `state.valueRange.selectedCents` and the live `<output>`. On `Use this value`, advance to `obligations`. Remove `valueEditOpen`, the freeform value form, and the manual-valuation fallback.

- [ ] **Step 4: Implement the obligation form and runtime close-date default**

Render the four approved fields. Keep the statement selector above first mortgage as an optional population path. Currency wrappers own one border; nested inputs have no second border.

On submit, normalize all three balances, validate the date, set `phase = "locked"`, set `analysisUnlocked = false`, leave `netSheet = null`, close the dialog, clear the file reference, redraw, and focus `[data-seller-locked-summary]`.

Do not call `calculateSellerNetSheet` in this submit path.

- [ ] **Step 5: Style desktop, mobile, keyboard, and reduced-motion states**

Add stable slider dimensions, a 44-pixel minimum thumb target, visible focus, fixed endpoint layout, stacked mobile fields, and no horizontal overflow at 320 pixels. Use the native input; do not implement a pointer-drag system in JavaScript.

- [ ] **Step 6: Run the focused UI tests**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs site/seller-workspace.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the input-flow unit**

```powershell
git add site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs site/seller-workspace.css
git commit -m "feat: add seller value and obligation flow"
```

### Task 3: Add The Honest Locked State And Simulated Account Unlock

**Files:**
- Modify: `site/seller-workspace-ui.mjs`
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace.css`
- Modify: `site/app.js`

**Interfaces:**
- `openAccount({ mode, intent })` returns `Promise<{ status: "completed" }>`.
- `mode` is `open` for logged-in sessions and `create` for logged-out sessions.
- The UI calculates the first net sheet only after receiving `{ status: "completed" }`.

- [ ] **Step 1: Write failing locked-state privacy tests**

```js
test("locked seller analysis exposes value but not calculated costs or proceeds", () => {
  const html = renderSellerWorkspace(page, fixture, {
    preview: "locked",
    isLoggedIn: false,
    costRegistry,
  });
  assert.match(html, /data-seller-locked-summary/);
  assert.match(html, /\$725,000/);
  assert.match(html, />Create My Account</);
  assert.doesNotMatch(html, /data-seller-net-sheet|data-seller-projected-result|data-seller-download/);
  assert.doesNotMatch(html, /filter:\s*blur|aria-hidden="true"[^>]*data-seller-cost/);
});

test("logged-in locked state uses the account action", () => {
  const html = renderSellerWorkspace(page, fixture, {
    preview: "locked",
    isLoggedIn: true,
    costRegistry,
  });
  assert.match(html, />Open My Account</);
  assert.doesNotMatch(html, />Create My Account</);
});

test("unlocked preview alone contains the net sheet", () => {
  const locked = renderSellerWorkspace(page, fixture, { preview: "locked", costRegistry });
  const unlocked = renderSellerWorkspace(page, fixture, { preview: "unlocked", costRegistry });
  assert.doesNotMatch(locked, /data-seller-net-sheet/);
  assert.match(unlocked, /data-seller-net-sheet/);
});
```

- [ ] **Step 2: Run the tests and verify the old public result fails the contract**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: FAIL because the current result renders all values before account continuation.

- [ ] **Step 3: Render the locked property/account composition**

Create a dedicated `renderLockedSummary(state)` that receives no net-sheet object. Show the selected value, low/high value endpoints, confirmed obligations, expected close date, category names, and one integrated account panel. Use these account labels exactly:

```js
const accountLabel = state.isLoggedIn ? "Open My Account" : "Create My Account";
const accountMode = state.isLoggedIn ? "open" : "create";
```

The locked category preview may say `Selling expenses`, `Existing obligations`, and `Projected proceeds`, but every associated amount position uses non-numeric semantic lock copy such as `Available in your seller analysis`.

- [ ] **Step 4: Implement the async unlock transition**

Use this ordering in the account click branch:

```js
state.accountPending = true;
redraw("[data-seller-account]");
try {
  const completion = await openAccount({
    mode: state.isLoggedIn ? "open" : "create",
    intent: "seller-net-sheet",
  });
  if (completion?.status !== "completed") throw new Error("Account handoff did not complete");
  state.analysisUnlocked = true;
  state.netSheet = calculateSellerNetSheet(buildCalculationInput(state));
  state.phase = "unlocked";
  state.accountPending = false;
  redraw("[data-seller-net-sheet]");
  emit("seller_analysis_unlocked", { step: "account", status: "completed" });
} catch {
  state.accountPending = false;
  state.error = "Your seller analysis is still here. Try opening your account again.";
  redraw("[data-seller-account]");
}
```

The analytics payload contains no address, balances, value, date, costs, or proceeds.

- [ ] **Step 5: Update the app-level account adapter**

In `site/app.js`, load `sellerCostRegistry` alongside the existing fixture and pass it to render/wire calls. The injected callback opens the current no-field account/action modal and returns:

```js
return Promise.resolve({ status: "completed" });
```

Do not write seller state into `sessionState` or any browser storage. Do not add a second account form.

- [ ] **Step 6: Run focused seller and privacy tests**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs site/seller-workspace.test.mjs site/public-copy-guard.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the account-gate unit**

```powershell
git add site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs site/seller-workspace.css site/app.js
git commit -m "feat: gate seller costs behind account handoff"
```

### Task 4: Build The Expanded Editable Net Sheet

**Files:**
- Modify: `site/seller-workspace-ui.mjs`
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace.css`
- Modify: `site/seller-workspace.mjs`
- Modify: `site/seller-workspace.test.mjs`

**Interfaces:**
- `renderSellerNetSheet(state)` receives only an unlocked state with `state.netSheet`.
- `applySellerRowEdit(state, edit)` updates a percentage/fixed/date/value input and returns a recalculated state.
- `setSellerOptionalRow(state, rowId, active)` adds or removes an optional row and recalculates.

- [ ] **Step 1: Write failing net-sheet structure tests**

```js
test("unlocked analysis renders grouped rows totals and one disclaimer", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "unlocked", costRegistry });
  assert.match(html, /data-seller-net-sheet/);
  assert.match(html, />Selling expenses</);
  assert.match(html, />Existing obligations</);
  assert.match(html, />Total selling expenses</);
  assert.match(html, />Net before obligations</);
  assert.match(html, />Total obligations</);
  assert.match(html, /Projected (net proceeds|shortfall)/);
  assert.match(html, /data-seller-low-proceeds/);
  assert.match(html, /data-seller-high-proceeds/);
  assert.equal((html.match(/This seller net sheet is a planning estimate/g) || []).length, 1);
});

test("optional costs are absent until selected", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "unlocked", costRegistry });
  assert.match(html, />Add another cost</);
  assert.doesNotMatch(html, /data-seller-row="homeWarranty"/);
  assert.match(html, /data-seller-add-row="homeWarranty"/);
});

test("percent rows edit percentages while fixed rows edit currency", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "unlocked", costRegistry });
  assert.match(html, /data-seller-edit-mode="percent_of_sale_price"/);
  assert.match(html, /data-seller-edit-mode="fixed_amount"/);
  assert.match(html, /data-seller-edit-sale-price/);
});
```

- [ ] **Step 2: Verify the expanded-sheet tests fail**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: FAIL because the current pro forma is broad, always public, and has no optional-row catalog.

- [ ] **Step 3: Render the grouped statement and final comparison**

Render selling-expense rows, customer-entered obligation rows, calculated obligation rows, totals, dominant projected result, and compact low/high final figures. Do not render full low/high row columns.

Use a `<dl>` or equivalent semantic row structure. Keep each amount adjacent to its label. Add the small `Edit` action to every visible figure. Put `Add another cost` at the end of each group and list only currently inactive optional rows.

- [ ] **Step 4: Implement type-aware inline editing**

Map modes to field types exactly:

```js
const EDIT_INPUT_KIND = Object.freeze({
  percent_of_sale_price: "percent",
  fixed_amount: "currency",
  statutory_transfer_tax: "currency",
  prorated_annual: "currency",
  customer_entered: "currency",
});
```

- Percent input value is `rate * 100`, with `min="0"`, `step="0.01"`, and a live computed currency amount.
- Currency input uses the existing single-border prefixed field.
- Statutory/proration currency edits become `{ mode: "fixed_amount", value: cents }` local overrides.
- Sale-price edit renders the same bounded range input used in the modal.
- Expected-close-date edit uses `type="date"` and removes the proration override so the registry formula recalculates.
- Enter applies, Escape cancels, and only one row edits at a time.

- [ ] **Step 5: Implement optional-row add/remove and reset**

Selecting an inactive optional row adds its ID to `activeOptionalIds`, renders it in the correct group, and focuses its Edit action. Removing it deletes its ID and override. `Reset assumptions` clears overrides and optional IDs while preserving address, selected value, expected closing date, and the three confirmed obligations.

- [ ] **Step 6: Add the approved single disclaimer**

Use the exact text from the design contract once beneath the web statement. Remove row-level assumption/disclaimer prose from the result area.

- [ ] **Step 7: Style the net sheet without nested cards or mobile overflow**

Use full-width row groups, restrained separators, aligned numeric columns, compact Edit links, and a stable result summary. At mobile widths, each row becomes a two-line label/value layout; no table requires horizontal scrolling.

- [ ] **Step 8: Run domain and UI tests**

Run:

```powershell
node --test site/seller-workspace.test.mjs site/seller-workspace-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit the net-sheet unit**

```powershell
git add site/seller-workspace.mjs site/seller-workspace.test.mjs site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs site/seller-workspace.css
git commit -m "feat: add editable seller net sheet"
```

### Task 5: Add The Direct Snap-Branded PDF Download

**Files:**
- Create: `site/seller-net-sheet-pdf.mjs`
- Create: `site/seller-net-sheet-pdf.test.mjs`
- Create: `site/vendor/pdf-lib.esm.min.js`
- Create: `site/vendor/pdf-lib-LICENSE.md`
- Modify: `site/seller-workspace-ui.mjs`
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace.css`

**Interfaces:**
- Produces: `buildSellerNetSheetPdfModel(input)`, `createSellerNetSheetPdf(input)`, and `downloadSellerNetSheetPdf(input, browser = window)`.
- `createSellerNetSheetPdf` returns `Promise<{ bytes: Uint8Array, filename: string }>`.
- The PDF module consumes the normalized unlocked net-sheet result and never calculates costs.

- [ ] **Step 1: Vendor the pinned PDF dependency with its license**

Use the official `pdf-lib` 1.17.1 package artifact. Copy `dist/pdf-lib.esm.min.js` to `site/vendor/pdf-lib.esm.min.js` and the package MIT license to `site/vendor/pdf-lib-LICENSE.md`. Do not use a CDN or runtime network dependency.

- [ ] **Step 2: Write failing PDF model and byte tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "./vendor/pdf-lib.esm.min.js";
import {
  buildSellerNetSheetPdfModel,
  createSellerNetSheetPdf,
} from "./seller-net-sheet-pdf.mjs";

const unlockedInput = {
  address: "1842 Harbor View Drive, San Diego, CA 92109",
  generatedDate: "2026-07-16",
  expectedClosingDate: "2026-08-15",
  valueRange: {
    lowCents: 69_500_000,
    selectedCents: 72_500_000,
    highCents: 75_500_000,
  },
  netSheet: {
    groups: {
      sellingExpenses: [
        { id: "listingCompensation", label: "Listing-side compensation", amountCents: 1_812_500 },
        { id: "sellerTitleEscrowSettlement", label: "Seller title, escrow, and settlement services", amountCents: 725_000 },
      ],
      obligations: [
        { id: "firstMortgage", label: "First mortgage payoff", amountCents: 41_800_000 },
        { id: "secondMortgageHeloc", label: "Second mortgage or HELOC payoff", amountCents: 2_000_000 },
        { id: "otherLiens", label: "Other liens", amountCents: 500_000 },
      ],
    },
    totalSellingExpensesCents: 2_537_500,
    netBeforeObligationsCents: 69_962_500,
    totalObligationsCents: 44_300_000,
    projected: { kind: "proceeds", amountCents: 25_662_500 },
    scenarios: {
      low: { salePriceCents: 69_500_000, kind: "proceeds", amountCents: 22_737_500 },
      selected: { salePriceCents: 72_500_000, kind: "proceeds", amountCents: 25_662_500 },
      high: { salePriceCents: 75_500_000, kind: "proceeds", amountCents: 28_587_500 },
    },
  },
};

test("PDF model follows the unlocked web statement order", () => {
  const model = buildSellerNetSheetPdfModel(unlockedInput);
  assert.equal(model.title, "Seller Net Sheet");
  assert.equal(model.address, "1842 Harbor View Drive, San Diego, CA 92109");
  assert.deepEqual(model.sections.map((section) => section.title), ["Selling expenses", "Existing obligations", "Summary"]);
  assert.match(model.disclaimer, /^This seller net sheet is a planning estimate/);
});

test("PDF generation returns a loadable branded document and safe filename", async () => {
  const { bytes, filename } = await createSellerNetSheetPdf(unlockedInput);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.equal(filename, "snap-seller-net-sheet-1842-harbor-view-drive-san-diego-ca-92109.pdf");
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), "Seller Net Sheet - 1842 Harbor View Drive, San Diego, CA 92109");
  assert.ok(pdf.getPageCount() >= 1);
});
```

- [ ] **Step 3: Run the PDF tests and verify the module is missing**

Run:

```powershell
node --test site/seller-net-sheet-pdf.test.mjs
```

Expected: FAIL because `seller-net-sheet-pdf.mjs` does not exist.

- [ ] **Step 4: Implement the print model and PDF renderer**

Use US Letter (`612 x 792` points), 44-point margins, Snap blue `#1557FF`, dark ink `#17223B`, standard Helvetica fonts, and an 11-point body minimum. Draw:

1. `SNAP MORTGAGE` brand line and blue rule.
2. Title, address, generated date, and expected closing date.
3. Low/selected/high value strip with selected value dominant.
4. Selling-expense rows.
5. Existing-obligation rows.
6. Totals and dominant projected result.
7. Low/high final proceeds comparison.
8. Bottom disclaimer.

Create a new page before a section would cross the 44-point bottom margin. Repeat the compact brand line and address on continuation pages. Set PDF title, subject, creator, producer, and creation date metadata.

- [ ] **Step 5: Implement browser download and revoke the object URL**

```js
export async function downloadSellerNetSheetPdf(input, browser = window) {
  const { bytes, filename } = await createSellerNetSheetPdf(input);
  const url = browser.URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = browser.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  browser.document.body.append(link);
  link.click();
  link.remove();
  browser.setTimeout(() => browser.URL.revokeObjectURL(url), 0);
  return { filename };
}
```

- [ ] **Step 6: Wire the unlocked-only download action**

Render `Download net sheet` only inside `renderSellerNetSheet`. On click, disable the action, set `aria-busy="true"`, generate/download the PDF, announce success in the existing polite live region, then restore the action. On failure, keep the analysis intact and show `The net sheet could not be downloaded. Try again.`

The locked render must not import data into or invoke the PDF model.

- [ ] **Step 7: Run PDF and seller UI tests**

Run:

```powershell
node --test site/seller-net-sheet-pdf.test.mjs site/seller-workspace-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit the PDF unit**

```powershell
git add site/vendor/pdf-lib.esm.min.js site/vendor/pdf-lib-LICENSE.md site/seller-net-sheet-pdf.mjs site/seller-net-sheet-pdf.test.mjs site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs site/seller-workspace.css
git commit -m "feat: add seller net sheet PDF download"
```

### Task 6: Update Canonical Copy, Static Output, And Data Loading

**Files:**
- Modify: `site/app.js`
- Modify: `mock-data/production-seed.json`
- Modify: `site/static-route-document.mjs`
- Modify: `site/static-route-document.test.mjs`
- Modify: `site/public-copy-guard.test.mjs`
- Generate: `site/generated/routes/sell/index.html`

**Interfaces:**
- Browser boot loads `/mock-data/seller-cost-registry.json` as a required seller dependency when `/sell` is rendered.
- Static `/sell` names useful categories and account value without rendering user-specific calculated amounts.

- [ ] **Step 1: Add failing copy and static-privacy assertions**

```js
test("static seller route preserves education without promising public proceeds", () => {
  const html = renderStaticRouteDocument(sellerContext);
  assert.match(html, /property value/i);
  assert.match(html, /selling costs/i);
  assert.match(html, /mortgage payoff/i);
  assert.match(html, /Snap Homes/i);
  assert.doesNotMatch(html, /No account is required to see the estimate/i);
  assert.doesNotMatch(html, /complete estimate remains visible/i);
  assert.doesNotMatch(html, /data-seller-projected-result|data-seller-net-sheet-row/);
});
```

Add rejected phrases to `site/public-copy-guard.test.mjs`:

```js
[
  "Enter my own value",
  "No account is required to see the estimate",
  "The complete estimate remains visible",
  "Save this home and estimate in Snap Homes"
]
```

- [ ] **Step 2: Run focused static/copy tests and verify stale copy fails**

Run:

```powershell
node --test site/static-route-document.test.mjs site/public-copy-guard.test.mjs
```

Expected: FAIL on the superseded seller wording.

- [ ] **Step 3: Update production seller copy**

Replace public promises with borrower-facing language that states:

- The home-value range is available after address selection.
- The homeowner chooses a value and confirms known obligations.
- Snap Homes opens the detailed cost and proceeds analysis.
- Seller education remains readable without completing the tool.

Do not use internal words such as gate, unlock state, simulated, fixture, or adapter in visible copy.

- [ ] **Step 4: Complete app boot integration**

Add:

```js
const SELLER_COST_REGISTRY_URL = "/mock-data/seller-cost-registry.json";
let sellerCostRegistry = {};
```

Load it during `boot()`, pass it through `sellerPage()` and `wireSellerWorkspace()`, and preserve the existing optional fixture failure behavior for unrelated routes. A `/sell` load with a missing registry must show crawlable seller content and a concise tool-unavailable state rather than throw an uncaught error.

- [ ] **Step 5: Regenerate the canonical seller route**

Run:

```powershell
node mock-data/generate-static-routes.mjs
```

Inspect `site/generated/routes/sell/index.html` and retain only generator-produced changes.

- [ ] **Step 6: Verify static output is fresh and borrower-facing**

Run:

```powershell
node mock-data/generate-static-routes.mjs --check
node --test site/static-route-document.test.mjs site/public-copy-guard.test.mjs site/document-metadata.test.mjs site/public-route-manifest.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit canonical integration**

```powershell
git add site/app.js mock-data/production-seed.json site/static-route-document.mjs site/static-route-document.test.mjs site/public-copy-guard.test.mjs site/generated/routes/sell/index.html
git commit -m "feat: integrate seller account analysis route"
```

### Task 7: Full Verification And Browser QA

**Files:**
- Verify all changed, generated, and vendored files.

**Interfaces:**
- Produces a local verification report; does not deploy.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
node --test --test-reporter=dot site/*.test.mjs mock-data/*.test.mjs mock-data/tests/*.test.mjs mock-data/location-news/lib/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run canonical generation and static-route checks**

Run:

```powershell
node mock-data/generate-static-routes.mjs --check
node site/phase2-static-smoke.mjs
git diff --check
```

Expected: generated output is fresh, all public routes resolve, and no new whitespace errors appear.

- [ ] **Step 3: Start or reuse the local static server**

Use the repository's existing local-server command and verify `/sell` at the server's actual port. If port `8791` is free, preserve the current URL:

```text
http://127.0.0.1:8791/sell
```

- [ ] **Step 4: Verify the locked boundary in a real browser**

At desktop and mobile widths:

1. Open `/sell`.
2. Enter `1842 Harbor View Drive` and select the canonical suggestion.
3. Confirm slider min `$695,000`, selected `$725,000`, high `$755,000`, and `$1,000` keyboard steps.
4. Enter first mortgage `$418,000`, second mortgage/HELOC `$20,000`, other liens `$5,000`, and a valid close date.
5. Submit and confirm the selected value and entered obligations remain visible.
6. In the browser console, verify:

```js
document.querySelector("[data-seller-net-sheet]") === null &&
document.querySelector("[data-seller-projected-result]") === null
```

7. Search the locked workspace text and markup to confirm no calculated selling-cost or proceeds amount exists.

- [ ] **Step 5: Verify account unlock and editing**

1. Select `Create My Account` in logged-out state and confirm the existing no-field handoff modal opens.
2. Confirm the net sheet appears after the callback completes without a second account action.
3. Repeat in logged-in session and confirm `Open My Account`.
4. Edit one percentage row and verify selected/low/high proceeds recalculate.
5. Edit one fixed row and verify totals recalculate.
6. Move the sale-price slider and verify percentage/statutory rows update while fixed rows and obligations remain fixed.
7. Change the closing date and verify property-tax proration updates.
8. Add and remove `Home warranty`; confirm it is absent before add and absent after removal.
9. Reset assumptions and confirm address, selected value, close date, and obligations remain while overrides/optional rows clear.
10. Force deductions above sale price and confirm `Projected shortfall` appears.

- [ ] **Step 6: Verify PDF download**

1. Confirm no download action exists while locked.
2. After unlock, select `Download net sheet` and capture the browser download.
3. Open the PDF and verify Snap branding, address, dates, low/selected/high values, grouped rows, totals, projected result, low/high final comparison, and one bottom disclaimer.
4. Confirm text is not clipped on US Letter pages.
5. Confirm the filename is normalized and contains no query string or unsafe characters.

- [ ] **Step 7: Verify accessibility and responsive layout**

Check 1440x900, 390x844, 320x700, and 430x932:

- Keyboard-only address combobox and all dialog steps.
- Native slider Arrow/Home/End behavior.
- Focus restoration and focus movement to locked/unlocked headings.
- Account-pending and PDF status announcements.
- Escape cancellation for inline edits.
- Visible focus and 44-pixel touch targets.
- Reduced-motion behavior.
- No duplicate mobile menu and no horizontal overflow.
- No console errors or failed local asset requests.

- [ ] **Step 8: Inspect privacy behavior**

Confirm address and financial values are absent from:

```js
location.href
localStorage
sessionStorage
document.cookie
window.__snapEvents || []
```

Refresh `/sell` and confirm it returns to the public entry state.

- [ ] **Step 9: Run the final self-review**

Compare every acceptance criterion in `docs/superpowers/specs/2026-07-16-seller-net-sheet-account-gate-design.md` to a passing automated test or recorded browser check. Search changed borrower-visible files for the rejected phrases and for `demo`, `mock`, `placeholder`, `wireframe`, `scaffolding`, and `illustrative purposes`; remove any visible occurrence.

- [ ] **Step 10: Report without publishing**

Report exact changed files, automated commands/results, browser viewports, PDF verification, simulated boundaries, data gaps, and future Snap Homes/lead integration points. Do not push or deploy.

---

## Plan Self-Review

### Spec Coverage

- Bounded value slider and no manual fallback: Tasks 1 and 2.
- Pre-gate first/second/other obligations and close date: Task 2.
- Value visible with costs/proceeds absent from locked DOM: Task 3.
- One-click simulated Snap Homes handoff: Task 3.
- Expanded grouped net sheet, editing, optional rows, one low/high comparison: Task 4.
- Same-formula scenario calculations and shortfall: Tasks 1 and 4.
- One bottom disclaimer: Task 4.
- Direct Snap-branded PDF: Task 5.
- Crawlable content and canonical route preservation: Task 6.
- Privacy, accessibility, mobile, static smoke, and browser behavior: Task 7.

### Type Consistency

- Every task uses `selectedCents`, not the superseded `baseOverride` model.
- Every task uses `phase: "entry" | "locked" | "unlocked"`.
- Every calculation uses `calculateSellerNetSheet(input)` and `state.netSheet`.
- Every account callback resolves `{ status: "completed" }`.
- Every optional-row operation uses `activeOptionalIds`.
- Every cost override uses `{ mode, value }`.

### Release Boundary

This plan ends with a locally verified frontend implementation. Real account creation, authenticated Snap Homes transfer, lead storage, CRM routing, production property/valuation data, production statement reading, and deployment remain outside this execution.

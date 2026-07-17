# Seller Net Sheet Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the seller workflow in one modal, accept blank optional lien balances, show a locked digital net sheet with concealed calculated values, and reveal the complete editable net sheet in the same modal after the simulated Snap Homes account handoff.

**Architecture:** Extend the existing seller state machine with `locked-sheet` and `unlocked-sheet` dialog states. Keep calculation authority in `seller-workspace.mjs`; the locked renderer consumes only confirmed inputs and cost-row labels, while the unlocked renderer reuses `renderSellerNetSheet`. CSS applies a wide statement variant to the existing accessible dialog rather than introducing a second modal system.

**Tech Stack:** Static HTML/CSS, browser-native JavaScript ES modules, Node's built-in test runner, existing seller fixtures and cost registry, existing in-app browser QA.

## Global Constraints

- Preserve the canonical `/sell` route and all crawlable seller education.
- Do not render, serialize, calculate for display, or place locked selling-cost or proceeds amounts in the DOM.
- Keep homeowner-entered property value, obligations, and closing date visible.
- Treat blank second-mortgage/HELOC and other-lien values as zero internally without displaying or requiring a typed `0`.
- Continue to require a deliberate first-mortgage entry; explicit zero remains valid.
- Use `Create My Account` when logged out and `Open My Account` when logged in.
- Use the existing no-field, frontend-only Snap Homes handoff callback.
- Reveal the actual net sheet in the same modal after account completion.
- Preserve memory-only private state and exclude private seller values from analytics.
- Preserve unlocked inline edits, optional rows, reset, and PDF download.
- Keep all controls keyboard accessible and at least 44 pixels high.
- Prevent document-level horizontal overflow at 320, 375, 390, and 430 pixel widths.
- Preserve unrelated dirty-worktree changes and stage only files intentionally owned by this feature.

---

## File Map

- Modify `site/seller-workspace-ui.mjs`: optional amount normalization, new sheet dialog renderers, state transitions, reopening logic, focus routing, and analytics step names.
- Modify `site/seller-workspace-ui.test.mjs`: pure rendering, state-transition, concealment, account reveal, recovery, and interaction regression coverage.
- Modify `site/seller-workspace.css`: wide modal, digital statement, concealed placeholders, account gate, and responsive rules.
- Modify `site/seller-workspace.test.mjs` only if the internal obligation-normalization contract needs direct coverage; do not move UI blank-string handling into calculation code.
- Reference `mock-data/seller-cost-registry.json`: source of ordered active selling-expense labels. Do not change values or sources for this feature.
- Reference `docs/superpowers/specs/2026-07-16-seller-net-sheet-modal-design.md`: approved behavior contract.

---

### Task 1: Optional Obligation Inputs

**Files:**
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace-ui.mjs`

**Interfaces:**
- Consumes: `dollarsToCents(value: unknown): number`
- Produces: `optionalDollarsToCents(value: unknown): number`, returning integer zero for blank input and normal parsing results for nonblank input.
- Produces: `transitionSellerObligations(state, input)` with blank optional inputs accepted and blank display state preserved.

- [ ] **Step 1: Write failing tests for blank optional fields**

Add assertions equivalent to:

```js
test("obligation transition treats blank optional balances as zero without displaying a forced zero", () => {
  const transition = transitionSellerObligations(previousState, {
    firstMortgage: "0",
    secondMortgageHeloc: "",
    otherLiens: "   ",
    expectedClosingDate: "2026-08-15",
  });

  assert.equal(transition.ok, true);
  assert.deepEqual(transition.state.obligations, {
    firstMortgageCents: 0,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  });
  assert.equal(transition.state.secondMortgageHelocInput, "");
  assert.equal(transition.state.otherLiensInput, "");
});
```

Require the obligation preview to render both optional inputs with `value=""` and `placeholder="If any"`. Update the invalid-input assertion to expect `Enter a valid payoff or lien amount, or leave optional fields blank.`

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: failures show that blank optional inputs parse as invalid and preview fields render `0.00`.

- [ ] **Step 3: Implement blank-aware parsing and display**

Add:

```js
function optionalDollarsToCents(value) {
  return String(value ?? "").trim() === "" ? 0 : dollarsToCents(value);
}

function optionalCurrencyInput(cents) {
  return Number(cents) === 0 ? "" : (Number(cents) / 100).toFixed(2);
}
```

Use `optionalDollarsToCents` only for `secondMortgageHeloc` and `otherLiens`. Use `optionalCurrencyInput` when initializing preview state and after a successful transition. Keep `dollarsToCents` for the first mortgage.

Render:

```html
<input name="secondMortgageHeloc" inputmode="decimal" value="..." placeholder="If any" />
<input name="otherLiens" inputmode="decimal" value="..." placeholder="If any" />
```

Use this validation message for invalid nonblank amounts:

```js
const error = "Enter a valid payoff or lien amount, or leave optional fields blank.";
```

- [ ] **Step 4: Run the focused tests and verify green**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs site/seller-workspace.test.mjs
```

Expected: all seller UI and calculation tests pass.

- [ ] **Step 5: Commit the isolated behavior when the worktree permits**

```powershell
git add -- site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs
git commit -m "fix: allow blank optional seller obligations"
```

If either file contains inseparable user-owned changes, leave the files unstaged and report that constraint instead of committing unrelated work.

---

### Task 2: Locked Digital Net Sheet Renderer

**Files:**
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace-ui.mjs`

**Interfaces:**
- Consumes: locked seller state with `address`, `valueRange`, `obligations`, `expectedClosingDate`, `costRows`, `isLoggedIn`, and no `netSheet`.
- Produces: `renderLockedSellerSheet(state): string` containing confirmed values, registry labels, concealed placeholders, and one account action.
- Produces: `renderSellerDialog(state): string` supporting `locked-sheet` and `unlocked-sheet` variants.

- [ ] **Step 1: Write failing locked-sheet rendering tests**

Add a pure locked state with known cost rows and sentinel amounts. Assert:

```js
const html = renderSellerDialog({
  ...lockedSellerState(),
  modalOpen: true,
  dialogStep: "locked-sheet",
});

assert.match(html, /data-seller-sheet-dialog/);
assert.match(html, /Seller's estimate of net proceeds/);
assert.match(html, />Estimated selling expenses</);
assert.match(html, />Existing obligations</);
assert.match(html, />Total selling expenses</);
assert.match(html, />Net before obligations</);
assert.match(html, />Total obligations</);
assert.match(html, />Projected net proceeds</);
assert.match(html, /data-seller-concealed-value[^>]*aria-hidden="true"/);
assert.match(html, />Amounts available after account access\.</);
assert.match(html, /data-seller-open-account[^>]*>Create My Account</);
assert.doesNotMatch(html, /data-seller-net-sheet/);
assert.doesNotMatch(html, /\$18,125|\$79,750|\$134,420/);
```

Also assert that zero optional homeowner obligations render `None entered`, while the confirmed first payoff and closing date remain visible.

- [ ] **Step 2: Run the focused renderer tests and verify red**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: failures report missing sheet dialog state and concealed-value markup.

- [ ] **Step 3: Add locked sheet rendering helpers**

Add focused helpers in `seller-workspace-ui.mjs`:

```js
function renderConcealedAmount() {
  return `<span class="seller-concealed-value" aria-hidden="true" data-seller-concealed-value><span></span></span>`;
}

function renderLockedCostRow(row) {
  return `<div class="seller-sheet-row"><dt>${esc(row.label)}</dt><dd>${renderConcealedAmount()}</dd></div>`;
}

function enteredObligationValue(cents) {
  return Number(cents) === 0 ? "None entered" : formatSellerCurrency(cents);
}
```

Filter `state.costRows` to required active rows only:

```js
const sellingRows = (state.costRows || []).filter((row) => row.group === "sellingExpenses" && !row.optional);
const calculatedObligationRows = (state.costRows || []).filter((row) => row.group === "obligations" && !row.optional);
```

Build `renderLockedSellerSheet(state)` with:

- Document header and address.
- Dominant selected property value and low/high values.
- `Estimated selling expenses` definition list using labels plus concealed values.
- `Existing obligations` with entered obligations visible and calculated registry rows concealed.
- `Summary and proceeds` with four concealed summary rows.
- One account gate integrated into the projected-proceeds block.
- One section-level accessible sentence: `Amounts available after account access.`
- No calculated amount lookup and no call to `calculateSellerNetSheet`.

- [ ] **Step 4: Add sheet-aware dialog composition**

Branch before the three-step dialog chrome:

```js
const isSheet = state.dialogStep === "locked-sheet" || state.dialogStep === "unlocked-sheet";
const sheetBody = state.dialogStep === "unlocked-sheet"
  ? renderSellerNetSheet(state)
  : renderLockedSellerSheet(state);

if (isSheet) {
  return `<div class="seller-dialog-backdrop" ...>
    <section class="seller-dialog-panel seller-sheet-dialog-panel" data-seller-sheet-dialog>
      <button ... data-seller-dialog-close>&times;</button>
      ${sheetBody}
    </section>
  </div>`;
}
```

Do not show a step counter or Back action in either sheet state.

- [ ] **Step 5: Run focused tests and verify green**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: locked sheet structure, value boundary, account copy, and existing renderer tests pass.

- [ ] **Step 6: Commit the renderer when the worktree permits**

```powershell
git add -- site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs
git commit -m "feat: add locked seller net sheet modal"
```

---

### Task 3: Same-Modal State Transitions And Account Reveal

**Files:**
- Modify: `site/seller-workspace-ui.test.mjs`
- Modify: `site/seller-workspace-ui.mjs`

**Interfaces:**
- Consumes: `transitionSellerObligations(state, input)` and `transitionSellerAccountUnlock(state, { openAccount })`.
- Produces: successful obligation state `{ phase: "locked", dialogStep: "locked-sheet", modalOpen: true, netSheet: null }`.
- Produces: successful account state `{ phase: "unlocked", dialogStep: "unlocked-sheet", modalOpen: true, netSheet }`.
- Produces: failure state preserving `locked-sheet`, modal visibility, and confirmed inputs.

- [ ] **Step 1: Write failing transition tests**

Require obligation success:

```js
assert.equal(transition.state.phase, "locked");
assert.equal(transition.state.dialogStep, "locked-sheet");
assert.equal(transition.state.modalOpen, true);
assert.equal(transition.state.netSheet, null);
```

Require account success:

```js
assert.equal(result.state.phase, "unlocked");
assert.equal(result.state.dialogStep, "unlocked-sheet");
assert.equal(result.state.modalOpen, true);
assert.ok(result.state.netSheet);
```

Require account failure to preserve `dialogStep: "locked-sheet"`, `modalOpen: true`, address, value range, obligations, and closing date.

- [ ] **Step 2: Run transition tests and verify red**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: current transitions close the dialog and do not set a sheet step.

- [ ] **Step 3: Update state transitions**

On obligation success set:

```js
dialogStep: "locked-sheet",
modalOpen: true,
phase: "locked",
analysisUnlocked: false,
netSheet: null,
```

On account success set:

```js
dialogStep: "unlocked-sheet",
modalOpen: true,
phase: "unlocked",
analysisUnlocked: true,
netSheet: calculateSellerNetSheet(buildCalculationInput(state)),
```

`preserveLockedSellerState` must explicitly retain or restore `dialogStep: "locked-sheet"` and `modalOpen: true`.

- [ ] **Step 4: Update wiring and focus behavior**

In `confirmObligations`, redraw and focus:

```js
redraw("[data-seller-locked-sheet-title]");
emit("seller_flow_advanced", { step: "locked-sheet" });
emit("seller_flow_completed", { step: "locked-sheet", status: "confirmed" });
```

Before invoking `openAccount`, emit `seller_account_handoff_started` without private values. On success redraw and focus `[data-seller-projected-result-title]` within the modal. On failure focus `[data-seller-account]`.

When opening from the page after a close, choose the preserved sheet step:

```js
const resumeStep = state.phase === "unlocked" ? "unlocked-sheet"
  : state.phase === "locked" ? "locked-sheet"
  : "address";
```

Add a page-level `View my seller analysis` or `View my net sheet` trigger using the existing `data-seller-open-address` dispatch boundary with an explicit sheet-step data attribute. Do not erase progress in `closeDialog`.

- [ ] **Step 5: Verify account, PDF, edit, reset, and optional-row regressions**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs site/seller-workspace.test.mjs site/seller-net-sheet-pdf.test.mjs
```

Expected: all tests pass, including existing editing and PDF tests.

- [ ] **Step 6: Commit the state-machine update when the worktree permits**

```powershell
git add -- site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs
git commit -m "feat: reveal seller analysis in modal"
```

---

### Task 4: Digital Statement Styling And Browser Verification

**Files:**
- Modify: `site/seller-workspace.css`
- Modify: `site/seller-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: `.seller-sheet-dialog-panel`, `.seller-sheet-document`, `.seller-sheet-row`, `.seller-concealed-value`, and account-gate markup from Tasks 2 and 3.
- Produces: responsive desktop and mobile digital net-sheet layout without document-level overflow.

- [ ] **Step 1: Write failing stylesheet assertions**

Require:

```js
assert.match(css, /\.seller-sheet-dialog-panel\s*\{[\s\S]*width:\s*min\(1120px, calc\(100vw - 32px\)\)/);
assert.match(css, /\.seller-sheet-dialog-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 48px\)/);
assert.match(css, /\.seller-concealed-value\s*\{[\s\S]*filter:\s*blur/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.seller-sheet-row/);
```

- [ ] **Step 2: Run the stylesheet test and verify red**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs
```

Expected: missing sheet modal and concealed-value selectors.

- [ ] **Step 3: Add desktop statement styles**

Implement these structural rules with existing Snap tokens:

```css
.seller-sheet-dialog-panel {
  width: min(1120px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 32px;
}

.seller-sheet-document {
  display: grid;
  gap: 24px;
}

.seller-sheet-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, auto);
  gap: 20px;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid var(--line);
}

.seller-concealed-value {
  display: inline-block;
  width: 104px;
  height: 18px;
  overflow: hidden;
  border-radius: 3px;
  background: #c9d4e5;
  filter: blur(5px);
}
```

Use the existing navy and teal tokens for the integrated account gate. Do not put cards inside cards; statement sections are separated by rules and headings.

- [ ] **Step 4: Add mobile styles**

Within `@media (max-width: 760px)`:

```css
.seller-sheet-dialog-panel {
  width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  padding: 22px;
}

.seller-sheet-header-grid,
.seller-sheet-account-gate {
  grid-template-columns: minmax(0, 1fr);
}

.seller-sheet-row {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.seller-sheet-account-gate .button {
  width: 100%;
  min-height: 52px;
}
```

Add `min-width: 0`, wrapping, and `max-width: 100%` where needed so long cost labels cannot force overflow.

- [ ] **Step 5: Run automated verification**

Run:

```powershell
node --test site/seller-workspace-ui.test.mjs site/seller-workspace.test.mjs site/seller-net-sheet-pdf.test.mjs
node --test site/*.test.mjs mock-data/*.test.mjs mock-data/tests/*.test.mjs mock-data/location-news/lib/*.test.mjs
node site/phase2-static-smoke.mjs
git diff --check -- site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs site/seller-workspace.css
```

Expected: all tests pass and the static smoke reports all canonical routes checked.

- [ ] **Step 6: Perform live browser QA**

At `http://127.0.0.1:8791/site/index.html`:

1. Navigate to `/sell` through the homepage link.
2. Use `1842 Harbor View Drive, San Diego, CA 92109`.
3. Choose the value and leave both optional obligation fields blank.
4. Confirm the locked sheet remains in the modal.
5. Verify property value and entered obligations are readable.
6. Verify selling costs and summary figures use concealed placeholders and contain no real amounts in the DOM snapshot.
7. Activate `Create My Account` and verify the same modal reveals the real net sheet.
8. Verify the download action and one inline edit.
9. Repeat at 390 by 844 and at desktop width.
10. Confirm no horizontal overflow, clipped labels, overlap, or browser console errors.

- [ ] **Step 7: Commit the responsive presentation when the worktree permits**

```powershell
git add -- site/seller-workspace.css site/seller-workspace-ui.mjs site/seller-workspace-ui.test.mjs
git commit -m "style: present seller analysis as digital net sheet"
```

If the files contain inseparable concurrent changes, leave them unstaged and report exact modified files and verification instead.

---

## Completion Checklist

- [ ] Blank optional lien fields are accepted and remain visually blank.
- [ ] Obligation confirmation advances to `locked-sheet` without closing the modal.
- [ ] Locked sheet contains no real calculated costs or proceeds in the DOM.
- [ ] Account action is integrated into the projected-proceeds section.
- [ ] Account success reveals the full net sheet in the same modal.
- [ ] Account failure preserves the locked modal and confirmed inputs.
- [ ] Closing and reopening resumes the correct sheet state.
- [ ] Existing editing, reset, optional rows, and PDF download still work.
- [ ] Desktop and mobile layouts pass visual and overflow checks.
- [ ] Full automated suite and 1,707-route smoke check pass.

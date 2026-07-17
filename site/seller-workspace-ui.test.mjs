import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as sellerUi from "./seller-workspace-ui.mjs";

const {
  reduceSellerNetSheetInteraction,
  renderSellerNetSheet,
  renderSellerWorkspace,
  transitionSellerAccountUnlock,
  transitionSellerPdfDownload,
  transitionSellerObligations,
} = sellerUi;
import {
  applySellerRowEdit,
  calculateSellerNetSheet,
  formatSellerCurrency,
  normalizeSellerObligations,
  resetSellerAssumptions,
  resolveSellerCostRows,
  selectSellerValue,
  setSellerOptionalRow,
} from "./seller-workspace.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(siteDir, "..", "mock-data", "seller-workspace-fixtures.json"), "utf8"));
const costRegistry = JSON.parse(fs.readFileSync(
  path.join(siteDir, "..", "mock-data", "seller-cost-registry.json"),
  "utf8",
));

const page = {
  id: "seller-home",
  route: "/sell",
  name: "Sell a Home",
  updatedAt: "2026-07-16",
};

function lockedSellerState({ costRows } = {}) {
  const address = fixture.addressSuggestions[0];
  return {
    phase: "locked",
    address,
    valueRange: selectSellerValue(fixture.valuations[address.id]),
    obligations: normalizeSellerObligations({
      firstMortgageCents: fixture.statementExtraction.suggestedPayoffCents,
      secondMortgageHelocCents: 0,
      otherLiensCents: 0,
    }),
    expectedClosingDate: "2026-08-15",
    costRows: costRows ?? resolveSellerCostRows(costRegistry, address),
    activeOptionalIds: [],
    overrides: {},
    analysisUnlocked: false,
    modalOpen: false,
    dialogStep: "locked-sheet",
    accountPending: false,
    netSheet: null,
    obligationErrorField: "",
    error: "",
    status: "",
    isLoggedIn: false,
  };
}

function unlockedSellerState() {
  const state = {
    ...lockedSellerState(),
    phase: "unlocked",
    analysisUnlocked: true,
    editingRowId: "",
    status: "",
  };
  return {
    ...state,
    netSheet: calculateSellerNetSheet(state),
  };
}

test("seller entry renders an address-first CTA and crawlable seller guidance", () => {
  const html = renderSellerWorkspace(page, fixture);

  assert.match(html, /data-seller-workspace/);
  assert.match(html, /<h1>Start with what your sale could leave you\.<\/h1>/);
  assert.match(html, /data-seller-open-address[^>]*>Explore my property value range/);
  assert.match(html, /Find and confirm the property/);
  assert.match(html, /Confirm the balances and timing/);
  assert.match(html, /Review the full seller analysis/);
  assert.match(html, /How to think about an online home-value estimate/);
  assert.match(html, /Selling costs that can change net proceeds/);
  assert.match(html, /Compare offers beyond the headline price/);
  assert.match(html, /data-seller-open-address[^>]*>Enter my home address/);
  assert.match(html, /Is the estimated home value an appraisal\?/);
  assert.match(html, /Methodology and sources/);
});

test("hydrated seller education preserves the approved outbound source ledger", () => {
  const html = renderSellerWorkspace(page, fixture);
  const ledger = html.match(/<div[^>]*data-seller-source-ledger[^>]*>[\s\S]*?<\/div>/)?.[0] || "";
  const approvedUrls = [
    "https://www.sdarcc.gov/content/arcc/home/divisions/recorder-clerk/recording.html",
    "https://www.consumerfinance.gov/rules-policy/regulations/1026/38/",
    "https://www.consumerfinance.gov/rules-policy/regulations/1026/2020-12-28/36/",
    "https://www.boe.ca.gov/lawguides/property/current/ptlg/annt/170-0087.html",
    "https://www.nar.realtor/the-facts/what-the-nar-settlement-means-for-home-buyers-and-sellers",
  ];

  assert.notEqual(ledger, "");
  assert.equal((ledger.match(/<a /g) || []).length, 5);
  for (const url of approvedUrls) assert.equal(ledger.includes(`href="${url}"`), true, url);
});

test("address combobox owns direct stable options and exposes the active descendant", () => {
  assert.equal(typeof sellerUi.renderSellerDialog, "function");
  const suggestions = fixture.addressSuggestions.slice(0, 2);
  const activeId = "seller-address-option-property-barton-springs";
  const html = sellerUi.renderSellerDialog({
    modalOpen: true,
    dialogStep: "address",
    addressQuery: "Harbor",
    suggestions,
    activeSuggestionIndex: 1,
    error: "",
    status: "",
  });

  assert.match(html, new RegExp(`data-seller-address-input[^>]*aria-activedescendant="${activeId}"`));
  assert.match(html, /id="seller-address-suggestions" role="listbox"[^>]*>\s*<button/);
  assert.match(html, new RegExp(`id="${activeId}"[^>]*role="option"[^>]*aria-selected="true"`));
  assert.doesNotMatch(html, /<li[^>]*role="option"/);

  const reordered = sellerUi.renderSellerDialog({
    modalOpen: true,
    dialogStep: "address",
    addressQuery: "Barton",
    suggestions: [...suggestions].reverse(),
    activeSuggestionIndex: 0,
    error: "",
    status: "",
  });
  assert.match(reordered, new RegExp(`id="${activeId}"[^>]*aria-selected="true"`));
});

test("seller dialog exposes accessible progressive controls", () => {
  const html = renderSellerWorkspace(page, fixture);

  assert.match(html, /data-seller-dialog[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /aria-labelledby="seller-dialog-title"/);
  assert.match(html, /data-seller-address-input[^>]*role="combobox"/);
  assert.match(html, /aria-controls="seller-address-suggestions"/);
  assert.match(html, /id="seller-address-suggestions"[^>]*role="listbox"/);
  assert.match(html, /data-seller-find-home/);
  assert.match(html, /data-seller-dialog-status[^>]*aria-live="polite"/);
  assert.match(html, /data-seller-dialog-close/);
});

test("value step uses a bounded native range without manual value entry", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "value", costRegistry });
  assert.match(html, /type="range"/);
  assert.match(html, /min="69500000"/);
  assert.match(html, /max="75500000"/);
  assert.match(html, /step="100000"/);
  assert.match(html, /style="--seller-range-progress: 50%"/);
  assert.match(html, />Use this value</);
  assert.doesNotMatch(html, /Enter my own value|name="value" inputmode="decimal"/);
});

test("obligations step collects balances and a close date before the gate", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "obligations", costRegistry });
  assert.match(html, /name="firstMortgage"/);
  assert.match(html, /name="secondMortgageHeloc"[^>]*value=""[^>]*placeholder="If any"/);
  assert.match(html, /name="otherLiens"[^>]*value=""[^>]*placeholder="If any"/);
  assert.match(html, /name="expectedClosingDate" type="date"/);
  assert.match(html, /Select mortgage statement/);
});

test("missing valuation copy asks for another address", () => {
  const source = fs.readFileSync(path.join(siteDir, "seller-workspace-ui.mjs"), "utf8");
  assert.match(source, /try another address/i);
  assert.doesNotMatch(source, /Enter your own value to continue/i);
});

test("seller FAQ preserves the property value while reserving detailed analysis for Snap Homes", () => {
  const source = fs.readFileSync(path.join(siteDir, "seller-workspace-ui.mjs"), "utf8");

  assert.match(source, /Property value remains visible/i);
  assert.match(source, /Detailed selling costs and projected proceeds open through Snap Homes/i);
  assert.doesNotMatch(source, /The complete estimate remains visible/i);
  assert.doesNotMatch(source, /Snap Homes account actions appear afterward/i);
});

test("locked preview confirms property and obligations without a public result", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "locked", costRegistry });

  assert.match(html, /data-seller-locked-summary[^>]*tabindex="-1"/);
  assert.match(html, /1842 Harbor View Drive, San Diego, CA 92109/);
  assert.match(html, /\$725,000/);
  assert.match(html, /First mortgage payoff/);
  assert.match(html, /Expected closing date/);
  assert.match(html, /data-seller-reopen-sheet[^>]*>View my seller analysis</);
  assert.doesNotMatch(html, /data-seller-results|Estimated proceeds statement|data-seller-net-sheet|data-seller-projected-result/);
});

test("locked seller analysis exposes entered details but no calculated costs or proceeds", () => {
  const lockedHtml = renderSellerWorkspace(page, fixture, {
    preview: "locked",
    isLoggedIn: false,
    costRegistry,
  });
  const unlockedState = unlockedSellerState();
  const unlockedHtml = renderSellerNetSheet(unlockedState);
  const enteredAmounts = new Set([
    unlockedState.valueRange.selectedCents,
    ...Object.values(unlockedState.obligations),
  ]);
  const calculatedAmounts = [...new Set([
    ...unlockedState.netSheet.groups.sellingExpenses.map((row) => row.amountCents),
    ...unlockedState.netSheet.groups.obligations.map((row) => row.amountCents),
    unlockedState.netSheet.totalSellingExpensesCents,
    unlockedState.netSheet.netBeforeObligationsCents,
    unlockedState.netSheet.totalObligationsCents,
    unlockedState.netSheet.projected.amountCents,
    unlockedState.netSheet.scenarios.low.amountCents,
    unlockedState.netSheet.scenarios.high.amountCents,
  ])]
    .filter((amountCents) => amountCents > 0 && !enteredAmounts.has(amountCents))
    .map(formatSellerCurrency);

  assert.equal(calculatedAmounts.includes("$1,072.60"), true);
  assert.equal(calculatedAmounts.includes("$419,072.60"), true);
  assert.equal(calculatedAmounts.length >= 8, true);
  for (const amount of calculatedAmounts) {
    assert.equal(unlockedHtml.includes(amount), true, `${amount} must be a fixture-calculated unlocked amount`);
    assert.equal(lockedHtml.includes(amount), false, `${amount} leaked into locked HTML`);
  }
  assert.match(lockedHtml, /data-seller-locked-summary/);
  assert.match(lockedHtml, /1842 Harbor View Drive, San Diego, CA 92109/);
  assert.match(lockedHtml, /\$725,000/);
  assert.match(lockedHtml, /First mortgage payoff/);
  assert.match(lockedHtml, /See what could be left after the sale/);
  assert.match(lockedHtml, /Itemized selling expenses/);
  assert.match(lockedHtml, /Payoffs and liens/);
  assert.match(lockedHtml, /Low, selected, and high proceeds/);
  assert.match(lockedHtml, /Downloadable seller net sheet/);
  assert.match(lockedHtml, /Your property details will carry over/);
  assert.match(lockedHtml, /data-seller-account/);
  assert.match(lockedHtml, />Create My Account</);
  assert.doesNotMatch(lockedHtml, /data-seller-net-sheet|data-seller-projected-result|data-seller-download/);
});

test("locked seller sheet presents the net-sheet structure without calculated amounts in the DOM", () => {
  const state = lockedSellerState({
    costRows: [
      {
        id: "sentinelSelling",
        label: "Seller title fees",
        group: "sellingExpenses",
        optional: false,
        amountCents: 1_812_500,
      },
      {
        id: "sentinelObligation",
        label: "Mortgage payoff interest",
        group: "obligations",
        optional: false,
        amountCents: 7_975_000,
      },
    ],
  });
  const html = sellerUi.renderSellerDialog({
    ...state,
    modalOpen: true,
    dialogStep: "locked-sheet",
  });

  assert.match(html, /data-seller-sheet-dialog/);
  assert.match(html, /Seller&#39;s estimate of net proceeds/);
  assert.match(html, />Estimated selling expenses</);
  assert.match(html, />Existing obligations</);
  assert.match(html, />Total selling expenses</);
  assert.match(html, />Net before obligations</);
  assert.match(html, />Total obligations</);
  assert.match(html, />Projected net proceeds</);
  assert.match(html, /data-seller-concealed-value[^>]*aria-hidden="true"/);
  assert.match(html, />Amounts available after account access\.</);
  assert.match(html, /data-seller-open-account[^>]*>Create My Account</);
  assert.match(html, /\$418,000/);
  assert.match(html, /Second mortgage or HELOC payoff<\/dt><dd>None entered/);
  assert.match(html, /Other liens<\/dt><dd>None entered/);
  assert.match(html, /2026-08-15/);
  assert.doesNotMatch(html, /data-seller-net-sheet/);
  assert.doesNotMatch(html, /\$18,125|\$79,750|\$134,420/);
  assert.doesNotMatch(html, /1812500|7975000/);
  assert.doesNotMatch(html, /Step [123] of 3|data-seller-dialog-back/);
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
  assert.match(unlocked, /data-seller-projected-result/);
  assert.match(unlocked, /data-seller-download[^>]*>Download net sheet</);
  assert.doesNotMatch(locked, /data-seller-download/);
});

test("closed sheet state does not leave a duplicate hidden net sheet in the DOM", () => {
  const html = sellerUi.renderSellerDialog({
    ...unlockedSellerState(),
    modalOpen: false,
    dialogStep: "unlocked-sheet",
  });

  assert.equal(html, "");
});

test("PDF action renders a disabled busy state only in the unlocked analysis", () => {
  const html = renderSellerNetSheet({ ...unlockedSellerState(), downloadPending: true });

  assert.match(html, /data-seller-download[^>]*disabled[^>]*aria-busy="true"[^>]*>Preparing PDF/);
});

test("PDF download transition passes only the normalized unlocked model and announces success", async () => {
  const state = unlockedSellerState();
  let received;
  const result = await transitionSellerPdfDownload(state, {
    generatedDate: "2026-07-16",
    downloadPdf: async (input) => {
      received = input;
      return { filename: "seller.pdf" };
    },
  });

  assert.deepEqual(Object.keys(received).sort(), ["address", "expectedClosingDate", "generatedDate", "netSheet", "valueRange"]);
  assert.equal(received.address, state.address.displayAddress);
  assert.equal(received.generatedDate, "2026-07-16");
  assert.equal(received.netSheet, state.netSheet);
  assert.equal(result.ok, true);
  assert.equal(result.state.downloadPending, false);
  assert.equal(result.state.downloadError, "");
  assert.equal(result.state.status, "Seller net sheet downloaded.");
});

test("PDF download is never invoked while locked", async () => {
  const state = lockedSellerState();
  let invoked = false;

  const result = await transitionSellerPdfDownload(state, {
    downloadPdf: async () => { invoked = true; },
  });

  assert.equal(invoked, false);
  assert.equal(result.ok, false);
  assert.equal(result.state, state);
});

test("PDF download failure preserves the unlocked analysis and exposes a retry message", async () => {
  const state = unlockedSellerState();
  const result = await transitionSellerPdfDownload(state, {
    downloadPdf: async () => { throw new Error("PDF unavailable"); },
  });

  assert.equal(result.ok, false);
  assert.equal(result.state.phase, "unlocked");
  assert.equal(result.state.netSheet, state.netSheet);
  assert.equal(result.state.downloadPending, false);
  assert.equal(result.state.downloadError, "The net sheet could not be downloaded. Try again.");
  assert.match(renderSellerNetSheet(result.state), /data-seller-download-error[^>]*>The net sheet could not be downloaded\. Try again\.</);
});

test("unlocked analysis renders the grouped statement totals and one approved disclaimer", () => {
  const html = renderSellerWorkspace(page, fixture, { preview: "unlocked", costRegistry });
  const disclaimer = "This seller net sheet is a planning estimate based on the property value, obligations, closing date, and editable cost assumptions shown. Actual charges, payoff amounts, taxes, credits, compensation, and proceeds can change through closing. Compensation is negotiable and is not set by law.";

  assert.match(html, /data-seller-net-sheet/);
  assert.match(html, />Selling expenses</);
  assert.match(html, />Existing obligations</);
  assert.match(html, />Total selling expenses</);
  assert.match(html, />Net before obligations</);
  assert.match(html, />Total obligations</);
  assert.match(html, /Projected (?:net proceeds|shortfall)/);
  assert.match(html, /data-seller-low-proceeds/);
  assert.match(html, /data-seller-high-proceeds/);
  assert.equal(html.split(disclaimer).length - 1, 1);
});

test("selected value is dominant and low high appear only as final comparison figures", () => {
  const html = renderSellerNetSheet(unlockedSellerState());

  assert.match(html, /data-seller-selected-sale-price[^>]*>\$725,000</);
  assert.match(html, /data-seller-low-proceeds/);
  assert.match(html, /data-seller-high-proceeds/);
  assert.equal((html.match(/Listing-side compensation/g) || []).length, 1);
  assert.doesNotMatch(html, /data-seller-(?:low|high)-column|<table/);
});

test("optional costs stay absent until selected and then render in the correct group", () => {
  const original = unlockedSellerState();
  const hidden = renderSellerNetSheet(original);
  const activeState = setSellerOptionalRow(original, "homeWarranty", true);
  const active = renderSellerNetSheet(activeState);

  assert.match(hidden, />Add another cost</);
  assert.doesNotMatch(hidden, /data-seller-row="homeWarranty"/);
  assert.match(hidden, /data-seller-add-row="homeWarranty"/);
  assert.match(active, /data-seller-group="sellingExpenses"[\s\S]*data-seller-row="homeWarranty"/);
  assert.match(active, /data-seller-remove-row="homeWarranty"/);
  assert.doesNotMatch(active, /data-seller-add-row="homeWarranty"/);
});

test("row editors use percent currency date and bounded sale-price controls", () => {
  const state = unlockedSellerState();
  const percent = renderSellerNetSheet({ ...state, editingRowId: "listingCompensation" });
  const fixed = renderSellerNetSheet({ ...state, editingRowId: "buyerClosingCostCredit" });
  const statutory = renderSellerNetSheet({ ...state, editingRowId: "stateCountyTransferTax" });
  const proration = renderSellerNetSheet({ ...state, editingRowId: "propertyTaxProration" });
  const obligation = renderSellerNetSheet({ ...state, editingRowId: "firstMortgagePayoff" });
  const date = renderSellerNetSheet({ ...state, editingRowId: "expectedClosingDate" });
  const salePrice = renderSellerNetSheet({ ...state, editingRowId: "salePrice" });

  assert.match(percent, /data-seller-edit-mode="percent_of_sale_price"/);
  assert.match(percent, /type="number"[^>]*min="0"[^>]*step="0.01"[^>]*value="2.5"/);
  assert.match(percent, /data-seller-live-amount[^>]*>\$18,125</);
  for (const currency of [fixed, statutory, proration, obligation]) {
    assert.match(currency, /data-seller-currency-input/);
    assert.match(currency, /class="seller-prefixed-input"/);
  }
  assert.match(date, /type="date"[^>]*value="2026-08-15"/);
  assert.match(salePrice, /type="range"[^>]*min="69500000"[^>]*max="75500000"[^>]*step="100000"[^>]*value="72500000"/);
  assert.match(salePrice, /data-seller-edit-sale-price/);
});

test("a production edit recalculates the rendered row totals and final comparison", () => {
  const original = unlockedSellerState();
  const edited = applySellerRowEdit(original, {
    rowId: "listingCompensation",
    mode: "percent_of_sale_price",
    value: 3,
  });
  const html = renderSellerNetSheet(edited);

  assert.match(html, /data-seller-row="listingCompensation"[\s\S]*\$21,750/);
  assert.match(html, new RegExp(`data-seller-low-proceeds[^>]*>${formatForPattern(edited.netSheet.scenarios.low.amountCents)}<`));
  assert.match(html, new RegExp(`data-seller-high-proceeds[^>]*>${formatForPattern(edited.netSheet.scenarios.high.amountCents)}<`));
});

test("reset output removes active rows and overrides while retaining seller inputs", () => {
  const original = unlockedSellerState();
  const active = setSellerOptionalRow(original, "homeWarranty", true);
  const edited = applySellerRowEdit(active, { rowId: "homeWarranty", mode: "fixed_amount", value: 75_000 });
  const reset = resetSellerAssumptions(edited);
  const html = renderSellerNetSheet(reset);

  assert.doesNotMatch(html, /data-seller-row="homeWarranty"/);
  assert.match(html, /data-seller-add-row="homeWarranty"/);
  assert.match(html, /data-seller-selected-sale-price[^>]*>\$725,000</);
  assert.match(html, /data-seller-edit-date[^>]*>2026-08-15</);
  assert.match(html, /data-seller-row="firstMortgagePayoff"[\s\S]*\$418,000/);
});

test("rendered result changes to projected shortfall when obligations exceed value", () => {
  const edited = applySellerRowEdit(unlockedSellerState(), {
    rowId: "firstMortgagePayoff",
    mode: "customer_entered",
    value: 80_000_000,
  });
  const html = renderSellerNetSheet(edited);

  assert.equal(edited.netSheet.projected.kind, "shortfall");
  assert.match(html, />Projected shortfall</);
  assert.doesNotMatch(html, /Projected net proceeds/);
});

test("edit actions switch the single active editor and request input focus", () => {
  const original = { ...unlockedSellerState(), editingRowId: "listingCompensation" };
  const result = reduceSellerNetSheetInteraction(original, {
    type: "action",
    action: "start-edit",
    rowId: "buyerClosingCostCredit",
  });

  assert.equal(result.handled, true);
  assert.equal(result.state.editingRowId, "buyerClosingCostCredit");
  assert.equal(result.state.status, "");
  assert.deepEqual(result.effect, {
    type: "redraw",
    focusSelector: "[data-seller-edit-input]",
  });
});

test("sale-price range previews every calculation while preserving the editor and cancel restores the prior value", () => {
  const original = unlockedSellerState();
  const started = reduceSellerNetSheetInteraction(original, {
    type: "action",
    action: "start-edit",
    rowId: "salePrice",
  });
  const expected = applySellerRowEdit(original, {
    rowId: "salePrice",
    mode: "sale_price",
    value: original.valueRange.highCents,
  });
  const preview = reduceSellerNetSheetInteraction(started.state, {
    type: "action",
    action: "preview-sale-price",
    edit: {
      rowId: "salePrice",
      mode: "sale_price",
      rawValue: String(original.valueRange.highCents),
    },
  });

  assert.equal(preview.handled, true);
  assert.equal(preview.state.editingRowId, "salePrice");
  assert.equal(preview.state.valueRange.selectedCents, original.valueRange.highCents);
  for (const rowId of ["listingCompensation", "stateCountyTransferTax"]) {
    assert.equal(
      preview.state.netSheet.groups.sellingExpenses.find((row) => row.id === rowId).amountCents,
      expected.netSheet.groups.sellingExpenses.find((row) => row.id === rowId).amountCents,
    );
  }
  assert.equal(preview.state.netSheet.totalSellingExpensesCents, expected.netSheet.totalSellingExpensesCents);
  assert.equal(preview.state.netSheet.netBeforeObligationsCents, expected.netSheet.netBeforeObligationsCents);
  assert.equal(preview.state.netSheet.projected.amountCents, expected.netSheet.projected.amountCents);
  assert.deepEqual(preview.state.netSheet.scenarios, expected.netSheet.scenarios);
  assert.deepEqual(preview.effect, {
    type: "sync-sale-price-preview",
  });

  const cancelled = reduceSellerNetSheetInteraction(preview.state, {
    type: "action",
    action: "cancel-edit",
  });
  assert.equal(cancelled.state.editingRowId, "");
  assert.equal(cancelled.state.valueRange.selectedCents, original.valueRange.selectedCents);
  assert.deepEqual(cancelled.state.netSheet, original.netSheet);
});

test("sale-price preview updates the displayed sheet without replacing the active range", () => {
  assert.equal(typeof sellerUi.syncSellerSalePricePreview, "function");
  const original = unlockedSellerState();
  const started = reduceSellerNetSheetInteraction(original, {
    type: "action",
    action: "start-edit",
    rowId: "salePrice",
  });
  const preview = reduceSellerNetSheetInteraction(started.state, {
    type: "action",
    action: "preview-sale-price",
    edit: {
      rowId: "salePrice",
      mode: "sale_price",
      rawValue: String(original.valueRange.highCents),
    },
  });
  const range = { isConnected: true };
  const target = () => ({ textContent: "" });
  const targets = new Map([
    ["[data-seller-edit-sale-price-range]", range],
    ["[data-seller-edit-sale-price-output]", target()],
    ['[data-seller-row="listingCompensation"] .seller-row-amount', target()],
    ['[data-seller-row="stateCountyTransferTax"] .seller-row-amount', target()],
    ['[data-seller-summary="total-selling-expenses"] [data-seller-summary-amount]', target()],
    ['[data-seller-summary="net-before-obligations"] [data-seller-summary-amount]', target()],
    ['[data-seller-summary="total-obligations"] [data-seller-summary-amount]', target()],
    ['[data-seller-summary="projected"] [data-seller-summary-label]', target()],
    ['[data-seller-summary="projected"] [data-seller-summary-amount]', target()],
    ["[data-seller-projected-label]", target()],
    ["[data-seller-projected-amount]", target()],
    ["[data-seller-low-label]", target()],
    ["[data-seller-low-proceeds]", target()],
    ["[data-seller-high-label]", target()],
    ["[data-seller-high-proceeds]", target()],
  ]);
  let innerHtmlWrites = 0;
  const root = {
    querySelector(selector) { return targets.get(selector) || null; },
    get innerHTML() { return "existing seller workspace"; },
    set innerHTML(_value) {
      innerHtmlWrites += 1;
      range.isConnected = false;
    },
  };
  const activeRange = root.querySelector("[data-seller-edit-sale-price-range]");

  sellerUi.syncSellerSalePricePreview(root, preview.state);

  const netSheet = preview.state.netSheet;
  const rowAmount = (rowId) => netSheet.groups.sellingExpenses.find((row) => row.id === rowId).amountCents;
  assert.equal(innerHtmlWrites, 0);
  assert.equal(range.isConnected, true);
  assert.equal(root.querySelector("[data-seller-edit-sale-price-range]"), activeRange);
  assert.equal(targets.get("[data-seller-edit-sale-price-output]").textContent, formatSellerCurrency(preview.state.valueRange.selectedCents));
  assert.equal(targets.get('[data-seller-row="listingCompensation"] .seller-row-amount').textContent, formatSellerCurrency(rowAmount("listingCompensation")));
  assert.equal(targets.get('[data-seller-row="stateCountyTransferTax"] .seller-row-amount').textContent, formatSellerCurrency(rowAmount("stateCountyTransferTax")));
  assert.equal(targets.get('[data-seller-summary="total-selling-expenses"] [data-seller-summary-amount]').textContent, formatSellerCurrency(netSheet.totalSellingExpensesCents));
  assert.equal(targets.get('[data-seller-summary="net-before-obligations"] [data-seller-summary-amount]').textContent, formatSellerCurrency(netSheet.netBeforeObligationsCents));
  assert.equal(targets.get("[data-seller-projected-amount]").textContent, formatSellerCurrency(netSheet.projected.amountCents));
  assert.equal(targets.get("[data-seller-low-proceeds]").textContent, formatSellerCurrency(netSheet.scenarios.low.amountCents));
  assert.equal(targets.get("[data-seller-high-proceeds]").textContent, formatSellerCurrency(netSheet.scenarios.high.amountCents));
});

test("Enter commits a live sale-price preview", () => {
  const original = unlockedSellerState();
  const started = reduceSellerNetSheetInteraction(original, {
    type: "action",
    action: "start-edit",
    rowId: "salePrice",
  });
  const preview = reduceSellerNetSheetInteraction(started.state, {
    type: "action",
    action: "preview-sale-price",
    edit: {
      rowId: "salePrice",
      mode: "sale_price",
      rawValue: String(original.valueRange.highCents),
    },
  });
  const committed = reduceSellerNetSheetInteraction(preview.state, {
    type: "keydown",
    key: "Enter",
    edit: {
      rowId: "salePrice",
      mode: "sale_price",
      rawValue: String(original.valueRange.highCents),
    },
  });

  assert.equal(committed.handled, true);
  assert.equal(committed.preventDefault, true);
  assert.equal(committed.state.editingRowId, "");
  assert.equal(committed.state.valueRange.selectedCents, original.valueRange.highCents);
  assert.equal(committed.state.salePriceEditOriginalCents, null);
});

test("Enter applies the active edit through the net-sheet calculation", () => {
  const original = { ...unlockedSellerState(), editingRowId: "listingCompensation" };
  const result = reduceSellerNetSheetInteraction(original, {
    type: "keydown",
    key: "Enter",
    edit: {
      rowId: "listingCompensation",
      mode: "percent_of_sale_price",
      rawValue: "3",
    },
  });

  assert.equal(result.handled, true);
  assert.equal(result.preventDefault, true);
  assert.equal(result.state.editingRowId, "");
  assert.equal(result.state.status, "Seller net sheet updated.");
  assert.equal(result.state.overrides.listingCompensation.value, 0.03);
  assert.equal(
    result.state.netSheet.groups.sellingExpenses.find((row) => row.id === "listingCompensation").amountCents,
    2_175_000,
  );
  assert.deepEqual(result.effect, {
    type: "redraw",
    focusSelector: '[data-seller-edit-row="listingCompensation"]',
  });
});

test("Escape cancels the active edit and routes focus back to its Edit button", () => {
  const original = { ...unlockedSellerState(), editingRowId: "listingCompensation" };
  const result = reduceSellerNetSheetInteraction(original, {
    type: "keydown",
    key: "Escape",
  });

  assert.equal(result.handled, true);
  assert.equal(result.preventDefault, true);
  assert.equal(result.state.editingRowId, "");
  assert.equal(result.state.status, "Edit cancelled.");
  assert.deepEqual(result.effect, {
    type: "redraw",
    focusSelector: '[data-seller-edit-row="listingCompensation"]',
  });
  assert.deepEqual(result.state.overrides, original.overrides);
});

test("optional-row actions add and remove through their group focus routes", () => {
  const added = reduceSellerNetSheetInteraction(unlockedSellerState(), {
    type: "action",
    action: "add-optional-row",
    rowId: "homeWarranty",
  });

  assert.equal(added.state.activeOptionalIds.includes("homeWarranty"), true);
  assert.equal(added.state.status, "Cost added.");
  assert.deepEqual(added.effect, {
    type: "redraw",
    focusSelector: '[data-seller-edit-row="homeWarranty"]',
  });

  const removed = reduceSellerNetSheetInteraction(added.state, {
    type: "action",
    action: "remove-optional-row",
    rowId: "homeWarranty",
  });

  assert.equal(removed.state.activeOptionalIds.includes("homeWarranty"), false);
  assert.equal(removed.state.status, "Cost removed.");
  assert.deepEqual(removed.effect, {
    type: "redraw",
    focusSelector: '[data-seller-add-cost="sellingExpenses"] summary',
  });
});

test("reset action clears editable assumptions and routes focus to reset", () => {
  const withOptional = setSellerOptionalRow(unlockedSellerState(), "homeWarranty", true);
  const edited = applySellerRowEdit(withOptional, {
    rowId: "homeWarranty",
    mode: "fixed_amount",
    value: 75_000,
  });
  const result = reduceSellerNetSheetInteraction(
    { ...edited, editingRowId: "homeWarranty" },
    { type: "action", action: "reset" },
  );

  assert.deepEqual(result.state.activeOptionalIds, []);
  assert.deepEqual(result.state.overrides, {});
  assert.equal(result.state.editingRowId, "");
  assert.equal(result.state.status, "Seller assumptions reset.");
  assert.equal(result.state.address, edited.address);
  assert.equal(result.state.valueRange.selectedCents, edited.valueRange.selectedCents);
  assert.deepEqual(result.effect, {
    type: "redraw",
    focusSelector: "[data-seller-reset-assumptions]",
  });
});

function formatForPattern(cents) {
  return formatSellerCurrency(cents).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("completed account handoff unlocks the seller analysis with resolved cost rows", async () => {
  const requests = [];
  const result = await transitionSellerAccountUnlock(lockedSellerState(), {
    openAccount: async (request) => {
      requests.push(request);
      return { status: "completed" };
    },
  });

  assert.deepEqual(requests, [{ mode: "create", intent: "seller-net-sheet" }]);
  assert.equal(result.ok, true);
  assert.equal(result.state.phase, "unlocked");
  assert.equal(result.state.dialogStep, "unlocked-sheet");
  assert.equal(result.state.modalOpen, true);
  assert.equal(result.state.analysisUnlocked, true);
  assert.equal(result.state.error, "");
  assert.equal(result.state.netSheet.totalSellingExpensesCents > 0, true);
  assert.equal(result.state.netSheet.projected.amountCents > 0, true);
});

test("rejected account handoff preserves the locked seller inputs", async () => {
  const state = lockedSellerState();
  const result = await transitionSellerAccountUnlock(state, {
    openAccount: async () => {
      throw new Error("Account service unavailable");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.state.phase, "locked");
  assert.equal(result.state.dialogStep, "locked-sheet");
  assert.equal(result.state.modalOpen, true);
  assert.equal(result.state.analysisUnlocked, false);
  assert.equal(result.state.netSheet, null);
  assert.equal(result.state.error, "Your seller analysis is still here. Try opening your account again.");
  assert.equal(result.state.address, state.address);
  assert.equal(result.state.valueRange, state.valueRange);
  assert.equal(result.state.obligations, state.obligations);
  assert.equal(result.state.expectedClosingDate, state.expectedClosingDate);
  assert.equal(result.state.costRows, state.costRows);
});

test("non-completed account handoff preserves the locked seller inputs", async () => {
  const state = lockedSellerState();
  const result = await transitionSellerAccountUnlock(state, {
    openAccount: async () => ({ status: "cancelled" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.state.phase, "locked");
  assert.equal(result.state.dialogStep, "locked-sheet");
  assert.equal(result.state.modalOpen, true);
  assert.equal(result.state.analysisUnlocked, false);
  assert.equal(result.state.netSheet, null);
  assert.equal(result.state.error, "Your seller analysis is still here. Try opening your account again.");
  assert.equal(result.state.address, state.address);
  assert.equal(result.state.valueRange, state.valueRange);
  assert.equal(result.state.obligations, state.obligations);
});

test("empty seller cost registry refuses the account unlock before calculation", async () => {
  let accountOpened = false;
  const state = lockedSellerState({ costRows: [] });
  const result = await transitionSellerAccountUnlock(state, {
    openAccount: async () => {
      accountOpened = true;
      return { status: "completed" };
    },
  });

  assert.equal(accountOpened, false);
  assert.equal(result.ok, false);
  assert.equal(result.state.phase, "locked");
  assert.equal(result.state.dialogStep, "locked-sheet");
  assert.equal(result.state.modalOpen, true);
  assert.equal(result.state.analysisUnlocked, false);
  assert.equal(result.state.netSheet, null);
  assert.equal(result.state.error, "Your seller cost details are unavailable right now. Try again soon.");
  assert.equal(result.state.address, state.address);
  assert.equal(result.state.valueRange, state.valueRange);
  assert.equal(result.state.obligations, state.obligations);
  assert.equal(result.state.expectedClosingDate, state.expectedClosingDate);
});

test("default account handoff is unavailable and does not unlock seller analysis", async () => {
  const result = await transitionSellerAccountUnlock(lockedSellerState());

  assert.equal(result.ok, false);
  assert.equal(result.state.phase, "locked");
  assert.equal(result.state.dialogStep, "locked-sheet");
  assert.equal(result.state.modalOpen, true);
  assert.equal(result.state.analysisUnlocked, false);
  assert.equal(result.state.netSheet, null);
  assert.equal(result.state.error, "Your seller analysis is still here. Try opening your account again.");
});

test("obligation transition treats blank optional balances as zero without displaying a forced zero", () => {
  const previousState = {
    phase: "entry",
    modalOpen: true,
    statement: { fileName: "payoff.pdf", suggestedPayoffCents: 41_800_000 },
    analysisUnlocked: true,
    netSheet: { projected: { amountCents: 1 } },
  };
  const transition = transitionSellerObligations(previousState, {
    firstMortgage: "0",
    secondMortgageHeloc: "",
    otherLiens: "   ",
    expectedClosingDate: "2026-08-15",
  });

  assert.equal(transition.ok, true);
  assert.equal(previousState.statement.fileName, "payoff.pdf");
  assert.deepEqual(transition.state.obligations, {
    firstMortgageCents: 0,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  });
  assert.equal(transition.state.statement, null);
  assert.equal(transition.state.secondMortgageHelocInput, "");
  assert.equal(transition.state.otherLiensInput, "");
  assert.equal(transition.state.phase, "locked");
  assert.equal(transition.state.analysisUnlocked, false);
  assert.equal(transition.state.netSheet, null);
  assert.equal(transition.state.modalOpen, true);
  assert.equal(transition.state.dialogStep, "locked-sheet");
  assert.equal(transition.state.expectedClosingDate, "2026-08-15");
});

test("obligation validation marks and focuses the actual first invalid field", () => {
  const transition = transitionSellerObligations({
    phase: "entry",
    modalOpen: true,
    dialogStep: "obligations",
    statement: null,
    status: "",
  }, {
    firstMortgage: "418000",
    secondMortgageHeloc: "not an amount",
    otherLiens: "also invalid",
    expectedClosingDate: "not a date",
  });

  assert.equal(transition.ok, false);
  assert.equal(transition.invalidField, "secondMortgageHeloc");
  assert.equal(transition.focusSelector, "[data-seller-obligations-form] input[name='secondMortgageHeloc']");
  assert.equal(typeof sellerUi.renderSellerDialog, "function");
  const html = sellerUi.renderSellerDialog(transition.state);
  assert.match(html, /name="secondMortgageHeloc"[^>]*aria-invalid="true"[^>]*aria-describedby="seller-obligations-error"/);
  assert.match(html, /id="seller-obligations-error"[^>]*>Enter a valid payoff or lien amount, or leave optional fields blank\.</);
  assert.doesNotMatch(html, /name="firstMortgage"[^>]*aria-invalid="true"/);
});

test("seller UI source does not persist private seller inputs", () => {
  const source = fs.readFileSync(path.join(siteDir, "seller-workspace-ui.mjs"), "utf8");

  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(source, /URLSearchParams|history\.(?:pushState|replaceState)/);
  assert.doesNotMatch(source, /track\([^\n]*(?:address|fileName|payoffCents|baseCents|netCents)/i);
});

test("seller stylesheet contains responsive modal and reduced-motion protections", () => {
  const css = fs.readFileSync(path.join(siteDir, "seller-workspace.css"), "utf8");

  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.seller-dialog-panel/);
  assert.match(css, /max-width:\s*calc\(100vw - 32px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.seller-range-field input\[type="range"\]/);
  assert.match(css, /--seller-range-progress/);
  assert.match(css, /\.seller-range-field input\[type="range"\]::-webkit-slider-runnable-track\s*\{[\s\S]*height:\s*20px;[\s\S]*linear-gradient/);
  assert.match(css, /\.seller-range-field input\[type="range"\]::-webkit-slider-thumb/);
  assert.match(css, /\.seller-range-field input\[type="range"\]::-webkit-slider-thumb\s*\{[\s\S]*margin-top:\s*-12px;[\s\S]*-webkit-appearance:\s*none;[\s\S]*border-radius:\s*8px/);
  assert.match(css, /\.seller-range-field input\[type="range"\]::-moz-range-thumb\s*\{[\s\S]*width:\s*(?:4[4-9]|[5-9]\d|\d{3,})px;[\s\S]*height:\s*(?:4[4-9]|[5-9]\d|\d{3,})px/);
  assert.match(css, /\.seller-value-endpoints\s*\{\s*display:\s*grid/);
  assert.match(css, /\.seller-locked-summary/);
  assert.match(css, /\.seller-result-workspace,[\s\S]*\.seller-pro-forma-row > div\s*\{\s*min-width:\s*0/);
  assert.match(css, /\.seller-base-result\s*\{\s*font-size:\s*clamp\(42px, 14vw, 52px\);\s*white-space:\s*nowrap/);
  assert.match(css, /\.seller-result-range strong\s*\{\s*font-size:\s*clamp\(18px, 6vw, 25px\);\s*overflow-wrap:\s*normal;\s*white-space:\s*nowrap/);
  assert.match(css, /\.seller-net-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /\.seller-inline-edit input[\s\S]*max-width:\s*100%/);
  assert.match(css, /\.seller-prefixed-input input\s*\{[\s\S]*border:\s*0;[\s\S]*border-radius:\s*0;[\s\S]*outline:\s*0;[\s\S]*box-shadow:\s*none;/);
  assert.match(css, /\.seller-prefixed-input:focus-within\s*\{[\s\S]*border-color:\s*var\(--snap-blue\);[\s\S]*box-shadow:/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.seller-net-row\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.seller-statement,[\s\S]*\.seller-net-row > \*\s*\{[\s\S]*min-width:\s*0/);
  assert.match(css, /\.seller-download-actions\s*\{[\s\S]*max-width:\s*900px/);
  assert.match(css, /\.seller-download-error\s*\{[\s\S]*color:/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.seller-download\s*\{[\s\S]*width:\s*100%/);
  assert.match(css, /\.seller-sheet-dialog-panel\s*\{[\s\S]*width:\s*min\(1120px, calc\(100vw - 32px\)\)/);
  assert.match(css, /\.seller-sheet-dialog-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 48px\)/);
  assert.match(css, /\.seller-sheet-document\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /\.seller-sheet-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(120px, auto\)/);
  assert.match(css, /\.seller-concealed-value\s*\{[\s\S]*filter:\s*blur/);
  assert.match(css, /\.seller-sheet-account-gate\s*\{[\s\S]*background:\s*var\(--snap-navy\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.seller-sheet-dialog-panel\s*\{[\s\S]*width:\s*calc\(100vw - 24px\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.seller-sheet-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
});

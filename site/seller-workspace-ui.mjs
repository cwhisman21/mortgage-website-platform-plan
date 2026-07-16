import {
  applySellerRowEdit,
  calculateSellerNetSheet,
  createFixtureSellerAdapters,
  defaultExpectedCloseDate,
  formatSellerCurrency,
  normalizeSellerObligations,
  resetSellerAssumptions,
  resolveSellerCostRows,
  selectSellerValue,
  setSellerOptionalRow,
} from "./seller-workspace.mjs";
import { renderPrimaryTagLinks } from "./tag-presentation.mjs";

const SELLER_ANALYSIS_RETRY_MESSAGE = "Your seller analysis is still here. Try opening your account again.";
const SELLER_COSTS_UNAVAILABLE_MESSAGE = "Your seller cost details are unavailable right now. Try again soon.";
const SELLER_NET_SHEET_DISCLAIMER = "This seller net sheet is a planning estimate based on the property value, obligations, closing date, and editable cost assumptions shown. Actual charges, payoff amounts, taxes, credits, compensation, and proceeds can change through closing. Compensation is negotiable and is not set by law.";
const EDIT_INPUT_KIND = Object.freeze({
  percent_of_sale_price: "percent",
  fixed_amount: "currency",
  statutory_transfer_tax: "currency",
  prorated_annual: "currency",
  customer_entered: "currency",
});

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dollarsToCents(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return Number.NaN;
  const dollars = Number(cleaned);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : Number.NaN;
}

function firstPreviewState(fixture, costRegistry = {}) {
  const address = fixture?.addressSuggestions?.[0];
  const valuation = address && fixture?.valuations?.[address.id];
  if (!address || !valuation) return null;
  const valueRange = selectSellerValue(valuation);
  const obligations = normalizeSellerObligations({
    firstMortgageCents: Number(fixture?.statementExtraction?.suggestedPayoffCents) || 0,
    secondMortgageHelocCents: 0,
    otherLiensCents: 0,
  });
  return {
    address,
    sourceValuation: valuation,
    valueRange,
    obligations,
    expectedClosingDate: defaultExpectedCloseDate(),
    costRows: costRegistry?.defaultRows?.length ? resolveSellerCostRows(costRegistry, address) : [],
  };
}

function sellerSteps() {
  const steps = [
    ["01", "Understand value", "Compare the estimate with property details and current market evidence."],
    ["02", "Estimate costs", "Review payoff, compensation, transfer, title, repair, and concession assumptions."],
    ["03", "Prepare to list", "Prioritize work that supports marketability without losing sight of likely proceeds."],
    ["04", "Compare offers", "Evaluate financing, concessions, contingencies, timing, and expected net proceeds."],
    ["05", "Plan closing", "Confirm the payoff statement, final seller costs, required documents, and timing."],
  ];
  return `<div class="seller-step-grid">${steps.map(([number, title, text]) => `
    <article class="seller-step-card">
      <span>${number}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
    </article>`).join("")}</div>`;
}

function sellerGuides() {
  const guides = [
    ["Net proceeds", "How to estimate what you may receive after a sale", "Build a seller net sheet from value, payoff, transaction costs, repairs, concessions, and timing.", "/learning-center/home-equity-options-guide"],
    ["Mortgage payoff", "Why your payoff can differ from your loan balance", "Understand daily interest, fees, escrow, and the requested payoff date before relying on a displayed balance.", "/learning-center/refinance-basics"],
    ["Offer review", "Compare offers beyond the headline price", "Review financing, contingencies, credits, timing, and expected proceeds on consistent assumptions.", "/learning-center/buying-a-home"],
  ];
  return `<div class="seller-guide-grid">${guides.map(([label, title, text, href]) => `
    <article class="seller-guide-card">
      <p class="eyebrow">${esc(label)}</p>
      <h3><a href="${esc(href)}">${esc(title)}</a></h3>
      <p>${esc(text)}</p>
      <a class="text-link" href="${esc(href)}">Read guide</a>
    </article>`).join("")}</div>`;
}

function sellerFaq() {
  const items = [
    ["Is the estimated home value an appraisal?", "No. Use an online estimate as a starting point, then compare it with property condition, recent comparable sales, and current market evidence."],
    ["Why can my mortgage payoff differ from my loan balance?", "A payoff can include daily interest and other amounts through a requested payoff date. Confirm the current payoff before relying on estimated proceeds."],
    ["How are selling-cost assumptions selected?", "The tool starts with editable assumptions associated with the property's state when available and uses a national starting point otherwise."],
    ["Can I see the property value before creating an account?", "Yes. Property value remains visible after you select an address. Detailed selling costs and projected proceeds open through Snap Homes."],
  ];
  return `<div class="faq-list seller-faq">${items.map(([question, answer]) => `
    <details>
      <summary>${esc(question)}</summary>
      <p>${esc(answer)}</p>
    </details>`).join("")}</div>`;
}

function sellerEducation() {
  return `
    <section class="section seller-process-section" aria-labelledby="seller-process-title">
      <p class="eyebrow">Selling step by step</p>
      <h2 id="seller-process-title">Prepare the home and the numbers together.</h2>
      <p class="seller-section-lead">A useful selling plan connects value, condition, marketing, offer terms, mortgage payoff, and closing costs.</p>
      ${sellerSteps()}
    </section>
    <section class="section seller-guidance-section" aria-labelledby="seller-guidance-title">
      <p class="eyebrow">Seller guidance</p>
      <h2 id="seller-guidance-title">Make the next decision with the full transaction in view.</h2>
      ${sellerGuides()}
    </section>
    <section class="section seller-faq-section" aria-labelledby="seller-faq-title">
      <p class="eyebrow">Common questions</p>
      <h2 id="seller-faq-title">Questions sellers ask before listing.</h2>
      ${sellerFaq()}
    </section>
    <section class="section compact seller-methodology" aria-labelledby="seller-methodology-title">
      <h2 id="seller-methodology-title">Methodology and sources</h2>
      <p>The result keeps the confirmed property value, mortgage payoff, address-aware cost assumptions when available, and any edits together. Review the dates and methods attached to each starting figure.</p>
      <nav aria-label="Seller topics">
        <a href="/learning-center/search?tags=home-values">Home values</a>
        <a href="/learning-center/search?tags=home-equity">Home equity</a>
        <a href="/learning-center/search?tags=borrower-planning">Seller planning</a>
      </nav>
      <p class="seller-updated">Last updated <time datetime="2026-07-16">July 16, 2026</time></p>
    </section>`;
}

function renderEntry(primaryTags = []) {
  const outcomes = [
    ["Choose a property value", "Use the returned range to select a working value."],
    ["Confirm known obligations", "Add payoff balances and your expected closing date."],
    ["Open your seller analysis", "Review selling costs and projected proceeds in Snap Homes."],
  ];
  const how = [
    ["01 Home value", "Find and confirm the property", "Use the address to retrieve an estimated value range, then choose a value within it."],
    ["02 Obligations", "Confirm the balances and timing", "Select a statement for a suggested first-mortgage payoff or enter each known balance directly."],
    ["03 Analysis", "Review the full seller analysis", "Open your Snap Homes account to review selling costs, obligations, and projected proceeds together."],
  ];
  const topics = [
    ["Value", "How to think about an online home-value estimate", "Compare broad estimates with property condition, recent comparable sales, and current market evidence."],
    ["Costs", "Selling costs that can change net proceeds", "Review transaction costs, repairs, concessions, payoff figures, and timing on consistent assumptions."],
    ["Offers", "Compare offers beyond the headline price", "Look beyond price to financing, contingencies, credits, closing timing, and the amount expected at settlement."],
  ];
  return `
    <section class="seller-entry-hero">
      <div class="seller-entry-copy">
        <p class="eyebrow">Sell a home</p>
        ${renderPrimaryTagLinks(primaryTags)}
        <h1>Start with what your sale could leave you.</h1>
        <p class="lead">Enter your home address to see a property-value range, choose a working value, and confirm the obligations you already know.</p>
        <button class="button" type="button" data-seller-open-address>Explore my property value range</button>
        <p class="seller-helper">Seller guidance remains available while you consider your next move.</p>
      </div>
      <aside class="seller-outcome-preview">
        <p class="eyebrow">Your estimate</p>
        <h2>See the sale in one clear breakdown.</h2>
        <ol>${outcomes.map(([title, text]) => `<li><strong>${esc(title)}</strong><span>${esc(text)}</span></li>`).join("")}</ol>
      </aside>
    </section>
    <section class="section seller-how-section" aria-labelledby="seller-how-title">
      <p class="eyebrow">How it works</p>
      <h2 id="seller-how-title">A seller estimate built around the numbers that matter.</h2>
      <p class="seller-section-lead">Begin with the property, then replace broad assumptions with the information you know.</p>
      <div class="seller-how-grid">${how.map(([label, title, text]) => `
        <article><p class="eyebrow">${esc(label)}</p><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>
    </section>
    <section class="section seller-topic-section" aria-labelledby="seller-topic-title">
      <p class="eyebrow">Seller guidance</p>
      <h2 id="seller-topic-title">Know the decisions behind the estimate.</h2>
      <div class="seller-how-grid">${topics.map(([label, title, text]) => `
        <article><p class="eyebrow">${esc(label)}</p><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>
    </section>
    <section class="section compact seller-entry-cta">
      <div><p class="eyebrow">Ready to start?</p><h2>Start with your property value and known obligations.</h2><p>Enter the address first, then choose a value within the returned range.</p></div>
      <button class="button" type="button" data-seller-open-address>Enter my home address</button>
    </section>`;
}

function renderLockedSummary(state) {
  const { valueRange, obligations } = state;
  const accountLabel = state.isLoggedIn ? "Open My Account" : "Create My Account";
  return `
    <section class="seller-locked-summary" data-seller-locked-summary tabindex="-1" aria-labelledby="seller-locked-summary-title">
      <div class="seller-locked-heading">
        <p class="eyebrow">Sell a home</p>
        <h1 id="seller-locked-summary-title">Your property details are confirmed.</h1>
        <p>${esc(state.address.displayAddress)}</p>
      </div>
      <div class="seller-locked-grid">
        <section class="seller-selected-value" aria-labelledby="seller-selected-value-title">
          <p class="eyebrow">Selected property value</p>
          <strong id="seller-selected-value-title">${esc(formatSellerCurrency(valueRange.selectedCents))}</strong>
          <div class="seller-value-endpoints"><span>Low <strong>${esc(formatSellerCurrency(valueRange.lowCents))}</strong></span><span>High <strong>${esc(formatSellerCurrency(valueRange.highCents))}</strong></span></div>
        </section>
        <section class="seller-obligation-confirmation" aria-labelledby="seller-obligation-confirmation-title">
          <h2 id="seller-obligation-confirmation-title">Confirmed obligations</h2>
          <dl>
            <div><dt>First mortgage payoff</dt><dd>${esc(formatSellerCurrency(obligations.firstMortgageCents))}</dd></div>
            <div><dt>Second mortgage or HELOC payoff</dt><dd>${esc(formatSellerCurrency(obligations.secondMortgageHelocCents))}</dd></div>
            <div><dt>Other liens</dt><dd>${esc(formatSellerCurrency(obligations.otherLiensCents))}</dd></div>
            <div><dt>Expected closing date</dt><dd>${esc(state.expectedClosingDate)}</dd></div>
          </dl>
        </section>
      </div>
      <section class="seller-locked-account" data-seller-account aria-labelledby="seller-locked-account-title">
        <div>
          <p class="eyebrow">Seller analysis</p>
          <h2 id="seller-locked-account-title">Open the details in Snap Homes.</h2>
          <p>Your seller analysis includes the cost categories and proceeds view below.</p>
        </div>
        <dl class="seller-locked-categories">
          <div><dt>Selling expenses</dt><dd>Available in your seller analysis</dd></div>
          <div><dt>Existing obligations</dt><dd>Available in your seller analysis</dd></div>
          <div><dt>Projected proceeds</dt><dd>Available in your seller analysis</dd></div>
        </dl>
        <div class="seller-account-actions">
          <button class="button" type="button" data-seller-open-account${state.accountPending ? " disabled" : ""}>${esc(state.accountPending ? "Opening account..." : accountLabel)}</button>
          <p class="seller-account-error" data-seller-account-error${state.error ? "" : " hidden"}>${esc(state.error)}</p>
        </div>
      </section>
    </section>
    ${sellerEducation()}`;
}

function rowDefinition(state, rowId) {
  return (state.costRows || []).find((row) => row.id === rowId);
}

function percentValueForRow(state, row) {
  const effective = state.overrides?.[row.id];
  const rate = effective?.mode === "percent_of_sale_price" ? effective.value : row.value;
  return Number((Number(rate) * 100).toFixed(4));
}

function renderEditActions(row, definition) {
  return `
    <button class="seller-row-edit" type="button" data-seller-edit-row="${esc(row.id)}" data-seller-edit-mode="${esc(row.mode)}">Edit</button>
    ${definition?.optional ? `<button class="seller-row-remove" type="button" aria-label="Remove ${esc(row.label)}" data-seller-remove-row="${esc(row.id)}">Remove</button>` : ""}`;
}

function renderCurrencyEditor(row) {
  return `
    <form class="seller-inline-edit" data-seller-edit-form data-seller-edit-row-id="${esc(row.id)}" data-seller-edit-mode="${esc(row.mode)}">
      <label><span class="visually-hidden">${esc(row.label)}</span><span class="seller-prefixed-input"><span aria-hidden="true">$</span><input name="value" inputmode="decimal" value="${esc((row.amountCents / 100).toFixed(2))}" data-seller-edit-input data-seller-currency-input /></span></label>
      <button class="text-button" type="submit">Apply</button>
      <button class="text-button" type="button" data-seller-cancel-edit>Cancel</button>
    </form>`;
}

function renderPercentEditor(state, row, definition) {
  return `
    <form class="seller-inline-edit seller-percent-edit" data-seller-edit-form data-seller-edit-row-id="${esc(row.id)}" data-seller-edit-mode="percent_of_sale_price">
      <label><span class="visually-hidden">${esc(row.label)} percentage</span><input name="value" type="number" min="0" step="0.01" value="${esc(percentValueForRow(state, definition))}" data-seller-edit-input data-seller-percent-input /><span aria-hidden="true">%</span></label>
      <output data-seller-live-amount>${esc(formatSellerCurrency(row.amountCents))}</output>
      <button class="text-button" type="submit">Apply</button>
      <button class="text-button" type="button" data-seller-cancel-edit>Cancel</button>
    </form>`;
}

function renderNetSheetRow(state, row) {
  const definition = rowDefinition(state, row.id);
  const inputKind = EDIT_INPUT_KIND[row.mode];
  const isEditing = state.editingRowId === row.id;
  return `
    <div class="seller-net-row" data-seller-row="${esc(row.id)}">
      <dt>${esc(row.label)}</dt>
      <dd>${isEditing
    ? (inputKind === "percent" ? renderPercentEditor(state, row, definition) : renderCurrencyEditor(row))
    : `<span class="seller-row-amount">${esc(formatSellerCurrency(row.amountCents))}</span>${renderEditActions(row, definition)}`}</dd>
    </div>`;
}

function renderOptionalRows(state, group) {
  const inactive = (state.costRows || []).filter((row) => row.optional
    && row.group === group
    && !(state.activeOptionalIds || []).includes(row.id));
  if (!inactive.length) return "";
  return `
    <details class="seller-add-cost" data-seller-add-cost="${esc(group)}">
      <summary>Add another cost</summary>
      <div>${inactive.map((row) => `<button type="button" data-seller-add-row="${esc(row.id)}">${esc(row.label)}</button>`).join("")}</div>
    </details>`;
}

function renderDateEditor(state) {
  if (state.editingRowId !== "expectedClosingDate") {
    return `<time datetime="${esc(state.expectedClosingDate)}" data-seller-edit-date>${esc(state.expectedClosingDate)}</time><button class="seller-row-edit" type="button" data-seller-edit-row="expectedClosingDate" data-seller-edit-mode="date">Edit</button>`;
  }
  return `
    <form class="seller-inline-edit" data-seller-edit-form data-seller-edit-row-id="expectedClosingDate" data-seller-edit-mode="date">
      <label><span class="visually-hidden">Expected closing date</span><input name="value" type="date" value="${esc(state.expectedClosingDate)}" data-seller-edit-input /></label>
      <button class="text-button" type="submit">Apply</button>
      <button class="text-button" type="button" data-seller-cancel-edit>Cancel</button>
    </form>`;
}

function renderSalePriceEditor(state) {
  const { valueRange } = state;
  if (state.editingRowId !== "salePrice") {
    return `<strong class="seller-selected-price" data-seller-selected-sale-price>${esc(formatSellerCurrency(valueRange.selectedCents))}</strong><button class="seller-row-edit" type="button" data-seller-edit-row="salePrice" data-seller-edit-mode="sale_price" data-seller-edit-sale-price>Edit</button>`;
  }
  return `
    <form class="seller-sale-price-edit" data-seller-edit-form data-seller-edit-row-id="salePrice" data-seller-edit-mode="sale_price" data-seller-edit-sale-price>
      <label class="seller-range-field" for="seller-net-sheet-value-range"><span>Selected property value</span>
        <output for="seller-net-sheet-value-range" data-seller-edit-sale-price-output>${esc(formatSellerCurrency(valueRange.selectedCents))}</output>
        <input id="seller-net-sheet-value-range" type="range" min="${esc(valueRange.lowCents)}" max="${esc(valueRange.highCents)}" step="${esc(valueRange.stepCents)}" value="${esc(valueRange.selectedCents)}" name="value" data-seller-edit-input data-seller-edit-sale-price-range />
      </label>
      <div class="seller-value-endpoints"><span>Low <strong>${esc(formatSellerCurrency(valueRange.lowCents))}</strong></span><span>High <strong>${esc(formatSellerCurrency(valueRange.highCents))}</strong></span></div>
      <div class="seller-edit-actions"><button class="text-button" type="submit">Apply</button><button class="text-button" type="button" data-seller-cancel-edit>Cancel</button></div>
    </form>`;
}

function renderSummaryRow(label, amountCents, className = "") {
  return `<div class="seller-net-row seller-net-total ${esc(className)}"><dt>${esc(label)}</dt><dd><strong>${esc(formatSellerCurrency(amountCents))}</strong></dd></div>`;
}

export function renderSellerNetSheet(state) {
  if (state?.phase !== "unlocked" || !state.netSheet) throw new Error("Seller net sheet requires unlocked calculated state");
  const { netSheet } = state;
  const projectedLabel = netSheet.projected.kind === "shortfall" ? "Projected shortfall" : "Projected net proceeds";
  const lowLabel = netSheet.scenarios.low.kind === "shortfall" ? "Low-value shortfall" : "Low-value proceeds";
  const highLabel = netSheet.scenarios.high.kind === "shortfall" ? "High-value shortfall" : "High-value proceeds";
  return `
    <section class="seller-results" data-seller-net-sheet tabindex="-1" aria-labelledby="seller-net-sheet-title">
      <header class="seller-result-heading">
        <div><p class="eyebrow">Seller analysis</p><h1 id="seller-net-sheet-title">Seller net sheet</h1><p>${esc(state.address.displayAddress)}</p></div>
        <button class="text-button seller-reset" type="button" data-seller-reset-assumptions>Reset assumptions</button>
      </header>
      <div class="seller-result-workspace">
        <section class="seller-result-summary" aria-labelledby="seller-selected-value-heading">
          <p class="eyebrow" id="seller-selected-value-heading">Selected property value</p>
          <div class="seller-selected-price-line">${renderSalePriceEditor(state)}</div>
          <div class="seller-close-date"><span>Expected closing date</span><div>${renderDateEditor(state)}</div></div>
          <div class="seller-projected-result" data-seller-projected-result>
            <span>${esc(projectedLabel)}</span>
            <strong id="seller-projected-result-title">${esc(formatSellerCurrency(netSheet.projected.amountCents))}</strong>
          </div>
          <dl class="seller-final-comparison" aria-label="Low and high final comparison">
            <div><dt>${esc(lowLabel)}</dt><dd data-seller-low-proceeds>${esc(formatSellerCurrency(netSheet.scenarios.low.amountCents))}</dd></div>
            <div><dt>${esc(highLabel)}</dt><dd data-seller-high-proceeds>${esc(formatSellerCurrency(netSheet.scenarios.high.amountCents))}</dd></div>
          </dl>
        </section>
        <div class="seller-statement">
          <section class="seller-net-group" data-seller-group="sellingExpenses" aria-labelledby="seller-selling-expenses-title">
            <h2 id="seller-selling-expenses-title">Selling expenses</h2>
            <dl>${netSheet.groups.sellingExpenses.map((row) => renderNetSheetRow(state, row)).join("")}</dl>
            ${renderOptionalRows(state, "sellingExpenses")}
          </section>
          <section class="seller-net-group" data-seller-group="obligations" aria-labelledby="seller-obligations-title">
            <h2 id="seller-obligations-title">Existing obligations</h2>
            <dl>${netSheet.groups.obligations.map((row) => renderNetSheetRow(state, row)).join("")}</dl>
            ${renderOptionalRows(state, "obligations")}
          </section>
          <section class="seller-net-summary" aria-labelledby="seller-net-summary-title">
            <h2 id="seller-net-summary-title">Summary</h2>
            <dl>
              ${renderSummaryRow("Total selling expenses", netSheet.totalSellingExpensesCents)}
              ${renderSummaryRow("Net before obligations", netSheet.netBeforeObligationsCents)}
              ${renderSummaryRow("Total obligations", netSheet.totalObligationsCents)}
              ${renderSummaryRow(projectedLabel, netSheet.projected.amountCents, "seller-net-projected")}
            </dl>
          </section>
        </div>
      </div>
      <p class="seller-net-disclaimer">${esc(SELLER_NET_SHEET_DISCLAIMER)}</p>
      <p class="visually-hidden" aria-live="polite" data-seller-net-sheet-status>${esc(state.status)}</p>
    </section>`;
}

function renderUnlockedAnalysis(state) {
  return `${renderSellerNetSheet(state)}${sellerEducation()}`;
}

function renderAddressStep(state) {
  return `
    <form data-seller-address-form>
      <label class="seller-field" for="seller-home-address"><span>Home address</span>
        <input id="seller-home-address" name="address" value="${esc(state.addressQuery)}" autocomplete="street-address" data-seller-address-input role="combobox" aria-autocomplete="list" aria-controls="seller-address-suggestions" aria-expanded="${state.suggestions.length ? "true" : "false"}" />
      </label>
      <ul class="seller-address-suggestions" id="seller-address-suggestions" role="listbox"${state.suggestions.length ? "" : " hidden"}>
        ${state.suggestions.map((suggestion, index) => `<li role="option" aria-selected="${index === state.activeSuggestionIndex ? "true" : "false"}"><button type="button" data-seller-address-option="${esc(suggestion.id)}">${esc(suggestion.displayAddress)}</button></li>`).join("")}
      </ul>
      <button class="button" type="submit" data-seller-find-home>Find my home</button>
    </form>`;
}

function renderValueStep(state) {
  const { valueRange } = state;
  return `
    <div class="seller-value-confirmation">
      <p class="eyebrow">Estimated home value</p>
      <strong>${esc(formatSellerCurrency(valueRange.selectedCents))}</strong>
      <p>As of ${esc(state.sourceValuation.asOf)}. Choose a value within the returned range before continuing.</p>
    </div>
    <label class="seller-range-field" for="seller-value-range"><span>Selected property value</span>
      <output data-seller-selected-value for="seller-value-range">${esc(formatSellerCurrency(valueRange.selectedCents))}</output>
      <input id="seller-value-range" type="range" min="${esc(valueRange.lowCents)}" max="${esc(valueRange.highCents)}" step="${esc(valueRange.stepCents)}" value="${esc(valueRange.selectedCents)}" data-seller-value-range />
    </label>
    <div class="seller-value-endpoints"><span>Low <strong>${esc(formatSellerCurrency(valueRange.lowCents))}</strong></span><span>High <strong>${esc(formatSellerCurrency(valueRange.highCents))}</strong></span></div>
    <div class="seller-dialog-actions"><button class="button" type="button" data-seller-use-value>Use this value</button></div>`;
}

function renderObligationsStep(state) {
  return `
    <form data-seller-obligations-form>
      <label class="seller-upload-field"><span>Mortgage statement</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" data-seller-statement /><strong>Select mortgage statement</strong><small>The suggested payoff remains editable and must be confirmed.</small></label>
      ${state.statement ? `<p class="seller-file-status">${esc(state.statement.fileName)}: suggested amount ready to confirm.</p>` : ""}
      <div class="seller-divider"><span>or enter the amount</span></div>
      <label class="seller-field"><span>First mortgage payoff</span><span class="seller-prefixed-input"><span aria-hidden="true">$</span><input name="firstMortgage" inputmode="decimal" value="${esc(state.firstMortgageInput)}" /></span></label>
      <label class="seller-field"><span>Second mortgage or HELOC payoff</span><span class="seller-prefixed-input"><span aria-hidden="true">$</span><input name="secondMortgageHeloc" inputmode="decimal" value="${esc(state.secondMortgageHelocInput)}" /></span></label>
      <label class="seller-field"><span>Other liens</span><span class="seller-prefixed-input"><span aria-hidden="true">$</span><input name="otherLiens" inputmode="decimal" value="${esc(state.otherLiensInput)}" /></span></label>
      <label class="seller-field"><span>Expected closing date</span><input name="expectedClosingDate" type="date" value="${esc(state.expectedClosingDate)}" /></label>
      <button class="button" type="submit">Confirm property details</button>
    </form>`;
}

function dialogTitle(step) {
  return step === "value" ? "Choose the property value" : step === "obligations" ? "Confirm obligations and timing" : "What is your home address?";
}

function renderDialog(state) {
  const stepNumber = state.dialogStep === "value" ? 2 : state.dialogStep === "obligations" ? 3 : 1;
  const body = state.dialogStep === "value" ? renderValueStep(state) : state.dialogStep === "obligations" ? renderObligationsStep(state) : renderAddressStep(state);
  return `
    <div class="seller-dialog-backdrop" data-seller-dialog role="dialog" aria-modal="true" aria-labelledby="seller-dialog-title"${state.modalOpen ? "" : " hidden"}>
      <section class="seller-dialog-panel">
        <button class="seller-dialog-close" type="button" aria-label="Close seller estimate" data-seller-dialog-close>&times;</button>
        <p class="eyebrow">Step ${stepNumber} of 3</p>
        <h2 id="seller-dialog-title">${esc(dialogTitle(state.dialogStep))}</h2>
        <p>${state.dialogStep === "address" ? "We will use the address to find the property and return a value range when available." : state.dialogStep === "value" ? "Review the range and choose the value you want to use." : "Select a statement for a suggested first-mortgage payoff or enter the balances directly, then add your expected closing date."}</p>
        ${body}
        <p class="seller-dialog-error" data-seller-dialog-error${state.error ? "" : " hidden"}>${esc(state.error)}</p>
        <p class="visually-hidden" data-seller-dialog-status aria-live="polite">${esc(state.status)}</p>
        ${stepNumber > 1 ? `<button class="text-link text-button seller-dialog-back" type="button" data-seller-dialog-back>Back</button>` : ""}
      </section>
    </div>`;
}

function initialState({ fixture, costRegistry, preview, isLoggedIn, primaryTags = [] }) {
  const previewState = ["value", "obligations", "locked", "unlocked"].includes(preview)
    ? firstPreviewState(fixture, costRegistry)
    : null;
  const state = {
    phase: preview === "unlocked" ? "unlocked" : preview === "locked" ? "locked" : "entry",
    modalOpen: ["value", "obligations"].includes(preview),
    dialogStep: preview === "obligations" ? "obligations" : preview === "value" ? "value" : "address",
    addressQuery: "",
    suggestions: [],
    activeSuggestionIndex: -1,
    address: previewState?.address || null,
    sourceValuation: previewState?.sourceValuation || null,
    valueRange: previewState?.valueRange || null,
    obligations: previewState?.obligations || null,
    firstMortgageInput: previewState ? (previewState.obligations.firstMortgageCents / 100).toFixed(2) : "",
    secondMortgageHelocInput: previewState ? (previewState.obligations.secondMortgageHelocCents / 100).toFixed(2) : "",
    otherLiensInput: previewState ? (previewState.obligations.otherLiensCents / 100).toFixed(2) : "",
    expectedClosingDate: previewState?.expectedClosingDate || "",
    costRows: previewState?.costRows || [],
    activeOptionalIds: [],
    overrides: {},
    editingRowId: "",
    netSheet: null,
    analysisUnlocked: preview === "unlocked",
    accountPending: false,
    statement: null,
    error: "",
    status: "",
    isLoggedIn: Boolean(isLoggedIn),
    primaryTags,
  };
  if (preview === "unlocked" && previewState) {
    state.netSheet = calculateSellerNetSheet(buildCalculationInput(state));
  }
  return state;
}

function renderInner(state) {
  const content = state.phase === "entry"
    ? renderEntry(state.primaryTags)
    : state.phase === "unlocked"
      ? renderUnlockedAnalysis(state)
      : renderLockedSummary(state);
  return `${content}${renderDialog(state)}`;
}

function buildCalculationInput(state) {
  return {
    valueRange: state.valueRange,
    obligations: state.obligations,
    expectedClosingDate: state.expectedClosingDate,
    costRows: state.costRows,
    activeOptionalIds: state.activeOptionalIds,
    overrides: state.overrides,
  };
}

export function renderSellerWorkspace(page = {}, fixture = {}, options = {}) {
  const state = initialState({ fixture, costRegistry: options.costRegistry, preview: options.preview, isLoggedIn: options.isLoggedIn, primaryTags: options.primaryTags });
  return `<div class="seller-workspace" data-seller-workspace data-seller-page-id="${esc(page.id || "seller-home")}">${renderInner(state)}</div>`;
}

function focusableElements(dialog) {
  return [...dialog.querySelectorAll("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && !element.hidden && element.offsetParent !== null);
}

function isValidExpectedCloseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]);
}

export function transitionSellerObligations(state, input = {}) {
  const firstMortgageCents = dollarsToCents(input.firstMortgage);
  const secondMortgageHelocCents = dollarsToCents(input.secondMortgageHeloc);
  const otherLiensCents = dollarsToCents(input.otherLiens);
  const expectedClosingDate = String(input.expectedClosingDate || "");
  let obligations;
  try {
    obligations = normalizeSellerObligations({ firstMortgageCents, secondMortgageHelocCents, otherLiensCents });
  } catch {
    return {
      ok: false,
      error: "Enter each known payoff or lien amount. Use 0 when a balance does not apply.",
      focusSelector: "[data-seller-obligations-form] input[name='firstMortgage']",
    };
  }
  if (!isValidExpectedCloseDate(expectedClosingDate)) {
    return {
      ok: false,
      error: "Enter a valid expected closing date.",
      focusSelector: "[data-seller-obligations-form] input[name='expectedClosingDate']",
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      obligations,
      firstMortgageInput: (obligations.firstMortgageCents / 100).toFixed(2),
      secondMortgageHelocInput: (obligations.secondMortgageHelocCents / 100).toFixed(2),
      otherLiensInput: (obligations.otherLiensCents / 100).toFixed(2),
      expectedClosingDate,
      phase: "locked",
      analysisUnlocked: false,
      netSheet: null,
      modalOpen: false,
      statement: null,
      error: "",
    },
  };
}

function preserveLockedSellerState(state, error) {
  return {
    ...state,
    phase: "locked",
    analysisUnlocked: false,
    accountPending: false,
    netSheet: null,
    error,
  };
}

export async function transitionSellerAccountUnlock(state, {
  openAccount = async () => ({ status: "unavailable" }),
} = {}) {
  if (!Array.isArray(state?.costRows) || !state.costRows.length) {
    return { ok: false, state: preserveLockedSellerState(state, SELLER_COSTS_UNAVAILABLE_MESSAGE) };
  }
  try {
    const completion = await openAccount({
      mode: state.isLoggedIn ? "open" : "create",
      intent: "seller-net-sheet",
    });
    if (completion?.status !== "completed") throw new Error("Account handoff did not complete");
  } catch {
    return { ok: false, state: preserveLockedSellerState(state, SELLER_ANALYSIS_RETRY_MESSAGE) };
  }
  try {
    return {
      ok: true,
      state: {
        ...state,
        analysisUnlocked: true,
        accountPending: false,
        netSheet: calculateSellerNetSheet(buildCalculationInput(state)),
        phase: "unlocked",
        error: "",
      },
    };
  } catch {
    return { ok: false, state: preserveLockedSellerState(state, SELLER_COSTS_UNAVAILABLE_MESSAGE) };
  }
}

export function wireSellerWorkspace(root, {
  fixture = {},
  costRegistry = {},
  isLoggedIn = false,
  primaryTags = [],
  openAccount = async () => ({ status: "unavailable" }),
  track = () => {},
} = {}) {
  if (!root) return { destroy() {} };
  const adapters = createFixtureSellerAdapters(fixture);
  const state = initialState({ fixture, costRegistry, isLoggedIn, primaryTags });
  let returnFocus = null;
  let suggestionRequest = 0;

  const emit = (name, payload = {}) => track(name, payload);
  const redraw = (focusSelector = "") => {
    root.innerHTML = renderInner(state);
    document.body.classList.toggle("no-scroll", state.modalOpen);
    if (focusSelector) requestAnimationFrame(() => root.querySelector(focusSelector)?.focus());
  };
  const clearFileReference = () => {
    state.statement = null;
  };
  const closeDialog = () => {
    state.modalOpen = false;
    state.error = "";
    clearFileReference();
    redraw();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  };
  const openDialog = (trigger, step = "address") => {
    returnFocus = trigger || document.activeElement;
    state.modalOpen = true;
    state.dialogStep = step;
    state.error = "";
    redraw(step === "address" ? "[data-seller-address-input]" : ".seller-dialog-panel button");
    emit("seller_flow_opened", { step });
  };
  const selectAddress = (id) => {
    const selected = state.suggestions.find((suggestion) => suggestion.id === id);
    if (!selected) return;
    state.address = selected;
    state.addressQuery = selected.displayAddress;
    state.suggestions = [];
    state.activeSuggestionIndex = -1;
    const input = root.querySelector("[data-seller-address-input]");
    if (input) input.value = selected.displayAddress;
    const list = root.querySelector("#seller-address-suggestions");
    if (list) list.hidden = true;
    input?.setAttribute("aria-expanded", "false");
  };
  const findHome = async () => {
    state.error = "";
    if (!state.address || state.address.displayAddress !== state.addressQuery) {
      const matches = await adapters.address.search(state.addressQuery);
      if (matches.length === 1) state.address = matches[0];
    }
    if (!state.address) {
      state.error = "Choose an address from the suggestions or enter more of the street address.";
      redraw("[data-seller-address-input]");
      return;
    }
    state.status = "Finding the property value estimate.";
    redraw();
    const valuation = await adapters.valuation.get(state.address.id);
    if (!valuation) {
      state.error = "A value estimate is not available for this address. Please try another address.";
      state.status = "";
      redraw("[data-seller-address-input]");
      return;
    }
    state.sourceValuation = valuation;
    state.valueRange = selectSellerValue(valuation);
    state.costRows = costRegistry?.defaultRows?.length ? resolveSellerCostRows(costRegistry, state.address) : [];
    state.dialogStep = "value";
    state.status = "Estimated value ready to confirm.";
    redraw("[data-seller-value-range]");
    emit("seller_flow_advanced", { step: "value" });
  };
  const useSelectedValue = () => {
    state.expectedClosingDate ||= defaultExpectedCloseDate();
    state.dialogStep = "obligations";
    state.error = "";
    redraw("[data-seller-obligations-form] input[name='firstMortgage']");
    emit("seller_flow_advanced", { step: "obligations" });
  };
  const confirmObligations = (formValues) => {
    const transition = transitionSellerObligations(state, {
      firstMortgage: formValues.get("firstMortgage"),
      secondMortgageHeloc: formValues.get("secondMortgageHeloc"),
      otherLiens: formValues.get("otherLiens"),
      expectedClosingDate: formValues.get("expectedClosingDate"),
    });
    if (!transition.ok) {
      state.error = transition.error;
      redraw(transition.focusSelector);
      return;
    }
    Object.assign(state, transition.state);
    redraw();
    requestAnimationFrame(() => root.querySelector("[data-seller-locked-summary]")?.focus());
    emit("seller_flow_completed", { step: "locked", status: "confirmed" });
  };
  const unlockSellerAnalysis = async () => {
    state.accountPending = true;
    state.error = "";
    redraw("[data-seller-account]");
    const transition = await transitionSellerAccountUnlock(state, { openAccount });
    Object.assign(state, transition.state);
    if (transition.ok) {
      redraw("[data-seller-net-sheet]");
      emit("seller_analysis_unlocked", { step: "account", status: "completed" });
      return;
    }
    redraw("[data-seller-account]");
  };
  const beginInlineEdit = (rowId) => {
    state.editingRowId = rowId;
    state.status = "";
    redraw("[data-seller-edit-input]");
  };
  const cancelInlineEdit = () => {
    const rowId = state.editingRowId;
    state.editingRowId = "";
    state.status = "Edit cancelled.";
    redraw(`[data-seller-edit-row="${rowId}"]`);
  };
  const applyInlineEdit = (form, values) => {
    const rowId = form.dataset.sellerEditRowId;
    const mode = form.dataset.sellerEditMode;
    const rawValue = values.get("value");
    const value = mode === "percent_of_sale_price"
      ? Number(rawValue)
      : mode === "date"
        ? String(rawValue || "")
        : mode === "sale_price"
          ? Number(rawValue)
          : dollarsToCents(rawValue);
    try {
      Object.assign(state, applySellerRowEdit(state, { rowId, mode, value }));
      state.editingRowId = "";
      state.status = "Seller net sheet updated.";
      redraw(`[data-seller-edit-row="${rowId}"]`);
    } catch {
      state.status = "Enter a valid value before applying this edit.";
      redraw("[data-seller-edit-input]");
    }
  };
  const addOptionalRow = (rowId) => {
    Object.assign(state, setSellerOptionalRow(state, rowId, true));
    state.editingRowId = "";
    state.status = "Cost added.";
    redraw(`[data-seller-edit-row="${rowId}"]`);
  };
  const removeOptionalRow = (rowId) => {
    const group = rowDefinition(state, rowId)?.group;
    Object.assign(state, setSellerOptionalRow(state, rowId, false));
    state.editingRowId = "";
    state.status = "Cost removed.";
    redraw(`[data-seller-add-cost="${group}"] summary`);
  };
  const resetNetSheet = () => {
    Object.assign(state, resetSellerAssumptions(state));
    state.editingRowId = "";
    state.status = "Seller assumptions reset.";
    redraw("[data-seller-reset-assumptions]");
  };

  const handleClick = (event) => {
    const target = event.target.closest("button, [data-seller-open-address]");
    if (!target || !root.contains(target)) return;
    if (target.matches("[data-seller-open-address], [data-seller-edit-address]")) openDialog(target, "address");
    else if (target.matches("[data-seller-dialog-close]")) closeDialog();
    else if (target.matches("[data-seller-address-option]")) selectAddress(target.dataset.sellerAddressOption);
    else if (target.matches("[data-seller-use-value]")) useSelectedValue();
    else if (target.matches("[data-seller-open-account]")) void unlockSellerAnalysis();
    else if (target.matches("[data-seller-edit-row]")) beginInlineEdit(target.dataset.sellerEditRow);
    else if (target.matches("[data-seller-cancel-edit]")) cancelInlineEdit();
    else if (target.matches("[data-seller-add-row]")) addOptionalRow(target.dataset.sellerAddRow);
    else if (target.matches("[data-seller-remove-row]")) removeOptionalRow(target.dataset.sellerRemoveRow);
    else if (target.matches("[data-seller-reset-assumptions]")) resetNetSheet();
    else if (target.matches("[data-seller-dialog-back]")) {
      state.dialogStep = state.dialogStep === "obligations" ? "value" : "address";
      state.error = "";
      redraw(state.dialogStep === "address" ? "[data-seller-address-input]" : "[data-seller-use-value]");
    }
  };
  const handleSubmit = (event) => {
    const form = event.target.closest("form");
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const values = new FormData(form);
    if (form.matches("[data-seller-edit-form]")) applyInlineEdit(form, values);
    else if (form.matches("[data-seller-address-form]")) void findHome();
    else if (form.matches("[data-seller-obligations-form]")) confirmObligations(values);
  };
  const handleInput = async (event) => {
    if (event.target.matches("[data-seller-edit-sale-price-range]")) {
      const output = root.querySelector("[data-seller-edit-sale-price-output]");
      if (output) output.textContent = formatSellerCurrency(Number(event.target.value));
      return;
    }
    if (event.target.matches("[data-seller-percent-input]")) {
      const output = root.querySelector("[data-seller-live-amount]");
      const rate = Number(event.target.value) / 100;
      if (output) output.textContent = formatSellerCurrency(Math.round(state.valueRange.selectedCents * rate));
      return;
    }
    if (event.target.matches("[data-seller-value-range]")) {
      state.valueRange.selectedCents = Number(event.target.value);
      const output = root.querySelector("[data-seller-selected-value]");
      if (output) output.textContent = formatSellerCurrency(state.valueRange.selectedCents);
      return;
    }
    if (!event.target.matches("[data-seller-address-input]")) return;
    state.addressQuery = event.target.value;
    state.address = null;
    const requestId = ++suggestionRequest;
    const suggestions = state.addressQuery.trim().length >= 3
      ? await adapters.address.search(state.addressQuery)
      : [];
    if (requestId !== suggestionRequest) return;
    state.suggestions = suggestions.slice(0, 5);
    state.activeSuggestionIndex = state.suggestions.length ? 0 : -1;
    const list = root.querySelector("#seller-address-suggestions");
    if (!list) return;
    list.innerHTML = state.suggestions.map((suggestion, index) => `<li role="option" aria-selected="${index === state.activeSuggestionIndex ? "true" : "false"}"><button type="button" data-seller-address-option="${esc(suggestion.id)}">${esc(suggestion.displayAddress)}</button></li>`).join("");
    list.hidden = !state.suggestions.length;
    event.target.setAttribute("aria-expanded", String(Boolean(state.suggestions.length)));
  };
  const handleChange = async (event) => {
    if (!event.target.matches("[data-seller-statement]")) return;
    const file = event.target.files?.[0];
    if (!file) return;
    state.error = "";
    state.status = "Reading the suggested payoff amount.";
    try {
      state.statement = await adapters.statement.read(file);
      state.firstMortgageInput = (state.statement.suggestedPayoffCents / 100).toFixed(2);
      state.status = "Suggested payoff ready to confirm.";
      redraw("[data-seller-obligations-form] input[name='firstMortgage']");
      emit("seller_statement_suggestion_ready", { step: "obligations", status: "suggested" });
    } catch (error) {
      state.statement = null;
      state.error = error.message;
      redraw("[data-seller-statement]");
    }
  };
  const handleKeydown = (event) => {
    const form = event.target.closest("[data-seller-edit-form]");
    if (event.key === "Enter" && state.editingRowId && form) {
      event.preventDefault();
      applyInlineEdit(form, new FormData(form));
      return;
    }
    const input = event.target.closest("[data-seller-address-input]");
    if (input && state.suggestions.length && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "ArrowDown") state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % state.suggestions.length;
      else if (event.key === "ArrowUp") state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + state.suggestions.length) % state.suggestions.length;
      else selectAddress(state.suggestions[Math.max(0, state.activeSuggestionIndex)].id);
      if (event.key !== "Enter") {
        root.querySelectorAll("#seller-address-suggestions [role='option']").forEach((option, index) => option.setAttribute("aria-selected", String(index === state.activeSuggestionIndex)));
      }
      return;
    }
    if (event.key === "Escape") {
      if (state.editingRowId) {
        event.preventDefault();
        root.querySelector("[data-seller-cancel-edit]");
        cancelInlineEdit();
        return;
      }
      if (state.modalOpen) {
        event.preventDefault();
        closeDialog();
      }
      return;
    }
    if (event.key !== "Tab" || !state.modalOpen) return;
    const dialog = root.querySelector("[data-seller-dialog]");
    const focusable = focusableElements(dialog);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const handleUnload = () => clearFileReference();

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  root.addEventListener("keydown", handleKeydown);
  window.addEventListener("pagehide", handleUnload);

  return {
    destroy() {
      clearFileReference();
      document.body.classList.remove("no-scroll");
      root.removeEventListener("click", handleClick);
      root.removeEventListener("submit", handleSubmit);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("change", handleChange);
      root.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("pagehide", handleUnload);
    },
  };
}

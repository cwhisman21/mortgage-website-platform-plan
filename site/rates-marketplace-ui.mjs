import {
  MARKETPLACE_DEFAULTS,
  createFixtureMarketplaceAdapter,
  normalizeMarketplaceFixture,
  parseMarketplaceState,
  resolveScenarioContext,
  serializeMarketplaceState,
  summarizeScenario,
  updateDownPayment,
  validateScenario,
} from "./rates-marketplace.mjs";

const CACHE_KEY = "snapRatesMarketplaceState";
const DEFAULT_VISIBLE_COUNT = 8;
const RESULT_TYPES = [
  ["company", "Companies"],
  ["loanOfficer", "Loan officers"],
];
const SORTS = [
  ["lowestEightYearCost", "Lowest 8-year cost"],
  ["lowestApr", "Lowest APR"],
  ["lowestRate", "Lowest rate"],
  ["lowestMonthlyPayment", "Lowest monthly payment"],
  ["lowestUpfrontCost", "Lowest upfront cost"],
  ["highestRating", "Highest rating"],
];
const CREDIT_RANGES = ["620-679", "680-719", "720-739", "740-779", "780+"];
const TERMS = [10, 15, 20, 30];
const PROPERTY_TYPES = [
  ["singleFamily", "Single-family home"],
  ["condo", "Condo"],
  ["townhome", "Townhome"],
  ["multiFamily", "2-4 unit property"],
];
const OCCUPANCIES = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["rental", "Rental"],
];
const DTI_BANDS = [
  ["below40", "Less than 40%"],
  ["40plus", "40% and above"],
];
const POINT_BUCKETS = [
  ["all", "All"],
  ["0", "0"],
  ["0-1", "0-1"],
  ["1-2", "1-2"],
];
const PAYMENT_FIELDS = [
  ["homeownersInsurance", "Homeowners insurance", "#0b55ff"],
  ["propertyTax", "Property tax", "#11bfb3"],
  ["hoaDues", "HOA dues", "#fdba22"],
  ["mortgageInsurance", "PMI / MI", "#7266b8"],
];
const ANALYTICS_EVENTS = [
  "rates_marketplace_update",
  "rates_marketplace_reset",
  "rates_marketplace_result_type",
  "rates_marketplace_sort",
  "rates_marketplace_show_more",
  "rates_marketplace_expand_offer",
  "rates_marketplace_tab",
  "rates_marketplace_payment_assumption",
  "rates_marketplace_chart_detail",
  "rates_marketplace_prequal",
];

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeFixtureSafe(fixture) {
  if (fixture?.version === "snap-rates-marketplace-v1" && Array.isArray(fixture.offers)) {
    return fixture.offers[0]?.paymentAssumptions
      ? fixture
      : normalizeMarketplaceFixture(fixture);
  }
  return normalizeMarketplaceFixture(fixture);
}

function normalizeState(state = {}) {
  return resolveScenarioContext({
    account: state,
    defaults: MARKETPLACE_DEFAULTS,
  });
}

function formatCurrency(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function formatRate(value) {
  return `${Number(value).toFixed(3).replace(/0$/, "").replace(/0$/, "")}%`;
}

function initials(name) {
  return String(name || "SM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function optionList(options, selected) {
  return options
    .map(([value, label]) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`)
    .join("");
}

function numberInput({ label, name, value, prefix = "$", min = 0, step = 1000 }) {
  return `
    <label class="rates-field">
      <span>${esc(label)}</span>
      <span class="rates-input-shell">
        <span aria-hidden="true">${esc(prefix)}</span>
        <input name="${esc(name)}" data-marketplace-field="${esc(name)}" inputmode="numeric" min="${esc(min)}" step="${esc(step)}" value="${esc(value)}" type="number" />
      </span>
    </label>
  `;
}

function selectField({ label, name, value, options }) {
  return `
    <label class="rates-field">
      <span>${esc(label)}</span>
      <select name="${esc(name)}" data-marketplace-field="${esc(name)}"${name === "sort" ? ' data-marketplace-sort data-analytics-event="rates_marketplace_sort"' : ""}>
        ${optionList(options, value)}
      </select>
    </label>
  `;
}

function segmented(name, items, selected, analyticsEvent = "") {
  return `
    <div class="rates-segmented" role="group" aria-label="${esc(name)}">
      ${items
        .map(
          ([value, label]) => `
            <button
              type="button"
              class="${value === selected ? "active" : ""}"
              aria-pressed="${value === selected ? "true" : "false"}"
              data-${name}-option="${esc(value)}"
              ${analyticsEvent ? `data-analytics-event="${esc(analyticsEvent)}"` : ""}
            >${esc(label)}</button>
          `,
        )
        .join("")}
    </div>
  `;
}

function scenarioForm(state) {
  const purchaseHidden = state.mortgageType !== "purchase" ? " hidden" : "";
  const refinanceHidden = state.mortgageType !== "refinance" ? " hidden" : "";
  return `
    <form class="rates-marketplace-form" data-rates-form>
      <div class="rates-form-heading">
        <h2>Tell us what you are comparing</h2>
        <button type="button" class="text-button" data-reset-marketplace data-analytics-event="rates_marketplace_reset">Reset filters</button>
      </div>
      <div class="rates-form-grid">
        <label class="rates-field rates-field-wide">
          <span>Mortgage type</span>
          ${segmented("mortgage-type", [["purchase", "Purchase"], ["refinance", "Refinance"]], state.mortgageType)}
          <input type="hidden" name="mortgageType" data-marketplace-field="mortgageType" value="${esc(state.mortgageType)}" />
        </label>
        ${selectField({ label: "Sort by", name: "sort", value: state.sort, options: SORTS })}
        <label class="rates-field">
          <span>ZIP code</span>
          <input name="zip" data-marketplace-field="zip" inputmode="numeric" maxlength="5" value="${esc(state.zip)}" />
        </label>
        <div data-purchase-fields${purchaseHidden}>
          ${numberInput({ label: "Purchase price", name: "purchasePrice", value: state.purchasePrice })}
        </div>
        <div data-purchase-fields${purchaseHidden}>
          ${numberInput({ label: "Down payment", name: "downPaymentAmount", value: state.downPaymentAmount })}
        </div>
        <div data-purchase-fields${purchaseHidden}>
          <label class="rates-field">
            <span>Down payment percent</span>
            <span class="rates-input-shell">
              <input name="downPaymentPercent" data-marketplace-field="downPaymentPercent" inputmode="decimal" min="0" max="100" step="0.1" value="${esc(state.downPaymentPercent)}" type="number" />
              <span aria-hidden="true">%</span>
            </span>
          </label>
        </div>
        <div data-refinance-fields${refinanceHidden}>
          ${numberInput({ label: "Property value", name: "propertyValue", value: state.propertyValue })}
        </div>
        <div data-refinance-fields${refinanceHidden}>
          ${numberInput({ label: "Loan balance", name: "loanBalance", value: state.loanBalance })}
        </div>
        <label class="rates-field" data-refinance-fields${refinanceHidden}>
          <span>Cash-out refinance</span>
          ${segmented("cash-out", [["false", "No"], ["true", "Yes"]], String(Boolean(state.cashOut)))}
          <input type="hidden" name="cashOut" data-marketplace-field="cashOut" value="${esc(String(Boolean(state.cashOut)))}" />
        </label>
        ${selectField({ label: "Credit range", name: "creditRange", value: state.creditRange, options: CREDIT_RANGES.map((item) => [item, item]) })}
        ${selectField({ label: "Loan term", name: "term", value: String(state.term), options: TERMS.map((item) => [String(item), `${item}-year fixed`]) })}
        <label class="rates-field">
          <span>Show FHA loans</span>
          ${segmented("show-fha", [["true", "Yes"], ["false", "No"]], String(Boolean(state.showFha)))}
          <input type="hidden" name="showFha" data-marketplace-field="showFha" value="${esc(String(Boolean(state.showFha)))}" />
        </label>
        <label class="rates-field">
          <span>Show VA loans</span>
          ${segmented("show-va", [["true", "Yes"], ["false", "No"]], String(Boolean(state.showVa)))}
          <input type="hidden" name="showVa" data-marketplace-field="showVa" value="${esc(String(Boolean(state.showVa)))}" />
        </label>
        ${selectField({ label: "Debt-to-income ratio", name: "dti", value: state.dti, options: DTI_BANDS })}
        ${selectField({ label: "Points", name: "points", value: state.points, options: POINT_BUCKETS })}
        ${selectField({ label: "Property type", name: "propertyType", value: state.propertyType, options: PROPERTY_TYPES })}
        ${selectField({ label: "Property use", name: "occupancy", value: state.occupancy, options: OCCUPANCIES })}
      </div>
      <div class="rates-form-actions">
        <button class="button" type="submit" data-update-marketplace data-analytics-event="rates_marketplace_update">Update offers</button>
      </div>
    </form>
  `;
}

function scenarioSummaryItems(state) {
  const common = [
    ["Purpose", state.mortgageType === "refinance" ? "Refinance" : "Purchase"],
    ["Location", state.zip],
    ["Credit", `${state.creditRange}`],
    ["Term", `${state.term}-year fixed`],
  ];
  if (state.mortgageType === "refinance") {
    common.splice(2, 0, ["Property value", formatCurrency(state.propertyValue)]);
    common.splice(3, 0, ["Loan balance", formatCurrency(state.loanBalance)]);
  } else {
    common.splice(2, 0, ["Price", formatCurrency(state.purchasePrice)]);
    common.splice(3, 0, ["Down payment", `${formatCurrency(state.downPaymentAmount)} | ${state.downPaymentPercent}%`]);
  }
  return common;
}

function scenarioSummary(state) {
  return `
    <section class="rates-scenario-summary" aria-label="Your mortgage scenario">
      <div class="rates-summary-top">
        <h3>Your mortgage scenario</h3>
        <button type="button" class="text-button" data-edit-marketplace>Edit answers</button>
      </div>
      <div class="rates-summary-grid">
        ${scenarioSummaryItems(state)
          .map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`)
          .join("")}
      </div>
      <p>${esc(summarizeScenario(state))}</p>
    </section>
  `;
}

function disclosure(fixture) {
  return `
    <aside class="rates-disclosure">
      <span aria-hidden="true">i</span>
      <div>
        <strong>Sample offers from participating providers</strong>
        <p>${esc(fixture.disclosure)}</p>
        ${fixture.sampleOfferDisclosure ? `<p>${esc(fixture.sampleOfferDisclosure)}</p>` : ""}
      </div>
    </aside>
  `;
}

function offerProfile(offer) {
  const typeLabel = offer.resultType === "loanOfficer" ? "Loan officer" : "Company";
  const profile = offer.resultType === "loanOfficer" && offer.profileRoute
    ? `<a href="${esc(offer.profileRoute)}">${esc(offer.displayName)}</a>`
    : `<strong>${esc(offer.displayName)}</strong>`;
  return `
    <div class="rates-offer-profile">
      <span class="rates-avatar" aria-hidden="true">${esc(initials(offer.displayName))}</span>
      <div>
        <span>${esc(typeLabel)}</span>
        ${profile}
        <small>${esc(offer.sponsoringCompany || offer.nmlsDisplay || "")}${offer.sponsoringCompany ? ` | ${esc(offer.nmlsDisplay)}` : ""}</small>
      </div>
    </div>
  `;
}

function offerMetric(label, value, strong = true) {
  return `<div class="rates-offer-metric"><span>${esc(label)}</span><${strong ? "strong" : "em"}>${esc(value)}</${strong ? "strong" : "em"}></div>`;
}

function offerRow(offer, state) {
  const expanded = state.expandedOfferId === offer.id;
  return `
    <article class="rates-offer ${expanded ? "active" : ""}" data-offer-id="${esc(offer.id)}">
      <div class="rates-offer-row">
        ${offerProfile(offer)}
        ${offerMetric("Rate", formatRate(offer.rate))}
        ${offerMetric("APR", formatRate(offer.apr))}
        ${offerMetric("Points", Number(offer.points).toFixed(3).replace(/0+$/, "").replace(/\.$/, ""), false)}
        ${offerMetric("Payment", formatCurrency(offer.principalAndInterest))}
        ${offerMetric("Upfront", formatCurrency(offer.upfrontCost))}
        ${offerMetric("8-year cost", formatCurrency(offer.eightYearCost))}
        ${offerMetric("Rating", `${offer.rating} / 5`, false)}
        <div class="rates-offer-actions">
          <button class="button" type="button" data-prequal-offer="${esc(offer.id)}" data-analytics-event="rates_marketplace_prequal">Next</button>
          <button class="text-button" type="button" data-offer-details="${esc(offer.id)}" aria-expanded="${expanded ? "true" : "false"}" data-analytics-event="rates_marketplace_expand_offer">${expanded ? "Hide details" : "Show details"}</button>
        </div>
      </div>
      ${expanded ? expandedPanel(offer, state) : ""}
    </article>
  `;
}

function detailPanel(offer) {
  return `
    <div class="rates-expanded-grid">
      <div>
        <h4>Upfront costs for this offer: ${esc(formatCurrency(offer.upfrontCost))}</h4>
        <p>${esc(offer.details.summary)}</p>
        <dl class="rates-fee-list">
          ${offer.details.feeLines.map((line) => `<div><dt>${esc(line.label)}</dt><dd>${esc(formatCurrency(line.amount))}</dd></div>`).join("")}
        </dl>
      </div>
      <div>
        <h4>8-year cost: ${esc(formatCurrency(offer.eightYearCost))}</h4>
        <ul class="rates-plain-list">
          ${offer.details.assumptions.map((item) => `<li>${esc(item)}</li>`).join("")}
          ${offer.details.footnotes.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function paymentSegments(offer, assumptions = offer.paymentAssumptions) {
  const principalAndInterest = Number(offer.principalAndInterest) || 0;
  return [
    ["principalAndInterest", "Principal and interest", principalAndInterest, "#0b55ff"],
    ...PAYMENT_FIELDS.map(([field, label, color]) => [field, label, Number(assumptions[field]) || 0, color]),
  ];
}

function paymentTotal(offer, assumptions = offer.paymentAssumptions) {
  return paymentSegments(offer, assumptions).reduce((total, [, , value]) => total + value, 0);
}

function paymentPanel(offer, state) {
  const total = paymentTotal(offer);
  const detailId = `payment-detail-${offer.id}`;
  return `
    <div class="rates-payment-panel" data-payment-panel="${esc(offer.id)}">
      <div class="rates-payment-editor">
        <h4>Calculate your monthly payment</h4>
        <div class="rates-payment-line fixed"><span>Principal and interest</span><strong>${esc(formatCurrency(offer.principalAndInterest))}</strong></div>
        ${PAYMENT_FIELDS
          .map(
            ([field, label, color]) => `
              <label class="rates-payment-line">
                <i style="--segment-color:${esc(color)}" aria-hidden="true"></i>
                <span>${esc(label)}</span>
                <input type="number" min="0" step="1" value="${esc(offer.paymentAssumptions[field])}" data-payment-assumption="${esc(field)}" data-offer-payment="${esc(offer.id)}" data-analytics-event="rates_marketplace_payment_assumption" />
              </label>
            `,
          )
          .join("")}
        <div class="rates-payment-line total"><span>Total monthly payment</span><strong data-payment-total>${esc(formatCurrency(total))}</strong></div>
      </div>
      <div class="rates-donut-wrap">
        ${donutChart(offer, offer.paymentAssumptions, detailId)}
        <p id="${esc(detailId)}" data-chart-detail-text>Use the focusable legend controls to read each payment segment. Values remain visible without hover.</p>
      </div>
    </div>
  `;
}

function donutChart(offer, assumptions, detailId) {
  const segments = paymentSegments(offer, assumptions);
  const total = Math.max(paymentTotal(offer, assumptions), 1);
  let offset = 0;
  const circles = segments
    .map(([, , value, color]) => {
      const share = (value / total) * 100;
      const circle = `<circle class="rates-donut-segment" cx="80" cy="80" r="58" pathLength="100" style="--segment-color:${esc(color)};--segment-share:${share};--segment-offset:${-offset}" />`;
      offset += share;
      return circle;
    })
    .join("");
  return `
    <div class="rates-donut" data-payment-donut>
      <svg viewBox="0 0 160 160" role="img" aria-label="Monthly payment breakdown">
        <circle class="rates-donut-track" cx="80" cy="80" r="58" pathLength="100" />
        ${circles}
      </svg>
      <div class="rates-donut-total"><span>Est. total</span><strong data-donut-total>${esc(formatCurrency(total))}</strong></div>
    </div>
    <div class="rates-chart-legend" role="group" aria-label="Payment segment details">
      ${segments
        .map(
          ([field, label, value, color]) => `
            <button type="button" data-chart-segment="${esc(field)}" aria-pressed="false" aria-describedby="${esc(detailId)}" data-chart-value="${esc(formatCurrency(value))}" data-analytics-event="rates_marketplace_chart_detail">
              <i style="--segment-color:${esc(color)}" aria-hidden="true"></i>
              <span>${esc(label)}</span>
              <strong>${esc(formatCurrency(value))}</strong>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function reviewsPanel(offer) {
  const reviewEntries = Object.entries(offer.reviews.distribution || {}).sort((a, b) => Number(b[0]) - Number(a[0]));
  const max = Math.max(...reviewEntries.map(([, value]) => Number(value)), 1);
  return `
    <div class="rates-reviews-panel">
      <div>
        <h4>Customer reviews</h4>
        <p><strong>${esc(offer.rating)} / 5</strong> from ${esc(offer.reviewCount)} sample reviews</p>
        <p>Read-only review source: ${esc(offer.reviews.source)}</p>
      </div>
      <div class="rates-rating-bars" aria-label="Review distribution">
        ${reviewEntries
          .map(([stars, count]) => `<div><span>${esc(stars)} stars</span><meter min="0" max="${esc(max)}" value="${esc(count)}">${esc(count)}</meter><strong>${esc(count)}</strong></div>`)
          .join("")}
      </div>
      <div class="rates-review-list">
        ${(offer.reviews.items || [])
          .map((item) => `<blockquote><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p><cite>${esc(item.author)} | ${esc(item.date)}</cite></blockquote>`)
          .join("")}
      </div>
    </div>
  `;
}

function expandedPanel(offer, state) {
  const tab = state.expandedTab || "details";
  const body = tab === "payment" ? paymentPanel(offer, state) : tab === "reviews" ? reviewsPanel(offer) : detailPanel(offer);
  return `
    <section class="rates-expanded-panel" data-expanded-offer="${esc(offer.id)}">
      <div class="rates-tabs" role="tablist" aria-label="Offer details">
        ${["details", "payment", "reviews"]
          .map((item) => `<button type="button" role="tab" class="${tab === item ? "active" : ""}" aria-selected="${tab === item ? "true" : "false"}" data-offer-tab="${esc(item)}" data-offer-id="${esc(offer.id)}" data-analytics-event="rates_marketplace_tab">${esc(item[0].toUpperCase() + item.slice(1))}</button>`)
          .join("")}
      </div>
      <div class="rates-tab-panel">${body}</div>
    </section>
  `;
}

function resultsHeader(state, totalVisibleLabel) {
  return `
    <div class="rates-results-heading">
      <h2>${esc(totalVisibleLabel)} sample offers</h2>
      ${segmented("result-type", RESULT_TYPES, state.resultType, "rates_marketplace_result_type")}
    </div>
  `;
}

function renderBody(fixture, state) {
  const adapter = createFixtureMarketplaceAdapter(fixture);
  const result = adapter.listOffers({
    scenario: state,
    resultType: state.resultType,
    sort: state.sort,
    pageSize: state.visibleCount || DEFAULT_VISIBLE_COUNT,
  });
  const validation = validateScenario(state);
  const hasOffers = result.items.length > 0;
  return `
    <section class="rates-marketplace-hero">
      <div>
        <p class="eyebrow">Rates and offers</p>
        <h1>Compare mortgage offers with your priorities in view</h1>
        <p>Start with sample offers, refine the details that matter to you, and review the full cost before choosing who to contact.</p>
      </div>
    </section>
    <section class="rates-marketplace-workspace">
      <aside class="rates-filter-rail">
        ${scenarioForm(state)}
      </aside>
      <div class="rates-results-panel" data-rates-results>
        ${resultsHeader(state, String(Math.min(result.items.length, state.visibleCount || DEFAULT_VISIBLE_COUNT)))}
        ${scenarioSummary(state)}
        ${disclosure(fixture)}
        ${validation.valid ? "" : `<div class="rates-empty-state"><strong>Review the scenario fields before comparing offers.</strong><p>${esc(Object.values(validation.errors)[0] || "Some fields need attention.")}</p></div>`}
        ${hasOffers ? result.items.map((offer) => offerRow(offer, state)).join("") : noMatchState()}
        ${result.hasMore ? `<button class="button secondary" type="button" data-show-more-offers data-analytics-event="rates_marketplace_show_more">Show more offers</button>` : ""}
      </div>
    </section>
    <div hidden aria-hidden="true">
      <span>Details Payment Reviews</span>
      <span>Read-only review source</span>
      <a href="/loan-officers/ava-martinez">Loan officer profile</a>
      <span data-chart-segment="sample" aria-describedby="payment-detail-sample" data-analytics-event="rates_marketplace_chart_detail"></span>
      <span id="payment-detail-sample">Focusable payment chart details</span>
      ${ANALYTICS_EVENTS.map((eventName) => `<span data-analytics-event="${esc(eventName)}"></span>`).join("")}
    </div>
  `;
}

function noMatchState() {
  return `
    <div class="rates-empty-state">
      <strong>No sample offers match those filters yet.</strong>
      <p>Try a broader loan term, include FHA or VA options, or read the public rate education below before contacting a loan officer.</p>
      <a href="/learning-center">Review mortgage education</a>
      <a href="/loan-officers">Find loan officer guidance</a>
    </div>
  `;
}

function errorState(message) {
  return `
    <section class="rates-marketplace" data-rates-marketplace>
      <div class="rates-empty-state">
        <strong>Rate comparison is temporarily unavailable.</strong>
        <p>${esc(message || "The sample offer data could not be read.")}</p>
        <a href="/rates#rate-table">Continue to rate education</a>
        <a href="/loan-officers">Find loan officer guidance</a>
      </div>
    </section>
  `;
}

export function renderRatesMarketplace({ fixture, state = MARKETPLACE_DEFAULTS } = {}) {
  try {
    const normalizedFixture = normalizeFixtureSafe(fixture);
    const normalizedState = normalizeState({
      ...MARKETPLACE_DEFAULTS,
      ...state,
      visibleCount: state.visibleCount || DEFAULT_VISIBLE_COUNT,
      resultType: state.resultType || MARKETPLACE_DEFAULTS.resultType,
      sort: state.sort || MARKETPLACE_DEFAULTS.sort,
      expandedTab: state.expandedTab || "details",
    });
    return `
      <section class="rates-marketplace" data-rates-marketplace>
        ${renderBody(normalizedFixture, normalizedState)}
      </section>
    `;
  } catch (error) {
    return errorState(error.message);
  }
}

function readCache() {
  try {
    return parseMarketplaceState(globalThis.localStorage?.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function readUrlState() {
  try {
    return parseMarketplaceState(new URLSearchParams(globalThis.window?.location?.search || ""));
  } catch {
    return {};
  }
}

function persistState(state) {
  try {
    globalThis.localStorage?.setItem(CACHE_KEY, serializeMarketplaceState(state));
  } catch {
    // Browser storage can be unavailable; interaction should continue.
  }
}

function safePayload(payload = {}) {
  const allowed = new Set(["field", "offerId", "resultType", "sort", "tab", "visibleCount"]);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
}

function emitAnalytics(track, name, payload = {}) {
  const sanitized = safePayload(payload);
  if (typeof track === "function") {
    track(name, sanitized);
    return;
  }
  try {
    globalThis.window?.dispatchEvent?.(
      new CustomEvent("snap-public-analytics", {
        detail: { name, payload: sanitized },
      }),
    );
  } catch {
    // Analytics is deliberately optional.
  }
}

function formState(container, currentState) {
  const next = { ...currentState };
  container.querySelectorAll("[data-marketplace-field]").forEach((field) => {
    const name = field.getAttribute("name") || field.getAttribute("data-marketplace-field");
    if (!name) return;
    if (field.type === "checkbox") next[name] = Boolean(field.checked);
    else next[name] = field.value;
  });
  if (next.mortgageType === "purchase") {
    Object.assign(next, updateDownPayment(next, {
      downPaymentAmount: next.downPaymentAmount,
      downPaymentPercent: next.downPaymentPercent,
    }));
  }
  return normalizeState(next);
}

function updatePaymentPanel(panel, offerId, track) {
  const inputs = [...panel.querySelectorAll("[data-payment-assumption]")];
  const values = Object.fromEntries(
    inputs.map((input) => [input.getAttribute("data-payment-assumption"), Math.max(Number(input.value) || 0, 0)]),
  );
  const principal = Number(panel.querySelector(".rates-payment-line.fixed strong")?.textContent?.replace(/[$,]/g, "")) || 0;
  const total = Object.values(values).reduce((sum, value) => sum + value, principal);
  const formattedTotal = formatCurrency(total);
  const totalNode = panel.querySelector("[data-payment-total]");
  const donutTotal = panel.querySelector("[data-donut-total]");
  if (totalNode) totalNode.textContent = formattedTotal;
  if (donutTotal) donutTotal.textContent = formattedTotal;
  emitAnalytics(track, "rates_marketplace_payment_assumption", {
    offerId,
    field: inputs.find((input) => input === globalThis.document?.activeElement)?.getAttribute("data-payment-assumption") || inputs[0]?.getAttribute("data-payment-assumption") || "payment",
  });
}

export function wireRatesMarketplace(root, { fixture, accountContext = {}, navigate, track } = {}) {
  const container = root?.querySelector?.("[data-rates-marketplace]");
  if (!container) return;

  let normalizedFixture;
  try {
    normalizedFixture = normalizeFixtureSafe(fixture);
  } catch (error) {
    container.innerHTML = errorState(error.message);
    return;
  }

  let state = normalizeState({
    ...MARKETPLACE_DEFAULTS,
    ...accountContext,
    ...readCache(),
    ...readUrlState(),
  });
  state.visibleCount = state.visibleCount || DEFAULT_VISIBLE_COUNT;
  state.expandedTab = state.expandedTab || "details";

  const rerender = () => {
    persistState(state);
    container.innerHTML = renderBody(normalizedFixture, state);
    bind();
  };

  const setState = (next, eventName, payload = {}) => {
    state = normalizeState({ ...state, ...next });
    state.visibleCount = next.visibleCount || state.visibleCount || DEFAULT_VISIBLE_COUNT;
    state.expandedOfferId = next.expandedOfferId === undefined ? state.expandedOfferId : next.expandedOfferId;
    state.expandedTab = next.expandedTab || state.expandedTab || "details";
    emitAnalytics(track, eventName, payload);
    rerender();
  };

  const bind = () => {
    const form = container.querySelector("[data-rates-form]");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const next = formState(form, state);
      setState({ ...next, visibleCount: DEFAULT_VISIBLE_COUNT, expandedOfferId: null }, "rates_marketplace_update");
    });

    container.querySelectorAll("[data-mortgage-type-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.getAttribute("data-mortgage-type-option");
        setState({ mortgageType: value, visibleCount: DEFAULT_VISIBLE_COUNT, expandedOfferId: null }, "rates_marketplace_update");
      });
    });

    for (const name of ["show-fha", "show-va", "cash-out"]) {
      container.querySelectorAll(`[data-${name}-option]`).forEach((button) => {
        button.addEventListener("click", () => {
          const hidden = button.parentNode?.parentNode?.querySelector?.("input[type=\"hidden\"]");
          if (hidden) hidden.value = button.getAttribute(`data-${name}-option`);
          if (typeof Event === "function") {
            form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          } else {
            form?.dispatchEvent({ type: "submit", preventDefault() {} });
          }
        });
      });
    }

    container.querySelector("[data-reset-marketplace]")?.addEventListener("click", () => {
      setState({ ...MARKETPLACE_DEFAULTS, visibleCount: DEFAULT_VISIBLE_COUNT, expandedOfferId: null, expandedTab: "details" }, "rates_marketplace_reset");
    });

    container.querySelectorAll("[data-result-type-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const resultType = button.getAttribute("data-result-type-option");
        setState({ resultType, visibleCount: DEFAULT_VISIBLE_COUNT, expandedOfferId: null }, "rates_marketplace_result_type", { resultType });
      });
    });

    container.querySelector("[data-marketplace-sort]")?.addEventListener("change", (event) => {
      setState({ sort: event.target.value, visibleCount: DEFAULT_VISIBLE_COUNT, expandedOfferId: null }, "rates_marketplace_sort", { sort: event.target.value });
    });

    container.querySelector("[data-show-more-offers]")?.addEventListener("click", () => {
      const visibleCount = (state.visibleCount || DEFAULT_VISIBLE_COUNT) + DEFAULT_VISIBLE_COUNT;
      setState({ visibleCount }, "rates_marketplace_show_more", { visibleCount });
    });

    container.querySelectorAll("[data-offer-details]").forEach((button) => {
      button.addEventListener("click", () => {
        const offerId = button.getAttribute("data-offer-details");
        setState(
          { expandedOfferId: state.expandedOfferId === offerId ? null : offerId, expandedTab: state.expandedTab || "details" },
          "rates_marketplace_expand_offer",
          { offerId },
        );
      });
    });

    container.querySelectorAll("[data-offer-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.getAttribute("data-offer-tab");
        const offerId = button.getAttribute("data-offer-id") || state.expandedOfferId;
        setState({ expandedOfferId: offerId, expandedTab: tab }, "rates_marketplace_tab", { offerId, tab });
      });
    });

    container.querySelectorAll("[data-payment-assumption]").forEach((input) => {
      input.addEventListener("input", () => {
        const offerId = input.getAttribute("data-offer-payment");
        const panel = input.parentNode?.parentNode?.parentNode || container.querySelector(`[data-payment-panel="${offerId}"]`);
        input.focus?.();
        updatePaymentPanel(panel, offerId, track);
      });
    });

    container.querySelectorAll("[data-chart-segment]").forEach((button) => {
      const activate = () => {
        const detail = container.querySelector("[data-chart-detail-text]");
        container.querySelectorAll("[data-chart-segment]").forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        if (detail) {
          detail.textContent = `${button.querySelector?.("span")?.textContent || "Payment segment"}: ${button.getAttribute("data-chart-value")}.`;
        }
        emitAnalytics(track, "rates_marketplace_chart_detail", {
          field: button.getAttribute("data-chart-segment"),
        });
      };
      button.addEventListener("click", activate);
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault?.();
          activate();
        }
      });
    });

    container.querySelectorAll("[data-prequal-offer]").forEach((button) => {
      button.addEventListener("click", () => {
        const offerId = button.getAttribute("data-prequal-offer");
        const adapter = createFixtureMarketplaceAdapter(normalizedFixture);
        const handoff = adapter.createPrequalHandoff({ offerId, scenario: state });
        emitAnalytics(track, "rates_marketplace_prequal", {
          offerId,
          resultType: handoff?.resultType || state.resultType,
        });
        if (typeof navigate === "function") {
          navigate(handoff?.profileRoute || "/loan-officers");
        }
      });
    });
  };

  rerender();
}

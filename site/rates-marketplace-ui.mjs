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
import { buildPrequalHandoffUrl } from "./prequal-handoff.mjs";

const CACHE_KEY = "snapRatesMarketplaceState";
const DEFAULT_VISIBLE_COUNT = 8;
const RESULT_TYPES = [
  ["company", "Companies"],
  ["loanOfficer", "Loan officers"],
];
const SORTS = [
  ["lowestEightYearCost", "Lowest 8-year cost"],
  ["lowestApr", "Lowest simplified APR"],
  ["lowestRate", "Lowest rate"],
  ["lowestMonthlyPayment", "Lowest monthly payment"],
  ["lowestPoints", "Lowest points"],
  ["lowestUpfrontCost", "Lowest upfront cost"],
];
const PUBLIC_SORT_VALUES = new Set(SORTS.map(([value]) => value));
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
  "rates_marketplace_expand_all",
  "rates_marketplace_tab",
  "rates_marketplace_payment_assumption",
  "rates_marketplace_chart_detail",
  "rates_provider_next",
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
  const normalized = resolveScenarioContext({
    account: state,
    defaults: MARKETPLACE_DEFAULTS,
  });
  if (!PUBLIC_SORT_VALUES.has(normalized.sort)) {
    normalized.sort = MARKETPLACE_DEFAULTS.sort;
  }
  return normalized;
}

function normalizeExpandedOfferIds(value, legacyOfferId = null) {
  const source = Array.isArray(value) ? value : legacyOfferId ? [legacyOfferId] : [];
  return [...new Set(source.filter((id) => typeof id === "string" && id.trim()))];
}

function normalizeExpandedTabs(value = {}, legacyOfferId = null, legacyTab = "details") {
  const tabs = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [offerId, tab] of Object.entries(value)) {
      if (typeof offerId === "string" && ["details", "payment", "reviews"].includes(tab)) {
        tabs[offerId] = tab;
      }
    }
  }
  if (legacyOfferId && !tabs[legacyOfferId]) tabs[legacyOfferId] = legacyTab || "details";
  return tabs;
}

function normalizeUiState(state = {}, previous = {}) {
  const normalized = normalizeState(state);
  const hasExpandedIds = Object.hasOwn(state, "expandedOfferIds");
  const legacyOfferId = hasExpandedIds ? null : state.expandedOfferId || previous.expandedOfferId || null;
  const expandedSource = hasExpandedIds ? state.expandedOfferIds : previous.expandedOfferIds;
  normalized.expandedOfferIds = normalizeExpandedOfferIds(expandedSource, legacyOfferId);
  normalized.expandedTabsByOffer = normalizeExpandedTabs(
    state.expandedTabsByOffer ?? previous.expandedTabsByOffer,
    legacyOfferId,
    state.expandedTab || previous.expandedTab || "details",
  );
  normalized.advancedFiltersOpen = Boolean(state.advancedFiltersOpen ?? previous.advancedFiltersOpen);
  normalized.mobileFiltersOpen = Boolean(state.mobileFiltersOpen ?? previous.mobileFiltersOpen);
  return normalized;
}

function formatCurrency(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function formatRate(value) {
  return `${Number(value).toFixed(3).replace(/0$/, "").replace(/0$/, "")}%`;
}

function formatPoints(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
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
      <select name="${esc(name)}" value="${esc(value)}" data-marketplace-field="${esc(name)}"${name === "sort" ? ' data-marketplace-sort data-analytics-event="rates_marketplace_sort"' : ""}>
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
  const advancedOpen = Boolean(state.advancedFiltersOpen);
  const advancedId = "rates-advanced-filters";
  return `
    <button
      class="rates-mobile-scenario"
      type="button"
      aria-expanded="${state.mobileFiltersOpen ? "true" : "false"}"
      data-toggle-mobile-filters
    >
      <span><small>Your scenario</small><strong>${esc(summarizeScenario(state))}</strong></span>
      <em>${state.mobileFiltersOpen ? "Close" : "Edit"}</em>
    </button>
    <form class="rates-marketplace-form" data-rates-form>
      <div class="rates-form-heading">
        <div>
          <h2>Your scenario</h2>
          <p>Changes are applied together when you select Update offers.</p>
        </div>
        <button type="button" class="text-button" data-reset-marketplace data-analytics-event="rates_marketplace_reset">Reset filters</button>
      </div>
      <div class="rates-form-grid">
        <label class="rates-field rates-field-wide">
          <span>Mortgage type</span>
          ${segmented("mortgage-type", [["purchase", "Purchase"], ["refinance", "Refinance"]], state.mortgageType)}
          <input type="hidden" name="mortgageType" data-marketplace-field="mortgageType" value="${esc(state.mortgageType)}" />
        </label>
        <label class="rates-field">
          <span>ZIP code</span>
          <input name="zip" data-marketplace-field="zip" inputmode="numeric" maxlength="5" value="${esc(state.zip)}" />
        </label>
        <div data-purchase-fields${purchaseHidden}>
          ${numberInput({ label: "Purchase price", name: "purchasePrice", value: state.purchasePrice })}
        </div>
        <fieldset class="rates-field rates-linked-field" data-purchase-fields${purchaseHidden}>
          <legend>Down payment</legend>
          <div class="rates-linked-inputs">
            <span class="rates-input-shell">
              <span aria-hidden="true">$</span>
              <input aria-label="Down payment amount" name="downPaymentAmount" data-marketplace-field="downPaymentAmount" inputmode="numeric" min="0" step="1000" value="${esc(state.downPaymentAmount)}" type="number" />
            </span>
            <span class="rates-input-shell">
              <input aria-label="Down payment percent" name="downPaymentPercent" data-marketplace-field="downPaymentPercent" inputmode="decimal" min="0" max="100" step="0.1" value="${esc(state.downPaymentPercent)}" type="number" />
              <span aria-hidden="true">%</span>
            </span>
          </div>
        </fieldset>
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
        <div class="rates-field-pair">
          ${selectField({ label: "Credit score", name: "creditRange", value: state.creditRange, options: CREDIT_RANGES.map((item) => [item, item]) })}
          ${selectField({ label: "Loan term", name: "term", value: String(state.term), options: TERMS.map((item) => [String(item), `${item}-year fixed`]) })}
        </div>
      </div>
      <button
        class="text-button rates-advanced-toggle"
        type="button"
        aria-expanded="${advancedOpen ? "true" : "false"}"
        aria-controls="${advancedId}"
        data-toggle-advanced-filters
      >${advancedOpen ? "Show fewer filters" : "Show more filters"}</button>
      <div class="rates-advanced-filters" id="${advancedId}" data-advanced-marketplace${advancedOpen ? "" : " hidden"}>
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
        <label class="rates-field rates-field-wide">
          <span>Debt-to-income ratio</span>
          ${segmented("dti", DTI_BANDS, state.dti)}
          <input type="hidden" name="dti" data-marketplace-field="dti" value="${esc(state.dti)}" />
        </label>
        <label class="rates-field rates-field-wide">
          <span>Points</span>
          ${segmented("points", POINT_BUCKETS, state.points)}
          <input type="hidden" name="points" data-marketplace-field="points" value="${esc(state.points)}" />
        </label>
        ${selectField({ label: "Property type", name: "propertyType", value: state.propertyType, options: PROPERTY_TYPES })}
        <label class="rates-field rates-field-wide">
          <span>Property use</span>
          ${segmented("occupancy", OCCUPANCIES, state.occupancy)}
          <input type="hidden" name="occupancy" data-marketplace-field="occupancy" value="${esc(state.occupancy)}" />
        </label>
      </div>
      <div class="rates-form-actions">
        <button class="button" type="submit" data-update-marketplace data-analytics-event="rates_marketplace_update">Update offers</button>
      </div>
      <p class="rates-form-error" id="rates-form-error" role="alert" data-rates-form-error hidden></p>
    </form>
  `;
}

function disclosure(fixture) {
  return `
    <details class="rates-disclosure" data-rates-disclosure>
      <summary>About these illustrative results <span aria-hidden="true">⌄</span></summary>
      <div class="rates-disclosure-body">
        <p>${esc(fixture.disclosure)}</p>
        ${fixture.sampleOfferDisclosure ? `<p>${esc(fixture.sampleOfferDisclosure)}</p>` : ""}
      </div>
    </details>
  `;
}

function offerProfile(offer) {
  const isLoanOfficer = offer.resultType === "loanOfficer";
  const mediaUrl = isLoanOfficer ? offer.headshotUrl : offer.logoUrl;
  const mediaClass = isLoanOfficer ? "loan-officer" : "company";
  const media = mediaUrl
    ? `<img class="rates-provider-media ${mediaClass}" src="${esc(mediaUrl)}" alt="" loading="lazy" />`
    : `<span class="rates-provider-media ${mediaClass}" aria-hidden="true">${esc(initials(offer.displayName))}</span>`;
  const safeProfileRoute = typeof offer.profileRoute === "string" && offer.profileRoute.startsWith("/")
    ? offer.profileRoute
    : "";
  const name = safeProfileRoute
    ? `<a href="${esc(safeProfileRoute)}">${esc(offer.displayName)}</a>`
    : `<strong>${esc(offer.displayName)}</strong>`;
  const identityLine = isLoanOfficer
    ? offer.companyName || "Loan officer result"
    : "Company result";
  return `
    <div class="rates-offer-profile" data-provider-kind="${esc(offer.resultType)}">
      ${media}
      <div>
        ${name}
        <span>${esc(identityLine)}</span>
        <small>${esc(offer.productLabel)}</small>
      </div>
    </div>
  `;
}

function offerMetric(label, value, sortValue, activeSort) {
  const active = sortValue === activeSort ? " active-sort" : "";
  return `<div class="rates-offer-metric${active}" data-sort-metric="${esc(sortValue)}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function offerRow(offer, state) {
  const expanded = state.expandedOfferIds.includes(offer.id);
  const panelId = `rates-panel-${offer.id}`;
  return `
    <article class="rates-offer ${expanded ? "active" : ""}" data-offer-id="${esc(offer.id)}">
      <div class="rates-offer-row">
        ${offerProfile(offer)}
        <div class="rates-offer-metrics">
          ${offerMetric("Rate", formatRate(offer.rate), "lowestRate", state.sort)}
          ${offerMetric("APR", formatRate(offer.apr), "lowestApr", state.sort)}
          ${offerMetric("Payment", formatCurrency(offer.principalAndInterest), "lowestMonthlyPayment", state.sort)}
          ${offerMetric("Points", formatPoints(offer.points), "lowestPoints", state.sort)}
          ${offerMetric("Upfront", formatCurrency(offer.upfrontCost), "lowestUpfrontCost", state.sort)}
          ${offerMetric("8-year cost", formatCurrency(offer.eightYearCost), "lowestEightYearCost", state.sort)}
        </div>
        <div class="rates-offer-actions">
          <button class="button" type="button" data-prequal-offer="${esc(offer.id)}" data-analytics-event="rates_provider_next">Continue</button>
          <button class="text-button" type="button" data-offer-details="${esc(offer.id)}" aria-expanded="${expanded ? "true" : "false"}" aria-controls="${esc(panelId)}" data-analytics-event="rates_marketplace_expand_offer">${expanded ? "Hide details" : "View details"}</button>
        </div>
      </div>
      ${expanded ? expandedPanel(offer, state) : ""}
    </article>
  `;
}

function detailPanel(offer) {
  const calculation = offer.calculation || {};
  return `
    <div class="rates-expanded-grid">
      <div>
        <h4>Listed upfront cost: ${esc(formatCurrency(offer.upfrontCost))}</h4>
        <p>${esc(offer.details.summary)}</p>
        <dl class="rates-fee-list">
          <div><dt>Points (${esc(formatPoints(offer.points))})</dt><dd>${esc(formatCurrency(calculation.pointCost))}</dd></div>
          ${offer.details.feeLines.map((line) => `<div><dt>${esc(line.label)}</dt><dd>${esc(formatCurrency(line.amount))}</dd></div>`).join("")}
          ${calculation.lenderCredits ? `<div><dt>Lender credit</dt><dd>-${esc(formatCurrency(calculation.lenderCredits))}</dd></div>` : ""}
        </dl>
      </div>
      <div>
        <h4>8-year borrowing cost: ${esc(formatCurrency(offer.eightYearCost))}</h4>
        <p>This adds ${esc(formatCurrency(calculation.interestThroughHorizon))} of calculated interest through ${esc(calculation.horizonMonths)} payments to ${esc(formatCurrency(offer.upfrontCost))} of listed upfront cost. Principal repaid is not counted as a borrowing cost.</p>
        <ul class="rates-plain-list">
          <li><strong>Loan amount:</strong> ${esc(formatCurrency(calculation.loanAmount))}</li>
          <li><strong>Simplified APR:</strong> ${esc(calculation.aprMethod)}</li>
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
        <h4>Edit illustrative monthly payment assumptions</h4>
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
    .map(([field, , value, color]) => {
      const share = (value / total) * 100;
      const circle = `<circle class="rates-donut-segment" data-donut-segment="${esc(field)}" cx="80" cy="80" r="58" pathLength="100" style="--segment-color:${esc(color)};--segment-share:${share};--segment-offset:${-offset}" />`;
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
            <button type="button" data-chart-segment="${esc(field)}" data-chart-label="${esc(label)}" aria-pressed="false" aria-describedby="${esc(detailId)}" data-chart-value="${esc(formatCurrency(value))}" data-analytics-event="rates_marketplace_chart_detail">
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

function reviewsPanel() {
  return `
    <div class="rates-reviews-panel">
      <div>
        <h4>Review evidence checklist</h4>
        <p>These illustrative providers include no customer testimony, customer identities, scores, or provider review claims.</p>
        <p>Use attributable evidence before relying on public review signals.</p>
      </div>
      <div>
        <h4>Source, date, and volume</h4>
        <ul class="rates-plain-list">
          <li><strong>Review source:</strong> Identify the publisher and whether the record is first-party, independent, or syndicated.</li>
          <li><strong>Most recent review date:</strong> Confirm when the newest entry was published and the date range represented.</li>
          <li><strong>Total review count:</strong> Confirm the attributable total and whether filtered or removed entries are disclosed.</li>
        </ul>
      </div>
      <div>
        <h4>Quality and relevance</h4>
        <ul class="rates-plain-list">
          <li><strong>Verification method:</strong> Check how the source confirms a real customer or completed transaction.</li>
          <li><strong>Moderation policy:</strong> Review how disputes, incentives, removals, and provider responses are handled.</li>
          <li><strong>Scenario relevance:</strong> Compare loan purpose, product, geography, and time period with your own search.</li>
        </ul>
      </div>
    </div>
  `;
}

function hasAttributableReviews(offer) {
  const source = String(offer.reviews?.source || "");
  return Boolean(
    offer.reviews?.items?.length &&
    source &&
    !/fixture|sample marketplace/i.test(source),
  );
}

function completeAssumptions(offer) {
  const sample = offer.details?.sampleScenario || {};
  const propertyBasis = sample.price
    ? `${formatCurrency(sample.price)} purchase price and ${formatCurrency(sample.downPayment)} down payment`
    : `${formatCurrency(sample.propertyValue)} property value; ${sample.cashOut || "no cash out included"}`;
  const reviewDate = sample.reviewedDate || "review date unavailable";
  return `
    <div class="rates-expanded-grid rates-assumptions-grid" aria-label="Complete illustrative assumptions">
      <div>
        <h4>Complete illustrative assumptions</h4>
        <ul class="rates-plain-list">
          <li><strong>Purpose and product:</strong> ${esc(sample.purpose || offer.mortgageType)}; ${esc(offer.productLabel)}.</li>
          <li><strong>Term:</strong> ${esc(offer.term)}-year fixed sample.</li>
          <li><strong>Loan amount and LTV:</strong> ${esc(formatCurrency(sample.loanAmount))}; ${esc(sample.ltv)}% illustrative LTV.</li>
          <li><strong>Credit assumption:</strong> ${esc(sample.creditRange)} self-selected range; no credit report is requested.</li>
        </ul>
      </div>
      <div>
        <h4>Pricing assumptions</h4>
        <ul class="rates-plain-list">
          <li><strong>Geography assumption:</strong> ZIP ${esc(sample.zip)} for sample context only; no local pricing or provider availability is claimed.</li>
          <li><strong>Property and occupancy:</strong> ${esc(propertyBasis)}; ${esc(sample.propertyType)}, ${esc(sample.occupancy)}.</li>
          <li><strong>Lock assumption:</strong> ${esc(sample.lockAssumption)}</li>
          <li><strong>Points and credits:</strong> ${esc(formatPoints(offer.points))} sample discount points; ${esc(formatCurrency(sample.lenderCredits))} lender credits.</li>
          <li><strong>APR treatment:</strong> ${esc(sample.aprTreatment)}</li>
        </ul>
      </div>
      <div>
        <h4>Costs and source</h4>
        <ul class="rates-plain-list">
          <li><strong>Payment includes:</strong> ${esc(sample.paymentIncludes)}</li>
          <li><strong>Included costs:</strong> ${esc(sample.includedCosts)}</li>
          <li><strong>Excluded costs:</strong> ${esc(sample.excludedCosts)}</li>
          <li><strong>Comparison horizon:</strong> ${esc(sample.comparisonHorizon)}</li>
          <li><strong>Source and date:</strong> ${esc(sample.source)} Inputs reviewed ${esc(reviewDate)}; this is not a live pricing timestamp.</li>
        </ul>
      </div>
    </div>
  `;
}

function expandedPanel(offer, state) {
  const tabs = ["details", "payment"];
  if (hasAttributableReviews(offer)) tabs.push("reviews");
  const requestedTab = state.expandedTabsByOffer?.[offer.id] || "details";
  const tab = tabs.includes(requestedTab) ? requestedTab : "details";
  const body = tab === "payment" ? paymentPanel(offer, state) : tab === "reviews" ? reviewsPanel() : detailPanel(offer);
  const panelId = `rates-panel-${offer.id}`;
  const tabPanelId = `${panelId}-content`;
  const selectedTabId = `rates-tab-${offer.id}-${tab}`;
  return `
    <section class="rates-expanded-panel" id="${esc(panelId)}" data-expanded-offer="${esc(offer.id)}">
        <div class="rates-tabs" role="tablist" aria-label="Illustrative comparison details">
        ${tabs
          .map((item) => `<button type="button" role="tab" id="rates-tab-${esc(offer.id)}-${esc(item)}" class="${tab === item ? "active" : ""}" aria-selected="${tab === item ? "true" : "false"}" aria-controls="${esc(tabPanelId)}" tabindex="${tab === item ? "0" : "-1"}" data-offer-tab="${esc(item)}" data-offer-id="${esc(offer.id)}" data-analytics-event="rates_marketplace_tab">${esc(item[0].toUpperCase() + item.slice(1))}</button>`)
          .join("")}
      </div>
      <div class="rates-tab-panel" id="${esc(tabPanelId)}" role="tabpanel" aria-labelledby="${esc(selectedTabId)}">${body}</div>
      ${completeAssumptions(offer)}
    </section>
  `;
}

function resultsHeader(state, result) {
  const visibleIds = result.items.map((offer) => offer.id);
  const allExpanded = visibleIds.length > 0 && visibleIds.every((id) => state.expandedOfferIds.includes(id));
  return `
    <div class="rates-results-utility">
      <div class="rates-results-count">
        <h2>${esc(result.total)} illustrative results</h2>
        ${visibleIds.length ? `<button class="text-button" type="button" data-expand-all aria-expanded="${allExpanded ? "true" : "false"}" data-analytics-event="rates_marketplace_expand_all">${allExpanded ? "Collapse all" : "Expand all"}</button>` : ""}
      </div>
      <div class="rates-results-controls">
        ${segmented("result-type", RESULT_TYPES, state.resultType, "rates_marketplace_result_type")}
        <label class="rates-sort-field">
          <span>Sort by</span>
          <select name="sort" value="${esc(state.sort)}" data-marketplace-sort data-analytics-event="rates_marketplace_sort">
            ${optionList(SORTS, state.sort)}
          </select>
        </label>
      </div>
    </div>
  `;
}

function resultsColumns(state) {
  const columns = [
    ["Provider", ""],
    ["Rate", "lowestRate"],
    ["APR", "lowestApr"],
    ["Payment", "lowestMonthlyPayment"],
    ["Points", "lowestPoints"],
    ["Upfront", "lowestUpfrontCost"],
    ["8-year cost", "lowestEightYearCost"],
    ["Actions", ""],
  ];
  return `
    <div class="rates-results-columns" aria-hidden="true">
      ${columns.map(([label, sort]) => `<span class="${sort === state.sort ? "active-sort" : ""}">${esc(label)}${sort === state.sort ? " ↓" : ""}</span>`).join("")}
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
        <p class="eyebrow">Compare mortgage costs</p>
        <h1>Compare sample mortgage costs across companies and loan officers</h1>
        <p>Start with anonymous illustrative results, refine the details that matter to you, and compare the same cost measures across companies or loan officers before choosing a next step.</p>
      </div>
    </section>
    <section class="rates-marketplace-workspace">
      <aside class="rates-filter-rail" data-mobile-open="${state.mobileFiltersOpen ? "true" : "false"}">
        ${scenarioForm(state)}
      </aside>
      <div class="rates-results-panel" data-rates-results>
        ${resultsHeader(state, result)}
        ${validation.valid ? "" : `<div class="rates-empty-state"><strong>Review the scenario fields before comparing offers.</strong><p>${esc(Object.values(validation.errors)[0] || "Some fields need attention.")}</p></div>`}
        ${hasOffers ? resultsColumns(state) : ""}
        ${hasOffers ? result.items.map((offer) => offerRow(offer, state)).join("") : noMatchState(state.resultType)}
        ${result.hasMore ? `<button class="button secondary rates-show-more" type="button" data-show-more-offers data-analytics-event="rates_marketplace_show_more">Show more offers</button>` : ""}
        ${disclosure(fixture)}
      </div>
    </section>
  `;
}

function noMatchState(resultType) {
  const resultLabel = resultType === "loanOfficer" ? "loan officers" : "companies";
  return `
    <div class="rates-empty-state">
      <strong>No illustrative ${esc(resultLabel)} match those filters yet.</strong>
      <p>The current examples use 30-year terms. Choose 30-year, include FHA or VA options, or read the public rate education below before contacting a loan officer.</p>
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
        <p>${esc(message || "The illustrative sample results could not be read.")}</p>
        <a href="/rates#rate-table">Continue to rate education</a>
        <a href="/loan-officers">Find loan officer guidance</a>
      </div>
    </section>
  `;
}

export function renderRatesMarketplace({ fixture, state = MARKETPLACE_DEFAULTS } = {}) {
  try {
    const normalizedFixture = normalizeFixtureSafe(fixture);
    const normalizedState = normalizeUiState({
      ...MARKETPLACE_DEFAULTS,
      ...state,
      visibleCount: state.visibleCount || DEFAULT_VISIBLE_COUNT,
      resultType: state.resultType || MARKETPLACE_DEFAULTS.resultType,
      sort: state.sort || MARKETPLACE_DEFAULTS.sort,
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

function formState(container, currentState, downPaymentSource = "downPaymentPercent") {
  const next = { ...currentState };
  container.querySelectorAll("[data-marketplace-field]").forEach((field) => {
    const name = field.getAttribute("name") || field.getAttribute("data-marketplace-field");
    if (!name) return;
    if (field.type === "checkbox") next[name] = Boolean(field.checked);
    else next[name] = field.value;
  });
  if (next.mortgageType === "purchase") {
    const change = downPaymentSource === "downPaymentAmount"
      ? { downPaymentAmount: next.downPaymentAmount }
      : { downPaymentPercent: next.downPaymentPercent };
    Object.assign(next, updateDownPayment(next, change));
  }
  return next;
}

function syncDownPaymentInputs(form, sourceName) {
  const price = form?.querySelector?.('[name="purchasePrice"]');
  const amount = form?.querySelector?.('[name="downPaymentAmount"]');
  const percent = form?.querySelector?.('[name="downPaymentPercent"]');
  if (!price || !amount || !percent) return;
  const next = updateDownPayment(
    {
      purchasePrice: price.value,
      downPaymentAmount: amount.value,
      downPaymentPercent: percent.value,
    },
    sourceName === "downPaymentAmount"
      ? { downPaymentAmount: amount.value }
      : { downPaymentPercent: percent.value },
  );
  if (sourceName === "downPaymentAmount" && Number.isFinite(Number(next.downPaymentPercent))) {
    percent.value = String(next.downPaymentPercent);
  }
  if (sourceName === "downPaymentPercent" && Number.isFinite(Number(next.downPaymentAmount))) {
    amount.value = String(next.downPaymentAmount);
  }
}

function showFormErrors(form, errors = {}) {
  const firstMessage = Object.values(errors)[0] || "";
  const error = form?.querySelector?.("[data-rates-form-error]");
  if (error) {
    error.textContent = firstMessage;
    if (firstMessage) error.removeAttribute("hidden");
    else error.setAttribute("hidden", "");
  }
  form?.querySelectorAll?.("[data-marketplace-field]").forEach((field) => {
    const name = field.getAttribute("name") || field.getAttribute("data-marketplace-field");
    if (errors[name]) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  });
}

function setAdvancedFiltersOpen(container, isOpen) {
  const toggle = container.querySelector("[data-toggle-advanced-filters]");
  const panel = container.querySelector("[data-advanced-marketplace]");
  toggle?.setAttribute("aria-expanded", String(isOpen));
  if (toggle) toggle.textContent = isOpen ? "Show fewer filters" : "Show more filters";
  if (panel) panel.hidden = !isOpen;
}

function setSegmentedControl(button, value) {
  button.parentNode?.querySelectorAll?.("button").forEach((item) => {
    const active = item === button;
    item.setAttribute("aria-pressed", String(active));
    item.setAttribute("class", active ? "active" : "");
  });
  const field = button.parentNode?.parentNode?.querySelector?.("input[type=\"hidden\"]");
  if (field) field.value = value;
  return field;
}

function setMortgageTypeFields(form, mortgageType) {
  form?.querySelectorAll?.("[data-purchase-fields]").forEach((field) => {
    field.hidden = mortgageType !== "purchase";
  });
  form?.querySelectorAll?.("[data-refinance-fields]").forEach((field) => {
    field.hidden = mortgageType !== "refinance";
  });
}

function ancestorWithAttribute(node, attribute) {
  let current = node;
  while (current) {
    if (current.hasAttribute?.(attribute)) return current;
    current = current.parentNode;
  }
  return null;
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
  const segments = [
    ["principalAndInterest", "Principal and interest", principal],
    ...PAYMENT_FIELDS.map(([field, label]) => [field, label, values[field] || 0]),
  ];
  let offset = 0;
  for (const [field, label, value] of segments) {
    const formattedValue = formatCurrency(value);
    const share = total > 0 ? (value / total) * 100 : 0;
    const legend = panel.querySelector(`[data-chart-segment="${field}"]`);
    const visual = panel.querySelector(`[data-donut-segment="${field}"]`);
    legend?.setAttribute("data-chart-value", formattedValue);
    const legendValue = legend?.querySelector("strong");
    if (legendValue) legendValue.textContent = formattedValue;
    if (visual) {
      const color = visual.getAttribute("style")?.match(/--segment-color:([^;]+)/)?.[1] || "#0b55ff";
      visual.setAttribute("style", `--segment-color:${color};--segment-share:${share};--segment-offset:${-offset}`);
    }
    if (legend?.getAttribute("aria-pressed") === "true") {
      const detail = panel.querySelector("[data-chart-detail-text]");
      if (detail) detail.textContent = `${label}: ${formattedValue}.`;
    }
    offset += share;
  }
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

  let state = normalizeUiState(resolveScenarioContext({
    url: readUrlState(),
    account: accountContext,
    cache: readCache(),
    defaults: MARKETPLACE_DEFAULTS,
  }));
  state.visibleCount = state.visibleCount || DEFAULT_VISIBLE_COUNT;
  let advancedFiltersOpen = Boolean(state.advancedFiltersOpen);
  let mobileFiltersOpen = false;
  let downPaymentSource = "downPaymentPercent";

  const rerender = () => {
    persistState(state);
    container.innerHTML = renderBody(normalizedFixture, {
      ...state,
      advancedFiltersOpen,
      mobileFiltersOpen,
    });
    bind();
  };

  const setState = (next, eventName, payload = {}) => {
    state = normalizeUiState({ ...state, ...next }, state);
    state.visibleCount = next.visibleCount || state.visibleCount || DEFAULT_VISIBLE_COUNT;
    advancedFiltersOpen = Boolean(state.advancedFiltersOpen);
    mobileFiltersOpen = Boolean(state.mobileFiltersOpen);
    emitAnalytics(track, eventName, payload);
    rerender();
  };

  const bind = () => {
    const form = container.querySelector("[data-rates-form]");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const rawNext = formState(form, state, downPaymentSource);
      const validation = validateScenario(rawNext);
      if (!validation.valid) {
        showFormErrors(form, validation.errors);
        return;
      }
      showFormErrors(form);
      const next = normalizeState(rawNext);
      setState({
        ...next,
        visibleCount: DEFAULT_VISIBLE_COUNT,
        expandedOfferIds: [],
        expandedTabsByOffer: {},
        mobileFiltersOpen: false,
      }, "rates_marketplace_update");
    });

    for (const name of ["downPaymentAmount", "downPaymentPercent"]) {
      form?.querySelector?.(`[name="${name}"]`)?.addEventListener("input", () => {
        downPaymentSource = name;
        syncDownPaymentInputs(form, name);
      });
    }
    form?.querySelector?.('[name="purchasePrice"]')?.addEventListener("input", () => {
      syncDownPaymentInputs(form, downPaymentSource);
    });

    container.querySelector("[data-toggle-advanced-filters]")?.addEventListener("click", () => {
      advancedFiltersOpen = !advancedFiltersOpen;
      setAdvancedFiltersOpen(container, advancedFiltersOpen);
    });

    container.querySelector("[data-toggle-mobile-filters]")?.addEventListener("click", (event) => {
      mobileFiltersOpen = !mobileFiltersOpen;
      const rail = container.querySelector(".rates-filter-rail");
      rail?.setAttribute("data-mobile-open", String(mobileFiltersOpen));
      event.currentTarget?.setAttribute?.("aria-expanded", String(mobileFiltersOpen));
      const action = event.currentTarget?.querySelector?.("em");
      if (action) action.textContent = mobileFiltersOpen ? "Close" : "Edit";
    });

    container.querySelectorAll("[data-mortgage-type-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.getAttribute("data-mortgage-type-option");
        setSegmentedControl(button, value);
        setMortgageTypeFields(form, value);
      });
    });

    for (const name of ["show-fha", "show-va", "cash-out", "dti", "points", "occupancy"]) {
      container.querySelectorAll(`[data-${name}-option]`).forEach((button) => {
        button.addEventListener("click", () => {
          const value = button.getAttribute(`data-${name}-option`);
          setSegmentedControl(button, value);
        });
      });
    }

    container.querySelector("[data-reset-marketplace]")?.addEventListener("click", () => {
      advancedFiltersOpen = false;
      mobileFiltersOpen = false;
      setState({
        ...MARKETPLACE_DEFAULTS,
        visibleCount: DEFAULT_VISIBLE_COUNT,
        expandedOfferIds: [],
        expandedTabsByOffer: {},
        advancedFiltersOpen: false,
        mobileFiltersOpen: false,
      }, "rates_marketplace_reset");
    });

    container.querySelectorAll("[data-result-type-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const resultType = button.getAttribute("data-result-type-option");
        setState({
          resultType,
          visibleCount: DEFAULT_VISIBLE_COUNT,
          expandedOfferIds: [],
          expandedTabsByOffer: {},
        }, "rates_marketplace_result_type", { resultType });
      });
    });

    container.querySelector("[data-marketplace-sort]")?.addEventListener("change", (event) => {
      setState({
        sort: event.target.value,
        visibleCount: DEFAULT_VISIBLE_COUNT,
        expandedOfferIds: [],
        expandedTabsByOffer: {},
      }, "rates_marketplace_sort", { sort: event.target.value });
    });

    container.querySelector("[data-show-more-offers]")?.addEventListener("click", () => {
      const visibleCount = (state.visibleCount || DEFAULT_VISIBLE_COUNT) + DEFAULT_VISIBLE_COUNT;
      setState({ visibleCount }, "rates_marketplace_show_more", { visibleCount });
    });

    container.querySelectorAll("[data-offer-details]").forEach((button) => {
      button.addEventListener("click", () => {
        const offerId = button.getAttribute("data-offer-details");
        const expandedOfferIds = new Set(state.expandedOfferIds);
        if (expandedOfferIds.has(offerId)) expandedOfferIds.delete(offerId);
        else expandedOfferIds.add(offerId);
        setState(
          {
            expandedOfferIds: [...expandedOfferIds],
            expandedTabsByOffer: {
              ...state.expandedTabsByOffer,
              [offerId]: state.expandedTabsByOffer?.[offerId] || "details",
            },
          },
          "rates_marketplace_expand_offer",
          { offerId },
        );
      });
    });

    container.querySelector("[data-expand-all]")?.addEventListener("click", () => {
      const visibleIds = [...container
        .querySelectorAll("article[data-offer-id]")]
        .map((offer) => offer.getAttribute("data-offer-id"))
        .filter(Boolean);
      const allExpanded = visibleIds.length > 0 && visibleIds.every((id) => state.expandedOfferIds.includes(id));
      const expandedTabsByOffer = { ...state.expandedTabsByOffer };
      visibleIds.forEach((id) => {
        expandedTabsByOffer[id] ||= "details";
      });
      setState(
        {
          expandedOfferIds: allExpanded ? [] : visibleIds,
          expandedTabsByOffer,
        },
        "rates_marketplace_expand_all",
        { visibleCount: visibleIds.length },
      );
    });

    container.querySelectorAll("[data-offer-tab]").forEach((button) => {
      const activate = () => {
        const tab = button.getAttribute("data-offer-tab");
        const offerId = button.getAttribute("data-offer-id");
        setState({
          expandedOfferIds: state.expandedOfferIds.includes(offerId)
            ? state.expandedOfferIds
            : [...state.expandedOfferIds, offerId],
          expandedTabsByOffer: {
            ...state.expandedTabsByOffer,
            [offerId]: tab,
          },
        }, "rates_marketplace_tab", { offerId, tab });
        container.querySelectorAll("[data-offer-tab]").find?.((item) =>
          item.getAttribute("data-offer-tab") === tab && item.getAttribute("data-offer-id") === offerId
        )?.focus?.();
      };
      button.addEventListener("click", activate);
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault?.();
        const offerId = button.getAttribute("data-offer-id");
        const tabs = [...container.querySelectorAll("[data-offer-tab]")]
          .filter((item) => item.getAttribute("data-offer-id") === offerId);
        const current = tabs.indexOf(button);
        let target = current;
        if (event.key === "Home") target = 0;
        if (event.key === "End") target = tabs.length - 1;
        if (event.key === "ArrowLeft") target = (current - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") target = (current + 1) % tabs.length;
        tabs[target]?.click?.();
      });
    });

    container.querySelectorAll("[data-payment-assumption]").forEach((input) => {
      input.addEventListener("input", () => {
        const offerId = input.getAttribute("data-offer-payment");
        const panel = ancestorWithAttribute(input, "data-payment-panel") || container.querySelector(`[data-payment-panel="${offerId}"]`);
        input.focus?.();
        updatePaymentPanel(panel, offerId, track);
      });
    });

    container.querySelectorAll("[data-chart-segment]").forEach((button) => {
      const activate = () => {
        const expanded = ancestorWithAttribute(button, "data-expanded-offer") || container;
        const detail = expanded.querySelector("[data-chart-detail-text]");
        expanded.querySelectorAll("[data-chart-segment]").forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        if (detail) {
          detail.textContent = `${button.getAttribute("data-chart-label") || button.querySelector?.("span")?.textContent || "Payment segment"}: ${button.getAttribute("data-chart-value")}.`;
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
        emitAnalytics(track, "rates_provider_next", {
          offerId,
          resultType: handoff?.resultType || state.resultType,
          sort: handoff?.scenario?.sort || state.sort,
          tab: state.expandedTabsByOffer?.[offerId] || handoff?.scenario?.expandedTab || "details",
          visibleCount: handoff?.scenario?.visibleCount || state.visibleCount,
        });
        if (typeof navigate === "function") {
          navigate(buildPrequalHandoffUrl(handoff));
        }
      });
    });
  };

  rerender();
}

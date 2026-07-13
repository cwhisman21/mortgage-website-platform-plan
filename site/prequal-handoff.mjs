import { parseMarketplaceState, summarizeScenario } from "./rates-marketplace.mjs";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function formatMoney(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function formatRatePercent(value) {
  return `${Number(value).toFixed(3).replace(/0$/, "").replace(/0$/, "")}%`;
}

export function buildPrequalHandoffRequest({ search, cachedState = {} } = {}) {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(String(search || ""));
  const cache = parseMarketplaceState(cachedState);
  const query = parseMarketplaceState(params);
  const scenario = parseMarketplaceState({ ...cache, ...query });
  return {
    offerId: String(params.get("offerId") || query.expandedOfferId || cache.expandedOfferId || "").trim(),
    scenario,
  };
}

function appendMarketplaceState(params, source) {
  const scenario = parseMarketplaceState(source || {});
  if (scenario.mortgageType === "purchase") {
    delete scenario.propertyValue;
    delete scenario.loanBalance;
    delete scenario.cashOut;
  } else if (scenario.mortgageType === "refinance") {
    delete scenario.purchasePrice;
    delete scenario.downPaymentAmount;
    delete scenario.downPaymentPercent;
  }
  Object.entries(scenario).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  return params;
}

export function buildPrequalHandoffUrl(source = {}) {
  const params = new URLSearchParams();
  const offerId = String(source.offerId || "").trim();
  if (offerId) params.set("offerId", offerId);
  appendMarketplaceState(params, source.scenario);
  const query = params.toString();
  return query ? `/prequal/start?${query}` : "/prequal/start";
}

export function returnToRatesUrl(source = {}) {
  const params = new URLSearchParams();
  appendMarketplaceState(params, source.scenario);
  const query = params.toString();
  return query ? `/rates?${query}` : "/rates";
}

function scenarioRows(scenario = {}) {
  if (scenario.mortgageType === "refinance") {
    return [
      ["Purpose", "Refinance"],
      ["ZIP", scenario.zip || "Saved scenario"],
      ["Value", formatMoney(scenario.propertyValue)],
      ["Loan balance", formatMoney(scenario.loanBalance)],
      ["Credit", scenario.creditRange || "Saved scenario"],
      ["Term", `${scenario.term || 30}-year`],
    ];
  }
  return [
    ["Purpose", "Purchase"],
    ["ZIP", scenario.zip || "Saved scenario"],
    ["Price", formatMoney(scenario.purchasePrice)],
    ["Down", `${formatMoney(scenario.downPaymentAmount)} / ${scenario.downPaymentPercent || 0}%`],
    ["Credit", scenario.creditRange || "Saved scenario"],
    ["Term", `${scenario.term || 30}-year`],
  ];
}

export function createPrequalHandoffView({ adapter, request } = {}) {
  const safeRequest = request || { offerId: "", scenario: {} };
  const handoff = adapter && safeRequest.offerId
    ? adapter.createPrequalHandoff({ offerId: safeRequest.offerId, scenario: safeRequest.scenario })
    : null;
  const offer = adapter && handoff ? adapter.getOffer(handoff.offerId) : null;
  if (!handoff || !offer) {
    return {
      status: "recovery",
      offerId: safeRequest.offerId || "",
      scenario: safeRequest.scenario || {},
      scenarioSummary: summarizeScenario(safeRequest.scenario || {}),
      scenarioRows: scenarioRows(safeRequest.scenario || {}),
      recoveryTitle: "Return to your saved rate results",
      recoveryBody: "We could not reopen that selected option. Return to rate results to pick an available provider again without rebuilding your scenario.",
      providerName: "Selected provider",
      providerInitials: initials("Selected provider"),
      providerSubline: "Your saved rate results stay ready to reopen.",
      returnUrl: returnToRatesUrl(safeRequest),
      hasStartAction: false,
    };
  }
  return {
    status: "known",
    offerId: handoff.offerId,
    scenario: handoff.scenario,
    scenarioSummary: handoff.scenarioSummary,
    scenarioRows: scenarioRows(handoff.scenario),
    providerName: handoff.displayName,
    providerInitials: initials(handoff.displayName),
    providerSubline: [offer.nmlsDisplay, handoff.productLabel].filter(Boolean).join(" / "),
    productLabel: handoff.productLabel,
    detailMetrics: [
      ["Rate", formatRatePercent(handoff.rate)],
      ["APR", formatRatePercent(handoff.apr)],
      ["Points", String(handoff.points)],
      ["Monthly P&I", formatMoney(handoff.principalAndInterest)],
    ],
    returnUrl: returnToRatesUrl({ scenario: handoff.scenario }),
    hasStartAction: true,
  };
}

export function renderPrequalHandoffMarkup(view) {
  const lead = "When you continue, Snap carries the selected provider and your comparison details into that provider's prequalification path. You can return to rate results without losing your comparison view.";
  const body = view.status === "known"
    ? "Review the provider, product, and mortgage scenario you selected before continuing into the connected Snap prequalification path."
    : "Your comparison scenario is still available. Reopen your rate results and choose the provider you want to carry forward.";
  const detailSummary = view.status === "known"
    ? `
      <div class="prequal-handoff-detail-grid">
        ${view.detailMetrics.map(([label, value]) => `
          <div class="prequal-handoff-detail-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>
        `).join("")}
      </div>
    `
    : `<div class="prequal-handoff-recovery-copy"><p>${esc(view.recoveryBody)}</p></div>`;

  return `
    <section class="prequal-handoff-hero">
      <div class="prequal-handoff-shell">
        <p class="eyebrow">Prequalification</p>
        <h1>Your selected option is ready to continue</h1>
        <p class="prequal-handoff-lead">${esc(lead)}</p>
      </div>
    </section>
    <section class="prequal-handoff-stage">
      <div class="prequal-handoff-shell">
        <div class="prequal-handoff-card">
          <p class="prequal-handoff-kicker">Snap prequal</p>
          <h2>${esc(view.status === "known" ? `Continue with ${view.providerName}` : view.recoveryTitle)}</h2>
          <p class="prequal-handoff-body">${esc(body)}</p>
          <div class="prequal-handoff-provider-strip">
            <div class="prequal-handoff-provider-badge" aria-hidden="true">${esc(view.providerInitials)}</div>
            <div class="prequal-handoff-provider-copy">
              <strong>${esc(view.providerName)}</strong>
              <span>${esc(view.providerSubline)}</span>
            </div>
          </div>
          ${detailSummary}
          <div class="prequal-handoff-scenario-head">
            <h3>Your submitted scenario</h3>
          </div>
          <div class="prequal-handoff-scenario-grid">
            ${view.scenarioRows.map(([label, value]) => `
              <div class="prequal-handoff-scenario-item">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </div>
            `).join("")}
          </div>
          <div class="prequal-handoff-note">
            <p>No name, email, or phone number has been requested on this comparison page.</p>
          </div>
          <div class="prequal-handoff-actions">
            ${view.hasStartAction ? `<button class="button" type="button" data-provider-start data-provider-name="${esc(view.providerName)}">Start prequal</button>` : ""}
            <a class="${view.hasStartAction ? "prequal-handoff-return" : "button secondary"}" href="${esc(view.returnUrl)}">Return to rate results</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

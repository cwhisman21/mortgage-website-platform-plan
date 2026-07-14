function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const PRODUCT_META_DESCRIPTIONS = Object.freeze({
  "product-purchase": "Plan a home purchase by comparing the full monthly payment, cash to close, loan options, property costs, reserves, and the steps from offer to closing.",
  "product-refinance": "Compare refinancing goals, closing costs, break-even timing, loan terms, monthly payments, and total borrowing cost against your current mortgage.",
  "product-fha": "Learn how FHA loans handle mortgage insurance, county loan limits, property review, down payments, lender underwriting, and total borrowing costs.",
  "product-va": "Explore VA-backed loans, including eligibility, entitlement, funding fees, appraisal and occupancy rules, closing costs, and private-lender review.",
  "product-conventional": "Compare conventional loans by conforming limits, private mortgage insurance, pricing, down payment, property fit, reserves, and total borrowing cost.",
  "product-jumbo": "Learn how jumbo loans differ by lender, with guidance on conforming limits, income and asset documentation, reserves, appraisals, pricing, and liquidity.",
  "product-home-equity": "Compare HELOCs and home equity loans by rate structure, payment changes, draw and repayment rules, fees, lien risk, and plans for the borrowed funds.",
  "product-cash-out-refinance": "Evaluate a cash-out refinance by comparing the new mortgage with your current loan, closing costs, equity, repayment term, proceeds, and alternatives.",
});

export function meaningfulWordCount(product) {
  const text = [
    product?.summary,
    ...(product?.sections || []).flatMap((section) => section.paragraphs || []),
    ...(product?.questions || []).map((item) => item.answer),
  ].filter(Boolean).join(" ");
  return (text.match(/\b[A-Za-z0-9][A-Za-z0-9'’-]*\b/g) || []).length;
}

export function productContentById(bundle, productId) {
  const product = (bundle?.products || []).find((item) => item.id === productId);
  if (!product) return null;
  const metaDescription = product.metaDescription || PRODUCT_META_DESCRIPTIONS[product.id];
  return metaDescription ? { ...product, metaDescription } : product;
}

export function renderProductContent(product, { routeHref = (href) => href, sources = [] } = {}) {
  if (!product) return "";
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const sections = (product.sections || []).map((section) => `
    <section class="section compact product-copy-section" id="${escapeHtml(section.id)}">
      <div class="content-layout">
        <div class="main-stack">
          <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
          <h2>${escapeHtml(section.heading)}</h2>
          ${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>
      </div>
    </section>`).join("");
  const questions = (product.questions || []).map((item) => `
    <details class="faq-item">
      <summary>${escapeHtml(item.question)}</summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>`).join("");
  const sourceItems = (product.sourceIds || [])
    .map((id) => sourcesById.get(id))
    .filter(Boolean);
  return `
    <section class="section compact product-copy-intro" aria-labelledby="product-guide-title">
      <div class="content-layout">
        <div class="main-stack">
          <p class="eyebrow">Borrower guide</p>
          <h2 id="product-guide-title">${escapeHtml(product.title)}</h2>
          <p>${escapeHtml(product.summary)}</p>
          <nav class="tag-row" aria-label="On this page">
            ${(product.sections || []).map((section) => `<a class="tag" href="${escapeHtml(routeHref(`#${section.id}`))}">${escapeHtml(section.navLabel)}</a>`).join("")}
          </nav>
        </div>
      </div>
    </section>
    ${sections}
    <section class="section compact product-copy-faq" aria-labelledby="product-questions-title">
      <div class="content-layout"><div class="main-stack">
        <p class="eyebrow">Common questions</p>
        <h2 id="product-questions-title">Questions to settle before you choose</h2>
        <div class="faq-list">${questions}</div>
      </div></div>
    </section>
    ${sourceItems.length ? `<section class="section compact product-copy-sources" aria-labelledby="product-sources-title"><div class="content-layout"><div class="main-stack"><p class="eyebrow">Authoritative sources</p><h2 id="product-sources-title">Rules and guidance used in this comparison</h2><ul>${sourceItems.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a><span> ${escapeHtml(source.publisher)} · reviewed ${escapeHtml(source.accessedAt)}</span></li>`).join("")}</ul></div></div></section>` : ""}`;
}

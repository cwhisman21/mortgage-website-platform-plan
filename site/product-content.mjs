function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function meaningfulWordCount(product) {
  const text = [
    product?.summary,
    ...(product?.sections || []).flatMap((section) => [section.heading, ...(section.paragraphs || [])]),
    ...(product?.questions || []).flatMap((item) => [item.question, item.answer]),
  ].filter(Boolean).join(" ");
  return (text.match(/\b[A-Za-z0-9][A-Za-z0-9'’-]*\b/g) || []).length;
}

export function productContentById(bundle, productId) {
  return (bundle?.products || []).find((product) => product.id === productId) || null;
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

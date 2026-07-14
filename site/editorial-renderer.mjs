import {
  renderContributorBylineMarkup,
} from "./editorial-content.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value || "section")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueBy(items, keyFor) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFor(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDate(value, prefix) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return `${prefix} ${label}`;
}

function routeFor(routeHref, href) {
  return routeHref ? routeHref(href) : href;
}

function sourceMap(sources = []) {
  return new Map(sources.map((source) => [source.id, source]));
}

function sourceList(ids = [], sources = []) {
  const map = sourceMap(sources);
  return uniqueBy(ids.map((id) => map.get(id)).filter(Boolean), (source) => source.id);
}

function sectionParagraphs(section) {
  if (Array.isArray(section?.paragraphs)) return section.paragraphs;
  if (section?.body) return [section.body];
  return [];
}

function renderTable(table, sources, routeHref, fallbackSourceIds = []) {
  const columns = table?.headers || table?.columns || [];
  if (!columns.length || !Array.isArray(table.rows)) return "";
  const citedSources = sourceList(table.sourceIds?.length ? table.sourceIds : fallbackSourceIds, sources);
  return `
    <figure class="production-evidence-table">
      ${table.caption ? `<figcaption>${escapeHtml(table.caption)}</figcaption>` : ""}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${columns.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${table.note ? `<p class="production-table-note">${escapeHtml(table.note)}</p>` : ""}
      ${citedSources.length ? `<p class="production-source-citation">Sources: ${citedSources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.publisher)}</a>`).join(", ")}</p>` : ""}
    </figure>
  `;
}

function ctaHrefMarkup(cta, routeHref) {
  const href = cta?.href || cta?.route;
  if (!href) return `<button class="button" type="button" data-cta-action="leadForm">${escapeHtml(cta?.label || "Request guidance")}</button>`;
  return `<a class="button" href="${escapeHtml(routeFor(routeHref, href))}">${escapeHtml(cta.label || "Continue")}</a>`;
}

function renderCtaBreak(cta, routeHref) {
  if (!cta) return "";
  const title = cta.title || cta.heading || "Review your next step";
  const text = cta.text || cta.body || "";
  return `
    <aside class="production-article-cta" aria-label="${escapeHtml(cta.eyebrow || "Next step")}">
      ${cta.eyebrow ? `<p class="eyebrow">${escapeHtml(cta.eyebrow)}</p>` : ""}
      <h3>${escapeHtml(title)}</h3>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      <div class="cta-inline-actions">
        ${ctaHrefMarkup(cta, routeHref)}
      </div>
    </aside>
  `;
}

function articleToc(article, sectionEntries) {
  const items = [
    { id: "article-introduction", label: "Introduction" },
    { id: "key-takeaways", label: "Key takeaways" },
    ...sectionEntries.map((entry) => ({ id: entry.id, label: entry.heading })),
    article.conclusion ? { id: "article-conclusion", label: "Conclusion" } : null,
    ...(article.faqs?.length ? [{ id: "article-faqs", label: "FAQs" }] : []),
    ...(article.sourceIds?.length ? [{ id: "article-sources", label: "Sources" }] : []),
  ].filter(Boolean);

  return `
    <nav class="production-article-toc" aria-label="On this page">
      <h2>On this page</h2>
      <ol>
        ${items.map((item) => `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.label)}</a></li>`).join("")}
      </ol>
    </nav>
  `;
}

function renderSourceDetails(article, sources) {
  const ids = [
    ...(article.sourceIds || []),
    ...(article.sections || []).flatMap((section) => section.table?.sourceIds || []),
  ];
  const citedSources = sourceList(ids, sources);
  if (!citedSources.length) return "";
  return `
    <section class="production-article-sources" id="article-sources" aria-labelledby="article-sources-title">
      <h2 id="article-sources-title">Sources and dates</h2>
      <div class="production-source-list">
        ${citedSources.map((source) => `
          <article class="production-source-card">
            <h3><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.publisher)}: ${escapeHtml(source.title)}</a></h3>
            <dl>
              <div><dt>Data period</dt><dd>${escapeHtml(source.dataPeriod)}</dd></div>
              <div><dt>Accessed</dt><dd>${escapeHtml(source.accessedAt)}</dd></div>
              <div><dt>Geography</dt><dd>${escapeHtml(source.geographicScope)}</dd></div>
              <div><dt>Supports</dt><dd>${escapeHtml(source.claimSupported)}</dd></div>
            </dl>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function relatedRouteCard(routeEntry, href, routeHref) {
  const title = routeEntry?.title || routeEntry?.name || href;
  const text = routeEntry?.text || routeEntry?.purpose || routeEntry?.marketPositioning || routeEntry?.borrowerGoal || routeEntry?.type || "Related mortgage page";
  const label = routeEntry?.type || "Related";
  return `
    <a class="production-related-card" href="${escapeHtml(routeFor(routeHref, href))}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </a>
  `;
}

export function renderProductionArticle(article, {
  contributors = [],
  sources = [],
  relatedRoutes = new Map(),
  route = (href) => href,
  evidenceMarkup = "",
} = {}) {
  const sectionEntries = (article.sections || []).map((section, index) => ({
    ...section,
    originalId: section.id || "",
    id: section.id || slugify(section.heading) || `article-section-${index + 1}`,
  }));
  const ctaBreaks = article.ctaBreaks || [];
  const ctaAfterSection = (section) => ctaBreaks.find((cta) => cta.afterSection === section.heading || cta.afterSectionId === section.originalId || cta.afterSectionId === section.id);
  const articleTypeLabels = {
    local_market_update: "Local market update",
    state_tax_insurance_explainer: "Taxes and insurance",
    product_explainer: "Loan options",
    borrower_intent_guide: "Mortgage planning guide",
  };
  const articleType = article.eyebrow || articleTypeLabels[article.type] || "Mortgage guide";
  const published = formatDate(article.publishedAt, "Published");
  const updated = formatDate(article.updatedAt, "Updated");
  const asOf = formatDate(article.asOf, "As of");
  const dateDetailsByValue = new Map();
  [
    [article.publishedAt, published],
    [article.updatedAt, updated],
    [article.asOf, asOf],
  ].forEach(([value, label]) => {
    if (value && label) dateDetailsByValue.set(value, label);
  });
  const dateDetails = [...dateDetailsByValue.values()];

  return `
    <article class="production-article-page" data-production-article="${escapeHtml(article.id)}">
      <header class="production-article-hero">
        <div class="production-article-hero-inner">
          <p class="eyebrow">${escapeHtml(articleType)}</p>
          <h1>${escapeHtml(article.title)}</h1>
          ${article.dek ? `<p class="production-article-dek">${escapeHtml(article.dek)}</p>` : ""}
          ${renderContributorBylineMarkup(article, contributors, { routeHref: route, showDate: false })}
          ${dateDetails.length ? `<p class="production-article-dates">${dateDetails.map(escapeHtml).join(" <span aria-hidden=\"true\">|</span> ")}</p>` : ""}
        </div>
      </header>
      <div class="production-article-shell">
        <main class="production-article-main">
          <section class="production-article-intro" id="article-introduction">
            ${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ""}
            ${(article.introduction || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </section>
          ${article.keyTakeaways?.length ? `
            <section class="production-key-takeaways" id="key-takeaways" aria-labelledby="key-takeaways-title">
              <h2 id="key-takeaways-title">Key takeaways</h2>
              <ul>
                ${article.keyTakeaways.map((takeaway) => `<li>${escapeHtml(takeaway)}</li>`).join("")}
              </ul>
            </section>
          ` : ""}
          ${evidenceMarkup}
          ${sectionEntries.map((section) => `
            <section class="production-article-section" id="${escapeHtml(section.id)}">
              <h2>${escapeHtml(section.heading)}</h2>
              ${sectionParagraphs(section).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
              ${renderTable(section.table, sources, route, section.sourceIds || article.sourceIds || [])}
              ${renderCtaBreak(ctaAfterSection(section), route)}
            </section>
          `).join("")}
          ${article.conclusion ? `
            <section class="production-article-section" id="article-conclusion">
              <h2>Conclusion</h2>
              <p>${escapeHtml(article.conclusion)}</p>
            </section>
          ` : ""}
          ${article.faqs?.length ? `
            <section class="production-article-faqs" id="article-faqs" aria-labelledby="article-faqs-title">
              <h2 id="article-faqs-title">FAQs</h2>
              ${article.faqs.map((faq) => `
                <details>
                  <summary>${escapeHtml(faq.question)}</summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `).join("")}
            </section>
          ` : ""}
          ${renderSourceDetails(article, sources)}
        </main>
        <aside class="production-article-rail">
          ${articleToc(article, sectionEntries)}
          <aside class="production-article-rail-cta">
            <h2>Review your scenario</h2>
            <p>Use this guide as education, then bring borrower and property details into a licensed conversation.</p>
            <button class="button" type="button" data-cta-action="leadForm">Request guidance</button>
          </aside>
        </aside>
      </div>
      ${article.relatedRoutes?.length ? `
        <section class="production-related-section" aria-labelledby="production-related-title">
          <h2 id="production-related-title">Related mortgage guidance</h2>
          <div class="production-related-grid">
            ${article.relatedRoutes.map((href) => relatedRouteCard(relatedRoutes.get(href), href, route)).join("")}
          </div>
        </section>
      ` : ""}
    </article>
  `;
}

function resolveFeaturedLinks(ids = [], { articlesById = new Map(), linkResolver } = {}) {
  return ids.map((id) => {
    if (articlesById.has(id)) return { kind: "article", item: articlesById.get(id) };
    if (linkResolver) return linkResolver(id);
    return null;
  }).filter(Boolean);
}

function hubStepLink(step, context, routeHref) {
  const linked = resolveFeaturedLinks([step.linkId], context)[0];
  const href = linked?.item?.route || step.href;
  const label = step.label || "Open";
  return href ? `<a class="text-link" href="${escapeHtml(routeFor(routeHref, href))}">${escapeHtml(label)} <span aria-hidden="true">-&gt;</span></a>` : "";
}

function defaultFeaturedLinkRenderer(link, context, routeHref, index) {
  if (link.kind === "article") {
    if (context.renderArticleCard) return context.renderArticleCard(link.item, index);
    return relatedRouteCard(link.item, link.item.route, routeHref);
  }
  return relatedRouteCard(link.item, link.item.route || link.item.href, routeHref);
}

export function renderProductionTopicHub(hub, {
  articlesById = new Map(),
  contributors = [],
  route = (href) => href,
  renderArticleCard,
  linkResolver,
  featuredTitle = "Featured mortgage guides",
  renderFeaturedLink,
} = {}) {
  const context = { articlesById, contributors, renderArticleCard, linkResolver };
  const featuredLinks = resolveFeaturedLinks(hub.featuredLinkIds || [], context);
  const contributorList = (hub.contributorIds || [hub.contributorId])
    .map((id) => contributors.find((contributor) => contributor.id === id))
    .filter(Boolean);

  return `
    <div class="production-topic-hub" data-production-topic-hub="${escapeHtml(hub.id)}">
      <section class="production-topic-hero">
        <div>
          <p class="eyebrow">Mortgage guide</p>
          <h1>${escapeHtml(hub.name)}</h1>
          ${hub.heroSummary ? `<p class="production-topic-summary">${escapeHtml(hub.heroSummary)}</p>` : ""}
          ${contributorList.length ? `<p class="production-topic-byline">Covered by ${contributorList.map((contributor) => `<a href="${escapeHtml(route(contributor.route))}">${escapeHtml(contributor.name)}</a>`).join(", ")}</p>` : ""}
        </div>
      </section>
      <section class="production-topic-content" aria-labelledby="topic-overview-title">
        <div class="production-topic-main">
          <h2 id="topic-overview-title">Overview</h2>
          ${(hub.overviewParagraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          ${hub.whyItMatters ? `<aside class="production-topic-callout"><h2>Why it matters</h2><p>${escapeHtml(hub.whyItMatters)}</p></aside>` : ""}
          ${hub.startHere?.length ? `
            <section class="production-topic-block" aria-labelledby="topic-start-title">
              <h2 id="topic-start-title">Start here</h2>
              <div class="production-topic-step-grid">
                ${hub.startHere.map((step) => `
                  <article>
                    <h3>${escapeHtml(step.title)}</h3>
                    <p>${escapeHtml(step.text)}</p>
                    ${hubStepLink(step, context, route)}
                  </article>
                `).join("")}
              </div>
            </section>
          ` : ""}
          ${hub.comparisonPoints?.length ? `
            <section class="production-topic-block" aria-labelledby="topic-compare-title">
              <h2 id="topic-compare-title">What to compare</h2>
              <div class="production-topic-comparison">
                ${hub.comparisonPoints.map((point) => `
                  <article>
                    <h3>${escapeHtml(point.title)}</h3>
                    <p>${escapeHtml(point.text)}</p>
                  </article>
                `).join("")}
              </div>
            </section>
          ` : ""}
        </div>
      </section>
      ${featuredLinks.length ? `
        <section class="production-topic-featured" aria-labelledby="topic-featured-title">
          <h2 id="topic-featured-title">${escapeHtml(featuredTitle)}</h2>
          <div class="editorial-article-grid">
            ${featuredLinks.map((link, index) => {
              if (renderFeaturedLink) return renderFeaturedLink(link, index);
              return defaultFeaturedLinkRenderer(link, context, route, index);
            }).join("")}
          </div>
        </section>
      ` : ""}
      ${hub.closingCta ? `
        <section class="production-topic-closing" aria-labelledby="topic-closing-title">
          ${hub.closingCta.eyebrow ? `<p class="eyebrow">${escapeHtml(hub.closingCta.eyebrow)}</p>` : ""}
          <h2 id="topic-closing-title">${escapeHtml(hub.closingCta.title || "Choose a next step")}</h2>
          <p>${escapeHtml(hub.closingCta.text)}</p>
          ${ctaHrefMarkup(hub.closingCta, route)}
        </section>
      ` : ""}
    </div>
  `;
}

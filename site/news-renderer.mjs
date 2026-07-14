import { renderContributorBylineMarkup } from "./editorial-content.mjs";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const formatDate = (value) => {
  if (!value) return "";
  const rawValue = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T00:00:00Z` : rawValue);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
};

const safeUrl = (value, { allowRelative = true } = {}) => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  if (allowRelative && /^\/(?!\/)/.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};

const paragraphList = (section) => {
  const paragraphs = Array.isArray(section?.paragraphs)
    ? section.paragraphs
    : Array.isArray(section?.body)
      ? section.body
      : [section?.body || section?.text].filter(Boolean);
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
};

const renderTable = (table) => {
  const headers = table?.headers || table?.columns || [];
  const rows = table?.rows || [];
  if (!headers.length || !rows.length) return "";
  return `
    <figure class="news-article-table">
      ${table.caption ? `<figcaption>${escapeHtml(table.caption)}</figcaption>` : ""}
      <div class="table-wrap"><table>
        <thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : Object.values(row || {})).map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </figure>`;
};

const renderCta = (cta) => {
  const href = safeUrl(cta?.href || cta?.route);
  if (!href || !cta?.label) return "";
  return `<aside class="news-article-cta"><p>${cta.eyebrow ? escapeHtml(cta.eyebrow) : ""}</p><h2>${escapeHtml(cta.title || cta.label)}</h2><a class="button" href="${escapeHtml(href)}">${escapeHtml(cta.label)}</a></aside>`;
};

const renderArticleMeta = (article, { includeDates = true } = {}) => {
  const parts = [
    article?.sourceDesk || article?.sourceLabels?.join(" + "),
    includeDates && article?.publishedAt ? `Published ${formatDate(article.publishedAt)}` : "",
    includeDates && article?.updatedAt ? `Updated ${formatDate(article.updatedAt)}` : "",
  ].filter(Boolean);
  return parts.length ? `<p class="news-article-meta">${escapeHtml(parts.join(" | "))}</p>` : "";
};

const renderSources = (sourceRecords) => {
  if (!sourceRecords?.length) return "";
  return `<section class="news-article-sources"><h2>Sources</h2><ul>${sourceRecords.map((source) => `
    <li>${safeUrl(source.sourceUrl, { allowRelative: false }) ? `<a href="${escapeHtml(safeUrl(source.sourceUrl, { allowRelative: false }))}">${escapeHtml(source.citationLabel || source.publisher || source.dataset)}</a>` : `<span>${escapeHtml(source.citationLabel || source.publisher || source.dataset)}</span>`}${source.period ? ` <span>${escapeHtml(source.period)}</span>` : ""}</li>`).join("")}</ul></section>`;
};

const renderRelatedRoutes = (relatedRoutes) => {
  if (!relatedRoutes?.length) return "";
  return `<nav class="news-article-related" aria-label="Related resources"><h2>Related resources</h2><ul>${relatedRoutes.map((related) => {
    const route = typeof related === "string" ? related : related.route;
    const label = typeof related === "string" ? related : related.label || related.title || related.route;
    const href = safeUrl(route);
    return href ? `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>` : "";
  }).join("")}</ul></nav>`;
};

export function renderArticleContent(article, media, { author } = {}) {
  const visual = article?.visuals?.[0];
  const imageUrl = safeUrl(media?.localPath || media?.imageUrl || visual?.imageUrl || visual?.src);
  const imageAlt = media?.alt || visual?.alt || "";
  const creditUrl = safeUrl(media?.photographerUrl || media?.photoPageUrl, { allowRelative: false });
  const imageCredit = media?.photographer
    ? `<figcaption>Photo by ${creditUrl ? `<a href="${escapeHtml(creditUrl)}">${escapeHtml(media.photographer)}</a>` : escapeHtml(media.photographer)}${media.provider ? ` via ${escapeHtml(media.provider)}` : ""}</figcaption>`
    : "";
  const ctas = Array.isArray(article?.ctaPlacements) ? article.ctaPlacements : [];

  return `
    <article class="news-article">
      <header class="news-article-header">
        <p class="eyebrow">${escapeHtml(article?.relevanceLabel || article?.articleType || "")}</p>
        <h1>${escapeHtml(article?.title)}</h1>
        ${article?.dek ? `<p class="news-article-dek">${escapeHtml(article.dek)}</p>` : ""}
        ${author ? renderContributorBylineMarkup(article, [author], { dateMonth: "long" }) : ""}
        ${renderArticleMeta(article, { includeDates: !author })}
      </header>
      ${imageUrl ? `<figure class="news-article-hero"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="eager" />${imageCredit}</figure>` : ""}
      ${article?.keyTakeaways?.length ? `<section class="news-article-takeaways"><h2>Key takeaways</h2><ul>${article.keyTakeaways.map((takeaway) => `<li>${escapeHtml(takeaway)}</li>`).join("")}</ul></section>` : ""}
      ${(article?.sections || []).map((section, index) => `
        <section class="news-article-section">
          ${section.heading || section.title ? `<h2>${escapeHtml(section.heading || section.title)}</h2>` : ""}
          ${paragraphList(section)}
          ${section.table ? renderTable(section.table) : ""}
          ${index === 0 ? renderCta(ctas[0]) : ""}
        </section>`).join("")}
      ${(article?.tables || []).map(renderTable).join("")}
      ${ctas.slice(1).map(renderCta).join("")}
      ${article?.methodology ? `<section class="news-article-methodology"><h2>Methodology</h2><p>${escapeHtml(article.methodology)}</p></section>` : ""}
      ${article?.limitations ? `<section class="news-article-limitations"><h2>What this data cannot determine</h2><p>${escapeHtml(article.limitations)}</p></section>` : ""}
      ${renderSources(article?.sourceRecords)}
      ${renderRelatedRoutes(article?.relatedRoutes)}
      ${article?.disclosure ? `<p class="disclosure">${escapeHtml(article.disclosure)}</p>` : ""}
    </article>`.replace(/[ \t]+(?=\r?\n)/g, "");
}

export { escapeHtml, formatDate, safeUrl };

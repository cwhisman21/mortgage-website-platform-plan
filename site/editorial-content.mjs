const FALLBACK_AUTHOR = {
  id: "snap-mortgage",
  name: "Snap Mortgage",
  title: "Published by Snap Mortgage",
  route: "",
  portrait: {
    src: "",
    alt: "Snap Mortgage editorial attribution",
  },
};

export const CONTRIBUTOR_DISCLOSURE = "Snap editorial voice, not a loan officer or licensed mortgage professional.";

const silhouetteDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%23eef3f8'/%3E%3Ccircle cx='40' cy='31' r='15' fill='%2393a4b8'/%3E%3Cpath d='M15 72c4-17 14-26 25-26s21 9 25 26' fill='%2393a4b8'/%3E%3C/svg%3E`;

function unwrapList(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.[key])) return raw[key];
  if (Array.isArray(raw?.contributors?.[key])) return raw.contributors[key];
  if (Array.isArray(raw?.topicHubs?.[key])) return raw.topicHubs[key];
  return [];
}

function uniqueByField(items, field) {
  const seen = new Set();
  for (const item of items) {
    if (!item?.[field]) continue;
    if (seen.has(item[field])) return false;
    seen.add(item[field]);
  }
  return true;
}

function normalizeContributor(contributor) {
  const portrait = contributor.portrait || {};
  return {
    ...contributor,
    title: "Snap Mortgage Editorial Contributor",
    route: contributor.route || `/learning-center/authors/${contributor.slug}`,
    portrait: {
      src: portrait.src || silhouetteDataUri,
      alt: portrait.alt || `${contributor.name}, Snap Mortgage editorial contributor`,
    },
    topics: contributor.topics || [],
  };
}

function normalizeTopicHub(hub) {
  return {
    ...hub,
    id: hub.id,
    slug: hub.slug,
    route: hub.route,
    heroSummary: hub.heroSummary,
    beat: hub.beat,
    contributorId: hub.contributorId,
    contributorIds: hub.contributorIds || (hub.contributorId ? [hub.contributorId] : []),
    public: hub.public === true,
    articleIds: hub.articleIds || [],
    overviewParagraphs: hub.overviewParagraphs || [],
    startHere: hub.startHere || [],
    comparisonPoints: hub.comparisonPoints || [],
    featuredLinkIds: hub.featuredLinkIds || [],
  };
}

function buildArticleAuthorIds(topicHubs) {
  const articleAuthorIds = {};
  for (const hub of topicHubs) {
    for (const articleId of hub.articleIds || []) {
      if (!articleAuthorIds[articleId]) articleAuthorIds[articleId] = hub.contributorId;
    }
  }
  return articleAuthorIds;
}

function hasEditorialRegistries(raw) {
  return unwrapList(raw, "contributors").length > 0 && unwrapList(raw, "topicHubs").length > 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeEditorialContent(raw = {}) {
  const contributors = unwrapList(raw, "contributors").map(normalizeContributor);
  const topicHubs = unwrapList(raw, "topicHubs").map(normalizeTopicHub);
  const sources = unwrapList(raw, "sources");

  if (!uniqueByField(contributors, "id")) throw new Error("Contributor IDs must be unique.");
  if (!uniqueByField(contributors, "slug")) throw new Error("Contributor slugs must be unique.");
  if (!uniqueByField(contributors, "route")) throw new Error("Contributor routes must be unique.");

  return {
    contributors,
    topicHubs,
    sources,
    contributorMap: new Map(contributors.map((contributor) => [contributor.id, contributor])),
    authorRoutes: contributors.map((contributor) => ({
      route: contributor.route,
      type: "contributor",
      item: contributor,
    })),
    articleAuthorIds: buildArticleAuthorIds(topicHubs),
  };
}

export function normalizeEditorialContentWithFallback(primaryRaw, fallbackRaw = {}) {
  if (hasEditorialRegistries(primaryRaw)) {
    try {
      return normalizeEditorialContent(primaryRaw);
    } catch {
      // Continue to the standalone registries.
    }
  }

  try {
    return normalizeEditorialContent(fallbackRaw);
  } catch {
    return normalizeEditorialContent();
  }
}

export function contributorById(content, id) {
  return content?.contributorMap?.get(id) || (content?.contributors || []).find((contributor) => contributor.id === id) || null;
}

export function applyArticleAuthorIds(content, articles = []) {
  const articleAuthorIds = content?.articleAuthorIds || {};
  return articles.map((article) => ({
    ...article,
    authorId: article.authorId || articleAuthorIds[article.id] || "",
  }));
}

export function mergeEditorialArticles(baseArticles = [], overlayRaw) {
  const articles = Array.isArray(baseArticles) ? baseArticles : [];
  const overlays = Array.isArray(overlayRaw)
    ? overlayRaw
    : Array.isArray(overlayRaw?.articles)
      ? overlayRaw.articles
      : [];
  const overlaysById = new Map(
    overlays
      .filter((article) => article && typeof article === "object" && article.id)
      .map((article) => [article.id, article]),
  );

  return articles.map((article) => ({
    ...article,
    ...(overlaysById.get(article.id) || {}),
  }));
}

export function buildContributorArticleIndex(...articleCollections) {
  const index = new Map();
  const seenByContributor = new Map();

  for (const articles of articleCollections) {
    if (!Array.isArray(articles)) continue;
    for (const article of articles) {
      if (!article?.authorId || (!article.id && !article.route)) continue;
      const seen = seenByContributor.get(article.authorId) || new Set();
      const key = article.id || article.route;
      if (seen.has(key)) continue;
      seen.add(key);
      seenByContributor.set(article.authorId, seen);
      const contributorArticles = index.get(article.authorId) || [];
      contributorArticles.push(article);
      index.set(article.authorId, contributorArticles);
    }
  }

  for (const contributorArticles of index.values()) {
    contributorArticles.sort((left, right) => {
      const leftDate = left.updatedAt || left.publishedAt || "";
      const rightDate = right.updatedAt || right.publishedAt || "";
      return rightDate.localeCompare(leftDate);
    });
  }
  return index;
}

export function articlesForContributor(content, articles = [], id) {
  if (articles instanceof Map) return [...(articles.get(id) || [])];
  return articles.filter((article) => article.authorId === id);
}

export function resolveArticleAuthor(article, contributors = []) {
  if (!article?.authorId) return FALLBACK_AUTHOR;
  return contributors.find((contributor) => contributor.id === article.authorId) || FALLBACK_AUTHOR;
}

function formatBylineDate(article, { month = "short" } = {}) {
  const isMarketUpdate = String(article?.type || "").includes("market");
  const usesAsOf = isMarketUpdate && Boolean(article?.asOf);
  const rawDate = usesAsOf ? article.asOf : article?.updatedAt || article?.publishedAt || "";
  if (!rawDate) return "";
  const prefix = usesAsOf ? "As of" : article.updatedAt ? "Updated" : "Published";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? new Date(`${rawDate}T00:00:00Z`)
    : new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";
  return `${prefix} ${new Intl.DateTimeFormat("en-US", {
    month,
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)}`;
}

export function renderBylineModel(article, contributors = [], { dateMonth = "short" } = {}) {
  const author = resolveArticleAuthor(article, contributors);
  const isFallback = author.id === FALLBACK_AUTHOR.id;
  return {
    name: author.name,
    title: author.title,
    href: isFallback ? "" : author.route,
    portraitSrc: author.portrait?.src || silhouetteDataUri,
    portraitAlt: author.portrait?.alt || FALLBACK_AUTHOR.portrait.alt,
    dateLabel: formatBylineDate(article, { month: dateMonth }),
    isFallback,
  };
}

function displayBylineDate(article, dateLabel) {
  if (!dateLabel) return "";
  if (String(article?.type || "").includes("market")) return dateLabel;
  return dateLabel.replace(/^Updated/, "Last updated");
}

export function renderContributorBylineMarkup(
  article,
  contributors = [],
  { compact = false, routeHref = (href) => href, dateMonth = "short", showDate = true } = {},
) {
  const byline = renderBylineModel(article, contributors, { dateMonth });
  const dateLabel = displayBylineDate(article, byline.dateLabel);
  const className = compact
    ? "article-card-byline editorial-byline compact"
    : "article-byline editorial-byline";
  const titleMarkup = compact
    ? ""
    : `<span class="article-byline-title">${escapeHtml(byline.title)}</span>`;
  const dateMarkup = showDate && dateLabel ? `<time>${escapeHtml(dateLabel)}</time>` : "";
  const disclosureMarkup = !compact && !byline.isFallback
    ? `<span class="article-byline-disclosure">${escapeHtml(CONTRIBUTOR_DISCLOSURE)}</span>`
    : "";
  const contributorHref = /^\/learning-center\/authors\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(byline.href || "")
    ? byline.href
    : "";
  const portraitSrc = /^\/site\/assets\/contributors\/[a-z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(byline.portraitSrc || "")
    ? byline.portraitSrc
    : silhouetteDataUri;
  const innerMarkup = `
      <img src="${escapeHtml(portraitSrc)}" alt="${escapeHtml(byline.portraitAlt)}" loading="lazy" decoding="async" data-contributor-portrait />
      <span class="article-byline-copy">
        <span class="article-byline-name${byline.isFallback ? " article-byline-fallback" : ""}">${escapeHtml(byline.name)}</span>
        ${titleMarkup}
        ${dateMarkup}
        ${disclosureMarkup}
      </span>`;

  if (contributorHref) {
    return `<a class="${className}" href="${escapeHtml(routeHref(contributorHref))}" data-editorial-byline>${innerMarkup}
    </a>`;
  }

  return `<div class="${className}" data-editorial-byline>${innerMarkup}
    </div>`;
}

export function renderContributorArchiveMarkup(
  content,
  articles,
  contributor,
  renderArticle,
  { limit = Number.POSITIVE_INFINITY, showCount = false } = {},
) {
  const relatedArticles = articlesForContributor(content, articles, contributor.id);
  if (relatedArticles.length) {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : relatedArticles.length;
    const visibleArticles = relatedArticles.slice(0, normalizedLimit);
    const countMarkup = showCount
      ? `<p class="contributor-archive-summary" data-contributor-article-count="${relatedArticles.length}">${visibleArticles.length < relatedArticles.length ? `Showing ${visibleArticles.length} of ${relatedArticles.length}` : `${relatedArticles.length}`} published articles, including borrower guides and local market updates.</p>`
      : "";
    return `${countMarkup}<div class="editorial-article-grid">${visibleArticles.map(renderArticle).join("")}</div>`;
  }
  return `<p class="contributor-empty-archive">Guidance from ${escapeHtml(contributor.name)} will appear here as it is published.</p>`;
}

export { silhouetteDataUri };

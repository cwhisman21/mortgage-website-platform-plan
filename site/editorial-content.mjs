const FALLBACK_AUTHOR = {
  id: "snap-mortgage",
  name: "Snap Mortgage",
  title: "Editorial publishing responsibility",
  route: "",
  portrait: {
    src: "",
    alt: "Snap Mortgage editorial attribution",
  },
};

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
    id: hub.id,
    slug: hub.slug,
    route: hub.route,
    heroSummary: hub.heroSummary,
    beat: hub.beat,
    contributorId: hub.contributorId,
    public: hub.public === true,
    articleIds: hub.articleIds || [],
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

export function normalizeEditorialContent(raw = {}) {
  const contributors = unwrapList(raw, "contributors").map(normalizeContributor);
  const topicHubs = unwrapList(raw, "topicHubs").map(normalizeTopicHub);

  if (!uniqueByField(contributors, "id")) throw new Error("Contributor IDs must be unique.");
  if (!uniqueByField(contributors, "slug")) throw new Error("Contributor slugs must be unique.");
  if (!uniqueByField(contributors, "route")) throw new Error("Contributor routes must be unique.");

  return {
    contributors,
    topicHubs,
    contributorMap: new Map(contributors.map((contributor) => [contributor.id, contributor])),
    authorRoutes: contributors.map((contributor) => ({
      route: contributor.route,
      type: "contributor",
      item: contributor,
    })),
    articleAuthorIds: buildArticleAuthorIds(topicHubs),
  };
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

export function articlesForContributor(content, articles = [], id) {
  return articles.filter((article) => article.authorId === id);
}

export function resolveArticleAuthor(article, contributors = []) {
  if (!article?.authorId) return FALLBACK_AUTHOR;
  return contributors.find((contributor) => contributor.id === article.authorId) || FALLBACK_AUTHOR;
}

function formatBylineDate(article) {
  const rawDate = article?.updatedAt || article?.publishedAt || "";
  if (!rawDate) return "";
  const prefix = article.updatedAt ? "Updated" : "Published";
  const date = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${prefix} ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)}`;
}

export function renderBylineModel(article, contributors = []) {
  const author = resolveArticleAuthor(article, contributors);
  const isFallback = author.id === FALLBACK_AUTHOR.id;
  return {
    name: author.name,
    title: author.title,
    href: isFallback ? "" : author.route,
    portraitSrc: author.portrait?.src || silhouetteDataUri,
    portraitAlt: author.portrait?.alt || FALLBACK_AUTHOR.portrait.alt,
    dateLabel: formatBylineDate(article),
    isFallback,
  };
}

export { silhouetteDataUri };

import { escapeHtml, renderArticleContent } from "./news-renderer.mjs";

export const DEFAULT_SITE_ORIGIN = "https://mortgage-website-platform-plan-thinkwhale.vercel.app";

const absoluteUrl = (origin, route) => new URL(route, origin).toString();
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export function renderArticleDocument(article, media, { siteOrigin = DEFAULT_SITE_ORIGIN, author, tagContext } = {}) {
  const canonical = absoluteUrl(siteOrigin, article.route);
  const image = media?.localPath || media?.imageUrl ? absoluteUrl(siteOrigin, media.localPath || media.imageUrl) : "";
  const assignedTags = [...(tagContext?.primaryTags || []), ...(tagContext?.additionalTags || [])]
    .filter((tag, index, tags) => tag?.displayName && tags.findIndex(({ id }) => id === tag.id) === index);
  const primaryTagNames = (tagContext?.primaryTags || []).map(({ displayName }) => displayName).filter(Boolean);
  const articleAuthor = {
    "@type": "Organization",
    "@id": absoluteUrl(siteOrigin, "/#snap-mortgage-editorial"),
    name: "Snap Mortgage Editorial",
    parentOrganization: { "@type": "Organization", name: "Snap Mortgage" },
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription || article.dek,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    mainEntityOfPage: canonical,
    image: image || undefined,
    author: articleAuthor,
    creditText: author?.name ? `Editorial by ${author.name}` : undefined,
    publisher: { "@type": "Organization", name: "Snap Mortgage" },
    ...(assignedTags.length ? {
      keywords: assignedTags.map(({ displayName }) => displayName),
      about: assignedTags.map((tag) => ({
        "@type": "Thing",
        name: tag.displayName,
        ...(tag.canonicalRoute ? { url: absoluteUrl(siteOrigin, tag.canonicalRoute) } : {}),
      })),
    } : {}),
    ...(primaryTagNames.length ? { articleSection: primaryTagNames } : {}),
  };
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(article.title)} | Snap Mortgage</title>
  <meta name="description" content="${escapeHtml(article.metaDescription || article.dek || "")}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(article.title)}" />
  <meta property="og:description" content="${escapeHtml(article.metaDescription || article.dek || "")}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${jsonForScript(structuredData)}</script>
  <link rel="stylesheet" href="/site/styles.css" />
</head><body>
  <header class="site-header"><div class="header-inner"><a class="brand" href="/"><img class="brand-logo" src="/site/assets/images/snap-mortgage.png" alt="Snap Mortgage" /></a></div></header>
  <main class="page">${renderArticleContent(article, media, { author, tagContext })}</main>
  <footer class="site-footer"><div class="footer-inner"><a href="/locations">Locations</a><a href="/learning-center">Learning center</a></div></footer>
</body></html>`.replace(/[ \t]+(?=\r?\n)/g, "");
}

export function renderSitemap(routes, { siteOrigin = DEFAULT_SITE_ORIGIN, lastmodByRoute = {} } = {}) {
  const uniqueRoutes = [...new Set((routes || []).filter(Boolean))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueRoutes.map((route) => `  <url><loc>${escapeHtml(absoluteUrl(siteOrigin, route))}</loc>${lastmodByRoute[route] ? `<lastmod>${escapeHtml(lastmodByRoute[route])}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
}

export function renderRobots({ siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
  return `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(siteOrigin, "/sitemap.xml")}\n`;
}

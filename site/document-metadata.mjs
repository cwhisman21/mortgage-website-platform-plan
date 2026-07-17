import { productContentById } from "./product-content.mjs";
import { tagRoute, tagsForRoute } from "./tag-registry.mjs";

export const DEFAULT_SITE_ORIGIN = "https://mortgage-website-platform-plan-thinkwhale.vercel.app";
export const SNAP_MORTGAGE_PUBLISHER = Object.freeze({ "@type": "Organization", name: "Snap Mortgage" });
export const SNAP_MORTGAGE_EDITORIAL_NAME = "Snap Mortgage Editorial";

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lookup(collection, id) {
  if (!collection || !id) return null;
  if (typeof collection.get === "function") return collection.get(id) || null;
  return collection[id] || null;
}

function canonicalPath(path) {
  const pathOnly = String(path || "/").split(/[?#]/, 1)[0] || "/";
  if (!pathOnly.startsWith("/")) throw new Error(`Document path must start with /: ${pathOnly}`);
  return pathOnly.length > 1 && pathOnly.endsWith("/") ? pathOnly.slice(0, -1) : pathOnly;
}

function absoluteUrl(origin, value) {
  if (!value) return "";
  return new URL(value, origin).toString();
}

function readableList(values = []) {
  const items = values.map(compact).filter(Boolean);
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function humanize(value) {
  return compact(String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " "))
    .toLowerCase();
}

function titleFor(found, statesById) {
  const item = found?.item || {};
  const titles = {
    home: "Snap Mortgage | Local Mortgage Intelligence",
    locations: "Locations | Snap Mortgage Market Guides",
    rates: "Mortgage Rates, APR Details, and Review Options | Snap Mortgage",
    prequalHandoff: "Review a Prequalification Scenario | Snap Mortgage",
    state: `${item.name} Mortgage Guide | Snap Mortgage`,
    city: `${item.name}, ${lookup(statesById, item.stateId)?.abbr || ""} Mortgage Market | Snap Mortgage`,
    product: `${item.name} Guide | Snap Mortgage`,
    blog: `${item.name} | Snap Mortgage Learning Center`,
    contributor: `${item.name} | Snap Mortgage Learning Center`,
    article: `${item.title} | Snap Mortgage`,
    newsArticle: `${item.title} | Snap Mortgage`,
    tag: `${item.displayName} Mortgage Resources | Snap Mortgage`,
    company: `${item.name} Mortgage Options | Snap Mortgage`,
    loanOfficer: `${item.name} | Snap Mortgage Profile`,
    branch: `${item.name} | Snap Mortgage Profile`,
    calculator: `${item.name} | Snap Mortgage Calculator`,
    directory: `${item.name} | Snap Mortgage`,
  };
  return compact(item.metaTitle || titles[found?.type] || "Snap Mortgage");
}

function directoryDescription(item) {
  const descriptions = {
    "/locations": "Browse state and city mortgage guides to compare local evidence, ownership-cost questions, loan paths, and next-step planning resources.",
    "/loan-officers": "Browse name-only profiles and neutral mortgage education links before deciding which identity, authorization, service, and contact details to verify elsewhere.",
    "/branches": "Browse name-only entries and neutral mortgage education links without treating names or related links as proof of a location, operation, or team relationship.",
    "/learning-center/search": "Search borrower guides, local market updates, loan-program explainers, and mortgage planning articles across the Snap Mortgage learning center.",
    "/loan-options": "Compare purchase, refinance, FHA, VA, conventional, jumbo, cash-out, and home-equity loan paths before reviewing a specific scenario.",
    "/calculators": "Use mortgage calculators to estimate payments, affordability, refinancing, down payments, and rent-versus-buy scenarios with visible assumptions.",
  };
  return descriptions[item.route] || "";
}

function descriptionFor(found, { statesById, productCopyBundle }) {
  const item = found?.item || {};
  const state = lookup(statesById, item.stateId);
  const explicitDescriptions = {
    home: "Compare rates, local markets, loan options, calculators, account save actions, and mortgage education.",
    locations: directoryDescription({ route: "/locations" }),
    rates: "Review public mortgage-rate benchmarks, APR details, rate-review options, and offer-comparison questions.",
    prequalHandoff: "Review the selected provider, mortgage option, and scenario before continuing to Snap Prequal.",
  };
  if (explicitDescriptions[found?.type]) return explicitDescriptions[found.type];

  if (found?.type === "state") {
    return compact(`${item.name} mortgage guide for comparing example home prices, payments, property taxes, insurance costs, inventory, and loan options before reviewing a property.`);
  }
  if (found?.type === "city") {
    return compact(`${item.name}, ${state?.abbr || ""} mortgage guide for comparing example home prices, payments, inventory, property taxes, insurance costs, and time on market before reviewing a property.`);
  }
  if (found?.type === "product") {
    return compact(productContentById(productCopyBundle, item.id)?.metaDescription || item.metaDescription || item.borrowerGoal);
  }
  if (found?.type === "loanOfficer") {
    return compact(`Open the name-only ${item.name} profile and neutral mortgage education links. The page does not establish identity, credentials, authorization, service, association, or contact details.`);
  }
  if (found?.type === "company") {
    return compact(`Compare mortgage rate, APR, payment, points, upfront cost, and borrowing-cost details for ${item.name} before choosing a next step.`);
  }
  if (found?.type === "branch") {
    return compact(`Open the name-only ${item.name} entry and neutral mortgage education links. The page does not establish a location, operation, team relationship, service, or contact details.`);
  }
  if (found?.type === "calculator") {
    const inputs = readableList((item.captures || []).map(humanize));
    return compact(`Use the ${item.name} to compare ${inputs || "mortgage assumptions"} before a lender reviews the property and loan scenario.`);
  }
  if (found?.type === "tag") return compact(item.description);
  if (found?.type === "directory") return compact(directoryDescription(item));
  if (found?.type === "contributor") {
    return compact(`${item.shortBio || item.bio} Snap editorial voice, not a loan officer or licensed mortgage professional.`);
  }

  return compact(
    item.metaDescription ||
    item.dek ||
    item.bio ||
    item.heroSummary ||
    item.marketPositioning ||
    item.stateNarrative ||
    item.purpose ||
    item.borrowerGoal,
  );
}

function requireUsefulDescription(description, route) {
  const value = compact(description);
  const genericFallback = /^(?:Explore Snap Mortgage guidance and related borrower resources|Snap Mortgage local mortgage intelligence)/i;
  if (value.length < 40 || genericFallback.test(value)) {
    throw new Error(`Public route requires a useful metadata description: ${route}`);
  }
  return value;
}

function assignedArticleTags(item, tagRegistry) {
  if (!tagRegistry || !item.route) return { primaryTags: [], allTags: [] };
  const { primaryTags, additionalTags } = tagsForRoute(tagRegistry, item.route);
  const seen = new Set();
  const displayable = (tags) => tags.filter((tag) => {
    const key = tag?.id || tagRoute(tag);
    if (!key || !tag?.displayName || !tagRoute(tag) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const publicPrimaryTags = displayable(primaryTags);
  return {
    primaryTags: publicPrimaryTags,
    allTags: [...publicPrimaryTags, ...displayable(additionalTags)],
  };
}

function articleTagStructuredData(item, { siteOrigin, tagRegistry }) {
  const { primaryTags, allTags } = assignedArticleTags(item, tagRegistry);
  if (!allTags.length) return {};
  return {
    keywords: allTags.map((tag) => tag.displayName),
    about: allTags.map((tag) => ({
      "@type": "Thing",
      name: tag.displayName,
      url: absoluteUrl(siteOrigin, tagRoute(tag)),
    })),
    ...(primaryTags.length ? { articleSection: primaryTags.map((tag) => tag.displayName) } : {}),
  };
}

function articleStructuredData(item, metadata, { siteOrigin, tagRegistry }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title || item.name,
    description: metadata.description,
    ...(item.publishedAt ? { datePublished: item.publishedAt } : {}),
    ...(item.updatedAt || item.publishedAt ? { dateModified: item.updatedAt || item.publishedAt } : {}),
    mainEntityOfPage: metadata.canonical,
    ...(metadata.openGraph.image ? { image: metadata.openGraph.image } : {}),
    author: {
      "@type": "Organization",
      name: SNAP_MORTGAGE_EDITORIAL_NAME,
      url: absoluteUrl(siteOrigin, "/learning-center/editorial-team"),
    },
    publisher: SNAP_MORTGAGE_PUBLISHER,
    ...articleTagStructuredData(item, { siteOrigin, tagRegistry }),
  };
}

function tagStructuredData(item, metadata, { searchRecords, siteOrigin }) {
  const records = (Array.isArray(searchRecords) ? searchRecords : searchRecords?.records || [])
    .filter((record) => Array.isArray(record?.tagIds) && record.tagIds.includes(item.id) && record.route && record.title)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.canonicalOrder) ? left.canonicalOrder : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(right.canonicalOrder) ? right.canonicalOrder : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.route.localeCompare(right.route);
    });
  const name = `${item.displayName} mortgage resources`;
  const itemListId = `${metadata.canonical}#item-list`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      description: metadata.description,
      url: metadata.canonical,
      ...(item.updatedAt || item.reviewedAt ? { dateModified: item.updatedAt || item.reviewedAt } : {}),
      about: { "@type": "Thing", name: item.displayName, url: metadata.canonical },
      mainEntity: { "@id": itemListId },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": itemListId,
      name,
      numberOfItems: records.length,
      itemListElement: records.map((record, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(siteOrigin, record.route),
        name: record.title,
      })),
    },
  ];
}

export function resolveDocumentMetadata(found, {
  path = found?.item?.route || "/",
  siteOrigin = DEFAULT_SITE_ORIGIN,
  statesById = {},
  productCopyBundle = { products: [] },
  mediaById = {},
  contributorsById = {},
  tagRegistry,
  searchRecords = [],
} = {}) {
  const item = found?.item || {};
  const requestedRoute = canonicalPath(path);
  const route = found?.type === "tag" && item.canonicalRoute
    ? canonicalPath(item.canonicalRoute)
    : requestedRoute;
  const canonical = absoluteUrl(siteOrigin, route);
  const robots = requestedRoute === "/learning-center/search"
    ? "noindex,follow"
    : "index,follow";
  const title = titleFor(found, statesById);
  const description = requireUsefulDescription(
    descriptionFor(found, { statesById, productCopyBundle }),
    route,
  );
  const media = lookup(mediaById, item.imageId);
  const imageSource = media?.localPath || media?.imageUrl || (found?.type === "contributor" ? item.portrait?.src : "") || "";
  const image = absoluteUrl(siteOrigin, imageSource);
  const openGraph = {
    type: ["article", "newsArticle"].includes(found?.type) ? "article" : "website",
    title,
    description,
    url: canonical,
    image,
  };
  const twitter = {
    card: image ? "summary_large_image" : "summary",
    title,
    description,
    image,
  };
  const metadata = { title, description, canonical, robots, openGraph, twitter, jsonLd: null };
  if (found?.type === "tag") {
    metadata.jsonLd = tagStructuredData(item, metadata, { searchRecords, siteOrigin });
  } else if (["article", "newsArticle"].includes(found?.type)) {
    metadata.jsonLd = articleStructuredData(item, metadata, { siteOrigin, tagRegistry });
  } else if (found?.type === "blog") {
    const guideJsonLd = articleStructuredData(item, metadata, { siteOrigin, tagRegistry });
    if (guideJsonLd.keywords?.length) metadata.jsonLd = guideJsonLd;
  }
  return metadata;
}

function setAttribute(documentLike, selector, name, value) {
  documentLike.querySelector(selector)?.setAttribute(name, value || "");
}

function setNamedMeta(documentLike, name, value) {
  let node = documentLike.querySelector(`meta[name="${name}"]`);
  if (!node && typeof documentLike.createElement === "function" && documentLike.head?.appendChild) {
    node = documentLike.createElement("meta");
    node.setAttribute("name", name);
    documentLike.head.appendChild(node);
  }
  node?.setAttribute("content", value || "");
}

export function applyDocumentMetadata(documentLike, metadata) {
  documentLike.title = metadata.title;
  setAttribute(documentLike, 'meta[name="description"]', "content", metadata.description);
  setNamedMeta(documentLike, "robots", metadata.robots);
  setAttribute(documentLike, 'link[rel="canonical"]', "href", metadata.canonical);
  setAttribute(documentLike, 'meta[property="og:type"]', "content", metadata.openGraph.type);
  setAttribute(documentLike, 'meta[property="og:title"]', "content", metadata.openGraph.title);
  setAttribute(documentLike, 'meta[property="og:description"]', "content", metadata.openGraph.description);
  setAttribute(documentLike, 'meta[property="og:url"]', "content", metadata.openGraph.url);
  setAttribute(documentLike, 'meta[property="og:image"]', "content", metadata.openGraph.image);
  setAttribute(documentLike, 'meta[name="twitter:card"]', "content", metadata.twitter.card);
  setAttribute(documentLike, 'meta[name="twitter:title"]', "content", metadata.twitter.title);
  setAttribute(documentLike, 'meta[name="twitter:description"]', "content", metadata.twitter.description);
  setAttribute(documentLike, 'meta[name="twitter:image"]', "content", metadata.twitter.image);
  const jsonLd = documentLike.querySelector("[data-document-jsonld]");
  if (jsonLd) jsonLd.textContent = metadata.jsonLd ? JSON.stringify(metadata.jsonLd).replace(/</g, "\\u003c") : "";
}

import { productContentById } from "./product-content.mjs";

export const DEFAULT_SITE_ORIGIN = "https://mortgage-website-platform-plan-thinkwhale.vercel.app";
export const SNAP_MORTGAGE_PUBLISHER = Object.freeze({ "@type": "Organization", name: "Snap Mortgage" });

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
    prequalHandoff: "Start Mortgage Prequalification | Snap Mortgage",
    state: `${item.name} Mortgage Guide | Snap Mortgage`,
    city: `${item.name}, ${lookup(statesById, item.stateId)?.abbr || ""} Mortgage Market | Snap Mortgage`,
    product: `${item.name} Guide | Snap Mortgage`,
    blog: `${item.name} | Snap Mortgage Learning Center`,
    contributor: `${item.name} | Snap Mortgage Learning Center`,
    article: `${item.title} | Snap Mortgage`,
    newsArticle: `${item.title} | Snap Mortgage`,
    loanOfficer: `${item.name} | Snap Mortgage Loan Officer`,
    branch: `${item.name} | Snap Mortgage Branch`,
    calculator: `${item.name} | Snap Mortgage Calculator`,
    directory: `${item.name} | Snap Mortgage`,
  };
  return compact(item.metaTitle || titles[found?.type] || "Snap Mortgage");
}

function directoryDescription(item) {
  const descriptions = {
    "/loan-officers": "Find Snap Mortgage loan officers by licensed state, priority market, language, and mortgage specialty before requesting personal guidance.",
    "/branches": "Explore Snap Mortgage branch coverage, local teams, nearby market guides, and ways to connect with licensed mortgage help.",
    "/learning-center/search": "Search borrower guides, local market updates, loan-program explainers, and mortgage planning articles across the Snap Mortgage learning center.",
    "/loan-options": "Compare purchase, refinance, FHA, VA, conventional, jumbo, cash-out, and home-equity loan paths before reviewing a specific scenario.",
    "/calculators": "Use mortgage calculators to estimate payments, affordability, refinancing, down payments, and rent-versus-buy scenarios with visible assumptions.",
  };
  return descriptions[item.route] || item.metaDescription || item.purpose || "Explore Snap Mortgage guidance and related borrower resources.";
}

function descriptionFor(found, { statesById, productCopyBundle }) {
  const item = found?.item || {};
  const state = lookup(statesById, item.stateId);
  const explicitDescriptions = {
    home: "Compare rates, local markets, loan options, calculators, account save actions, and licensed mortgage guidance.",
    locations: "Compare state and city mortgage guides with local home prices, payment scenarios, inventory, taxes, insurance, loan options, and licensed help.",
    rates: "Review public mortgage-rate benchmarks, APR details, rate-review options, and offer-comparison questions.",
    prequalHandoff: "Start a secure mortgage prequalification path and review your borrowing goals, property plans, and contact details with an available licensed team.",
  };
  if (explicitDescriptions[found?.type]) return explicitDescriptions[found.type];

  if (found?.type === "state") {
    return compact(`${item.name} mortgage planning starts with local price, payment, tax, insurance, and inventory context. ${item.stateNarrative || "Compare market details before reviewing a loan scenario."}`);
  }
  if (found?.type === "city") {
    return compact(`${item.name}, ${state?.abbr || ""} mortgage planning connects local prices, payments, inventory, taxes, insurance, loan options, and licensed help. ${item.marketPositioning || ""}`);
  }
  if (found?.type === "product") {
    return compact(productContentById(productCopyBundle, item.id)?.metaDescription || item.metaDescription || item.borrowerGoal);
  }
  if (found?.type === "loanOfficer") {
    const specialties = readableList(item.specialties || []);
    const states = readableList(item.licensedStates || []);
    return compact(`Meet ${item.name}, ${item.nmls || "a Snap Mortgage loan officer"}, licensed in ${states || "available markets"}${specialties ? ` with a focus on ${specialties}` : ""}.`);
  }
  if (found?.type === "branch") {
    return compact(`Explore ${item.name}, its local mortgage coverage, connected loan officers, market guides, and borrower resources. ${item.coverageNote || ""}`);
  }
  if (found?.type === "calculator") {
    const inputs = readableList((item.captures || []).map(humanize));
    return compact(`Use the ${item.name} to compare ${inputs || "mortgage assumptions"} before reviewing a property and loan scenario with a licensed professional.`);
  }
  if (found?.type === "directory") return compact(directoryDescription(item));

  return compact(
    item.metaDescription ||
    item.dek ||
    item.bio ||
    item.heroSummary ||
    item.marketPositioning ||
    item.stateNarrative ||
    item.purpose ||
    item.borrowerGoal ||
    "Snap Mortgage local mortgage intelligence, calculators, rate details, loan options, experts, and branches.",
  );
}

function articleStructuredData(item, metadata, { contributorsById, siteOrigin }) {
  const contributor = lookup(contributorsById, item.authorId);
  const author = contributor ? {
    "@type": "Person",
    name: contributor.name,
    url: absoluteUrl(siteOrigin, contributor.route),
    ...(contributor.portrait?.src ? { image: absoluteUrl(siteOrigin, contributor.portrait.src) } : {}),
  } : SNAP_MORTGAGE_PUBLISHER;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: metadata.description,
    ...(item.publishedAt ? { datePublished: item.publishedAt } : {}),
    ...(item.updatedAt || item.publishedAt ? { dateModified: item.updatedAt || item.publishedAt } : {}),
    mainEntityOfPage: metadata.canonical,
    ...(metadata.openGraph.image ? { image: metadata.openGraph.image } : {}),
    author,
    publisher: SNAP_MORTGAGE_PUBLISHER,
  };
}

export function resolveDocumentMetadata(found, {
  path = found?.item?.route || "/",
  siteOrigin = DEFAULT_SITE_ORIGIN,
  statesById = {},
  productCopyBundle = { products: [] },
  mediaById = {},
  contributorsById = {},
} = {}) {
  const item = found?.item || {};
  const route = canonicalPath(path);
  const canonical = absoluteUrl(siteOrigin, route);
  const title = titleFor(found, statesById);
  const description = descriptionFor(found, { statesById, productCopyBundle });
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
  const metadata = { title, description, canonical, openGraph, twitter, jsonLd: null };
  if (["article", "newsArticle"].includes(found?.type)) {
    metadata.jsonLd = articleStructuredData(item, metadata, { contributorsById, siteOrigin });
  }
  return metadata;
}

function setAttribute(documentLike, selector, name, value) {
  documentLike.querySelector(selector)?.setAttribute(name, value || "");
}

export function applyDocumentMetadata(documentLike, metadata) {
  documentLike.title = metadata.title;
  setAttribute(documentLike, 'meta[name="description"]', "content", metadata.description);
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

import {
  CONTRIBUTOR_DISCLOSURE,
  applyArticleAuthorIds,
  buildContributorArticleIndex,
  mergeEditorialArticles,
  normalizeEditorialContent,
  renderContributorArchiveMarkup,
  renderContributorBylineMarkup,
} from "./editorial-content.mjs";
import { renderProductionArticle, renderProductionTopicHub } from "./editorial-renderer.mjs";
import { DEFAULT_SITE_ORIGIN, resolveDocumentMetadata } from "./document-metadata.mjs";
import { productContentById } from "./product-content.mjs";
import { createPublicRouteManifest } from "./public-route-manifest.mjs";
import { renderContentFreshness } from "./content-freshness.mjs";
import {
  groupSearchResults,
  searchRecords as findSearchRecords,
} from "./tag-query.mjs";
import {
  normalizeTagRegistry,
  tagForId,
  tagRoute,
  tagsForRoute,
} from "./tag-registry.mjs";
import {
  renderAdditionalTagLinks,
  renderPrimaryTagLinks,
  renderSearchResultCard,
} from "./tag-presentation.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapById(items = []) {
  return new Map(items.filter((item) => item?.id).map((item) => [item.id, item]));
}

function recordsForIds(ids, itemMap, recordsByRoute) {
  return (ids || [])
    .map((id) => itemMap.get(id))
    .map((item) => item && recordsByRoute.get(item.route))
    .filter(Boolean);
}

function itemForEntry(entry, maps) {
  const typeMaps = {
    home: maps.siteEntryPages,
    locations: maps.directories,
    state: maps.states,
    city: maps.cities,
    branch: maps.branches,
    loanOfficer: maps.loanOfficers,
    product: maps.products,
    rates: maps.ratesPages,
    blog: maps.blogPages,
    article: maps.articles,
    calculator: maps.calculators,
    directory: maps.directories,
    contributor: maps.contributors,
    tag: maps.tags,
  };
  if (entry.type === "prequalHandoff") return { id: entry.itemId, route: entry.route };
  return typeMaps[entry.type]?.get(entry.itemId) || null;
}

const LOCATION_NEWS_ROUTE_PATTERN = /^\/learning-center\/market-news\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function indexLocationNews(articles, maps) {
  const byLocation = new Map();
  if (!articles.length) return byLocation;
  const seenIds = new Set();
  const seenRoutes = new Set();

  for (const article of articles) {
    const routeMatch = String(article?.route || "").match(LOCATION_NEWS_ROUTE_PATTERN);
    if (!article?.id || seenIds.has(article.id)) throw new Error(`Location news requires a unique ID: ${article?.id || "missing"}`);
    if (!routeMatch || seenRoutes.has(article.route)) throw new Error(`Location news requires a unique canonical route: ${article?.route || "missing"}`);
    const expectedStandalonePath = `site/generated/learning-center/market-news/${routeMatch[1]}.html`;
    if (article.standalonePath !== expectedStandalonePath) throw new Error(`Location news route has no matching static target: ${article.route}`);
    if (!maps.states.has(article.locationId) && !maps.cities.has(article.locationId)) throw new Error(`Location news references an unknown location: ${article.locationId}`);
    if (!maps.media.has(article.imageId)) throw new Error(`Location news references missing media: ${article.imageId}`);
    if (!maps.contributors.has(article.authorId)) throw new Error(`Location news references an unknown contributor: ${article.authorId}`);

    seenIds.add(article.id);
    seenRoutes.add(article.route);
    const locationArticles = byLocation.get(article.locationId) || [];
    locationArticles.push(article);
    byLocation.set(article.locationId, locationArticles);
  }

  for (const location of [...maps.states.values(), ...maps.cities.values()]) {
    if ((byLocation.get(location.id) || []).length !== 4) {
      throw new Error(`Location news requires four articles for ${location.id}`);
    }
  }
  return byLocation;
}

export function createStaticRouteContext({
  seed = {},
  editorialBundle = {},
  productCopyBundle = { products: [] },
  locationNewsIndex = { articles: [] },
  mediaManifest = { media: [] },
  ratesMarketplaceFixture = {},
  tagRegistry = { tags: [], assignments: [] },
  searchIndex = { records: [] },
} = {}) {
  const editorialContent = normalizeEditorialContent(editorialBundle);
  const articles = applyArticleAuthorIds(
    editorialContent,
    mergeEditorialArticles(seed.articles || [], editorialBundle),
  );
  const data = { ...seed, articles };
  const normalizedTagRegistry = normalizeTagRegistry(tagRegistry);
  const indexedSearchRecords = Array.isArray(searchIndex.records) ? searchIndex.records : [];
  const manifest = createPublicRouteManifest({ seed: data, editorialContent, tagRegistry });
  const maps = {
    siteEntryPages: mapById(data.siteEntryPages),
    states: mapById(data.states),
    cities: mapById(data.cities),
    branches: mapById(data.branches),
    loanOfficers: mapById(data.loanOfficers),
    products: mapById(data.products),
    ratesPages: mapById(data.ratesPages),
    blogPages: mapById(data.blogPages),
    articles: mapById(data.articles),
    calculators: mapById(data.calculators),
    directories: mapById(data.directoryPages),
    contributors: mapById(editorialContent.contributors),
    topicHubs: mapById(editorialContent.topicHubs),
    media: mapById(mediaManifest.media || mediaManifest.assets || []),
    tags: mapById(normalizedTagRegistry.tags),
  };
  const locationNewsArticles = Array.isArray(locationNewsIndex.articles) ? locationNewsIndex.articles : [];
  const locationNewsByLocation = indexLocationNews(locationNewsArticles, maps);
  const contributorArticles = buildContributorArticleIndex(data.articles, locationNewsArticles);
  const recordsByRoute = new Map();
  const recordsById = new Map();
  for (const entry of manifest) {
    const item = itemForEntry(entry, maps);
    if (!item) throw new Error(`No ${entry.type} item found for ${entry.route} (${entry.itemId})`);
    const record = { entry, found: { type: entry.type, item } };
    recordsByRoute.set(entry.route, record);
    recordsById.set(entry.itemId, record);
  }
  const relatedRoutes = new Map(
    [...recordsByRoute.entries()].map(([route, record]) => [route, {
      ...record.found.item,
      type: record.entry.type,
    }]),
  );
  const publicTopicHubsByRoute = new Map(
    editorialContent.topicHubs
      .filter((hub) => hub.public === true && hub.route)
      .map((hub) => [hub.route, hub]),
  );
  const searchRecordsByRoute = new Map(indexedSearchRecords.map((searchRecord) => [searchRecord.route, searchRecord]));
  const tagRedirects = [];
  const redirectRoutes = new Set(manifest.map(({ route }) => route));
  for (const tag of normalizedTagRegistry.tags) {
    for (const slug of Array.isArray(tag.redirectSlugs) ? tag.redirectSlugs : []) {
      const normalizedSlug = String(slug || "").trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
        throw new Error(`Invalid historical tag slug: ${slug || "<empty>"}`);
      }
      const route = `/learning-center/tags/${normalizedSlug}`;
      if (redirectRoutes.has(route)) throw new Error(`Duplicate canonical or historical tag route: ${route}`);
      redirectRoutes.add(route);
      tagRedirects.push({ type: "tagRedirect", route, canonicalRoute: tagRoute(tag), tag });
    }
  }

  const context = {
    manifest,
    data,
    maps,
    editorialContent,
    productCopyBundle,
    ratesMarketplaceFixture,
    recordsByRoute,
    recordsById,
    relatedRoutes,
    publicTopicHubsByRoute,
    locationNewsArticles,
    locationNewsByLocation,
    contributorArticles,
    tagRegistry: normalizedTagRegistry,
    searchIndex,
    searchRecords: indexedSearchRecords,
    searchRecordsByRoute,
    tagRedirects,
    tagContextForRoute(route) {
      return tagsForRoute(normalizedTagRegistry, route);
    },
    metadataFor(record, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
      const metadata = resolveDocumentMetadata(record.found, {
        path: record.entry.route,
        siteOrigin,
        statesById: maps.states,
        productCopyBundle,
        mediaById: maps.media,
        contributorsById: maps.contributors,
        tagRegistry: normalizedTagRegistry,
        searchRecords: indexedSearchRecords,
        searchIndex,
        tagContext: tagsForRoute(normalizedTagRegistry, record.entry.route),
      });
      return record.entry.type === "tag"
        ? composeTagDocumentMetadata(metadata, record.found.item)
        : metadata;
    },
  };
  return context;
}

function pageIntro(eyebrow, title, lead, paragraphs = [], { tagContext, routeHref = (href) => href } = {}) {
  return `
    <section class="section static-route-intro">
      <div class="content-layout"><div class="main-stack">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        ${renderPrimaryTagLinks(tagContext?.primaryTags, routeHref)}
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(lead)}</p>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </div></div>
    </section>`;
}

const TAG_FAMILY_LABELS = Object.freeze({
  articles: "Articles and education",
  "topic-guides": "Topic guides",
  "local-market-news": "Local market news",
  "product-guides": "Mortgage product guides",
  calculators: "Calculators and tools",
});

const BORROWER_GOAL_RESOURCE_TITLES = Object.freeze({
  "buy-a-home": "Homebuying mortgage resources",
  "high-cost-home-financing": "High-cost home financing resources",
  "lower-down-payment-purchase": "Lower down payment homebuying resources",
  "military-or-veteran-home-financing": "Military and veteran home financing resources",
  "refinance-a-mortgage": "Mortgage refinance resources",
  "refinance-and-access-equity": "Refinance and home equity resources",
  "rent-vs-buy": "Rent vs. buy mortgage resources",
  "standard-purchase-or-refinance": "Purchase and refinance mortgage resources",
  "use-available-home-equity": "Home equity resources",
});

export function composeTagResourceTitle(tag) {
  const displayName = String(tag?.displayName || "").trim();
  if (!displayName) return "Mortgage resources";
  const borrowerGoalTitle = BORROWER_GOAL_RESOURCE_TITLES[tag.slug];
  if (borrowerGoalTitle) return borrowerGoalTitle;
  if (/\sLoans$/i.test(displayName)) return `${displayName.replace(/\sLoans$/i, "")} loan resources`;
  if (/\b(?:financing|mortgage)\b/i.test(displayName)) return `${displayName} resources`;
  return `${displayName} mortgage resources`;
}

function renderFeaturedStaticTagResult(record, context, tag) {
  const card = renderSearchResultCard(record, {
    registry: context.tagRegistry,
    matchedTagIds: [tag.id],
  });
  return card.replace(
    /<article\b/,
    `<article data-static-tag-result-route="${escapeHtml(record.route)}"`,
  );
}

function renderStaticTagOverflow(records, family) {
  if (!records.length) return "";
  const label = TAG_FAMILY_LABELS[family].toLowerCase();
  return `
    <details class="static-tag-result-overflow" data-static-tag-overflow>
      <summary>Browse ${records.length} more ${label}</summary>
      <ul>${records.map((record) => `
        <li data-static-tag-result-route="${escapeHtml(record.route)}"><a href="${escapeHtml(record.route)}">${escapeHtml(record.title)}</a></li>`).join("")}
      </ul>
    </details>`;
}

function displayDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${label} requires a factual YYYY-MM-DD review date`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`${label} has an invalid review date: ${value}`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function renderTagRelatedLinks(tag, context) {
  const relatedTags = (tag.relatedTagIds || [])
    .map((id) => tagForId(context.tagRegistry, id))
    .filter(Boolean);
  if (!relatedTags.length) return "";
  return `
    <section class="section compact static-tag-related" aria-labelledby="tag-related-title">
      <div class="content-layout"><div class="main-stack">
        <h2 id="tag-related-title">Related topics</h2>
        <ul>${relatedTags.map((relatedTag) => `<li><a data-related-tag href="${escapeHtml(tagRoute(relatedTag))}">${escapeHtml(relatedTag.displayName)}</a></li>`).join("")}</ul>
      </div></div>
    </section>`;
}

function renderTag(record, context) {
  const tag = record.found.item;
  const resourceTitle = composeTagResourceTitle(tag);
  const matches = findSearchRecords(context.searchRecords, {
    tagIds: [tag.id],
    operators: [],
    query: "",
  }, context.tagRegistry);
  const groups = groupSearchResults(matches);

  return `
    <div class="static-tag-page" data-static-tag-page data-tag-search-root data-selected-tag-id="${escapeHtml(tag.id)}">
      <nav class="section compact static-tag-breadcrumb" aria-label="Breadcrumb">
        <div class="content-layout"><ol><li><a href="/learning-center">Learning Center</a></li><li aria-current="page">${escapeHtml(tag.displayName)}</li></ol></div>
      </nav>
      <section class="section static-route-intro">
        <div class="content-layout"><div class="main-stack">
          <p class="eyebrow">Learning Center topic</p>
          <h1>${escapeHtml(resourceTitle)}</h1>
          <p class="lead">${escapeHtml(tag.description)}</p>
          <p class="content-freshness" data-content-freshness data-freshness-basis="tag-reviewed-at" data-tag-last-updated><span>Last updated</span> <time datetime="${escapeHtml(tag.reviewedAt)}">${escapeHtml(displayDate(tag.reviewedAt, tag.displayName))}</time>. <small class="content-freshness-note">Topic relationships and included resources reviewed through this date.</small></p>
        </div></div>
      </section>
      ${renderTagRelatedLinks(tag, context)}
      ${groups.map(({ family, records }) => `
        <section class="section compact static-tag-results" data-tag-result-family="${escapeHtml(family)}" data-result-count="${records.length}">
          <div class="content-layout"><div class="main-stack">
            <h2>${escapeHtml(TAG_FAMILY_LABELS[family])}</h2>
            <p>${records.length} ${records.length === 1 ? "resource" : "resources"}</p>
            <div class="grid three">${records.slice(0, 20).map((searchRecord) => renderFeaturedStaticTagResult(searchRecord, context, tag)).join("")}</div>
            ${renderStaticTagOverflow(records.slice(20), family)}
          </div></div>
        </section>`).join("")}
    </div>`;
}

function recordLabel(record) {
  if (!record) return "Mortgage resource";
  if (record.entry.route === "/") return "Snap Mortgage home";
  if (record.entry.route === "/prequal/start") return "Review prequalification";
  return record.found.item.name || record.found.item.title || record.found.item.displayName || "Mortgage resource";
}

function recordDescription(record) {
  const item = record?.found?.item || {};
  const route = record?.entry?.route;
  if (record?.entry?.type === "calculator") {
    return `Compare ${humanList((item.captures || []).map(humanize)) || "mortgage assumptions"}.`;
  }
  if (record?.entry?.type === "loanOfficer") {
    return `${item.name} appears on a name-only profile with neutral mortgage education and notice-only actions.`;
  }
  if (record?.entry?.type === "branch") {
    return `${item.name} appears on a name-only branch entry with neutral mortgage education and notice-only actions.`;
  }
  if (record?.entry?.type === "rates") {
    return "Compare rate, APR, points, payment assumptions, fees, and borrowing costs.";
  }
  if (route === "/learning-center") {
    return "Explore mortgage guides, market analysis, loan-program explainers, calculators, and local insights.";
  }
  if (route === "/loan-officers") {
    return "Browse Snap Mortgage loan officer names, then confirm identity, licensing, and availability before choosing whom to contact.";
  }
  return item.metaDescription || item.description || item.dek || item.shortBio || item.coverageNote || item.marketPositioning || item.stateNarrative || item.borrowerGoal || "Review mortgage guidance, comparison tools, and next steps for your financing goals.";
}

function linkedCards(title, records, { limit = 24 } = {}) {
  const unique = [];
  const seen = new Set();
  for (const record of records || []) {
    if (!record || seen.has(record.entry.route)) continue;
    seen.add(record.entry.route);
    unique.push(record);
  }
  if (!unique.length) return "";
  return `
    <section class="section compact static-route-links">
      <div class="content-layout"><div class="main-stack">
        <h2>${escapeHtml(title)}</h2>
        <div class="grid three">
          ${unique.slice(0, limit).map((record) => `
            <article>
              <h3><a href="${escapeHtml(record.entry.route)}">${escapeHtml(recordLabel(record))}</a></h3>
              <p>${escapeHtml(recordDescription(record))}</p>
            </article>`).join("")}
        </div>
      </div></div>
    </section>`;
}

function humanize(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function humanList(values = []) {
  const items = values.filter(Boolean);
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function completeSentence(value, fallback) {
  const sentence = String(value || fallback || "").trim();
  if (!sentence) return "";
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function formatDaysOnMarket(value) {
  const label = String(value || "").trim();
  if (!label) return "not available";
  return /^\d+(?:\.\d+)?$/.test(label) ? `${label} days` : label;
}

function locationSnapshotAssumptionNotice() {
  return `
    <aside class="section compact planning-assumption" data-location-snapshot-assumption>
      <div class="content-layout"><div class="main-stack">
        <h2>Check current local costs before you decide</h2>
        <p>The prices, payments, inventory, property taxes, insurance costs, and time-on-market figures shown here are examples for exploring how a mortgage may fit your budget. They are not current market facts, a rate quote, or property-specific costs. Confirm today's figures for the location and property you are considering before choosing a loan or making an offer.</p>
      </div></div>
    </aside>`;
}

function snapshotList(entries) {
  return `
    <dl class="stats-grid">
      ${entries.filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>`;
}

function staticLocationNewsCard(article, context) {
  const media = context.maps.media.get(article.imageId);
  const imageUrl = media?.localPath || media?.imageUrl;
  return `
    <article class="news-card static-location-news-card" data-static-location-news-card>
      <a class="news-card-media" href="${escapeHtml(article.route)}">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(media.alt || "")}" loading="lazy" decoding="async" />
        <span class="news-card-topic">${escapeHtml(article.relevanceLabel || "Local update")}</span>
      </a>
      <div class="news-card-body">
        ${renderContributorBylineMarkup(article, context.editorialContent.contributors, { compact: true })}
        <h3><a href="${escapeHtml(article.route)}">${escapeHtml(article.title)}</a></h3>
        <p>${escapeHtml(article.previewText || article.dek)}</p>
        <a class="text-link" href="${escapeHtml(article.route)}">Read more</a>
      </div>
    </article>`;
}

function renderStaticLocationNews(location, context) {
  const articles = context.locationNewsByLocation.get(location.id) || [];
  if (!articles.length) return "";
  const title = location.id.startsWith("state-")
    ? `Latest ${location.name} mortgage and housing updates`
    : `Latest ${location.name} market updates`;
  return `
    <section class="section compact static-location-news" data-static-location-news>
      <div class="content-layout"><div class="main-stack">
        <p class="eyebrow">Local reporting</p>
        <h2>${escapeHtml(title)}</h2>
        <div class="grid four">${articles.map((article) => staticLocationNewsCard(article, context)).join("")}</div>
      </div></div>
    </section>`;
}

function renderLocations(record, context) {
  const stateRecords = context.data.states.map((state) => context.recordsByRoute.get(state.route));
  return `${pageIntro(
    "Local mortgage planning",
    "Mortgage guides by location",
    "Compare state and city housing context before turning a broad budget into a property-specific mortgage review.",
    [
      `Browse ${context.data.states.length} state guides and ${context.data.cities.length} city guides with consistent price, payment, inventory, tax, insurance, and loan-option context.`,
      "Treat every snapshot figure as an illustrative planning example. Use dated local reporting and current property information before relying on price, payment, inventory, tax, insurance, or days-on-market values.",
    ],
  )}${linkedCards("Browse state mortgage guides", stateRecords, { limit: stateRecords.length })}`;
}

function renderState(record, context) {
  const state = record.found.item;
  const snapshot = state.marketSnapshot || {};
  const cityRecords = recordsForIds(state.cityIds, context.maps.cities, context.recordsByRoute);
  const productRecords = recordsForIds(state.featuredProductIds, context.maps.products, context.recordsByRoute);
  return `${pageIntro(
    "State mortgage guide",
    `${state.name} mortgage and housing guide`,
    `Compare the cost questions that commonly matter across ${state.name} before narrowing to a city or property.`,
    [
      `For a simple comparison, the examples below use ${snapshot.medianHomePrice || "a home-price"} for price, ${snapshot.paymentScenario || "a monthly amount"} for payment, and ${snapshot.inventory || "an inventory value"} for inventory. They are not current ${state.name} market facts.`,
      `${completeSentence(snapshot.propertyTaxContext, "Property taxes vary by jurisdiction and property")} ${completeSentence(snapshot.insuranceContext, "Insurance needs a property-specific review")} Confirm both for the city, county, and property you are considering.`,
    ],
  )}${renderStaticLocationNews(state, context)}${locationSnapshotAssumptionNotice()}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>${escapeHtml(state.name)} example housing costs</h2>
      ${snapshotList([
        ["Median home price", snapshot.medianHomePrice],
        ["Payment scenario", snapshot.paymentScenario],
        ["Inventory", snapshot.inventory],
        ["Data status", "Illustrative example"],
      ])}
      <p>Use these examples to understand how price, payment, inventory, taxes, and insurance fit together. Check dated market evidence, property records, current insurance information, association charges, and lender-provided terms before relying on a comparison.</p>
    </div></div></section>
    ${linkedCards(`${state.name} city guides`, cityRecords, { limit: cityRecords.length })}
    ${linkedCards("Loan paths to compare", productRecords)}`;
}

function renderCity(record, context) {
  const city = record.found.item;
  const state = context.maps.states.get(city.stateId);
  const snapshot = city.marketSnapshot || {};
  const products = recordsForIds(city.productIds, context.maps.products, context.recordsByRoute);
  const nearby = recordsForIds(city.nearbyCityIds, context.maps.cities, context.recordsByRoute);
  const officers = recordsForIds(city.loanOfficerIds, context.maps.loanOfficers, context.recordsByRoute);
  const branches = recordsForIds(city.branchIds, context.maps.branches, context.recordsByRoute);
  const articles = recordsForIds(city.articleIds, context.maps.articles, context.recordsByRoute);
  return `${pageIntro(
    "Local mortgage market",
    `${city.name}, ${state?.abbr || ""} mortgage market guide`,
    `Compare the housing-cost questions that commonly matter in ${city.name} before reviewing a specific property.`,
    [
      `For a simple comparison, the examples below use ${snapshot.medianHomePrice || "a local home-price"} for price, ${snapshot.paymentScenario || "a monthly amount"} for payment, ${snapshot.inventory || "an inventory value"} for inventory, and ${formatDaysOnMarket(snapshot.daysOnMarket)} for days on market. They are not current ${city.name} market facts.`,
      `For a property in ${city.name}, use current market evidence plus the actual price, down payment, loan terms, tax record, insurance quote, association dues, condition, and closing-cost details. A citywide measure cannot predict one home's value or financing result.`,
    ],
  )}${renderStaticLocationNews(city, context)}${locationSnapshotAssumptionNotice()}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Illustrative local payment and market inputs</h2>
      ${snapshotList([
        ["Median home price", snapshot.medianHomePrice],
        ["Payment scenario", snapshot.paymentScenario],
        ["Inventory", snapshot.inventory],
        ["Property tax", snapshot.taxRate],
        ["Insurance", snapshot.insurance],
        ["Days on market", formatDaysOnMarket(snapshot.daysOnMarket)],
      ])}
      <p>Use these examples to understand the relationship among price, payment, taxes, insurance, mortgage insurance, association dues, and financing terms. Replace each value with current property and loan information before making a decision.</p>
    </div></div></section>
    ${linkedCards(`Loan options to compare in ${city.name}`, products)}
    ${linkedCards("Nearby markets to compare", nearby)}
    ${linkedCards("Loan officers and branch names", [...officers, ...branches])}
    ${linkedCards("Related borrower guidance", articles)}`;
}

function renderProduct(record, context) {
  const product = record.found.item;
  const content = productContentById(context.productCopyBundle, product.id);
  if (!content) throw new Error(`Missing product content for ${product.id}`);
  const calculators = recordsForIds(product.relatedCalculatorIds, context.maps.calculators, context.recordsByRoute);
  const tagContext = context.tagContextForRoute(record.entry.route);
  return `${pageIntro(
    "Loan option guide",
    product.name,
    content.title,
    [
      content.summary,
      `Use this ${product.name} guide to organize the borrower, property, payment, cash, and timing questions that belong in a written comparison. Program availability and terms depend on the complete scenario and lender review.`,
    ],
    { tagContext },
  )}
    ${(content.sections || []).map((section) => `
      <section class="section compact"><div class="content-layout"><div class="main-stack">
        <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
        <h2>${escapeHtml(section.heading)}</h2>
        ${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </div></div></section>`).join("")}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Questions to settle before you choose</h2>
      ${(content.questions || []).map((question) => `<article><h3>${escapeHtml(question.question)}</h3><p>${escapeHtml(question.answer)}</p></article>`).join("")}
    </div></div></section>
    ${renderAdditionalTagLinks(tagContext.additionalTags)}
    ${linkedCards("Calculators for this comparison", calculators)}`;
}

function renderRates(record, context) {
  const rates = record.found.item;
  const disclosure = context.ratesMarketplaceFixture.disclosure || "Mortgage pricing depends on current market, borrower, property, and loan details.";
  const sampleDisclosure = context.ratesMarketplaceFixture.sampleOfferDisclosure || "Exploring a comparison does not submit an application or make a credit decision.";
  return `${pageIntro(
    "Mortgage rates",
    "Compare mortgage rates and borrowing costs",
    "Review rate, APR, points, lender credits, estimated payment, upfront costs, and longer-run borrowing cost together before choosing a mortgage direction.",
    [
      "A lower note rate is not automatically the lower-cost option. Ask what points, credits, fees, lock period, loan type, occupancy, property details, credit assumptions, and cash-to-close inputs produced each written scenario.",
      "Keep taxes, homeowners insurance, mortgage insurance, association dues, and third-party settlement costs visible. Some are not controlled by the lender, but they still affect the amount a household pays or brings to closing.",
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Rate types available for comparison</h2>
      <ul>${(rates.rateTypes || []).map((type) => `<li>${escapeHtml(type)}</li>`).join("")}</ul>
      <p>${escapeHtml(disclosure)}</p>
      <p>${escapeHtml(sampleDisclosure)}</p>
    </div></div></section>
    ${linkedCards("Tools and guides for the next comparison", [
      context.recordsByRoute.get("/calculators/mortgage-payment"),
      context.recordsByRoute.get("/buy"),
      context.recordsByRoute.get("/refinance"),
      context.recordsByRoute.get("/loan-officers"),
    ])}`;
}

function renderLearningHome(record, context) {
  const topics = context.data.blogPages
    .filter((page) => page.route !== record.entry.route)
    .map((page) => context.recordsByRoute.get(page.route));
  const articles = context.data.articles.slice(0, 12).map((article) => context.recordsByRoute.get(article.route));
  const contributors = context.editorialContent.contributors.map((contributor) => context.recordsByRoute.get(contributor.route));
  return `${pageIntro(
    "Borrower education",
    "Mortgage learning center",
    "Read mortgage guidance organized around buying, refinancing, equity, loan programs, local markets, rates, taxes, insurance, and evidence-based decision questions.",
    [
      "Start with the decision you are making, then compare the same borrower and property facts across products, calculators, market guides, and written loan scenarios. Dates and source context matter whenever a rule, limit, price, rate, or local cost can change.",
      "Educational material can help you prepare questions, but it cannot determine eligibility, property acceptability, available terms, or the right choice for a household. Bring current documents and property details into a licensed review when you are ready.",
    ],
  )}${linkedCards("Explore learning topics", topics)}${linkedCards("Featured mortgage articles", articles)}${linkedCards("Meet the editorial contributors", contributors)}`;
}

function renderBlog(record, context) {
  if (record.entry.route === "/learning-center") return renderLearningHome(record, context);
  const hub = context.publicTopicHubsByRoute.get(record.entry.route);
  const tagContext = context.tagContextForRoute(record.entry.route);
  if (!hub) {
    return `${pageIntro(
      "Mortgage learning topic",
      record.found.item.name,
      record.found.item.metaDescription || "Review related borrower guidance and practical comparison questions.",
      ["Use dated sources, visible assumptions, and property-specific details before applying broad mortgage education to a personal decision."],
      { tagContext },
    )}${renderAdditionalTagLinks(tagContext.additionalTags)}`;
  }
  return renderProductionTopicHub(hub, {
    articlesById: context.maps.articles,
    contributors: context.editorialContent.contributors,
    sources: context.editorialContent.sources,
    route: (href) => href,
    tagContext,
    linkResolver: (id) => {
      const linked = context.recordsById.get(id);
      return linked ? { kind: linked.entry.type, item: linked.found.item } : null;
    },
  });
}

function renderArticle(record, context) {
  return renderProductionArticle(record.found.item, {
    contributors: context.editorialContent.contributors,
    sources: context.editorialContent.sources,
    relatedRoutes: context.relatedRoutes,
    route: (href) => href,
    tagContext: context.tagContextForRoute(record.entry.route),
  })
    .replace(/(<button\b[^>]*data-cta-action="leadForm"[^>]*>)[^<]*(<\/button>)/g, "$1Review guidance options$2")
    .replace("bring borrower and property details into a licensed conversation.", "bring borrower and property details to a lender for verification.");
}

function staticContributorArticleCard(article, context) {
  const media = context.maps.media.get(article.imageId);
  const imageUrl = media?.localPath || media?.imageUrl;
  const preview = article.previewText || article.summary || article.dek || "Review the evidence, assumptions, and borrower questions in this mortgage guide.";
  const typeLabel = humanize(article.articleType || article.type || "Mortgage guide");
  return `
    <article class="static-contributor-article">
      ${imageUrl ? `<a href="${escapeHtml(article.route)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(media.alt || "")}" loading="lazy" decoding="async" /></a>` : ""}
      <p class="eyebrow">${escapeHtml(typeLabel)}</p>
      <h3><a href="${escapeHtml(article.route)}">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(preview)}</p>
      ${renderContributorBylineMarkup(article, context.editorialContent.contributors, { compact: true })}
      <a class="text-link" href="${escapeHtml(article.route)}">Read more</a>
    </article>`;
}

function renderContributor(record, context) {
  const contributor = record.found.item;
  const archive = renderContributorArchiveMarkup(
    context.editorialContent,
    context.contributorArticles,
    contributor,
    (article) => staticContributorArticleCard(article, context),
    { limit: 12, showCount: true },
  );
  return `${pageIntro(
    contributor.title,
    contributor.name,
    contributor.shortBio || contributor.bio,
    [
      contributor.bio,
      `${contributor.name}'s coverage includes ${humanList(contributor.topics || [])}. ${CONTRIBUTOR_DISCLOSURE}`,
      "Contributor material is educational and does not replace a lender's review of a borrower's finances, property, eligibility, or available terms.",
    ],
  )}
    <section class="section compact static-contributor-archive"><div class="content-layout"><div class="main-stack">
      <h2>Articles by ${escapeHtml(contributor.name)}</h2>
      ${archive}
    </div></div></section>`;
}

function renderLoanOfficer(record, context) {
  const officer = record.found.item;
  const branch = context.maps.branches.get(officer.branchId);
  const cities = recordsForIds(branch?.cityIds, context.maps.cities, context.recordsByRoute);
  const branchRecord = branch && context.recordsByRoute.get(branch.route);
  return `${pageIntro(
    "Name-only profile",
    officer.name,
    `${officer.name} appears by name with neutral mortgage education. This profile does not establish identity, credentials, state authorization, specialties, languages, availability, branch association, or direct-contact details.`,
    [
      "Use the related market and mortgage education below to prepare questions without treating the name or links as proof of a professional relationship.",
      "Contact and prequalification controls open notices only. They send no message, submit no information, and collect no borrower financial details.",
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Before you continue</h2>
      <p>Keep your mortgage goal, property location, expected timing, down-payment or equity plan, and payment questions together. Any later prequalification, rate, fee, eligibility, or product discussion depends on the information reviewed in that separate experience.</p>
    </div></div></section>
    ${linkedCards("Related education links", [...cities, branchRecord])}`;
}

function renderBranch(record, context) {
  const branch = record.found.item;
  const cities = recordsForIds(branch.cityIds, context.maps.cities, context.recordsByRoute);
  const officers = recordsForIds(branch.loanOfficerIds, context.maps.loanOfficers, context.recordsByRoute);
  return `${pageIntro(
    "Name-only branch entry",
    branch.name,
    `${branch.name} appears by name with neutral mortgage education. This entry does not establish a location, operating footprint, team relationship, credentials, availability, or direct-contact details.`,
    [
      "Review the related market guides and profile names below as neutral education links without treating them as proof of operations or association.",
      "Contact controls open notices only. They send no message and submit no information. Rates, fees, eligibility, approval, and closing timing depend on a separate lender review of the borrower, property, and requested loan scenario.",
    ],
  )}${linkedCards("Related market guides", cities)}${linkedCards("Related profile names", officers)}`;
}

function renderCalculator(record, context) {
  const calculator = record.found.item;
  const inputs = (calculator.captures || []).map(humanize);
  const tagContext = context.tagContextForRoute(record.entry.route);
  const peers = context.data.calculators
    .filter((item) => item.id !== calculator.id)
    .map((item) => context.recordsByRoute.get(item.route));
  return `${pageIntro(
    "Mortgage calculator",
    calculator.name,
    `Use ${humanList(inputs)} to build an educational planning scenario before comparing written loan terms.`,
    [
      "Change one assumption at a time and keep taxes, insurance, mortgage insurance, association dues, closing costs, and the expected ownership timeline visible. The result is not an approval, rate quote, appraisal, or commitment to lend.",
      "When a real property and borrower file are available, replace broad estimates with current records and reviewed terms. Ask which inputs came from you, which came from a public source, and which still need verification by a lender or other qualified professional.",
    ],
    { tagContext },
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Inputs used by this calculator</h2>
      <ul>${inputs.map((input) => `<li>${escapeHtml(input)}</li>`).join("")}</ul>
      <p>Keep the saved assumptions with any later rate or loan-option comparison so differences in payment and cash estimates can be explained.</p>
    </div></div></section>
    ${renderAdditionalTagLinks(tagContext.additionalTags)}
    ${linkedCards("Other mortgage calculators", peers)}`;
}

function renderDirectory(record, context) {
  const route = record.entry.route;
  const configurations = {
    "/loan-officers": {
      eyebrow: "Name-only profiles",
      title: "Loan officers",
      lead: "Browse names and neutral mortgage education links. The directory does not publish or verify identifiers, state authorization, qualifications, languages, specialties, market coverage, availability, or direct-contact details.",
      records: context.data.loanOfficers.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Loan officer profiles",
    },
    "/branches": {
      eyebrow: "Name-only entries",
      title: "Branches",
      lead: "Browse branch names and neutral mortgage education links. The directory does not establish locations, operations, regulatory details, team relationships, availability, or direct-contact details.",
      records: context.data.branches.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Branch locations",
    },
    "/calculators": {
      eyebrow: "Planning tools",
      title: "Mortgage calculators",
      lead: "Estimate payments, affordability, refinancing, down payments, and rent-versus-buy scenarios with visible inputs and limitations.",
      records: context.data.calculators.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Choose a calculator",
    },
    "/loan-options": {
      eyebrow: "Loan comparison",
      title: "Compare mortgage loan options",
      lead: "Review purchase, refinance, FHA, VA, conventional, jumbo, cash-out, and home-equity paths before choosing a direction.",
      records: context.data.products.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Mortgage product guides",
    },
    "/learning-center/search": {
      eyebrow: "Learning center",
      title: "Search mortgage learning resources",
      lead: "Browse borrower guides, local market analysis, loan-program explainers, and evidence-based mortgage planning articles.",
      records: [
        ...context.data.blogPages.map((item) => context.recordsByRoute.get(item.route)),
        ...context.data.articles.map((item) => context.recordsByRoute.get(item.route)),
        ...context.editorialContent.contributors.map((item) => context.recordsByRoute.get(item.route)),
      ],
      sectionTitle: "Mortgage learning resources",
    },
  };
  const config = configurations[route];
  if (!config) throw new Error(`Unsupported directory route ${route}`);
  return `${pageIntro(
    config.eyebrow,
    config.title,
    config.lead,
    [
      "Open a result to see its full context and related resources. Compare dates, assumptions, location, product fit, and the facts that still need borrower- or property-specific review.",
      "Directory order and educational content do not promise eligibility, approval, terms, availability, or a particular outcome. Use the public information to prepare a more focused next conversation.",
    ],
  )}${linkedCards(config.sectionTitle, config.records, { limit: config.records.length })}`;
}

function renderPrequal() {
  return `${pageIntro(
    "Continue your comparison",
    "Review mortgage prequalification",
    "Choose an illustrative option on the rates page, then continue with that selection and the visible assumptions you entered. No name, email, phone number, documents, or financial account details are requested on the public comparison page.",
    [
      "Opening this address does not submit an application, send a contact request, authorize a credit check, upload a document, or make a credit decision. When you continue from a selected result, the next experience can identify the option and summarize the comparison assumptions.",
      "Prequalification is an early review based on information you provide later. It is not an approval, commitment to lend, verified property valuation, rate lock, or guarantee of available terms.",
      "You can return to rate comparisons, loan-option guides, calculators, or loan officer profiles before continuing. Those resources remain educational until borrower and property details are reviewed in the separate prequalification experience.",
    ],
  )}`;
}

function renderRouteBody(record, context) {
  const renderers = {
    locations: renderLocations,
    state: renderState,
    city: renderCity,
    product: renderProduct,
    rates: renderRates,
    blog: renderBlog,
    article: renderArticle,
    contributor: renderContributor,
    loanOfficer: renderLoanOfficer,
    branch: renderBranch,
    calculator: renderCalculator,
    directory: renderDirectory,
    prequalHandoff: renderPrequal,
    tag: renderTag,
  };
  const renderer = renderers[record.entry.type];
  if (!renderer) throw new Error(`Static rendering is not available for ${record.entry.type}`);
  return renderer(record, context);
}

function relatedRecords(record, context) {
  const item = record.found.item;
  const candidates = [];
  const add = (...records) => candidates.push(...records.filter(Boolean));
  const addIds = (ids, map) => add(...recordsForIds(ids, map, context.recordsByRoute));

  if (record.entry.type === "city") {
    add(context.recordsByRoute.get(context.maps.states.get(item.stateId)?.route));
    addIds(item.productIds, context.maps.products);
    addIds(item.loanOfficerIds, context.maps.loanOfficers);
  } else if (record.entry.type === "state") {
    add(context.recordsByRoute.get("/locations"));
    addIds(item.cityIds, context.maps.cities);
    addIds(item.featuredProductIds, context.maps.products);
  } else if (record.entry.type === "product") {
    add(context.recordsByRoute.get("/loan-options"));
    addIds(item.relatedCalculatorIds, context.maps.calculators);
  } else if (record.entry.type === "loanOfficer") {
    add(context.recordsByRoute.get("/loan-officers"));
    add(context.recordsByRoute.get(context.maps.branches.get(item.branchId)?.route));
    addIds(item.priorityCityIds, context.maps.cities);
  } else if (record.entry.type === "branch") {
    add(context.recordsByRoute.get("/branches"));
    addIds(item.cityIds, context.maps.cities);
    addIds(item.loanOfficerIds, context.maps.loanOfficers);
  } else if (record.entry.type === "calculator") {
    add(context.recordsByRoute.get("/calculators"));
    add(...context.data.products.slice(0, 3).map((product) => context.recordsByRoute.get(product.route)));
  } else if (["blog", "article", "contributor"].includes(record.entry.type)) {
    add(context.recordsByRoute.get("/learning-center"));
    for (const route of item.relatedRoutes || []) add(context.recordsByRoute.get(route));
    if (item.authorId) add(context.recordsByRoute.get(context.maps.contributors.get(item.authorId)?.route));
  } else if (record.entry.type === "tag") {
    for (const tagId of item.relatedTagIds || []) {
      add(context.recordsByRoute.get(tagRoute(context.maps.tags.get(tagId))));
    }
    add(context.recordsByRoute.get("/learning-center/search"));
  }
  add(
    context.recordsByRoute.get("/locations"),
    context.recordsByRoute.get("/rates"),
    context.recordsByRoute.get("/loan-options"),
    context.recordsByRoute.get("/calculators/mortgage-payment"),
    context.recordsByRoute.get("/learning-center"),
    context.recordsByRoute.get("/loan-officers"),
  );

  const unique = [];
  const seen = new Set([record.entry.route]);
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate.entry.route)) continue;
    seen.add(candidate.entry.route);
    unique.push(candidate);
    if (unique.length === 6) break;
  }
  return unique;
}

function renderRelatedNavigation(record, context) {
  const related = relatedRecords(record, context);
  return `
    <nav class="section compact static-related-navigation" aria-label="Related mortgage pages" data-static-related-links>
      <div class="content-layout"><div class="main-stack">
        <h2>Related mortgage resources</h2>
        <ul>${related.map((candidate) => `<li><a href="${escapeHtml(candidate.entry.route)}">${escapeHtml(recordLabel(candidate))}</a></li>`).join("")}</ul>
      </div></div>
    </nav>`;
}

function jsonForScript(value) {
  return value ? JSON.stringify(value).replace(/</g, "\\u003c") : "";
}

function composeTagJsonLd(value, resourceTitle) {
  if (Array.isArray(value)) return value.map((item) => composeTagJsonLd(item, resourceTitle));
  if (!value || typeof value !== "object") return value;
  const composed = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, composeTagJsonLd(item, resourceTitle)]),
  );
  if (["CollectionPage", "ItemList"].includes(value["@type"])) composed.name = resourceTitle;
  return composed;
}

function composeTagDocumentMetadata(metadata, tag) {
  const resourceTitle = composeTagResourceTitle(tag);
  const title = `${resourceTitle} | Snap Mortgage`;
  return {
    ...metadata,
    title,
    openGraph: { ...metadata.openGraph, title },
    twitter: { ...metadata.twitter, title },
    jsonLd: composeTagJsonLd(metadata.jsonLd, resourceTitle),
  };
}

function renderHead(metadata) {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(metadata.title)}</title>
  <meta name="description" content="${escapeHtml(metadata.description)}" />
  ${metadata.robots ? `<meta name="robots" content="${escapeHtml(metadata.robots)}" />` : ""}
  <link rel="canonical" href="${escapeHtml(metadata.canonical)}" />
  <meta property="og:type" content="${escapeHtml(metadata.openGraph.type)}" />
  <meta property="og:title" content="${escapeHtml(metadata.openGraph.title)}" />
  <meta property="og:description" content="${escapeHtml(metadata.openGraph.description)}" />
  <meta property="og:url" content="${escapeHtml(metadata.openGraph.url)}" />
  <meta property="og:image" content="${escapeHtml(metadata.openGraph.image)}" />
  <meta name="twitter:card" content="${escapeHtml(metadata.twitter.card)}" />
  <meta name="twitter:title" content="${escapeHtml(metadata.twitter.title)}" />
  <meta name="twitter:description" content="${escapeHtml(metadata.twitter.description)}" />
  <meta name="twitter:image" content="${escapeHtml(metadata.twitter.image)}" />
  <script type="application/ld+json" data-document-jsonld>${jsonForScript(metadata.jsonLd)}</script>
  <link rel="stylesheet" href="/site/styles.css" />
</head>`;
}

export function renderStaticRouteRedirectDocument(redirect, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
  const route = String(redirect?.route || "");
  const canonicalRoute = String(redirect?.canonicalRoute || redirect?.tag?.canonicalRoute || "");
  if (!/^\/learning-center\/tags\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)) {
    throw new Error(`A canonical historical tag route is required: ${route || "<empty>"}`);
  }
  if (!/^\/learning-center\/tags\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(canonicalRoute) || route === canonicalRoute) {
    throw new Error(`A distinct canonical tag destination is required: ${canonicalRoute || "<empty>"}`);
  }

  const canonical = new URL(canonicalRoute, siteOrigin).toString();
  const label = redirect?.tag?.displayName || "Mortgage topic";
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(label)} topic moved | Snap Mortgage</title>
  <meta name="robots" content="noindex,follow" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(canonicalRoute)}" />
</head><body>
  <main><h1>${escapeHtml(label)} resources have moved</h1><p><a href="${escapeHtml(canonicalRoute)}">Continue to ${escapeHtml(label)} mortgage resources</a>.</p></main>
  <script>window.location.replace(${jsonForScript(canonicalRoute)});</script>
</body></html>`;
}

function publicFreshnessRecord(found) {
  if (!found || !["state", "city"].includes(found.type)) return found;
  return {
    ...found,
    item: {
      ...found.item,
      marketSnapshot: {
        ...(found.item?.marketSnapshot || {}),
        lastUpdated: "",
        governingEvidence: undefined,
      },
      snapshotEvidence: undefined,
    },
  };
}

export function renderStaticRouteDocument(record, context, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
  if (!record?.entry || !record?.found) throw new Error("A static route record is required");
  if (record.entry.route === "/") throw new Error("The root document is owned by the homepage workstream");
  const resolvedMetadata = context.metadataFor(record, { siteOrigin });
  const metadata = record.entry.type === "tag"
    ? composeTagDocumentMetadata(resolvedMetadata, record.found.item)
    : resolvedMetadata;
  const body = renderRouteBody(record, context);
  const document = `<!doctype html>
<html lang="en">
${renderHead(metadata)}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="app" data-static-route="${escapeHtml(record.entry.route)}">
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="Snap Mortgage home"><img class="brand-logo" src="/site/assets/images/snap-mortgage.png" alt="Snap Mortgage" /></a>
        <nav aria-label="Primary"><a href="/locations">Locations</a><a href="/rates">Rates</a><a href="/loan-options">Loan options</a><a href="/calculators">Calculators</a><a href="/learning-center">Learning center</a><a href="/loan-officers">Loan officers</a></nav>
      </div>
    </header>
    <div class="page" id="main" role="main">
      ${body}
      ${renderRelatedNavigation(record, context)}
      ${record.entry.type === "tag" ? "" : renderContentFreshness(publicFreshnessRecord(record.found), {
        canonicalTopicHub: context.publicTopicHubsByRoute.get(record.entry.route),
        productCopyBundle: context.productCopyBundle,
        evergreen: true,
      })}
    </div>
    <footer class="site-footer"><div class="footer-inner"><a href="/locations">Locations</a><a href="/learning-center">Learning center</a><a href="/branches">Branches</a><a href="/prequal/start">Review prequalification</a></div></footer>
  </div>
  <script type="module" src="/site/app.js"></script>
</body>
</html>
`;
  return document.replace(/[ \t]+(?=\r?\n)/g, "");
}

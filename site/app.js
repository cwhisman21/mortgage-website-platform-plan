import { renderArticleContent } from "/site/news-renderer.mjs";
import {
  chartFixtureFor,
  loadMarketChartFixtures,
  renderChartFigure,
  renderSnapshotSourceNote,
  wireMarketChartInteractions,
} from "/site/market-charts.mjs";
import { renderHomeStateExplorer, renderLocationsHero } from "/site/locations-hero.mjs";
import { initCampaignHero, renderCampaignHero } from "/site/campaign-hero.mjs?v=20260718-10";
import {
  buildLearningCenterModel,
  serializeLearningCenterSearch,
} from "/site/learning-center.mjs";
import {
  CONTRIBUTOR_DISCLOSURE,
  applyArticleAuthorIds,
  buildContributorArticleIndex,
  mergeEditorialArticles,
  normalizeEditorialContent,
  normalizeEditorialContentWithFallback,
  renderContributorArchiveMarkup,
  renderContributorBylineMarkup,
  silhouetteDataUri,
} from "/site/editorial-content.mjs";
import {
  renderProductionArticle,
  renderProductionTopicHub,
} from "/site/editorial-renderer.mjs";
import { applyDocumentMetadata, resolveDocumentMetadata } from "/site/document-metadata.mjs";
import { productContentById, renderProductContent } from "/site/product-content.mjs";
import { renderRatesMarketplace, wireRatesMarketplace } from "/site/rates-marketplace-ui.mjs";
import { createFixtureMarketplaceAdapter } from "/site/rates-marketplace.mjs";
import { buildPrequalHandoffRequest, createPrequalHandoffView, renderPrequalHandoffMarkup } from "/site/prequal-handoff.mjs";
import { renderContentFreshness } from "/site/content-freshness.mjs";
import {
  normalizeTagRegistry,
  tagRoute,
  tagsForRoute,
} from "/site/tag-registry.mjs";
import { parseTagSearchState } from "/site/tag-state.mjs";
import {
  resolveLocationSearchRoute,
  resolveTagRouteRequest,
  shouldUseNativeTagFallbackNavigation,
  shouldPreserveStaticTagPage,
} from "/site/discovery-route-state.mjs";
import {
  renderTagSearchPage,
  wireTagSearch,
} from "/site/tag-search-ui.mjs";
import {
  renderAdditionalTagLinks,
  renderPrimaryTagLinks,
} from "/site/tag-presentation.mjs";

const DATA_URL = "/mock-data/production-seed.json";
const NEWS_INDEX_URL = "/mock-data/location-news-index.json";
const NEWS_MEDIA_URL = "/mock-data/location-news-media-manifest.json";
const MARKET_CHART_FIXTURES_URL = "/mock-data/market-chart-fixtures.json";
const RATES_MARKETPLACE_FIXTURE_URL = "/mock-data/rates-marketplace-fixtures.json";
const CONTRIBUTORS_URL = "/mock-data/editorial/contributors.json";
const TOPIC_HUBS_URL = "/mock-data/editorial/topic-hubs.json";
const EDITORIAL_CONTENT_URL = "/mock-data/editorial-content.json";
const PRODUCT_COPY_URL = "/mock-data/product-copy.json";
const PUBLIC_TAG_REGISTRY_URL = "/mock-data/public-tag-registry.json";
const SEARCH_INDEX_URL = "/mock-data/search-index.json";
const app = document.getElementById("app");
const hasStaticTagPage = Boolean(app?.querySelector("[data-static-tag-page]"));
const staticTagFallbackTagId = app?.querySelector("[data-static-tag-page]")?.getAttribute("data-selected-tag-id") || "";
const staticTagFallbackHtml = Array.from(
  app?.querySelectorAll("[data-static-tag-page] .static-tag-results") || [],
).map((section) => section.outerHTML).join("");
wireMarketChartInteractions(app);

let data;
let maps;
let newsIndex = { articles: [] };
let mediaManifest = { media: [] };
let marketChartFixtures = { sources: [], charts: [], snapshotSources: [] };
let ratesMarketplaceFixture = null;
let editorialContent = normalizeEditorialContent();
let productCopyBundle = { products: [] };
let publicTagRegistry = normalizeTagRegistry();
let searchIndexRecords = null;
let searchIndexLoadError = null;
let searchIndexPromise = null;
let activeTagSearchController = null;
let activeCampaignHeroController = null;
const articleBundlePromises = new Map();
let articleModalReturnFocus = null;
let articleModalOrigin = null;
let articleModalScrollY = 0;
let activeArticleRequestId = 0;

const ASSETS = {
  logo: "/site/assets/images/snap-mortgage.png",
  borrower: "/site/assets/images/borrower.png",
  mortgage: "/site/assets/images/mortgage.png",
  house: "/site/assets/images/house-icon.png"
};

const SEARCH_FALLBACK_IMAGES = Object.freeze({
  articles: ASSETS.mortgage,
  "topic-guides": ASSETS.mortgage,
  "local-market-news": ASSETS.house,
  "product-guides": ASSETS.borrower,
  calculators: ASSETS.house,
});

const accentColors = ["#0b55ff", "#11bfb3", "#fdba22", "#21c983", "#dc475c", "#6f61a8"];
const STORAGE_KEY = "snapMortgagePublicSession";
const SNAP_CUSTOMER = {
  name: "Michael Thompson",
  product: "Snap Homes"
};

let sessionState = {
  isLoggedIn: true,
  savedCount: 0,
  savedItems: []
};

let pendingSaveAfterLogin = null;
let modalReturnFocus = null;

const sources = {
  freddiePmms: {
    name: "Freddie Mac Primary Mortgage Market Survey",
    url: "https://www.freddiemac.com/pmms",
    cadence: "Weekly",
    date: "2026-07-09",
    use: "National mortgage-rate benchmark"
  },
  fred: {
    name: "FRED, Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/docs/api/fred/",
    cadence: "Daily to monthly by series",
    date: "2026-07-08",
    use: "Treasury, inflation, and broader rate signals"
  },
  fhfaHpi: {
    name: "FHFA House Price Index",
    url: "https://www.fhfa.gov/data/hpi",
    cadence: "Monthly and quarterly",
    date: "2026-07-08",
    use: "Home price index trend"
  },
  fhfaLimits: {
    name: "FHFA Conforming Loan Limits",
    url: "https://www.fhfa.gov/data/conforming-loan-limit",
    cadence: "Annual",
    date: "2026",
    use: "Conventional and jumbo loan-limit reference"
  },
  hudFha: {
    name: "HUD FHA Mortgage Limits",
    url: "https://entp.hud.gov/idapp/html/hicostlook.cfm",
    cadence: "Annual",
    date: "2026",
    use: "FHA county loan-limit reference"
  },
  vaLoans: {
    name: "VA Home Loans",
    url: "https://www.benefits.va.gov/HOMELOANS/purchaseco_loan_limits.asp",
    cadence: "As updated",
    date: "2026-07-08",
    use: "VA entitlement and loan-limit reference"
  },
  census: {
    name: "U.S. Census API / ACS",
    url: "https://www.census.gov/data/developers.html",
    cadence: "Annual",
    date: "2026-07-08",
    use: "Population, income, and household data"
  },
  bls: {
    name: "BLS Public Data API",
    url: "https://www.bls.gov/developers/",
    cadence: "Monthly",
    date: "2026-07-08",
    use: "Employment and wage trends"
  },
  hmda: {
    name: "CFPB HMDA Public Data",
    url: "https://www.consumerfinance.gov/data-research/hmda/",
    cadence: "Annual",
    date: "2026-07-08",
    use: "Aggregate mortgage-market activity"
  },
  regZ: {
    name: "Regulation Z advertising rules",
    url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-C/section-1026.24",
    cadence: "As updated",
    date: "2026-07-08",
    use: "Rate, APR, payment, and trigger-term review"
  },
  internalPricing: {
    name: "Personalized pricing review",
    url: "",
    cadence: "Discussed with your scenario",
    date: "Shown after lender review",
    use: "Personalized rate, APR, cost, and product availability"
  },
  nmls: {
    name: "NMLS Consumer Access",
    url: "https://www.nmlsconsumeraccess.org/",
    cadence: "As licensing records change",
    date: "Current licensing records",
    use: "Loan officer and branch licensing"
  }
};

const rateBenchmarks = [
  {
    label: "30-year fixed benchmark",
    rate: "6.49%",
    apr: "Not reported by PMMS",
    points: "Not reported by PMMS",
    sourceId: "freddiePmms",
    next: "/calculators/mortgage-payment"
  },
  {
    label: "15-year fixed benchmark",
    rate: "5.82%",
    apr: "Not reported by PMMS",
    points: "Not reported by PMMS",
    sourceId: "freddiePmms",
    next: "/calculators/mortgage-payment"
  },
  {
    label: "Purchase quote",
    rate: "Personalized",
    apr: "Shown after review",
    points: "Varies",
    sourceId: "internalPricing",
    next: "/loan-officers"
  },
  {
    label: "Refinance quote",
    rate: "Personalized",
    apr: "Shown after review",
    points: "Varies",
    sourceId: "internalPricing",
    next: "/refinance"
  },
  {
    label: "FHA quote",
    rate: "Personalized",
    apr: "Shown after review",
    points: "Varies",
    sourceId: "internalPricing",
    next: "/loan-options/fha-loans"
  },
  {
    label: "VA quote",
    rate: "Personalized",
    apr: "Shown after review",
    points: "Varies",
    sourceId: "internalPricing",
    next: "/loan-options/va-loans"
  }
];

const stateBriefs = {
  "state-tx": "Texas borrowers often compare higher property tax assumptions against a wide range of price points and metro inventory conditions.",
  "state-ca": "California planning usually starts with high-cost county limits, jumbo fit, and insurance or property-tax assumptions by market.",
  "state-co": "Colorado connects relocation, VA demand, price sensitivity, local economy, and metro-to-mountain affordability differences.",
  "state-fl": "Florida mortgage planning needs careful insurance and escrow review because carrying costs can move the monthly payment materially."
};

const productBriefs = {
  "product-purchase": {
    fit: "For buyers comparing payment, cash to close, documentation, and local market timing before choosing a home.",
    tradeoff: "The right option can depend on down payment, credit profile, income, assets, property type, occupancy, and local costs."
  },
  "product-refinance": {
    fit: "For homeowners comparing a new mortgage against their current payment, term, closing costs, and long-term interest.",
    tradeoff: "A lower monthly payment can still increase total interest or extend the payoff timeline."
  },
  "product-fha": {
    fit: "For buyers who may want to compare a lower down payment option with FHA mortgage insurance and county limits.",
    tradeoff: "FHA can help with cash-to-close planning, but mortgage insurance and property standards matter."
  },
  "product-va": {
    fit: "For eligible military borrowers comparing VA benefits, entitlement, funding fee treatment, and local price levels.",
    tradeoff: "VA eligibility and entitlement details need review before assuming a loan amount or benefit applies."
  },
  "product-conventional": {
    fit: "For buyers and homeowners comparing agency guidelines, down payment options, mortgage insurance, and conforming limits.",
    tradeoff: "Conventional pricing and mortgage insurance can change with credit profile, equity, loan amount, and occupancy."
  },
  "product-jumbo": {
    fit: "For high-cost home purchases or refinances above the conforming loan limit for the relevant county.",
    tradeoff: "Jumbo loans often require stronger reserves, documentation, and product review."
  },
  "product-home-equity": {
    fit: "For homeowners comparing access to equity through a HELOC or home equity loan.",
    tradeoff: "Open-end credit terms, variable APRs, fees, draw periods, repayment terms, and lien position need careful review."
  },
  "product-cash-out-refinance": {
    fit: "For homeowners comparing a new mortgage balance against debt consolidation, improvements, or liquidity goals.",
    tradeoff: "Cash-out changes the loan balance and can change payment, equity, term, total interest, and risk."
  }
};

const productFitAnswers = {
  "product-purchase": {
    fitCriteria: "Home purchase financing is commonly evaluated by buyers who have a target price range, down-payment plan, expected closing timeline, and a budget for the full housing payment.",
    costsAndTradeoffs: "The principal cost tradeoff includes interest, lender and third-party closing costs, possible mortgage insurance, and the cash you keep after closing.",
    propertyAndOccupancy: "Property type, condition, location, intended occupancy, taxes, insurance, and HOA dues can change which options are considered and the full monthly obligation.",
    lenderReview: "A lender must review credit, income, debts, assets, property details, occupancy, loan amount, current pricing, and program rules before stating eligibility or terms."
  },
  "product-refinance": {
    fitCriteria: "Refinancing is commonly evaluated by homeowners comparing a current mortgage with a new rate, term, payment, cash-out goal, or payoff schedule.",
    costsAndTradeoffs: "The principal cost tradeoff is paying closing costs and potentially restarting or extending the term; a lower payment can still increase total interest or delay payoff.",
    propertyAndOccupancy: "Property value, lien position, equity, property type, occupancy, taxes, insurance, and the current loan all affect the comparison.",
    lenderReview: "A lender must review credit, income, debts, equity, title, payoff details, property information, occupancy, pricing, and cost recovery before stating eligibility or terms."
  },
  "product-fha": {
    fitCriteria: "FHA financing is commonly compared by buyers planning to occupy the home as a primary residence and weighing a lower down-payment option against conventional financing.",
    costsAndTradeoffs: "The principal cost tradeoff is FHA mortgage insurance, including an upfront charge and an annual charge, alongside closing costs, interest, and county loan limits.",
    propertyAndOccupancy: "The home must meet FHA property requirements, the transaction generally requires primary-residence occupancy, and eligible property types and county limits matter.",
    lenderReview: "An FHA-approved lender must review credit, income, debts, assets, property eligibility, appraisal findings, occupancy, current limits, and current program rules before stating eligibility or terms."
  },
  "product-va": {
    fitCriteria: "VA financing is commonly compared by eligible Veterans, service members, and qualifying surviving spouses who plan to use an eligible home as a primary residence.",
    costsAndTradeoffs: "The principal cost tradeoff can include the VA funding fee when no exemption applies, plus closing costs, interest, and the effect of financing a fee into the loan balance.",
    propertyAndOccupancy: "Entitlement, intended occupancy, appraisal requirements, property eligibility, and any existing VA loan can affect the transaction.",
    lenderReview: "VA and the lender must confirm the Certificate of Eligibility, entitlement, funding-fee treatment, income, credit, debts, assets, property, occupancy, and current terms before stating eligibility or pricing."
  },
  "product-conventional": {
    fitCriteria: "Conventional financing is commonly compared for purchases and refinances that may fit agency or lender guidelines and the applicable conforming loan limit.",
    costsAndTradeoffs: "The principal cost tradeoff includes interest, closing costs, and possible private mortgage insurance when equity or down payment is below the lender's threshold.",
    propertyAndOccupancy: "Primary residences, second homes, and investment properties can have different down-payment, reserve, pricing, and property requirements.",
    lenderReview: "A lender must review credit, income, debts, assets, reserves, property type, occupancy, loan amount, current limits, and pricing before stating eligibility or terms."
  },
  "product-jumbo": {
    fitCriteria: "Jumbo financing is commonly compared when the needed loan amount is above the conforming limit for the property's county.",
    costsAndTradeoffs: "The principal cost tradeoff can include lender-specific pricing, larger reserve expectations, closing costs, and more extensive documentation.",
    propertyAndOccupancy: "Property type, appraisal, location, occupancy, loan size, and liquidity can materially affect a jumbo review.",
    lenderReview: "A lender must confirm the county limit, credit, income, debts, assets, reserves, property, occupancy, documentation, and current pricing before stating eligibility or terms."
  },
  "product-home-equity": {
    fitCriteria: "Home-equity borrowing is commonly compared by homeowners who have equity and want to weigh a HELOC or home-equity loan against refinancing or leaving the first mortgage unchanged.",
    costsAndTradeoffs: "The principal cost tradeoff can include a variable APR for a HELOC, fees, a draw period followed by repayment, a second lien, and a higher total debt obligation.",
    propertyAndOccupancy: "Property value, current liens, combined loan-to-value, property type, occupancy, and state or lender restrictions can affect the options considered.",
    lenderReview: "A lender must review credit, income, debts, equity, liens, property, occupancy, line or loan terms, fees, and current pricing before stating eligibility or terms."
  },
  "product-cash-out-refinance": {
    fitCriteria: "Cash-out refinancing is commonly compared by homeowners who want to replace the current mortgage and convert part of their equity to cash.",
    costsAndTradeoffs: "The principal cost tradeoff is a larger loan balance plus closing costs; payment, term, total interest, and the amount of equity left in the home can all change.",
    propertyAndOccupancy: "Property value, current liens, equity, property type, occupancy, title, and any timing or seasoning rules can affect the transaction.",
    lenderReview: "A lender must review credit, income, debts, equity, title, payoff details, property, occupancy, current program rules, and pricing before stating eligibility or terms."
  }
};

function productFitAnswer(product) {
  return productFitAnswers[product?.id] || productFitAnswers["product-purchase"];
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadSessionState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    sessionState = {
      isLoggedIn: stored.isLoggedIn !== false,
      savedCount: Number.isFinite(Number(stored.savedCount)) ? Number(stored.savedCount) : 0,
      savedItems: Array.isArray(stored.savedItems) ? stored.savedItems : []
    };
  } catch {
    sessionState = { isLoggedIn: true, savedCount: 0, savedItems: [] };
  }
}

function persistSessionState() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionState));
}

function resetSessionStateForSignOut() {
  sessionState = { isLoggedIn: false, savedCount: 0, savedItems: [] };
  persistSessionState();
}

function route(path) {
  return normalizeRoute(path || "/");
}

function routeWithAnchor(path, anchor) {
  const cleanAnchor = String(anchor || "").replace(/^#/, "");
  return cleanAnchor ? `${route(path)}#${cleanAnchor}` : route(path);
}

function normalizeRoute(value) {
  const routeValue = value || "/";
  return routeValue.length > 1 && routeValue.endsWith("/") ? routeValue.slice(0, -1) : routeValue;
}

function slugify(value) {
  return String(value || "section")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function humanizePublicLabel(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatDaysOnMarket(value) {
  const label = String(value || "").trim();
  if (!label) return "Not provided";
  return /^\d+(?:\.\d+)?$/.test(label) ? `${label} days` : label;
}

function currentAnchor() {
  return decodeURI(window.location.href).split("#")[1] || "";
}

function mapById(items) {
  return Object.fromEntries((items || []).map((item) => [item.id, item]));
}

function byIds(ids, map) {
  return (ids || []).map((id) => map[id]).filter(Boolean);
}

function first(items, count) {
  return (items || []).slice(0, count);
}

function uniqueById(items) {
  return (items || []).filter((item, index, list) => item?.id && list.findIndex((candidate) => candidate.id === item.id) === index);
}

function initials(name) {
  return String(name || "SM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function icon(name) {
  const paths = {
    rates: '<path d="M4 17h16M6 13l3-3 3 2 5-6"/><path d="M18 6h2v2"/>',
    location: '<path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    calculator: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M8.5 7h7"/><path d="M9 11h.1M12 11h.1M15 11h.1M9 14h.1M12 14h.1M15 14h.1M9 17h.1M12 17h.1M15 17h.1"/>',
    guide: '<path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4-4V4Z"/><path d="M5 16V6a4 4 0 0 1 4-4h10v14"/>',
    expert: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    branch: '<path d="M4 20h16"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 20v-6h6v6"/><path d="M9 10h.1M12 10h.1M15 10h.1"/>',
    article: '<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M18 4h3v3"/>',
    watchlist: '<path d="M6 4h12v17l-6-3-6 3V4Z"/><path d="M9 9h6M9 13h4"/>',
    prequal: '<path d="M8 4h8l2 3v13H6V7l2-3Z"/><path d="m9 13 2 2 4-5"/><path d="M9 18h6"/>',
    leadForm: '<path d="M5 5h14v10H8l-3 3V5Z"/><path d="M8 9h8M8 12h5"/>',
    compare: '<path d="M7 4v16M17 4v16"/><path d="M4 8h6l-3 6-3-6ZM14 8h6l-3 6-3-6Z"/><path d="M4 18h16"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  return `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name] || paths.home}</svg></span>`;
}

function buildMaps(seed, compactNewsIndex = { articles: [] }, compactMediaManifest = { media: [] }, editorialContent = {}, tagRegistry = {}) {
  const built = {
    states: mapById(seed.states),
    cities: mapById(seed.cities),
    branches: mapById(seed.branches),
    loanOfficers: mapById(seed.loanOfficers),
    products: mapById(seed.products),
    ratesPages: mapById(seed.ratesPages),
    locationProductModules: mapById(seed.locationProductModules),
    blogPages: mapById(seed.blogPages),
    articles: mapById(seed.articles),
    calculators: mapById(seed.calculators),
    directories: mapById(seed.directoryPages),
    newsArticles: mapById(compactNewsIndex.articles),
    newsMedia: mapById(compactMediaManifest.media || compactMediaManifest.assets),
    contributors: mapById(editorialContent.contributors),
    contributorsBySlug: Object.fromEntries((editorialContent.contributors || []).map((contributor) => [contributor.slug, contributor])),
    contributorArticles: buildContributorArticleIndex(seed.articles || [], compactNewsIndex.articles || []),
    newsByLocation: {},
    modulesByParent: {},
    ctaRules: seed.ctaRules || [],
    complianceDisclosures: seed.complianceDisclosures || [],
    routes: new Map()
  };

  (seed.locationProductModules || []).forEach((module) => {
    const parent = normalizeRoute(module.parentPageRoute);
    built.modulesByParent[parent] = built.modulesByParent[parent] || [];
    built.modulesByParent[parent].push(module);
  });

  built.routes.set("/", { type: "home", item: seed.siteEntryPages[0] });
  [
    ["state", seed.states],
    ["city", seed.cities],
    ["branch", seed.branches],
    ["loanOfficer", seed.loanOfficers],
    ["product", seed.products],
    ["rates", seed.ratesPages],
    ["blog", seed.blogPages],
    ["article", seed.articles],
    ["calculator", seed.calculators],
    ["directory", seed.directoryPages]
  ].forEach(([type, list]) => {
    (list || []).forEach((item) => built.routes.set(normalizeRoute(item.route), { type, item }));
  });

  (compactNewsIndex.articles || []).forEach((article) => {
    const locationId = article.locationId;
    if (!locationId) return;
    built.newsByLocation[locationId] = built.newsByLocation[locationId] || [];
    built.newsByLocation[locationId].push(article);
    built.routes.set(normalizeRoute(article.route), { type: "newsArticle", item: article });
  });

  built.routes.set("/locations", {
    type: "locations",
    item: seed.directoryPages.find((page) => page.route === "/locations")
  });

  (editorialContent.authorRoutes || []).forEach((authorRoute) => {
    built.routes.set(normalizeRoute(authorRoute.route), authorRoute);
  });
  const normalizedTagRegistry = tagRegistry?.tagsById
    ? tagRegistry
    : normalizeTagRegistry(tagRegistry);
  normalizedTagRegistry.tags.forEach((tag) => {
    const canonicalRoute = normalizeRoute(tagRoute(tag));
    if (!canonicalRoute) return;
    built.routes.set(canonicalRoute, { type: "tag", item: tag });
    (tag.redirectSlugs || []).forEach((slug) => {
      const historicalRoute = normalizeRoute(`/learning-center/tags/${slug}`);
      built.routes.set(historicalRoute, {
        type: "tag",
        item: tag,
        historicalSlug: slug,
      });
    });
  });
  built.routes.set("/prequal/start", {
    type: "prequalHandoff",
    item: { route: "/prequal/start" }
  });
  return built;
}

function currentPath() {
  const pathname = decodeURI(window.location.pathname || "/");
  if (pathname === "/site" || pathname === "/site/index.html") return "/";
  return normalizeRoute(pathname);
}

function navigate(path, { replace = false, state = {} } = {}) {
  const method = replace ? "replaceState" : "pushState";
  window.history[method](state, "", path);
  render();
}

function isTagSearchPath(path = currentPath()) {
  return path === "/learning-center/search" || path.startsWith("/learning-center/tags/");
}

function tagContextForRoute(path) {
  return tagsForRoute(publicTagRegistry, normalizeRoute(path));
}

function tagSearchStateFor(found) {
  const state = parseTagSearchState(window.location.search, publicTagRegistry);
  const routeTag = found?.type === "tag" ? found.item : undefined;
  if (!routeTag || state.tagIds.includes(routeTag.id)) return state;

  return {
    ...state,
    tagIds: [routeTag.id, ...state.tagIds],
    operators: state.tagIds.length ? ["AND", ...state.operators] : [],
  };
}

function safeSearchImageUrl(value) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f\\]/.test(candidate)) return "";
  if (/^\/(?!\/)/.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? candidate : "";
  } catch {
    return "";
  }
}

function resolveSearchImageReference(reference, family) {
  const media = typeof reference === "string" ? maps?.newsMedia?.[reference] : undefined;
  if (media?.approvalStatus === "approved") {
    const approvedImage = safeSearchImageUrl(media.localPath) || safeSearchImageUrl(media.imageUrl);
    if (approvedImage) return approvedImage;
  }
  return safeSearchImageUrl(reference) || SEARCH_FALLBACK_IMAGES[family] || ASSETS.mortgage;
}

function normalizeSearchRecords(payload) {
  if (!Array.isArray(payload?.records)) throw new Error("Search resources are unavailable.");
  return payload.records.map((record) => ({
    ...record,
    preview: /^(?:undefined|null|nan)\b/i.test(String(record.preview || "").trim())
      ? ""
      : record.preview,
    image: resolveSearchImageReference(record.image, record.family),
  }));
}

function resolveSearchAuthor(author) {
  const authorId = typeof author === "string" ? author : author?.id;
  return maps?.contributors?.[authorId]?.name || author?.displayName || author?.name || "";
}

function resolveSearchLocation(locationId, record) {
  const city = maps?.cities?.[locationId];
  if (city) {
    const state = maps.states[city.stateId];
    return state ? `${city.name}, ${state.abbr || state.name}` : city.name;
  }
  const state = maps?.states?.[locationId];
  if (state) return state.name;

  const locationType = locationId?.startsWith("city-")
    ? "city"
    : locationId?.startsWith("state-")
      ? "state"
      : "";
  if (!locationType) return "";
  return (record?.tagIds || [])
    .map((tagId) => publicTagRegistry.tagsById.get(tagId))
    .find((tag) => tag?.type === locationType)?.displayName || "";
}

async function loadSearchIndexForDiscoveryRoute() {
  if (Array.isArray(searchIndexRecords)) return searchIndexRecords;
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = fetch(SEARCH_INDEX_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error("Search resources are unavailable.");
      return normalizeSearchRecords(await response.json());
    })
    .then((records) => {
      searchIndexRecords = records;
      searchIndexLoadError = null;
      return records;
    })
    .catch((error) => {
      searchIndexRecords = [];
      searchIndexLoadError = error;
      return [];
    })
    .finally(() => {
      searchIndexPromise = null;
      if (isTagSearchPath()) render();
    });
  return searchIndexPromise;
}

function updateTagSearchHistory(url, { replace = true, state = {} } = {}) {
  const nextUrl = new URL(url, window.location.origin);
  const method = replace ? "replaceState" : "pushState";
  window.history[method](state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  setDocumentMeta(maps.routes.get("/learning-center/search"), `${nextUrl.pathname}${nextUrl.search}`);
}

function trackPublicEvent(name, payload = {}) {
  const allowedPayloadKeys = [
    "field", "offerId", "resultType", "sort", "tab", "visibleCount", "contributorId",
    "family", "position", "tagId", "operator", "index", "hasQuery", "tagCount",
  ];
  const safePayload = {};
  for (const key of allowedPayloadKeys) {
    if (payload[key] === undefined) continue;
    safePayload[key] = String(payload[key]).slice(0, 80);
  }
  window.dispatchEvent(new CustomEvent("snap-public-analytics", {
    detail: {
      name: String(name || "").slice(0, 80),
      payload: safePayload
    }
  }));
}

function navLink(path, label) {
  const active = currentPath() === path || (path !== "/" && currentPath().startsWith(`${path}/`));
  return `<a class="${active ? "active" : ""}" href="${route(path)}">${esc(label)}</a>`;
}

function accountMenu() {
  const savedBadge = sessionState.savedCount > 0 ? `<span class="account-badge" data-saved-count>${sessionState.savedCount}</span>` : "";
  if (!sessionState.isLoggedIn) {
    return `
      <div class="account-menu" data-account-root>
        <button class="account-trigger" type="button" aria-haspopup="true" aria-expanded="false" data-account-toggle>
          <span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="account-name">Menu</span>
          ${savedBadge}
        </button>
        <div class="account-dropdown" data-account-menu hidden>
          <button type="button" data-auth-action="login">Log in</button>
          <button type="button" data-cta-action="leadForm">Review guidance options</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="account-menu" data-account-root>
      <button class="account-trigger logged-in" type="button" aria-haspopup="true" aria-expanded="false" data-account-toggle>
        <span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="account-avatar" aria-hidden="true">${icon("account")}</span>
        <span class="account-name">${esc(SNAP_CUSTOMER.name)}</span>
        ${savedBadge}
      </button>
      <div class="account-dropdown" data-account-menu hidden>
        <button type="button" data-account-action="open">Open My Account</button>
        <button type="button" data-cta-action="leadForm">Review guidance options</button>
        <button type="button" data-cta-action="rateReview">Review rates</button>
        <button type="button" data-cta-action="compareOffer">Compare an offer</button>
        <button type="button" data-account-action="signout">Sign out</button>
      </div>
    </div>
  `;
}

function header() {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${route("/")}">
          <img class="brand-logo" src="${ASSETS.logo}" alt="Snap Mortgage" />
        </a>
        <button class="nav-toggle" type="button" aria-label="Open navigation" data-nav-toggle>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>
        <nav class="site-nav" data-nav>
          ${navLink("/locations", "Locations")}
          ${navLink("/rates", "Rates")}
          ${navLink("/buy", "Buy")}
          ${navLink("/refinance", "Refinance")}
          ${navLink("/loan-options", "Loan Options")}
          ${navLink("/calculators", "Calculators")}
          ${navLink("/learning-center", "Learning")}
          ${navLink("/loan-officers", "Loan officers")}
        </nav>
        <div class="header-actions">
          ${accountMenu()}
        </div>
      </div>
    </header>
  `;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <h3>Snap Mortgage</h3>
          <p>Compare local housing costs and mortgage options, test visible assumptions, and choose a useful next step.</p>
          <p class="disclosure">Information is educational and does not replace a Loan Estimate, approval decision, or commitment to lend.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <a href="${route("/locations")}">Locations</a>
          <a href="${route("/rates")}">Rates</a>
          <a href="${route("/loan-options")}">Loan options</a>
          <a href="${route("/loan-officers")}">Loan officers</a>
        </div>
        <div>
          <h3>Tools</h3>
          <a href="${route("/calculators")}">Calculators</a>
          <a href="${route("/calculators/affordability")}">Affordability</a>
          <a href="${route("/calculators/refinance")}">Refinance</a>
          <button type="button" data-cta-action="compareOffer">Compare an offer</button>
        </div>
        <div>
          <h3>People</h3>
          <a href="${route("/loan-officers")}">Loan officers</a>
          <a href="${route("/branches")}">Branches</a>
          <button type="button" data-cta-action="leadForm">Review guidance options</button>
          <a href="${route("/learning-center/editorial-team")}">Editorial team</a>
        </div>
        <div>
          <h3>Learning</h3>
          <a href="${route("/learning-center")}">Learning center</a>
          <a href="${route("/learning-center/local-market-updates")}">Market updates</a>
          <a href="${route("/learning-center/buying-a-home")}">Buying a home</a>
        </div>
      </div>
    </footer>
  `;
}

function hero({ eyebrow, title, lead, actions = "", panel = "", beforeTitle = "" }) {
  return `
    <section class="hero-band">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">${esc(eyebrow)}</p>
          ${beforeTitle}
          <h1>${esc(title)}</h1>
          <p class="lead">${esc(lead)}</p>
          ${actions ? `<div class="hero-actions">${actions}</div>` : ""}
        </div>
        ${panel}
      </div>
    </section>
  `;
}

function section(title, intro, content, className = "") {
  return `
    <section class="section ${className}">
      <div class="section-header">
        <div>
          <p class="eyebrow">${esc(intro.label || "Snap Mortgage")}</p>
          <h2>${esc(title)}</h2>
        </div>
        ${intro.text ? `<p>${esc(intro.text)}</p>` : ""}
      </div>
      ${content}
    </section>
  `;
}

function card({ title, text, href, iconName = "home", accent = "#0f6e67", linkLabel = "Explore", searchText = "" }) {
  const tag = href ? "a" : "div";
  const attr = href ? `href="${route(href)}"` : "";
  const searchAttr = searchText ? `data-directory-result data-search-text="${esc(searchText)}"` : "";
  return `
    <${tag} ${attr} ${searchAttr} class="card" style="--card-accent:${accent}">
      <span class="card-cue" aria-hidden="true"></span>
      ${icon(iconName)}
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${href ? `<span class="text-link">${esc(linkLabel)} -></span>` : ""}
    </${tag}>
  `;
}

function routeStrip(items) {
  return `
    <section class="section compact route-strip-section" aria-label="Popular mortgage choices">
      <div class="route-strip">
        ${items.map((item, index) => `
          <a href="${route(item.href)}" style="--card-accent:${accentColors[index % accentColors.length]}">
            <span>${esc(item.label)}</span>
            <strong>${esc(item.title)}</strong>
            <p>${esc(item.text)}</p>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function metric(label, value, note = "") {
  return `
    <div class="metric">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      ${note ? `<p>${esc(note)}</p>` : ""}
    </div>
  `;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function disclosureBlock(title = "Important mortgage disclosure", text = "Rates, APRs, payments, costs, loan amounts, product availability, and eligibility can change based on borrower facts, property details, occupancy, loan amount, market conditions, and lender review.") {
  return `<div class="disclosure"><strong>${esc(title)}</strong><br />${esc(text)}</div>`;
}

function sourceNote(ids, title = "Data sources") {
  const items = ids.map((id) => sources[id]).filter(Boolean);
  return `
    <div class="source-note">
      <strong>${esc(title)}</strong>
      ${items.map((item) => `
        <p>${item.url && item.url !== "#" ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.name)}</a>` : `<span>${esc(item.name)}</span>`} | ${esc(item.use)} | Updated ${esc(item.date)} | ${esc(item.cadence)}</p>
      `).join("")}
    </div>
  `;
}

function marketChart(chartId, entityId) {
  return renderChartFigure(chartFixtureFor(marketChartFixtures, chartId, entityId));
}

function marketSnapshotReference(scope, entityId) {
  return renderSnapshotSourceNote(marketChartFixtures, scope, entityId);
}

function currency(value) {
  return `$${Math.max(0, Math.round(Number(value) || 0)).toLocaleString("en-US")}`;
}

function calculatedScenarioChart(calculatorId, title, summary, points, { chartType = "payment", valueHeader = "Monthly estimate" } = {}) {
  const fixture = chartFixtureFor(marketChartFixtures, "calculator.payment_breakdown", calculatorId);
  if (!fixture) return "";
  const cleanPoints = points.map((point) => ({ label: point.label, value: Math.max(0, Math.round(Number(point.value) || 0)) }));
  const headers = ["Scenario measure", valueHeader];
  const rows = cleanPoints.map((point) => [point.label, currency(point.value)]);
  return `<div class="calculator-data-table">
    <div>
      <strong>${esc(title)}</strong>
      <p>${esc(summary)}</p>
    </div>
    ${table(headers, rows)}
  </div>`;
}

function downPaymentReadinessBar({ required, available, productLabel = "Selected product", downPaymentAssumption = 0, closingCosts = 0, dpaAssistance = 0, baseRequired = required }) {
  const cleanRequired = Math.max(0, Math.round(Number(required) || 0));
  const cleanAvailable = Math.max(0, Math.round(Number(available) || 0));
  const cleanBaseRequired = Math.max(cleanRequired, Math.round(Number(baseRequired) || cleanRequired));
  const cleanDownPayment = Math.max(0, Math.round(Number(downPaymentAssumption) || 0));
  const cleanClosing = Math.max(0, Math.round(Number(closingCosts) || 0));
  const cleanDpa = Math.max(0, Math.round(Number(dpaAssistance) || 0));
  const max = Math.max(cleanAvailable, cleanBaseRequired, cleanRequired, 1);
  const availableWidth = Math.max((cleanAvailable / max) * 100, cleanAvailable > 0 ? 3 : 0);
  const neededWidth = Math.max((cleanRequired / max) * 100, cleanRequired > 0 ? 3 : 0);
  const status = cleanAvailable >= cleanRequired ? "Cash available covers this illustrative input total." : `${currency(cleanRequired - cleanAvailable)} difference after the assumptions shown.`;
  return `<div class="calculator-horizontal-chart">
    <div class="comparison-chart-header">
      <strong>Cash available vs. entered assumptions</strong>
      <p>${esc(productLabel)} view uses the user-entered down payment and editable closing-cost assumption. It does not infer a minimum down payment, eligibility, or assistance availability.</p>
    </div>
    <div class="down-payment-bars" role="img" aria-label="Cash available ${currency(cleanAvailable)} compared with cash needed ${currency(cleanRequired)}">
      <div class="down-payment-bar-row have">
        <div><span>You have</span><strong>${currency(cleanAvailable)}</strong></div>
        <div class="down-payment-bar-track"><i style="--bar-width:${availableWidth}%"></i></div>
      </div>
      <div class="down-payment-bar-row need">
        <div><span>You need</span><strong>${currency(cleanRequired)}</strong></div>
        <div class="down-payment-bar-track"><i style="--bar-width:${neededWidth}%"></i></div>
      </div>
    </div>
    <div class="down-payment-formula">
      <span>Down payment assumption <strong>${currency(cleanDownPayment)}</strong></span>
      <span>Closing-cost assumption <strong>${currency(cleanClosing)}</strong></span>
      ${cleanDpa ? `<span>DPA estimate <strong>-${currency(cleanDpa)}</strong></span>` : ""}
    </div>
    <p class="chart-status-note">${esc(status)}</p>
  </div>`;
}

function twoBarComparison({ title, summary, leftLabel, leftValue, rightLabel, rightValue }) {
  const max = Math.max(Number(leftValue) || 0, Number(rightValue) || 0, 1);
  return `<div class="calculator-two-bar">
    <div class="comparison-chart-header">
      <strong>${esc(title)}</strong>
      <p>${esc(summary)}</p>
    </div>
    ${[
      { label: leftLabel, value: leftValue, color: "#2478bd" },
      { label: rightLabel, value: rightValue, color: "#78c257" }
    ].map((bar) => `<div class="comparison-bar-row">
      <div><span>${esc(bar.label)}</span><strong>${currency(bar.value)}</strong></div>
      <div class="comparison-bar-track"><i style="--bar-color:${bar.color};--bar-width:${Math.max((bar.value / max) * 100, bar.value > 0 ? 3 : 0)}%"></i></div>
    </div>`).join("")}
  </div>`;
}

function uploadMortgageStatementCta() {
  return `<div class="upload-statement-cta">
    <div>
      <strong>Have your current mortgage statement nearby?</strong>
      <p>Use it to check payoff, escrow, insurance, and mortgage-insurance inputs yourself. Nothing is uploaded or prefilled here.</p>
    </div>
    <button class="button secondary" type="button" data-cta-action="prequal">Review prequalification details</button>
  </div>`;
}

function amortizationPanel({ principal, monthlyRate, months, startYear = 2026 }) {
  const years = Math.max(Math.round(months / 12), 1);
  const sampleYears = Array.from({ length: Math.min(years, 8) + 1 }, (_, index) => Math.round((years * index) / Math.min(years, 8)));
  const rows = sampleYears.map((year) => {
    const elapsed = Math.min(year * 12, months);
    const balance = loanBalanceAfterMonths(principal, monthlyRate, months, elapsed);
    const paid = Math.max(principal - balance, 0);
    return { year: startYear + year, balance, paid };
  });
  const max = Math.max(...rows.flatMap((row) => [row.balance, row.paid]), 1);
  const points = (key) => rows.map((row, index) => {
    const x = 34 + (index * (520 - 68)) / Math.max(rows.length - 1, 1);
    const y = 210 - 30 - (row[key] / max) * 150;
    return `${Math.round(x)},${Math.round(y)}`;
  }).join(" ");
  return `<div class="calculator-amortization-panel">
    <div class="comparison-chart-header">
      <strong>Amortization for mortgage loan</strong>
      <p>Principal paid grows as the remaining balance declines over the selected term.</p>
    </div>
    <svg viewBox="0 0 520 230" role="img" aria-label="Amortization chart showing principal paid and remaining balance">
      <path class="comparison-grid" d="M34 45H486M34 90H486M34 135H486" />
      <path class="comparison-axis" d="M34 180H486" />
      <polygon class="equity-area" points="34,180 ${points("paid")} 486,180" />
      <polyline class="comparison-line buy-line" points="${points("paid")}" />
      <polyline class="comparison-line rent-line" points="${points("balance")}" />
      <text x="34" y="202">${startYear}</text>
      <text x="430" y="202">${startYear + years}</text>
    </svg>
    <div class="comparison-legend">
      <span><i class="buy-key"></i>Principal paid <strong>${currency(rows.at(-1)?.paid)}</strong></span>
      <span><i class="rent-key"></i>Remaining balance <strong>${currency(rows.at(-1)?.balance)}</strong></span>
    </div>
  </div>`;
}

function schedulePanel({ principal, monthlyRate, months, startYear = 2026 }) {
  const years = Math.min(Math.ceil(months / 12), 10);
  const payment = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;
  const rows = Array.from({ length: years }, (_, index) => {
    const elapsedStart = index * 12;
    const elapsedEnd = Math.min((index + 1) * 12, months);
    const startBalance = loanBalanceAfterMonths(principal, monthlyRate, months, elapsedStart);
    const endBalance = loanBalanceAfterMonths(principal, monthlyRate, months, elapsedEnd);
    const principalPaid = Math.max(startBalance - endBalance, 0);
    const interestPaid = Math.max(payment * (elapsedEnd - elapsedStart) - principalPaid, 0);
    return [String(startYear + index), currency(principalPaid), currency(interestPaid), currency(endBalance)];
  });
  return `<div class="calculator-schedule-panel">${table(["Year", "Principal", "Interest", "Remaining balance"], rows)}</div>`;
}

function calculatorTabbedPanel({ kind, chartHtml, amortizationHtml = "", scheduleHtml = "" }) {
  const id = `calc-tabs-${kind}`;
  const panelCount = [chartHtml, amortizationHtml, scheduleHtml].filter(Boolean).length;
  return `<div class="calculator-tabs" style="--tab-count:${panelCount}">
    <input id="${id}-chart" name="${id}" type="radio" checked />
    ${amortizationHtml ? `<input id="${id}-amortization" name="${id}" type="radio" />` : ""}
    ${scheduleHtml ? `<input id="${id}-schedule" name="${id}" type="radio" />` : ""}
    <div class="calculator-tab-list">
      <label for="${id}-chart">Chart</label>
      ${amortizationHtml ? `<label for="${id}-amortization">Amortization</label>` : ""}
      ${scheduleHtml ? `<label for="${id}-schedule">Schedule</label>` : ""}
    </div>
    <div class="calculator-tab-panel chart-panel">${chartHtml}</div>
    ${amortizationHtml ? `<div class="calculator-tab-panel amortization-panel">${amortizationHtml}</div>` : ""}
    ${scheduleHtml ? `<div class="calculator-tab-panel schedule-panel">${scheduleHtml}</div>` : ""}
  </div>`;
}

function loanBalanceAfterMonths(principal, monthlyRate, totalMonths, elapsedMonths) {
  if (principal <= 0) return 0;
  if (monthlyRate <= 0) return Math.max(principal * (1 - elapsedMonths / totalMonths), 0);
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const balance = principal * Math.pow(1 + monthlyRate, elapsedMonths) - payment * ((Math.pow(1 + monthlyRate, elapsedMonths) - 1) / monthlyRate);
  return Math.max(balance, 0);
}

function rentBuyLineComparison({ rent, buyPayment, rentGrowth, timeline }) {
  const years = Math.max(Math.round(Number(timeline) || 1), 1);
  const steps = Math.min(Math.max(years, 2), 8);
  const series = Array.from({ length: steps + 1 }, (_, index) => {
    const year = Math.round((years * index) / steps);
    return { year, rent: rent * Math.pow(1 + rentGrowth, year), buy: buyPayment };
  });
  const values = series.flatMap((point) => [point.rent, point.buy]).map((value) => Number(value) || 0);
  const max = Math.max(...values, 1);
  const width = 620;
  const height = 250;
  const padX = 42;
  const padY = 34;
  const xy = (value, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    const y = height - padY - (value / max) * (height - padY * 2);
    return `${Math.round(x)},${Math.round(y)}`;
  };
  const rentPoints = series.map((point, index) => xy(point.rent, index)).join(" ");
  const buyPoints = series.map((point, index) => xy(point.buy, index)).join(" ");
  const last = series[series.length - 1];
  const comparisonYears = [5, 10, 15, 20, 25, 30];
  const selectedYear = comparisonYears.includes(years) ? years : 10;
  const comparisonPanels = comparisonYears.map((year) => `<div class="rent-buy-year-panel${year === selectedYear ? " active" : ""}" data-rent-buy-year-panel="${year}">
    ${twoBarComparison({
      title: `${year}-year partial monthly comparison`,
      summary: "Projected rent is compared only with the entered ownership payment components.",
      leftLabel: "Projected rent",
      leftValue: rent * Math.pow(1 + rentGrowth, year),
      rightLabel: "Estimated buy payment",
      rightValue: buyPayment,
    })}
  </div>`).join("");
  return `<div class="calculator-analysis-tabs" data-analysis-tabs>
    <div class="comparison-chart-header">
      <strong>Partial rent-versus-buy payment comparison</strong>
      <p>Includes monthly rent, editable rent growth, and entered ownership payment components. It excludes appreciation, maintenance, buying costs, selling costs, investment opportunity cost, tax treatment, and complete transaction economics.</p>
    </div>
    <div class="calculator-analysis-tab-list" role="tablist" aria-label="Partial rent versus buy payment views">
      <button class="active" type="button" data-analysis-tab="timeline">Timeline</button>
      <button type="button" data-analysis-tab="comparison">Compare horizon</button>
    </div>
    <div class="calculator-analysis-panel active" data-analysis-panel="timeline">
      <div class="calculator-comparison-chart">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected rent compared with entered buy payment over ${years} years">
          <path class="comparison-axis" d="M${padX} ${height - padY}H${width - padX}" />
          <polyline class="comparison-line rent-line" points="${rentPoints}" />
          <polyline class="comparison-line buy-line" points="${buyPoints}" />
          ${series.map((point, index) => {
            const [rx, ry] = xy(point.rent, index).split(",");
            const [bx, by] = xy(point.buy, index).split(",");
            return `<circle class="comparison-dot rent-dot" cx="${rx}" cy="${ry}" r="4"><title>Year ${point.year} rent: ${currency(point.rent)}</title></circle><circle class="comparison-dot buy-dot" cx="${bx}" cy="${by}" r="4"><title>Year ${point.year} buy payment: ${currency(point.buy)}</title></circle>`;
          }).join("")}
          <text x="${padX}" y="${height - 8}">Today</text>
          <text x="${width - padX - 54}" y="${height - 8}">Year ${years}</text>
        </svg>
        <div class="comparison-legend">
          <span><i class="rent-key"></i>Rent path <strong>${currency(rent)} &rarr; ${currency(last.rent)}</strong></span>
          <span><i class="buy-key"></i>Entered buy payment <strong>${currency(buyPayment)}</strong></span>
        </div>
      </div>
    </div>
    <div class="calculator-analysis-panel" data-analysis-panel="comparison">
      <div class="rent-buy-year-tabs">
        <div class="comparison-chart-header"><strong>Partial horizon comparison</strong><p>This view compares monthly payments only; it is not a buy-versus-rent recommendation.</p></div>
        <div class="rent-buy-year-buttons" role="tablist" aria-label="Rent versus buy payment horizon">
          ${comparisonYears.map((year) => `<button class="${year === selectedYear ? "active" : ""}" type="button" data-rent-buy-year="${year}">${year} years</button>`).join("")}
        </div>
        ${comparisonPanels}
      </div>
    </div>
  </div>`;
}

function calculatorResultVisual({ title, payment, points, kind, metricLabel, note, principal = 0, monthlyRate = 0, months = 360, availableCash = 0, productLabel = "Selected product", downPaymentAssumption = 0, closingCosts = 0, dpaAssistance = 0, baseRequired = payment }) {
  if (kind === "payment") {
    return calculatorTabbedPanel({
      kind,
      chartHtml: resultDonutMarkup({ title, payment, points, kind, metricLabel }),
      amortizationHtml: amortizationPanel({ principal, monthlyRate, months }),
      scheduleHtml: schedulePanel({ principal, monthlyRate, months }),
    });
  }
  if (kind === "downPayment") {
    return downPaymentReadinessBar({ required: payment, available: availableCash, productLabel, downPaymentAssumption, closingCosts, dpaAssistance, baseRequired });
  }
  return `<div class="calculator-result-summary">
    <span>${esc(metricLabel)}</span>
    <strong>${currency(payment)}</strong>
    <p>${esc(note)}</p>
  </div>`;
}

function resultDonutMarkup({ title, payment, points, kind, metricLabel }) {
  const colors = ["#78c257", "#2478bd", "#f5a400", "#11bfb3", "#dc475c"];
  const cleanPoints = points
    .map((point, index) => ({
      label: point.label,
      value: Math.max(0, Math.round(Number(point.value) || 0)),
      color: colors[index % colors.length],
    }))
    .filter((point) => point.value > 0);
  const total = cleanPoints.reduce((sum, point) => sum + point.value, 0);
  let cursor = 0;
  const segments = total > 0 ? cleanPoints.map((point) => {
    const rawShare = (point.value / total) * 100;
    const share = Math.max(rawShare - 0.85, 0.75);
    const offset = -cursor;
    cursor += rawShare;
    return `<circle class="calculator-donut-segment" cx="60" cy="60" r="48" pathLength="100" style="--segment-color:${point.color};--segment-share:${share};--segment-offset:${offset};" />`;
  }).join("") : "";
  return `<div class="calculator-donut-card">
    <label class="calculator-accessibility-toggle"><input type="checkbox" /> Enable color patterns for accessibility</label>
    <div class="calculator-donut" role="img" aria-label="${esc(title)} ${currency(payment)}. ${cleanPoints.map((point) => `${point.label}: ${currency(point.value)}`).join(". ")}">
      <svg class="calculator-donut-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="calculator-donut-track" cx="60" cy="60" r="48" pathLength="100" />
        ${segments}
      </svg>
      <div class="calculator-donut-center">
        <span>${esc(metricLabel)}</span>
        <strong>${currency(payment)}</strong>
      </div>
    </div>
    <div class="calculator-donut-cta">
      <strong>Want to compare this estimate with lender-reviewed terms?</strong>
      <button class="button estimate-button" type="button" data-cta-action="prequal">Review prequalification details &rsaquo;</button>
    </div>
  </div>`;
}

function disclosureFor(pageType, title = "Disclosure notes") {
  const copy = {
    city: "Market figures and payment scenarios are educational planning information. Actual taxes, insurance, HOA dues, loan terms, APR, cash to close, and eligibility require property-specific and borrower-specific review.",
    state: "State and city comparisons are informational. Product availability, licensing, loan limits, taxes, insurance, and pricing can vary by county, property, borrower profile, and date.",
    product: "Loan products are subject to underwriting, program rules, property review, investor guidelines, and state or county limits. The guidance shown is not an approval or personalized credit offer.",
    calculator: "Calculator outputs are estimates based on the inputs shown. They are not a Loan Estimate, credit approval, rate lock, or commitment to lend.",
    article: "Editorial content is educational. A lender can review borrower, property, and loan details before you make a mortgage decision.",
    loan_officer: "Only the name and neutral education links are shown. Official identifiers, service details, availability, and direct contact information are not published here.",
    branch: "Only the branch name and neutral education links are shown. Public office and direct-contact details are not provided here.",
    directory: "Results are provided for browsing and are not rankings, endorsements, availability statements, or proof of professional qualifications."
  };
  return disclosureBlock(title, copy[pageType] || copy.product);
}

function faqBlock(items) {
  return `
    <div class="grid two">
      ${items.map((item) => `
        <div class="panel">
          <h3>${esc(item.q)}</h3>
          <p>${esc(item.a)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function ctaRule(pageType, sectionName) {
  return maps.ctaRules.find((rule) => rule.pageType === pageType && rule.section === sectionName) || {
    primary: "Review guidance options",
    secondary: "Compare options"
  };
}

const CTA_TYPES = {
  account: {
    eyebrow: "Account",
    title: "Open My Account",
    text: "Review the Snap Homes continuation notice. Items saved for this browsing session may continue in Snap Homes after a connected handoff exists.",
    label: "Open My Account",
    action: "account",
    iconName: "account"
  },
  leadForm: {
    eyebrow: "Guidance",
    title: "Review mortgage guidance options",
    text: "Open a notice explaining which details a mortgage professional may need. No message is sent.",
    label: "Review guidance options",
    action: "leadForm",
    iconName: "leadForm"
  },
  prequal: {
    eyebrow: "Prequal",
    title: "Review prequalification details",
    text: "See which borrower, property, and timing details a lender may review. The generic modal collects and submits nothing.",
    label: "Review prequalification",
    action: "prequal",
    iconName: "prequal"
  },
  watchlist: {
    eyebrow: "Watchlist",
    title: "Add to this session's watchlist",
    text: "Keep this item for this browsing session. Saved research may continue in Snap Homes after a connected handoff exists.",
    label: "Add to watchlist",
    action: "watchlist",
    iconName: "watchlist"
  },
  loContact: {
    eyebrow: "Loan officer",
    title: "Review loan officer contact options",
    text: "Open a notice for market, product, and payment questions. No message is sent.",
    label: "Review contact options",
    action: "loContact",
    iconName: "expert"
  },
  rateReview: {
    eyebrow: "Rate review",
    title: "Review rate details",
    text: "See which details may affect rate, APR, points, and fees. No review request is sent.",
    label: "Review rate details",
    action: "rateReview",
    iconName: "rates"
  },
  compareOffer: {
    eyebrow: "Compare offer",
    title: "Compare an existing offer",
    text: "Organize rate, APR, points, fees, loan amount, and assumptions. No documents or questions are sent.",
    label: "Compare an offer",
    action: "compareOffer",
    iconName: "compare"
  }
};

const CTA_MODALS = {
  account: {
    title: "Continue to Snap Homes",
    body: `${SNAP_CUSTOMER.name}, this notice does not open or sync an account. Watchlist items remain in this browsing session and may continue in Snap Homes after a connected handoff exists.`,
    primary: "Close"
  },
  leadForm: {
    title: "Mortgage guidance options",
    body: "A mortgage professional may need your goals, property, timing, and questions to provide guidance. This modal collects nothing. No message is sent.",
    primary: "Close"
  },
  prequal: {
    title: "Prequalification details",
    body: "A lender may review borrower, property, income, asset, and timing details. No information is collected or submitted in this modal, and no credit decision, approval, rate lock, or commitment to lend occurs.",
    primary: "Close"
  },
  rateReview: {
    title: "Rate review details",
    body: "Personalized rates, APR, points, fees, and payments depend on borrower facts, property details, loan terms, and market conditions. This notice sends no rate-review request.",
    primary: "Close"
  },
  compareOffer: {
    title: "Compare an offer",
    body: "Compare the rate, APR, points, fees, loan amount, and assumptions. Documents are not collected or reviewed here, no request is sent, and no savings are promised.",
    primary: "Close"
  },
  loContact: {
    title: "Loan officer contact options",
    body: "Direct phone, email, and contact-form details are not provided in this experience. No message is sent.",
    primary: "Close"
  }
};

function ctaConfig(type, overrides = {}) {
  return { ...(CTA_TYPES[type] || CTA_TYPES.leadForm), ...overrides };
}

function ctaButton(type, overrides = {}) {
  const config = ctaConfig(type, overrides);
  const variant = config.variant ? ` ${config.variant}` : "";
  if (config.action === "watchlist") {
    return `<button class="button${variant}" type="button" data-save-action data-save-label="${esc(config.saveLabel || config.label)}">${esc(config.label)}</button>`;
  }
  if (config.action === "account") {
    return `<button class="button${variant}" type="button" data-account-action="open">${esc(config.label)}</button>`;
  }
  if (config.action) {
    return `<button class="button${variant}" type="button" data-cta-action="${esc(config.action)}">${esc(config.label)}</button>`;
  }
  return `<a class="button${variant}" href="${route(config.href)}">${esc(config.label)}</a>`;
}

function ctaTypeCard(type, overrides = {}) {
  const config = ctaConfig(type, overrides);
  const actionAttrs = config.action === "watchlist"
    ? `type="button" data-save-action data-save-label="${esc(config.saveLabel || config.label)}"`
    : config.action === "account"
      ? `type="button" data-account-action="open"`
      : `type="button" data-cta-action="${esc(config.action || "leadForm")}"`;
  return `
    <button class="cta-type-card" ${actionAttrs} style="--card-accent:${config.accent || "var(--snap-blue)"}">
      ${icon(config.iconName)}
      <span>${esc(config.eyebrow)}</span>
      <h3>${esc(config.title)}</h3>
      <p>${esc(config.text)}</p>
      <strong>${esc(config.label)} -></strong>
    </button>
  `;
}

function ctaDeck(types, title = "Choose a next step", text = "Keep an item for this session, review a guidance notice, or organize an offer comparison.") {
  return `
    <div class="cta-deck">
      <div class="cta-deck-copy">
        <p class="eyebrow">Next step options</p>
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
      </div>
      <div class="cta-type-grid">
        ${types.map((entry, index) => {
          const type = typeof entry === "string" ? entry : entry.type;
          const overrides = typeof entry === "string" ? {} : entry;
          return ctaTypeCard(type, { accent: accentColors[index % accentColors.length], ...overrides });
        }).join("")}
      </div>
    </div>
  `;
}

function contextualCta(title, text, types = ["leadForm", "watchlist"], className = "") {
  return `
    <div class="cta-panel ${className}">
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      <div class="cta-inline-actions">
        ${types.map((entry, index) => {
          const type = typeof entry === "string" ? entry : entry.type;
          const overrides = typeof entry === "string" ? {} : entry;
          return ctaButton(type, { variant: index === 0 ? "" : "secondary", ...overrides });
        }).join("")}
      </div>
    </div>
  `;
}

function gatedAnswer({ title, answer, unlockTitle = "Personalize this answer", unlockText, types = ["account", "leadForm"] }) {
  return `
    <div class="answer-unlock">
      <div class="answer-public">
        <p class="eyebrow">What you can learn here</p>
        <h3>${esc(title)}</h3>
        <p>${esc(answer)}</p>
      </div>
      <div class="unlock-panel">
        ${icon("lock")}
        <div>
          <h3>${esc(unlockTitle)}</h3>
          <p>${esc(unlockText)}</p>
          <div class="cta-inline-actions">
            ${types.map((type, index) => ctaButton(type, { variant: index === 0 ? "" : "secondary" })).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function modulesForRoute(parentRoute) {
  return maps.modulesByParent[normalizeRoute(parentRoute)] || [];
}

function productSources(productId) {
  if (productId === "product-fha") return ["hudFha", "regZ"];
  if (productId === "product-va") return ["vaLoans", "regZ"];
  if (productId === "product-jumbo" || productId === "product-conventional") return ["fhfaLimits", "regZ"];
  if (productId === "product-home-equity") return ["internalPricing", "regZ"];
  return ["internalPricing", "regZ"];
}

function locationProductModules(parentRoute, contextLabel) {
  const modules = modulesForRoute(parentRoute);
  if (!modules.length) return "";
  const cards = modules.map((module, index) => {
    const product = maps.products[module.productId];
    const state = maps.states[module.stateId];
    const city = module.cityId ? maps.cities[module.cityId] : null;
    const location = city ? `${city.name}, ${state.abbr}` : state?.name || contextLabel;
    const anchor = String(module.anchor || `#${slugify(module.name)}`).replace(/^#/, "");
    const brief = productBriefs[product?.id] || productBriefs["product-purchase"];
    return `
      <article class="local-product-module" id="${esc(anchor)}" style="--card-accent:${accentColors[index % accentColors.length]}">
        <div>
          <p class="eyebrow">${esc(location)}</p>
          <h3>${esc(module.name)}</h3>
          <p>${esc(brief.fit)} Local price, taxes, insurance, and loan-limit details can change the conversation.</p>
        </div>
        <div class="module-metrics">
          ${metric("Product", product?.name || "Loan option")}
          ${metric("Market", location)}
        </div>
        <div class="module-actions">
          <a class="button" href="${route(product?.route || "/loan-options")}">View product guide</a>
          <a class="button secondary" href="${route("/calculators/mortgage-payment")}">Estimate payment</a>
          ${ctaButton("watchlist", { variant: "secondary" })}
        </div>
        <div class="module-source">${sourceNote(productSources(product?.id || ""), "Product sources")}</div>
      </article>
    `;
  }).join("");

  return section("Local loan guidance", { label: "Loan options by location", text: "Compare each loan option against local prices, taxes, insurance, and loan-limit details." }, `<div class="module-list">${cards}</div>`, "compact");
}

function loanOfficerProfiles(count = 3) {
  return first(data.loanOfficers, count);
}

function editorialSection({ label = "Guide", title, intro, paragraphs = [], sideTitle = "What this helps with", sideItems = [], className = "" }) {
  return `
    <section class="section editorial-section ${className}">
      <div class="editorial-copy">
        <p class="eyebrow">${esc(label)}</p>
        <h2>${esc(title)}</h2>
        ${intro ? `<p class="editorial-lead">${esc(intro)}</p>` : ""}
        <div class="copy-columns">
          ${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
        </div>
      </div>
      <aside class="editorial-aside">
        <h3>${esc(sideTitle)}</h3>
        <ul>
          ${sideItems.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </aside>
    </section>
  `;
}

function insightBand(items) {
  return `
    <div class="insight-band">
      ${items.map((item) => `
        <div>
          <span>${esc(item.label)}</span>
          <strong>${esc(item.value)}</strong>
          <p>${esc(item.text)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function processRail(steps) {
  return `
    <div class="process-rail">
      ${steps.map((step, index) => `
        <article>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${esc(step.title)}</h3>
          <p>${esc(step.text)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function miniEssay(title, paragraphs) {
  return `
    <div class="mini-essay">
      <h3>${esc(title)}</h3>
      ${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
    </div>
  `;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value || "") : new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function newsCard(article) {
  const media = maps.newsMedia[article.imageId];
  const author = maps.contributors[article.authorId];
  const imageUrl = media?.localPath || media?.imageUrl;
  if (!imageUrl) return "";
  return `
    <article class="news-card">
      <a class="news-card-media" href="${route(article.route)}" data-news-article-id="${esc(article.id)}">
        <img src="${esc(imageUrl)}" alt="${esc(media.alt)}" loading="lazy" decoding="async" style="object-position:${esc(media.focalPoint || "50% 50%")}" />
        <span class="news-card-topic">${esc(article.relevanceLabel)}</span>
      </a>
      <div class="news-card-body">
        ${(article.sourceLabels || []).length ? `<p class="news-card-meta">${esc(article.sourceLabels.join(" + "))}</p>` : ""}
        ${renderContributorBylineMarkup(article, author ? [author] : [], { compact: true, routeHref: route })}
        <h3><a href="${route(article.route)}" data-news-article-id="${esc(article.id)}">${esc(article.title)}</a></h3>
        <p>${esc(article.previewText)}</p>
        <a class="text-link" href="${route(article.route)}" data-news-article-id="${esc(article.id)}">Read more</a>
      </div>
    </article>`;
}

function locationNewsFeed(location) {
  const articles = maps.newsByLocation[location.id] || [];
  if (articles.length !== 4 || articles.some((article) => !maps.newsMedia[article.imageId])) return "";
  const title = location.id.startsWith("state-")
    ? `Latest ${location.name} mortgage and housing updates`
    : `Latest ${location.name} market updates`;
  return `
    <section class="section location-news-section" aria-labelledby="location-news-${esc(location.id)}">
      <div class="section-header">
        <div><p class="eyebrow">Local reporting</p><h2 id="location-news-${esc(location.id)}">${esc(title)}</h2></div>
        <div class="news-carousel-controls" aria-label="News carousel controls">
          <button type="button" class="icon-button" data-news-carousel="previous" aria-label="Previous updates">&larr;</button>
          <button type="button" class="icon-button" data-news-carousel="next" aria-label="Next updates">&rarr;</button>
        </div>
      </div>
      <div class="news-carousel" data-news-carousel-track tabindex="0">${articles.map(newsCard).join("")}</div>
    </section>`;
}

function modalShell() {
  return `
    <div class="modal-backdrop" data-modal hidden>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" type="button" aria-label="Close" data-modal-close>&times;</button>
        <p class="eyebrow" data-modal-eyebrow>Snap Homes</p>
        <h2 id="modal-title" data-modal-title></h2>
        <p data-modal-body></p>
        <div class="modal-actions" data-modal-actions></div>
      </div>
    </div>
    <div class="article-modal-backdrop" data-article-modal hidden>
      <section class="article-modal" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
        <button class="modal-close" type="button" aria-label="Close article" data-article-modal-close>&times;</button>
        <h2 id="article-modal-title" class="visually-hidden" data-article-modal-title>Article</h2>
        <div class="article-modal-scroll" data-article-modal-content></div>
      </section>
    </div>
    <div class="toast" data-toast hidden></div>
  `;
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

function currentPageFreshness() {
  const found = maps?.routes?.get(currentPath());
  if (!found) return "";
  const canonicalTopicHub = (editorialContent.topicHubs || []).find(
    (hub) => hub.public === true && normalizeRoute(hub.route) === currentPath(),
  );
  return renderContentFreshness(publicFreshnessRecord(found), {
    canonicalTopicHub,
    productCopyBundle,
    evergreen: true,
  });
}

function pageShell(content) {
  return `<div data-page-content data-design-system="snap-figma-v1">${header()}<main id="main" class="page" tabindex="-1">${content}${currentPageFreshness()}</main>${footer()}</div>${modalShell()}`;
}

function homeReadingItems(limit = 10) {
  const articleItems = first(data.articles || [], Math.ceil(limit * 0.7)).map((article) => ({
    kind: "article",
    title: article.title,
    text: article.summary || article.dek || article.previewText || "Read practical mortgage guidance connected to local markets, loan options, and borrower decisions.",
    href: article.route,
    label: "Article",
    linkLabel: "Read more",
  }));
  const blogItems = (data.blogPages || [])
    .filter((page) => page.route && page.route !== "/learning-center")
    .map((page) => ({
      kind: "blog",
      title: page.name,
      text: page.purpose || page.description || "Explore related guides, calculators, and next steps.",
      href: page.route,
      label: "Learning guide",
      linkLabel: "Open topic",
    }));

  return articleItems.concat(blogItems).slice(0, limit);
}

function homeReadingCard(item, index) {
  return `
    <article class="card home-reading-card" style="--card-accent:${accentColors[(index + 2) % accentColors.length]}">
      <div class="card-icon">${icon(item.kind === "blog" ? "guide" : "article")}</div>
      <p class="home-reading-type">${esc(item.label)}</p>
      <h3><a href="${route(item.href)}">${esc(item.title)}</a></h3>
      <p>${esc(item.text)}</p>
      <a class="text-link" href="${route(item.href)}">${esc(item.linkLabel)}</a>
    </article>`;
}

function homeReadingCarousel() {
  const items = homeReadingItems(10);
  return `
    <div class="home-reading-carousel-shell" data-news-carousel-root data-home-reading-carousel>
      <div class="news-carousel home-reading-carousel" data-news-carousel-track tabindex="0" aria-label="Helpful mortgage articles and topic guides">
        ${items.map(homeReadingCard).join("")}
      </div>
      <div class="news-carousel-controls home-reading-controls" aria-label="Helpful reads carousel controls">
        <button type="button" class="icon-button" data-news-carousel="previous" aria-label="Previous reads">&larr;</button>
        <button type="button" class="icon-button" data-news-carousel="next" aria-label="Next reads">&rarr;</button>
      </div>
    </div>`;
}
function homePage() {
  const goalCards = [
    { title: "Buy a house", text: "Compare purchase options, monthly costs, and the cash you may need before choosing a home.", href: "/buy", iconName: "home", accent: accentColors[0], linkLabel: "Plan a purchase" },
    { title: "Refinance my home", text: "Compare your current mortgage with a new rate, term, payment, or cash-out direction.", href: "/refinance", iconName: "rates", accent: accentColors[1], linkLabel: "Review refinancing" },
    { title: "Use home equity", text: "Learn how home equity options may change payment, cash flow, and long-term cost.", href: "/home-equity", iconName: "calculator", accent: accentColors[2], linkLabel: "Explore home equity" },
    { title: "Calculate payments", text: "Estimate principal, interest, taxes, insurance, and other monthly housing costs.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[3], linkLabel: "Calculate a payment" },
    { title: "See current rates", text: "Compare rates, APR, points, payment, upfront costs, and longer-run borrowing cost.", href: "/rates", iconName: "rates", accent: accentColors[4], linkLabel: "Compare rates" },
    { title: "Browse loan officer profiles", text: "Review available profiles and choose whose mortgage options you want to explore.", href: "/loan-officers", iconName: "expert", accent: accentColors[5], linkLabel: "Browse profiles" }
  ];

  const productCards = first(data.products, 4).map((product, index) =>
    card({
      title: product.name,
      text: productBriefs[product.id]?.fit || product.borrowerGoal,
      href: product.route,
      iconName: index % 2 ? "rates" : "home",
      accent: accentColors[index % accentColors.length],
      linkLabel: "View guide"
    })
  );

  return pageShell(`
    ${renderCampaignHero()}
    ${section("I want to ...", { label: "Choose your next step", text: "Start with the decision in front of you and move directly to the matching tools and guidance." }, `<div class="grid three">${goalCards.map(card).join("")}</div>`, "home-paths")}
    <section class="section compact home-primary-actions" aria-labelledby="home-primary-actions-title">
      <div><p class="eyebrow">Ready to compare?</p><h2 id="home-primary-actions-title">Put your mortgage options in motion.</h2><p>Start with prequalification or organize the terms from an offer you already have.</p></div>
      <div class="home-primary-action-buttons">
        ${ctaButton("prequal", { label: "Start your auto-prequal" })}
        ${ctaButton("compareOffer", { label: "Compare Your Offer", variant: "secondary" })}
      </div>
    </section>
    ${section("Loan options", { label: "Products", text: "Compare purchase, refinance, FHA, VA, and other options with tools and local factors nearby." }, `<div class="grid four">${productCards.join("")}</div>`, "compact product-shelf")}
    ${renderHomeStateExplorer(data.states)}
    ${section("Helpful next reads", { label: "Learning center", text: "Read articles and topic guides that connect market questions, loan options, calculators, and facts a lender may review." }, homeReadingCarousel(), "compact reading-shelf")}
  `);
}

function illustrativeLocationSnapshotNotice() {
  return `<aside class="disclosure planning-assumption" data-location-snapshot-assumption>
    <h3>Check current local costs before you decide</h3>
    <p>The prices, payments, inventory, property taxes, insurance costs, and time-on-market figures shown here are examples for exploring how a mortgage may fit your budget. They are not current market facts, a rate quote, or property-specific costs. Confirm today's figures for the location and property you are considering before choosing a loan or making an offer.</p>
  </aside>`;
}

function locationsPage() {
  const stateCards = data.states.map((state, index) =>
    card({
      title: `${state.name} mortgage market`,
      text: stateBriefs[state.id] || state.stateNarrative,
      href: state.route,
      iconName: "location",
      accent: accentColors[index % accentColors.length],
      linkLabel: "Open state"
    })
  );

  const cityRows = first(data.cities, 12).map((city) => {
    const state = maps.states[city.stateId];
    return [
      `<a class="text-link" href="${route(city.route)}">${esc(city.name)}, ${esc(state.abbr)}</a>`,
      esc(city.marketSnapshot.medianHomePrice),
      esc(city.marketSnapshot.paymentScenario),
      esc(city.marketSnapshot.inventory),
      esc(formatDaysOnMarket(city.marketSnapshot.daysOnMarket))
    ];
  });

  return pageShell(`
    ${renderLocationsHero(data.states)}
    ${editorialSection({
      label: "Compare markets with the payment in view",
      title: "Start broad, then narrow to the market that changes the payment.",
      intro: "Compare how price, taxes, insurance, inventory, and loan limits may change the full housing payment before choosing a market.",
      paragraphs: [
        "A mortgage payment can change quickly when price, taxes, insurance, inventory, and local loan-limit rules change. Compare those variables across states before narrowing to a city.",
        "Start with the statewide baseline, then review city price trends, payment scenarios, loan options, articles, and neutral professional-profile links.",
        "The snapshot figures are illustrative examples. Use the dated local reporting and current property-specific information before relying on a price, payment, inventory, tax, or insurance figure."
      ],
      sideTitle: "Borrower questions",
      sideItems: [
        "How does this market affect monthly payment?",
        "Which loan paths may fit the local price range?",
        "Which public guides and professional names can I review?",
        "What tax or insurance costs should I understand?"
      ]
    })}
    ${section("Market decision signals", { label: "Location intelligence", text: "These signals help you compare the cost factors that can change a mortgage payment." }, insightBand([
      { label: "Payment", value: "Monthly estimate", text: "Payment estimates pair price with taxes, insurance, rate assumptions, and loan type." },
      { label: "Inventory", value: "Market pace", text: "Inventory and days on market help borrowers understand timing without making predictions." },
      { label: "Local costs", value: "Tax and insurance", text: "Escrow assumptions stay close to payment scenarios." },
      { label: "Next step", value: "Lender review", text: "A lender must confirm borrower, property, product, and pricing details." }
    ]) + illustrativeLocationSnapshotNotice(), "modern-band")}
    ${section("Compare states", { label: "Market overview", text: "Review statewide costs before comparing individual city guides." }, `<div class="grid four">${stateCards.join("")}</div>`)}
    ${section("Compare cities", { label: "Cities", text: "Compare example prices, payments, inventory, local reporting, loan options, and professional names for each city." }, table(["City", "Median price", "Payment scenario", "Inventory", "Days on market"], cityRows), "compact")}
    ${section("Keep market research together", { label: "Watchlist", text: "Track cities and payment assumptions for this browsing session only." }, ctaDeck(["watchlist", "leadForm", "prequal"], "Keep location research organized.", "Add a market to this session's watchlist or open guidance and prequalification notices. The notices collect and send nothing."), "compact")}
    ${section("Verify current market facts", { label: "Official sources", text: "Use these public sources to check current housing, employment, and mortgage-market conditions. The illustrative snapshot values above are not drawn from them." }, `${sourceNote(["fhfaHpi", "census", "bls", "hmda"], "Official market references")}`, "compact")}
  `);
}

function ratesPage() {
  const rows = rateBenchmarks.map((rate) => {
    const source = sources[rate.sourceId];
    return [
      esc(rate.label),
      `<strong>${esc(rate.rate)}</strong>`,
      esc(rate.apr),
      esc(rate.points),
      esc(source?.name || "Source"),
      `<a class="text-link" href="${route(rate.next)}">Next step</a>`
    ];
  });

  return pageShell(`
    ${renderRatesMarketplace({ fixture: ratesMarketplaceFixture })}
    ${editorialSection({
      label: "Before you compare",
      title: "Know what is included before you compare rates.",
      intro: "A mortgage rate can look simple at first glance. The real comparison includes APR, points, fees, loan type, lock timing, and the assumptions behind the number.",
      paragraphs: [
        "National averages are useful for understanding the direction of the market, but they are not the same thing as a quote for your loan. Use them as one input before you run a payment scenario.",
        "Your actual pricing can depend on credit profile, loan amount, property type, occupancy, location, down payment, discount points, lock period, and market conditions.",
        "Once you have a benchmark, estimate the monthly payment and compare it with lender-provided terms that reflect the borrower and property."
      ],
      sideTitle: "Compare these first",
      sideItems: [
        "Interest rate and APR",
        "Points and lender credits",
        "Loan amount and down payment",
        "Taxes and insurance",
        "Lock period and next steps"
      ]
    })}
    ${section("Current rate benchmarks", { label: "Benchmarks", text: "Freddie Mac benchmark rates anchor the public market view; personalized quotes require lender review." }, `<div class="grid three">${rateBenchmarks.map((rate, index) => `<div class="metric"><span>${esc(rate.label)}</span><strong>${esc(rate.rate)}</strong><p>${esc(rate.apr)} | ${esc(rate.points)} | ${esc(sources[rate.sourceId].date)}</p></div>`).join("")}</div>${marketSnapshotReference("rates_snapshot", "rates-mortgage")}`)}
    ${section("From benchmark to borrower scenario", { label: "From averages to terms", text: "Move from market data into a payment scenario, then compare lender-provided terms." }, processRail([
      { title: "Read the benchmark", text: "Use national data to understand market direction and the difference between averages and offers." },
      { title: "Choose assumptions", text: "Set loan purpose, state, credit range, term, down payment, loan amount, occupancy, and property type." },
      { title: "Model the payment", text: "Move the rate into a payment estimate with taxes, insurance, and cash-to-close assumptions." },
      { title: "Compare lender terms", text: "A lender can compare options only after reviewing the borrower's and property's actual facts." }
    ]), "compact")}
    <section class="section compact" id="rate-table">
      <div class="content-layout">
        <div class="main-stack">
          ${section("Compare rate types", { label: "Rate table", text: "Start with the benchmark, then move into a payment estimate or lender review." }, table(["Loan type", "Rate", "APR", "Points", "Source", "Next step"], rows), "no-pad")}
          ${marketChart("rates.benchmark_trend", "rates-mortgage")}
        </div>
        <aside class="side-stack">
          ${contextualCta("Review your rate question", "Open notices describing the credit, loan, property, occupancy, down-payment, and location details a lender may need. No request is sent.", ["rateReview", "compareOffer", "loContact"])}
          ${disclosureFor("calculator", "Rate and APR disclosure")}
        </aside>
      </div>
    </section>
    ${section("Get a borrower-specific rate review", { label: "Personalized review", text: "Benchmarks stay public; personalized pricing requires borrower and property details." }, `${gatedAnswer({
      title: "What rate could I receive?",
      answer: "The benchmark guidance explains market movement, APR, points, fees, lock timing, and payment assumptions. A personalized rate or APR requires borrower, property, and lender review.",
      unlockTitle: "Review the facts a lender may need",
      unlockText: "The notice lists loan purpose, state, credit range, down payment, loan amount, occupancy, and property type. It collects and sends nothing.",
      types: ["rateReview", "compareOffer"]
    })}`, "compact")}
    ${section("Local rate factors", { label: "Local factors", text: "Rate decisions are easier to review when paired with tax, insurance, and local market details." }, `<div class="grid four">${data.states.map((state, index) => card({ title: `${state.name} mortgage details`, text: stateBriefs[state.id] || state.stateNarrative, href: state.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Open location" })).join("")}</div>`, "compact")}
    ${section("Rate methodology", { label: "Sources", text: "See what is included, what is not, and when to request a personalized review." }, `<div class="essay-grid">${miniEssay("What the table discloses", [
      "Benchmark rates show public market data. Personalized pricing identifies APR, points, fees, lock period, loan amount, down payment, occupancy, property type, and source date when displayed.",
      "Payment examples keep taxes, insurance, mortgage insurance, HOA dues, and closing-cost assumptions close to the result."
    ])}${miniEssay("Use a benchmark in your comparison", [
      "Use benchmarks to understand market direction, then use a calculator to test the payment impact.",
      "Lender-provided terms are the useful next comparison when weighing products, high-cost purchases, or refinance tradeoffs."
    ])}</div>`, "modern-band")}
  `);
}

function statePage(state) {
  const cities = byIds(state.cityIds, maps.cities);
  const branches = byIds(state.branchIds, maps.branches);
  const products = byIds(state.featuredProductIds, maps.products);
  const stateCta = ctaRule("state", "hero");
  const primaryRoute = cities[0]?.route || "/rates";
  const primaryLabel = cities.length ? stateCta.primary : "Review rates";
  const cityTable = cities.length
    ? table(["City", "Median price", "Payment", "Tax", "Insurance"], cities.map((city) => [`<a class="text-link" href="${route(city.route)}">${esc(city.name)}</a>`, esc(city.marketSnapshot.medianHomePrice), esc(city.marketSnapshot.paymentScenario), esc(city.marketSnapshot.taxRate), esc(city.marketSnapshot.insurance)]))
    : `<div class="panel"><h2>Statewide planning</h2><p>Compare local price, payment, insurance, and loan options when a city-level guide is not provided for this state.</p></div>`;
  return pageShell(`
    ${breadcrumb(["Locations", state.name], ["/locations", state.route])}
    ${hero({
      eyebrow: "State guide",
      title: `${state.name} mortgage guide`,
      lead: `${stateBriefs[state.id] || state.stateNarrative} Treat the price, payment, inventory, tax, and insurance figures below as illustrative examples rather than current market facts; branch and loan-officer names are browsing links only.`,
      actions: `<a class="button" href="${route(primaryRoute)}">${esc(primaryLabel)}</a><a class="button secondary" href="${route("/rates")}">${esc(stateCta.secondary)}</a>`,
      panel: `<aside class="hero-panel"><h2>Example state costs</h2><div class="grid two">${metric("Median price", state.marketSnapshot.medianHomePrice)}${metric("Payment", state.marketSnapshot.paymentScenario)}${metric("Inventory", state.marketSnapshot.inventory)}${metric("Data status", "Illustrative example")}</div>${illustrativeLocationSnapshotNotice()}</aside>`
    })}
    ${locationNewsFeed(state)}
    ${editorialSection({
      label: "State brief",
      title: `${state.name} mortgage planning starts with local cost drivers.`,
      intro: "Use the statewide examples to identify the mortgage questions worth reviewing with current market and property information.",
      paragraphs: [
        `${state.name} borrowers may compare the same loan product across very different city conditions. Dated statewide evidence can put price, payment, property tax, insurance, and inventory beside individual cities.`,
        "Loan-limit details matter. Conventional, jumbo, FHA, and VA conversations can change when county limits, entitlement, property type, or borrower profile changes.",
        "Use the dated reporting below to understand broad conditions, then confirm the property's current price, taxes, insurance, association dues, and loan terms before making a comparison."
      ],
      sideTitle: "What to review",
      sideItems: [
        "Market snapshot",
        "City comparison",
        "Tax and insurance costs",
        "Loan-limit table",
        "Neutral branch and loan-officer links"
      ]
    })}
    <section class="section">
      <div class="content-layout">
        <div class="main-stack">
          ${cityTable}
          <div class="chart-stack">
            ${marketChart("market.price_trend", state.id)}
            ${marketChart("market.location_compare", state.id)}
          </div>
        </div>
        <aside class="side-stack">
          <div class="cta-panel"><h3>${cities.length ? "Compare a city" : "Review statewide options"}</h3><p>${cities.length ? "Open a city guide for payment scenarios plus tax and insurance notes." : "Use the statewide view to compare rates, loan options, and a payment estimate before lender review."}</p><div class="cta-inline-actions"><a class="button" href="${route(primaryRoute)}">${cities.length ? "Open city" : "Review rates"}</a>${ctaButton("watchlist", { variant: "secondary" })}</div></div>
          ${disclosureFor("state", "State disclosure")}
        </aside>
      </div>
    </section>
    ${section("Loan limits and economy", { label: "Market drivers", text: "Tables and charts explain why location changes the mortgage conversation." }, insightBand([
      { label: "Conforming", value: "County limits", text: "FHFA limits help explain conventional versus jumbo conversations." },
      { label: "FHA", value: "HUD limits", text: "FHA county limits shape lower down payment planning." },
      { label: "Income", value: "ACS data", text: "Income and household data help frame affordability, not eligibility." },
      { label: "Labor", value: "BLS trend", text: "Employment data can help explain local income stability and housing demand." }
    ]) + sourceNote(["fhfaLimits", "hudFha", "census", "bls"], "State data sources"), "modern-band")}
    ${section("State product guidance", { label: "Loan options", text: "Review each loan option, then compare how local factors may change the numbers." }, `<div class="grid four">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View product" })).join("")}</div>`, "compact")}
    ${section("Keep this state in view", { label: "Watchlist", text: "Keep statewide market notes for this browsing session." }, ctaDeck(["watchlist", "rateReview", "leadForm"], `Keep ${state.name} research in this session's Watchlist.`, "Track the market for this session or open rate and guidance notices. No review or message is sent."), "compact")}
    ${locationProductModules(state.route, state.name)}
    ${section("Branch names", { label: "Related links", text: "Browse name-only branch entries. Public office and direct-contact details are not provided." }, `<div class="grid three">${branches.map((branch, index) => card({ title: branch.name, text: "Open the name-only branch entry and neutral mortgage education links.", href: branch.route, iconName: "branch", accent: accentColors[index % accentColors.length], linkLabel: "Open branch" })).join("")}</div>`, "compact")}
    ${section("State FAQ", { label: "Borrower questions", text: "Get practical answers with source notes nearby." }, `${faqBlock([
      { q: `How do I compare ${state.name} cities?`, a: "Start with payment, property tax, insurance, inventory, and loan limits before comparing loan options." },
      { q: "Can statewide data tell me which loan I qualify for?", a: "No. It can explain loan options and local factors, but eligibility and pricing require borrower, property, and lender review." }
    ])}`, "compact")}
  `);
}

function cityPage(city) {
  const state = maps.states[city.stateId];
  const officers = byIds(city.loanOfficerIds, maps.loanOfficers);
  const branches = byIds(city.branchIds, maps.branches);
  const products = byIds(city.productIds, maps.products);
  const articles = byIds(city.articleIds, maps.articles);
  const nearby = byIds(city.nearbyCityIds, maps.cities);
  const heroCta = ctaRule("city", "hero");
  return pageShell(`
    ${breadcrumb(["Locations", state.name, city.name], ["/locations", state.route, city.route])}
    ${hero({
      eyebrow: "City market guide",
      title: `${city.name}, ${state.abbr} mortgage and housing planning guide`,
      lead: `This planning guide organizes price, payment, inventory, tax, insurance, and days-on-market questions for ${city.name}. Every snapshot value is an illustrative example, not a quote, current market fact, or property-specific cost.`,
      actions: `${ctaButton("prequal", { label: heroCta.primary })}${ctaButton("watchlist", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Illustrative market snapshot</h2><div class="grid two">${metric("Median price", city.marketSnapshot.medianHomePrice)}${metric("Payment", city.marketSnapshot.paymentScenario)}${metric("Inventory", city.marketSnapshot.inventory)}${metric("Days on market", formatDaysOnMarket(city.marketSnapshot.daysOnMarket))}</div>${illustrativeLocationSnapshotNotice()}</aside>`
    })}
    ${locationNewsFeed(city)}
    ${editorialSection({
      label: "Local cost read",
      title: `${city.name} costs can change the mortgage conversation.`,
      intro: "Use current local price, inventory, tax, and insurance information to understand how a market can shape a payment scenario.",
      paragraphs: [
        `In ${city.name}, the home price is only the starting point. Monthly cost can also depend on your rate, down payment, property taxes, insurance, mortgage insurance, HOA dues, and loan type.`,
        "Inventory and days on market can affect how early you prepare documents, compare payments, and talk through offer timing with your real estate and mortgage team.",
        "Compare dated evidence for nearby cities, estimate a payment with current property costs, and review relevant loan options. A lender must review borrower and property facts before stating terms."
      ],
      sideTitle: "Check before you choose",
      sideItems: [
        "Local price range",
        "Estimated monthly payment",
        "Tax and insurance pressure",
        "Relevant loan options",
        "Neutral profile and branch links"
      ]
    })}
    <section class="section">
      <div class="content-layout">
        <div class="main-stack">
          <div class="chart-stack">
            ${marketChart("market.price_trend", city.id)}
            ${marketChart("market.payment_breakdown", city.id)}
          </div>
          ${table(["Planning path", "Illustrative price input", "Cash input", "Next calculation", "What to compare"], [
            ["Starting budget", esc(city.marketSnapshot.medianHomePrice), "Enter your amount", "Run the payment calculator", "Taxes, insurance, HOA dues, and cash to close"],
            ["Government-loan review", esc(city.marketSnapshot.medianHomePrice), "Enter your amount", "Run the payment calculator", "Program rules, mortgage insurance or funding fees, and local limits"],
            ["Larger-home comparison", "Adjust the price", "Enter your amount", "Run the payment calculator", "Sale proceeds, reserves, and cash to close"]
          ])}
        </div>
        <aside class="side-stack">
          ${contextualCta("Review market guidance options", `Open a notice describing the ${city.name} borrower and property details a lender may review. No message is sent.`, [
            { type: "loContact", href: officers[0]?.route || "/loan-officers", label: "Review contact options" },
            { type: "watchlist" },
            "leadForm"
          ])}
          ${disclosureFor("city", "City data disclosure")}
        </aside>
      </div>
    </section>
    ${section("Payment, inventory, and local cost signals", { label: "Interpretation", text: "Use these signals to decide what to compare next." }, insightBand([
      { label: "Payment", value: city.marketSnapshot.paymentScenario, text: "Review rate, taxes, insurance, PMI, HOA, and down payment assumptions." },
      { label: "Inventory", value: city.marketSnapshot.inventory, text: "Inventory can affect timing, preparation, and offer strategy." },
      { label: "Property tax", value: city.marketSnapshot.taxRate, text: "Tax assumptions belong inside payment planning rather than in a footnote." },
      { label: "Insurance", value: city.marketSnapshot.insurance, text: "Insurance cost and underwriting can materially affect monthly obligations." }
    ]), "modern-band")}
    ${section("Nearby city comparison", { label: "Compare", text: "Review nearby reporting and cost questions before settling on a payment scenario." }, `<div class="grid two">${nearby.map((near, index) => card({ title: `${near.name}, ${maps.states[near.stateId].abbr}`, text: "Compare sourced local reporting and illustrative cost inputs, then verify current property details.", href: near.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Compare" })).join("")}</div>`, "compact")}
    ${section("Review local answers", { label: "Personalized review", text: "Use citywide data for research; specific answers need borrower or account details." }, `${gatedAnswer({
      title: `How would ${city.name} affect my payment?`,
      answer: `This guide shows ${city.name} price, inventory, tax, insurance, and loan details. It cannot decide your exact payment, cash to close, product fit, or prequalification result.`,
      unlockTitle: "Keep the market or review prequalification details",
      unlockText: "Add this market to the watchlist for this browsing session, or open a prequalification notice. The notice collects and submits nothing.",
      types: ["watchlist", "prequal"]
    })}`, "compact")}
    ${section("Loan options in this market", { label: "Products", text: "Compare loan options against local price, tax, insurance, and loan-limit details." }, `<div class="grid four">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View guide" })).join("")}</div>`, "compact")}
    ${locationProductModules(city.route, `${city.name}, ${state.abbr}`)}
    ${section("Profile names, branch names, and updates", { label: "Related links", text: "Profile and branch entries show names and neutral education only; they do not establish qualifications, service, or contactability." }, `<div class="grid three">${officers.slice(0, 3).map((officer, index) => card({ title: officer.name, text: "Open the name-only profile and neutral mortgage education links.", href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "View profile" })).concat(branches.map((branch, index) => card({ title: branch.name, text: "Open the name-only branch entry and neutral mortgage education links.", href: branch.route, iconName: "branch", accent: accentColors[(index + 3) % accentColors.length], linkLabel: "View branch" }))).concat(articles.slice(0, 2).map((article, index) => card({ title: article.title, text: article.summary || article.dek || "Review dated local mortgage evidence and borrower questions.", href: article.route, iconName: "article", accent: accentColors[(index + 4) % accentColors.length], linkLabel: "Read" }))).join("")}</div>`, "compact")}
    ${section("City FAQ", { label: "Borrower questions", text: "Answers to practical questions, without turning education into personalized advice." }, `${faqBlock([
      { q: `What makes ${city.name} different for mortgage planning?`, a: `${city.name} has its own mix of price, payment, inventory, taxes, insurance, and relevant loan options.` },
      { q: "Where do I go next?", a: "Estimate payment, compare nearby cities, review local product guidance, or compare the result with lender-provided terms." }
    ])}`, "compact")}
  `);
}

function productPage(product, tagContext = tagContextForRoute(product.route)) {
  const relatedArticles = data.articles.filter((article) => (article.productIds || []).includes(product.id)).slice(0, 4);
  const relatedCities = data.cities.filter((city) => (city.productIds || []).includes(product.id)).slice(0, 4);
  const calculators = byIds(product.relatedCalculatorIds, maps.calculators);
  const profiles = loanOfficerProfiles();
  const brief = productBriefs[product.id] || productBriefs["product-purchase"];
  const fitAnswer = productFitAnswer(product);
  const productCopy = productContentById(productCopyBundle, product.id);
  return pageShell(`
    ${breadcrumb(["Loan Options", product.name], ["/loan-options", product.route])}
    ${hero({
      eyebrow: "Loan option",
      title: product.name,
      lead: `${fitAnswer.fitCriteria} ${fitAnswer.costsAndTradeoffs}`,
      actions: `${ctaButton("prequal", { label: "Review prequalification details" })}${ctaButton("compareOffer", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Key constraint</h2><p>${esc(fitAnswer.propertyAndOccupancy)}</p><div class="tag-row"><span class="tag">Fit criteria</span><span class="tag">Costs</span><span class="tag">Property</span><span class="tag">Lender review</span></div></aside>`,
      beforeTitle: renderPrimaryTagLinks(tagContext.primaryTags, route),
    })}
    ${renderProductContent(productCopy, { sources: editorialContent.sources, routeHref: route, tagContext })}
    ${tagContext.additionalTags.length ? `<div class="section compact content-tag-band">${renderAdditionalTagLinks(tagContext.additionalTags, route)}</div>` : ""}
    ${section("Requirements and tradeoffs", { label: "Product intelligence", text: "Compare the details that can change payment, cash to close, and product fit." }, table(["Area", "What to review", "Next action"], [
      ["Borrower fit", "Goal, timeline, property location, occupancy, and product constraints", `<a class="text-link" href="${route("/loan-officers")}">Browse profiles</a>`],
      ["Requirements", "Credit, income, assets, down payment, property type, and loan amount", `<a class="text-link" href="${route("/calculators/mortgage-payment")}">Estimate payment</a>`],
      ["Tradeoffs", "APR, points, mortgage insurance, fees, term, flexibility, and total cost", `<a class="text-link" href="${route("/loan-options")}">Compare products</a>`],
      ["Existing offer", "Rate, APR, points, fees, loan amount, assumptions, and questions", `<button class="text-link text-button" type="button" data-cta-action="compareOffer">Organize offer questions</button>`]
    ]))}
    ${section("Compare a planning scenario", { label: "Payment structure", text: "Use a simple scenario to see which amounts belong in the conversation before you compare actual loan terms." }, marketChart("product.scenario_compare", product.id), "compact")}
    ${section("Review product-fit answers", { label: "Public fit criteria", text: "Common fit indicators, principal costs, property constraints, and lender-review facts stay public before any action." }, `${gatedAnswer({
      title: `What should I compare for ${product.name}?`,
      answer: `${fitAnswer.fitCriteria} ${fitAnswer.costsAndTradeoffs} ${fitAnswer.propertyAndOccupancy} ${fitAnswer.lenderReview}`,
      unlockTitle: "Review what a lender may need next",
      unlockText: "The prequalification and offer-comparison notices collect and submit nothing. Use them only to organize the facts a lender may later request.",
      types: ["prequal", "compareOffer"]
    })}`, "compact")}
    ${section("Before choosing an option", { label: "Comparison steps", text: "Use the product guide to move from education into an informed comparison." }, processRail([
      { title: "Confirm the goal", text: "Purchase, refinance, cash-out, or equity access changes the questions to ask." },
      { title: "Review basics", text: "Credit profile, income, assets, debt, occupancy, property type, and loan size can affect the options a lender considers." },
      { title: "Model total cost", text: "Monthly payment is only one part; APR, points, insurance, taxes, and closing costs matter." },
      { title: "Compare lender terms", text: "A lender can compare options only after reviewing the borrower's actual scenario." }
    ]), "compact")}
    ${section("Calculators for this loan option", { label: "Tools", text: "Estimate the payment and cash questions that matter for this financing choice, then compare the result with a written loan offer." }, `<div class="grid three">${calculators.map((calc, index) => card({ title: calc.name, text: `Inputs include ${calc.captures.slice(0, 3).map(humanizePublicLabel).join(", ")}.`, href: calc.route, iconName: "calculator", accent: accentColors[index % accentColors.length], linkLabel: "Open calculator" })).join("")}</div>`, "compact")}
    ${section("Local product factors", { label: "Locations", text: "Property price, taxes, insurance, and loan limits can change the questions you bring to a lender." }, `<div class="grid four">${relatedCities.map((city, index) => card({ title: `${product.name} in ${city.name}`, text: city.marketPositioning, href: city.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Open city" })).join("")}</div>`, "compact")}
    ${section("Related learning", { label: "Learn more", text: "Product education connects to related mortgage guides, calculators, and local market questions." }, `<div class="grid two">${relatedArticles.map((article, index) => card({ title: article.title, text: article.summary || article.dek || "Review the decision, tradeoffs, and next questions.", href: article.route, iconName: "article", accent: accentColors[index % accentColors.length], linkLabel: "Read" })).join("")}</div>`, "compact")}
    ${section("Review this loan option", { label: "Next steps", text: "Open a notice, organize an offer, or keep the question for this browsing session." }, ctaDeck(["prequal", "rateReview", "compareOffer", "loContact", "watchlist"], "Compare the product with your own scenario.", "The notices collect and send nothing; the watchlist lasts only for this browsing session."), "compact")}
    ${section("Loan officer profiles and disclosures", { label: "Names only", text: "Profiles show names and neutral education links only; official identifiers, service details, and direct contact information are not published." }, `<div class="grid three">${profiles.map((officer, index) => card({ title: officer.name, text: "Open the name-only profile and general mortgage education links.", href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "View profile" })).join("")}</div><div style="margin-top:18px">${sourceNote(productSources(product.id), "Product sources")}</div><div style="margin-top:18px">${disclosureFor("product", "Product disclosure")}</div>`, "compact")}
  `);
}

function humanStatus(status) {
  return status ? "Mortgage guide" : "";
}

function learningDiscovery(model) {
  return `
    <section class="learning-discovery section compact" aria-label="Search and browse Learning Center topics">
      <form class="learning-search search-form" action="/learning-center/search" method="get" data-search-form data-search-scope="learning">
        <input name="q" aria-label="Search learning center" placeholder="Search FHA, taxes, Denver..." />
        <button class="button" type="submit">Search</button>
      </form>
      <nav class="learning-topic-tags tag-row" aria-label="Learning Center topics">
        ${model.topicLinks.map((topic) => `<a class="tag" href="${route(topic.route)}">${esc(topic.name)}</a>`).join("")}
      </nav>
    </section>
  `;
}

function renderContributorByline(article, { compact = false } = {}) {
  return renderContributorBylineMarkup(article, editorialContent.contributors, {
    compact,
    routeHref: route,
  });
}

function learningArticleCard(article, index) {
  const beat = maps.contributors[article.authorId]?.beat || humanizePublicLabel(article.articleType || article.type || "Mortgage guide");
  const preview = article.previewText || article.summary || article.dek || "Review the evidence, assumptions, and borrower questions behind this mortgage guide.";
  return `
    <article class="card learning-article-card editorial-article-card" style="--card-accent:${accentColors[index % accentColors.length]}">
      <a class="editorial-article-visual" href="${route(article.route)}" aria-label="Read ${esc(article.title)}">${icon("rates")}</a>
      <p class="editorial-card-label">${esc(beat)}</p>
      <h3><a href="${route(article.route)}">${esc(article.title)}</a></h3>
      <p class="editorial-card-meta">${esc(beat)}</p>
      <p>${esc(preview)}</p>
      ${renderContributorByline(article, { compact: true })}
      <a class="text-link editorial-card-link" href="${route(article.route)}">Read more <span aria-hidden="true">&rarr;</span></a>
    </article>
  `;
}

function renderContributorDirectoryCard(contributor) {
  return `
    <a class="contributor-directory-card editorial-contributor-card" href="${route(contributor.route)}">
      <img src="${esc(contributor.portrait.src)}" alt="${esc(contributor.portrait.alt)}" loading="lazy" decoding="async" data-contributor-portrait />
      <div class="contributor-directory-card-copy">
        <p class="contributor-beat">${esc(contributor.beat)}</p>
        <h2>${esc(contributor.name)}</h2>
        <p class="contributor-title">${esc(contributor.title)}</p>
        <p>${esc(contributor.shortBio)}</p>
        <p class="contributor-disclosure">${esc(CONTRIBUTOR_DISCLOSURE)}</p>
        <span class="text-link">View contributor profile</span>
      </div>
    </a>
  `;
}

function learningTopicCard(topic, index) {
  return card({
    title: topic.name,
    text: topic.purpose,
    href: topic.route,
    iconName: "guide",
    accent: accentColors[index % accentColors.length],
    linkLabel: "Open topic"
  });
}

function learningCalculatorCard(calculator, index) {
  return card({
    title: calculator.name,
    text: `Inputs include ${(calculator.captures || []).slice(0, 3).map(humanizePublicLabel).join(", ")}.`,
    href: calculator.route,
    iconName: "calculator",
    accent: accentColors[index % accentColors.length],
    linkLabel: "Calculate"
  });
}

function learningLoanPathCard(product, index) {
  return card({
    title: product.name,
    text: product.borrowerGoal,
    href: product.route,
    iconName: index % 2 ? "rates" : "home",
    accent: accentColors[index % accentColors.length],
    linkLabel: "View guide"
  });
}

function resolveTopicHubLink(id) {
  const contributor = maps.contributors[id];
  if (contributor) return { kind: "contributor", item: contributor };
  const item = maps.products[id] || maps.calculators[id] || maps.directories[id] || maps.states[id] || maps.cities[id];
  return item ? { kind: "route", item } : null;
}

function learningHome() {
  const model = buildLearningCenterModel(data, editorialContent, { tagRegistry: publicTagRegistry });
  const featuredArticles = model.featuredArticles.length
    ? section(
        "Featured articles",
        {
          label: "Related articles",
          text: "Compare loan options, local market evidence, planning estimates, and questions to review with a lender."
        },
        `<div class="grid three learning-featured-grid">${model.featuredArticles.map(learningArticleCard).join("")}</div>`,
        "compact learning-featured-section"
      )
    : "";
  const topicCards = model.topicCards.length
    ? section(
        "Explore by topic",
        {
          label: "Categories",
          text: "Browse mortgage guides by the decision you are working through."
        },
        `<div class="grid four learning-topic-grid">${model.topicCards.map(learningTopicCard).join("")}</div>`,
        "compact learning-topic-section"
      )
    : "";
  const calculators = model.calculators.length
    ? section(
        "Calculators",
        {
          label: "Planning tools",
          text: "Estimate payment, affordability, refinance, and rent versus buy."
        },
        `<div class="grid four learning-calculator-grid">${model.calculators.map(learningCalculatorCard).join("")}</div>`,
        "compact learning-calculator-section"
      )
    : "";
  const additionalArticles = model.additionalArticles.length
    ? section(
        "Helpful next reads",
        {
          label: "Learning center",
          text: "Read guides that connect market questions, loan options, calculators, and facts a lender may review."
        },
        `<div class="grid three learning-article-grid">${model.additionalArticles.map(learningArticleCard).join("")}</div>`,
        "compact learning-article-section"
      )
    : "";
  const loanPaths = model.loanPaths.length
    ? section(
        "Loan options",
        {
          label: "Products",
          text: "Compare purchase, refinance, FHA, VA, and other options with tools and local factors nearby."
        },
        `<div class="grid four learning-product-grid">${model.loanPaths.map(learningLoanPathCard).join("")}</div>`,
        "compact learning-product-section"
      )
    : "";

  return pageShell(`
    <div class="learning-center-page">
      ${hero({
        eyebrow: "Learning center",
        title: "Mortgage education connected to local decisions.",
        lead: "Read market updates, product explainers, tax and insurance guides, calculator walkthroughs, and first-time buyer resources.",
        actions: `<a class="button" href="${route("/learning-center/local-market-updates")}">Market updates</a><a class="button secondary" href="${route("/learning-center/buying-a-home")}">Buying guides</a>`,
        panel: `<aside class="hero-panel visual-panel learning-hero-panel"><img src="${ASSETS.mortgage}" alt="" /><h2>What you can explore</h2><ul><li>Mortgage topics and guides</li><li>Source dates and guide details</li><li>Current market references</li><li>Related products and calculators</li><li>Local market links</li></ul></aside>`
      })}
      ${learningDiscovery(model)}
      ${section(
        CTA_TYPES.prequal.title,
        { label: CTA_TYPES.prequal.eyebrow, text: CTA_TYPES.prequal.text },
        `<div class="learning-inline-cta">${ctaButton("prequal")}</div>`,
        "compact learning-prequal-section"
      )}
      ${featuredArticles}
      ${topicCards}
      ${calculators}
      ${additionalArticles}
      ${loanPaths}
      <section class="section compact learning-guidance-section" aria-label="Mortgage guidance">
        ${contextualCta(CTA_TYPES.leadForm.title, CTA_TYPES.leadForm.text, ["leadForm", "loContact"])}
      </section>
    </div>
  `);
}

function editorialTeamPage(topic) {
  const articlesById = new Map((data.articles || []).map((article) => [article.id, article]));
  const principles = [
    ["Start with the decision", "Each guide begins with the question a borrower is trying to answer, then organizes the facts around that choice."],
    ["Show the source and date", "Market reporting identifies when the information was current and links the data source directly below each chart."],
    ["Explain the tradeoffs", "Rates, payments, fees, loan programs, and local conditions are presented as options to compare, not promises."]
  ];

  return pageShell(`
    ${breadcrumb(["Learning Center", topic.name], ["/learning-center", topic.route])}
    <div class="editorial-directory-page editorial-contributors-page" data-contributor-directory>
      ${renderProductionTopicHub(topic, {
        articlesById,
        contributors: editorialContent.contributors,
        sources: editorialContent.sources,
        tagContext: tagContextForRoute(topic.route),
        route,
        linkResolver: resolveTopicHubLink,
        featuredTitle: "Meet the contributors",
        renderFeaturedLink: (link) => link.kind === "contributor" ? renderContributorDirectoryCard(link.item) : "",
      })}
      <div class="contributor-directory-content">
        <section class="editorial-guidance-principles" aria-labelledby="editorial-guidance-title">
          <h2 id="editorial-guidance-title">How Snap Mortgage guidance is built</h2>
          <div>${principles.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>
        </section>
        <section class="editorial-recent-guidance" aria-labelledby="recent-guidance-title">
          <h2 id="recent-guidance-title">Recent guidance</h2>
          <div class="editorial-article-grid">${first(data.articles, 3).map(learningArticleCard).join("")}</div>
        </section>
      </div>
    </div>
  `);
}

function contributorProfilePage(contributor) {
  const archive = renderContributorArchiveMarkup(
    editorialContent,
    maps.contributorArticles,
    contributor,
    learningArticleCard,
    { limit: 24, showCount: true },
  );

  return pageShell(`
    <div class="contributor-profile-page" data-contributor-profile="${esc(contributor.id)}">
      <section class="contributor-profile-hero contributor-profile-band">
        <div class="contributor-profile-hero-inner contributor-profile-header">
          <img class="contributor-profile-portrait" src="${esc(contributor.portrait.src)}" alt="${esc(contributor.portrait.alt)}" loading="eager" decoding="async" data-contributor-portrait />
          <div class="contributor-profile-heading">
            <p class="contributor-beat">${esc(contributor.beat)}</p>
            <h1>${esc(contributor.name)}</h1>
            <p class="contributor-profile-title">${esc(contributor.title)}</p>
            <p class="contributor-profile-bio">${esc(contributor.bio)}</p>
            <p class="contributor-disclosure">${esc(CONTRIBUTOR_DISCLOSURE)}</p>
            <a class="text-link" href="#contributor-articles">Browse ${esc(contributor.name)}'s articles</a>
          </div>
        </div>
      </section>
      <section class="contributor-profile-content" id="contributor-articles" aria-labelledby="contributor-articles-title">
        <h2 id="contributor-articles-title">Articles by ${esc(contributor.name)}</h2>
        ${archive}
        <div class="contributor-topics">
          <h2>Topics ${esc(contributor.name)} covers</h2>
          <p>${contributor.topics.map(esc).join(" <span aria-hidden=\"true\">&middot;</span> ")}</p>
        </div>
      </section>
    </div>
  `);
}

function blogTopicPage(topic) {
  if (topic.route === "/learning-center") return learningHome();
  const productionTopic = editorialContent.topicHubs.find((hub) => hub.public === true && normalizeRoute(hub.route) === normalizeRoute(topic.route)) || topic;
  if (topic.route === "/learning-center/editorial-team") return editorialTeamPage(productionTopic);
  const articlesById = new Map((data.articles || []).map((article) => [article.id, article]));
  const tagContext = tagContextForRoute(productionTopic.route);
  return pageShell(`
    ${breadcrumb(["Learning Center", topic.name], ["/learning-center", topic.route])}
    ${renderProductionTopicHub(productionTopic, {
      articlesById,
      contributors: editorialContent.contributors,
      sources: editorialContent.sources,
      tagContext,
      route,
      renderArticleCard: learningArticleCard,
      linkResolver: resolveTopicHubLink,
    })}
  `);
}

function borrowerFacingArticleMarkup(markup) {
  return String(markup || "")
    .replace(/(<button\b[^>]*data-cta-action="leadForm"[^>]*>)[^<]*(<\/button>)/g, "$1Review guidance options$2")
    .replace("bring borrower and property details into a licensed conversation.", "bring borrower and property details to a lender for verification.");
}

function articlePage(article) {
  const relatedRoutes = new Map((article.relatedRoutes || []).map((href) => {
    const found = maps.routes.get(normalizeRoute(href));
    const item = found?.item || {};
    return [href, {
      title: item.title || item.name || href,
      text: item.summary || item.purpose || item.marketPositioning || item.borrowerGoal || item.stateNarrative || found?.type || "Related mortgage guide",
      type: found?.type ? humanizePublicLabel(found.type) : "Related",
    }];
  }));
  return pageShell(`
    ${breadcrumb(["Learning Center", article.title], ["/learning-center", article.route])}
    ${borrowerFacingArticleMarkup(renderProductionArticle(article, {
      contributors: editorialContent.contributors,
      sources: editorialContent.sources,
      relatedRoutes,
      tagContext: tagContextForRoute(article.route),
      route,
      evidenceMarkup: marketChart("article.evidence", article.id),
    }))}
  `);
}

function loanOfficerPage(officer) {
  const firstName = officer.name.split(" ")[0];
  const products = first(data.products, 3);
  return pageShell(`
    ${breadcrumb(["Loan Officers", officer.name], ["/loan-officers", officer.route])}
    ${hero({
      eyebrow: "Loan officer",
      title: officer.name,
      lead: `Only ${officer.name}'s name and profile card are public. Official identifiers, state authorization, language, specialty, market coverage, branch association, and direct-contact details are not shown. The links below provide neutral mortgage education; opening a contact notice sends no message.`,
      actions: `${ctaButton("loContact", { label: "Review contact options" })}${ctaButton("prequal", { variant: "secondary" })}`,
      panel: `<div class="profile-hero-card"><div class="avatar">${esc(initials(officer.name))}</div><div><h2>${esc(officer.name)}</h2><p>Name-only public profile</p><div class="tag-row"><span class="tag">Education links</span><span class="tag">Notice-only actions</span></div></div></div>`
    })}
    ${editorialSection({
      label: "Public information",
      title: `${officer.name} is shown by name only.`,
      intro: "Use the neutral education links below without treating the profile as proof of qualifications, market coverage, or contactability.",
      paragraphs: [
        "No regulatory identifier, state authorization, language, specialty, market coverage, branch relationship, phone number, email, schedule, or direct-contact form is published here.",
        "You can still compare loan education, run a calculator, review public rate benchmarks, and organize the facts a lender may request.",
        "The contact, prequalification, rate, and offer actions open notices only. They collect and send no borrower information."
      ],
      sideTitle: "Useful public actions",
      sideItems: [
        "Compare loan education",
        "Run a payment estimate",
        "Review public benchmarks",
        "Organize lender-review facts",
        "Open notice-only actions"
      ]
    })}
    ${section("What you can research now", { label: "Mortgage education", text: "Use public information before deciding whether to approach a lender." }, insightBand([
      { label: "Goal", value: "Purchase or refinance", text: "Define the decision before comparing products." },
      { label: "Payment", value: "Visible assumptions", text: "Model principal, interest, taxes, insurance, and other entered costs." },
      { label: "Property", value: "Type and occupancy", text: "These details can change program and pricing review." },
      { label: "Terms", value: "Written lender offer", text: "Compare APR, points, fees, payment, and cash to close." }
    ]), "compact")}
    ${section("Facts a lender commonly reviews", { label: "Education", text: "No information is collected in this experience." }, processRail([
      { title: "Borrower goal", text: "Purchase, refinance, home equity, or product comparison changes the first questions." },
      { title: "Property details", text: "Location, property type, occupancy, price, and current liens can affect the review." },
      { title: "Financial details", text: "Income, assets, debts, credit, and down payment require lender review." },
      { title: "Written terms", text: "Rate, APR, points, fees, payment, and cash to close belong in the final comparison." }
    ]), "compact")}
    ${section("Loan education", { label: "Product guides", text: "These general guides are not endorsements or statements about this named profile." }, `<div class="grid three">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View guide" })).join("")}</div>`, "compact")}
    ${section("Review notice-only actions", { label: "No submission", text: "Every action below opens a notice; none sends a request or borrower information." }, ctaDeck([
      { type: "loContact", href: `${officer.route}#contact`, label: "Review contact options" },
      "prequal",
      "rateReview",
      "compareOffer"
    ], "Organize the next comparison.", "Review contact, prequalification, rate, or offer details without submitting information."), "compact")}
    <section class="section compact" id="contact">
      <div class="content-layout">
        <div class="panel">
          <h2>Contact information for ${esc(firstName)}</h2>
          <p>Phone, email, and a direct-contact form are not provided. Opening either notice below sends nothing.</p>
          <div class="cta-inline-actions">
            ${ctaButton("loContact", { label: "Review contact options" })}
            ${ctaButton("leadForm", { variant: "secondary" })}
          </div>
        </div>
        <aside class="side-stack">${disclosureFor("loan_officer", "Loan officer disclosure")}</aside>
      </div>
    </section>
  `);
}

function branchPage(branch) {
  const state = maps.states[branch.stateId];
  const officers = byIds(branch.loanOfficerIds, maps.loanOfficers);
  const cities = byIds(branch.cityIds, maps.cities);
  const products = byIds(state.featuredProductIds, maps.products);
  const articles = data.articles.filter((article) => (article.stateIds || []).includes(state.id)).slice(0, 3);
  return pageShell(`
    ${breadcrumb(["Branches", branch.name], ["/branches", branch.route])}
    ${hero({
      eyebrow: "Branch",
      title: branch.name,
      lead: `Only the ${branch.name} name and neutral education links are shown. Public operational and direct-contact details are not provided, and no contact request is sent from this view.`,
      actions: `<a class="button" href="${route(officers[0]?.route || "/loan-officers")}">Browse profile names</a>${ctaButton("leadForm", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Name-only branch entry</h2><p>Name and neutral mortgage education only. Location, operations, qualifications, and direct-contact details are not established here.</p></aside>`
    })}
    ${editorialSection({
      label: "Branch information",
      title: `${branch.name} is shown by name only.`,
      intro: "Use the general mortgage education below without treating the entry as proof of operations, qualifications, or contactability.",
      paragraphs: [
        "No official location, operating schedule, phone number, email, regulatory identifier, or direct-contact form is shown.",
        "Loan officer names and market guides are neutral browsing links. They do not establish an employment relationship, qualification, or operating footprint.",
        "The guidance and contact controls open notices only. They collect and send no borrower information."
      ],
      sideTitle: "Useful public links",
      sideItems: [
        "Name-only profiles",
        "State and city guides",
        "Product education",
        "Payment calculator",
        "Notice-only actions"
      ]
    })}
    ${section("What is public", { label: "Name-only entry", text: "The remaining links are educational and do not establish branch operations." }, `<div class="grid four">${metric("Branch", branch.name)}${metric("Public details", "Name only")}${metric("Direct action", "Notice only")}${metric("Related state guide", state.name)}</div>`)}
    ${section("Loan officer names", { label: "Neutral profile links", text: "The listed names are browsing links; association and qualifications are not established here." }, `<div class="grid two">${officers.map((officer, index) => card({ title: officer.name, text: "Open the name-only profile and general mortgage education links.", href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "Profile" })).join("")}</div>`)}
    ${section("Related market guides", { label: "Education", text: "Compare market-level assumptions without inferring a branch operating footprint." }, `<div class="grid three">${cities.map((city, index) => card({ title: city.name, text: "Open the city planning guide, sourced local reporting, and illustrative cost examples.", href: city.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "City guide" })).concat([card({ title: "Mortgage payment calculator", text: "Estimate payment with visible taxes, insurance, rate, and down-payment assumptions.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[4], linkLabel: "Calculate" })]).join("")}</div>`, "compact")}
    ${section("Review notice-only actions", { label: "No submission", text: "Contact and rate controls open notices only; the watchlist lasts for this browsing session." }, ctaDeck(["leadForm", "loContact", "watchlist", "rateReview"], "Keep comparing without sending information.", "Open a guidance or rate notice, or add a market to this session's watchlist."), "compact")}
    ${section("Loan options and local updates", { label: "More to explore", text: "Compare loan education, market guides, articles, and planning tools." }, `<div class="grid three">${products.slice(0, 3).map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View product" })).concat(articles.map((article, index) => card({ title: article.title, text: article.summary || article.dek || "Review dated local mortgage evidence.", href: article.route, iconName: "article", accent: accentColors[(index + 3) % accentColors.length], linkLabel: "Read" }))).join("")}</div><div style="margin-top:18px">${disclosureFor("branch", "Branch disclosure")}</div>`, "compact")}
  `);
}

// These program-rule calculations stay pure so every calculator view uses the same matrix.
const FHA_MIP_BASE_LOAN_THRESHOLD = 726200;

function fhaAnnualMipAssumption({ termYears, baseLoanAmount, ltv }) {
  const term = Math.max(Number(termYears) || 0, 0);
  const amount = Math.max(Number(baseLoanAmount) || 0, 0);
  const ratio = Math.max(Number(ltv) || 0, 0);
  const standardBaseAmount = amount <= FHA_MIP_BASE_LOAN_THRESHOLD;

  if (term > 15) {
    if (standardBaseAmount) {
      if (ratio <= 0.9) return { annualRate: 0.005, duration: "11 years" };
      if (ratio <= 0.95) return { annualRate: 0.005, duration: "loan term" };
      return { annualRate: 0.0055, duration: "loan term" };
    }
    if (ratio <= 0.9) return { annualRate: 0.007, duration: "11 years" };
    if (ratio <= 0.95) return { annualRate: 0.007, duration: "loan term" };
    return { annualRate: 0.0075, duration: "loan term" };
  }

  if (standardBaseAmount) {
    if (ratio <= 0.9) return { annualRate: 0.0015, duration: "11 years" };
    return { annualRate: 0.004, duration: "loan term" };
  }
  if (ratio <= 0.78) return { annualRate: 0.0015, duration: "11 years" };
  if (ratio <= 0.9) return { annualRate: 0.004, duration: "11 years" };
  return { annualRate: 0.0065, duration: "loan term" };
}

function vaFundingFeeRate({ transaction, use, downPaymentPercent, exempt }) {
  if (exempt) return 0;
  if (transaction === "irrrl") return 0.005;
  if (transaction === "cash-out") return use === "subsequent" ? 0.033 : 0.0215;
  const downPercent = Math.max(Number(downPaymentPercent) || 0, 0);
  if (downPercent >= 10) return 0.0125;
  if (downPercent >= 5) return 0.015;
  return use === "subsequent" ? 0.033 : 0.0215;
}
const calculatorProductModules = {
  conventional: {
    label: "Conventional",
    shortLabel: "Conv.",
    status: "Planning comparison",
    className: "available",
    miLabel: "Hypothetical PMI",
    rule: "Uses the entered down payment and hypothetical PMI rate without inferring eligibility or a minimum down payment.",
    notes: ["PMI is included only when a hypothetical annual rate is entered.", "Confirm product eligibility, pricing, and the current county conforming limit."]
  },
  fha: {
    label: "FHA",
    shortLabel: "FHA",
    status: "Planning comparison",
    className: "review",
    upfrontFeeRate: 0.0175,
    miLabel: "FHA annual MIP",
    rule: "Uses 1.75% financed UFMIP and the current HUD annual MIP matrix by term, base loan amount, and LTV.",
    notes: ["A 3.5% down pathway may apply with a minimum decision score of at least 580; complete FHA and lender review still applies.", "Confirm the base loan amount against the current FHA county limit."]
  },
  va: {
    label: "VA",
    shortLabel: "VA",
    status: "Planning comparison",
    className: "eligible",
    miLabel: "Monthly mortgage insurance",
    rule: "Uses the selected transaction, first or subsequent use, down payment, and funding-fee exemption scenario.",
    notes: ["No monthly mortgage insurance is included.", "The IRRRL fee is 0.50%; other funding fees depend on the selected scenario and may be exempt."]
  },
  usda: {
    label: "USDA",
    shortLabel: "USDA",
    status: "Planning comparison",
    className: "limited",
    upfrontFeeRate: 0.01,
    annualMiRate: 0.0035,
    miLabel: "USDA annual fee",
    rule: "Uses 1.00% upfront and 0.35% annual fee planning assumptions; official property and income verification is always required.",
    notes: ["USDA property and income verification is required through the official tools.", "Confirm the current fee with USDA and the lender before relying on this estimate."]
  }
};

const vaUseScenarioFields = [
  ["VA use scenario", "vaUse", "select", "first", [["first", "First use"], ["subsequent", "Subsequent use"]]],
  ["VA funding-fee exemption", "vaFeeExempt", "checkbox", "false"]
];

const calculatorPresets = {
  "calc-payment": {
    kind: "payment",
    title: "Payment scenario",
    resultTitle: "Estimated monthly payment",
    primaryMetricLabel: "Monthly payment",
    primaryProgram: "conventional",
    fields: [
      ["Purchase price", "price", "numeric", "515000"],
      ["Down payment", "down", "numeric", "25750"],
      ["Editable closing-cost assumption %", "closingCostRate", "decimal", "4"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Hypothetical annual PMI rate %", "annualPmiRate", "decimal", "0"],
      ["Annual tax", "tax", "numeric", "9300"],
      ["Annual insurance", "insurance", "numeric", "2200"],
      ["HOA dues", "hoa", "numeric", "125"],
      ["Term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"],
      ...vaUseScenarioFields
    ],
    explainer: "Estimate monthly cash flow from editable inputs without inferring eligibility, minimum down payment, PMI pricing, or a personalized rate."
  },
  "calc-affordability": {
    kind: "affordability",
    title: "Affordability scenario",
    resultTitle: "Estimated target payment",
    primaryMetricLabel: "Target payment",
    primaryProgram: "fha",
    fields: [
      ["Annual income", "income", "numeric", "145000"],
      ["Monthly debts", "debts", "numeric", "650"],
      ["Editable DTI planning assumption %", "dtiAssumption", "decimal", "36"],
      ["Cash available", "down", "numeric", "35000"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Annual tax and insurance", "taxInsurance", "numeric", "11500"],
      ["Term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"],
      ...vaUseScenarioFields
    ],
    explainer: "Apply an editable DTI planning assumption to income and debts. The result is not an affordability, eligibility, or underwriting limit."
  },
  "calc-refinance": {
    kind: "refinance",
    title: "Refinance scenario",
    resultTitle: "Estimated refinance payment",
    primaryMetricLabel: "New payment",
    primaryProgram: "va",
    fields: [
      ["Current principal and interest / mo", "currentPayment", "numeric", "3650"],
      ["Loan balance", "balance", "numeric", "428000"],
      ["Home value", "price", "numeric", "560000"],
      ["VA refinance transaction", "vaTransaction", "select", "irrrl", [["irrrl", "IRRRL"], ["cash-out", "Cash-out refinance"]]],
      ...vaUseScenarioFields,
      ["New interest rate", "rate", "decimal", "6.25"],
      ["Closing costs", "closingCosts", "numeric", "6200"],
      ["Current property tax / mo", "currentTax", "numeric", "280"],
      ["Current insurance / mo", "currentInsurance", "numeric", "110"],
      ["Current MI / mo", "currentMi", "numeric", "0"],
      ["New property tax / mo", "newTax", "numeric", "280"],
      ["New insurance / mo", "newInsurance", "numeric", "110"],
      ["New conventional PMI / mo (hypothetical)", "newMi", "numeric", "0"],
      ["New term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Compare entered current and new monthly cash flows. VA fees use the selected transaction, use history, and exemption scenario."
  },
  "calc-rent-vs-buy": {
    kind: "rentBuy",
    title: "Rent vs buy scenario",
    resultTitle: "Partial rent-versus-buy payment comparison",
    primaryMetricLabel: "Partial buy payment",
    primaryProgram: "conventional",
    fields: [
      ["Monthly rent", "rent", "numeric", "2650"],
      ["Target home price", "price", "numeric", "515000"],
      ["Down payment", "down", "numeric", "25750"],
      ["Editable closing-cost assumption %", "closingCostRate", "decimal", "4"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Hypothetical annual PMI rate %", "annualPmiRate", "decimal", "0"],
      ["Annual tax", "tax", "numeric", "9300"],
      ["Annual insurance", "insurance", "numeric", "2200"],
      ["HOA dues", "hoa", "numeric", "125"],
      ["Term years", "termYears", "numeric", "30"],
      ["Time horizon years", "timeline", "numeric", "7"],
      ["Annual rent increase %", "rentGrowth", "decimal", "3.5"],
      ["ZIP code", "zip", "numeric", "78704"],
      ...vaUseScenarioFields
    ],
    explainer: "Partial rent-versus-buy payment comparison using entered monthly costs and rent growth; it does not model full ownership economics or support a borrower decision."
  },
  "calc-down-payment": {
    kind: "downPayment",
    title: "Down payment scenario",
    resultTitle: "Illustrative cash assumptions",
    primaryMetricLabel: "Illustrative cash total",
    primaryProgram: "fha",
    fields: [
      ["Target home price", "price", "numeric", "515000"],
      ["Down payment assumption", "down", "numeric", "25750"],
      ["Cash available", "cashAvailable", "numeric", "35000"],
      ["Editable closing-cost assumption %", "closingCostRate", "decimal", "4"],
      ["Apply DPA", "applyDpa", "checkbox", "false"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Hypothetical annual PMI rate %", "annualPmiRate", "decimal", "0"],
      ["Annual tax", "tax", "numeric", "9300"],
      ["Annual insurance", "insurance", "numeric", "2200"],
      ["Term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"],
      ...vaUseScenarioFields
    ],
    explainer: "Compare cash available with editable down-payment and closing-cost assumptions; no minimum down payment or cash-to-close result is inferred."
  }
};

function calculatorHubCard(calculator, index, emphasis = "supporting") {
  const preset = calculatorPresets[calculator.id] || calculatorPresets["calc-payment"];
  return `<a class="calculator-hub-card ${emphasis === "primary" ? "is-primary" : "is-supporting"}" href="${route(calculator.route)}" data-calculator-id="${esc(calculator.id)}">
    <span class="icon-bubble" style="--accent:${accentColors[index % accentColors.length]}">${icon("calculator")}</span>
    <span class="calculator-hub-card-copy">
      <strong>${esc(calculator.name)}</strong>
      <small>${esc(preset.explainer)}</small>
      <em>${esc(calculator.captures.slice(0, 5).map(humanizePublicLabel).join(" • "))}</em>
    </span>
    <span class="calculator-hub-card-arrow" aria-hidden="true">→</span>
  </a>`;
}

function calculatorsHubPage(directory) {
  const [payment, affordability, ...supporting] = data.calculators;
  return pageShell(`
    <div class="calculator-hub-page">
      <section class="calculator-hub-mobile-stage" aria-labelledby="calculator-hub-title">
        <div class="calculator-hub-intro">
          <span class="eyebrow">Calculators</span>
          <h1 id="calculator-hub-title">${esc(directory?.name || "Mortgage calculators")}</h1>
          <p>Choose a calculator, enter visible assumptions, and compare planning estimates with selected program assumptions before lender review.</p>
        </div>
        <div class="calculator-hub-orbit" aria-hidden="true">
          <span class="calculator-hub-orbit-ring ring-one"></span>
          <span class="calculator-hub-orbit-ring ring-two"></span>
          <span class="calculator-hub-orbit-node node-one"></span>
          <span class="calculator-hub-orbit-node node-two"></span>
          <span class="calculator-hub-orbit-tile tile-payment">Payment</span>
          <span class="calculator-hub-orbit-tile tile-affordability">Affordability</span>
        </div>
        <div class="calculator-hub-primary">
          ${calculatorHubCard(payment, 0, "primary")}
          ${calculatorHubCard(affordability, 1, "primary")}
        </div>
      </section>
      <section class="calculator-hub-supporting" aria-label="More mortgage calculators">
        ${supporting.map((calculator, index) => calculatorHubCard(calculator, index + 2)).join("")}
      </section>
      <aside class="calculator-hub-prequal" aria-label="Prequalification next step">
        <div class="calculator-hub-prequal-copy">
          <strong>Review prequalification details</strong>
          <p>Organize the borrower, property, and timing details a lender may need to review next steps. The destination is a no-PII summary, not an application.</p>
        </div>
        <a class="button" href="${route("/prequal/start")}">Review prequalification <span aria-hidden="true">→</span></a>
      </aside>
    </div>
  `);
}

function relatedCalculatorCards(activeId) {
  return data.calculators
    .filter((calculator) => calculator.id !== activeId)
    .slice(0, 4)
    .map((calculator, index) => card({
      title: calculator.name,
      text: (calculatorPresets[calculator.id] || calculatorPresets["calc-payment"]).explainer,
      href: calculator.route,
      iconName: "calculator",
      accent: accentColors[index % accentColors.length],
      linkLabel: "Compare scenario"
    }))
    .join("");
}

function productToggleGroup(preset) {
  const enabledPrograms = preset.lockedPrograms || Object.keys(calculatorProductModules);
  return Object.entries(calculatorProductModules).map(([key, product]) => {
    const isEnabled = enabledPrograms.includes(key);
    const isActive = key === preset.primaryProgram;
    return `<label class="product-toggle ${product.className}${isActive ? " active" : ""}${isEnabled ? "" : " disabled"}">
      <input type="radio" name="program" value="${esc(key)}"${isActive ? " checked" : ""}${isEnabled ? "" : " disabled"} />
      <span>${esc(product.shortLabel)}</span>
      <small>${esc(isEnabled ? product.status : "Not modeled")}</small>
    </label>`;
  }).join("");
}

const calculatorCurrencyFields = new Set(["price", "down", "cashAvailable", "tax", "insurance", "hoa", "income", "debts", "taxInsurance", "currentPayment", "balance", "closingCosts", "rent", "currentTax", "currentInsurance", "currentMi", "newTax", "newInsurance", "newMi"]);
const calculatorPercentFields = new Set(["rate", "rentGrowth", "dtiAssumption", "annualPmiRate", "closingCostRate"]);
const calculatorSliderFields = new Set(["price", "down", "income", "balance", "currentPayment", "rent"]);
const calculatorAdvancedFieldsByKind = {
  payment: new Set(["annualPmiRate", "tax", "insurance", "hoa", "termYears", "zip", "vaUse", "vaFeeExempt"]),
  affordability: new Set(["taxInsurance", "termYears", "zip", "vaUse", "vaFeeExempt"]),
  refinance: new Set(["closingCosts", "currentTax", "currentInsurance", "currentMi", "newTax", "newInsurance", "newMi", "termYears", "zip"]),
  rentBuy: new Set(["annualPmiRate", "tax", "insurance", "hoa", "termYears", "timeline", "rentGrowth", "zip", "vaUse", "vaFeeExempt"]),
  downPayment: new Set(["rate", "annualPmiRate", "tax", "insurance", "termYears", "zip", "vaUse", "vaFeeExempt"])
};
const calculatorRangeDefaults = {
  price: [50000, 1500000, 5000],
  down: [0, 500000, 1000],
  rate: [0, 12, 0.125],
  tax: [0, 30000, 250],
  insurance: [0, 10000, 100],
  hoa: [0, 1500, 25],
  termYears: [10, 30, 5],
  income: [25000, 400000, 5000],
  debts: [0, 5000, 50],
  taxInsurance: [0, 40000, 250],
  currentPayment: [0, 10000, 50],
  balance: [25000, 1500000, 5000],
  closingCosts: [0, 50000, 250],
  rent: [500, 10000, 50],
  timeline: [1, 30, 1],
  rentGrowth: [0, 10, 0.25]
};

function calculatorRangeConfig(name, value) {
  if (!calculatorSliderFields.has(name)) return null;
  const numericValue = Number(value) || 0;
  const fallbackMax = Math.max(numericValue * 2, 100);
  const [min, max, step] = calculatorRangeDefaults[name] || [0, fallbackMax, 1];
  return { min, max: Math.max(max, numericValue), step };
}

function calculatorInputField([label, name, mode, value, options = []], fields = []) {
  const id = `calculator-${name}`;
  if (mode === "checkbox") {
    const helper = name === "applyDpa"
      ? "Assistance is excluded until a specific program, amount, repayment structure, borrower, and property are verified."
      : name === "vaFeeExempt"
        ? "Select only as a scenario assumption. VA or the lender must confirm exemption status."
        : "";
    return `<div class="calculator-input-row checkbox-row${name === "applyDpa" ? " dpa-option" : ""}"${name === "applyDpa" ? " data-dpa-option" : ""}>
      <label class="calculator-checkbox-control" for="${esc(id)}">
        <input id="${esc(id)}" name="${esc(name)}" type="checkbox" value="yes" data-calculator-input="${esc(name)}"${value === "true" ? " checked" : ""} />
        <span>${esc(label)}</span>
      </label>
      ${helper ? `<p>${esc(helper)}</p>` : ""}
    </div>`;
  }
  if (mode === "select") {
    return `<div class="calculator-input-row">
      <div class="calculator-input-topline">
        <label for="${esc(id)}">${esc(label)}</label>
        <div class="calculator-value-box"><select id="${esc(id)}" name="${esc(name)}" data-calculator-input="${esc(name)}">${options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}"${optionValue === value ? " selected" : ""}>${esc(optionLabel)}</option>`).join("")}</select></div>
      </div>
    </div>`;
  }
  const range = mode === "text" ? null : calculatorRangeConfig(name, value);
  const prefix = calculatorCurrencyFields.has(name) ? "$" : "";
  const suffix = calculatorPercentFields.has(name) ? "%" : "";
  const priceField = fields.find(([, fieldName]) => fieldName === "price");
  const priceValue = Number(priceField?.[3]) || 0;
  const downPercent = name === "down" && priceValue > 0 ? Math.round(((Number(value) || 0) / priceValue) * 1000) / 10 : null;
  const valueBox = `<div class="calculator-value-box">
    ${prefix ? `<span>${prefix}</span>` : ""}
    <input id="${esc(id)}" name="${esc(name)}" inputmode="${esc(mode)}" value="${esc(value)}" data-calculator-input="${esc(name)}" />
    ${suffix ? `<span>${suffix}</span>` : ""}
  </div>`;
  return `<div class="calculator-input-row${range ? " has-slider" : ""}">
    <div class="calculator-input-topline">
      <label for="${esc(id)}">${esc(label)}</label>
      ${downPercent === null ? valueBox : `<div class="calculator-value-pair">${valueBox}<div class="calculator-value-box percent-box"><input name="downPercent" inputmode="decimal" value="${esc(downPercent)}" data-down-percent /><span>%</span></div></div>`}
    </div>
    ${range ? `<div class="calculator-slider-wrap">
      <input class="calculator-slider" type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${esc(value)}" data-calculator-slider="${esc(name)}" aria-label="${esc(label)} slider" />
      <span class="slider-grip" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>` : ""}
  </div>`;
}

function calculatorFieldsMarkup(preset) {
  const advancedNames = calculatorAdvancedFieldsByKind[preset.kind] || new Set();
  const primaryFields = preset.fields.filter(([, name]) => !advancedNames.has(name));
  const advancedFields = preset.fields.filter(([, name]) => advancedNames.has(name));
  return `
    <div class="calculator-fields primary-fields">
      ${primaryFields.map((field) => calculatorInputField(field, preset.fields)).join("")}
    </div>
    ${advancedFields.length ? `<details class="calculator-advanced">
      <summary>Advanced settings <span aria-hidden="true">⌄</span></summary>
      <div class="calculator-fields advanced-fields">
        ${advancedFields.map((field) => calculatorInputField(field, preset.fields)).join("")}
      </div>
    </details>` : ""}
  `;
}

function calculatorDefaultDisplay([, name, mode, value, options = []]) {
  if (mode === "checkbox") return value === "true" ? "Selected" : "Not selected";
  if (mode === "select") return options.find(([optionValue]) => optionValue === value)?.[1] || value;
  if (calculatorCurrencyFields.has(name)) return currency(value);
  if (calculatorPercentFields.has(name)) return `${value}%`;
  return String(value);
}

function calculatorMethodologyMarkup(preset) {
  const defaults = preset.fields.map((field) => `<li><strong>${esc(field[0])}:</strong> ${esc(calculatorDefaultDisplay(field))}</li>`).join("");
  const partialComparisonBoundary = preset.kind === "rentBuy"
    ? "This is a partial payment comparison. It does not model appreciation, maintenance, buying costs, selling costs, investment opportunity cost, tax treatment, renter's insurance, or a complete hold-period return."
    : "It does not model every lender, settlement, property, tax, insurance, or borrower-specific charge.";
  return `<div class="panel calculator-methodology">
    <h2>Formulas and assumptions</h2>
    <div class="grid two">
      <div>
        <h3>Monthly principal and interest</h3>
        <p><code>P &times; r(1 + r)<sup>n</sup> / ((1 + r)<sup>n</sup> - 1)</code>, where P is financed principal, r is the monthly interest rate, and n is the number of monthly payments. At 0% interest, principal is divided by n.</p>
        <p><code>Financed principal = base loan + (base loan &times; selected upfront-fee rate)</code>. FHA uses 1.75% UFMIP; VA uses the selected transaction/use/down-payment/exemption scenario; USDA uses a 1.00% planning assumption.</p>
        <p><code>Monthly MI or annual fee = base loan &times; annual rate / 12</code>. FHA selects the annual rate from the current HUD term/base-loan/LTV matrix; USDA uses a 0.35% planning assumption; conventional PMI uses only the hypothetical rate entered by the user. Actual FHA and USDA periodic charges can change with the scheduled outstanding balance.</p>
        <p><code>DTI planning target = gross monthly income &times; entered DTI assumption - entered monthly debts</code>. The entered percentage is never treated as an eligibility cap.</p>
        <p><code>Illustrative cash total = entered down payment + (price &times; entered closing-cost percentage)</code>, less only assistance from a specifically verified program. This is not cash to close or a Loan Estimate.</p>
        <h3>Included cash-flow components</h3>
        <p>Principal and interest plus the entered taxes, homeowners insurance, HOA dues, and applicable entered or program-calculated mortgage insurance or annual fee. Financed FHA, VA, or USDA upfront fees are added to principal for the selected scenario.</p>
        <h3>Result period and rounding</h3>
        <p>Payment results are monthly and displayed to the nearest dollar. Calculations use unrounded values until display. Cash comparisons use the entered down payment and editable closing-cost assumption.</p>
      </div>
      <div>
        <h3>Editable defaults</h3>
        <ul>${defaults}</ul>
        <h3>Not modeled</h3>
        <p>${esc(partialComparisonBoundary)} PMI is excluded unless an annual hypothetical rate is entered. Taxes, insurance, HOA dues, fees, and program authority can change.</p>
        <h3>Example-rate boundary</h3>
        <p>The entered interest rate is an editable example, not a Freddie Mac benchmark, Snap offer, APR, or Loan Estimate. It excludes points, credits, lock terms, and lender-specific pricing.</p>
      </div>
    </div>
    <p><strong>Lender verification can change the result.</strong> A lender must verify borrower facts, property details, program eligibility, current limits, fee exemptions, pricing, disclosures, and cash to close.</p>
    <p>Program references: <a href="https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf" rel="noopener noreferrer">HUD FHA MIP schedule</a>, <a href="https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/" rel="noopener noreferrer">VA funding fees</a>, <a href="https://eligibility.sc.egov.usda.gov/eligibility/" rel="noopener noreferrer">official USDA property and income tools</a>, and <a href="https://www.consumerfinance.gov/owning-a-home/loan-estimate/" rel="noopener noreferrer">CFPB Loan Estimate explainer</a>.</p>
  </div>`;
}

function calculatorPage(calc, tagContext = tagContextForRoute(calc.route)) {
  const preset = calculatorPresets[calc.id] || calculatorPresets["calc-payment"];
  return pageShell(`
    <section class="section calculator-page-shell" id="calculator">
      <div class="calculator-workspace">
        <form class="panel calculator-form product-calculator-form" data-calculator-form data-calculator-id="${esc(calc.id)}" data-calculator-kind="${preset.kind}">
          <div class="calculator-form-header">
            <div class="calculator-form-title">
              ${breadcrumb(["Calculators", calc.name], ["/calculators", calc.route])}
              <span class="eyebrow">Calculator</span>
              ${renderPrimaryTagLinks(tagContext.primaryTags, route)}
              <h1>${esc(calc.name)}</h1>
              <p>${esc(preset.explainer)}</p>
            </div>
          <span class="estimate-badge">Illustrative estimate</span>
          </div>
          <fieldset class="product-toggle-group">
            <legend>Product program</legend>
          ${productToggleGroup(preset)}
          </fieldset>
          ${calculatorFieldsMarkup(preset)}
        </form>
        <aside class="side-stack">
          <div class="panel calculator-result-panel" data-calculator-result>
            <h2>${esc(preset.resultTitle)}</h2>
            <p>Enter a scenario to calculate a planning estimate with the selected program assumptions.</p>
            <div class="calculator-placeholder-result">
              <strong>${esc(calculatorProductModules[preset.primaryProgram].label)}</strong>
              <span>${esc(calculatorProductModules[preset.primaryProgram].rule)}</span>
            </div>
            ${marketChart("calculator.payment_breakdown", calc.id)}
          </div>
          ${disclosureFor("calculator", "Calculator disclosure")}
        </aside>
      </div>
      ${calculatorMethodologyMarkup(preset)}
    </section>
    ${tagContext.additionalTags.length ? `<div class="section compact content-tag-band">${renderAdditionalTagLinks(tagContext.additionalTags, route)}</div>` : ""}
    ${section("Related calculators", { label: "More tools", text: "Compare another borrower question with the same visible-assumption approach." }, `<div class="grid four">${relatedCalculatorCards(calc.id)}</div>`, "compact")}
  `);
}

function directoryAnswer(routeValue, directoryNoun) {
  if (routeValue === "/loan-officers") return "Browse loan officer names and neutral education links. Official identifiers, state authorization, qualifications, market coverage, and direct-contact details are not shown.";
  if (routeValue === "/branches") return "Browse branch names and neutral education links. Operational, regulatory, and direct-contact details are not shown.";
  if (routeValue === "/loan-options") return "Compare common fit indicators, principal costs, tradeoffs, property constraints, and the facts a lender must review for each loan option.";
  if (routeValue === "/learning-center/search") return "Search borrower education by the mortgage decision, cost, product, or local question you want to understand.";
  return `Search ${directoryNoun} and compare the public details shown before narrowing your research.`;
}

function directoryResultText(item, routeValue) {
  if (routeValue === "/loan-officers") return "Open the name-only profile and neutral mortgage education links.";
  if (routeValue === "/branches") return "Open the name-only branch entry and neutral mortgage education links.";
  return item.stateNarrative || item.marketPositioning || item.purpose || productBriefs[item.id]?.fit || item.borrowerGoal || item.summary || item.dek || humanStatus(item.reviewStatus) || "Review the public details and related education.";
}

function directoryPage(directory) {
  const resultSets = {
    "/loan-officers": data.loanOfficers,
    "/branches": data.branches,
    "/learning-center/search": data.articles.concat(data.blogPages),
    "/loan-options": data.products
  };
  const results = resultSets[directory.route] || data.cities;
  const directoryNoun = directory.route.includes("loan-officer") ? "loan officers" : directory.route.includes("branch") ? "branches" : directory.route.includes("loan-options") ? "loan options" : directory.route.includes("learning") ? "articles and topics" : "locations";
  const answer = directoryAnswer(directory.route, directoryNoun);
  const iconName = directory.route.includes("branch") ? "branch" : directory.route.includes("loan-officer") ? "expert" : directory.route.includes("loan-options") ? "rates" : directory.route.includes("learning") ? "article" : "location";
  const linkLabel = directory.route.includes("branch") ? "View branch" : directory.route.includes("loan-officer") ? "View profile" : directory.route.includes("loan-options") ? "View option" : directory.route.includes("learning") ? "Read guide" : "View location";
  const resultCards = results.slice(0, 24).map((item, index) => {
    const text = directoryResultText(item, directory.route);
    return card({
      title: item.name || item.title,
      text,
      href: item.route,
      iconName,
      accent: accentColors[index % accentColors.length],
      linkLabel,
      searchText: `${item.name || item.title} ${text}`
    });
  }).join("");
  return pageShell(`
    ${hero({
      eyebrow: "Directory",
      title: directory.name,
      lead: answer,
      actions: `<a class="button" href="#directory-results">Browse all results</a>`,
      panel: `<aside class="hero-panel"><h2>Search by keyword</h2><p>Search the names and public card details shown below.</p><form class="search-form" data-directory-filter><input name="filter" aria-label="Filter results" placeholder="Enter a keyword..." /><button class="button" type="submit">Filter</button></form></aside>`
    })}
    ${editorialSection({
      label: "Compare public details",
      title: `How to compare ${directoryNoun}.`,
      intro: answer,
      paragraphs: [
        "Use keyword search to match the names and details that are actually printed on each result card.",
        "Open a result to review its public education and valid related links; do not infer omitted professional or operational facts.",
        "Results are neutral browsing links, not rankings, endorsements, or recommendations based on protected-class characteristics."
      ],
      sideTitle: "How to compare",
      sideItems: [
        "Search visible details",
        "Review a result directly",
        "Clear a no-match filter",
        "Browse a broader location",
        "Treat ordering as neutral"
      ]
    })}
    <div id="directory-results">
      ${section("Results", { label: "Search", text: "Filter the public details shown, then review the result you choose." }, `<div class="grid three" data-directory-results>${resultCards}</div><div class="result-note directory-empty-recovery" data-directory-empty hidden><strong>No results match that keyword.</strong><p>Clear the filter to browse all ${esc(directoryNoun)}, or browse a broader location for market and cost context.</p><div class="directory-empty-actions"><button class="button" type="button" data-directory-clear>Clear filter</button><a class="button secondary" href="${route("/locations")}">Browse a broader location</a></div></div>`)}
    </div>
    ${section("Keep comparing", { label: "Helpful links", text: "Compare a result with rates, calculators, and local market details." }, `<div class="grid three">${card({ title: "Compare rates", text: "Review rate details, APR, and payment assumptions.", href: "/rates", iconName: "rates", accent: accentColors[0], linkLabel: "Rates" })}${card({ title: "Run a calculator", text: "Use a scenario before lender review.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[1], linkLabel: "Calculate" })}${card({ title: "Browse locations", text: "Pair the result with local market details.", href: "/locations", iconName: "location", accent: accentColors[2], linkLabel: "Locations" })}</div><div style="margin-top:18px">${disclosureFor("directory", "Search disclosure")}</div>`, "compact")}
    ${section("Keep a result in view", { label: "Session watchlist", text: "Keep useful results for this browsing session only." }, ctaDeck(["watchlist", "leadForm", "account"], "Keep browsing while this session stays organized.", "Add the result to this session's watchlist or open a guidance or account notice. No message or account data is sent."), "compact")}
  `);
}

function breadcrumb(labels, hrefs) {
  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      ${labels.map((label, index) => {
        const href = hrefs[index];
        return index === labels.length - 1 ? `<span>${esc(label)}</span>` : `<a href="${route(href)}">${esc(label)}</a> / `;
      }).join("")}
    </nav>
  `;
}

function articleLoadError(indexItem) {
  const location = maps.states[indexItem.locationId] || maps.cities[indexItem.locationId];
  return `
    <section class="news-article news-article-unavailable">
      <h1>${esc(indexItem.title)}</h1>
      <p>We could not load this update. You can try again or return to the local market guide.</p>
      <button class="button" type="button" data-article-retry="${esc(indexItem.id)}">Try again</button>
      ${location?.route ? `<a class="button secondary" href="${route(location.route)}">Return to ${esc(location.name)}</a>` : ""}
    </section>`;
}

function articleLoading(indexItem) {
  return `<section class="news-article article-loading" role="status"><h1>${esc(indexItem.title)}</h1><p>Loading this sourced market update...</p></section>`;
}

async function loadArticleContent(indexItem) {
  if (!indexItem?.contentPath) throw new Error("Article content is unavailable.");
  if (!articleBundlePromises.has(indexItem.contentPath)) {
    const contentUrl = indexItem.contentPath.startsWith("/") ? indexItem.contentPath : `/${indexItem.contentPath}`;
    const request = fetch(contentUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error("Article content could not be loaded.");
        return response.json();
      })
      .catch((error) => {
        articleBundlePromises.delete(indexItem.contentPath);
        throw error;
      });
    articleBundlePromises.set(indexItem.contentPath, request);
  }
  const bundle = await articleBundlePromises.get(indexItem.contentPath);
  const articles = Array.isArray(bundle) ? bundle : bundle.articles || [];
  const content = articles.find((article) => article.articleId === indexItem.id || article.id === indexItem.id);
  if (!content) throw new Error("Article content is unavailable.");
  return { ...indexItem, ...content, id: indexItem.id, route: indexItem.route };
}

function newsArticlePage(indexItem) {
  return pageShell(`<div data-article-direct-content>${articleLoading(indexItem)}</div>`);
}

async function hydrateDirectArticle(indexItem) {
  const target = document.querySelector("[data-article-direct-content]");
  if (!target) return;
  try {
    const article = await loadArticleContent(indexItem);
    const author = maps.contributors[article.authorId];
    if (!document.contains(target)) return;
    target.innerHTML = renderArticleContent(article, maps.newsMedia[indexItem.imageId], {
      author,
      tagContext: tagContextForRoute(indexItem.route),
      routeHref: route,
    });
    setDocumentMeta({ type: "newsArticle", item: article }, indexItem.route);
  } catch {
    if (document.contains(target)) target.innerHTML = articleLoadError(indexItem);
  }
}

function setArticleModalLoading(indexItem) {
  const content = document.querySelector("[data-article-modal-content]");
  if (content) content.innerHTML = articleLoading(indexItem);
}

async function openArticleModal(indexItem, trigger, { history = true, origin = currentPath() } = {}) {
  const modal = document.querySelector("[data-article-modal]");
  if (!modal || !indexItem) return;
  const requestId = ++activeArticleRequestId;
  articleModalReturnFocus = trigger instanceof HTMLElement ? trigger : articleModalReturnFocus;
  articleModalOrigin = origin;
  articleModalScrollY = window.scrollY;
  modal.dataset.articleId = indexItem.id;
  document.querySelector("[data-article-modal-title]")?.replaceChildren(document.createTextNode(indexItem.title));
  modal.hidden = false;
  document.querySelector("[data-page-content]")?.setAttribute("inert", "");
  document.body.classList.add("no-scroll");
  setArticleModalLoading(indexItem);
  document.querySelector("[data-article-modal-close]")?.focus();
  if (history) {
    window.history.replaceState({ ...(window.history.state || {}), articleReturnScroll: articleModalScrollY }, "", `${currentPath()}${window.location.href.includes("#") ? `#${currentAnchor()}` : ""}`);
    window.history.pushState({ articleModal: true, articleId: indexItem.id, origin: articleModalOrigin, scrollY: articleModalScrollY }, "", route(indexItem.route));
  }
  try {
    const article = await loadArticleContent(indexItem);
    const author = maps.contributors[article.authorId];
    const content = document.querySelector("[data-article-modal-content]");
    if (!content || modal.hidden || requestId !== activeArticleRequestId || modal.dataset.articleId !== indexItem.id) return;
    content.innerHTML = renderArticleContent(article, maps.newsMedia[indexItem.imageId], {
      author,
      tagContext: tagContextForRoute(indexItem.route),
      routeHref: route,
    });
    setDocumentMeta({ type: "newsArticle", item: article }, indexItem.route);
    const heading = content.querySelector("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  } catch {
    const content = document.querySelector("[data-article-modal-content]");
    if (content && requestId === activeArticleRequestId && modal.dataset.articleId === indexItem.id) content.innerHTML = `${articleLoadError(indexItem)}<p><a href="${route(indexItem.route)}" data-article-direct-link>Read the complete article</a></p>`;
    document.querySelector("[data-article-modal-close]")?.focus();
  }
}

function closeArticleModal({ fromPopstate = false, restoreFocus = true } = {}) {
  const modal = document.querySelector("[data-article-modal]");
  if (!modal || modal.hidden) return;
  if (!fromPopstate && window.history.state?.articleModal) {
    window.history.back();
    return;
  }
  activeArticleRequestId += 1;
  modal.hidden = true;
  delete modal.dataset.articleId;
  document.querySelector("[data-page-content]")?.removeAttribute("inert");
  document.body.classList.remove("no-scroll");
  const origin = articleModalOrigin;
  articleModalOrigin = null;
  if (origin) setDocumentMeta(maps.routes.get(origin), origin);
  window.scrollTo({ top: window.history.state?.articleReturnScroll ?? articleModalScrollY, left: 0, behavior: "instant" });
  if (restoreFocus && articleModalReturnFocus && document.contains(articleModalReturnFocus)) articleModalReturnFocus.focus();
  articleModalReturnFocus = null;
}

function navigateFromArticleModal(path) {
  const modal = document.querySelector("[data-article-modal]");
  if (!modal || modal.hidden) {
    navigate(path);
    return;
  }
  closeArticleModal({ fromPopstate: true, restoreFocus: false });
  window.history.replaceState({}, "", path);
  render();
}

function setDocumentMeta(found, path) {
  const metadata = resolveDocumentMetadata(found, {
    path,
    siteOrigin: window.location.origin,
    statesById: maps?.states,
    productCopyBundle,
    mediaById: maps?.newsMedia,
    contributorsById: maps?.contributors,
    tagRegistry: publicTagRegistry,
    searchRecords: searchIndexRecords || [],
  });
  applyDocumentMetadata(document, metadata);
}

function notFoundPage(path) {
  return pageShell(`
    ${hero({
      eyebrow: "Address not found",
      title: "We could not find that address.",
      lead: "The address may be outdated or mistyped. Use the navigation to keep exploring.",
      actions: `<a class="button" href="${route("/")}">Back home</a>`,
      panel: `<aside class="hero-panel"><h2>Explore Snap Mortgage</h2><p>Compare locations, rates, loan options, calculators, learning guides, and lender-review information.</p></aside>`
    })}
  `);
}

function prequalHandoffPage() {
  const request = buildPrequalHandoffRequest({
    search: window.location.search,
    cachedState: localStorage.getItem("snapRatesMarketplaceState") || "{}"
  });
  const adapter = ratesMarketplaceFixture ? createFixtureMarketplaceAdapter(ratesMarketplaceFixture) : null;
  const view = createPrequalHandoffView({ adapter, request });
  return pageShell(renderPrequalHandoffMarkup(view));
}

function tagSearchRenderOptions(found) {
  return {
    registry: publicTagRegistry,
    records: searchIndexRecords || [],
    state: tagSearchStateFor(found),
    staticFallbackHtml: found?.type === "tag" ? staticTagFallbackHtml : "",
    staticFallbackTagId: found?.type === "tag" ? staticTagFallbackTagId : "",
    loadError: searchIndexLoadError,
    loading: !Array.isArray(searchIndexRecords) && !searchIndexLoadError,
    routeHref: route,
    fallbackImages: SEARCH_FALLBACK_IMAGES,
    resolveAuthor: resolveSearchAuthor,
    resolveLocation: resolveSearchLocation,
  };
}

function tagSearchPage(found) {
  return pageShell(renderTagSearchPage(tagSearchRenderOptions(found)));
}

function wireCurrentTagSearch(found) {
  const root = document.querySelector("[data-tag-search-page]");
  if (!root) return null;
  return wireTagSearch(root, {
    ...tagSearchRenderOptions(found),
    navigate: updateTagSearchHistory,
    track: trackPublicEvent,
  });
}

function render() {
  activeCampaignHeroController?.destroy();
  activeCampaignHeroController = null;
  activeTagSearchController?.destroy();
  activeTagSearchController = null;

  let path = currentPath();
  let found = maps.routes.get(path);
  const tagRouteRequest = resolveTagRouteRequest({
    pathname: path,
    search: window.location.search,
    hash: new URL(window.location.href).hash,
    registry: publicTagRegistry,
  });
  const routeTag = tagRouteRequest.tag;
  const canonicalTagRoute = tagRouteRequest.canonicalPath;
  if (tagRouteRequest.historical) {
    window.history.replaceState(
      window.history.state || {},
      "",
      `${canonicalTagRoute}${window.location.search}${window.location.hash}`,
    );
    path = canonicalTagRoute;
    found = maps.routes.get(path) || { type: "tag", item: routeTag };
  }
  if (tagRouteRequest.usesBaseSearch) {
    window.history.replaceState(
      window.history.state || {},
      "",
      tagRouteRequest.targetUrl,
    );
    path = tagRouteRequest.targetPath;
    found = maps.routes.get(path);
  }
  let html;
  if (!found) html = notFoundPage(path);
  else if (path === "/learning-center/search" || found.type === "tag") html = tagSearchPage(found);
  else if (found.type === "home") html = homePage();
  else if (found.type === "locations") html = locationsPage();
  else if (found.type === "rates") html = ratesPage();
  else if (found.type === "prequalHandoff") html = prequalHandoffPage();
  else if (found.type === "state") html = statePage(found.item);
  else if (found.type === "city") html = cityPage(found.item);
  else if (found.type === "product") html = productPage(found.item);
  else if (found.type === "blog") html = blogTopicPage(found.item);
  else if (found.type === "article") html = articlePage(found.item);
  else if (found.type === "contributor") html = contributorProfilePage(found.item);
  else if (found.type === "newsArticle") html = newsArticlePage(found.item);
  else if (found.type === "loanOfficer") html = loanOfficerPage(found.item);
  else if (found.type === "branch") html = branchPage(found.item);
  else if (found.type === "calculator") html = calculatorPage(found.item);
  else if (found.type === "directory" && found.item.route === "/calculators") html = calculatorsHubPage(found.item);
  else if (found.type === "directory") html = directoryPage(found.item);

  setDocumentMeta(found, `${path}${window.location.search}`);
  app.innerHTML = html;
  document.body.classList.remove("no-scroll");
  wireInteractions();
  activeCampaignHeroController = initCampaignHero(app);
  if (isTagSearchPath(path)) {
    activeTagSearchController = wireCurrentTagSearch(found);
    if (!Array.isArray(searchIndexRecords) && !searchIndexPromise) {
      void loadSearchIndexForDiscoveryRoute();
    }
  }
  if (found?.type === "contributor") {
    trackPublicEvent("contributor_profile_view", { contributorId: found.item.id });
  } else if (found?.type === "blog" && found.item.route === "/learning-center/editorial-team") {
    trackPublicEvent("contributor_directory_view");
  }
  window.initSnapSlotHero?.();
  flushPendingSave();
  requestAnimationFrame(scrollToCurrentAnchor);
  if (found?.type === "newsArticle") void hydrateDirectArticle(found.item);
}

function closeModal() {
  const modal = document.querySelector("[data-modal]");
  if (modal) modal.hidden = true;
  document.body.classList.remove("no-scroll");
  if (modalReturnFocus && document.contains(modalReturnFocus)) {
    modalReturnFocus.focus();
  }
  modalReturnFocus = null;
}

function openModal({ eyebrow = "Snap Homes", title, body, actions = [] }) {
  const modal = document.querySelector("[data-modal]");
  const titleNode = document.querySelector("[data-modal-title]");
  const bodyNode = document.querySelector("[data-modal-body]");
  const eyebrowNode = document.querySelector("[data-modal-eyebrow]");
  const actionsNode = document.querySelector("[data-modal-actions]");
  if (!modal || !titleNode || !bodyNode || !actionsNode) return;
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  eyebrowNode.textContent = String(eyebrow ?? "");
  titleNode.textContent = String(title ?? "");
  bodyNode.textContent = String(body ?? "");
  actionsNode.innerHTML = "";
  actions.forEach((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button${index ? " secondary" : ""}`;
    button.textContent = String(action.label ?? "");
    button.addEventListener("click", action.onClick || closeModal);
    actionsNode.appendChild(button);
  });
  modal.hidden = false;
  document.body.classList.add("no-scroll");
  actionsNode.querySelector("button")?.focus();
}

function openActionModal(action) {
  const config = CTA_MODALS[action] || CTA_MODALS.leadForm;
  openModal({
    title: config.title,
    body: config.body,
    actions: [{ label: config.primary || "Continue", onClick: closeModal }]
  });
}

function openAuthModal(reason = "Account creation and login are not connected here. Continuing changes only the account-menu state for this browsing session.") {
  openModal({
    eyebrow: "Snap Homes",
    title: "Account connection notice",
    body: reason,
    actions: [
      {
        label: "Continue for this session",
        onClick: () => {
          sessionState.isLoggedIn = true;
          persistSessionState();
          closeModal();
          render();
        }
      },
      {
        label: "Close",
        onClick: closeModal
      }
    ]
  });
}

function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = String(message ?? "");
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function updateAccountBadge() {
  const trigger = document.querySelector("[data-account-toggle]");
  if (!trigger) return;
  let badge = trigger.querySelector("[data-saved-count]");
  if (sessionState.savedCount <= 0) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "account-badge";
    badge.setAttribute("data-saved-count", "");
    trigger.appendChild(badge);
  }
  badge.textContent = String(sessionState.savedCount);
}

function animateSaveToAccount(trigger) {
  const target = document.querySelector("[data-account-toggle]");
  if (!trigger || !target) return;
  const from = trigger.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const chip = document.createElement("span");
  chip.className = "save-flight";
  chip.textContent = "Saved";
  chip.style.left = `${from.left + from.width / 2}px`;
  chip.style.top = `${from.top + from.height / 2}px`;
  chip.style.setProperty("--flight-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
  chip.style.setProperty("--flight-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  document.body.appendChild(chip);
  chip.addEventListener("animationend", () => chip.remove(), { once: true });
}

function saveToAccount(trigger, label = "Saved item") {
  if (!sessionState.isLoggedIn) {
    pendingSaveAfterLogin = { label };
    openAuthModal("Continue with the browsing-session account view to add this item. Nothing is transferred to a Snap Homes account.");
    return;
  }
  sessionState.savedCount += 1;
  sessionState.savedItems.push({
    label,
    route: currentPath(),
    savedAt: new Date().toISOString()
  });
  persistSessionState();
  animateSaveToAccount(trigger || document.querySelector("[data-account-toggle]"));
  updateAccountBadge();
  showToast("Saved for this browsing session");
}

function flushPendingSave() {
  if (!pendingSaveAfterLogin || !sessionState.isLoggedIn) return;
  const label = pendingSaveAfterLogin.label;
  pendingSaveAfterLogin = null;
  window.setTimeout(() => saveToAccount(document.querySelector("[data-account-toggle]"), label), 120);
}

function handleDocumentClick(event) {
  const retry = event.target.closest?.("[data-article-retry]");
  if (retry) {
    const article = maps.newsArticles[retry.getAttribute("data-article-retry")];
    if (article) {
      event.preventDefault();
      void openArticleModal(article, articleModalReturnFocus, { history: false, origin: articleModalOrigin || currentPath() });
      return;
    }
  }
  const anchor = event.target.closest?.("a[href]");
  if (anchor && event.button === 0 && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !anchor.target && !anchor.hasAttribute("download")) {
    const url = new URL(anchor.href, window.location.origin);
    if (shouldUseNativeTagFallbackNavigation({
      loadError: searchIndexLoadError,
      withinStaticResults: Boolean(anchor.closest(".static-tag-results")),
      pathname: url.pathname,
    })) return;
    if (anchor.hasAttribute("data-news-article-id")) {
      const article = maps.newsArticles[anchor.getAttribute("data-news-article-id")];
      if (article) {
        event.preventDefault();
        void openArticleModal(article, anchor);
        return;
      }
    }
    if (!anchor.hasAttribute("data-article-direct-link") && url.origin === window.location.origin && !anchor.getAttribute("href")?.startsWith("#")) {
      if (!(url.pathname === window.location.pathname && url.hash)) {
        event.preventDefault();
        if (anchor.closest("[data-article-modal]")) navigateFromArticleModal(`${url.pathname}${url.search}${url.hash}`);
        else navigate(`${url.pathname}${url.search}${url.hash}`);
        return;
      }
    }
  }
  const accountToggle = document.querySelector("[data-account-toggle]");
  const accountMenuNode = document.querySelector("[data-account-menu]");
  const root = document.querySelector("[data-account-root]");
  if (root && !root.contains(event.target) && accountMenuNode) {
    accountMenuNode.hidden = true;
    accountToggle?.setAttribute("aria-expanded", "false");
  }
}

function closeAccountMenu({ restoreFocus = true } = {}) {
  const accountToggle = document.querySelector("[data-account-toggle]");
  const accountMenuNode = document.querySelector("[data-account-menu]");
  if (!accountMenuNode || accountMenuNode.hidden) return;
  accountMenuNode.hidden = true;
  accountToggle?.setAttribute("aria-expanded", "false");
  if (restoreFocus) accountToggle?.focus();
}

function handleDocumentKeydown(event) {
  const articleModal = document.querySelector("[data-article-modal]");
  const actionModal = document.querySelector("[data-modal]");
  const modal = articleModal && !articleModal.hidden ? articleModal : actionModal;
  const modalIsOpen = modal && !modal.hidden;
  if (event.key === "Escape") {
    if (articleModal && !articleModal.hidden) closeArticleModal();
    else if (modalIsOpen) closeModal();
    else closeAccountMenu();
    return;
  }
  if (event.key !== "Tab" || !modalIsOpen) return;
  const focusable = [...modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && element.offsetParent !== null);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable.focus();
  } else if (!event.shiftKey && document.activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus();
  }
}

function handlePopstate(event) {
  const state = event.state || {};
  if (state.articleModal) {
    const article = maps.newsArticles[state.articleId];
    const trigger = [...document.querySelectorAll("[data-news-article-id]")].find((node) => node.getAttribute("data-news-article-id") === state.articleId) || null;
    if (article) void openArticleModal(article, trigger, { history: false, origin: state.origin || currentPath() });
    return;
  }
  const articleModal = document.querySelector("[data-article-modal]");
  if (articleModal && !articleModal.hidden) {
    closeArticleModal({ fromPopstate: true });
    return;
  }
  render();
}

function wireInteractions() {
  document.querySelectorAll("[data-contributor-portrait]").forEach((portrait) => {
    portrait.addEventListener("error", () => {
      if (portrait.getAttribute("src") !== silhouetteDataUri) portrait.setAttribute("src", silhouetteDataUri);
    }, { once: true });
  });

  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  toggle?.addEventListener("click", () => {
    nav?.classList.toggle("open");
  });

  const accountToggle = document.querySelector("[data-account-toggle]");
  const accountMenuNode = document.querySelector("[data-account-menu]");
  accountToggle?.addEventListener("click", () => {
    if (!accountMenuNode) return;
    const nextHidden = !accountMenuNode.hidden;
    accountMenuNode.hidden = nextHidden;
    accountToggle.setAttribute("aria-expanded", String(!nextHidden));
  });

  document.removeEventListener("click", handleDocumentClick);
  document.addEventListener("click", handleDocumentClick);

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
  document.querySelector("[data-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
  document.querySelectorAll("[data-article-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeArticleModal());
  });
  document.querySelector("[data-article-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeArticleModal();
  });
  document.removeEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("keydown", handleDocumentKeydown);

  wireRatesMarketplace(app, {
    fixture: ratesMarketplaceFixture,
    accountContext: sessionState,
    navigate,
    track: trackPublicEvent
  });

  document.querySelectorAll("[data-auth-action]").forEach((button) => {
    button.addEventListener("click", () => {
      closeAccountMenu({ restoreFocus: false });
      openAuthModal();
    });
  });

  document.querySelectorAll("[data-account-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-account-action");
      closeAccountMenu({ restoreFocus: false });
      if (action === "open") {
        if (sessionState.isLoggedIn) openActionModal("account");
        else openAuthModal("Account login is not connected here. Continue only for this browsing session.");
      }
      if (action === "signout") {
        resetSessionStateForSignOut();
        render();
        showToast("Signed out for this session");
      }
    });
  });

  document.querySelectorAll("[data-cta-action]").forEach((button) => {
    button.addEventListener("click", () => {
      closeAccountMenu({ restoreFocus: false });
      openActionModal(button.getAttribute("data-cta-action"));
    });
  });

  document.querySelectorAll("[data-provider-start]").forEach((button) => {
    button.addEventListener("click", () => {
      openModal({
        eyebrow: "Snap prequal",
        title: `Continue with ${button.getAttribute("data-provider-name") || "your selected provider"}`,
        body: "Review the selected provider and comparison summary. No name, email, phone number, application, or credit decision is submitted here.",
        actions: [{ label: "Continue", onClick: closeModal }]
      });
    });
  });

  document.querySelectorAll("[data-save-action]").forEach((button) => {
    button.addEventListener("click", () => saveToAccount(button, button.getAttribute("data-save-label") || "Saved item"));
  });

  document.querySelectorAll("[data-search-form][data-search-scope=\"learning\"]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = new FormData(form).get("q")?.toString() || "";
      navigate(serializeLearningCenterSearch(query));
    });
  });

  const locationSearchForm = document.querySelector(".locations-hero-search[data-search-form]");
  locationSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = new FormData(locationSearchForm).get("query")?.toString() || "";
    const destination = resolveLocationSearchRoute(query, [...data.states, ...data.cities]);
    navigate(route(destination));
  });

  const calcForm = document.querySelector("[data-calculator-form]");
  let calculatorFrame = 0;
  const scheduleCalculatorUpdate = () => {
    if (!calcForm) return;
    window.cancelAnimationFrame(calculatorFrame);
    calculatorFrame = window.requestAnimationFrame(() => calcForm.requestSubmit());
  };
  calcForm?.querySelectorAll("[data-calculator-slider]").forEach((slider) => {
    const name = slider.getAttribute("data-calculator-slider");
    const input = name ? [...calcForm.querySelectorAll("[data-calculator-input]")].find((field) => field.getAttribute("data-calculator-input") === name) : null;
    const syncSliderProgress = () => {
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const value = Number(slider.value) || 0;
      const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
      slider.style.setProperty("--slider-progress", `${Math.max(0, Math.min(percent, 100))}%`);
    };
    syncSliderProgress();
    slider.addEventListener("input", () => {
      if (input) input.value = slider.value;
      syncSliderProgress();
      scheduleCalculatorUpdate();
    });
    input?.addEventListener("input", () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) {
        slider.value = String(Math.max(Number(slider.min), Math.min(Number(slider.max), value)));
        syncSliderProgress();
        scheduleCalculatorUpdate();
      }
    });
  });
  const downInput = calcForm?.querySelector('[data-calculator-input="down"]');
  const priceInput = calcForm?.querySelector('[data-calculator-input="price"]');
  const downPercentInput = calcForm?.querySelector("[data-down-percent]");
  const downSlider = calcForm?.querySelector('[data-calculator-slider="down"]');
  const priceSlider = calcForm?.querySelector('[data-calculator-slider="price"]');
  const setSliderProgress = (slider) => {
    if (!slider) return;
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const value = Number(slider.value) || 0;
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
    slider.style.setProperty("--slider-progress", `${Math.max(0, Math.min(percent, 100))}%`);
  };
  const syncDownPercentFromAmount = () => {
    if (!downInput || !priceInput || !downPercentInput) return;
    const price = Number(priceInput.value) || 0;
    const down = Number(downInput.value) || 0;
    downPercentInput.value = price > 0 ? String(Math.round((down / price) * 1000) / 10) : "0";
  };
  const syncDownAmountFromPercent = () => {
    if (!downInput || !priceInput || !downPercentInput) return;
    const price = Number(priceInput.value) || 0;
    const percent = Number(downPercentInput.value) || 0;
    const nextDown = Math.max(0, Math.round(price * percent / 100));
    downInput.value = String(nextDown);
    if (downSlider) {
      downSlider.value = String(Math.max(Number(downSlider.min), Math.min(Number(downSlider.max), nextDown)));
      setSliderProgress(downSlider);
    }
  };
  downInput?.addEventListener("input", syncDownPercentFromAmount);
  priceInput?.addEventListener("input", syncDownPercentFromAmount);
  downSlider?.addEventListener("input", syncDownPercentFromAmount);
  priceSlider?.addEventListener("input", syncDownPercentFromAmount);
  downPercentInput?.addEventListener("input", () => {
    syncDownAmountFromPercent();
    scheduleCalculatorUpdate();
  });
  syncDownPercentFromAmount();
  calcForm?.querySelectorAll("[data-calculator-input]").forEach((input) => {
    input.addEventListener("input", scheduleCalculatorUpdate);
  });
  const updateDpaVisibility = () => {
    const dpaOption = calcForm?.querySelector("[data-dpa-option]");
    if (!dpaOption) return;
    const checkbox = dpaOption.querySelector('input[type="checkbox"]');
    dpaOption.hidden = false;
    dpaOption.classList.remove("disabled");
    if (checkbox) {
      checkbox.disabled = false;
    }
  };
  updateDpaVisibility();
  calcForm?.querySelectorAll('input[name="program"]').forEach((input) => {
    input.addEventListener("change", () => {
      calcForm.querySelectorAll(".product-toggle").forEach((toggle) => toggle.classList.remove("active"));
      input.closest(".product-toggle")?.classList.add("active");
      updateDpaVisibility();
      scheduleCalculatorUpdate();
    });
  });
  calcForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(calcForm);
    const kind = calcForm.dataset.calculatorKind || "payment";
    const selectedProgram = form.get("program")?.toString() || "conventional";
    const product = calculatorProductModules[selectedProgram] || calculatorProductModules.conventional;
    const price = Number(form.get("price")) || 0;
    const down = Number(form.get("down")) || 0;
    const annualRate = Number(form.get("rate")) || 0;
    const rate = annualRate / 100 / 12;
    const tax = ((Number(form.get("tax")) || 0) + (Number(form.get("taxInsurance")) || 0)) / 12;
    const insurance = (Number(form.get("insurance")) || 0) / 12;
    const hoa = Number(form.get("hoa")) || 0;
    const termYears = Number(form.get("termYears")) || 30;
    const months = Math.max(termYears * 12, 1);
    const rawPrincipal = Math.max(price - down, 0);
    const ltv = price > 0 ? rawPrincipal / price : 0;
    const refinanceBalance = Math.max(Number(form.get("balance")) || 0, 0);
    const fhaBaseLoanAmount = kind === "refinance" ? refinanceBalance : rawPrincipal;
    const fhaLtv = kind === "refinance" && price > 0 ? refinanceBalance / price : ltv;
    const downPaymentPercent = price > 0 ? (down / price) * 100 : 0;
    const vaTransaction = form.get("vaTransaction")?.toString() || (kind === "refinance" ? "irrrl" : "purchase");
    const vaUse = form.get("vaUse")?.toString() || "first";
    const vaFeeExempt = form.get("vaFeeExempt") === "yes";
    const selectedVaFundingFeeRate = vaFundingFeeRate({ transaction: vaTransaction, use: vaUse, downPaymentPercent, exempt: vaFeeExempt });
    const upfrontFeeRate = selectedProgram === "va" ? selectedVaFundingFeeRate : product.upfrontFeeRate || 0;
    const upfrontFee = rawPrincipal * upfrontFeeRate;
    const principal = rawPrincipal + upfrontFee;
    const pi = rate > 0 ? (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : principal / months;
    const fhaMip = fhaAnnualMipAssumption({ termYears, baseLoanAmount: fhaBaseLoanAmount, ltv: fhaLtv });
    const hypotheticalPmiRate = Math.max(Number(form.get("annualPmiRate")) || 0, 0) / 100;
    const annualMiRate = selectedProgram === "conventional"
      ? hypotheticalPmiRate
      : selectedProgram === "fha"
        ? fhaMip.annualRate
        : product.annualMiRate || 0;
    const monthlyMi = rawPrincipal * annualMiRate / 12;
    const closingCostRate = Math.max(Number(form.get("closingCostRate")) || 0, 0) / 100;
    const enteredClosingCosts = form.get("closingCosts") === null ? null : Math.max(Number(form.get("closingCosts")) || 0, 0);
    const closingCostAssumption = enteredClosingCosts ?? price * closingCostRate;
    const guardrails = [];
    if (selectedProgram === "conventional") guardrails.push("The calculator does not infer a conventional minimum down payment or PMI requirement. Confirm product eligibility, PMI pricing, and the current county conforming limit.");
    if (selectedProgram === "fha") {
      guardrails.push(kind === "affordability"
        ? "FHA MIP is not calculated in this DTI planning target because no base loan amount or LTV is modeled. Use a payment scenario and confirm current HUD rules and the official county limit."
        : `HUD matrix assumption: ${(fhaMip.annualRate * 100).toFixed(2)}% annual MIP for ${fhaMip.duration}, plus 1.75% financed UFMIP. Confirm current rules and the official county limit.`);
    }
    if (selectedProgram === "va") {
      guardrails.push(kind === "affordability"
        ? "VA funding fee is not calculated in this DTI planning target because no transaction loan amount is modeled. Use a payment or refinance scenario and confirm eligibility, entitlement, use history, and any exemption."
        : `VA ${vaTransaction.toUpperCase()} funding-fee scenario: ${(selectedVaFundingFeeRate * 100).toFixed(2)}%${vaFeeExempt ? " because exemption is selected" : `, ${vaUse} use`}. VA and lender review must confirm eligibility, entitlement, occupancy, transaction type, use history, and exemption.`);
    }
    if (selectedProgram === "usda") guardrails.push("USDA property and income verification is required through the official eligibility tools and a participating lender. ZIP alone never determines eligibility. Confirm the current fee with USDA and the lender before relying on this estimate.");
    let title = "Estimated payment";
    let payment = pi + tax + insurance + hoa + monthlyMi;
    let note = `Uses ${product.label} planning assumptions. Includes principal and interest, entered taxes, insurance, HOA, and ${product.miLabel}. ${upfrontFee > 0 ? `${(upfrontFeeRate * 100).toFixed(2)}% upfront fee is financed in principal.` : "No upfront program fee is included."}`;
    let chartTitle = "Monthly estimate breakdown";
    let chartSummary = "This chart updates from the inputs shown in the calculator.";
    let chartPoints = [
      { label: "Principal and interest", value: pi },
      { label: "Taxes", value: tax },
      { label: "Insurance", value: insurance },
      { label: "HOA", value: hoa },
      { label: product.miLabel, value: monthlyMi },
    ];
    let chartOptions = {};
    let secondaryMetricLabel = "Entered down + closing costs";
    let secondaryMetricValue = down + closingCostAssumption;
    let availableCash = down;
    let comparisonVisual = "";

    if (kind === "affordability") {
      const monthlyIncome = (Number(form.get("income")) || 0) / 12;
      const debts = Number(form.get("debts")) || 0;
      const dtiAssumption = Math.max(Math.min(Number(form.get("dtiAssumption")) || 0, 100), 0) / 100;
      payment = Math.max(monthlyIncome * dtiAssumption - debts, 0);
      title = "Planning housing-payment target";
      note = `Uses the editable ${Math.round(dtiAssumption * 1000) / 10}% DTI planning assumption. This is not an eligibility cap, affordability decision, approval threshold, or program rule.`;
      chartTitle = "Monthly DTI planning budget";
      chartSummary = "This illustration applies the entered DTI assumption to gross monthly income, then subtracts entered monthly debts.";
      chartPoints = [
        { label: "Target housing payment", value: payment },
        { label: "Monthly debts", value: debts },
        { label: "Remaining gross income", value: Math.max(monthlyIncome - debts - payment, 0) },
      ];
      chartOptions = { valueHeader: "Monthly budget" };
      secondaryMetricLabel = "Cash available";
      secondaryMetricValue = down;
    } else if (kind === "refinance") {
      const balance = refinanceBalance;
      const refiUpfrontFee = balance * upfrontFeeRate;
      const refinancePrincipal = balance + refiUpfrontFee;
      const refinancePi = rate > 0 ? (refinancePrincipal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : refinancePrincipal / months;
      const currentPayment = Number(form.get("currentPayment")) || 0;
      const closingCosts = Number(form.get("closingCosts")) || 0;
      const currentEscrow = (Number(form.get("currentTax")) || 0) + (Number(form.get("currentInsurance")) || 0) + (Number(form.get("currentMi")) || 0);
      const enteredNewMi = Number(form.get("newMi")) || 0;
      const calculatedNewMi = selectedProgram === "fha"
        ? balance * fhaMip.annualRate / 12
        : selectedProgram === "usda"
          ? balance * (product.annualMiRate || 0) / 12
          : selectedProgram === "va"
            ? 0
            : enteredNewMi;
      const newEscrow = (Number(form.get("newTax")) || 0) + (Number(form.get("newInsurance")) || 0) + calculatedNewMi;
      const refinanceType = selectedProgram === "va" ? (vaTransaction === "irrrl" ? "IRRRL" : "cash-out refinance") : "refinance";
      const currentTotal = currentPayment + currentEscrow;
      const newTotal = refinancePi + newEscrow;
      const savings = currentTotal - newTotal;
      const comparisonCosts = closingCosts + refiUpfrontFee;
      payment = newTotal;
      title = "Estimated new payment";
      note = savings > 0
        ? `${product.label} ${refinanceType} inputs show an approximate $${Math.round(savings).toLocaleString()} monthly difference. Simple cost-recovery period: ${Math.max(Math.ceil(comparisonCosts / savings), 1)} months using entered closing costs plus the modeled upfront fee.`
        : `${product.label} ${refinanceType} inputs do not show a lower total monthly payment. This comparison does not determine refinance benefit or eligibility.`;
      chartTitle = "Refinance payment comparison";
      chartSummary = "Uses entered current costs; new FHA MIP or USDA annual fee is program-calculated, VA monthly MI is zero, and conventional PMI is entered in Advanced settings.";
      chartPoints = [
        { label: "Current mortgage", value: currentTotal },
        { label: "New mortgage", value: newTotal },
        { label: savings >= 0 ? "Estimated monthly reduction" : "Estimated monthly increase", value: Math.abs(savings) },
      ];
      chartOptions = { chartType: "bar", valueHeader: "Monthly amount" };
      comparisonVisual = `${twoBarComparison({
        title: "Current vs new mortgage",
        summary: "Two-bar comparison including principal and interest plus tax, insurance, and MI assumptions.",
        leftLabel: "Current mortgage",
        leftValue: currentTotal,
        rightLabel: "New mortgage",
        rightValue: newTotal,
      })}${uploadMortgageStatementCta()}`;
      secondaryMetricLabel = "Closing costs";
      secondaryMetricValue = closingCosts;
    } else if (kind === "rentBuy") {
      const rent = Number(form.get("rent")) || 0;
      const timeline = Number(form.get("timeline")) || 1;
      const rentGrowth = (Number(form.get("rentGrowth")) || 0) / 100;
      const futureRent = rent * Math.pow(1 + rentGrowth, timeline);
      title = "Partial rent-versus-buy payment comparison";
      note = `Compares $${Math.round(rent).toLocaleString()} rent today, about $${Math.round(futureRent).toLocaleString()} rent after ${timeline} years, and the entered ${product.label} monthly payment components. It excludes appreciation, maintenance, buying costs, selling costs, investment opportunity cost, tax treatment, and full transaction economics.`;
      chartTitle = "Partial rent-versus-buy monthly comparison";
      chartSummary = "Monthly payment illustration only; it does not support a buy-versus-rent decision.";
      chartPoints = [
        { label: "Monthly rent", value: rent },
        { label: "Estimated buy payment", value: payment },
        { label: "Future rent", value: futureRent },
      ];
      chartOptions = { chartType: "bar", valueHeader: "Monthly amount" };
      comparisonVisual = rentBuyLineComparison({ rent, buyPayment: payment, rentGrowth, timeline });
      secondaryMetricLabel = "Time horizon";
      secondaryMetricValue = timeline;
    } else if (kind === "downPayment") {
      title = "Illustrative cash assumptions";
      const applyDpa = form.get("applyDpa") === "yes";
      const dpaAssistance = 0;
      const baseCashNeeded = down + closingCostAssumption;
      payment = Math.max(baseCashNeeded - dpaAssistance, 0);
      note = `${product.label} illustration combines the entered down payment with an editable ${Math.round(closingCostRate * 1000) / 10}% closing-cost assumption. It is not a minimum down payment, local fee estimate, cash-to-close result, or Loan Estimate. Assistance is excluded${applyDpa ? " because no specific program has been verified" : ""}. Estimated monthly payment from the other entered assumptions: $${Math.round(pi + tax + insurance + monthlyMi).toLocaleString()}.`;
      chartTitle = "Entered cash assumptions by component";
      chartSummary = "User-controlled down-payment and closing-cost assumptions; no eligibility or program minimum is inferred.";
      chartPoints = [
        { label: "Down payment assumption", value: down },
        { label: "Closing-cost assumption", value: closingCostAssumption },
        { label: "Verified assistance included", value: dpaAssistance },
      ];
      chartOptions = { chartType: "bar", valueHeader: "Estimated cash" };
      availableCash = Math.max(Number(form.get("cashAvailable")) || 0, 0);
      secondaryMetricLabel = "Cash available";
      secondaryMetricValue = availableCash;
      comparisonVisual = "";
      var downPaymentVisualMeta = {
        productLabel: product.label,
        downPaymentAssumption: down,
        closingCosts: closingCostAssumption,
        dpaAssistance,
        baseRequired: baseCashNeeded,
      };
    }
    const result = document.querySelector("[data-calculator-result]");
    if (result) {
      const guardrailMarkup = guardrails.length
        ? `<div class="guardrail-list"><h3>Product guardrails</h3><ul>${guardrails.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`
        : `<div class="guardrail-list ok"><h3>Items to verify</h3><p>The visible assumptions do not trigger an additional warning. A lender still needs to review the borrower, property, program rules, and current limits.</p></div>`;
      result.innerHTML = `
        <h2>${esc(title)}</h2>
        ${calculatorResultVisual({ title, payment, points: chartPoints, kind, metricLabel: kind === "downPayment" ? "Illustrative cash total" : title, note, principal, monthlyRate: rate, months, availableCash, ...(downPaymentVisualMeta || {}) })}
        ${comparisonVisual}
        <div class="product-status ${esc(product.className)}"><strong>${esc(product.label)}: ${esc(product.status)}</strong><span>${esc(product.notes.join(" "))}</span></div>
        ${guardrailMarkup}
        ${calculatedScenarioChart(calcForm.dataset.calculatorId || "calc-payment", chartTitle, chartSummary, chartPoints, chartOptions)}
      `;
      wireRentBuyComparisonTabs(result);
      result.querySelectorAll("[data-cta-action]").forEach((button) => {
        button.addEventListener("click", () => {
          closeAccountMenu({ restoreFocus: false });
          openActionModal(button.getAttribute("data-cta-action"));
        });
      });
      result.querySelectorAll("[data-save-action]").forEach((button) => {
        button.addEventListener("click", () => saveToAccount(button, button.getAttribute("data-save-label") || "Saved item"));
      });
    }
  });
  if (calcForm) calcForm.requestSubmit();

  wireDirectoryFilters();
  document.querySelectorAll("[data-news-carousel]").forEach((button) => {
    button.addEventListener("click", () => {
      const root = button.closest("[data-news-carousel-root]");
      const track = root?.querySelector("[data-news-carousel-track]") || document.querySelector("[data-news-carousel-track]");
      if (!track) return;
      track.scrollBy({ left: track.clientWidth * (button.dataset.newsCarousel === "previous" ? -0.9 : 0.9), behavior: "smooth" });
    });
  });
}

function wireDirectoryFilters() {
  const form = document.querySelector("[data-directory-filter]");
  if (!form) return;
  const input = form.querySelector("input[name='filter']");
  const results = Array.from(document.querySelectorAll("[data-directory-result]"));
  const empty = document.querySelector("[data-directory-empty]");
  const clearButton = document.querySelector("[data-directory-clear]");
  const applyFilter = () => {
    const query = input?.value.trim().toLowerCase() || "";
    let shown = 0;
    results.forEach((result) => {
      const text = result.getAttribute("data-search-text")?.toLowerCase() || "";
      const match = !query || text.includes(query);
      result.hidden = !match;
      if (match) shown += 1;
    });
    if (empty) empty.hidden = shown !== 0;
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilter();
  });
  input?.addEventListener("input", applyFilter);
  clearButton?.addEventListener("click", () => {
    if (input) input.value = "";
    applyFilter();
    input?.focus();
    trackPublicEvent("directory_filter_cleared", { route: currentPath() });
  });
}

function wireRentBuyComparisonTabs(root = document) {
  const analysisGroups = Array.from(root.querySelectorAll("[data-analysis-tabs]"));
  analysisGroups.forEach((group) => {
    const viewButtons = Array.from(group.querySelectorAll("[data-analysis-tab]"));
    const viewPanels = Array.from(group.querySelectorAll("[data-analysis-panel]"));
    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.getAttribute("data-analysis-tab");
        viewButtons.forEach((item) => item.classList.toggle("active", item === button));
        viewPanels.forEach((panel) => {
          panel.classList.toggle("active", panel.getAttribute("data-analysis-panel") === view);
        });
      });
    });
  });
  const buttons = Array.from(root.querySelectorAll("[data-rent-buy-year]"));
  if (!buttons.length) return;
  const panels = Array.from(root.querySelectorAll("[data-rent-buy-year-panel]"));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const year = button.getAttribute("data-rent-buy-year");
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-rent-buy-year-panel") === year);
      });
    });
  });
}

function scrollToCurrentAnchor() {
  const anchor = currentAnchor();
  if (!anchor) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return;
  }
  const target = document.getElementById(anchor);
  if (!target) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return;
  }
  target.scrollIntoView({ block: "start" });
}

async function boot() {
  try {
    const [response, optionalNews, optionalMedia, optionalMarketCharts, optionalRatesMarketplace, optionalContributors, optionalTopicHubs, optionalEditorialBundle, optionalProductCopy, optionalPublicTagRegistry] = await Promise.all([
      fetch(DATA_URL),
      fetchOptionalJson(NEWS_INDEX_URL),
      fetchOptionalJson(NEWS_MEDIA_URL),
      fetchOptionalJson(MARKET_CHART_FIXTURES_URL),
      fetchOptionalJson(RATES_MARKETPLACE_FIXTURE_URL),
      fetchOptionalJson(CONTRIBUTORS_URL),
      fetchOptionalJson(TOPIC_HUBS_URL),
      fetchOptionalJson(EDITORIAL_CONTENT_URL),
      fetchOptionalJson(PRODUCT_COPY_URL),
      fetchOptionalJson(PUBLIC_TAG_REGISTRY_URL)
    ]);
    if (!response.ok) throw new Error("The requested content could not be loaded.");
    const loadedData = await response.json();
    editorialContent = loadOptionalEditorialContent(optionalEditorialBundle, optionalContributors, optionalTopicHubs);
    productCopyBundle = optionalProductCopy || { products: [] };
    publicTagRegistry = normalizeTagRegistry(optionalPublicTagRegistry || {});
    const mergedArticles = mergeEditorialArticles(loadedData.articles, optionalEditorialBundle);
    data = {
      ...loadedData,
      articles: applyArticleAuthorIds(editorialContent, mergedArticles)
    };
    newsIndex = optionalNews || { articles: [] };
    mediaManifest = optionalMedia || { media: [] };
    marketChartFixtures = loadOptionalMarketChartFixtures(optionalMarketCharts);
    ratesMarketplaceFixture = optionalRatesMarketplace;
    maps = buildMaps(data, newsIndex, mediaManifest, editorialContent, publicTagRegistry);
    loadSessionState();
    if (shouldPreserveStaticTagPage({
      registry: publicTagRegistry,
      hasStaticTagPage,
    })) return;
    render();
    window.addEventListener("popstate", handlePopstate);
  } catch {
    app.innerHTML = `
      <main class="error-state" id="main">
        <div>
          <h1>We could not load Snap Mortgage.</h1>
          <p>Refresh and try again. If the problem continues, return home.</p>
        </div>
      </main>
    `;
  }
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function loadOptionalEditorialContent(editorialBundleRaw, contributorsRaw, topicHubsRaw) {
  return normalizeEditorialContentWithFallback(editorialBundleRaw, {
      contributors: contributorsRaw,
      topicHubs: topicHubsRaw
  });
}

function loadOptionalMarketChartFixtures(raw) {
  if (!raw) return { sources: [], charts: [], snapshotSources: [] };
  try {
    return loadMarketChartFixtures(raw);
  } catch {
    return { sources: [], charts: [], snapshotSources: [] };
  }
}

boot();

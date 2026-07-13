import { renderArticleContent } from "/site/news-renderer.mjs";
import {
  chartFixtureFor,
  loadMarketChartFixtures,
  renderChartFigure,
  renderSnapshotSourceNote,
  wireMarketChartInteractions,
} from "/site/market-charts.mjs";
import { renderLocationsHero } from "/site/locations-hero.mjs";
import { renderCampaignHero } from "/site/campaign-hero.mjs";
import { buildLearningCenterModel } from "/site/learning-center.mjs";
import {
  applyArticleAuthorIds,
  articlesForContributor,
  normalizeEditorialContent,
  renderBylineModel,
  silhouetteDataUri,
} from "/site/editorial-content.mjs";
import { renderRatesMarketplace, wireRatesMarketplace } from "/site/rates-marketplace-ui.mjs";
import { createFixtureMarketplaceAdapter } from "/site/rates-marketplace.mjs";
import { buildPrequalHandoffRequest, createPrequalHandoffView, renderPrequalHandoffMarkup } from "/site/prequal-handoff.mjs";

const DATA_URL = "/mock-data/production-seed.json";
const NEWS_INDEX_URL = "/mock-data/location-news-index.json";
const NEWS_MEDIA_URL = "/mock-data/location-news-media-manifest.json";
const MARKET_CHART_FIXTURES_URL = "/mock-data/market-chart-fixtures.json";
const RATES_MARKETPLACE_FIXTURE_URL = "/mock-data/rates-marketplace-fixtures.json";
const CONTRIBUTORS_URL = "/mock-data/editorial/contributors.json";
const TOPIC_HUBS_URL = "/mock-data/editorial/topic-hubs.json";
const EDITORIAL_CONTENT_URL = "/mock-data/editorial-content.json";
const app = document.getElementById("app");
wireMarketChartInteractions(app);

let data;
let maps;
let newsIndex = { articles: [] };
let mediaManifest = { media: [] };
let marketChartFixtures = { sources: [], charts: [], snapshotSources: [] };
let ratesMarketplaceFixture = null;
let editorialContent = normalizeEditorialContent();
const articleBundlePromises = new Map();
let articleModalReturnFocus = null;
let articleModalOrigin = null;
let articleModalScrollY = 0;
let activeArticleRequestId = 0;

const ASSETS = {
  logo: "/site/assets/images/snap-loans.svg",
  borrower: "/site/assets/images/borrower.png",
  mortgage: "/site/assets/images/mortgage.png",
  house: "/site/assets/images/house-icon.png"
};

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
    date: "2026-07-02",
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
    date: "Available after review",
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
    rate: "6.43%",
    apr: "Benchmark average",
    points: "Survey average terms",
    sourceId: "freddiePmms",
    next: "/calculators/mortgage-payment"
  },
  {
    label: "15-year fixed benchmark",
    rate: "5.79%",
    apr: "Benchmark average",
    points: "Survey average terms",
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
    tradeoff: "The right path can depend on down payment, credit profile, income, assets, property type, occupancy, and local costs."
  },
  "product-refinance": {
    fit: "For homeowners comparing a new mortgage against their current payment, term, closing costs, and long-term interest.",
    tradeoff: "A lower monthly payment can still increase total interest or extend the payoff timeline."
  },
  "product-fha": {
    fit: "For buyers who may want to compare a lower down payment path with FHA mortgage insurance and county limits.",
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
    fit: "For homeowners comparing access to equity through a HELOC or home equity path.",
    tradeoff: "Open-end credit terms, variable APRs, fees, draw periods, repayment terms, and lien position need careful review."
  },
  "product-cash-out-refinance": {
    fit: "For homeowners comparing a new mortgage balance against debt consolidation, improvements, or liquidity goals.",
    tradeoff: "Cash-out changes the loan balance and can change payment, equity, term, total interest, and risk."
  }
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadSessionState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionState));
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

function buildMaps(seed, compactNewsIndex = { articles: [] }, compactMediaManifest = { media: [] }, editorialContent = {}) {
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

function trackPublicEvent(name, payload = {}) {
  const allowedPayloadKeys = ["field", "offerId", "resultType", "sort", "tab", "visibleCount", "contributorId"];
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
          <button type="button" data-cta-action="leadForm">Request mortgage guidance</button>
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
        <button type="button" data-cta-action="leadForm">Request mortgage guidance</button>
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
          <img class="brand-logo" src="${ASSETS.logo}" alt="Snap Loans" />
          <span class="brand-sub">Mortgage intelligence</span>
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
          ${navLink("/loan-officers", "Experts")}
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
          <p>Local mortgage intelligence, rate details, market data, education, and licensed expert help.</p>
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
          <button type="button" data-cta-action="leadForm">Request guidance</button>
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

function hero({ eyebrow, title, lead, actions = "", panel = "" }) {
  return `
    <section class="hero-band">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">${esc(eyebrow)}</p>
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
    <section class="section compact route-strip-section" aria-label="Popular mortgage paths">
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

function downPaymentReadinessBar({ required, available, productLabel = "Selected product", minDown = 0, closingCosts = 0, dpaAssistance = 0, baseRequired = required }) {
  const cleanRequired = Math.max(0, Math.round(Number(required) || 0));
  const cleanAvailable = Math.max(0, Math.round(Number(available) || 0));
  const cleanBaseRequired = Math.max(cleanRequired, Math.round(Number(baseRequired) || cleanRequired));
  const cleanMinDown = Math.max(0, Math.round(Number(minDown) || 0));
  const cleanClosing = Math.max(0, Math.round(Number(closingCosts) || 0));
  const cleanDpa = Math.max(0, Math.round(Number(dpaAssistance) || 0));
  const max = Math.max(cleanAvailable, cleanBaseRequired, cleanRequired, 1);
  const availableWidth = Math.max((cleanAvailable / max) * 100, cleanAvailable > 0 ? 3 : 0);
  const neededWidth = Math.max((cleanRequired / max) * 100, cleanRequired > 0 ? 3 : 0);
  const status = cleanAvailable >= cleanRequired ? "Cash available meets this dummy estimate." : `${currency(cleanRequired - cleanAvailable)} estimated gap after product assumptions.`;
  return `<div class="calculator-horizontal-chart">
    <div class="comparison-chart-header">
      <strong>Cash available vs. cash needed</strong>
      <p>${esc(productLabel)} estimate includes minimum down payment and 4% closing costs. DPA is applied only when selected and product-eligible.</p>
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
      <span>Minimum down <strong>${currency(cleanMinDown)}</strong></span>
      <span>Closing costs (4%) <strong>${currency(cleanClosing)}</strong></span>
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
      <strong>Have the current mortgage statement?</strong>
      <p>Upload it to prefill payoff, escrow, insurance, and MI details when the live integration is connected.</p>
    </div>
    <button class="button secondary" type="button" data-cta-action="prequal">Upload Mortgage Statement</button>
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

function rentBuyLineComparison({ rent, buyPayment, rentGrowth, timeline, price, down, annualRate, termYears }) {
  const years = Math.max(Math.round(Number(timeline) || 1), 1);
  const steps = Math.min(Math.max(years, 2), 8);
  const monthlyRate = (Number(annualRate) || 0) / 100 / 12;
  const totalMonths = Math.max((Number(termYears) || 30) * 12, 1);
  const originalBalance = Math.max((Number(price) || 0) - (Number(down) || 0), 0);
  const appreciationRate = 0.03;
  const series = Array.from({ length: steps + 1 }, (_, index) => {
    const year = Math.round((years * index) / steps);
    const homeValue = (Number(price) || 0) * Math.pow(1 + appreciationRate, year);
    const balance = loanBalanceAfterMonths(originalBalance, monthlyRate, totalMonths, year * 12);
    return {
      year,
      rent: rent * Math.pow(1 + rentGrowth, year),
      buy: buyPayment,
      equity: Math.max(homeValue - balance, 0)
    };
  });
  const values = series.flatMap((point) => [point.rent, point.buy]).map((value) => Number(value) || 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const width = 620;
  const height = 250;
  const padX = 42;
  const padY = 34;
  const xy = (value, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    const y = height - padY - ((value - min) / span) * (height - padY * 2);
    return `${Math.round(x)},${Math.round(y)}`;
  };
  const rentPoints = series.map((point, index) => xy(point.rent, index)).join(" ");
  const buyPoints = series.map((point, index) => xy(point.buy, index)).join(" ");
  const last = series[series.length - 1];
  const equityValues = series.map((point) => point.equity);
  const equityMax = Math.max(...equityValues, 1);
  const equityY = (value) => height - padY - (value / equityMax) * (height - padY * 2);
  const equityPoints = series.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    return `${Math.round(x)},${Math.round(equityY(point.equity))}`;
  }).join(" ");
  const equityArea = `${padX},${height - padY} ${equityPoints} ${width - padX},${height - padY}`;
  const comparisonYears = [5, 10, 15, 20, 25, 30];
  const selectedYear = comparisonYears.includes(years) ? years : 10;
  const comparisonPanels = comparisonYears.map((year) => {
    const projectedRent = rent * Math.pow(1 + rentGrowth, year);
    const homeValue = (Number(price) || 0) * Math.pow(1 + appreciationRate, year);
    const balance = loanBalanceAfterMonths(originalBalance, monthlyRate, totalMonths, year * 12);
    const equity = Math.max(homeValue - balance, 0);
    const cumulativeRent = rentGrowth > 0
      ? rent * 12 * ((Math.pow(1 + rentGrowth, year) - 1) / rentGrowth)
      : rent * 12 * year;
    return `<div class="rent-buy-year-panel${year === selectedYear ? " active" : ""}" data-rent-buy-year-panel="${year}">
      ${twoBarComparison({
        title: `${year}-year monthly comparison`,
        summary: "Projected rent is compared with the estimated ownership payment at the selected horizon.",
        leftLabel: "Projected rent",
        leftValue: projectedRent,
        rightLabel: "Estimated buy payment",
        rightValue: buyPayment,
      })}
      <div class="rent-buy-equity-snapshot">
        <span>Estimated equity accumulated</span>
        <strong>${currency(equity)}</strong>
        <small>Compared with about ${currency(cumulativeRent)} in cumulative rent paid over ${year} years.</small>
      </div>
    </div>`;
  }).join("");
  return `<div class="calculator-analysis-tabs" data-analysis-tabs>
    <div class="calculator-analysis-tab-list" role="tablist" aria-label="Rent versus buy analysis views">
      <button class="active" type="button" data-analysis-tab="timeline">Timeline</button>
      <button type="button" data-analysis-tab="comparison">Compare horizon</button>
    </div>
    <div class="calculator-analysis-panel active" data-analysis-panel="timeline">
      <div class="calculator-comparison-chart">
    <div class="comparison-chart-header">
      <strong>Rent vs buy over time</strong>
      <p>Projected rent uses the rent-growth assumption. Buy payment is held flat for this planning view.</p>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected rent compared with estimated buy payment over ${years} years">
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
      <span><i class="buy-key"></i>Estimated buy payment <strong>${currency(buyPayment)}</strong></span>
    </div>
    <div class="comparison-chart-header equity-header">
      <strong>Estimated equity accumulated</strong>
      <p>Planning estimate uses down payment, scheduled principal paydown, and a 3% annual home-value growth assumption.</p>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Estimated home equity accumulated over ${years} years">
      <path class="comparison-axis" d="M${padX} ${height - padY}H${width - padX}" />
      <polygon class="equity-area" points="${equityArea}" />
      <polyline class="comparison-line equity-line" points="${equityPoints}" />
      ${series.map((point, index) => {
        const [x, y] = equityPoints.split(" ")[index].split(",");
        return `<circle class="comparison-dot equity-dot" cx="${x}" cy="${y}" r="4"><title>Year ${point.year} estimated equity: ${currency(point.equity)}</title></circle>`;
      }).join("")}
      <text x="${padX}" y="${height - 8}">Today</text>
      <text x="${width - padX - 54}" y="${height - 8}">Year ${years}</text>
    </svg>
    <div class="comparison-legend">
      <span><i class="equity-key"></i>Estimated equity <strong>${currency(series[0].equity)} &rarr; ${currency(last.equity)}</strong></span>
    </div>
      </div>
    </div>
    <div class="calculator-analysis-panel" data-analysis-panel="comparison">
      <div class="rent-buy-year-tabs">
      <div class="comparison-chart-header">
        <strong>Horizon comparison</strong>
        <p>Select a time horizon to compare the monthly payment view and the expected equity position.</p>
      </div>
      <div class="rent-buy-year-buttons" role="tablist" aria-label="Rent versus buy horizon">
        ${comparisonYears.map((year) => `<button class="${year === selectedYear ? "active" : ""}" type="button" data-rent-buy-year="${year}">${year} years</button>`).join("")}
      </div>
      ${comparisonPanels}
      </div>
    </div>
  </div>`;
}

function calculatorResultVisual({ title, payment, points, kind, metricLabel, note, principal = 0, monthlyRate = 0, months = 360, availableCash = 0, productLabel = "Selected product", minDown = 0, closingCosts = 0, dpaAssistance = 0, baseRequired = payment }) {
  if (kind === "payment") {
    return calculatorTabbedPanel({
      kind,
      chartHtml: resultDonutMarkup({ title, payment, points, kind, metricLabel }),
      amortizationHtml: amortizationPanel({ principal, monthlyRate, months }),
      scheduleHtml: schedulePanel({ principal, monthlyRate, months }),
    });
  }
  if (kind === "downPayment") {
    return downPaymentReadinessBar({ required: payment, available: availableCash, productLabel, minDown, closingCosts, dpaAssistance, baseRequired });
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
      <strong>Hoping for a lower monthly payment?</strong>
      <button class="button estimate-button" type="button" data-cta-action="prequal">Start Your Auto-Prequal &rsaquo;</button>
    </div>
  </div>`;
}

function disclosureFor(pageType, title = "Disclosure notes") {
  const copy = {
    city: "Market figures and payment scenarios are educational planning information. Actual taxes, insurance, HOA dues, loan terms, APR, cash to close, and eligibility require property-specific and borrower-specific review.",
    state: "State and city comparisons are informational. Product availability, licensing, loan limits, taxes, insurance, and pricing can vary by county, property, borrower profile, and date.",
    product: "Loan products are subject to underwriting, program rules, property review, investor guidelines, and state or county limits. This page is not an approval or personalized credit offer.",
    calculator: "Calculator outputs are estimates based on the inputs shown. They are not a Loan Estimate, credit approval, rate lock, or commitment to lend.",
    article: "Editorial content is educational and works best when reviewed with a licensed professional before making mortgage decisions.",
    loan_officer: "Loan officer availability, licensing, NMLS information, specialties, reviews, and service areas must remain controlled by approved licensing and compliance records.",
    branch: "Branch information, team rosters, service areas, licensing, and contact options are subject to company records and state requirements.",
    directory: "Directory results are organized by service area, loan type, language, and page relationships. They are not rankings or endorsements."
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
    primary: "Get guidance",
    secondary: "Compare options"
  };
}

const CTA_TYPES = {
  account: {
    eyebrow: "Account",
    title: "Open My Account",
    text: "Continue to Snap Homes when you are ready to manage saved mortgage research and account activity.",
    label: "Open My Account",
    action: "account",
    iconName: "account"
  },
  leadForm: {
    eyebrow: "Guidance",
    title: "Ask for mortgage guidance",
    text: "Get ready to connect with licensed help when your question needs a person.",
    label: "Request guidance",
    action: "leadForm",
    iconName: "leadForm"
  },
  prequal: {
    eyebrow: "Prequal",
    title: "Start a prequalification conversation",
    text: "Organize the borrower, property, and timing details a licensed loan officer may need to review next steps.",
    label: "Start prequalification",
    action: "prequal",
    iconName: "prequal"
  },
  watchlist: {
    eyebrow: "Watchlist",
    title: "Add to watchlist",
    text: "Save this market, rate, calculator, product, or article to your account while you keep browsing.",
    label: "Add to watchlist",
    action: "watchlist",
    iconName: "watchlist"
  },
  loContact: {
    eyebrow: "Loan officer",
    title: "Contact a licensed loan officer",
    text: "Bring your market, product, and payment questions into a conversation with a licensed expert.",
    label: "Contact an expert",
    action: "loContact",
    iconName: "expert"
  },
  rateReview: {
    eyebrow: "Rate review",
    title: "Request a rate review",
    text: "Compare public benchmarks with the details that may affect rate, APR, points, and fees.",
    label: "Review rates",
    action: "rateReview",
    iconName: "rates"
  },
  compareOffer: {
    eyebrow: "Compare offer",
    title: "Compare an existing offer",
    text: "Organize rate, APR, points, fees, loan amount, and assumptions before discussing offer questions.",
    label: "Compare an offer",
    action: "compareOffer",
    iconName: "compare"
  }
};

const CTA_MODALS = {
  account: {
    title: "Continue to Snap Homes",
    body: `${SNAP_CUSTOMER.name}, your saved mortgage research and account activity are available in Snap Homes.`,
    primary: "Close"
  },
  leadForm: {
    title: "Connect with mortgage guidance",
    body: "A licensed mortgage professional can help review your goals, property, timing, and questions. No information has been sent.",
    primary: "Close"
  },
  prequal: {
    title: "Start a prequalification conversation",
    body: "A loan officer may review borrower, property, income, asset, and timing details. This is not a credit decision, approval, rate lock, or commitment to lend.",
    primary: "Close"
  },
  rateReview: {
    title: "Review rates",
    body: "Personalized rates, APR, points, fees, and payments depend on borrower facts, property details, loan terms, and market conditions. A licensed review can compare those details.",
    primary: "Close"
  },
  compareOffer: {
    title: "Compare an offer",
    body: "Bring the rate, APR, points, fees, loan amount, and assumptions into a licensed conversation. Documents are not collected or reviewed here, and no savings are promised.",
    primary: "Close"
  },
  loContact: {
    title: "Connect with a licensed loan officer",
    body: "Choose a loan officer who serves your market and mortgage goal. No message has been sent.",
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

function ctaDeck(types, title = "Choose a next step", text = "Move from education into a saved account view, contact request, prequalification conversation, or offer comparison.") {
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

  return section("Local loan guidance", { label: "Loan options by location", text: "Compare the loan path against local prices, taxes, insurance, and loan-limit details." }, `<div class="module-list">${cards}</div>`, "compact");
}

function findSpecialistsForProduct(productId, count = 3) {
  const product = maps.products[productId];
  const name = product?.name?.toLowerCase() || "";
  const goal = product?.borrowerGoal?.toLowerCase() || "";
  return uniqueById(data.loanOfficers
    .filter((officer) => officer.specialties.some((specialty) => {
      const value = specialty.toLowerCase();
      return name.includes(value.split(" ")[0]) || goal.includes(value.split(" ")[0]) || value.includes("first-time") || value.includes("conventional");
    }))
    .concat(data.loanOfficers))
    .slice(0, count);
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
  const imageUrl = media?.localPath || media?.imageUrl;
  if (!imageUrl) return "";
  return `
    <article class="news-card">
      <a class="news-card-media" href="${route(article.route)}" data-news-article-id="${esc(article.id)}">
        <img src="${esc(imageUrl)}" alt="${esc(media.alt)}" loading="lazy" decoding="async" style="object-position:${esc(media.focalPoint || "50% 50%")}" />
        <span class="news-card-topic">${esc(article.relevanceLabel)}</span>
      </a>
      <div class="news-card-body">
        <p class="news-card-meta">${esc((article.sourceLabels || []).join(" + "))}${article.publishedAt ? ` | ${esc(formatDate(article.publishedAt))}` : ""}</p>
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

function pageShell(content) {
  return `<div data-page-content data-design-system="snap-figma-v1">${header()}<main id="main" class="page" tabindex="-1">${content}</main>${footer()}</div>${modalShell()}`;
}

function homePage() {
  const decisionCards = [
    { title: "Buy a home", text: "Compare local costs, rates, and loan options before choosing a purchase path.", href: "/buy", iconName: "home", accent: accentColors[0], linkLabel: "Explore buying options" },
    { title: "Refinance", text: "Review your current payment, timing, closing costs, and market context together.", href: "/refinance", iconName: "rates", accent: accentColors[1], linkLabel: "Review refinance options" },
    { title: "Use home equity", text: "Learn how home equity options may change payment, cash flow, and long-term cost.", href: "/home-equity", iconName: "calculator", accent: accentColors[2], linkLabel: "Explore home equity" }
  ];

  const leadCards = [
    { title: "Compare mortgage rates", text: "Review benchmark rates, APR details, assumptions, and payment next steps.", href: "/rates", iconName: "rates", accent: accentColors[0], linkLabel: "Compare rates" },
    { title: "Explore local markets", text: "Open state and city pages with price, payment, tax, insurance, and inventory details.", href: "/locations", iconName: "location", accent: accentColors[1], linkLabel: "Browse locations" },
    { title: "Buy with less cash down", text: "Compare FHA, VA, and conventional paths before choosing a product direction.", href: "/loan-options/fha-loans", iconName: "home", accent: accentColors[2], linkLabel: "See options" },
    { title: "Estimate a payment", text: "Model price, down payment, rate, taxes, insurance, and local assumptions.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[3], linkLabel: "Calculate" },
    { title: "First-time buyer guide", text: "Read checklists and market prep for the first conversation with a lender.", href: "/learning-center/buying-a-home", iconName: "guide", accent: accentColors[4], linkLabel: "Start learning" },
    { title: "Talk with an expert", text: "Find a licensed loan officer by state, city, product focus, or language.", href: "/loan-officers", iconName: "expert", accent: accentColors[5], linkLabel: "Get matched" }
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
    ${section("Compare with the numbers in view", { label: "Mortgage intelligence", text: "Start with public benchmarks, broad market coverage, and tools that keep assumptions visible." }, `<div class="grid three home-metrics">${metric("30-year fixed benchmark", rateBenchmarks[0].rate, "Public survey benchmark; personal terms require review.")}${metric("Local market coverage", `${data.states.length} state guides`, `${data.cities.length} city market pages available.`)}${metric("Planning tools", `${data.calculators.length} calculators`, "Estimate payment, affordability, refinance, and rent versus buy.")}</div>`, "compact")}
    ${section("Choose your path", { label: "Your goals", text: "Begin with the mortgage goal that matches the decision in front of you." }, `<div class="grid three home-decision-grid">${decisionCards.map(card).join("")}</div>`, "compact")}
    ${section("Research with the right context", { label: "Mortgage guidance", text: "Open deeper market data, rate details, calculators, education, or licensed help without losing your place." }, `<div class="grid three">${leadCards.map(card).join("")}</div>`, "home-paths")}
    ${section("Loan paths", { label: "Products", text: "Compare purchase, refinance, FHA, VA, and other options with tools and local factors nearby." }, `<div class="grid four">${productCards.join("")}</div>`, "compact product-shelf")}
    ${section("Helpful next reads", { label: "Learning center", text: "Read guides that connect market questions, loan options, calculators, and licensed guidance." }, `<div class="grid three">${first(data.blogPages.filter((page) => page.route !== "/learning-center"), 3).map((page, index) => card({ title: page.name, text: page.purpose, href: page.route, iconName: "guide", accent: accentColors[(index + 2) % accentColors.length], linkLabel: "Open topic" })).join("")}</div>`, "compact reading-shelf")}
    ${section("Bring your research into one clear conversation", { label: "Your next step", text: "Save the path, compare an offer, or connect with licensed guidance when you are ready." }, contextualCta("Choose the next step that fits your situation.", "Use your account, offer-comparison questions, or licensed guidance to continue from the research you have already done.", ["compareOffer", "loContact", "account"]), "compact home-cta-section")}
  `);
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
      esc(city.marketSnapshot.daysOnMarket)
    ];
  });

  return pageShell(`
    ${renderLocationsHero(data.states)}
    ${editorialSection({
      label: "Compare markets with the payment in view",
      title: "Start broad, then narrow to the market that changes the payment.",
      intro: "See the mortgage details before jumping into a quote or product choice.",
      paragraphs: [
        "A mortgage payment can change quickly when price, taxes, insurance, inventory, and local loan-limit rules change. Use the locations hub to compare those variables before choosing a city.",
        "Start with the statewide baseline, then go deeper into city price trends, payment scenarios, local loan options, branch coverage, articles, and licensed experts.",
        "Every important data point includes source names, dates, and update cadence so you can tell how fresh the information is."
      ],
      sideTitle: "Borrower questions",
      sideItems: [
        "How does this market affect monthly payment?",
        "Which loan paths may fit the local price range?",
        "Who serves this city or state?",
        "What tax or insurance costs should I understand?"
      ]
    })}
    ${section("Market decision signals", { label: "Location intelligence", text: "These signals help you compare the cost factors that can change a mortgage payment." }, insightBand([
      { label: "Payment", value: "Monthly estimate", text: "Payment estimates pair price with taxes, insurance, rate assumptions, and loan type." },
      { label: "Inventory", value: "Market pace", text: "Inventory and days on market help borrowers understand timing without making predictions." },
      { label: "Local costs", value: "Tax and insurance", text: "Escrow assumptions stay close to payment scenarios." },
      { label: "Next step", value: "Expert handoff", text: "Location content connects borrowers with loan officers and branches that serve the market." }
    ]) + marketSnapshotReference("locations_snapshot", "locations"), "modern-band")}
    ${section("State market entry", { label: "Market overview", text: "Open the statewide view before comparing individual city pages." }, `<div class="grid four">${stateCards.join("")}</div>`)}
    ${section("City market links", { label: "Cities", text: "Open a city view for market snapshots, charts, local loan options, experts, branches, and updates." }, table(["City", "Median price", "Payment scenario", "Inventory", "DOM"], cityRows), "compact")}
    ${section("Save market research", { label: "Watchlist", text: "Track cities, compare payment assumptions, and keep local questions connected to your account view." }, ctaDeck(["watchlist", "leadForm", "prequal"], "Keep location research organized.", "Save markets to Snap Homes, ask a local question, or start a prequalification conversation when a city becomes more than research."), "compact")}
    ${section("Data sources behind locations", { label: "Sources", text: "Every chart and table pairs with source metadata." }, `${sourceNote(["fhfaHpi", "census", "bls", "hmda"], "Core location data sources")}`, "compact")}
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
    ${hero({
      eyebrow: "Mortgage rates",
      title: "Mortgage rates with APR, assumptions, and next steps.",
      lead: "Review national benchmarks, see what affects personalized pricing, then move into a calculator or licensed review.",
      actions: `<a class="button" href="${routeWithAnchor("/rates", "rate-table")}">View rate table</a>${ctaButton("rateReview", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel visual-panel"><img src="${ASSETS.mortgage}" alt="" /><h2>Personalize the scenario</h2><p>Loan purpose, state, credit profile, down payment, loan amount, occupancy, and property type can all affect pricing.</p><form class="quote-form"><label>Loan purpose<select><option>Purchase</option><option>Refinance</option><option>Cash-out refinance</option></select></label><label>State<select>${data.states.map((state) => `<option>${esc(state.name)}</option>`).join("")}</select></label><label>Credit range<select><option>740+</option><option>700-739</option><option>660-699</option></select></label>${ctaButton("rateReview")}</form></aside>`
    })}
    ${renderRatesMarketplace({ fixture: ratesMarketplaceFixture })}
    ${editorialSection({
      label: "Before you compare",
      title: "Know what is included before you compare rates.",
      intro: "A mortgage rate can look simple at first glance. The real comparison includes APR, points, fees, loan type, lock timing, and the assumptions behind the number.",
      paragraphs: [
        "National averages are useful for understanding the direction of the market, but they are not the same thing as a quote for your loan. Use them as one input before you run a payment scenario.",
        "Your actual pricing can depend on credit profile, loan amount, property type, occupancy, location, down payment, discount points, lock period, and market conditions.",
        "Once you have a benchmark, estimate the monthly payment and ask a licensed loan officer to review the details that may affect available options."
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
    ${section("From benchmark to borrower scenario", { label: "Borrower path", text: "Move from market data into a payment scenario and licensed review." }, processRail([
      { title: "Read the benchmark", text: "Use national data to understand market direction and the difference between averages and offers." },
      { title: "Choose assumptions", text: "Set loan purpose, state, credit range, term, down payment, loan amount, occupancy, and property type." },
      { title: "Model the payment", text: "Move the rate into a payment estimate with taxes, insurance, and cash-to-close assumptions." },
      { title: "Request review", text: "Ask a licensed loan officer to compare options using the borrower's actual facts." }
    ]), "compact")}
    <section class="section compact" id="rate-table">
      <div class="content-layout">
        <div class="main-stack">
          ${section("Compare rate types", { label: "Rate table", text: "Start with the benchmark, then move into a payment estimate or licensed review." }, table(["Loan type", "Rate", "APR", "Points", "Source", "Next step"], rows), "no-pad")}
          ${marketChart("rates.benchmark_trend", "rates-mortgage")}
        </div>
        <aside class="side-stack">
          ${contextualCta("Review your rate question", "A licensed loan officer can review credit profile, loan amount, property type, occupancy, down payment, and location.", ["rateReview", "compareOffer", "loContact"])}
          ${disclosureFor("calculator", "Rate and APR disclosure")}
        </aside>
      </div>
    </section>
    ${section("Get a borrower-specific rate review", { label: "Personalized review", text: "Benchmarks stay public; personalized pricing requires borrower and property details." }, `${gatedAnswer({
      title: "What rate could I receive?",
      answer: "This page can explain benchmark movement, APR, points, fees, lock timing, and payment assumptions. It cannot show a personalized rate or APR without borrower, property, and lender review.",
      unlockTitle: "Request a rate review",
      unlockText: "Share loan purpose, state, credit range, down payment, loan amount, occupancy, and property type so a licensed team can discuss available options.",
      types: ["rateReview", "compareOffer"]
    })}`, "compact")}
    ${section("Local rate factors", { label: "Local factors", text: "Rate decisions are easier to review when paired with tax, insurance, and local market details." }, `<div class="grid four">${data.states.map((state, index) => card({ title: `${state.name} mortgage details`, text: stateBriefs[state.id] || state.stateNarrative, href: state.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Open location" })).join("")}</div>`, "compact")}
    ${section("Rate methodology", { label: "Sources", text: "See what is included, what is not, and when to request a personalized review." }, `<div class="essay-grid">${miniEssay("What the table discloses", [
      "Benchmark rates show public market data. Personalized pricing identifies APR, points, fees, lock period, loan amount, down payment, occupancy, property type, and source date when displayed.",
      "Payment examples keep taxes, insurance, mortgage insurance, HOA dues, and closing-cost assumptions close to the result."
    ])}${miniEssay("Use a benchmark in your comparison", [
      "Use benchmarks to understand market direction, then use a calculator to test the payment impact.",
      "A licensed review is the right next step when comparing products, buying in a high-cost market, or weighing refinance tradeoffs."
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
    : `<div class="panel"><h2>Statewide planning</h2><p>Compare local price, payment, insurance, and loan options with a licensed team when there is not a qualifying city page for this state.</p></div>`;
  return pageShell(`
    ${breadcrumb(["Locations", state.name], ["/locations", state.route])}
    ${hero({
      eyebrow: "State guide",
      title: `${state.name} mortgage guide`,
      lead: `${stateBriefs[state.id] || state.stateNarrative} Compare cities, product paths, branches, experts, and local affordability factors.`,
      actions: `<a class="button" href="${route(primaryRoute)}">${esc(primaryLabel)}</a><a class="button secondary" href="${route("/rates")}">${esc(stateCta.secondary)}</a>`,
      panel: `<aside class="hero-panel"><h2>State snapshot</h2><div class="grid two">${metric("Median price", state.marketSnapshot.medianHomePrice)}${metric("Payment", state.marketSnapshot.paymentScenario)}${metric("Inventory", state.marketSnapshot.inventory)}${metric("Updated", state.marketSnapshot.lastUpdated)}</div>${marketSnapshotReference("state_snapshot", state.id)}</aside>`
    })}
    ${editorialSection({
      label: "State brief",
      title: `${state.name} mortgage planning starts with local cost drivers.`,
      intro: "A state guide translates broad housing data into the mortgage questions a borrower can act on.",
      paragraphs: [
        `${state.name} borrowers may compare the same loan product across very different city conditions. The state page gives them a baseline for price, payment, property tax, insurance, inventory, and branch coverage before they choose a city page.`,
        "Loan-limit details matter. Conventional, jumbo, FHA, and VA conversations can change when county limits, entitlement, property type, or borrower profile changes.",
        "Source notes stay close to the market data so borrowers can see where the numbers came from and when they were last reviewed."
      ],
      sideTitle: "What to review",
      sideItems: [
        "Market snapshot",
        "City comparison",
        "Tax and insurance costs",
        "Loan-limit table",
        "Branches and licensed experts"
      ]
    })}
    ${locationNewsFeed(state)}
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
          <div class="cta-panel"><h3>${cities.length ? "Compare a city" : "Review statewide options"}</h3><p>${cities.length ? "Open a city market page for payment scenarios, tax and insurance notes, and local experts." : "Use the statewide view to compare rates, product paths, and a payment estimate before a licensed review."}</p><div class="cta-inline-actions"><a class="button" href="${route(primaryRoute)}">${cities.length ? "Open city" : "Review rates"}</a>${ctaButton("watchlist", { variant: "secondary" })}</div></div>
          ${disclosureFor("state", "State disclosure")}
        </aside>
      </div>
    </section>
    ${section("Loan limits and economy", { label: "Market drivers", text: "Tables and charts explain why location changes the mortgage conversation." }, insightBand([
      { label: "Conforming", value: "County limits", text: "FHFA limits help explain conventional versus jumbo conversations." },
      { label: "FHA", value: "HUD limits", text: "FHA county limits shape lower down payment planning." },
      { label: "Income", value: "ACS data", text: "Income and household data help frame affordability, not eligibility." },
      { label: "Labor", value: "BLS trend", text: "Employment data can support local market updates and editorial analysis." }
    ]) + sourceNote(["fhfaLimits", "hudFha", "census", "bls"], "State data sources"), "modern-band")}
    ${section("State product guidance", { label: "Loan options", text: "Review the loan path, then compare how local factors may change the numbers." }, `<div class="grid four">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View product" })).join("")}</div>`, "compact")}
    ${section("Save this state", { label: "Snap Homes", text: "Keep statewide market notes connected to rate, product, and prequalification questions." }, ctaDeck(["watchlist", "rateReview", "leadForm"], `${state.name} research can live in your Watchlist.`, "Track market movement, request a rate review, or ask for local guidance when the statewide view narrows to a city or property."), "compact")}
    ${locationProductModules(state.route, state.name)}
    ${section("Branches and local experts", { label: "Coverage", text: "Placement follows licensing, service area, product fit, and market relationship." }, `<div class="grid three">${branches.map((branch, index) => card({ title: branch.name, text: branch.coverageNote, href: branch.route, iconName: "branch", accent: accentColors[index % accentColors.length], linkLabel: "Open branch" })).join("")}</div>`, "compact")}
    ${section("State FAQ", { label: "Borrower questions", text: "Get practical answers with source notes nearby." }, `${faqBlock([
      { q: `How do I compare ${state.name} cities?`, a: "Start with payment, property tax, insurance, inventory, and local expert coverage before choosing a product path." },
      { q: "Can a state page tell me which loan I qualify for?", a: "No. It can explain product paths and local factors, but eligibility and pricing require borrower and property review." }
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
  const hasLocalPlacement = officers.length > 0 || branches.length > 0;
  const heroCta = ctaRule("city", "hero");
  return pageShell(`
    ${breadcrumb(["Locations", state.name, city.name], ["/locations", state.route, city.route])}
    ${hero({
      eyebrow: "City market page",
      title: `${city.name}, ${state.abbr} mortgage and housing market`,
      lead: `${city.marketPositioning} Review local price, payment, inventory, taxes, insurance, loan options, and experts in one place.`,
      actions: `${ctaButton("prequal", { label: heroCta.primary })}${ctaButton("watchlist", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Market snapshot</h2><div class="grid two">${metric("Median price", city.marketSnapshot.medianHomePrice)}${metric("Payment", city.marketSnapshot.paymentScenario)}${metric("Inventory", city.marketSnapshot.inventory)}${metric("DOM", city.marketSnapshot.daysOnMarket)}</div>${marketSnapshotReference("city_snapshot", city.id)}</aside>`
    })}
    ${editorialSection({
      label: "Local cost read",
      title: `${city.name} costs can change the mortgage conversation.`,
      intro: "Use the local snapshot to understand how price, inventory, taxes, and insurance can shape the next payment scenario.",
      paragraphs: [
        `In ${city.name}, the home price is only the starting point. Monthly cost can also depend on your rate, down payment, property taxes, insurance, mortgage insurance, HOA dues, and loan type.`,
        "Inventory and days on market can affect how early you prepare documents, compare payments, and talk through offer timing with your real estate and mortgage team.",
        "Use this market view to compare nearby cities, estimate a payment, review relevant loan options, and request licensed guidance when you are ready to talk through the details."
      ],
      sideTitle: "Check before you choose",
      sideItems: [
        "Local price range",
        "Estimated monthly payment",
        "Tax and insurance pressure",
        "Relevant loan options",
        "Local experts and branches"
      ]
    })}
    ${locationNewsFeed(city)}
    <section class="section">
      <div class="content-layout">
        <div class="main-stack">
          <div class="chart-stack">
            ${marketChart("market.price_trend", city.id)}
            ${marketChart("market.payment_breakdown", city.id)}
          </div>
          ${table(["Scenario", "Price", "Down payment", "Estimated payment", "Planning note"], [
            ["Entry buyer", esc(city.marketSnapshot.medianHomePrice), "5%", esc(city.marketSnapshot.paymentScenario), "Includes taxes and insurance assumptions"],
            ["FHA path", esc(city.marketSnapshot.medianHomePrice), "3.5%", "Estimate in calculator", "Review HUD limits and mortgage insurance"],
            ["Move-up buyer", "110% local median", "10%", "Estimate in calculator", "Compare sale proceeds and cash to close"]
          ])}
        </div>
        <aside class="side-stack">
          ${contextualCta(hasLocalPlacement ? "Review this market" : "Request market guidance", hasLocalPlacement ? `A licensed expert connected to ${city.name} can help compare loan options and local assumptions.` : `Snap Mortgage can route your ${city.name} questions into a licensed guidance path when you are ready.`, [
            { type: "loContact", href: officers[0]?.route || "/loan-officers", label: hasLocalPlacement ? "Contact expert" : "Find licensed help" },
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
      { label: "Insurance", value: city.marketSnapshot.insurance, text: "Insurance cost and availability can materially affect monthly obligations." }
    ]) + sourceNote(["fhfaHpi", "census", "bls"], "City data sources"), "modern-band")}
    ${section("Nearby city comparison", { label: "Compare", text: "Move through nearby markets before settling on a payment scenario." }, `<div class="grid two">${nearby.map((near, index) => card({ title: `${near.name}, ${maps.states[near.stateId].abbr}`, text: `${near.marketSnapshot.medianHomePrice} median price. ${near.marketSnapshot.inventory} inventory.`, href: near.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Compare" })).join("")}</div>`, "compact")}
    ${section("Review local answers", { label: "Personalized review", text: "The city market page remains public; specific answers need borrower or account details." }, `${gatedAnswer({
      title: `How would ${city.name} affect my payment?`,
      answer: `The public market page can show ${city.name} price, inventory, tax, insurance, and loan details. It cannot decide your exact payment, cash to close, product fit, or prequalification result.`,
      unlockTitle: "Save or request a local review",
      unlockText: "Save this market to Snap Homes or share your price range, down payment, timeline, and product questions for a licensed review path.",
      types: ["watchlist", "prequal"]
    })}`, "compact")}
    ${section("Loan options in this market", { label: "Products", text: "Compare loan paths against local price, tax, insurance, and loan-limit details." }, `<div class="grid four">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View guide" })).join("")}</div>`, "compact")}
    ${locationProductModules(city.route, `${city.name}, ${state.abbr}`)}
    ${section("Experts, branches, and updates", { label: "Local help", text: hasLocalPlacement ? "Connect with local help tied to the market you are reviewing." : "Start with relevant guides, then request licensed help when your scenario is ready for review." }, `<div class="grid three">${officers.slice(0, 3).map((officer, index) => card({ title: officer.name, text: `${officer.nmls} | ${officer.specialties.join(", ")}`, href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "View profile" })).concat(branches.map((branch, index) => card({ title: branch.name, text: branch.coverageNote, href: branch.route, iconName: "branch", accent: accentColors[(index + 3) % accentColors.length], linkLabel: "View branch" }))).concat(articles.slice(0, 2).map((article, index) => card({ title: article.title, text: humanStatus(article.reviewStatus), href: article.route, iconName: "article", accent: accentColors[(index + 4) % accentColors.length], linkLabel: "Read" }))).join("")}</div>`, "compact")}
    ${section("City FAQ", { label: "Borrower questions", text: "Answers to practical questions, without turning education into personalized advice." }, `${faqBlock([
      { q: `What makes ${city.name} different for mortgage planning?`, a: `${city.name} has its own mix of price, payment, inventory, taxes, insurance, products, and local expert coverage.` },
      { q: "Where do I go next?", a: "Estimate payment, compare nearby cities, review local product guidance, or request licensed mortgage guidance when your scenario is ready for review." }
    ])}`, "compact")}
  `);
}

function productPage(product) {
  const relatedArticles = data.articles.filter((article) => (article.productIds || []).includes(product.id)).slice(0, 4);
  const relatedCities = data.cities.filter((city) => (city.productIds || []).includes(product.id)).slice(0, 4);
  const calculators = byIds(product.relatedCalculatorIds, maps.calculators);
  const specialists = findSpecialistsForProduct(product.id);
  const brief = productBriefs[product.id] || productBriefs["product-purchase"];
  return pageShell(`
    ${breadcrumb(["Loan Options", product.name], ["/loan-options", product.route])}
    ${hero({
      eyebrow: "Loan option",
      title: product.name,
      lead: `${brief.fit} Compare requirements, tradeoffs, local factors, calculators, and licensed guidance.`,
      actions: `${ctaButton("prequal", { label: "Talk through fit" })}${ctaButton("compareOffer", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Product fit</h2><p>${esc(brief.tradeoff)}</p><div class="tag-row"><span class="tag">Requirements</span><span class="tag">Scenarios</span><span class="tag">FAQs</span><span class="tag">Local experts</span></div></aside>`
    })}
    ${editorialSection({
      label: "Loan path guide",
      title: `${product.name} explained through fit, tradeoffs, and next steps.`,
      intro: "A product page educates without implying approval or a universal best answer.",
      paragraphs: [
        brief.fit,
        brief.tradeoff,
        "Use this guide to review requirements, run a payment scenario, read related education, check local market factors, and talk through the facts with a licensed loan officer."
      ],
      sideTitle: "Product questions",
      sideItems: [
        "Who may consider it?",
        "What documents may be reviewed?",
        "What affects payment and cash to close?",
        "Which local limits matter?",
        "What can I compare next?"
      ]
    })}
    ${section("Requirements and tradeoffs", { label: "Product intelligence", text: "Compare the details that can change payment, cash to close, and product fit." }, table(["Area", "What to review", "Next action"], [
      ["Borrower fit", "Goal, timeline, property location, occupancy, and product constraints", `<a class="text-link" href="${route("/loan-officers")}">Ask an expert</a>`],
      ["Requirements", "Credit, income, assets, down payment, property type, and loan amount", `<a class="text-link" href="${route("/calculators/mortgage-payment")}">Estimate payment</a>`],
      ["Tradeoffs", "APR, points, mortgage insurance, fees, term, flexibility, and total cost", `<a class="text-link" href="${route("/loan-options")}">Compare products</a>`],
      ["Existing offer", "Rate, APR, points, fees, loan amount, assumptions, and questions", `<button class="text-link text-button" type="button" data-cta-action="compareOffer">Organize offer questions</button>`]
    ]))}
    ${section("Compare a planning scenario", { label: "Payment structure", text: "Use a simple scenario to see which amounts belong in the conversation before you compare actual loan terms." }, marketChart("product.scenario_compare", product.id), "compact")}
    ${section("Review product-fit answers", { label: "Personalized review", text: "Product education stays public; fit and availability need a reviewed scenario." }, `${gatedAnswer({
      title: `Could ${product.name} fit my situation?`,
      answer: `${product.name} may be worth comparing based on your goal, market, property type, occupancy, loan amount, down payment, and timeline. This page cannot determine eligibility or available terms.`,
      unlockTitle: "Start a product review path",
      unlockText: "Organize your scenario for prequalification, request a rate review, or compare offer terms with a licensed mortgage professional.",
      types: ["prequal", "compareOffer"]
    })}`, "compact")}
    ${section("Before choosing this path", { label: "Comparison path", text: "Use the product guide to move from education into an informed next step." }, processRail([
      { title: "Confirm the goal", text: "Purchase, refinance, cash-out, or equity access changes the questions to ask." },
      { title: "Review basics", text: "Credit profile, income, assets, debt, occupancy, property type, and loan size can affect available options." },
      { title: "Model total cost", text: "Monthly payment is only one part; APR, points, insurance, taxes, and closing costs matter." },
      { title: "Compare with guidance", text: "A licensed loan officer can compare options using the user's actual scenario." }
    ]), "compact")}
    ${section("Calculators for this loan path", { label: "Tools", text: "Products route into calculators that match the borrower decision." }, `<div class="grid three">${calculators.map((calc, index) => card({ title: calc.name, text: `Inputs include ${calc.captures.slice(0, 3).join(", ")}.`, href: calc.route, iconName: "calculator", accent: accentColors[index % accentColors.length], linkLabel: "Open calculator" })).join("")}</div>`, "compact")}
    ${section("Local product factors", { label: "Locations", text: "Open a city or state page to see how local price, taxes, insurance, and loan limits affect the conversation." }, `<div class="grid four">${relatedCities.map((city, index) => card({ title: `${product.name} in ${city.name}`, text: city.marketPositioning, href: city.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Open city" })).join("")}</div>`, "compact")}
    ${section("Related learning", { label: "Learn more", text: "Product education connects to related mortgage guides, calculators, and local market questions." }, `<div class="grid two">${relatedArticles.map((article, index) => card({ title: article.title, text: humanStatus(article.reviewStatus), href: article.route, iconName: "article", accent: accentColors[index % accentColors.length], linkLabel: "Read" })).join("")}</div>`, "compact")}
    ${section("Review this loan path", { label: "Next steps", text: "Move from product education into the review path that matches your question." }, ctaDeck(["prequal", "rateReview", "compareOffer", "loContact", "watchlist"], "Compare the product with your own scenario.", "Start prequalification, request rate review, compare offer terms, contact an expert, or save the product question to Snap Homes."), "compact")}
    ${section("Specialists and disclosures", { label: "Next step", text: "The next step is licensed review without any promise of eligibility." }, `<div class="grid three">${specialists.map((officer, index) => card({ title: officer.name, text: `${officer.nmls} | ${officer.specialties.join(", ")}`, href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "Ask about fit" })).join("")}</div><div style="margin-top:18px">${sourceNote(productSources(product.id), "Product sources")}</div><div style="margin-top:18px">${disclosureFor("product", "Product disclosure")}</div>`, "compact")}
  `);
}

function humanStatus(status) {
  const labels = {
    editor_reviewed: "Mortgage guide",
    compliance_review_required: "Mortgage guide",
    draft: "Mortgage guide"
  };
  return labels[status] || status;
}

function learningDiscovery(model) {
  return `
    <section class="learning-discovery section compact" aria-label="Search and browse Learning Center topics">
      <form class="learning-search search-form" data-search-form data-search-scope="learning">
        <input name="query" aria-label="Search learning center" placeholder="Search FHA, taxes, Denver..." />
        <button class="button" type="submit">Search</button>
      </form>
      <nav class="learning-topic-tags tag-row" aria-label="Learning Center topics">
        ${model.tags.map((topic) => `<a class="tag" href="${route(topic.route)}">${esc(topic.name)}</a>`).join("")}
      </nav>
    </section>
  `;
}

function renderContributorByline(article, { compact = false } = {}) {
  const byline = renderBylineModel(article, editorialContent.contributors);
  const marketUpdate = String(article.type || "").includes("market");
  const dateLabel = byline.dateLabel
    ? marketUpdate
      ? byline.dateLabel.replace(/^Published|^Updated/, "As of")
      : byline.dateLabel.replace(/^Updated/, "Last updated")
    : "Updated July 2026";
  const authorName = byline.href
    ? `<a class="article-byline-name" href="${route(byline.href)}">${esc(byline.name)}</a>`
    : `<span class="article-byline-name article-byline-fallback">${esc(byline.name)}</span>`;
  const className = compact ? "article-card-byline editorial-byline compact" : "article-byline editorial-byline";

  return `
    <div class="${className}" data-editorial-byline>
      <img src="${esc(byline.portraitSrc)}" alt="${esc(byline.portraitAlt)}" loading="lazy" decoding="async" data-contributor-portrait />
      <div class="article-byline-copy">
        ${authorName}
        ${compact ? "" : `<span class="article-byline-title">${esc(byline.title)}</span>`}
        <time>${esc(dateLabel)}</time>
      </div>
    </div>
  `;
}

function learningArticleCard(article, index) {
  const beat = maps.contributors[article.authorId]?.beat || String(article.type || "Mortgage guide").replaceAll("_", " ");
  return `
    <article class="card learning-article-card editorial-article-card" style="--card-accent:${accentColors[index % accentColors.length]}">
      <a class="editorial-article-visual" href="${route(article.route)}" aria-label="Read ${esc(article.title)}">${icon("rates")}</a>
      <p class="editorial-card-label">${esc(beat)}</p>
      <h3><a href="${route(article.route)}">${esc(article.title)}</a></h3>
      <p class="editorial-card-meta">6 min read <span aria-hidden="true">|</span> ${esc(beat)}</p>
      ${renderContributorByline(article, { compact: true })}
      <a class="text-link editorial-card-link" href="${route(article.route)}">Read more <span aria-hidden="true">&rarr;</span></a>
    </article>
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
    text: `Inputs include ${(calculator.captures || []).slice(0, 3).join(", ")}.`,
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

function learningHome() {
  const model = buildLearningCenterModel(data, editorialContent);
  const featuredArticles = model.featuredArticles.length
    ? section(
        "Featured articles",
        {
          label: "Related articles",
          text: "Articles link back to products, locations, calculators, experts, and disclosures."
        },
        `<div class="grid three learning-featured-grid">${model.featuredArticles.map(learningArticleCard).join("")}</div>`,
        "compact learning-featured-section"
      )
    : "";
  const topicCards = model.topicCards.length
    ? section(
        "Topic hubs",
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
          text: "Read guides that connect market questions, loan options, calculators, and licensed guidance."
        },
        `<div class="grid three learning-article-grid">${model.additionalArticles.map(learningArticleCard).join("")}</div>`,
        "compact learning-article-section"
      )
    : "";
  const loanPaths = model.loanPaths.length
    ? section(
        "Loan paths",
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
  const directoryCards = editorialContent.contributors.map((contributor) => `
    <a class="contributor-directory-card editorial-contributor-card" href="${route(contributor.route)}">
      <img src="${esc(contributor.portrait.src)}" alt="${esc(contributor.portrait.alt)}" loading="lazy" decoding="async" data-contributor-portrait />
      <div class="contributor-directory-card-copy">
        <p class="contributor-beat">${esc(contributor.beat)}</p>
        <h2>${esc(contributor.name)}</h2>
        <p class="contributor-title">${esc(contributor.title)}</p>
        <p>${esc(contributor.shortBio)}</p>
        <span class="text-link">View contributor profile</span>
      </div>
    </a>
  `).join("");
  const principles = [
    ["Start with the decision", "Each guide begins with the question a borrower is trying to answer, then organizes the facts around that choice."],
    ["Show the source and date", "Market reporting identifies when the information was current and links the data source directly below each chart."],
    ["Explain the tradeoffs", "Rates, payments, fees, loan programs, and local conditions are presented as options to compare, not promises."]
  ];

  return pageShell(`
    <div class="editorial-directory-page editorial-contributors-page" data-contributor-directory>
      <section class="contributor-directory-hero">
        <div>
          <p class="eyebrow">Editorial team</p>
          <h1>Meet the contributors behind Snap Mortgage guidance</h1>
          <p>Explore mortgage education, market context, loan-program explanations, and practical decision tools from a focused editorial team.</p>
        </div>
      </section>
      <div class="contributor-directory-content">
        <section class="contributor-directory-grid" aria-label="Snap Mortgage editorial contributors">${directoryCards}</section>
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
  const relatedArticles = articlesForContributor(editorialContent, data.articles, contributor.id);
  const archive = relatedArticles.length
    ? `<div class="editorial-article-grid">${first(relatedArticles, 6).map(learningArticleCard).join("")}</div>`
    : `<p class="contributor-empty-archive">Guidance from ${esc(contributor.name)} will appear here as it is published.</p>`;

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
  if (topic.route === "/learning-center/editorial-team") return editorialTeamPage(topic);
  const articles = byIds(topic.featuredArticleIds, maps.articles);
  const feed = articles.length ? articles : first(data.articles, 6);
  return pageShell(`
    ${breadcrumb(["Learning Center", topic.name], ["/learning-center", topic.route])}
    ${hero({
      eyebrow: "Topic hub",
      title: topic.name,
      lead: topic.purpose,
      actions: `<a class="button" href="${route("/loan-officers")}">Get guidance</a><a class="button secondary" href="${route("/learning-center")}">All topics</a>`,
      panel: `<aside class="hero-panel"><h2>Browse this topic</h2><p>Browse by state, city, product, and borrower goal.</p></aside>`
    })}
    ${editorialSection({
      label: "Topic overview",
      title: `${topic.name} content moves readers toward a clearer mortgage decision.`,
      intro: `Start with the ${topic.name.toLowerCase()} overview, then choose an article, calculator, product guide, or local market.`,
      paragraphs: [
        `A ${topic.name.toLowerCase()} hub makes the topic easier to navigate by grouping beginner education, product comparisons, local market details, and high-intent next steps.`,
        "Mortgage rules, pricing, and eligibility vary, so the topic overview points readers toward scenario review rather than one universal answer.",
        "The next step stays clear: product guide, calculator, city market view, article, or licensed expert."
      ],
      sideTitle: "Explore by topic",
      sideItems: [
        "Topic overview",
        "Featured articles",
        "Related tools",
        "Relevant products",
        "Local market links"
      ]
    })}
    ${section("Featured mortgage guides", { label: "Mortgage education", text: "Browse dated guides and follow the related paths when a topic needs a more specific answer." }, `<div class="grid two learning-article-grid">${feed.map(learningArticleCard).join("")}</div>`)}
    ${section("Related paths", { label: "Helpful links", text: "Keep moving into locations, products, calculators, and experts." }, `<div class="grid three">${first(data.products, 3).map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "Compare" })).join("")}</div>`, "compact")}
  `);
}

function articlePage(article) {
  const products = byIds(article.productIds, maps.products);
  const cities = byIds(article.cityIds, maps.cities);
  const cityLabel = cities.length ? cities.map((city) => `${city.name}, ${maps.states[city.stateId].abbr}`).join(", ") : "the relevant market";
  const productLabel = products.length ? products.map((product) => product.name).join(", ") : "the related loan options";
  const articleType = article.type.replaceAll("_", " ");
  return pageShell(`
    ${breadcrumb(["Learning Center", article.title], ["/learning-center", article.route])}
    ${hero({
      eyebrow: articleType,
      title: article.title,
      lead: `Understand ${articleType} alongside ${cityLabel} and ${productLabel}.`,
      actions: `${ctaButton("leadForm")}${products[0]?.route ? `<a class="button secondary" href="${route(products[0].route)}">Related product</a>` : `<a class="button secondary" href="${route("/loan-options")}">Related product</a>`}`,
      panel: `<aside class="hero-panel"><h2>Guide details</h2><p>Updated July 2026. Sources and related tools are included below.</p><div class="tag-row"><span class="tag">Sources</span><span class="tag">Related tools</span><span class="tag">Mortgage questions</span></div></aside>`
    })}
    <div class="article-byline-wrap">${renderContributorByline(article)}</div>
    ${editorialSection({
      label: "Mortgage decision guide",
      title: "Read this with the market, product, and next step in view.",
      intro: "A useful mortgage article helps the reader make a better comparison without presenting education as personalized advice.",
      paragraphs: [
        `This article connects ${articleType} details to ${cityLabel} and ${productLabel}. The reader can understand why the topic matters and where to continue after the article.`,
        "Start with the practical decision, then compare the tradeoffs and related tools before choosing a next step.",
        "Sources and assumptions stay close to the guide so you can see what the information can explain before moving into a personal mortgage decision."
      ],
      sideTitle: "On this page",
      sideItems: [
        "Key takeaways",
        "Readable body copy",
        "Related market and product links",
        "Source list",
        "Next steps"
      ]
    })}
    <section class="section">
      <div class="content-layout">
        <article class="article-body">
          <h2>Key takeaways</h2>
          <p>This guide helps borrowers connect ${esc(articleType)} to payment, timing, documentation, product fit, and local market details.</p>
          <ul>
            <li>Compare rate, APR, payment, cash to close, taxes, insurance, and loan type together.</li>
            <li>Use local market details from ${esc(cityLabel)} before relying on a general rule of thumb.</li>
            <li>Move into a calculator or licensed review when the question depends on borrower facts.</li>
          </ul>
           <h2>What this means for a borrower</h2>
           <p>Mortgage decisions usually involve more than the headline number. A buyer may need to compare monthly payment, cash to close, mortgage insurance, taxes, insurance, and timing. A homeowner considering a refinance may also need to compare closing costs, remaining term, breakeven period, and total interest over time.</p>
           <p>For ${esc(cityLabel)}, local costs and inventory can change the planning conversation. If inventory is moving, preparation and documentation may matter. If taxes or insurance are a major part of the payment, those costs belong in the model before comparing homes or loan products.</p>
           ${marketChart("article.evidence", article.id)}
           <h2>Questions to ask before acting</h2>
          <p>Before choosing a product or changing strategy, borrowers may want to ask how credit profile, income, assets, debt, occupancy, property type, and loan amount affect available options.</p>
          <p>The tradeoffs matter. A lower monthly payment can increase total interest or extend the payoff timeline. A low down payment option can include mortgage insurance or a funding fee. A cash-out refinance can provide access to equity while increasing the loan balance.</p>
          <h2>What to compare next</h2>
          <p>Use the related cards below to open a product guide, city market page, calculator, or loan officer profile connected to this topic.</p>
        </article>
        <aside class="side-stack">
          ${contextualCta("Review your scenario", "Bring the market, product, and payment questions into one licensed conversation.", ["leadForm", "loContact", "watchlist"])}
          ${sourceNote(["fhfaHpi", "freddiePmms", "regZ"], "Article sources")}
          ${disclosureFor("article", "Article disclosure")}
        </aside>
      </div>
    </section>
    ${section("Related next steps", { label: "Related pages", text: "Articles connect back to products, locations, and tools." }, `<div class="grid three">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "Product" })).concat(cities.map((city, index) => card({ title: `${city.name}, ${maps.states[city.stateId].abbr}`, text: city.marketPositioning, href: city.route, iconName: "location", accent: accentColors[(index + 2) % accentColors.length], linkLabel: "Location" }))).concat([card({ title: "Mortgage payment calculator", text: "Estimate payment using visible scenario assumptions.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[4], linkLabel: "Calculate" })]).join("")}</div>`, "compact")}
    ${section("Review a more specific answer", { label: "Personalized review", text: "The article stays readable; personal scenarios need borrower and property details." }, `${gatedAnswer({
      title: "How does this apply to me?",
      answer: "This article can explain the topic, related markets, loan products, and questions to ask. It cannot decide your payment, eligibility, rate, APR, or best next step.",
      unlockTitle: "Save the question or request guidance",
      unlockText: "Save the article to Snap Homes or share your goal, market, and product question with a licensed team.",
      types: ["watchlist", "leadForm"]
    })}`, "compact")}
    ${section("FAQs and sources", { label: "Sources", text: "Get practical answers with source details nearby." }, `${faqBlock([
      { q: "Is this personalized mortgage advice?", a: "No. It is educational information. A licensed loan officer can review borrower facts, property details, product options, and pricing." },
      { q: "What appears in the source block?", a: "Source name, data date, update cadence, and any limitation that affects borrower interpretation." }
    ])}<div style="margin-top:18px">${table(["Metadata", "Value"], [
      ["Guide type", esc(article.type.replaceAll("_", " "))],
      ["Updated", "July 2026"],
      ["Related products", esc(products.map((product) => product.name).join(", ") || "None")],
      ["Related cities", esc(cities.map((city) => city.name).join(", ") || "None")]
    ])}</div>`, "compact")}
  `);
}

function loanOfficerPage(officer) {
  const branch = maps.branches[officer.branchId];
  const cities = byIds(officer.priorityCityIds, maps.cities);
  const products = uniqueById(data.products.filter((product) => officer.specialties.some((specialty) => product.name.toLowerCase().includes(specialty.split(" ")[0].toLowerCase()))).concat(first(data.products, 2))).slice(0, 3);
  return pageShell(`
    ${breadcrumb(["Loan Officers", officer.name], ["/loan-officers", officer.route])}
    ${hero({
      eyebrow: "Loan officer",
      title: officer.name,
      lead: `${officer.specialties.join(", ")}. Licensed in ${officer.licensedStates.join(", ")}. ${officer.nmls}.`,
      actions: `${ctaButton("loContact", { label: `Contact ${officer.name.split(" ")[0]}` })}${ctaButton("prequal", { variant: "secondary" })}`,
      panel: `<div class="profile-hero-card"><div class="avatar">${esc(initials(officer.name))}</div><div><h2>${esc(officer.name)}</h2><p>${esc(officer.nmls)}</p><div class="tag-row">${officer.specialties.map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div></div></div>`
    })}
    ${editorialSection({
      label: "Working together",
      title: `${officer.name.split(" ")[0]} helps borrowers turn a mortgage question into a reviewed next step.`,
      intro: "A strong loan officer profile explains service style, licensed coverage, specialties, and what happens after a borrower reaches out.",
      paragraphs: [
        `${officer.name} serves borrowers in ${officer.licensedStates.join(", ")} with specialties including ${officer.specialties.join(", ")}. The profile helps visitors understand when this loan officer may be a relevant contact.`,
        "Borrowers can prepare by sharing their goal, property location, timing, approximate price range, down payment plan, current loan details, and questions about available loan options.",
        "Rates, approval, product fit, and timelines depend on borrower facts, property details, market conditions, and lender review."
      ],
      sideTitle: "Profile includes",
      sideItems: [
        "Licensed states and NMLS ID",
        "Specialties and languages",
        "Markets served",
        "Product paths supported",
        "Consent-aware contact form"
      ]
    })}
    ${section("Profile proof points", { label: "Borrower trust", text: "Review licensing, languages, specialties, markets, and clear next-step information." }, `<div class="grid four">${metric("Licensed", officer.licensedStates.join(", "))}${metric("Languages", officer.languages.join(", "))}${metric("Specialties", String(officer.specialties.length))}${metric("NMLS", officer.nmls)}</div>`)}
    ${section("How the conversation flows", { label: "Service model", text: "Show what happens after a borrower reaches out." }, processRail([
      { title: "Share the goal", text: "Purchase, refinance, home equity, or product comparison determines the first questions." },
      { title: "Review the scenario", text: "Discuss income, assets, debt, credit, property, occupancy, and timing at a high level." },
      { title: "Compare options", text: "Available options may differ by borrower facts, property details, market conditions, and lender guidelines." },
      { title: "Choose a next step", text: "Move into prequalification, document collection, or a follow-up conversation when ready." }
    ]), "compact")}
    ${section("Markets and branch", { label: "Placement", text: "See the markets and branch coverage connected to this loan officer." }, `<div class="grid three">${cities.map((city, index) => card({ title: city.name, text: city.marketPositioning, href: city.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "Market" })).concat(branch ? [card({ title: branch.name, text: branch.coverageNote, href: branch.route, iconName: "branch", accent: accentColors[3], linkLabel: "Branch" })] : []).join("")}</div>`)}
    ${section("Loan paths this officer can discuss", { label: "Product fit", text: "Open product explainers and calculators from this profile." }, `<div class="grid three">${products.map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View path" })).join("")}</div>`, "compact")}
    ${section("Choose how to reach out", { label: "Contact options", text: "Use the contact path that matches your question and timing." }, ctaDeck([
      { type: "loContact", href: `${officer.route}#contact`, label: `Contact ${officer.name.split(" ")[0]}` },
      "prequal",
      "rateReview",
      "compareOffer"
    ], "Bring your question to a licensed expert.", "Contact the loan officer, start a prequalification conversation, request rate review, or organize an offer comparison."), "compact")}
    <section class="section compact" id="contact">
      <div class="content-layout">
        <div class="panel">
          <h2>Contact ${esc(officer.name.split(" ")[0])}</h2>
          <p>When you are ready, continue to the account or contact path to share your question with licensed help.</p>
          <div class="cta-inline-actions">
            ${ctaButton("loContact", { label: `Contact ${officer.name.split(" ")[0]}` })}
            ${ctaButton("leadForm", { variant: "secondary" })}
          </div>
        </div>
        <aside class="side-stack">${sourceNote(["nmls"], "Licensing source")}${disclosureFor("loan_officer", "Loan officer disclosure")}</aside>
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
      lead: `${branch.coverageNote} Meet the team, review local market coverage, and move into products, calculators, or licensed guidance.`,
      actions: `<a class="button" href="${route(officers[0]?.route || "/loan-officers")}">Meet the team</a>${ctaButton("leadForm", { variant: "secondary" })}`,
      panel: `<aside class="hero-panel"><h2>Where to find us</h2><div class="map-spot">${esc(state.abbr)}</div><p>${esc(state.name)} service area and branch coverage.</p></aside>`
    })}
    ${editorialSection({
      label: "Local branch guide",
      title: `${branch.name} connects office identity, local coverage, and mortgage next steps.`,
      intro: "A local branch hub brings the team, market coverage, product paths, and contact options into one place.",
      paragraphs: [
        `${branch.name} brings office coverage, loan officer profiles, local markets, and product education together so a borrower can move from browsing to a useful conversation.`,
        "Start with the service area, compare options, model a payment, gather documents, and talk with a licensed team member.",
        `For ${state.name}, the branch can also connect borrowers with state and city guidance so tax, insurance, price, and inventory details stay visible before a form is submitted.`
      ],
      sideTitle: "Branch details",
      sideItems: [
        "Office and service area",
        "Team roster with NMLS IDs",
        "Markets served",
        "Product and calculator links",
        "Licensing disclosures"
      ]
    })}
    ${section("Branch snapshot", { label: "Office details", text: "Review practical contact, team, map, and licensing information." }, `<div class="grid four">${metric("State", state.name)}${metric("Cities served", String(cities.length))}${metric("Team members", String(officers.length))}${metric("Coverage", branch.coverageNote)}</div>`)}
    ${section("Branch team", { label: "Loan officer roster", text: "Names, NMLS IDs, specialties, and profile links help the branch page convert without overclaiming." }, `<div class="grid two">${officers.map((officer, index) => card({ title: officer.name, text: `${officer.nmls} | ${officer.specialties.join(", ")}`, href: officer.route, iconName: "expert", accent: accentColors[index % accentColors.length], linkLabel: "Profile" })).join("")}</div>`)}
    ${section("Coverage and services", { label: "Local office hub", text: "Move from the branch into city markets, products, calculators, articles, and licensing details." }, `<div class="grid three">${cities.map((city, index) => card({ title: city.name, text: city.marketPositioning, href: city.route, iconName: "location", accent: accentColors[index % accentColors.length], linkLabel: "City" })).concat([card({ title: "Mortgage payment calculator", text: "Estimate payment with visible taxes, insurance, rate, and down payment assumptions.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[4], linkLabel: "Calculate" })]).join("")}</div>`, "compact")}
    ${section("Branch next steps", { label: "Local support", text: "Move from the branch page into contact, market tracking, or rate review." }, ctaDeck(["leadForm", "loContact", "watchlist", "rateReview"], "Use branch details in your next step.", "Ask for guidance, contact a loan officer, save covered markets, or request a rate review."), "compact")}
    ${section("Loan options and local updates", { label: "Related pages", text: "Keep moving into products, markets, articles, and tools." }, `<div class="grid three">${products.slice(0, 3).map((product, index) => card({ title: product.name, text: productBriefs[product.id]?.fit || product.borrowerGoal, href: product.route, iconName: "rates", accent: accentColors[index % accentColors.length], linkLabel: "View product" })).concat(articles.map((article, index) => card({ title: article.title, text: humanStatus(article.reviewStatus), href: article.route, iconName: "article", accent: accentColors[(index + 3) % accentColors.length], linkLabel: "Read" }))).join("")}</div><div style="margin-top:18px">${sourceNote(["nmls"], "Branch and licensing source")}</div><div style="margin-top:18px">${disclosureFor("branch", "Branch disclosure")}</div>`, "compact")}
  `);
}

const calculatorProductModules = {
  conventional: {
    label: "Conventional",
    shortLabel: "Conv.",
    status: "Available",
    className: "available",
    minDownRate: 0.03,
    miLabel: "PMI",
    rule: "Conforming limit, LTV, and PMI assumptions apply.",
    notes: ["PMI appears above 80% LTV.", "Scenarios above the dummy conforming limit move to needs review."]
  },
  fha: {
    label: "FHA",
    shortLabel: "FHA",
    status: "Needs review",
    className: "review",
    minDownRate: 0.035,
    upfrontFeeRate: 0.0175,
    annualMiRate: 0.0055,
    miLabel: "FHA MIP",
    rule: "HUD county limit, UFMIP, annual MIP, and minimum down payment assumptions apply.",
    notes: ["Dummy FHA limit is checked against base loan amount.", "UFMIP is shown as financed for planning."]
  },
  va: {
    label: "VA",
    shortLabel: "VA",
    status: "Check eligibility",
    className: "eligible",
    minDownRate: 0,
    upfrontFeeRate: 0.0215,
    annualMiRate: 0,
    miLabel: "Funding fee",
    rule: "VA eligibility, occupancy, entitlement, and funding-fee assumptions apply.",
    notes: ["No monthly mortgage insurance is shown.", "Funding fee can change by use type, down payment, service category, and exemption."]
  },
  usda: {
    label: "USDA",
    shortLabel: "USDA",
    status: "Location gated",
    className: "limited",
    minDownRate: 0,
    upfrontFeeRate: 0.01,
    annualMiRate: 0.0035,
    miLabel: "Guarantee fee",
    rule: "Location, income, 30-year term, upfront guarantee fee, and annual fee assumptions apply.",
    notes: ["Dummy ZIP data controls availability for now.", "Income and property eligibility must be verified."]
  }
};

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
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Annual tax", "tax", "numeric", "9300"],
      ["Annual insurance", "insurance", "numeric", "2200"],
      ["HOA dues", "hoa", "numeric", "125"],
      ["Term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Estimate principal, interest, taxes, insurance, HOA, and product-specific mortgage insurance or funding fees."
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
      ["Cash available", "down", "numeric", "35000"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Annual tax and insurance", "taxInsurance", "numeric", "11500"],
      ["Term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Start from income, debts, cash available, and location costs, then show which product guardrails may constrain the result."
  },
  "calc-refinance": {
    kind: "refinance",
    title: "Refinance scenario",
    resultTitle: "Estimated refinance payment",
    primaryMetricLabel: "New payment",
    primaryProgram: "va",
    fields: [
      ["Current payment", "currentPayment", "numeric", "3650"],
      ["Loan balance", "balance", "numeric", "428000"],
      ["Home value", "price", "numeric", "560000"],
      ["Refinance type", "refinanceType", "text", "VA streamline / IRRRL style"],
      ["New interest rate", "rate", "decimal", "6.25"],
      ["Closing costs", "closingCosts", "numeric", "6200"],
      ["Current property tax / mo", "currentTax", "numeric", "280"],
      ["Current insurance / mo", "currentInsurance", "numeric", "110"],
      ["Current MI / mo", "currentMi", "numeric", "0"],
      ["New property tax / mo", "newTax", "numeric", "280"],
      ["New insurance / mo", "newInsurance", "numeric", "110"],
      ["New MI / mo", "newMi", "numeric", "0"],
      ["New term years", "termYears", "numeric", "30"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Compare current payment, new payment, closing costs, break-even timing, and refinance-specific product rules."
  },
  "calc-rent-vs-buy": {
    kind: "rentBuy",
    title: "Rent vs buy scenario",
    resultTitle: "Estimated buy payment",
    primaryMetricLabel: "Buy payment",
    primaryProgram: "conventional",
    fields: [
      ["Monthly rent", "rent", "numeric", "2650"],
      ["Target home price", "price", "numeric", "515000"],
      ["Down payment", "down", "numeric", "25750"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Time horizon years", "timeline", "numeric", "7"],
      ["Annual rent increase %", "rentGrowth", "decimal", "3.5"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Compare rent, ownership payment, estimated equity, transaction costs, and time horizon."
  },
  "calc-down-payment": {
    kind: "downPayment",
    title: "Down payment scenario",
    resultTitle: "Estimated cash needed",
    primaryMetricLabel: "Cash needed",
    primaryProgram: "fha",
    fields: [
      ["Target home price", "price", "numeric", "515000"],
      ["Cash available", "down", "numeric", "35000"],
      ["Apply DPA", "applyDpa", "checkbox", "false"],
      ["Interest rate", "rate", "decimal", "6.75"],
      ["Annual tax", "tax", "numeric", "9300"],
      ["Annual insurance", "insurance", "numeric", "2200"],
      ["ZIP code", "zip", "numeric", "78704"]
    ],
    explainer: "Estimate minimum down payment, cash-to-close, and the payment effect of changing the selected product."
  }
};

function calculatorHubCard(calculator, index) {
  const preset = calculatorPresets[calculator.id] || calculatorPresets["calc-payment"];
  return `<a class="calculator-hub-card" href="${route(calculator.route)}">
    <span class="icon-bubble" style="--accent:${accentColors[index % accentColors.length]}">${icon("calculator")}</span>
    <span class="calculator-hub-card-copy">
      <strong>${esc(calculator.name)}</strong>
      <small>${esc(preset.explainer)}</small>
      <em>${esc(calculator.captures.slice(0, 5).join(" • "))}</em>
    </span>
  </a>`;
}

function calculatorsHubPage(directory) {
  return pageShell(`
    ${breadcrumb(["Calculators"], ["/calculators"])}
    <section class="section calculator-hub-hero">
      <div class="section-header">
        <div>
          <span class="eyebrow">Calculators</span>
          <h1>${esc(directory?.name || "Mortgage calculators")}</h1>
          <p>Choose a calculator, enter visible assumptions, and compare product-aware estimates before a licensed review.</p>
        </div>
      </div>
      <div class="calculator-hub-grid">
        ${data.calculators.map((calculator, index) => calculatorHubCard(calculator, index)).join("")}
      </div>
    </section>
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
      <small>${esc(isEnabled ? product.status : "Unavailable")}</small>
    </label>`;
  }).join("");
}

const calculatorCurrencyFields = new Set(["price", "down", "tax", "insurance", "hoa", "income", "debts", "taxInsurance", "currentPayment", "balance", "closingCosts", "rent", "currentTax", "currentInsurance", "currentMi", "newTax", "newInsurance", "newMi"]);
const calculatorPercentFields = new Set(["rate", "rentGrowth"]);
const calculatorSliderFields = new Set(["price", "down", "income", "balance", "currentPayment", "rent"]);
const calculatorAdvancedFieldsByKind = {
  payment: new Set(["tax", "insurance", "hoa", "termYears", "zip"]),
  affordability: new Set(["taxInsurance", "termYears", "zip"]),
  refinance: new Set(["refinanceType", "closingCosts", "currentTax", "currentInsurance", "currentMi", "newTax", "newInsurance", "newMi", "termYears", "zip"]),
  rentBuy: new Set(["timeline", "rentGrowth", "zip"]),
  downPayment: new Set(["rate", "tax", "insurance", "zip"])
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

function calculatorInputField([label, name, mode, value], fields = []) {
  const id = `calculator-${name}`;
  if (mode === "checkbox") {
    return `<div class="calculator-input-row checkbox-row${name === "applyDpa" ? " dpa-option" : ""}"${name === "applyDpa" ? " data-dpa-option" : ""}>
      <label class="calculator-checkbox-control" for="${esc(id)}">
        <input id="${esc(id)}" name="${esc(name)}" type="checkbox" value="yes" data-calculator-input="${esc(name)}" />
        <span>${esc(label)}</span>
      </label>
      ${name === "applyDpa" ? `<p>Down payment assistance can help eligible borrowers cover some upfront cash through grants, forgivable seconds, deferred-payment seconds, or repayable assistance. Availability depends on program, income, location, property, occupancy, and lender review.</p>` : ""}
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

function calculatorPage(calc) {
  const preset = calculatorPresets[calc.id] || calculatorPresets["calc-payment"];
  return pageShell(`
    <section class="section calculator-page-intro">
      ${breadcrumb(["Calculators", calc.name], ["/calculators", calc.route])}
      <span class="eyebrow">Calculator</span>
      <h1>${esc(calc.name)}</h1>
      <p>${esc(preset.explainer)}</p>
    </section>
    <section class="section" id="calculator">
      <div class="calculator-workspace">
        <form class="panel calculator-form product-calculator-form" data-calculator-form data-calculator-id="${esc(calc.id)}" data-calculator-kind="${preset.kind}">
          <div class="calculator-form-header">
            <div>
              <span class="eyebrow">Product-aware estimate</span>
              <h2>${esc(preset.title)}</h2>
            </div>
            <span class="estimate-badge">Dummy data</span>
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
            <p>Enter a scenario to calculate a product-aware estimate.</p>
            <div class="calculator-placeholder-result">
              <strong>${esc(calculatorProductModules[preset.primaryProgram].label)}</strong>
              <span>${esc(calculatorProductModules[preset.primaryProgram].rule)}</span>
            </div>
            ${marketChart("calculator.payment_breakdown", calc.id)}
          </div>
          ${disclosureFor("calculator", "Calculator disclosure")}
        </aside>
      </div>
    </section>
    ${section("Related calculators", { label: "More tools", text: "Compare another borrower question with the same visible-assumption approach." }, `<div class="grid four">${relatedCalculatorCards(calc.id)}</div>`, "compact")}
  `);
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
  return pageShell(`
    ${hero({
      eyebrow: "Directory",
      title: directory.name,
      lead: `Search ${directoryNoun} by ${directory.filters.join(", ")} and open the page that matches the borrower's next step.`,
      actions: `<a class="button" href="${route(results[0]?.route || "/")}">Open first result</a>`,
      panel: `<aside class="hero-panel"><h2>Filters</h2><div class="tag-row">${directory.filters.map((filter) => `<span class="tag">${esc(filter)}</span>`).join("")}</div><form class="search-form" data-directory-filter><input name="filter" aria-label="Filter results" placeholder="Filter these results..." /><button class="button" type="submit">Filter</button></form></aside>`
    })}
    ${editorialSection({
      label: "Find your next step",
      title: `${directory.name} helps borrowers choose a useful next click.`,
      intro: "Use the filters to narrow a long list into the market, person, branch, topic, or loan path that matches the question.",
      paragraphs: [
        `This directory organizes ${directoryNoun} by ${directory.filters.join(", ")} so users can narrow the path based on intent, market, product, or service area.`,
        `For ${directoryNoun}, result cards preview enough detail to make the next click meaningful: service area, product fit, update details, language, branch coverage, or borrower goal.`,
        "Results stay practical and neutral. They are not rankings, endorsements, or a way to steer users based on protected-class characteristics."
      ],
      sideTitle: "What you can find",
      sideItems: [
        "Clear filters",
        "Helpful result details",
        "No-match guidance",
        "Fast next action",
        "No unsupported rankings"
      ]
    })}
    ${section("Results", { label: "Search", text: "Filter results and open the matching page." }, `<div class="grid three" data-directory-results>${results.slice(0, 24).map((item, index) => card({ title: item.name || item.title, text: item.stateNarrative || item.marketPositioning || item.purpose || humanStatus(item.reviewStatus) || productBriefs[item.id]?.fit || item.borrowerGoal || "Result", href: item.route, iconName: directory.route.includes("branch") ? "branch" : directory.route.includes("loan-officer") ? "expert" : directory.route.includes("loan-options") ? "rates" : "article", accent: accentColors[index % accentColors.length], linkLabel: "Open", searchText: `${item.name || item.title} ${item.stateNarrative || ""} ${item.marketPositioning || ""} ${item.purpose || ""} ${humanStatus(item.reviewStatus) || ""} ${item.borrowerGoal || ""} ${(item.specialties || []).join(" ")} ${(item.filters || []).join(" ")}` })).join("")}</div><div class="result-note" data-directory-empty hidden>No matching results found.</div>`)}
    ${section("Directory next steps", { label: "Helpful links", text: "Each directory keeps high-intent users connected to related pages." }, `<div class="grid three">${card({ title: "Compare rates", text: "Move from any directory into the rates table and payment assumptions.", href: "/rates", iconName: "rates", accent: accentColors[0], linkLabel: "Rates" })}${card({ title: "Run a calculator", text: "Use a scenario before talking to an expert.", href: "/calculators/mortgage-payment", iconName: "calculator", accent: accentColors[1], linkLabel: "Calculate" })}${card({ title: "Browse locations", text: "Pair the result with local market details.", href: "/locations", iconName: "location", accent: accentColors[2], linkLabel: "Locations" })}</div><div style="margin-top:18px">${disclosureFor("directory", "Directory disclosure")}</div>`, "compact")}
    ${section("Save the path", { label: "Snap Homes", text: "Keep useful results connected to your saved research and next-step questions." }, ctaDeck(["watchlist", "leadForm", "account"], "Keep browsing while your research stays organized.", "Save the result to Snap Homes, ask for guidance, or open the account view for markets, searches, rates, and product availability."), "compact")}
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
  return `<section class="news-article article-loading" role="status"><h1>${esc(indexItem.title)}</h1><p>Loading the latest sourced update...</p></section>`;
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
    if (!document.contains(target)) return;
    target.innerHTML = renderArticleContent(article, maps.newsMedia[indexItem.imageId]);
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
    const content = document.querySelector("[data-article-modal-content]");
    if (!content || modal.hidden || requestId !== activeArticleRequestId || modal.dataset.articleId !== indexItem.id) return;
    content.innerHTML = renderArticleContent(article, maps.newsMedia[indexItem.imageId]);
    setDocumentMeta({ type: "newsArticle", item: article }, indexItem.route);
    const heading = content.querySelector("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  } catch {
    const content = document.querySelector("[data-article-modal-content]");
    if (content && requestId === activeArticleRequestId && modal.dataset.articleId === indexItem.id) content.innerHTML = `${articleLoadError(indexItem)}<p><a href="${route(indexItem.route)}" data-article-direct-link>Open the complete article page</a></p>`;
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

const snapMortgagePublisher = { "@type": "Organization", name: "Snap Mortgage" };

function setDocumentMeta(found, path) {
  const item = found?.item || {};
  const titles = {
    home: "Snap Mortgage | Local Mortgage Intelligence",
    locations: "Locations | Snap Mortgage Market Guides",
    rates: "Mortgage Rates, APR Details, and Review Options | Snap Mortgage",
    prequalHandoff: "Provider Prequal Handoff | Snap Mortgage",
    state: `${item.name} Mortgage Guide | Snap Mortgage`,
    city: `${item.name}, ${maps.states[item.stateId]?.abbr || ""} Mortgage Market | Snap Mortgage`,
    product: `${item.name} Guide | Snap Mortgage`,
    blog: `${item.name} | Snap Mortgage Learning Center`,
    contributor: `${item.name} | Snap Mortgage Learning Center`,
    article: `${item.title} | Snap Mortgage`,
    newsArticle: `${item.title} | Snap Mortgage`,
    loanOfficer: `${item.name} | Snap Mortgage Loan Officer`,
    branch: `${item.name} | Snap Mortgage Branch`,
    calculator: `${item.name} | Snap Mortgage Calculator`,
    directory: `${item.name} | Snap Mortgage`
  };
  const descriptions = {
    home: "Compare rates, local markets, loan options, calculators, account save actions, and licensed mortgage guidance.",
    rates: "Review public mortgage-rate benchmarks, APR details, rate-review options, and offer-comparison questions.",
    prequalHandoff: "Carry a selected provider and saved rate-comparison details into the connected Snap prequalification path."
  };
  const title = titles[found?.type] || "Snap Mortgage";
  const description = descriptions[found?.type] || item.metaDescription || item.dek || item.bio || item.marketPositioning || item.stateNarrative || item.purpose || item.borrowerGoal || "Snap Mortgage local mortgage intelligence, calculators, rate details, loan options, experts, branches, and account save actions.";
  const canonical = new URL(path || "/", window.location.origin).toString();
  const image = maps?.newsMedia?.[item.imageId]?.imageUrl || maps?.newsMedia?.[item.imageId]?.localPath || "";
  document.title = title.replace(/\s+/g, " ").trim();
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", image ? new URL(image, window.location.origin).toString() : "");
  document.querySelector('meta[name="twitter:card"]')?.setAttribute("content", image ? "summary_large_image" : "summary");
  const jsonLd = document.querySelector("[data-document-jsonld]");
  if (jsonLd) jsonLd.textContent = ["article", "newsArticle"].includes(found?.type) ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt || item.publishedAt,
    mainEntityOfPage: canonical,
    image: image ? new URL(image, window.location.origin).toString() : undefined,
    author: snapMortgagePublisher,
    publisher: snapMortgagePublisher
  }).replace(/</g, "\\u003c") : "";
}

function notFoundPage(path) {
  return pageShell(`
    ${hero({
      eyebrow: "Page not found",
      title: "We could not find that page.",
      lead: `No route matched ${path}. Use the navigation to continue.`,
      actions: `<a class="button" href="${route("/")}">Back home</a>`,
      panel: `<aside class="hero-panel"><h2>Explore Snap Mortgage</h2><p>Find locations, rates, loan options, calculators, learning guides, and licensed experts.</p></aside>`
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

function render() {
  const path = currentPath();
  const found = maps.routes.get(path);
  let html;
  if (!found) html = notFoundPage(path);
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

  setDocumentMeta(found, path);
  app.innerHTML = html;
  document.body.classList.remove("no-scroll");
  wireInteractions();
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

function openAuthModal(reason = "Create a Snap Homes account or log in to save this to your account.") {
  openModal({
    eyebrow: "Snap Homes",
    title: "Continue with your account",
    body: reason,
    actions: [
      {
        label: "Create account",
        onClick: () => {
          sessionState.isLoggedIn = true;
          persistSessionState();
          closeModal();
          render();
        }
      },
      {
        label: "Log in",
        onClick: () => {
          sessionState.isLoggedIn = true;
          persistSessionState();
          closeModal();
          render();
        }
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
    openAuthModal("Create a Snap Homes account or log in to add this to your watchlist.");
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
  showToast("Saved to your account");
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
        else openAuthModal("Log in to continue to Snap Homes.");
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
        body: "Snap is ready to carry your selected provider and saved comparison details into the connected prequalification path.",
        actions: [{ label: "Continue", onClick: closeModal }]
      });
    });
  });

  document.querySelectorAll("[data-save-action]").forEach((button) => {
    button.addEventListener("click", () => saveToAccount(button, button.getAttribute("data-save-label") || "Saved item"));
  });

  document.querySelectorAll("[data-search-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = new FormData(form).get("query")?.toString().trim().toLowerCase();
      if (!query) return;
      const allItems = form.getAttribute("data-search-scope") === "learning"
        ? buildLearningCenterModel(data).searchItems
        : [
            ...data.states,
            ...data.cities,
            ...data.products,
            ...data.blogPages,
            ...data.articles,
            ...data.loanOfficers,
            ...data.branches
          ];
      const match = allItems.find((item) => `${item.name || item.title} ${item.stateNarrative || ""} ${item.marketPositioning || ""} ${item.purpose || ""} ${item.borrowerGoal || ""}`.toLowerCase().includes(query));
      navigate(route(match?.route || "/learning-center/search"));
    });
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
    const selected = calcForm.querySelector('input[name="program"]:checked')?.value || "";
    const checkbox = dpaOption.querySelector('input[type="checkbox"]');
    const isEligible = ["conventional", "fha"].includes(selected);
    dpaOption.hidden = !isEligible;
    dpaOption.classList.toggle("disabled", !isEligible);
    if (checkbox) {
      checkbox.disabled = !isEligible;
      if (!isEligible) checkbox.checked = false;
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
    const months = Math.max((Number(form.get("termYears")) || 30) * 12, 1);
    const rawPrincipal = Math.max(price - down, 0);
    const upfrontFee = rawPrincipal * (product.upfrontFeeRate || 0);
    const principal = rawPrincipal + upfrontFee;
    const pi = rate > 0 ? (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : principal / months;
    const ltv = price > 0 ? rawPrincipal / price : 0;
    const monthlyMi = selectedProgram === "conventional" && ltv > 0.8
      ? rawPrincipal * 0.0046 / 12
      : rawPrincipal * (product.annualMiRate || 0) / 12;
    const minDown = price * (product.minDownRate || 0);
    const dummyConformingLimit = 806500;
    const dummyFhaLimit = 524225;
    const zip = form.get("zip")?.toString() || "";
    const isUsdaEligibleZip = ["37601", "72712", "65201"].includes(zip);
    const guardrails = [];
    if (down + 1 < minDown) guardrails.push(`Minimum down payment shown for ${product.label}: $${Math.round(minDown).toLocaleString()}.`);
    if (selectedProgram === "conventional" && rawPrincipal > dummyConformingLimit) guardrails.push("Loan amount is above the dummy conforming limit; route to jumbo/conforming review.");
    if (selectedProgram === "fha" && rawPrincipal > dummyFhaLimit) guardrails.push("Base loan amount is above the dummy FHA county limit; needs HUD limit review.");
    if (selectedProgram === "va") guardrails.push("VA output requires eligibility, occupancy, entitlement, and funding-fee exemption review.");
    if (selectedProgram === "usda" && !isUsdaEligibleZip) guardrails.push("USDA is location/income gated in dummy data for this ZIP.");
    let title = "Estimated payment";
    let payment = pi + tax + insurance + hoa + monthlyMi;
    let note = `Uses ${product.label} assumptions. Includes principal, interest, taxes, insurance, HOA, and ${product.miLabel}.`;
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
    let secondaryMetricLabel = "Cash to close";
    let secondaryMetricValue = Math.max(down + (Number(form.get("closingCosts")) || price * 0.018), minDown);
    let comparisonVisual = "";

    if (kind === "affordability") {
      const monthlyIncome = (Number(form.get("income")) || 0) / 12;
      const debts = Number(form.get("debts")) || 0;
      const dtiCap = selectedProgram === "fha" ? 0.43 : selectedProgram === "va" ? 0.41 : selectedProgram === "usda" ? 0.39 : 0.36;
      payment = Math.max(monthlyIncome * dtiCap - debts, 0);
      title = "Estimated target payment";
      note = `Uses a simple ${Math.round(dtiCap * 100)}% ${product.label} debt-to-income planning assumption before lender review.`;
      chartTitle = "Monthly affordability budget";
      chartSummary = "This planning view separates the target housing amount from the income and debt inputs shown above.";
      chartPoints = [
        { label: "Target housing payment", value: payment },
        { label: "Monthly debts", value: debts },
        { label: "Remaining gross income", value: Math.max(monthlyIncome - debts - payment, 0) },
      ];
      chartOptions = { valueHeader: "Monthly budget" };
      secondaryMetricLabel = "Cash available";
      secondaryMetricValue = down;
    } else if (kind === "refinance") {
      const balance = Number(form.get("balance")) || 0;
      const refiUpfrontFee = balance * (product.upfrontFeeRate || 0);
      const refinancePrincipal = balance + refiUpfrontFee;
      const refinancePi = rate > 0 ? (refinancePrincipal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : refinancePrincipal / months;
      const currentPayment = Number(form.get("currentPayment")) || 0;
      const closingCosts = Number(form.get("closingCosts")) || 0;
      const currentEscrow = (Number(form.get("currentTax")) || 0) + (Number(form.get("currentInsurance")) || 0) + (Number(form.get("currentMi")) || 0);
      const newEscrow = (Number(form.get("newTax")) || 0) + (Number(form.get("newInsurance")) || 0) + (Number(form.get("newMi")) || 0);
      const refinanceType = form.get("refinanceType")?.toString() || "standard refinance";
      const currentTotal = currentPayment + currentEscrow;
      const newTotal = refinancePi + newEscrow;
      const savings = currentTotal - newTotal;
      payment = newTotal;
      title = "Estimated new payment";
      note = savings > 0 ? `${product.label} ${refinanceType} module shows an approximate $${Math.round(savings).toLocaleString()} monthly reduction. Estimated breakeven: ${Math.max(Math.ceil(closingCosts / savings), 1)} months.` : `${product.label} ${refinanceType} module does not show a lower total monthly payment with current dummy inputs.`;
      chartTitle = "Refinance payment comparison";
      chartSummary = "Compare current and new mortgage payments with taxes, insurance, and MI assumptions included from Advanced settings.";
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
      title = "Estimated buy payment";
      note = `Compare ${product.label} ownership assumptions against $${Math.round(rent).toLocaleString()} rent today and about $${Math.round(futureRent).toLocaleString()} after ${timeline} years.`;
      chartTitle = "Rent and buy payment comparison";
      chartSummary = "Compare the monthly rent and estimated purchase payment from the inputs shown.";
      chartPoints = [
        { label: "Monthly rent", value: rent },
        { label: "Estimated buy payment", value: payment },
        { label: "Future rent", value: futureRent },
      ];
      chartOptions = { chartType: "bar", valueHeader: "Monthly amount" };
      comparisonVisual = rentBuyLineComparison({ rent, buyPayment: payment, rentGrowth, timeline, price, down, annualRate, termYears: Number(form.get("termYears")) || 30 });
      secondaryMetricLabel = "Time horizon";
      secondaryMetricValue = timeline;
    } else if (kind === "downPayment") {
      title = "Estimated cash needed";
      const closingCostEstimate = price * 0.04;
      const dpaEligible = ["conventional", "fha"].includes(selectedProgram);
      const applyDpa = dpaEligible && form.get("applyDpa") === "yes";
      const dpaAssistance = applyDpa
        ? Math.min(minDown + closingCostEstimate, selectedProgram === "fha" ? price * 0.035 : price * 0.03)
        : 0;
      const baseCashNeeded = minDown + closingCostEstimate;
      payment = Math.max(baseCashNeeded - dpaAssistance, 0);
      note = `${product.label} module estimates minimum down payment plus 4% closing costs${applyDpa ? " after a dummy DPA offset" : ""}. Monthly payment estimate: $${Math.round(pi + tax + insurance + monthlyMi).toLocaleString()}.`;
      chartTitle = "Cash needed by component";
      chartSummary = "Estimate product-dependent cash needed before lender, property, and assistance-program review.";
      chartPoints = [
        { label: "Minimum down payment", value: minDown },
        { label: "Closing costs (4%)", value: closingCostEstimate },
        { label: "DPA estimate", value: dpaAssistance },
      ];
      chartOptions = { chartType: "bar", valueHeader: "Estimated cash" };
      secondaryMetricLabel = "Cash available";
      secondaryMetricValue = down;
      comparisonVisual = "";
      var downPaymentVisualMeta = {
        productLabel: product.label,
        minDown,
        closingCosts: closingCostEstimate,
        dpaAssistance,
        baseRequired: baseCashNeeded,
      };
    }
    const result = document.querySelector("[data-calculator-result]");
    if (result) {
      const guardrailMarkup = guardrails.length
        ? `<div class="guardrail-list"><h3>Product guardrails</h3><ul>${guardrails.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`
        : `<div class="guardrail-list ok"><h3>Product guardrails</h3><p>No dummy rule conflicts for the visible scenario. Final review still required.</p></div>`;
      result.innerHTML = `
        <h2>${esc(title)}</h2>
        ${calculatorResultVisual({ title, payment, points: chartPoints, kind, metricLabel: kind === "downPayment" ? "Estimated cash needed" : title, note, principal, monthlyRate: rate, months, availableCash: down, ...(downPaymentVisualMeta || {}) })}
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
      const track = document.querySelector("[data-news-carousel-track]");
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
    const [response, optionalNews, optionalMedia, optionalMarketCharts, optionalRatesMarketplace, optionalContributors, optionalTopicHubs] = await Promise.all([
      fetch(DATA_URL),
      fetchOptionalJson(NEWS_INDEX_URL),
      fetchOptionalJson(NEWS_MEDIA_URL),
      fetchOptionalJson(MARKET_CHART_FIXTURES_URL),
      fetchOptionalJson(RATES_MARKETPLACE_FIXTURE_URL),
      fetchOptionalJson(CONTRIBUTORS_URL),
      fetchOptionalJson(TOPIC_HUBS_URL)
    ]);
    if (!response.ok) throw new Error("Site data could not be loaded.");
    const loadedData = await response.json();
    editorialContent = loadOptionalEditorialContent(optionalContributors, optionalTopicHubs);
    data = {
      ...loadedData,
      articles: applyArticleAuthorIds(editorialContent, loadedData.articles)
    };
    newsIndex = optionalNews || { articles: [] };
    mediaManifest = optionalMedia || { media: [] };
    marketChartFixtures = loadOptionalMarketChartFixtures(optionalMarketCharts);
    ratesMarketplaceFixture = optionalRatesMarketplace;
    maps = buildMaps(data, newsIndex, mediaManifest, editorialContent);
    loadSessionState();
    render();
    window.addEventListener("popstate", handlePopstate);
  } catch (error) {
    app.innerHTML = `
      <main class="error-state" id="main">
        <div>
          <h1>Could not load site data.</h1>
          <p>${esc(error.message)}</p>
        </div>
      </main>
    `;
  }
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function loadOptionalEditorialContent(contributorsRaw, topicHubsRaw) {
  try {
    return normalizeEditorialContent({
      contributors: contributorsRaw,
      topicHubs: topicHubsRaw
    });
  } catch {
    return normalizeEditorialContent();
  }
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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const appSource = read("site/app.js");
const stylesSource = read("site/styles.css");
const indexSource = read("site/index.html");
const seedSource = read("mock-data/production-seed.json");
const seed = JSON.parse(seedSource);

const failures = [];
const fail = (message) => failures.push(message);

const routeCollections = [
  seed.siteEntryPages,
  seed.states,
  seed.cities,
  seed.branches,
  seed.loanOfficers,
  seed.products,
  seed.ratesPages,
  seed.blogPages,
  seed.articles,
  seed.calculators,
  seed.directoryPages
];

const collectionNames = [
  "siteEntryPages",
  "states",
  "cities",
  "branches",
  "loanOfficers",
  "products",
  "ratesPages",
  "blogPages",
  "articles",
  "calculators",
  "directoryPages"
];

const routes = new Set(["/", "/locations", "/loan-options", "/loan-officers", "/branches"]);
const routeOwners = new Map();
const idOwners = new Map();

routeCollections.forEach((collection, collectionIndex) => {
  const collectionName = collectionNames[collectionIndex];
  collection.filter(Boolean).forEach((item) => {
    if (item.id) {
      if (idOwners.has(item.id)) fail(`Duplicate id ${item.id} in ${collectionName}; first seen in ${idOwners.get(item.id)}`);
      idOwners.set(item.id, collectionName);
    }
    if (item.route) {
      if (routeOwners.has(item.route)) fail(`Duplicate route ${item.route} in ${collectionName}; first seen in ${routeOwners.get(item.route)}`);
      routeOwners.set(item.route, collectionName);
      routes.add(item.route);
    }
  });
});

const statesById = new Map(seed.states.map((state) => [state.id, state]));
const citiesById = new Map(seed.cities.map((city) => [city.id, city]));
const productsById = new Map(seed.products.map((product) => [product.id, product]));
const branchesById = new Map(seed.branches.map((branch) => [branch.id, branch]));
const officersById = new Map(seed.loanOfficers.map((officer) => [officer.id, officer]));
const articlesById = new Map(seed.articles.map((article) => [article.id, article]));
const modulesByParentRoute = new Map();

const requiredStateSnapshotFields = ["medianHomePrice", "paymentScenario", "inventory", "lastUpdated"];
const requiredCitySnapshotFields = ["medianHomePrice", "paymentScenario", "inventory", "taxRate", "insurance", "daysOnMarket"];

for (const state of seed.states) {
  if (!state.id?.startsWith("state-")) fail(`State ${state.name || state.id} must use state-{abbr} id format`);
  if (!state.route?.startsWith("/locations/")) fail(`State ${state.id} must route under /locations`);
  for (const field of requiredStateSnapshotFields) {
    if (!state.marketSnapshot?.[field]) fail(`State ${state.id} missing marketSnapshot.${field}`);
  }
  for (const cityId of state.cityIds || []) {
    const city = citiesById.get(cityId);
    if (!city) fail(`State ${state.id} references missing city ${cityId}`);
    else if (city.stateId !== state.id) fail(`State ${state.id} references city ${cityId} with stateId ${city.stateId}`);
  }
  for (const branchId of state.branchIds || []) {
    if (!branchesById.has(branchId)) fail(`State ${state.id} references missing branch ${branchId}`);
  }
  for (const productId of state.featuredProductIds || []) {
    if (!productsById.has(productId)) fail(`State ${state.id} references missing product ${productId}`);
  }
}

for (const city of seed.cities) {
  const state = statesById.get(city.stateId);
  if (!state) fail(`City ${city.id} references missing state ${city.stateId}`);
  if (!city.id?.startsWith("city-")) fail(`City ${city.name || city.id} must use city-{slug}-{abbr} id format`);
  if (state && !city.route?.startsWith(`${state.route}/`)) fail(`City ${city.id} route ${city.route} must be nested under ${state.route}`);
  for (const field of requiredCitySnapshotFields) {
    if (!city.marketSnapshot?.[field]) fail(`City ${city.id} missing marketSnapshot.${field}`);
  }
  for (const nearbyCityId of city.nearbyCityIds || []) {
    if (!citiesById.has(nearbyCityId)) fail(`City ${city.id} references missing nearby city ${nearbyCityId}`);
  }
  for (const branchId of city.branchIds || []) {
    if (!branchesById.has(branchId)) fail(`City ${city.id} references missing branch ${branchId}`);
  }
  for (const officerId of city.loanOfficerIds || []) {
    if (!officersById.has(officerId)) fail(`City ${city.id} references missing loan officer ${officerId}`);
  }
  for (const productId of city.productIds || []) {
    if (!productsById.has(productId)) fail(`City ${city.id} references missing product ${productId}`);
  }
  for (const articleId of city.articleIds || []) {
    if (!articlesById.has(articleId)) fail(`City ${city.id} references missing article ${articleId}`);
  }
}

for (const module of seed.locationProductModules || []) {
  if (!module.id) fail("Location product module missing id");
  if (!module.parentPageRoute) fail(`Location product module ${module.id} missing parentPageRoute`);
  if (!routes.has(module.parentPageRoute)) fail(`Location product module ${module.id} references unknown parent route ${module.parentPageRoute}`);
  if (!statesById.has(module.stateId)) fail(`Location product module ${module.id} references missing state ${module.stateId}`);
  if (module.cityId && !citiesById.has(module.cityId)) fail(`Location product module ${module.id} references missing city ${module.cityId}`);
  if (!productsById.has(module.productId)) fail(`Location product module ${module.id} references missing product ${module.productId}`);
  if (module.cityId) {
    const city = citiesById.get(module.cityId);
    if (city && module.parentPageRoute !== city.route) fail(`Location product module ${module.id} parent route must match city route ${city.route}`);
  } else {
    const state = statesById.get(module.stateId);
    if (state && module.parentPageRoute !== state.route) fail(`Location product module ${module.id} parent route must match state route ${state.route}`);
  }
  if (!modulesByParentRoute.has(module.parentPageRoute)) modulesByParentRoute.set(module.parentPageRoute, []);
  modulesByParentRoute.get(module.parentPageRoute).push(module);
}

for (const state of seed.states) {
  if (!modulesByParentRoute.has(state.route)) fail(`State ${state.id} has no location product module`);
}

for (const city of seed.cities) {
  if (!modulesByParentRoute.has(city.route)) fail(`City ${city.id} has no location product module`);
}

const removedRoutes = [
  "/snap-homes",
  "/snap-homes/watchlist",
  "/prequal",
  "/rates/review",
  "/compare-offer",
  "/contact/request-guidance"
];

const siteFiles = [
  ["site/app.js", appSource],
  ["site/styles.css", stylesSource],
  ["site/index.html", indexSource],
  ["mock-data/production-seed.json", seedSource]
];

for (const [file, source] of siteFiles) {
  for (const removedRoute of removedRoutes) {
    if (source.includes(removedRoute)) fail(`${file} still references removed route ${removedRoute}`);
  }
}

const scaffoldPhrases = [
  "Trust layer",
  "Answer unlock",
  "Topic guide",
  "Content graph",
  "Editorial graph",
  "Branch content graph",
  "City dashboard"
];

for (const phrase of scaffoldPhrases) {
  if (appSource.includes(phrase)) fail(`site/app.js still contains scaffold phrase "${phrase}"`);
}

if (/borrowerCopy|sanitizeVisibleCopy/.test(appSource)) {
  fail("site/app.js still uses runtime borrower-copy sanitizing");
}

// Location news must use clean paths, defer full article payloads, and keep its
// reading experience separate from the compact account/CTA dialog.
if (/window\.location\.hash|hashchange/.test(appSource)) fail("site/app.js still uses fragment routing");
if (!/window\.history\.pushState/.test(appSource)) fail("site/app.js missing History API navigation");
if (!/location-news-index\.json/.test(appSource)) fail("site/app.js does not load the news index");
if (!/function locationNewsFeed\(/.test(appSource)) fail("locationNewsFeed renderer missing");
if (!/class=\"news-card-media\"/.test(appSource)) fail("news card media missing");
if (!/data-news-article-id/.test(appSource)) fail("news Read more hook missing");

const stateBrief = appSource.indexOf('label: "State brief"');
const stateFeed = appSource.indexOf("locationNewsFeed(state)");
const stateTable = appSource.indexOf('<section class="section">', stateBrief);
if (!(stateBrief < stateFeed && stateFeed < stateTable)) fail("state news feed placement is incorrect");

const cityBrief = appSource.indexOf('label: "Local cost read"');
const cityFeed = appSource.indexOf("locationNewsFeed(city)");
const cityTable = appSource.indexOf('<section class="section">', cityBrief);
if (!(cityBrief < cityFeed && cityFeed < cityTable)) fail("city news feed placement is incorrect");

for (const required of ["data-article-modal", 'aria-modal="true"', "data-article-modal-title", "data-article-modal-close", "openArticleModal", "closeArticleModal"]) {
  if (!appSource.includes(required)) fail(`article modal missing ${required}`);
}
if (!/window\.history\.pushState\([^)]*articleModal/.test(appSource)) fail("article modal does not update history state");
if (!/\.article-modal-backdrop\[hidden\]/.test(stylesSource)) fail("article modal hidden-state CSS missing");
if (!/site\/news-renderer\.mjs/.test(appSource)) fail("site/app.js does not use the shared article renderer");
if (!/rel=\"canonical\"/.test(indexSource)) fail("site/index.html missing canonical metadata shell");
if (!/\"rewrites\"/.test(read("vercel.json"))) fail("vercel.json missing SPA route rewrites");

if (/href=["']#["']/.test(appSource) || /href=["']#["']/.test(indexSource)) {
  fail("A public template still renders href=\"#\"");
}

const obsoleteWatchlistClasses = [
  "watchlist-card",
  "watchlist-grid",
  "watchlist-signals",
  "watchlist-alert",
  "watchlist-card-head"
];

for (const className of obsoleteWatchlistClasses) {
  if (stylesSource.includes(className)) fail(`site/styles.css still contains obsolete .${className} styling`);
}

if (!/\.account-dropdown\[hidden\]\s*\{[^}]*display:\s*none\b/s.test(stylesSource)) {
  fail("site/styles.css must explicitly hide .account-dropdown[hidden]");
}

const routeLiteralPatterns = [
  /\broute\("([^"]+)"\)/g,
  /\brouteWithAnchor\("([^"]+)"/g,
  /href:\s*"([^"]+)"/g,
  /next:\s*"([^"]+)"/g
];

for (const pattern of routeLiteralPatterns) {
  for (const match of appSource.matchAll(pattern)) {
    const route = match[1].split("#")[0];
    if (route.startsWith("/") && !routes.has(route)) {
      fail(`site/app.js references unknown route ${route}`);
    }
  }
}

for (const loop of seed.reviewNavigationLoops || []) {
  for (const step of loop.steps || []) {
    const route = step.split("#")[0];
    if (route && !routes.has(route)) {
      fail(`reviewNavigationLoops.${loop.id} references unknown route ${step}`);
    }
  }
}

if (failures.length) {
  console.error("Phase 2 static smoke failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Phase 2 static smoke passed: ${routes.size} routes checked.`);

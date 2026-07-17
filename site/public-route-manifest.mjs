export const PUBLIC_ROUTE_GROUP_COUNTS = Object.freeze({
  root: 1,
  locations: 789,
  // Compatibility snapshot only; manifest validation derives the live Learning Center count below.
  learningCenter: 41,
  companies: 10,
  loanOfficers: 17,
  branches: 7,
  calculators: 6,
  loanOptions: 6,
  singleton: 5,
  prequal: 1,
});

const SINGLETON_ROUTES = new Set(["/buy", "/refinance", "/home-equity", "/rates"]);

function assertCanonicalRoute(route) {
  if (
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.includes("?") ||
    route.includes("#") ||
    route.includes("//") ||
    (route.length > 1 && route.endsWith("/"))
  ) {
    throw new Error(`Public route must be a canonical absolute path: ${route || "<empty>"}`);
  }
  if (route.startsWith("/learning-center/market-news/")) {
    throw new Error(`News routes are not owned by the public route manifest: ${route}`);
  }
}

function routeEntry(group, type, item, source) {
  const route = item?.route;
  assertCanonicalRoute(route);
  return {
    route,
    type,
    group,
    itemId: item.id,
    source,
  };
}

function tagRouteEntry(tag) {
  const route = tag?.canonicalRoute;
  assertCanonicalRoute(route);
  return {
    route,
    type: "tag",
    group: "learningCenter",
    itemId: tag.id,
    source: "tagRegistry.tags",
  };
}

function findRoute(items, route, source) {
  const item = (items || []).find((candidate) => candidate?.route === route);
  if (!item) throw new Error(`Missing required public route ${route} in ${source}`);
  return item;
}

function learningCenterRouteCount(seed, editorialContent, tagRegistry) {
  return (seed.blogPages || []).length
    + (seed.articles || []).length
    + (editorialContent.contributors || []).length
    + 1
    + (tagRegistry.tags || []).length;
}

function assertGroupCounts(manifest, { seed, editorialContent, tagRegistry }) {
  const expectedCounts = {
    ...PUBLIC_ROUTE_GROUP_COUNTS,
    learningCenter: learningCenterRouteCount(seed, editorialContent, tagRegistry),
  };
  for (const [group, expected] of Object.entries(expectedCounts)) {
    const actual = manifest.filter((entry) => entry.group === group).length;
    if (actual !== expected) {
      throw new Error(`Public route group ${group} must contain ${expected} routes; received ${actual}`);
    }
  }
}

export function createPublicRouteManifest({ seed = {}, editorialContent = {}, tagRegistry = {} } = {}) {
  const entries = [];
  const addAll = (group, type, items, source) => {
    for (const item of items || []) entries.push(routeEntry(group, type, item, source));
  };

  entries.push(routeEntry("root", "home", findRoute(seed.siteEntryPages, "/", "siteEntryPages"), "siteEntryPages"));

  entries.push(routeEntry("locations", "locations", findRoute(seed.directoryPages, "/locations", "directoryPages"), "directoryPages"));
  addAll("locations", "state", seed.states, "states");
  addAll("locations", "city", seed.cities, "cities");

  addAll("learningCenter", "blog", seed.blogPages, "blogPages");
  addAll("learningCenter", "article", seed.articles, "articles");
  addAll("learningCenter", "contributor", editorialContent.contributors, "editorialContent.contributors");
  entries.push(routeEntry("learningCenter", "directory", findRoute(seed.directoryPages, "/learning-center/search", "directoryPages"), "directoryPages"));
  for (const tag of tagRegistry.tags || []) entries.push(tagRouteEntry(tag));

  addAll("companies", "company", seed.companies, "companies");

  entries.push(routeEntry("loanOfficers", "directory", findRoute(seed.directoryPages, "/loan-officers", "directoryPages"), "directoryPages"));
  addAll("loanOfficers", "loanOfficer", seed.loanOfficers, "loanOfficers");

  entries.push(routeEntry("branches", "directory", findRoute(seed.directoryPages, "/branches", "directoryPages"), "directoryPages"));
  addAll("branches", "branch", seed.branches, "branches");

  entries.push(routeEntry("calculators", "directory", findRoute(seed.directoryPages, "/calculators", "directoryPages"), "directoryPages"));
  addAll("calculators", "calculator", seed.calculators, "calculators");

  entries.push(routeEntry("loanOptions", "directory", findRoute(seed.directoryPages, "/loan-options", "directoryPages"), "directoryPages"));
  addAll("loanOptions", "product", (seed.products || []).filter((product) => product.route?.startsWith("/loan-options/")), "products");

  addAll("singleton", "product", (seed.products || []).filter((product) => SINGLETON_ROUTES.has(product.route)), "products");
  addAll("singleton", "rates", (seed.ratesPages || []).filter((page) => SINGLETON_ROUTES.has(page.route)), "ratesPages");
  addAll("singleton", "seller", seed.sellerPages, "sellerPages");

  entries.push(routeEntry("prequal", "prequalHandoff", { id: "prequal-start", route: "/prequal/start" }, "static"));

  const owners = new Map();
  for (const entry of entries) {
    if (owners.has(entry.route)) {
      throw new Error(`Duplicate public route ${entry.route}; owned by ${owners.get(entry.route)} and ${entry.source}`);
    }
    owners.set(entry.route, entry.source);
  }

  assertGroupCounts(entries, { seed, editorialContent, tagRegistry });
  return entries.sort((left, right) => {
    if (left.route === "/") return -1;
    if (right.route === "/") return 1;
    return left.route < right.route ? -1 : left.route > right.route ? 1 : 0;
  });
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(repoRoot, "mock-data", "production-seed.json");
const sourceManifestPath = path.join(repoRoot, "mock-data", "national-location-source-manifest.json");

const stateNames = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming"
};

const territories = new Set(["PR", "VI", "GU", "AS", "MP"]);
const nycBoroughRows = new Set(["brooklyn", "queens", "manhattan", "bronx", "staten island"]);
const curatedCityOrder = [
  "city-austin-tx",
  "city-dallas-tx",
  "city-houston-tx",
  "city-irvine-ca",
  "city-san-diego-ca",
  "city-sacramento-ca",
  "city-denver-co",
  "city-colorado-springs-co",
  "city-boulder-co",
  "city-tampa-fl",
  "city-orlando-fl",
  "city-miami-fl"
];

const stateHomePriceBase = {
  AK: 365000,
  AL: 245000,
  AR: 230000,
  AZ: 440000,
  CA: 789000,
  CO: 542000,
  CT: 390000,
  DC: 675000,
  DE: 355000,
  FL: 416000,
  GA: 360000,
  HI: 775000,
  IA: 235000,
  ID: 430000,
  IL: 310000,
  IN: 265000,
  KS: 255000,
  KY: 260000,
  LA: 250000,
  MA: 620000,
  MD: 430000,
  ME: 385000,
  MI: 265000,
  MN: 345000,
  MO: 275000,
  MS: 230000,
  MT: 465000,
  NC: 365000,
  ND: 260000,
  NE: 285000,
  NH: 445000,
  NJ: 520000,
  NM: 315000,
  NV: 430000,
  NY: 560000,
  OH: 245000,
  OK: 245000,
  OR: 500000,
  PA: 305000,
  RI: 430000,
  SC: 330000,
  SD: 285000,
  TN: 345000,
  TX: 354000,
  UT: 510000,
  VA: 420000,
  WA: 575000,
  WI: 315000,
  WY: 345000
};

const stateTaxRate = {
  AK: 1.04,
  AL: 0.41,
  AR: 0.62,
  AZ: 0.62,
  CA: 0.76,
  CO: 0.55,
  CT: 1.95,
  DC: 0.57,
  DE: 0.61,
  FL: 0.91,
  GA: 0.92,
  HI: 0.32,
  IA: 1.50,
  ID: 0.63,
  IL: 2.08,
  IN: 0.84,
  KS: 1.33,
  KY: 0.82,
  LA: 0.56,
  MA: 1.14,
  MD: 1.05,
  ME: 1.09,
  MI: 1.38,
  MN: 1.05,
  MO: 0.96,
  MS: 0.75,
  MT: 0.83,
  NC: 0.82,
  ND: 0.99,
  NE: 1.61,
  NH: 1.89,
  NJ: 2.23,
  NM: 0.67,
  NV: 0.59,
  NY: 1.40,
  OH: 1.56,
  OK: 0.90,
  OR: 0.93,
  PA: 1.36,
  RI: 1.53,
  SC: 0.57,
  SD: 1.17,
  TN: 0.67,
  TX: 1.82,
  UT: 0.58,
  VA: 0.87,
  WA: 0.86,
  WI: 1.63,
  WY: 0.56
};

const highInsuranceStates = new Set(["FL", "LA", "MS", "TX", "OK", "AL", "SC"]);
const coastalInsuranceStates = new Set(["CA", "HI", "OR", "WA", "NC", "GA", "VA", "MD", "DE", "NJ", "NY", "CT", "RI", "MA", "ME"]);
const militaryStates = new Set(["AK", "AL", "AZ", "CA", "CO", "FL", "GA", "HI", "KS", "NC", "NV", "OK", "SC", "TX", "VA", "WA"]);

const stateNarratives = {
  AK: "Alaska borrowers often compare remote-market costs, VA options, insurance, and property-specific logistics.",
  AL: "Alabama planning often starts with affordability, FHA fit, property taxes, and payment range.",
  AR: "Arkansas buyers often compare lower price points with product fit, taxes, and inventory timing.",
  AZ: "Arizona borrowers often weigh fast-growing market prices, down payment options, and payment sensitivity.",
  CA: "California planning usually starts with high-cost county limits, jumbo fit, insurance, and property-tax assumptions.",
  CO: "Colorado connects relocation, VA demand, price sensitivity, local economy, and metro-to-mountain affordability differences.",
  CT: "Connecticut borrowers often compare higher property taxes, local price bands, and commute-driven market choices.",
  DC: "District of Columbia borrowers often compare high-cost limits, condo considerations, jumbo fit, and payment range.",
  DE: "Delaware buyers often compare tax advantages, coastal insurance questions, and regional price differences.",
  FL: "Florida mortgage planning needs careful insurance and escrow review because carrying costs can move the monthly payment materially.",
  GA: "Georgia buyers often compare metro growth, suburban price bands, FHA options, and property-tax assumptions.",
  HI: "Hawaii mortgage planning often weighs high-cost pricing, condo considerations, insurance, VA options, and island-specific carrying costs.",
  IA: "Iowa mortgage planning often centers on affordability, local taxes, inventory, and conventional product fit.",
  ID: "Idaho borrowers often compare growth-market pricing, relocation timing, and payment sensitivity.",
  IL: "Illinois borrowers often compare higher property taxes, local price bands, and refinance tradeoffs.",
  IN: "Indiana buyers often compare affordable price points, inventory timing, FHA options, and conventional paths.",
  KS: "Kansas planning often connects affordability, VA demand, local taxes, and move-up buyer timing.",
  KY: "Kentucky buyers often compare affordability, FHA options, and local market timing.",
  LA: "Louisiana mortgage planning needs insurance, taxes, flood context, and refinance tradeoffs in the payment conversation.",
  MA: "Massachusetts borrowers often compare high-cost pricing, jumbo fit, condo details, and commute-driven markets.",
  MD: "Maryland buyers often compare metro affordability, VA demand, taxes, and commute-sensitive price bands.",
  ME: "Maine mortgage planning often weighs local inventory, insurance, rural property details, and seasonal market timing.",
  MI: "Michigan borrowers often compare affordability, taxes, refinance options, and metro-to-suburban inventory.",
  MN: "Minnesota buyers often compare conventional, FHA, and refinance paths across local tax and inventory differences.",
  MO: "Missouri planning often starts with affordability, FHA fit, taxes, and metro-to-suburban price differences.",
  MS: "Mississippi borrowers often compare affordability with insurance, taxes, FHA options, and cash-to-close planning.",
  MT: "Montana buyers often compare growth-market prices, rural property details, and inventory constraints.",
  NC: "North Carolina borrowers often compare relocation demand, affordability, VA options, and local tax assumptions.",
  ND: "North Dakota mortgage planning often centers on affordability, employment context, and inventory timing.",
  NE: "Nebraska buyers often compare affordability, taxes, conventional options, and local market supply.",
  NH: "New Hampshire borrowers often compare higher taxes, limited inventory, and commute-sensitive price bands.",
  NJ: "New Jersey borrowers often compare higher property taxes, commute markets, jumbo fit, and monthly payment range.",
  NM: "New Mexico buyers often compare affordability, local inventory, taxes, and product fit.",
  NV: "Nevada borrowers often compare fast-moving market prices, payment sensitivity, and refinance options.",
  NY: "New York borrowers often compare high-cost markets, taxes, condo/co-op details, and jumbo fit.",
  OH: "Ohio mortgage planning often starts with affordability, local taxes, and conventional or FHA fit.",
  OK: "Oklahoma borrowers often compare affordability with insurance, taxes, VA options, and local market timing.",
  OR: "Oregon buyers often compare high-cost pricing, inventory, taxes, and payment sensitivity.",
  PA: "Pennsylvania borrowers often compare taxes, older housing stock, affordability, and refinance paths.",
  RI: "Rhode Island borrowers often compare coastal market pricing, taxes, and inventory constraints.",
  SC: "South Carolina planning often weighs affordability, coastal insurance, relocation demand, and product fit.",
  SD: "South Dakota borrowers often compare affordability, taxes, and local inventory timing.",
  TN: "Tennessee buyers often compare growth-market pricing, affordability, taxes, and FHA or conventional paths.",
  TX: "Texas borrowers often compare higher property tax assumptions against a wide range of price points and metro inventory conditions.",
  UT: "Utah borrowers often compare high-growth pricing, inventory, down payment range, and payment sensitivity.",
  VA: "Virginia buyers often compare VA options, commute markets, taxes, and local price differences.",
  WA: "Washington borrowers often compare high-cost pricing, jumbo fit, taxes, and local inventory.",
  WI: "Wisconsin mortgage planning often centers on affordability, taxes, and local inventory timing.",
  WY: "Wyoming borrowers often compare affordability, local inventory, rural property details, and employment context."
};

const productSets = {
  standard: ["product-purchase", "product-conventional", "product-fha", "product-refinance"],
  highCost: ["product-purchase", "product-jumbo", "product-conventional", "product-refinance"],
  equity: ["product-refinance", "product-home-equity", "product-cash-out-refinance", "product-conventional"],
  va: ["product-purchase", "product-va", "product-conventional", "product-refinance"]
};

const productModuleCopy = {
  "product-purchase": { label: "Purchase loans", anchor: "#purchase-loans", slug: "purchase" },
  "product-refinance": { label: "Refinance", anchor: "#refinance", slug: "refinance" },
  "product-fha": { label: "FHA loans", anchor: "#fha-loans", slug: "fha" },
  "product-va": { label: "VA loans", anchor: "#va-loans", slug: "va" },
  "product-conventional": { label: "Conventional loans", anchor: "#conventional-loans", slug: "conventional" },
  "product-jumbo": { label: "Jumbo loans", anchor: "#jumbo-loans", slug: "jumbo" },
  "product-home-equity": { label: "Home equity options", anchor: "#home-equity-options", slug: "home-equity" },
  "product-cash-out-refinance": { label: "Cash-out refinance", anchor: "#cash-out-refinance", slug: "cash-out" }
};

const supplementalCityRows = [
  {
    city: "Honolulu",
    city_ascii: "Honolulu",
    state_id: "HI",
    state_name: "Hawaii",
    county_fips: "15003",
    county_name: "Honolulu",
    lat: "21.3294",
    lng: "-157.8460",
    population: "350964",
    population_proper: "350964",
    density: "2230",
    source: "census-place-supplement",
    incorporated: "False",
    timezone: "Pacific/Honolulu",
    zips: "",
    id: "1840013305"
  }
];

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (value.startsWith("--")) {
      args.set(value.slice(2), process.argv[index + 1] && !process.argv[index + 1].startsWith("--") ? process.argv[++index] : true);
    }
  }
  return args;
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body.filter((values) => values.length === header.length).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index]])));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatMoney(value) {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `$${millions >= 10 ? Math.round(millions) : millions.toFixed(2).replace(/0$/, "").replace(/\.0$/, "")}M`;
  }
  return `$${Math.round(value / 1000)}K`;
}

function formatPayment(value) {
  const rounded = Math.round(value / 10) * 10;
  return `$${rounded.toLocaleString("en-US")}/mo`;
}

function seededNumber(seed, min, max) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }
  return min + (hash / 9973) * (max - min);
}

function cityPrice(row) {
  const stateBase = stateHomePriceBase[row.state_id] || 335000;
  const population = Number(row.population_proper || 0);
  const density = Number(row.density || 0);
  const populationLift = Math.min(1.38, 0.86 + Math.log10(Math.max(population, 50000)) / 9);
  const densityLift = Math.min(1.22, 0.94 + Math.log10(Math.max(density, 100)) / 18);
  const jitter = seededNumber(`${row.city_ascii}-${row.state_id}`, 0.92, 1.08);
  return Math.round(Math.min(1450000, Math.max(185000, stateBase * populationLift * densityLift * jitter)));
}

function inventoryFor(row) {
  const population = Number(row.population_proper || 0);
  const base = seededNumber(`${row.city_ascii}-${row.state_id}-inventory`, 2.2, 4.8);
  const adjustment = population > 500000 ? -0.35 : population < 90000 ? 0.25 : 0;
  return `${Math.max(1.8, Math.min(5.4, base + adjustment)).toFixed(1)} months`;
}

function daysOnMarketFor(row) {
  const inventory = Number.parseFloat(inventoryFor(row));
  const days = Math.round(27 + inventory * 5 + seededNumber(`${row.city_ascii}-${row.state_id}-dom`, 0, 12));
  return String(Math.max(24, Math.min(62, days)));
}

function insuranceFor(stateId) {
  if (highInsuranceStates.has(stateId)) return "Moderate-high";
  if (coastalInsuranceStates.has(stateId)) return "Moderate-high";
  if (["CO", "MT", "WY", "ID", "UT", "AZ", "NM", "NV"].includes(stateId)) return "Moderate";
  return "Moderate";
}

function productsFor(row, price) {
  if (militaryStates.has(row.state_id) && seededNumber(`${row.city_ascii}-va`, 0, 1) > 0.45) return productSets.va;
  if (price > 650000) return productSets.highCost;
  if (seededNumber(`${row.city_ascii}-equity`, 0, 1) > 0.72) return productSets.equity;
  return productSets.standard;
}

function articlesFor(productIds, stateId, existingArticleIds = []) {
  const articles = new Set(existingArticleIds);
  const stateArticle = {
    TX: "article-texas-tax-guide",
    CA: "article-california-insurance-guide",
    CO: "article-colorado-tax-guide",
    FL: "article-florida-insurance-guide"
  }[stateId];
  if (stateArticle) articles.add(stateArticle);
  if (productIds.includes("product-va")) articles.add("article-va-basics");
  if (productIds.includes("product-jumbo")) articles.add("article-jumbo-basics");
  if (productIds.includes("product-fha")) articles.add("article-fha-basics");
  if (productIds.includes("product-home-equity")) articles.add("article-home-equity-guide");
  if (productIds.includes("product-cash-out-refinance")) articles.add("article-cash-out-guide");
  articles.add("article-first-time-buyer");
  articles.add("article-move-up-buyer");
  return [...articles].slice(0, 4);
}

function marketPositioning(row, price) {
  const highCost = price > 650000;
  const stateId = row.state_id;
  if (highCost) return `${row.city_ascii} borrowers often compare jumbo fit, cash to close, local taxes, insurance, and payment range before choosing a loan path.`;
  if (highInsuranceStates.has(stateId)) return `${row.city_ascii} mortgage planning often needs insurance, taxes, inventory, and monthly payment assumptions reviewed together.`;
  if (militaryStates.has(stateId)) return `${row.city_ascii} buyers often compare purchase, VA, FHA, and conventional options against local price and inventory conditions.`;
  return `${row.city_ascii} borrowers often compare price, payment, inventory, taxes, insurance, and product fit before choosing a mortgage path.`;
}

function distanceSquared(a, b) {
  const lat = Number(a.lat || 0) - Number(b.lat || 0);
  const lng = Number(a.lng || 0) - Number(b.lng || 0);
  return lat * lat + lng * lng;
}

function generatedCity(row, existing) {
  const stateName = stateNames[row.state_id] || row.state_name;
  const stateSlug = slugify(stateName);
  const citySlug = slugify(row.city_ascii || row.city);
  const id = `city-${citySlug}-${row.state_id.toLowerCase()}`;
  const price = cityPrice(row);
  const productIds = existing?.productIds?.length ? existing.productIds : productsFor(row, price);
  return {
    id,
    name: existing?.name || row.city_ascii || row.city,
    stateId: `state-${row.state_id.toLowerCase()}`,
    route: `/locations/${stateSlug}/${citySlug}`,
    sourceGeography: {
      cityKey: `${slugify(row.city_ascii || row.city)}|${row.state_id}`,
      stateFips: String(row.county_fips || "").padStart(5, "0").slice(0, 2),
      countyFips: String(row.county_fips || "").padStart(5, "0"),
      countyName: String(row.county_name || "").trim(),
      latitude: Number(row.lat),
      longitude: Number(row.lng),
      populationProper: Number(row.population_proper),
    },
    marketPositioning: existing?.marketPositioning || marketPositioning(row, price),
    nearbyCityIds: existing?.nearbyCityIds || [],
    branchIds: existing?.branchIds || [],
    loanOfficerIds: existing?.loanOfficerIds || [],
    productIds,
    articleIds: articlesFor(productIds, row.state_id, existing?.articleIds || []),
    marketSnapshot: existing?.marketSnapshot || {
      medianHomePrice: formatMoney(price),
      paymentScenario: formatPayment(price * 0.00685),
      inventory: inventoryFor(row),
      taxRate: `${(stateTaxRate[row.state_id] || 1.0).toFixed(2)}%`,
      insurance: insuranceFor(row.state_id),
      daysOnMarket: daysOnMarketFor(row)
    }
  };
}

function stateProducts(cityEntries, stateId) {
  const productCounts = new Map();
  for (const city of cityEntries) {
    for (const productId of city.productIds || []) {
      productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
    }
  }
  const ranked = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const preferred = militaryStates.has(stateId) ? ["product-va"] : [];
  return [...new Set([...preferred, ...ranked, ...productSets.standard])].slice(0, 4);
}

function stateSnapshot(stateId, cityEntries) {
  const prices = cityEntries
    .map((city) => city.marketSnapshot.medianHomePrice)
    .map((value) => {
      const clean = String(value).replace(/[$,]/g, "");
      return clean.endsWith("M") ? Number(clean.slice(0, -1)) * 1000000 : Number(clean.replace("K", "")) * 1000;
    })
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] || stateHomePriceBase[stateId] || 335000;
  const inventoryValues = cityEntries.map((city) => Number.parseFloat(city.marketSnapshot.inventory)).filter(Number.isFinite);
  const inventory = inventoryValues.length ? inventoryValues.reduce((sum, value) => sum + value, 0) / inventoryValues.length : 3.4;
  return {
    medianHomePrice: formatMoney(median),
    paymentScenario: formatPayment(median * 0.00685),
    inventory: `${inventory.toFixed(1)} months`,
    propertyTaxContext: (stateTaxRate[stateId] || 1) > 1.35 ? "Higher tax review can materially affect payment" : "Local tax assumptions vary by city and county",
    insuranceContext: insuranceFor(stateId) === "Moderate-high" ? "Insurance should be reviewed early in the payment scenario" : "Insurance assumptions should be confirmed before choosing a path",
    lastUpdated: "2026-07-10"
  };
}

function validateCityUniverse(rows) {
  const routeSet = new Set();
  const idSet = new Set();
  const failures = [];
  for (const row of rows) {
    const stateName = stateNames[row.state_id] || row.state_name;
    const route = `/locations/${slugify(stateName)}/${slugify(row.city_ascii || row.city)}`;
    const id = `city-${slugify(row.city_ascii || row.city)}-${row.state_id.toLowerCase()}`;
    if (routeSet.has(route)) failures.push(`duplicate city route ${route}`);
    if (idSet.has(id)) failures.push(`duplicate city id ${id}`);
    routeSet.add(route);
    idSet.add(id);
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

function productModuleFor({ state, city = null, productId, generated = true }) {
  const config = productModuleCopy[productId] || productModuleCopy["product-purchase"];
  const locationName = city ? `${city.name}, ${state.abbr}` : state.name;
  const locationSlug = city ? city.id.replace(/^city-/, "") : state.id.replace(/^state-/, "");
  return {
    id: `module-${locationSlug}-${config.slug}`,
    name: `${config.label} in ${locationName}`,
    parentPageRoute: city ? city.route : state.route,
    anchor: config.anchor,
    stateId: state.id,
    cityId: city ? city.id : null,
    productId,
    generated
  };
}

function buildLocationProductModules(seed, states, cities) {
  const statesById = new Map(states.map((state) => [state.id, state]));
  const modules = Array.isArray(seed.locationProductModules) ? seed.locationProductModules.slice() : [];
  const routesWithModules = new Set(modules.map((module) => module.parentPageRoute));
  const moduleIds = new Set(modules.map((module) => module.id));

  function addModule(module) {
    if (moduleIds.has(module.id)) return;
    modules.push(module);
    moduleIds.add(module.id);
  }

  for (const state of states) {
    if (routesWithModules.has(state.route)) continue;
    for (const productId of (state.featuredProductIds || []).slice(0, 2)) {
      addModule(productModuleFor({ state, productId }));
    }
  }

  for (const city of cities) {
    if (routesWithModules.has(city.route)) continue;
    const state = statesById.get(city.stateId);
    if (!state) continue;
    const productId = (city.productIds || [])[0] || "product-purchase";
    addModule(productModuleFor({ state, city, productId }));
  }

  return modules;
}

function nearbyIdsFor(cityRow, rowsById, generatedRows) {
  const sameState = generatedRows.filter((row) => row.id !== cityRow.id && row.state_id === cityRow.state_id);
  const candidates = sameState.length >= 2 ? sameState : generatedRows.filter((row) => row.id !== cityRow.id);
  return candidates
    .map((row) => ({ row, distance: distanceSquared(cityRow, row) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map(({ row }) => rowsById.get(row.id)?.id)
    .filter(Boolean);
}

const args = parseArgs();
const csvPath = path.resolve(String(args.get("source") || path.join(process.env.TEMP || process.env.TMP || ".", "uscities.csv")));
if (!fs.existsSync(csvPath)) {
  throw new Error(`Source CSV not found: ${csvPath}`);
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const parsedRows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const rows = parsedRows
  .concat(supplementalCityRows.filter((supplement) => !parsedRows.some((row) => row.state_id === supplement.state_id && row.city_ascii === supplement.city_ascii && row.population_proper)))
  .filter((row) => row.population_proper && Number(row.population_proper) >= 50000)
  .filter((row) => row.city_ascii && row.state_id && stateNames[row.state_id])
  .filter((row) => !territories.has(row.state_id))
  .filter((row) => !(row.state_id === "NY" && nycBoroughRows.has(String(row.city_ascii).toLowerCase())));

rows.sort((a, b) => {
  if (a.state_id !== b.state_id) return a.state_id.localeCompare(b.state_id);
  return Number(b.population_proper) - Number(a.population_proper);
});

validateCityUniverse(rows);

const existingStates = new Map(seed.states.map((state) => [state.id, state]));
const existingCities = new Map(seed.cities.map((city) => [city.id, city]));
const generatedRows = rows.map((row) => ({
  ...row,
  id: `city-${slugify(row.city_ascii || row.city)}-${row.state_id.toLowerCase()}`
}));

const generatedCities = new Map();
const batchReports = [];
for (let batchStart = 0; batchStart < generatedRows.length; batchStart += 20) {
  const batch = generatedRows.slice(batchStart, batchStart + 20);
  for (const row of batch) {
    const city = generatedCity(row, existingCities.get(row.id));
    if (!city.route || !city.stateId || !city.marketSnapshot?.medianHomePrice || !city.marketSnapshot?.paymentScenario) {
      throw new Error(`Invalid generated city in batch ${Math.floor(batchStart / 20) + 1}: ${row.id}`);
    }
    generatedCities.set(row.id, city);
  }
  batchReports.push({
    batch: Math.floor(batchStart / 20) + 1,
    count: batch.length,
    firstCityId: batch[0]?.id,
    lastCityId: batch.at(-1)?.id
  });
}

for (const row of generatedRows) {
  const city = generatedCities.get(row.id);
  if (!city.nearbyCityIds.length) {
    city.nearbyCityIds = nearbyIdsFor(row, generatedCities, generatedRows);
  }
}

const statesById = new Map();
const rowsByStateId = new Map();
for (const row of generatedRows) {
  const stateId = `state-${row.state_id.toLowerCase()}`;
  if (!rowsByStateId.has(stateId)) rowsByStateId.set(stateId, []);
  rowsByStateId.get(stateId).push(row);
}

for (const [stateId, groupedRows] of rowsByStateId.entries()) {
  const abbr = stateId.slice("state-".length).toUpperCase();
  const stateName = stateNames[abbr];
  const existing = existingStates.get(stateId);
  const cityEntries = groupedRows.map((row) => generatedCities.get(row.id)).filter(Boolean);
  statesById.set(stateId, {
    id: stateId,
    name: existing?.name || stateName,
    abbr,
    route: existing?.route || `/locations/${slugify(stateName)}`,
    stateNarrative: existing?.stateNarrative || stateNarratives[abbr] || `${stateName} borrowers can compare local price, payment, inventory, tax, insurance, and product options before choosing a mortgage path.`,
    cityIds: cityEntries
      .slice()
      .sort((a, b) => Number(groupedRows.find((row) => row.id === b.id)?.population_proper || 0) - Number(groupedRows.find((row) => row.id === a.id)?.population_proper || 0))
      .map((city) => city.id),
    branchIds: existing?.branchIds || [],
    featuredProductIds: existing?.featuredProductIds || stateProducts(cityEntries, abbr),
    marketSnapshot: existing?.marketSnapshot || stateSnapshot(abbr, cityEntries)
  });
}

const stateOrder = [...statesById.values()].sort((a, b) => a.name.localeCompare(b.name));
const stateIndex = new Map(stateOrder.map((state, index) => [state.id, index]));
const curatedCityIds = new Set(curatedCityOrder);
const generatedCityOrder = [...generatedCities.values()].sort((a, b) => {
  const stateCompare = (stateIndex.get(a.stateId) ?? 0) - (stateIndex.get(b.stateId) ?? 0);
  if (stateCompare) return stateCompare;
  return a.name.localeCompare(b.name);
});
const cityOrder = [
  ...curatedCityOrder.map((cityId) => generatedCities.get(cityId)).filter(Boolean),
  ...generatedCityOrder.filter((city) => !curatedCityIds.has(city.id))
];

seed.meta = {
  ...seed.meta,
  version: "production-research-v3-national-locations",
  date: "2026-07-10",
  note: "Research seed data for the routed review site. City pages use a 50k+ city-proper population source list and source-aware estimated mortgage-market snapshots. Public launch requires live data ingestion, internal pricing, licensing, and compliance approval."
};

seed.recommendedCounts = {
  ...seed.recommendedCounts,
  states: stateOrder.length,
  cities: cityOrder.length
};

seed.states = stateOrder;
seed.cities = cityOrder;
seed.locationProductModules = buildLocationProductModules(seed, stateOrder, cityOrder);
seed.recommendedCounts.locationProductModules = seed.locationProductModules.length;

const presentStateAbbrs = new Set(seed.states.map((state) => state.abbr));
const expectedStateAbbrs = Object.keys(stateNames).filter((abbr) => rows.some((row) => row.state_id === abbr));
const missingThresholdStates = Object.keys(stateNames).filter((abbr) => !presentStateAbbrs.has(abbr));

fs.writeFileSync(sourceManifestPath, `${JSON.stringify({
  source: "SimpleMaps uscities.csv with source-aware generation for static review pages",
  sourceUrl: "https://simplemaps.com/static/data/us-cities/uscities.csv",
  threshold: "population_proper >= 50000",
  excludedRows: [
    "United States territories",
    "New York City borough rows when New York city is present"
  ],
  supplementalRows: supplementalCityRows.map((row) => ({
    city: row.city_ascii,
    state: row.state_id,
    reason: "Source CSV includes Hawaii places with blank population fields; Honolulu is added so Hawaii is represented by its primary 50k+ city-proper market."
  })),
  generatedAt: "2026-07-10",
  states: seed.states.length,
  cities: seed.cities.length,
  batchesOf20: Math.ceil(seed.cities.length / 20),
  batches: batchReports,
  statesFromSource: expectedStateAbbrs.length,
  statesWithoutCityProper50k: missingThresholdStates
}, null, 2)}\n`);

fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

console.log(`Generated ${cityOrder.length} city routes across ${stateOrder.length} state routes in ${Math.ceil(cityOrder.length / 20)} batches of 20.`);

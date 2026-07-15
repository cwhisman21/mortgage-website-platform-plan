import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyArticleAuthorIds, mergeEditorialArticles, normalizeEditorialContent } from "./editorial-content.mjs";
import { productContentById } from "./product-content.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const modulePath = path.join(siteDir, "document-metadata.mjs");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const seed = readJson("mock-data/production-seed.json");
const editorialBundle = readJson("mock-data/editorial-content.json");
const productCopyBundle = readJson("mock-data/product-copy.json");
const editorialContent = normalizeEditorialContent(editorialBundle);
const articles = applyArticleAuthorIds(editorialContent, mergeEditorialArticles(seed.articles, editorialBundle));
const statesById = Object.fromEntries(seed.states.map((state) => [state.id, state]));
const contributorsById = Object.fromEntries(editorialContent.contributors.map((contributor) => [contributor.id, contributor]));
const options = {
  siteOrigin: "https://mortgage.example",
  statesById,
  contributorsById,
  productCopyBundle,
};
const metadataTagFixtureDate = "2026-07-14";
const floridaTag = {
  id: "tag-state-florida",
  displayName: "Florida",
  slug: "florida",
  type: "state",
  description: "Explore mortgage planning resources and local market context for Florida.",
  relatedTagIds: ["tag-property-concept-homeowners-insurance"],
  canonicalRoute: "/learning-center/tags/florida",
  reviewedAt: "2026-07-12",
  updatedAt: metadataTagFixtureDate,
  redirectSlugs: ["sunshine-state"],
};
const insuranceTag = {
  id: "tag-property-concept-homeowners-insurance",
  displayName: "Homeowners Insurance",
  slug: "homeowners-insurance",
  type: "property-concept",
  description: "Explore homeowners insurance guidance and related mortgage planning resources.",
  relatedTagIds: [floridaTag.id],
  canonicalRoute: "/learning-center/tags/homeowners-insurance",
  reviewedAt: "2026-07-13",
  updatedAt: metadataTagFixtureDate,
  redirectSlugs: [],
};
const taggedArticleRoute = "/learning-center/austin-mortgage-market-update";
const taggedTopicGuideRoute = "/learning-center/taxes-insurance";
const metadataTagRegistry = {
  version: 1,
  updatedAt: metadataTagFixtureDate,
  tags: [floridaTag, insuranceTag],
  assignments: [
    {
      route: taggedArticleRoute,
      primaryTagIds: [floridaTag.id],
      additionalTagIds: [insuranceTag.id],
    },
    {
      route: taggedTopicGuideRoute,
      primaryTagIds: [insuranceTag.id],
      additionalTagIds: [floridaTag.id],
    },
  ],
};
const tagSearchRecords = [
  {
    id: "guide-florida-insurance",
    route: "/learning-center/florida-homeowners-insurance-guide",
    family: "articles",
    title: "Florida homeowners insurance guide",
    tagIds: [floridaTag.id, insuranceTag.id],
    canonicalOrder: 2,
  },
  {
    id: "product-florida-fha",
    route: "/loan-options/fha-loans",
    family: "product-guides",
    title: "FHA loans",
    tagIds: [floridaTag.id],
    canonicalOrder: 1,
  },
  {
    id: "unrelated-calculator",
    route: "/calculators/refinance",
    family: "calculators",
    title: "Refinance calculator",
    tagIds: [insuranceTag.id],
    canonicalOrder: 0,
  },
];

async function metadataModule() {
  assert.equal(fs.existsSync(modulePath), true, "site/document-metadata.mjs must exist");
  return import(pathToFileURL(modulePath));
}

test("route metadata resolves route-specific canonical, social, and product copy fields", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const city = seed.cities.find((item) => item.route === "/locations/texas/austin");
  const product = seed.products.find((item) => item.route === "/loan-options/fha-loans");

  const cityMetadata = resolveDocumentMetadata({ type: "city", item: city }, { ...options, path: city.route });
  assert.equal(cityMetadata.title, "Austin, TX Mortgage Market | Snap Mortgage");
  assert.equal(cityMetadata.canonical, "https://mortgage.example/locations/texas/austin");
  assert.match(cityMetadata.description, /Austin/);
  assert.equal(cityMetadata.openGraph.type, "website");
  assert.equal(cityMetadata.openGraph.url, cityMetadata.canonical);
  assert.equal(cityMetadata.twitter.title, cityMetadata.title);
  assert.equal(cityMetadata.twitter.description, cityMetadata.description);
  assert.equal(cityMetadata.jsonLd, null);
  assert.match(cityMetadata.description, /example home prices/i);
  assert.match(cityMetadata.description, /before reviewing a property/i);
  assert.doesNotMatch(cityMetadata.description, /seed|planning assumption/i);
  assert.doesNotMatch(cityMetadata.description, /(?:is|are) (?:a )?current observed|currently observed|licensed help|as of|last updated/i);

  const productMetadata = resolveDocumentMetadata({ type: "product", item: product }, { ...options, path: product.route });
  assert.equal(productMetadata.description, productContentById(productCopyBundle, product.id).metaDescription);
  assert.equal(productMetadata.canonical, "https://mortgage.example/loan-options/fha-loans");
});

test("editorial article metadata preserves authorship and adds canonical tag relationships", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const article = articles.find((item) => item.route === "/learning-center/austin-mortgage-market-update");
  const metadata = resolveDocumentMetadata(
    { type: "article", item: article },
    { ...options, path: article.route, tagRegistry: metadataTagRegistry },
  );

  assert.equal(metadata.openGraph.type, "article");
  assert.equal(metadata.description, article.metaDescription);
  assert.equal(metadata.jsonLd["@type"], "Article");
  assert.equal(metadata.jsonLd.headline, article.title);
  assert.equal(metadata.jsonLd.mainEntityOfPage, metadata.canonical);
  assert.deepEqual(metadata.jsonLd.author, {
    "@type": "Organization",
    name: "Snap Mortgage Editorial",
    url: "https://mortgage.example/learning-center/editorial-team",
  });
  assert.doesNotMatch(JSON.stringify(metadata.jsonLd), /"@type":"Person"/);
  assert.deepEqual(metadata.jsonLd.publisher, { "@type": "Organization", name: "Snap Mortgage" });
  assert.deepEqual(metadata.jsonLd.keywords, ["Florida", "Homeowners Insurance"]);
  assert.deepEqual(metadata.jsonLd.articleSection, ["Florida"]);
  assert.deepEqual(metadata.jsonLd.about, [
    { "@type": "Thing", name: "Florida", url: "https://mortgage.example/learning-center/tags/florida" },
    { "@type": "Thing", name: "Homeowners Insurance", url: "https://mortgage.example/learning-center/tags/homeowners-insurance" },
  ]);
});

test("tagged topic guides preserve guide metadata and expose Article tag relationships", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const guide = seed.blogPages.find((item) => item.route === taggedTopicGuideRoute);
  const untaggedMetadata = resolveDocumentMetadata(
    { type: "blog", item: guide },
    { ...options, path: guide.route },
  );
  const metadata = resolveDocumentMetadata(
    { type: "blog", item: guide },
    { ...options, path: guide.route, tagRegistry: metadataTagRegistry },
  );

  assert.equal(untaggedMetadata.jsonLd, null);
  assert.equal(metadata.title, untaggedMetadata.title);
  assert.equal(metadata.description, untaggedMetadata.description);
  assert.equal(metadata.canonical, untaggedMetadata.canonical);
  assert.deepEqual(metadata.openGraph, untaggedMetadata.openGraph);
  assert.deepEqual(metadata.twitter, untaggedMetadata.twitter);
  assert.equal(metadata.openGraph.type, "website");
  assert.equal(metadata.jsonLd["@type"], "Article");
  assert.equal(metadata.jsonLd.headline, guide.name);
  assert.equal(metadata.jsonLd.mainEntityOfPage, metadata.canonical);
  assert.deepEqual(metadata.jsonLd.author, {
    "@type": "Organization",
    name: "Snap Mortgage Editorial",
    url: "https://mortgage.example/learning-center/editorial-team",
  });
  assert.deepEqual(metadata.jsonLd.publisher, { "@type": "Organization", name: "Snap Mortgage" });
  assert.deepEqual(metadata.jsonLd.keywords, ["Homeowners Insurance", "Florida"]);
  assert.deepEqual(metadata.jsonLd.articleSection, ["Homeowners Insurance"]);
  assert.deepEqual(metadata.jsonLd.about, [
    { "@type": "Thing", name: "Homeowners Insurance", url: "https://mortgage.example/learning-center/tags/homeowners-insurance" },
    { "@type": "Thing", name: "Florida", url: "https://mortgage.example/learning-center/tags/florida" },
  ]);
  assert.equal("datePublished" in metadata.jsonLd, false);
  assert.equal("dateModified" in metadata.jsonLd, false);
});

test("single-tag metadata is self-canonical, indexable, and emits CollectionPage and ItemList JSON-LD", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const metadata = resolveDocumentMetadata(
    { type: "tag", item: floridaTag },
    {
      ...options,
      path: floridaTag.canonicalRoute,
      searchRecords: tagSearchRecords,
      tagRegistry: metadataTagRegistry,
    },
  );

  assert.equal(metadata.title, "Florida Mortgage Resources | Snap Mortgage");
  assert.equal(metadata.description, floridaTag.description);
  assert.equal(metadata.canonical, "https://mortgage.example/learning-center/tags/florida");
  assert.equal(metadata.robots, "index,follow");
  assert.equal(metadata.openGraph.type, "website");
  assert.equal(metadata.openGraph.url, metadata.canonical);
  assert.equal(metadata.twitter.title, metadata.title);
  assert.equal(metadata.jsonLd.length, 2);
  assert.equal(metadata.jsonLd[0]["@type"], "CollectionPage");
  assert.equal(metadata.jsonLd[0].url, metadata.canonical);
  assert.equal(metadata.jsonLd[0].dateModified, floridaTag.updatedAt);
  assert.equal(metadata.jsonLd[1]["@type"], "ItemList");
  assert.equal(metadata.jsonLd[1].numberOfItems, 2);
  assert.deepEqual(
    metadata.jsonLd[1].itemListElement.map(({ position, url, name }) => ({ position, url, name })),
    [
      { position: 1, url: "https://mortgage.example/loan-options/fha-loans", name: "FHA loans" },
      { position: 2, url: "https://mortgage.example/learning-center/florida-homeowners-insurance-guide", name: "Florida homeowners insurance guide" },
    ],
  );
});

test("historical tag slugs canonicalize to the accepted tag route", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const metadata = resolveDocumentMetadata(
    { type: "tag", item: floridaTag },
    {
      ...options,
      path: "/learning-center/tags/sunshine-state",
      searchRecords: tagSearchRecords,
      tagRegistry: metadataTagRegistry,
    },
  );

  assert.equal(metadata.canonical, "https://mortgage.example/learning-center/tags/florida");
});

test("base search and query states are noindex with the base search canonical", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const searchPage = seed.directoryPages.find(({ route }) => route === "/learning-center/search");
  const baseMetadata = resolveDocumentMetadata(
    { type: "directory", item: searchPage },
    { ...options, path: searchPage.route },
  );
  const queryMetadata = resolveDocumentMetadata(
    { type: "directory", item: searchPage },
    { ...options, path: `${searchPage.route}?tag=${floridaTag.id}&q=insurance` },
  );

  assert.equal(baseMetadata.robots, "noindex,follow");
  assert.equal(queryMetadata.robots, "noindex,follow");
  assert.equal(queryMetadata.canonical, "https://mortgage.example/learning-center/search");
  assert.equal(queryMetadata.openGraph.url, queryMetadata.canonical);
  assert.equal(queryMetadata.title, baseMetadata.title);
  assert.equal(queryMetadata.description, baseMetadata.description);
});

test("prequalification metadata describes the no-PII selected-provider scenario summary", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const metadata = resolveDocumentMetadata(
    { type: "prequalHandoff", item: { route: "/prequal/start" } },
    { ...options, path: "/prequal/start" },
  );

  assert.equal(metadata.canonical, "https://mortgage.example/prequal/start");
  assert.match(metadata.title, /Prequalification/);
  assert.match(metadata.description, /no-PII/i);
  assert.match(metadata.description, /selected provider/i);
  assert.match(metadata.description, /illustrative.*scenario/i);
  assert.doesNotMatch(metadata.description, /secure|contact details|available|licensed team|team availability/i);
});

test("loan-officer and branch metadata omits unverified professional and location claims", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const officer = {
    name: "Fixture Officer",
    route: "/loan-officers/fixture-officer",
    nmls: "NMLS-000101",
    licensedStates: ["Texas", "Colorado"],
    specialties: ["Jumbo loans"],
    availability: "Available today",
  };
  const branch = {
    name: "Fixture Branch",
    route: "/branches/fixture-branch",
    address: "123 Invented Street",
    coverageNote: "Texas service area and branch coverage.",
    hours: "Open daily",
  };

  const officerMetadata = resolveDocumentMetadata({ type: "loanOfficer", item: officer }, { ...options, path: officer.route });
  const branchMetadata = resolveDocumentMetadata({ type: "branch", item: branch }, { ...options, path: branch.route });
  const combined = `${officerMetadata.description} ${branchMetadata.description}`;

  assert.equal(officerMetadata.title, "Fixture Officer | Snap Mortgage Profile");
  assert.equal(branchMetadata.title, "Fixture Branch | Snap Mortgage Profile");
  assert.match(officerMetadata.description, /Fixture Officer/);
  assert.match(branchMetadata.description, /Fixture Branch/);
  assert.doesNotMatch(combined, /NMLS-000101|licensed in|Texas|Colorado|Jumbo|available today|123 Invented|service area|coverage|open daily/i);
  assert.doesNotMatch(officerMetadata.title.replace(officer.name, ""), /loan officer|branch/i);
  assert.doesNotMatch(branchMetadata.title.replace(branch.name, ""), /loan officer|branch/i);
});

test("calculator and directory metadata humanizes public labels without promising hidden profile data", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const calculator = seed.calculators.find(({ id }) => id === "calc-refinance");
  const calculatorMetadata = resolveDocumentMetadata(
    { type: "calculator", item: calculator },
    { ...options, path: calculator.route },
  );
  const officerDirectory = seed.directoryPages.find(({ route }) => route === "/loan-officers");
  const branchDirectory = seed.directoryPages.find(({ route }) => route === "/branches");
  const directoryMetadata = [officerDirectory, branchDirectory].map((item) => resolveDocumentMetadata(
    { type: "directory", item },
    { ...options, path: item.route },
  ));

  assert.match(calculatorMetadata.description, /current loan, new rate, term, closing costs, and breakeven/);
  assert.doesNotMatch(calculatorMetadata.description, /currentLoan|newRate|closingCosts/);
  for (const metadata of directoryMetadata) {
    assert.doesNotMatch(metadata.description, /licensed state|languages?|specialt(?:y|ies)|availability|service area|coverage/i);
  }
});

test("directory descriptions are route-specific and unknown public routes fail closed", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const descriptions = seed.directoryPages.map((item) => resolveDocumentMetadata(
    { type: item.route === "/locations" ? "locations" : "directory", item },
    { ...options, path: item.route },
  ).description);

  assert.equal(new Set(descriptions).size, seed.directoryPages.length);
  for (const description of descriptions) {
    assert.ok(description.length >= 60, `directory description is not useful: ${description}`);
    assert.doesNotMatch(description, /Explore Snap Mortgage guidance and related borrower resources/i);
    assert.doesNotMatch(description, /\broutes?\b/i);
  }

  assert.throws(
    () => resolveDocumentMetadata(
      { type: "directory", item: { name: "Unspecified directory", route: "/unspecified" } },
      { ...options, path: "/unspecified" },
    ),
    /useful metadata description.*\/unspecified/i,
  );
});

test("metadata resolution fails when a public route has no useful canonical description", async () => {
  const { resolveDocumentMetadata } = await metadataModule();

  assert.throws(
    () => resolveDocumentMetadata(
      { type: "blog", item: { name: "Missing copy", route: "/learning-center/missing-copy" } },
      { ...options, path: "/learning-center/missing-copy" },
    ),
    /useful metadata description.*\/learning-center\/missing-copy/i,
  );
});

test("browser metadata application uses the resolved static metadata object", async () => {
  const { applyDocumentMetadata, resolveDocumentMetadata } = await metadataModule();
  const article = articles[0];
  const metadata = resolveDocumentMetadata({ type: "article", item: article }, { ...options, path: article.route });
  const selectors = [
    'meta[name="description"]',
    'link[rel="canonical"]',
    'meta[property="og:type"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:url"]',
    'meta[property="og:image"]',
    'meta[name="twitter:card"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
    "[data-document-jsonld]",
  ];
  const createNode = () => ({
    attributes: {},
    textContent: "",
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const nodes = new Map(selectors.map((selector) => [selector, createNode()]));
  const documentLike = {
    title: "",
    head: {
      appendChild(node) { nodes.set(`meta[name="${node.attributes.name}"]`, node); },
    },
    createElement() { return createNode(); },
    querySelector(selector) { return nodes.get(selector) || null; },
  };

  applyDocumentMetadata(documentLike, metadata);

  assert.equal(documentLike.title, metadata.title);
  assert.equal(nodes.get('meta[name="description"]').attributes.content, metadata.description);
  assert.equal(nodes.get('meta[name="robots"]').attributes.content, metadata.robots);
  assert.equal(nodes.get('link[rel="canonical"]').attributes.href, metadata.canonical);
  assert.equal(nodes.get('meta[property="og:type"]').attributes.content, "article");
  assert.equal(nodes.get('meta[name="twitter:title"]').attributes.content, metadata.title);
  assert.deepEqual(JSON.parse(nodes.get("[data-document-jsonld]").textContent), metadata.jsonLd);
});

test("browser route rendering delegates metadata resolution to the shared module", () => {
  const appSource = fs.readFileSync(path.join(siteDir, "app.js"), "utf8");

  assert.match(appSource, /from "\/site\/document-metadata\.mjs"/);
  assert.match(appSource, /resolveDocumentMetadata\(found,\s*\{/);
  assert.match(appSource, /applyDocumentMetadata\(document, metadata\)/);
});

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

  const productMetadata = resolveDocumentMetadata({ type: "product", item: product }, { ...options, path: product.route });
  assert.equal(productMetadata.description, productContentById(productCopyBundle, product.id).metaDescription);
  assert.equal(productMetadata.canonical, "https://mortgage.example/loan-options/fha-loans");
});

test("editorial article metadata resolves Article JSON-LD and contributor attribution", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const article = articles.find((item) => item.route === "/learning-center/austin-mortgage-market-update");
  const metadata = resolveDocumentMetadata({ type: "article", item: article }, { ...options, path: article.route });

  assert.equal(metadata.openGraph.type, "article");
  assert.equal(metadata.description, article.metaDescription);
  assert.equal(metadata.jsonLd["@type"], "Article");
  assert.equal(metadata.jsonLd.headline, article.title);
  assert.equal(metadata.jsonLd.mainEntityOfPage, metadata.canonical);
  assert.equal(metadata.jsonLd.author["@type"], "Person");
  assert.equal(metadata.jsonLd.author.name, contributorsById[article.authorId].name);
  assert.equal(metadata.jsonLd.author.url, `https://mortgage.example${contributorsById[article.authorId].route}`);
  assert.deepEqual(metadata.jsonLd.publisher, { "@type": "Organization", name: "Snap Mortgage" });
});

test("prequalification metadata remains generic and excludes provider or query state", async () => {
  const { resolveDocumentMetadata } = await metadataModule();
  const metadata = resolveDocumentMetadata(
    { type: "prequalHandoff", item: { route: "/prequal/start" } },
    { ...options, path: "/prequal/start" },
  );

  assert.equal(metadata.canonical, "https://mortgage.example/prequal/start");
  assert.match(metadata.title, /Prequalification/);
  assert.doesNotMatch(`${metadata.title} ${metadata.description}`, /provider|query|saved rate|handoff/i);
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
  const nodes = new Map(selectors.map((selector) => [selector, {
    attributes: {},
    textContent: "",
    setAttribute(name, value) { this.attributes[name] = value; },
  }]));
  const documentLike = {
    title: "",
    querySelector(selector) { return nodes.get(selector) || null; },
  };

  applyDocumentMetadata(documentLike, metadata);

  assert.equal(documentLike.title, metadata.title);
  assert.equal(nodes.get('meta[name="description"]').attributes.content, metadata.description);
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

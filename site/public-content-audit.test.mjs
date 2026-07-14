import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDocumentMetadata } from "./document-metadata.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const seed = readJson("mock-data/production-seed.json");
const newsIndex = readJson("mock-data/location-news-index.json");
const editorialContent = readJson("mock-data/editorial-content.json");
const contributors = readJson("mock-data/editorial/contributors.json").contributors;
const ratesFixture = readJson("mock-data/rates-marketplace-fixtures.json");
const appSource = read("site/app.js");
const indexSource = read("site/index.html");
const metadataSource = read("site/document-metadata.mjs");
const sitemapSource = read("site/sitemap.xml");

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
  seed.directoryPages,
  newsIndex.articles,
  contributors,
];

function normalizeRoute(value) {
  const pathOnly = String(value || "/").split(/[?#]/, 1)[0] || "/";
  return pathOnly.length > 1 && pathOnly.endsWith("/") ? pathOnly.slice(0, -1) : pathOnly;
}

function isAssetPath(route) {
  return /^\/(?:site|mock-data|assets)(?:\/|$)/.test(route);
}

const canonicalRoutes = new Set(["/", "/locations", "/prequal/start"]);
for (const collection of routeCollections) {
  for (const item of collection || []) {
    if (item?.route) canonicalRoutes.add(normalizeRoute(item.route));
  }
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function compact(value, limit = 160) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized;
}

function assertNoFindings(message, findings) {
  assert.equal(findings.length, 0, `${message}\n${findings.map((finding) => `- ${finding}`).join("\n")}`);
}

function routeReference(value, evidence) {
  if (typeof value !== "string" || !value) return null;
  if (value === "#") return { route: "#", evidence };
  if (value.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/i.test(value)) return null;
  if (!value.startsWith("/")) return null;
  const route = normalizeRoute(value);
  if (isAssetPath(route)) return null;
  return { route, evidence };
}

function collectSourceRouteReferences(relativePath) {
  const source = read(relativePath);
  const patterns = [
    /\broute(?:WithAnchor)?\(\s*["'`]([^"'`]+)["'`]/g,
    /\b(?:href|next)\s*:\s*["'`]([^"'`]+)["'`]/g,
    /\bhref=["']([^"']+)["']/g,
  ];
  const references = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = routeReference(match[1], `${relativePath}:${lineNumber(source, match.index)}`);
      if (reference) references.push(reference);
    }
  }
  return references;
}

function collectDataRouteReferences(value, file, pathParts = [], references = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDataRouteReferences(item, file, [...pathParts, index], references));
    return references;
  }
  if (!value || typeof value !== "object") return references;

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    const routeBearingKey = ["href", "next", "profileRoute", "returnUrl"].includes(key) ||
      ["relatedRoutes", "steps"].includes(key) ||
      (key === "route" && pathParts.includes("ctaBreaks"));
    if (routeBearingKey) {
      for (const candidate of Array.isArray(child) ? child : [child]) {
        const reference = routeReference(candidate, `${file} (${childPath.join(".")})`);
        if (reference) references.push(reference);
      }
    }
    if (child && typeof child === "object") collectDataRouteReferences(child, file, childPath, references);
  }
  return references;
}

function mergeArticleOverlays() {
  const overlays = new Map((editorialContent.articles || []).map((article) => [article.id, article]));
  return (seed.articles || []).map((article) => ({ ...article, ...(overlays.get(article.id) || {}) }));
}

function metadataRecords() {
  const records = [];
  const statesById = Object.fromEntries(seed.states.map((state) => [state.id, state]));
  const contributorsById = Object.fromEntries(contributors.map((contributor) => [contributor.id, contributor]));
  const resolveRecord = (type, item) => {
    const metadata = resolveDocumentMetadata({ type, item }, {
      path: item.route,
      siteOrigin: "https://mortgage.example",
      statesById,
      contributorsById,
    });
    return { route: item.route, title: metadata.title, description: metadata.description };
  };
  const rates = seed.ratesPages.find((page) => page.route === "/rates");
  records.push(resolveRecord("rates", rates));

  for (const hub of seed.blogPages.filter((page) => page.route !== "/learning-center")) {
    records.push(resolveRecord("blog", hub));
  }
  for (const contributor of contributors) {
    records.push(resolveRecord("contributor", contributor));
  }
  for (const article of mergeArticleOverlays()) {
    records.push(resolveRecord("article", article));
  }
  return records;
}

test("public internal hrefs resolve through the canonical static route inventory", () => {
  const sourceFiles = [
    "site/app.js",
    "site/index.html",
    "site/rates-marketplace-ui.mjs",
    "site/prequal-handoff.mjs",
    "site/editorial-content.mjs",
    "site/editorial-renderer.mjs",
    "site/news-renderer.mjs",
    "site/locations-hero.mjs",
    "site/us-state-map.mjs",
  ].filter((relativePath) => fs.existsSync(path.join(repoRoot, relativePath)));
  const references = sourceFiles.flatMap(collectSourceRouteReferences);
  references.push(...collectDataRouteReferences(seed, "mock-data/production-seed.json"));
  references.push(...collectDataRouteReferences(editorialContent, "mock-data/editorial-content.json"));
  references.push(...collectDataRouteReferences(ratesFixture, "mock-data/rates-marketplace-fixtures.json"));

  const findings = references
    .filter(({ route }) => route === "#" || !canonicalRoutes.has(route))
    .map(({ route, evidence }) => `${evidence} references ${route}`);
  assertNoFindings("Unresolved borrower-facing internal hrefs remain:", [...new Set(findings)]);
});

test("critical acquisition and editorial routes have unique production metadata", () => {
  const records = metadataRecords();
  const findings = [];
  const titleOwners = new Map();
  const descriptionOwners = new Map();

  assert.equal(records.length, 40, "metadata audit must cover rates, 9 hubs, 6 contributors, and 24 articles");
  for (const record of records) {
    if (!record.title.trim()) findings.push(`${record.route} is missing a title`);
    if (!record.description.trim()) {
      findings.push(`${record.route} is missing an explicit borrower-facing meta description${record.fallbackDescription ? `; current fallback is "${compact(record.fallbackDescription)}"` : ""}`);
      continue;
    }
    if (record.description.trim().length < 70) findings.push(`${record.route} meta description is under 70 characters`);
    if (/\b(?:hub|index|workflow|review status|content graph)\b/i.test(record.description)) {
      findings.push(`${record.route} meta description uses internal content-architecture language: "${compact(record.description)}"`);
    }

    const normalizedTitle = record.title.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedDescription = record.description.replace(/\s+/g, " ").trim().toLowerCase();
    if (titleOwners.has(normalizedTitle)) findings.push(`${record.route} duplicates the title used by ${titleOwners.get(normalizedTitle)}`);
    else titleOwners.set(normalizedTitle, record.route);
    if (descriptionOwners.has(normalizedDescription)) findings.push(`${record.route} duplicates the description used by ${descriptionOwners.get(normalizedDescription)}`);
    else descriptionOwners.set(normalizedDescription, record.route);
  }

  assertNoFindings("Critical-route metadata is incomplete or duplicated:", findings);
});

test("the metadata shell updates title, description, canonical, Open Graph, and article JSON-LD", () => {
  assert.match(indexSource, /<meta\s+name="description"/);
  assert.match(indexSource, /<link\s+rel="canonical"/);
  assert.match(indexSource, /<meta\s+property="og:title"/);
  assert.match(indexSource, /<meta\s+property="og:description"/);
  assert.match(indexSource, /<meta\s+property="og:url"/);
  assert.match(indexSource, /data-document-jsonld/);
  assert.match(appSource, /from "\/site\/document-metadata\.mjs"/);
  assert.match(appSource, /resolveDocumentMetadata\(found,\s*\{/);
  assert.match(appSource, /applyDocumentMetadata\(document, metadata\)/);
  assert.match(metadataSource, /documentLike\.title\s*=\s*metadata\.title/);
  assert.match(metadataSource, /meta\[name=\\?"twitter:title/);
  assert.match(metadataSource, /"@type":\s*"Article"/);
});

test("sitemap entries and canonical route ownership match in both directions", () => {
  const sitemapRoutes = new Set(
    [...sitemapSource.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => normalizeRoute(new URL(match[1]).pathname)),
  );
  const missing = [...canonicalRoutes].filter((route) => !sitemapRoutes.has(route)).sort();
  const unknown = [...sitemapRoutes].filter((route) => !canonicalRoutes.has(route)).sort();
  const findings = [
    ...missing.map((route) => `site/sitemap.xml is missing ${route}`),
    ...unknown.map((route) => `site/sitemap.xml contains unowned route ${route}`),
  ];
  assertNoFindings("Sitemap and canonical route inventory differ:", findings);
});

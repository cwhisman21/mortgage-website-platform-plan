import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPublicTagRegistry,
  validatePublicTagRegistry,
  validateSearchIndex,
  validateTagRegistry,
} from "../mock-data/build-tagged-content-search.mjs";
import { DEFAULT_SITE_ORIGIN, resolveDocumentMetadata } from "./document-metadata.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const seed = readJson("mock-data/production-seed.json");
const newsIndex = readJson("mock-data/location-news-index.json");
const editorialContent = readJson("mock-data/editorial-content.json");
const contributors = readJson("mock-data/editorial/contributors.json").contributors;
const ratesFixture = readJson("mock-data/rates-marketplace-fixtures.json");
const canonicalTagRegistry = readJson("mock-data/tag-registry.json");
const publicTagRegistry = readJson("mock-data/public-tag-registry.json");
const searchIndex = readJson("mock-data/search-index.json");
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

function sitemapRoute(value) {
  const url = new URL(value);
  if (url.origin !== DEFAULT_SITE_ORIGIN) throw new Error(`Sitemap URL has an unexpected origin: ${url.origin}`);
  if (url.username || url.password) throw new Error("Sitemap URL must not contain credentials");
  if (url.search) throw new Error(`Sitemap URL must not contain a query string: ${url.search}`);
  if (url.hash) throw new Error(`Sitemap URL must not contain a fragment: ${url.hash}`);
  return normalizeRoute(url.pathname);
}

function sitemapRouteSet(locValues) {
  const rawEntries = new Set();
  const routes = [];
  for (const value of locValues) {
    if (rawEntries.has(value)) throw new Error(`Sitemap contains a duplicate raw <loc> entry: ${value}`);
    rawEntries.add(value);
    routes.push(sitemapRoute(value));
  }
  if (new Set(routes).size !== routes.length) throw new Error("Sitemap contains duplicate canonical routes");
  return new Set(routes);
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
for (const tag of canonicalTagRegistry.tags || []) {
  if (tag?.canonicalRoute) canonicalRoutes.add(normalizeRoute(tag.canonicalRoute));
}

const generatedRoutesDir = path.join(repoRoot, "site", "generated", "routes");
const newsTargetByRoute = new Map(
  (newsIndex.articles || []).map((article) => [normalizeRoute(article.route), article.standalonePath]),
);

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

function summarizeFindings(findings, limit = 20) {
  const visible = findings.slice(0, limit).map((finding) => `- ${finding}`);
  if (findings.length > limit) visible.push(`- ...and ${findings.length - limit} more`);
  return visible.join("\n");
}

function generatedDocumentPath(route) {
  const normalized = normalizeRoute(route);
  if (normalized === "/") return path.join(siteDir, "index.html");
  const newsTarget = newsTargetByRoute.get(normalized);
  if (newsTarget) return path.join(repoRoot, ...newsTarget.split("/"));
  return path.join(generatedRoutesDir, ...normalized.slice(1).split("/"), "index.html");
}

function staticTagResultRoutes(html) {
  return [...html.matchAll(/\bdata-static-tag-result-route="([^"]+)"/g)]
    .map((match) => normalizeRoute(match[1]));
}

function staticTagRelatedRoutes(html) {
  return [...html.matchAll(/<a\b[^>]*\bdata-related-tag\b[^>]*href="([^"]+)"/g)]
    .map((match) => normalizeRoute(match[1]));
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

test("canonical tag artifacts satisfy their validators", () => {
  assert.doesNotThrow(() => validateTagRegistry(canonicalTagRegistry));
  assert.doesNotThrow(() => validatePublicTagRegistry(publicTagRegistry));
  assert.doesNotThrow(() => validateSearchIndex(searchIndex, canonicalTagRegistry));
});

test("every canonical assignment has one exact search-index record", () => {
  const recordsByRoute = new Map();
  for (const record of searchIndex.records) {
    assert.equal(recordsByRoute.has(record.route), false, `duplicate search record for ${record.route}`);
    recordsByRoute.set(record.route, record);
  }

  const assignmentRoutes = new Set();
  for (const assignment of canonicalTagRegistry.assignments) {
    assert.equal(assignmentRoutes.has(assignment.route), false, `duplicate assignment for ${assignment.route}`);
    assignmentRoutes.add(assignment.route);
    assert.equal(Array.isArray(assignment.additionalTagIds), true, `${assignment.route} must have a complete additional-tag assignment`);

    const record = recordsByRoute.get(assignment.route);
    assert.ok(record, `${assignment.route} must resolve to exactly one search record`);
    const completeTagIds = [...assignment.primaryTagIds, ...assignment.additionalTagIds];
    assert.equal(new Set(completeTagIds).size, completeTagIds.length, `${assignment.route} repeats a tag in its complete assignment`);
    assert.deepEqual(record.primaryTagIds, assignment.primaryTagIds, `${assignment.route} primary tags differ from its assignment`);
    assert.deepEqual(record.tagIds, completeTagIds, `${assignment.route} tagIds must preserve primary-then-additional assignment order`);
    for (const primaryTagId of record.primaryTagIds) {
      assert.ok(record.tagIds.includes(primaryTagId), `${assignment.route} primary tag ${primaryTagId} is absent from its complete assignment`);
    }
  }

  assert.equal(recordsByRoute.size, assignmentRoutes.size, "search records and canonical assignments must have identical route coverage");
  for (const route of recordsByRoute.keys()) {
    assert.ok(assignmentRoutes.has(route), `${route} has a search record without a canonical assignment`);
  }
});

test("assignment provenance and legitimate competing-page candidates have complete review coverage", () => {
  const requiredFields = [
    "route",
    "borrowerQuestion",
    "intent",
    "audience",
    "entity",
    "substantiveCoverage",
    "action",
    "relationship",
    "disposition",
    "rationale",
  ];
  const approvedRelationships = new Set(["DIRECT", "NEAR", "SUPPORTING"]);
  const approvedDispositions = new Set(["KEEP DISTINCT", "DIFFERENTIATE", "MERGE", "CANONICALIZE", "REDIRECT", "DO NOT CREATE"]);
  const assignedRoutesByTagId = new Map(canonicalTagRegistry.tags.map(({ id }) => [id, []]));
  for (const assignment of canonicalTagRegistry.assignments) {
    for (const tagId of [...assignment.primaryTagIds, ...assignment.additionalTagIds]) {
      assignedRoutesByTagId.get(tagId)?.push(assignment.route);
    }
  }
  const statesById = new Map(seed.states.map((state) => [state.id, state]));
  const locationRouteByTagId = new Map();
  for (const tag of canonicalTagRegistry.tags) {
    if (tag.type === "state") {
      const state = seed.states.find(({ name }) => name === tag.displayName);
      if (state) locationRouteByTagId.set(tag.id, state.route);
    }
    if (tag.type === "city") {
      const city = seed.cities.find((candidate) => {
        const state = statesById.get(candidate.stateId);
        return `${candidate.name}, ${state?.name || ""}` === tag.displayName;
      });
      if (city) locationRouteByTagId.set(tag.id, city.route);
    }
  }

  for (const tag of canonicalTagRegistry.tags) {
    const review = tag.competingPageReview;
    const assignedRoutes = [...(assignedRoutesByTagId.get(tag.id) || [])].sort((left, right) => left.localeCompare(right));
    const locationRoute = locationRouteByTagId.get(tag.id);
    const expectedReviewRoutes = [...new Set([...assignedRoutes, ...(locationRoute ? [locationRoute] : [])])]
      .sort((left, right) => left.localeCompare(right));
    const reviewRoutes = review.routes.map(({ route }) => route);

    assert.ok(approvedDispositions.has(review?.disposition), `${tag.id} has an unapproved overall review disposition`);
    assert.deepEqual(tag.sourceRoutes, assignedRoutes, `${tag.id} sourceRoutes must exactly preserve assignment provenance`);
    for (const route of expectedReviewRoutes) {
      assert.ok(reviewRoutes.includes(route), `${tag.id} review coverage is missing required candidate ${route}`);
    }
    assert.deepEqual(reviewRoutes, reviewRoutes.slice().sort((left, right) => left.localeCompare(right)), `${tag.id} review routes must remain stable`);
    assert.equal(new Set(reviewRoutes).size, review.routes.length, `${tag.id} has duplicate review routes`);
    if (locationRoute) {
      assert.ok(!tag.sourceRoutes.includes(locationRoute), `${tag.id} canonical location page is a competitor, not assignment provenance`);
      assert.ok(reviewRoutes.includes(locationRoute), `${tag.id} must review its canonical location page ${locationRoute}`);
    }
    for (const item of review.routes) {
      for (const field of requiredFields) {
        assert.equal(typeof item[field], "string", `${tag.id} review ${item.route || "<unknown>"} is missing ${field}`);
        assert.notEqual(item[field].trim(), "", `${tag.id} review ${item.route || "<unknown>"} has an empty ${field}`);
      }
      const semanticBounds = {
        borrowerQuestion: [24, 180, 5],
        intent: [18, 120, 3],
        audience: [20, 140, 3],
        entity: [3, 200, 1],
        substantiveCoverage: [12, 140, 2],
        action: [15, 160, 3],
        rationale: [60, 500, 10],
      };
      for (const [field, [minimum, maximum, minimumWords]] of Object.entries(semanticBounds)) {
        const value = item[field].trim();
        const wordCount = (value.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || []).length;
        assert.ok(
          value.length >= minimum && value.length <= maximum && wordCount >= minimumWords,
          `${tag.id} review ${item.route} needs meaningful ${field}`,
        );
      }
      assert.match(item.borrowerQuestion, /\b(?:borrower|financing|home|housing|loan|market|mortgage|payment|property)\b/i);
      assert.match(item.intent, /\b(?:compare|estimate|evaluate|learn|plan|research|understand)\b/i);
      assert.match(item.audience, /\bborrowers?\b/i);
      assert.match(item.substantiveCoverage, /\b(?:article|calculator|editorial|education|explanation|guide|loan|location|market|mortgage|report|update)\b/i);
      assert.match(item.action, /\b(?:browse|calculate|compare|estimate|explore|read|review|understand)\b/i);
      assert.ok(item.rationale.toLowerCase().includes(item.entity.toLowerCase()), `${tag.id} review ${item.route} rationale must identify its entity`);
      assert.ok(item.rationale.toLowerCase().includes(tag.displayName.toLowerCase()), `${tag.id} review ${item.route} rationale must identify its tag context`);
      assert.ok(approvedRelationships.has(item.relationship), `${tag.id} review ${item.route} has unapproved relationship ${item.relationship}`);
      assert.ok(approvedDispositions.has(item.disposition), `${tag.id} review ${item.route} has unapproved disposition ${item.disposition}`);
    }
  }
});

test("the public tag registry remains the exact audit-free projection", () => {
  assert.deepEqual(publicTagRegistry, buildPublicTagRegistry(canonicalTagRegistry));
  const auditOnlyFields = ["sourceRoutes", "competingPageReview", "createdAt"];
  for (const tag of publicTagRegistry.tags) {
    for (const field of auditOnlyFields) {
      assert.equal(Object.hasOwn(tag, field), false, `public tag ${tag.id} exposes audit-only field ${field}`);
    }
  }
});

test("accepted tag routes are generated and every static tag result link resolves", () => {
  const missingTagRoutes = [];
  const resultLinkFindings = [];
  let fhaCoverage;

  for (const tag of canonicalTagRegistry.tags) {
    const tagDocumentPath = generatedDocumentPath(tag.canonicalRoute);
    if (!fs.existsSync(tagDocumentPath)) {
      missingTagRoutes.push(tag.canonicalRoute);
      continue;
    }

    const resultRoutes = staticTagResultRoutes(fs.readFileSync(tagDocumentPath, "utf8"));
    const expectedRoutes = searchIndex.records
      .filter((record) => record.tagIds.includes(tag.id))
      .map((record) => normalizeRoute(record.route));
    const expectedSet = new Set(expectedRoutes);
    if (new Set(resultRoutes).size !== resultRoutes.length) {
      resultLinkFindings.push(`${tag.canonicalRoute} repeats a static result route`);
    }
    const missingResults = expectedRoutes.filter((route) => !resultRoutes.includes(route));
    const unexpectedResults = resultRoutes.filter((route) => !expectedSet.has(route));
    if (missingResults.length || unexpectedResults.length || resultRoutes.length !== expectedRoutes.length) {
      resultLinkFindings.push(
        `${tag.canonicalRoute} static result set differs: ${missingResults.length} missing, ${unexpectedResults.length} unexpected, ${resultRoutes.length}/${expectedRoutes.length} rendered`,
      );
    }
    if (tag.slug === "fha-loans") fhaCoverage = { actual: resultRoutes.length, expected: expectedRoutes.length };
    for (const resultRoute of resultRoutes) {
      if (!canonicalRoutes.has(resultRoute)) {
        resultLinkFindings.push(`${tag.canonicalRoute} links to unowned result ${resultRoute}`);
        continue;
      }
      if (!fs.existsSync(generatedDocumentPath(resultRoute))) {
        resultLinkFindings.push(`${tag.canonicalRoute} links to missing static result ${resultRoute}`);
      }
    }
  }

  assert.equal(
    missingTagRoutes.length,
    0,
    `Accepted tag routes are missing generated documents (${missingTagRoutes.length}):\n${summarizeFindings(missingTagRoutes)}`,
  );
  assert.ok(fhaCoverage?.expected > 20, "FHA must exercise complete static overflow coverage");
  assert.equal(fhaCoverage?.actual, fhaCoverage?.expected, `FHA must expose all ${fhaCoverage?.expected} canonical assignments before JavaScript`);
  assertNoFindings("Static tag result links do not resolve:", resultLinkFindings);
});

test("static tag related navigation mirrors bounded semantic relations", () => {
  const tagById = new Map(canonicalTagRegistry.tags.map((tag) => [tag.id, tag]));
  const findings = [];

  for (const tag of canonicalTagRegistry.tags) {
    const tagDocumentPath = generatedDocumentPath(tag.canonicalRoute);
    if (!fs.existsSync(tagDocumentPath)) continue;
    const actualRoutes = staticTagRelatedRoutes(fs.readFileSync(tagDocumentPath, "utf8"));
    const expectedRoutes = tag.relatedTagIds.map((id) => tagById.get(id)?.canonicalRoute).filter(Boolean);
    if (actualRoutes.length > 12) findings.push(`${tag.id} renders ${actualRoutes.length} related-tag links`);
    if (actualRoutes.length !== expectedRoutes.length || actualRoutes.some((route, index) => route !== expectedRoutes[index])) {
      findings.push(`${tag.id} static relations do not mirror its canonical relation order`);
    }
    if (["loan-program", "mortgage-topic"].includes(tag.type) && tag.sourceRoutes.length >= 100) {
      const locationCount = tag.relatedTagIds.filter((id) => ["city", "state"].includes(tagById.get(id)?.type)).length;
      if (locationCount) findings.push(`${tag.id} exposes ${locationCount} location tags as broad related navigation`);
    }
  }

  assertNoFindings("Static related-tag navigation is unbounded or semantically noisy:", findings);
});

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
  const sitemapRoutes = sitemapRouteSet(
    [...sitemapSource.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
  );
  const missing = [...canonicalRoutes].filter((route) => !sitemapRoutes.has(route)).sort();
  const unknown = [...sitemapRoutes].filter((route) => !canonicalRoutes.has(route)).sort();
  const findings = [
    ...missing.map((route) => `site/sitemap.xml is missing ${route}`),
    ...unknown.map((route) => `site/sitemap.xml contains unowned route ${route}`),
  ];
  assert.equal(
    findings.length,
    0,
    `Sitemap and canonical route inventory differ (${findings.length}):\n${summarizeFindings(findings)}`,
  );
});

test("sitemap URL validation rejects noncanonical origins, queries, and fragments before normalization", () => {
  assert.equal(sitemapRoute(`${DEFAULT_SITE_ORIGIN}/locations/texas`), "/locations/texas");
  assert.throws(() => sitemapRoute("https://example.com/locations/texas"), /origin/i);
  assert.throws(() => sitemapRoute(`${DEFAULT_SITE_ORIGIN}/locations/texas?campaign=test`), /query/i);
  assert.throws(() => sitemapRoute(`${DEFAULT_SITE_ORIGIN}/locations/texas#market-data`), /fragment/i);
});

test("sitemap validation rejects duplicate raw loc entries before set conversion", () => {
  const duplicate = `${DEFAULT_SITE_ORIGIN}/locations/texas`;
  assert.throws(() => sitemapRouteSet([duplicate, duplicate]), /duplicate raw <loc>/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateCorpus } from "../location-news/lib/validate.mjs";
import { normalizeTagRegistry, tagsForRoute } from "../../site/tag-registry.mjs";

const execFile = promisify(execFileCallback);
const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const seed = readJson(new URL("../production-seed.json", import.meta.url));
const index = readJson(new URL("../location-news-index.json", import.meta.url));
const sourceManifest = readJson(new URL("../location-news-source-manifest.json", import.meta.url));
const mediaManifest = readJson(new URL("../location-news-media-manifest.json", import.meta.url));
const contributorDocument = readJson(new URL("../editorial/contributors.json", import.meta.url));
const tagRegistry = normalizeTagRegistry(readJson(new URL("../tag-registry.json", import.meta.url)));
const contributorsById = new Map(contributorDocument.contributors.map((contributor) => [contributor.id, contributor]));
const referencedContentPaths = [...new Set(index.articles.map((article) => article.contentPath))];
const seedRouteCollections = [
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
];
const canonicalSeedRoutes = new Set([
  "/",
  "/locations",
  "/prequal/start",
  ...seedRouteCollections.flatMap((collection) => collection.map((item) => item.route).filter(Boolean)),
]);
const locationsById = new Map([...seed.states, ...seed.cities].map((location) => [location.id, location]));
let corpusCache;

const loadCorpus = () => {
  if (!corpusCache) {
    corpusCache = referencedContentPaths.flatMap((contentPath) => (
      readJson(new URL(`../${contentPath.replace(/^mock-data\//, "")}`, import.meta.url)).articles
    ));
  }
  return corpusCache;
};

const writeJson = async (filePath, value) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function normalizedArticleShingles(article, size = 5) {
  const location = locationsById.get(article.locationId);
  let text = article.sections.flatMap((section) => [section.heading, ...(section.body || [])]).join(" ").toLowerCase();
  const replaceable = [location?.name, location?.abbr, ...article.evidenceFacts.map((fact) => fact.display)]
    .filter(Boolean)
    .map(String)
    .sort((left, right) => right.length - left.length);
  for (const value of replaceable) text = text.replace(new RegExp(escapeRegex(value.toLowerCase()), "g"), " value ");
  const words = text
    .replace(/\$?-?\d[\d,.]*(?:%|\b)/g, " value ")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index <= words.length - size; index += 1) shingles.add(words.slice(index, index + size).join(" "));
  return shingles;
}

function jaccard(left, right) {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

test("covers every location with four unique articles", () => {
  const locations = [...seed.states, ...seed.cities];
  const expectedArticleCount = locations.length * 4;
  assert.equal(index.articles.length, expectedArticleCount);
  assert.equal(sourceManifest.counts.locations, locations.length);
  assert.equal(sourceManifest.counts.articles, expectedArticleCount);
  assert.ok(sourceManifest.batches.length >= Math.ceil(locations.length / 20));
  assert.deepEqual(
    sourceManifest.batches.map((batch) => batch.batch),
    Array.from({ length: sourceManifest.batches.length }, (_, index) => index + 1),
  );
  for (const location of locations) {
    assert.equal(location.newsArticleIds.length, 4, `${location.id} article count`);
    assert.equal(new Set(location.newsArticleIds).size, 4, `${location.id} duplicate article id`);
  }
});

test("keeps the index compact and points to one bundle per location", () => {
  const locations = [...seed.states, ...seed.cities];
  const contentPaths = new Set();
  for (const article of index.articles) {
    assert.ok(article.contentPath, article.id);
    assert.equal(article.sections, undefined, `${article.id} leaked full body into index`);
    contentPaths.add(article.contentPath);
  }
  assert.equal(contentPaths.size, locations.length);
  assert.equal(contentPaths.size, 788, "the attribution backfill must target only the 788 referenced bundles");
  for (const contentPath of contentPaths) {
    assert.ok(fs.existsSync(new URL(`../${contentPath.replace(/^mock-data\//, "")}`, import.meta.url)), contentPath);
  }

  const bundleRoot = fileURLToPath(new URL("../location-news/", import.meta.url));
  const actualBundlePaths = fs.readdirSync(bundleRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "lib")
    .flatMap((entry) => fs.readdirSync(path.join(bundleRoot, entry.name))
      .filter((name) => name.endsWith(".json"))
      .map((name) => `mock-data/location-news/${entry.name}/${name}`));
  assert.deepEqual(new Set(actualBundlePaths), contentPaths, "generated bundle directory contains stale or missing location bundles");
});

test("uses the correct ACS source page for every 2019 summary-file acquisition", () => {
  const sources2019 = sourceManifest.sourceDatasets.filter((source) => /^ACS 2019 5-year\b/.test(source.dataset));
  assert.equal(sources2019.length, 9, "2019 ACS source acquisition count");
  for (const source of sources2019) {
    assert.equal(
      source.sourcePage,
      "https://www.census.gov/programs-surveys/acs/data/summary-file.2019.html",
      source.dataset,
    );
  }
});

test("all bundles pass the evidence and anti-filler contract", () => {
  const corpus = loadCorpus();
  const result = validateCorpus(corpus, { expectedLocationIds: [...seed.states, ...seed.cities].map((location) => location.id) });
  assert.deepEqual(
    { articles: result.articles, locations: result.locations },
    { articles: index.articles.length, locations: seed.states.length + seed.cities.length },
  );

  const mediaIds = new Set(mediaManifest.assets.map((asset) => asset.id));
  const cities = new Map(seed.cities.map((city) => [city.id, city]));
  const countyLimitFipsByCityId = new Map(
    sourceManifest.exceptions.map((exception) => [exception.cityId, exception.limitCountyFips]),
  );
  for (const article of corpus) {
    assert.ok(mediaIds.has(article.imageId), `${article.id} media`);
    const city = cities.get(article.locationId);
    if (!city) continue;
    for (const source of article.sourceRecords.filter((record) => record.geographyType === "county")) {
      assert.equal(source.geographyId, countyLimitFipsByCityId.get(city.id) || city.sourceGeography.countyFips, `${article.id} county source geography`);
    }
  }
});

test("requires one valid, matching contributor authorId on compact and full records", () => {
  const fullArticlesById = new Map(loadCorpus().map((article) => [article.id, article]));

  for (const compactArticle of index.articles) {
    assert.ok(contributorsById.has(compactArticle.authorId), `${compactArticle.id} compact authorId`);
    const fullArticle = fullArticlesById.get(compactArticle.id);
    assert.ok(fullArticle, `${compactArticle.id} full article`);
    assert.ok(contributorsById.has(fullArticle.authorId), `${compactArticle.id} full authorId`);
    assert.equal(fullArticle.authorId, compactArticle.authorId, `${compactArticle.id} author mismatch`);
  }
});

test("carries governing evidence periods on compact and full records", () => {
  const fullArticlesById = new Map(loadCorpus().map((article) => [article.id, article]));

  for (const compactArticle of index.articles) {
    const fullArticle = fullArticlesById.get(compactArticle.id);
    assert.ok(compactArticle.asOf, `${compactArticle.id} compact asOf`);
    assert.ok(compactArticle.sourcePeriod, `${compactArticle.id} compact sourcePeriod`);
    assert.equal(fullArticle.asOf, compactArticle.asOf, `${compactArticle.id} asOf mismatch`);
    assert.equal(fullArticle.sourcePeriod, compactArticle.sourcePeriod, `${compactArticle.id} sourcePeriod mismatch`);
    assert.ok(fullArticle.sourceRecords.some((record) => record.period === fullArticle.sourcePeriod), `${compactArticle.id} unbound governing period`);
    assert.equal(fullArticle.keyTakeaways[0], `As of: ${fullArticle.asOf}. Source period: ${fullArticle.sourcePeriod}.`, `${compactArticle.id} invisible evidence period`);
  }
});

test("uses correct location articles and limits repeated figures in answer-first leads", () => {
  const leadTypes = new Set(["local_labor_market", "state_labor_market", "state_home_price_movement"]);

  for (const article of loadCorpus()) {
    const locationName = locationsById.get(article.locationId)?.name;
    assert.ok(locationName, `${article.id} location`);
    const visibleCopy = [
      article.dek,
      article.previewText,
      ...(article.keyTakeaways || []),
      ...article.sections.flatMap((section) => section.body || []),
    ].filter(Boolean).join(" ");
    const escapedName = locationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithVowelSound = /^[aeio]/i.test(locationName) || /^u(?:pland|rb)/i.test(locationName) || /^ypsilanti\b/i.test(locationName);
    const startsWithYouSound = /^(?:eu|union|university|utah|utica|uvalde)\b/i.test(locationName);
    const wrongArticle = startsWithVowelSound && !startsWithYouSound ? "a" : "an";
    assert.doesNotMatch(visibleCopy, new RegExp(`\\b${wrongArticle} ${escapedName}\\b`, "i"), `${article.id} location article`);

    if (!leadTypes.has(article.articleType)) continue;
    for (const section of article.sections.slice(0, 2)) {
      const paragraph = (section.body || []).join(" ");
      for (const display of new Set(article.evidenceFacts.map((fact) => String(fact.display)).filter(Boolean))) {
        const uses = paragraph.split(display).length - 1;
        assert.ok(uses <= 2, `${article.id} ${section.id} repeats ${display} ${uses} times`);
      }
    }
  }

  const alabamaHpi = loadCorpus().find((article) => article.id === "news-al-state-home-price-movement");
  assert.match(alabamaHpi.sections.flatMap((section) => section.body).join(" "), /\bAn Alabama search plan\b/);
});

test("keeps borrower-visible corpus copy production-safe and locally evidence-specific", () => {
  const corpus = loadCorpus();
  const fullArticlesById = new Map(corpus.map((article) => [article.id, article]));
  const descriptions = new Set();
  const repeatedSentences = new Map();
  const forbiddenPublicCopy = /created by this generator|source identifiers|structured source records|compare verified loan options|\b(?:todo|tbd|placeholder|scaffold)\b/i;
  const rawPublicValue = /\bnews-[a-z0-9-]+-source-[a-z0-9-]+\b|\b[A-Z]\d{5}_\d{3}[EM]\b|^https?:\/\//i;

  for (const compact of index.articles) {
    assert.ok(compact.metaDescription.length >= 50 && compact.metaDescription.length <= 160, `${compact.id} description length`);
    assert.match(compact.metaDescription, /[.!?]$/, `${compact.id} description ends mid-word or without punctuation`);
    assert.ok(!descriptions.has(compact.metaDescription), `${compact.id} duplicate meta description`);
    descriptions.add(compact.metaDescription);

    const article = fullArticlesById.get(compact.id);
    assert.ok(article, `${compact.id} full article`);
    const sources = new Map(article.sourceRecords.map((source) => [source.sourceId, source]));
    const locallyScopedFacts = article.evidenceFacts.filter((fact) => fact.sourceRecordIds.every((id) => {
      const geographyType = sources.get(id)?.geographyType;
      return article.locationType === "city"
        ? ["place", "city", "county"].includes(geographyType)
        : ["state", "state_counties"].includes(geographyType);
    }));
    assert.ok(locallyScopedFacts.length >= 4, `${article.id} lacks four locally scoped evidence facts`);

    const localContextFacts = new Set();
    for (const paragraph of compact.localContext || []) {
      const matches = locallyScopedFacts.filter((fact) => (
        paragraph.includes(fact.display)
        || (fact.value < 0 && paragraph.includes(String(fact.display).replace(/^-/, "")))
      ));
      assert.ok(matches.length, `${article.id} local context lacks a local evidence value`);
      for (const fact of matches) localContextFacts.add(fact.id);
    }
    assert.ok(localContextFacts.size >= 3, `${article.id} local context does not analyze enough distinct evidence`);

    const visibleValues = [
      article.title,
      article.dek,
      article.previewText,
      article.metaDescription,
      ...(article.keyTakeaways || []),
      ...article.sections.flatMap((section) => [section.heading, ...(section.body || [])]),
      ...article.tables.flatMap((table) => [table.title, ...table.columns, ...table.rows.flat()]),
      ...article.ctaPlacements.flatMap((cta) => [cta.label, cta.description]),
      article.methodology,
      article.limitations,
      ...article.sourceRecords.map((source) => source.citationLabel),
      ...article.relatedRoutes.map((item) => typeof item === "string" ? item : item.label),
    ].filter(Boolean).map(String);
    assert.ok(!visibleValues.some((value) => forbiddenPublicCopy.test(value)), `${article.id} exposes internal generator language`);
    assert.ok(!visibleValues.some((value) => rawPublicValue.test(value)), `${article.id} exposes a raw source ID or URL`);

    for (const source of article.sourceRecords) {
      assert.match(source.citationLabel, new RegExp(source.publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${article.id} visible source attribution`);
    }
    for (const related of article.relatedRoutes) {
      const route = typeof related === "string" ? related : related.route;
      const label = typeof related === "string" ? related : related.label;
      assert.ok(canonicalSeedRoutes.has(route), `${article.id} dead related route ${route}`);
      assert.ok(label && !label.startsWith("/") && !/^https?:\/\//.test(label), `${article.id} raw related label ${label}`);
    }
    for (const cta of article.ctaPlacements) assert.ok(canonicalSeedRoutes.has(cta.route), `${article.id} dead CTA route ${cta.route}`);

    const evidenceDisplays = [...new Set(article.evidenceFacts.map((fact) => String(fact.display)).filter(Boolean))];
    for (const paragraph of article.sections.flatMap((section) => section.body || [])) {
      if (evidenceDisplays.some((display) => paragraph.includes(display))) continue;
      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map((value) => value.replace(/\s+/g, " ").trim())
        .filter((value) => value.split(/\s+/).length >= 12);
      for (const sentence of sentences) repeatedSentences.set(sentence, (repeatedSentences.get(sentence) || 0) + 1);
    }
  }

  const overused = [...repeatedSentences].filter(([, count]) => count > 8).sort((a, b) => b[1] - a[1]);
  assert.deepEqual(overused.slice(0, 10), [], `repeated unanchored article scaffolding: ${JSON.stringify(overused.slice(0, 10))}`);
});

test("uses natural, complete, evidence-safe borrower language throughout the corpus", () => {
  const directionalSigned = /\b(?:fell|rose|increased|decreased|declined|grew|climbed|dropped)\s+-\d/i;
  const doubleState = /,\s*([A-Z]{2}),\s*\1's\b/;
  const danglingEnding = /\b(?:and|or|the|a|an|to|for|with|without|before|after|including|of|in|on|at|from|by|as)\.$/i;

  for (const article of loadCorpus()) {
    const body = article.sections.flatMap((section) => section.body || []).join(" ");
    const visible = [article.title, article.dek, article.previewText, article.metaDescription, ...article.keyTakeaways, body].join(" ");
    assert.equal(article.sections.length, 6, `${article.id} required content beats`);
    assert.equal(article.metaDescription, article.previewText, `${article.id} clipped meta description`);
    assert.match(article.metaDescription, /[.!?]$/, `${article.id} meta sentence ending`);
    const finalWord = article.metaDescription.match(/\b([A-Za-z]+)[.!?]$/)?.[1] || "";
    if (!/^[A-Z]{2}$/.test(finalWord)) {
      assert.doesNotMatch(article.metaDescription, danglingEnding, `${article.id} dangling meta thought`);
    }
    assert.doesNotMatch(visible, doubleState, `${article.id} double state construction`);
    assert.doesNotMatch(visible, directionalSigned, `${article.id} signed directional change`);

    const opening = article.sections[0].body.join(" ");
    assert.ok(article.evidenceFacts.some((fact) => (
      opening.includes(fact.display)
      || (fact.value < 0 && opening.includes(String(fact.display).replace(/^-/, "")))
    )), `${article.id} opening local finding`);
    const usefulnessIndex = opening.search(/\b(?:can|helps?|useful|informs?|frames?|shows?|organizes?|identifies?|supports?|guides?|may matter)\b/i);
    const limitationIndex = opening.search(/\b(?:cannot|does not|do not|not a|not the|should not|rather than|too broad)\b/i);
    assert.ok(usefulnessIndex >= 0, `${article.id} opening usefulness`);
    assert.ok(limitationIndex < 0 || usefulnessIndex < limitationIndex, `${article.id} caveat-dominated opening`);

    if (["local_labor_market", "state_labor_market"].includes(article.articleType)) {
      for (const id of ["monthly-rate-change", "annual-rate-change"]) {
        const delta = article.evidenceFacts.find((fact) => fact.id === id);
        assert.match(delta.display, /^-?\d+(?:\.\d+)? percentage points$/, `${article.id} ${id} units`);
      }
      assert.doesNotMatch(visible, /\b(?:favorable|unfavorable)\b/i, `${article.id} directional value judgment`);
    }

    if (["affordability_home_values", "state_housing_costs"].includes(article.articleType)) {
      assert.ok(!article.evidenceFacts.some((fact) => fact.id === "home-value-change"), `${article.id} precise ACS vintage change`);
      assert.match(body, /2019 ACS/i, `${article.id} 2019 nominal observation`);
      assert.match(body, /2024 ACS/i, `${article.id} 2024 nominal observation`);
      assert.match(body, /not inflation-adjusted/i, `${article.id} inflation comparability limitation`);
      assert.match(body, /methodolog/i, `${article.id} methodology comparability limitation`);
    }

    for (const fact of article.evidenceFacts) {
      const naturalDisplay = fact.value < 0 ? String(fact.display).replace(/^-/, "") : String(fact.display);
      assert.ok(body.includes(fact.display) || body.includes(naturalDisplay), `${article.id} drops local figure ${fact.id} from article analysis`);
    }
  }
});

test("materially limits same-type template similarity with deterministic structural variation", () => {
  const articlesByType = new Map();
  for (const article of loadCorpus()) {
    if (!articlesByType.has(article.articleType)) articlesByType.set(article.articleType, []);
    articlesByType.get(article.articleType).push(article);
  }

  for (const [articleType, articles] of articlesByType) {
    articles.sort((left, right) => left.id.localeCompare(right.id));
    const similarities = [];
    for (let index = 1; index < articles.length; index += 1) {
      similarities.push(jaccard(normalizedArticleShingles(articles[index - 1]), normalizedArticleShingles(articles[index])));
    }
    similarities.sort((left, right) => left - right);
    const mean = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
    const p95 = similarities[Math.min(similarities.length - 1, Math.floor(similarities.length * 0.95))];
    assert.ok(mean <= 0.78, `${articleType} mean five-word-shingle similarity ${mean.toFixed(3)} exceeds 0.780`);
    assert.ok(p95 <= 0.92, `${articleType} p95 five-word-shingle similarity ${p95.toFixed(3)} exceeds 0.920`);

    const signatures = new Map();
    for (const article of articles) {
      const signature = article.sections.map((section) => `${section.id}:${section.heading}`).join("|");
      signatures.set(signature, (signatures.get(signature) || 0) + 1);
    }
    const minimumSignatures = Math.min(24, articles.length);
    const largestShare = Math.max(...signatures.values()) / articles.length;
    assert.ok(signatures.size >= minimumSignatures, `${articleType} has only ${signatures.size} structural signatures`);
    assert.ok(largestShare <= 0.20, `${articleType} largest structural signature covers ${(largestShare * 100).toFixed(1)}%`);
  }
});

test("publishes a crawlable static document and sitemap entry for every article", () => {
  const standalonePaths = new Set(index.articles.map((article) => article.standalonePath));
  assert.equal(standalonePaths.size, index.articles.length);
  for (const standalonePath of standalonePaths) {
    assert.ok(fs.existsSync(new URL(`../../${standalonePath}`, import.meta.url)), standalonePath);
  }
  const sample = index.articles.find((article) => article.id === "news-austin-tx-affordability-home-values");
  const html = fs.readFileSync(new URL(`../../${sample.standalonePath}`, import.meta.url), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/mortgage-website-platform-plan-thinkwhale\.vercel\.app\/learning-center\/market-news\/austin-tx-affordability-home-values" \/>/);
  assert.match(html, /Austin, TX home values, income, and owner costs/);
  assert.match(html, /src="\/site\/assets\/news\/pexels-\d+\.jpeg"/);
  assert.doesNotMatch(html, /editorial_review_required/);
  assert.equal(sample.authorId, "contributor-maya-brooks");
  assert.match(html, /href="\/learning-center\/authors\/maya-brooks"/);
  assert.match(html, /src="\/site\/assets\/contributors\/maya-brooks\.jpg"/);
  assert.match(html, />Maya Brooks</);
  assert.match(html, /July 10, 2026/);
  assert.doesNotMatch(html, /July 9, 2026/);

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(jsonLdMatch, "sample article is missing JSON-LD");
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.equal(jsonLd.author?.["@type"], "Organization");
  assert.equal(jsonLd.author?.name, "Snap Mortgage Editorial");
  assert.doesNotMatch(JSON.stringify(jsonLd), /"@type":"Person"/);

  for (const asset of mediaManifest.assets) {
    const localAsset = new URL(`../../${asset.localPath.replace(/^\//, "")}`, import.meta.url);
    assert.ok(fs.existsSync(localAsset), asset.localPath);
    assert.ok(fs.statSync(localAsset).size > 50_000, `${asset.localPath} is unexpectedly small`);
  }

  const sitemap = fs.readFileSync(new URL("../../site/sitemap.xml", import.meta.url), "utf8");
  assert.match(sitemap, /<loc>https:\/\/mortgage-website-platform-plan-thinkwhale\.vercel\.app\/learning-center\/market-news\/austin-tx-affordability-home-values<\/loc>/);
  for (const contributor of contributorDocument.contributors) {
    const absoluteRoute = `https://mortgage-website-platform-plan-thinkwhale.vercel.app${contributor.route}`;
    assert.ok(sitemap.includes(`<loc>${absoluteRoute}</loc>`), `${contributor.name} sitemap route`);
  }
});

test("publishes every standalone article with the final canonical tag metadata and links", () => {
  for (const compact of index.articles) {
    const html = fs.readFileSync(new URL(`../../${compact.standalonePath}`, import.meta.url), "utf8");
    const context = tagsForRoute(tagRegistry, compact.route);
    const expectedTags = [...context.primaryTags, ...context.additionalTags];
    const expectedNames = expectedTags.map(({ displayName }) => displayName);
    const expectedPrimaryNames = context.primaryTags.map(({ displayName }) => displayName);
    const expectedRoutes = expectedTags.map(({ canonicalRoute }) => canonicalRoute);
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(jsonLdMatch, `${compact.id} is missing JSON-LD`);
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const visibleTagRoutes = [...html.matchAll(/<a class="content-tag-link" href="([^"]+)"/g)].map((match) => match[1]);

    assert.deepEqual(jsonLd.keywords || [], expectedNames, `${compact.id} has stale JSON-LD keywords`);
    assert.deepEqual(jsonLd.articleSection || [], expectedPrimaryNames, `${compact.id} has stale JSON-LD sections`);
    assert.deepEqual(visibleTagRoutes, expectedRoutes, `${compact.id} has stale visible tag links`);
  }
});

test("publishes tag sitemap dates from the final canonical registry", () => {
  const sitemap = fs.readFileSync(new URL("../../site/sitemap.xml", import.meta.url), "utf8");
  for (const tag of tagRegistry.tags) {
    const absoluteRoute = `https://mortgage-website-platform-plan-thinkwhale.vercel.app${tag.canonicalRoute}`;
    const expectedLastmod = tag.updatedAt || tag.reviewedAt;
    assert.ok(
      sitemap.includes(`<loc>${absoluteRoute}</loc><lastmod>${expectedLastmod}</lastmod>`),
      `${tag.id} sitemap date is stale`,
    );
  }
});

test("publishes borrower-facing static text without raw IDs, internal language, or dead links", () => {
  for (const compact of index.articles) {
    const html = fs.readFileSync(new URL(`../../${compact.standalonePath}`, import.meta.url), "utf8");
    assert.ok(!html.includes('href="/loan-options/conventional"'), `${compact.id} dead conventional link`);
    assert.ok(!html.includes('href="/loan-options/fha"'), `${compact.id} dead FHA link`);
    assert.doesNotMatch(html, /created by this generator|source identifiers|structured source records|Compare verified loan options/i, `${compact.id} internal language`);
    assert.doesNotMatch(html, />\s*(?:news-[a-z0-9-]+-source-[a-z0-9-]+|[A-Z]\d{5}_\d{3}[EM]|https?:\/\/[^<]+)\s*</i, `${compact.id} raw visible source value`);
    const escapedDescription = compact.metaDescription.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    assert.ok(html.includes(`content="${escapedDescription}"`), `${compact.id} static meta description mismatch`);
    assert.ok(html.includes(`As of: ${compact.asOf}. Source period: ${compact.sourcePeriod}.`), `${compact.id} static evidence period`);
  }
});

test("attribution-only CLI backfills referenced content without recomposition or unrelated rewrites", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "snap-location-news-attribution-"));
  const articleRoute = "/learning-center/market-news/austin-tx-affordability-home-values";
  const contentPath = "mock-data/location-news/texas/austin.json";
  const standalonePath = "site/generated/learning-center/market-news/austin-tx-affordability-home-values.html";
  const article = {
    id: "news-austin-tx-affordability-home-values",
    route: articleRoute,
    locationId: "city-austin-tx",
    locationType: "city",
    articleType: "affordability_home_values",
    title: "Austin, TX home values, income, and owner costs",
    dek: "A sourced Austin mortgage-planning update.",
    previewText: "Review the local evidence before comparing options.",
    metaDescription: "Austin housing evidence for mortgage planning.",
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-10",
    relevanceLabel: "Affordability evidence",
    topicIds: ["affordability", "home-values"],
    productIds: ["product-purchase"],
    sourceLabels: ["U.S. Census Bureau"],
    reviewStatus: "editorial_review_required",
    complianceStatus: "compliance_review_required",
    imageId: "news-home-values",
    sections: [{ heading: "What the evidence shows", body: ["This exact prose must remain unchanged by attribution."] }],
    sourceRecords: [],
    relatedRoutes: ["/locations/texas/austin"],
  };
  const compactArticle = Object.fromEntries(
    Object.entries({ ...article, contentPath, standalonePath }).filter(([key]) => !["sections", "sourceRecords", "relatedRoutes"].includes(key)),
  );
  const bundle = { locationId: "city-austin-tx", locationType: "city", generatedAt: "2026-07-10", articles: [article] };
  const compactIndex = {
    version: "location-news-index-v1",
    generatedAt: "2026-07-10",
    locationCount: 1,
    articleCount: 1,
    articles: [compactArticle],
  };
  const tagRegistry = {
    version: 1,
    updatedAt: "2026-07-14",
    tags: [{
      id: "tag-city-austin-texas",
      slug: "austin-texas",
      displayName: "Austin, Texas",
      canonicalRoute: "/learning-center/tags/austin-texas",
      reviewedAt: "2026-07-14",
      updatedAt: "2026-07-14",
      redirectSlugs: [],
    }, {
      id: "tag-market-topic-home-values",
      slug: "home-values",
      displayName: "Home Values",
      canonicalRoute: "/learning-center/tags/home-values",
      reviewedAt: "2026-07-14",
      updatedAt: "2026-07-14",
      redirectSlugs: [],
    }],
    assignments: [{
      route: articleRoute,
      primaryTagIds: ["tag-city-austin-texas"],
      additionalTagIds: ["tag-market-topic-home-values"],
    }],
  };
  const productionSeed = {
    siteEntryPages: [],
    states: [],
    cities: [{ id: "city-austin-tx", route: "/locations/texas/austin", unrelatedUserField: "preserve me" }],
    branches: [],
    loanOfficers: [],
    products: [],
    ratesPages: [],
    blogPages: [],
    articles: [],
    calculators: [],
    directoryPages: [],
    unrelatedUserField: { nested: true },
  };
  const sourceSentinel = { version: "source-sentinel", untouched: true };
  const mediaSentinel = {
    version: "media-sentinel",
    untouched: true,
    assets: [{ id: "news-home-values", localPath: "/site/assets/news/home-values.jpg", alt: "Austin home exterior" }],
  };
  const legacyBundle = { locationId: "state-legacy", articles: [{ title: "Do not rewrite this legacy bundle" }] };
  const files = {
    seed: path.join(root, "mock-data", "production-seed.json"),
    index: path.join(root, "mock-data", "location-news-index.json"),
    source: path.join(root, "mock-data", "location-news-source-manifest.json"),
    media: path.join(root, "mock-data", "location-news-media-manifest.json"),
    contributors: path.join(root, "mock-data", "editorial", "contributors.json"),
    tagRegistry: path.join(root, "mock-data", "tag-registry.json"),
    bundle: path.join(root, ...contentPath.split("/")),
    legacy: path.join(root, "mock-data", "location-news", "legacy", "state.json"),
    standalone: path.join(root, ...standalonePath.split("/")),
    sitemap: path.join(root, "site", "sitemap.xml"),
  };

  try {
    await Promise.all([
      writeJson(files.seed, productionSeed),
      writeJson(files.index, compactIndex),
      writeJson(files.source, sourceSentinel),
      writeJson(files.media, mediaSentinel),
      writeJson(files.contributors, contributorDocument),
      writeJson(files.tagRegistry, tagRegistry),
      writeJson(files.bundle, bundle),
      writeJson(files.legacy, legacyBundle),
    ]);
    await fs.promises.mkdir(path.dirname(files.standalone), { recursive: true });
    await fs.promises.writeFile(
      files.standalone,
      '<!doctype html><script type="application/ld+json">{"keywords":["Old Internal Tag"]}</script><a class="content-tag-link" href="/learning-center/tags/old-internal-tag">Old Internal Tag</a>\n',
      "utf8",
    );
    await fs.promises.mkdir(path.dirname(files.sitemap), { recursive: true });
    await fs.promises.writeFile(files.sitemap, `<?xml version="1.0"?><urlset><url><loc>https://example.test${articleRoute}</loc></url></urlset>\n`, "utf8");

    const immutableBefore = Object.fromEntries(
      await Promise.all(["seed", "source", "media", "tagRegistry", "legacy"].map(async (key) => [key, await fs.promises.readFile(files[key], "utf8")])),
    );
    const generatorPath = fileURLToPath(new URL("../generate-location-news.mjs", import.meta.url));
    const generatorSource = await fs.promises.readFile(generatorPath, "utf8");

    assert.match(
      generatorSource,
      /["']attribution-only["']/,
      "generator must recognize --attribution-only before this isolated CLI fixture may run",
    );
    await execFile(process.execPath, [generatorPath, "--attribution-only", "--repo-root", root], {
      cwd: root,
      timeout: 30_000,
      env: { ...process.env, NODE_ENV: "test" },
    });

    for (const [key, expected] of Object.entries(immutableBefore)) {
      assert.equal(await fs.promises.readFile(files[key], "utf8"), expected, `${key} was rewritten`);
    }

    const updatedBundle = JSON.parse(await fs.promises.readFile(files.bundle, "utf8"));
    const updatedIndex = JSON.parse(await fs.promises.readFile(files.index, "utf8"));
    assert.equal(updatedBundle.articles[0].authorId, "contributor-maya-brooks");
    assert.equal(updatedIndex.articles[0].authorId, "contributor-maya-brooks");

    const bundleWithoutAuthor = structuredClone(updatedBundle);
    const indexWithoutAuthor = structuredClone(updatedIndex);
    delete bundleWithoutAuthor.articles[0].authorId;
    delete indexWithoutAuthor.articles[0].authorId;
    assert.deepEqual(bundleWithoutAuthor, bundle, "article prose or bundle metadata was recomposed");
    assert.deepEqual(indexWithoutAuthor, compactIndex, "compact metadata changed beyond authorId");

    const staticHtml = await fs.promises.readFile(files.standalone, "utf8");
    assert.match(staticHtml, /href="\/learning-center\/authors\/maya-brooks"/);
    assert.match(staticHtml, /src="\/site\/assets\/contributors\/maya-brooks\.jpg"/);
    assert.match(staticHtml, /"author":\{"@type":"Organization","@id":"https:\/\/example\.test\/#snap-mortgage-editorial","name":"Snap Mortgage Editorial"/);
    assert.doesNotMatch(staticHtml, /"@type":"Person"/);
    assert.match(staticHtml, /July 10, 2026/);
    assert.match(staticHtml, /href="\/learning-center\/tags\/austin-texas"/);
    assert.match(staticHtml, /href="\/learning-center\/tags\/home-values"/);
    assert.match(staticHtml, /"keywords":\["Austin, Texas","Home Values"\]/);
    assert.match(staticHtml, /"articleSection":\["Austin, Texas"\]/);
    assert.doesNotMatch(staticHtml, /Old Internal Tag|old-internal-tag/);

    const sitemap = await fs.promises.readFile(files.sitemap, "utf8");
    for (const contributor of contributorDocument.contributors) {
      assert.ok(sitemap.includes(contributor.route), `${contributor.name} missing from attribution-only sitemap`);
    }
    assert.match(sitemap, /<loc>https:\/\/example\.test\/learning-center\/tags\/austin-texas<\/loc><lastmod>2026-07-14<\/lastmod>/);

    const firstRunOutputs = Object.fromEntries(
      await Promise.all(["bundle", "index", "standalone", "sitemap"].map(async (key) => [key, await fs.promises.readFile(files[key], "utf8")])),
    );
    await execFile(process.execPath, [generatorPath, "--attribution-only", "--repo-root", root], {
      cwd: root,
      timeout: 30_000,
      env: { ...process.env, NODE_ENV: "test" },
    });
    for (const [key, expected] of Object.entries(firstRunOutputs)) {
      assert.equal(await fs.promises.readFile(files[key], "utf8"), expected, `${key} changed on an idempotent second pass`);
    }
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateCorpus } from "../location-news/lib/validate.mjs";

const execFile = promisify(execFileCallback);
const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const seed = readJson(new URL("../production-seed.json", import.meta.url));
const index = readJson(new URL("../location-news-index.json", import.meta.url));
const sourceManifest = readJson(new URL("../location-news-source-manifest.json", import.meta.url));
const mediaManifest = readJson(new URL("../location-news-media-manifest.json", import.meta.url));
const contributorDocument = readJson(new URL("../editorial/contributors.json", import.meta.url));
const contributorsById = new Map(contributorDocument.contributors.map((contributor) => [contributor.id, contributor]));
const referencedContentPaths = [...new Set(index.articles.map((article) => article.contentPath))];
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
  assert.equal(jsonLd.author?.["@type"], "Person");
  assert.equal(jsonLd.author?.name, "Maya Brooks");
  assert.equal(
    jsonLd.author?.url,
    "https://mortgage-website-platform-plan-thinkwhale.vercel.app/learning-center/authors/maya-brooks",
  );

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
      writeJson(files.bundle, bundle),
      writeJson(files.legacy, legacyBundle),
    ]);
    await fs.promises.mkdir(path.dirname(files.standalone), { recursive: true });
    await fs.promises.writeFile(files.standalone, "<!doctype html><title>Old article</title>\n", "utf8");
    await fs.promises.mkdir(path.dirname(files.sitemap), { recursive: true });
    await fs.promises.writeFile(files.sitemap, `<?xml version="1.0"?><urlset><url><loc>https://example.test${articleRoute}</loc></url></urlset>\n`, "utf8");

    const immutableBefore = Object.fromEntries(
      await Promise.all(["seed", "source", "media", "legacy"].map(async (key) => [key, await fs.promises.readFile(files[key], "utf8")])),
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
    assert.match(staticHtml, /"@type":"Person"/);
    assert.match(staticHtml, /July 10, 2026/);

    const sitemap = await fs.promises.readFile(files.sitemap, "utf8");
    for (const contributor of contributorDocument.contributors) {
      assert.ok(sitemap.includes(contributor.route), `${contributor.name} missing from attribution-only sitemap`);
    }
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { validateCorpus } from "../location-news/lib/validate.mjs";

const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const seed = readJson(new URL("../production-seed.json", import.meta.url));
const index = readJson(new URL("../location-news-index.json", import.meta.url));
const sourceManifest = readJson(new URL("../location-news-source-manifest.json", import.meta.url));
const mediaManifest = readJson(new URL("../location-news-media-manifest.json", import.meta.url));

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
  for (const contentPath of contentPaths) {
    assert.ok(fs.existsSync(new URL(`../${contentPath.replace(/^mock-data\//, "")}`, import.meta.url)), contentPath);
  }
});

test("all bundles pass the evidence and anti-filler contract", () => {
  const contentPaths = [...new Set(index.articles.map((article) => article.contentPath))];
  const corpus = contentPaths.flatMap((contentPath) => readJson(new URL(`../${contentPath.replace(/^mock-data\//, "")}`, import.meta.url)).articles);
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

  for (const asset of mediaManifest.assets) {
    const localAsset = new URL(`../../${asset.localPath.replace(/^\//, "")}`, import.meta.url);
    assert.ok(fs.existsSync(localAsset), asset.localPath);
    assert.ok(fs.statSync(localAsset).size > 50_000, `${asset.localPath} is unexpectedly small`);
  }

  const sitemap = fs.readFileSync(new URL("../../site/sitemap.xml", import.meta.url), "utf8");
  assert.match(sitemap, /<loc>https:\/\/mortgage-website-platform-plan-thinkwhale\.vercel\.app\/learning-center\/market-news\/austin-tx-affordability-home-values<\/loc>/);
});

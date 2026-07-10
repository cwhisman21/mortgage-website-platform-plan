import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadBlsEvidence } from "./location-news/lib/bls.mjs";
import { loadCensusEvidence } from "./location-news/lib/census.mjs";
import { composeCityArticles, composeStateArticles } from "./location-news/lib/compose.mjs";
import { sha256File, slugify, writeJsonAtomic, writeTextAtomic } from "./location-news/lib/core.mjs";
import { loadLoanAndHpiEvidence } from "./location-news/lib/loan-limits.mjs";
import { createVerifiedMediaManifest, loadMediaLibrary, materializeMediaAssets } from "./location-news/lib/media.mjs";
import { validateArticle, validateCorpus } from "./location-news/lib/validate.mjs";
import { DEFAULT_SITE_ORIGIN, renderArticleDocument, renderRobots, renderSitemap } from "../site/location-news-static.mjs";

const mockDataDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(mockDataDir, "production-seed.json");
const indexPath = path.join(mockDataDir, "location-news-index.json");
const sourceManifestPath = path.join(mockDataDir, "location-news-source-manifest.json");
const mediaManifestPath = path.join(mockDataDir, "location-news-media-manifest.json");
const bundleRoot = path.join(mockDataDir, "location-news");
const repoRoot = path.resolve(mockDataDir, "..");

function parseArgs(argv) {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const next = argv[index + 1];
    values.set(token.slice(2), next && !next.startsWith("--") ? argv[++index] : true);
  }
  return {
    batchSize: Number(values.get("batch-size") || 20),
    sourceCache: path.resolve(String(values.get("source-cache") || path.join(mockDataDir, "source-cache"))),
    refreshSources: values.has("refresh-sources"),
    refreshMedia: values.has("refresh-media"),
    locationId: values.get("location-id") ? String(values.get("location-id")) : null,
    censusSummaryFile: values.get("census-summary-file") ? path.resolve(String(values.get("census-summary-file"))) : null,
  };
}

function stateSlugFor(location, statesById) {
  if (location.id.startsWith("state-")) return slugify(location.name);
  return slugify(statesById.get(location.stateId).name);
}

function locationSlugFor(location) {
  return slugify(location.name);
}

function contentPathFor(location, statesById) {
  const stateSlug = stateSlugFor(location, statesById);
  if (location.id.startsWith("state-")) return `mock-data/location-news/${stateSlug}/state.json`;
  return `mock-data/location-news/${stateSlug}/${locationSlugFor(location)}.json`;
}

function compactIndexItem(article, contentPath) {
  const slug = article.route.split("/").at(-1);
  return {
    id: article.id,
    route: article.route,
    locationId: article.locationId,
    locationType: article.locationType,
    articleType: article.articleType,
    title: article.title,
    dek: article.dek,
    previewText: article.previewText,
    metaDescription: article.metaDescription,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    relevanceLabel: article.relevanceLabel,
    topicIds: article.topicIds,
    productIds: article.productIds,
    sourceLabels: article.sourceLabels,
    reviewStatus: article.reviewStatus,
    complianceStatus: article.complianceStatus,
    contentPath,
    standalonePath: `site/generated/learning-center/market-news/${slug}.html`,
    imageId: article.imageId,
  };
}

function relatedRoutes(location, state) {
  return [
    state?.route,
    "/loan-options",
    "/loan-options/conventional",
    "/loan-options/fha",
    "/calculators/affordability",
    "/rates",
  ].filter(Boolean);
}

function productIds(location) {
  return location.productIds || location.featuredProductIds || ["product-purchase", "product-conventional", "product-fha", "product-refinance"];
}

function buildContext(location, state, evidence, mediaAssets) {
  if (location.id.startsWith("state-")) {
    return {
      location,
      census: evidence.census.byStateId[location.id],
      bls: evidence.bls.byStateId[location.id],
      hpi: evidence.loans.stateHpi[location.id],
      limitSummary: evidence.loans.stateLimitSummaries[location.id],
      mediaAssets,
      productIds: productIds(location),
      relatedRoutes: relatedRoutes(location, location),
      publishedAt: "2026-07-10",
    };
  }
  const cityCensus = evidence.census.byCityId[location.id];
  const stateCensus = evidence.census.byStateId[state.id];
  return {
    location,
    state,
    census: {
      ...cityCensus,
      stateCurrent: stateCensus.current,
      statePrior: stateCensus.prior,
    },
    bls: evidence.bls.byCityId[location.id],
    limits: evidence.loans.countyLimits[evidence.loans.countyLimitFipsByCityId[location.id]],
    limitCountyFips: evidence.loans.countyLimitFipsByCityId[location.id],
    mediaAssets,
    productIds: productIds(location),
    relatedRoutes: relatedRoutes(location, state),
    publishedAt: "2026-07-10",
  };
}

async function sourceRecordsWithChecksums(sourceGroups) {
  const seen = new Set();
  const output = [];
  for (const source of sourceGroups.flat()) {
    if (!source.cachePath || seen.has(source.cachePath)) continue;
    seen.add(source.cachePath);
    const stats = await fs.stat(source.cachePath);
    output.push({
      ...source,
      cachePath: path.relative(mockDataDir, source.cachePath).replaceAll("\\", "/"),
      bytes: stats.size,
      sha256: await sha256File(source.cachePath),
    });
  }
  return output;
}

function publicRoutes(seed, articles) {
  const collections = [
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
  return [...new Set([
    "/",
    "/locations",
    ...collections.flatMap((collection) => (collection || []).map((item) => item.route).filter(Boolean)),
    ...articles.map((article) => article.route),
  ])].sort();
}

async function publishStaticArticles({ seed, articles, indexItems, mediaById }) {
  const indexByArticleId = new Map(indexItems.map((item) => [item.id, item]));
  for (const article of articles) {
    const indexItem = indexByArticleId.get(article.id);
    if (!indexItem?.standalonePath) throw new Error(`Missing standalone path for ${article.id}`);
    const outputPath = path.resolve(repoRoot, indexItem.standalonePath);
    await writeTextAtomic(
      outputPath,
      renderArticleDocument(article, mediaById[article.imageId], { siteOrigin: DEFAULT_SITE_ORIGIN }),
    );
  }

  const lastmodByRoute = Object.fromEntries(articles.map((article) => [article.route, article.updatedAt || article.publishedAt]));
  await writeTextAtomic(
    path.join(repoRoot, "site", "sitemap.xml"),
    renderSitemap(publicRoutes(seed, articles), { siteOrigin: DEFAULT_SITE_ORIGIN, lastmodByRoute }),
  );
  await writeTextAtomic(
    path.join(repoRoot, "site", "robots.txt"),
    renderRobots({ siteOrigin: DEFAULT_SITE_ORIGIN }),
  );
}

async function main() {
  const options = parseArgs(process.argv);
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) throw new Error("--batch-size must be a positive integer");
  const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
  const statesById = new Map(seed.states.map((state) => [state.id, state]));
  const allLocations = [...seed.states, ...seed.cities];
  const selectedLocations = options.locationId ? allLocations.filter((location) => location.id === options.locationId) : allLocations;
  if (!selectedLocations.length) throw new Error(`Unknown --location-id ${options.locationId}`);

  const approvedManifest = createVerifiedMediaManifest("2026-07-10");
  await writeJsonAtomic(mediaManifestPath, approvedManifest);
  const media = await loadMediaLibrary({ manifestPath: mediaManifestPath, refresh: options.refreshMedia });
  const mediaAssets = Object.values(media.assetsById);
  await materializeMediaAssets({ assets: mediaAssets, repoRoot, refresh: options.refreshMedia });

  console.log(`Loading official Census ACS evidence into ${options.sourceCache}${options.censusSummaryFile ? ` from ${options.censusSummaryFile}` : ""}`);
  const census = await loadCensusEvidence({
    cities: seed.cities,
    states: seed.states,
    cacheDir: options.sourceCache,
    refresh: options.refreshSources,
    summaryFileDir: options.censusSummaryFile,
  });
  console.log("Loading official BLS LAUS evidence; the city source is streamed from cache");
  const bls = await loadBlsEvidence({ cities: seed.cities, states: seed.states, cacheDir: options.sourceCache, refresh: options.refreshSources });
  console.log("Loading official FHFA HPI, FHFA conforming limits, and HUD FHA limits");
  const loans = await loadLoanAndHpiEvidence({ cities: seed.cities, states: seed.states, cacheDir: options.sourceCache, refresh: options.refreshSources });
  const evidence = { census, bls, loans };

  const indexItems = [];
  const corpus = [];
  const batches = [];
  for (let start = 0; start < selectedLocations.length; start += options.batchSize) {
    const locations = selectedLocations.slice(start, start + options.batchSize);
    const batchArticles = [];
    const sourceIds = new Set();
    for (const location of locations) {
      const state = location.id.startsWith("state-") ? location : statesById.get(location.stateId);
      const context = buildContext(location, state, evidence, mediaAssets);
      const articles = location.id.startsWith("state-") ? composeStateArticles(context) : composeCityArticles(context);
      for (const article of articles) {
        validateArticle(article);
        for (const record of article.sourceRecords) sourceIds.add(record.sourceId);
      }
      const contentPath = contentPathFor(location, statesById);
      const absolutePath = path.join(mockDataDir, contentPath.replace(/^mock-data\//, ""));
      await writeJsonAtomic(absolutePath, {
        locationId: location.id,
        locationType: location.id.startsWith("state-") ? "state" : "city",
        generatedAt: "2026-07-10",
        articles,
      });
      location.newsArticleIds = articles.map((article) => article.id);
      batchArticles.push(...articles);
      indexItems.push(...articles.map((article) => compactIndexItem(article, contentPath)));
    }
    corpus.push(...batchArticles);
    batches.push({
      batch: Math.floor(start / options.batchSize) + 1,
      locationIds: locations.map((location) => location.id),
      articleIds: batchArticles.map((article) => article.id),
      sourceIds: [...sourceIds].sort(),
      status: "validated",
    });
    console.log(`Validated batch ${batches.length}: ${locations.length} locations, ${batchArticles.length} articles`);
  }

  const validation = validateCorpus(corpus, {
    expectedLocationIds: selectedLocations.map((location) => location.id),
    minimumArticles: selectedLocations.length * 4,
  });
  const sourceDatasets = await sourceRecordsWithChecksums([census.sources, bls.sources, loans.sources]);
  const index = {
    version: "location-news-index-v1",
    generatedAt: "2026-07-10",
    locationCount: selectedLocations.length,
    articleCount: indexItems.length,
    articles: indexItems,
  };
  const sourceManifest = {
    version: "location-news-sources-v1",
    generatorVersion: "location-news-generator-v1",
    generatedAt: "2026-07-10",
    officialSourcesOnly: true,
    censusMode: census.mode,
    aliases: census.aliases,
    sourceDatasets,
    counts: {
      states: selectedLocations.filter((location) => location.id.startsWith("state-")).length,
      cities: selectedLocations.filter((location) => location.id.startsWith("city-")).length,
      locations: selectedLocations.length,
      articles: indexItems.length,
      bundles: selectedLocations.length,
      batches: batches.length,
      mediaAssets: mediaAssets.length,
    },
    validation,
    batches,
    exceptions: loans.countyLimitAliases,
    legacyArticleMetadata: {
      preservedCount: seed.articles?.length || 0,
      generatedInLocationCorpus: false,
      note: "Existing seed article metadata is preserved unchanged and remains outside the four-per-location evidence corpus.",
    },
  };

  if (!options.locationId) {
    await writeJsonAtomic(indexPath, index);
    await writeJsonAtomic(sourceManifestPath, sourceManifest);
    await writeJsonAtomic(seedPath, seed);
    await publishStaticArticles({ seed, articles: corpus, indexItems, mediaById: media.assetsById });
  }
  console.log(`Generated ${indexItems.length} articles for ${selectedLocations.length} locations in ${batches.length} validated batches.`);
}

await main();

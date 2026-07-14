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
import { authorIdForLocationNews } from "./location-news/lib/author-assignment.mjs";
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
    attributionOnly: values.has("attribution-only"),
    repoRoot: path.resolve(String(values.get("repo-root") || repoRoot)),
  };
}

function resolveAllowlistedPath(root, relativePath, requiredPrefix, label) {
  const normalized = String(relativePath || "").replaceAll("\\", "/");
  if (!normalized.startsWith(requiredPrefix) || normalized.startsWith("/") || normalized.includes("../")) {
    throw new Error(`Unsafe ${label} ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...normalized.split("/"));
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe ${label} ${relativePath}`);
  }
  return resolvedPath;
}

async function writeJsonIfChanged(filePath, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const current = await fs.readFile(filePath, "utf8").catch(() => null);
  if (current === next) return false;
  await writeJsonAtomic(filePath, value);
  return true;
}

async function writeTextIfChanged(filePath, value) {
  const next = String(value);
  const current = await fs.readFile(filePath, "utf8").catch(() => null);
  if (current === next) return false;
  await writeTextAtomic(filePath, next);
  return true;
}

function sitemapOrigin(sitemap) {
  const firstLocation = String(sitemap || "").match(/<loc>([^<]+)<\/loc>/i)?.[1];
  try {
    return firstLocation ? new URL(firstLocation).origin : DEFAULT_SITE_ORIGIN;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

function addContributorRoutesToSitemap(sitemap, contributors, siteOrigin) {
  const source = String(sitemap || "");
  const missingEntries = contributors
    .map((contributor) => new URL(contributor.route, siteOrigin).toString())
    .filter((absoluteRoute) => !source.includes(`<loc>${absoluteRoute}</loc>`))
    .map((absoluteRoute) => `  <url><loc>${absoluteRoute}</loc></url>`);
  if (!missingEntries.length) return source;

  const closingIndex = source.lastIndexOf("</urlset>");
  if (closingIndex < 0) throw new Error("Sitemap is missing </urlset>");
  const before = source.slice(0, closingIndex);
  const after = source.slice(closingIndex);
  return `${before}${before.endsWith("\n") ? "" : "\n"}${missingEntries.join("\n")}\n${after}`;
}

async function runAttributionOnly({ repoRoot: requestedRepoRoot }) {
  const root = path.resolve(requestedRepoRoot);
  const attributionPaths = {
    index: path.join(root, "mock-data", "location-news-index.json"),
    contributors: path.join(root, "mock-data", "editorial", "contributors.json"),
    media: path.join(root, "mock-data", "location-news-media-manifest.json"),
    sitemap: path.join(root, "site", "sitemap.xml"),
  };
  const [indexDocument, contributorDocument, mediaDocument, sitemapSource] = await Promise.all([
    fs.readFile(attributionPaths.index, "utf8").then(JSON.parse),
    fs.readFile(attributionPaths.contributors, "utf8").then(JSON.parse),
    fs.readFile(attributionPaths.media, "utf8").then(JSON.parse),
    fs.readFile(attributionPaths.sitemap, "utf8"),
  ]);
  const indexArticles = Array.isArray(indexDocument.articles) ? indexDocument.articles : [];
  const contributors = Array.isArray(contributorDocument.contributors) ? contributorDocument.contributors : [];
  if (!indexArticles.length) throw new Error("Location-news index has no articles");
  if (contributors.length !== 6) throw new Error(`Contributor registry has ${contributors.length} records; expected 6`);

  const contributorsById = new Map(contributors.map((contributor) => [contributor.id, contributor]));
  const mediaById = Object.fromEntries(
    (mediaDocument.assets || mediaDocument.media || []).map((asset) => [asset.id, asset]),
  );
  const indexById = new Map();
  for (const article of indexArticles) {
    if (indexById.has(article.id)) throw new Error(`Duplicate compact article id ${article.id}`);
    indexById.set(article.id, article);
  }

  const contentPaths = [...new Set(indexArticles.map((article) => article.contentPath))];
  if (root === repoRoot && contentPaths.length !== 788) {
    throw new Error(`Attribution-only backfill expected 788 referenced bundles; found ${contentPaths.length}`);
  }

  const authorByArticleId = new Map();
  const staticArticles = [];
  let bundleWriteCount = 0;
  for (const contentPath of contentPaths) {
    const bundlePath = resolveAllowlistedPath(root, contentPath, "mock-data/location-news/", "content path");
    const bundle = JSON.parse(await fs.readFile(bundlePath, "utf8"));
    const articles = Array.isArray(bundle.articles) ? bundle.articles : [];
    const expectedCompactArticles = indexArticles.filter((article) => article.contentPath === contentPath);
    if (articles.length !== expectedCompactArticles.length) {
      throw new Error(`${contentPath} article count does not match the compact index`);
    }

    let changed = false;
    const updatedArticles = articles.map((article) => {
      const compactArticle = indexById.get(article.id);
      if (!compactArticle || compactArticle.contentPath !== contentPath) {
        throw new Error(`${contentPath} contains unreferenced article ${article.id}`);
      }
      const authorId = authorIdForLocationNews(article);
      const author = contributorsById.get(authorId);
      if (!author) throw new Error(`${article.id} maps to unknown contributor ${authorId}`);
      authorByArticleId.set(article.id, authorId);
      const updatedArticle = article.authorId === authorId ? article : { ...article, authorId };
      changed ||= updatedArticle !== article;
      staticArticles.push({ article: updatedArticle, compactArticle, author });
      return updatedArticle;
    });
    if (changed) {
      bundleWriteCount += Number(await writeJsonIfChanged(bundlePath, { ...bundle, articles: updatedArticles }));
    }
  }

  if (authorByArticleId.size !== indexArticles.length) {
    throw new Error(`Attributed ${authorByArticleId.size} articles; expected ${indexArticles.length}`);
  }
  const updatedIndexArticles = indexArticles.map((article) => {
    const authorId = authorByArticleId.get(article.id);
    return article.authorId === authorId ? article : { ...article, authorId };
  });
  const indexWriteCount = Number(await writeJsonIfChanged(attributionPaths.index, {
    ...indexDocument,
    articles: updatedIndexArticles,
  }));

  const origin = sitemapOrigin(sitemapSource);
  let staticWriteCount = 0;
  for (const { article, compactArticle, author } of staticArticles) {
    const outputPath = resolveAllowlistedPath(
      root,
      compactArticle.standalonePath,
      "site/generated/learning-center/market-news/",
      "standalone path",
    );
    staticWriteCount += Number(await writeTextIfChanged(
      outputPath,
      renderArticleDocument(article, mediaById[article.imageId], { siteOrigin: origin, author }),
    ));
  }

  const sitemapWriteCount = Number(await writeTextIfChanged(
    attributionPaths.sitemap,
    addContributorRoutesToSitemap(sitemapSource, contributors, origin),
  ));
  console.log(JSON.stringify({
    mode: "attribution-only",
    bundlesReferenced: contentPaths.length,
    articlesAttributed: authorByArticleId.size,
    bundleWriteCount,
    indexWriteCount,
    staticWriteCount,
    sitemapWriteCount,
  }));
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
    authorId: article.authorId,
    title: article.title,
    dek: article.dek,
    previewText: article.previewText,
    localContext: (article.sections || [])
      .flatMap((section) => section.body || section.paragraphs || [])
      .filter(Boolean)
      .slice(0, 2),
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

function publicRoutes(seed, articles, contributors = []) {
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
    "/prequal/start",
    ...collections.flatMap((collection) => (collection || []).map((item) => item.route).filter(Boolean)),
    ...contributors.map((contributor) => contributor.route).filter(Boolean),
    ...articles.map((article) => article.route),
  ])].sort();
}

async function publishStaticArticles({ seed, articles, indexItems, mediaById, contributors = [], sitemapArticles = articles }) {
  const indexByArticleId = new Map(indexItems.map((item) => [item.id, item]));
  const contributorsById = new Map(contributors.map((contributor) => [contributor.id, contributor]));
  for (const article of articles) {
    const indexItem = indexByArticleId.get(article.id);
    if (!indexItem?.standalonePath) throw new Error(`Missing standalone path for ${article.id}`);
    const outputPath = path.resolve(repoRoot, indexItem.standalonePath);
    await writeTextAtomic(
      outputPath,
      renderArticleDocument(article, mediaById[article.imageId], {
        siteOrigin: DEFAULT_SITE_ORIGIN,
        author: contributorsById.get(article.authorId),
      }),
    );
  }

  const lastmodByRoute = Object.fromEntries(sitemapArticles.map((article) => [article.route, article.updatedAt || article.publishedAt]));
  await writeTextAtomic(
    path.join(repoRoot, "site", "sitemap.xml"),
    renderSitemap(publicRoutes(seed, sitemapArticles, contributors), { siteOrigin: DEFAULT_SITE_ORIGIN, lastmodByRoute }),
  );
  await writeTextAtomic(
    path.join(repoRoot, "site", "robots.txt"),
    renderRobots({ siteOrigin: DEFAULT_SITE_ORIGIN }),
  );
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.attributionOnly) {
    await runAttributionOnly(options);
    return;
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) throw new Error("--batch-size must be a positive integer");
  const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
  const contributorDocument = JSON.parse(await fs.readFile(path.join(mockDataDir, "editorial", "contributors.json"), "utf8"));
  const contributors = contributorDocument.contributors || [];
  const statesById = new Map(seed.states.map((state) => [state.id, state]));
  const allLocations = [...seed.states, ...seed.cities];
  const selectedLocations = options.locationId ? allLocations.filter((location) => location.id === options.locationId) : allLocations;
  if (!selectedLocations.length) throw new Error(`Unknown --location-id ${options.locationId}`);

  const existingIndex = options.locationId ? JSON.parse(await fs.readFile(indexPath, "utf8")) : null;
  const existingSourceManifest = options.locationId ? JSON.parse(await fs.readFile(sourceManifestPath, "utf8")) : null;

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
  const generatedIndex = {
    version: "location-news-index-v1",
    generatedAt: "2026-07-10",
    locationCount: selectedLocations.length,
    articleCount: indexItems.length,
    articles: indexItems,
  };
  const generatedSourceManifest = {
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
    await writeJsonAtomic(indexPath, generatedIndex);
    await writeJsonAtomic(sourceManifestPath, generatedSourceManifest);
    await writeJsonAtomic(seedPath, seed);
    await publishStaticArticles({ seed, articles: corpus, indexItems, mediaById: media.assetsById, contributors });
  } else {
    const locationId = selectedLocations[0].id;
    const retained = existingIndex.articles.filter((article) => article.locationId !== locationId);
    const mergedArticles = [...retained, ...indexItems];
    const locationIds = new Set(mergedArticles.map((article) => article.locationId));
    const retainedBatches = (existingSourceManifest.batches || []).filter((batch) => !batch.locationIds.includes(locationId));
    const mergedBatches = [...retainedBatches, ...batches]
      .map((batch, index) => ({ ...batch, batch: index + 1 }));
    const sourceIdentity = (source) => source.datasetUrl || source.sourceUrl || source.cachePath;
    const sourceDatasets = [...(existingSourceManifest.sourceDatasets || []), ...generatedSourceManifest.sourceDatasets]
      .filter((source, index, sources) => sources.findIndex((candidate) => sourceIdentity(candidate) === sourceIdentity(source)) === index);
    const mergedIndex = {
      ...existingIndex,
      generatedAt: generatedIndex.generatedAt,
      locationCount: locationIds.size,
      articleCount: mergedArticles.length,
      articles: mergedArticles,
    };
    const mergedSourceManifest = {
      ...existingSourceManifest,
      generatedAt: generatedSourceManifest.generatedAt,
      censusMode: generatedSourceManifest.censusMode,
      aliases: generatedSourceManifest.aliases,
      sourceDatasets,
      counts: {
        ...existingSourceManifest.counts,
        states: [...locationIds].filter((id) => id.startsWith("state-")).length,
        cities: [...locationIds].filter((id) => id.startsWith("city-")).length,
        locations: locationIds.size,
        articles: mergedArticles.length,
        bundles: locationIds.size,
        batches: mergedBatches.length,
        mediaAssets: mediaAssets.length,
      },
      validation: {
        ...existingSourceManifest.validation,
        articles: mergedArticles.length,
        locations: locationIds.size,
      },
      batches: mergedBatches,
      exceptions: generatedSourceManifest.exceptions,
    };
    await writeJsonAtomic(indexPath, mergedIndex);
    await writeJsonAtomic(sourceManifestPath, mergedSourceManifest);
    await writeJsonAtomic(seedPath, seed);
    await publishStaticArticles({
      seed,
      articles: corpus,
      indexItems,
      mediaById: media.assetsById,
      contributors,
      sitemapArticles: mergedArticles,
    });
  }
  console.log(`Generated ${indexItems.length} articles for ${selectedLocations.length} locations in ${batches.length} validated batches.`);
}

await main();

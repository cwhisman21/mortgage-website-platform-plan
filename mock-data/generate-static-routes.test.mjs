import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPublicRouteManifest } from "../site/public-route-manifest.mjs";

const mockDataDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(mockDataDir, "..");
const generatorPath = path.join(mockDataDir, "generate-static-routes.mjs");
const expectedOutputRoot = path.join(repoRoot, "site", "generated", "routes");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const inputs = {
  seed: readJson("mock-data/production-seed.json"),
  editorialBundle: readJson("mock-data/editorial-content.json"),
  productCopyBundle: readJson("mock-data/product-copy.json"),
  locationNewsIndex: readJson("mock-data/location-news-index.json"),
  mediaManifest: readJson("mock-data/location-news-media-manifest.json"),
  ratesMarketplaceFixture: readJson("mock-data/rates-marketplace-fixtures.json"),
  tagRegistry: readJson("mock-data/tag-registry.json"),
  searchIndex: readJson("mock-data/search-index.json"),
};
const publicRouteManifest = createPublicRouteManifest({
  seed: inputs.seed,
  editorialContent: inputs.editorialBundle,
  tagRegistry: inputs.tagRegistry,
});
const nonRootManifest = publicRouteManifest.filter(({ route }) => route !== "/");
const historicalTagRouteCount = inputs.tagRegistry.tags.reduce(
  (count, tag) => count + (tag.redirectSlugs || []).length,
  0,
);
const expectedGeneratedFileCount = nonRootManifest.length + historicalTagRouteCount;

async function generatorModule() {
  assert.equal(fs.existsSync(generatorPath), true, "mock-data/generate-static-routes.mjs must exist");
  return import(pathToFileURL(generatorPath));
}

test("generator deterministically maps every manifest route inside its dedicated output tree", async () => {
  const {
    GENERATED_ROUTES_DIR,
    buildStaticRouteFiles,
    generatedRelativePathForRoute,
  } = await generatorModule();
  const files = buildStaticRouteFiles(inputs, { siteOrigin: "https://mortgage.example" });
  const repeated = buildStaticRouteFiles(inputs, { siteOrigin: "https://mortgage.example" });

  assert.equal(path.resolve(GENERATED_ROUTES_DIR), path.resolve(expectedOutputRoot));
  assert.equal(files.size, expectedGeneratedFileCount);
  assert.equal(files.has("index.html"), false, "root must never be generated");
  for (const entry of nonRootManifest) {
    assert.equal(files.has(generatedRelativePathForRoute(entry.route)), true, `missing generated manifest route ${entry.route}`);
  }
  const locationNewsTargetByRoute = new Map(
    inputs.locationNewsIndex.articles.map((article) => [article.route, article.standalonePath]),
  );
  for (const tag of inputs.tagRegistry.tags) {
    const tagPath = generatedRelativePathForRoute(tag.canonicalRoute);
    const html = files.get(tagPath);
    const resultRoutes = [...html.matchAll(/<article\b[^>]*class="[^"]*\bsearch-result-card\b[^"]*"[^>]*>[\s\S]*?<h3><a href="([^"]+)"/g)]
      .map((match) => match[1]);
    assert.ok(resultRoutes.length > 0, `${tag.canonicalRoute} must render at least one static result link`);
    for (const resultRoute of resultRoutes) {
      const newsTarget = locationNewsTargetByRoute.get(resultRoute);
      if (newsTarget) {
        assert.equal(fs.existsSync(path.join(repoRoot, ...newsTarget.split("/"))), true, `${tag.canonicalRoute} links to missing news document ${resultRoute}`);
      } else {
        assert.equal(files.has(generatedRelativePathForRoute(resultRoute)), true, `${tag.canonicalRoute} links to missing manifest document ${resultRoute}`);
      }
    }
  }
  assert.equal(files.has("locations/texas/austin/index.html"), true);
  assert.equal(files.has("prequal/start/index.html"), true);
  assert.equal([...files.keys()].some((key) => key.includes("learning-center/market-news/")), false);
  assert.deepEqual([...repeated], [...files]);
  assert.equal(generatedRelativePathForRoute("/loan-options/fha-loans"), "loan-options/fha-loans/index.html");
  assert.throws(() => generatedRelativePathForRoute("/"), /root/i);
  assert.throws(() => generatedRelativePathForRoute("/../outside"), /canonical public route/i);
});

test("generator emits a noindex canonical redirect document for a historical tag slug", async () => {
  const {
    buildStaticRouteFiles,
    generatedRelativePathForRoute,
  } = await generatorModule();
  const redirectSlug = "task-6-redirect-fixture";
  const canonicalTag = inputs.tagRegistry.tags[0];
  const claimedSlugs = new Set(inputs.tagRegistry.tags.flatMap((tag) => [tag.slug, ...(tag.redirectSlugs || [])]));
  assert.equal(claimedSlugs.has(redirectSlug), false, `${redirectSlug} must remain reserved for this fixture`);

  const tagRegistry = {
    ...inputs.tagRegistry,
    tags: inputs.tagRegistry.tags.map((tag) => tag.id === canonicalTag.id
      ? { ...tag, redirectSlugs: [...tag.redirectSlugs, redirectSlug] }
      : tag),
  };
  const files = buildStaticRouteFiles({ ...inputs, tagRegistry }, { siteOrigin: "https://mortgage.example" });
  const redirectRoute = `/learning-center/tags/${redirectSlug}`;
  const html = files.get(generatedRelativePathForRoute(redirectRoute));

  assert.equal(files.size, expectedGeneratedFileCount + 1);
  assert.ok(html, `missing redirect document for ${redirectRoute}`);
  assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
  assert.ok(html.includes(`<link rel="canonical" href="https://mortgage.example${canonicalTag.canonicalRoute}" />`));
  assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=${canonicalTag.canonicalRoute}" />`));
  assert.ok(html.includes(`window.location.replace(${JSON.stringify(canonicalTag.canonicalRoute)})`));
});

test("freshness comparison reports missing, stale, and unexpected files byte for byte", async () => {
  const { compareGeneratedRouteFiles } = await generatorModule();
  const desired = new Map([
    ["a/index.html", "alpha\n"],
    ["b/index.html", "beta\n"],
    ["c/index.html", "gamma\n"],
  ]);
  const actual = new Map([
    ["a/index.html", Buffer.from("alpha\n")],
    ["b/index.html", Buffer.from("beta\r\n")],
    ["extra/index.html", Buffer.from("extra\n")],
  ]);

  assert.deepEqual(compareGeneratedRouteFiles(desired, actual), {
    missing: ["c/index.html"],
    stale: ["b/index.html"],
    unexpected: ["extra/index.html"],
  });
});

test("checked-in static route documents pass the generator freshness check", () => {
  assert.equal(fs.existsSync(generatorPath), true, "mock-data/generate-static-routes.mjs must exist");
  const result = spawnSync(process.execPath, [generatorPath, "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(`fresh: ${expectedGeneratedFileCount} files`));
});

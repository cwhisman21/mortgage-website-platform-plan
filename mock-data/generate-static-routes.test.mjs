import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const mockDataDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(mockDataDir, "..");
const generatorPath = path.join(mockDataDir, "generate-static-routes.mjs");
const expectedOutputRoot = path.join(repoRoot, "site", "generated", "routes");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const inputs = {
  seed: readJson("mock-data/production-seed.json"),
  editorialBundle: readJson("mock-data/editorial-content.json"),
  productCopyBundle: readJson("mock-data/product-copy.json"),
  mediaManifest: readJson("mock-data/location-news-media-manifest.json"),
  ratesMarketplaceFixture: readJson("mock-data/rates-marketplace-fixtures.json"),
};

async function generatorModule() {
  assert.equal(fs.existsSync(generatorPath), true, "mock-data/generate-static-routes.mjs must exist");
  return import(pathToFileURL(generatorPath));
}

test("generator deterministically maps 871 non-root routes inside its dedicated output tree", async () => {
  const {
    GENERATED_ROUTES_DIR,
    buildStaticRouteFiles,
    generatedRelativePathForRoute,
  } = await generatorModule();
  const files = buildStaticRouteFiles(inputs, { siteOrigin: "https://mortgage.example" });
  const repeated = buildStaticRouteFiles(inputs, { siteOrigin: "https://mortgage.example" });

  assert.equal(path.resolve(GENERATED_ROUTES_DIR), path.resolve(expectedOutputRoot));
  assert.equal(files.size, 871);
  assert.equal(files.has("index.html"), false, "root must never be generated");
  assert.equal(files.has("locations/texas/austin/index.html"), true);
  assert.equal(files.has("prequal/start/index.html"), true);
  assert.equal([...files.keys()].some((key) => key.includes("learning-center/market-news/")), false);
  assert.deepEqual([...repeated], [...files]);
  assert.equal(generatedRelativePathForRoute("/loan-options/fha-loans"), "loan-options/fha-loans/index.html");
  assert.throws(() => generatedRelativePathForRoute("/"), /root/i);
  assert.throws(() => generatedRelativePathForRoute("/../outside"), /canonical public route/i);
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
  assert.match(result.stdout, /fresh: 871 files/);
});

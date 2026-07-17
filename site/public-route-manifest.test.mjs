import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const manifestPath = path.join(siteDir, "public-route-manifest.mjs");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const seed = readJson("mock-data/production-seed.json");
const editorialContent = readJson("mock-data/editorial-content.json");
const tagRegistry = readJson("mock-data/public-tag-registry.json");

test("public route manifest deterministically owns one canonical route per accepted tag", async () => {
  assert.equal(fs.existsSync(manifestPath), true, "site/public-route-manifest.mjs must exist");
  const { createPublicRouteManifest } = await import(pathToFileURL(manifestPath));

  const baseManifest = createPublicRouteManifest({ seed, editorialContent });
  const manifest = createPublicRouteManifest({ seed, editorialContent, tagRegistry });
  const repeated = createPublicRouteManifest({ seed, editorialContent, tagRegistry });
  const routes = manifest.map((entry) => entry.route);
  const learningCenterBaseCount = seed.blogPages.length
    + seed.articles.length
    + editorialContent.contributors.length
    + 1;
  const expectedRouteCount = baseManifest.length + tagRegistry.tags.length;
  const groupCounts = Object.fromEntries(
    [...new Set(manifest.map((entry) => entry.group))]
      .sort()
      .map((group) => [group, manifest.filter((entry) => entry.group === group).length]),
  );

  assert.deepEqual(repeated, manifest, "same inputs must produce byte-stable manifest data");
  assert.equal(manifest.length, expectedRouteCount);
  assert.equal(new Set(routes).size, expectedRouteCount, "manifest routes must be unique");
  assert.equal(routes[0], "/", "root must be the first route");
  assert.deepEqual(routes.slice(1), [...routes.slice(1)].sort(), "non-root routes must be ASCII sorted");
  assert.deepEqual(groupCounts, {
    branches: 7,
    calculators: 6,
    companies: 10,
    learningCenter: learningCenterBaseCount + tagRegistry.tags.length,
    loanOfficers: 17,
    loanOptions: 6,
    locations: 789,
    prequal: 1,
    root: 1,
    singleton: 5,
  });
  assert.deepEqual(
    manifest.filter((entry) => entry.type === "seller"),
    [{
      route: "/sell",
      type: "seller",
      group: "singleton",
      itemId: "seller-home",
      source: "sellerPages",
    }],
  );
  assert.equal(manifest.find((entry) => entry.route === "/prequal/start")?.type, "prequalHandoff");
  assert.deepEqual(
    manifest.filter((entry) => entry.type === "company").map((entry) => entry.route),
    seed.companies.map((entry) => entry.route).sort(),
  );
  assert.equal(manifest.filter((entry) => entry.type === "contributor").length, 6);
  assert.deepEqual(
    manifest.filter((entry) => entry.type === "contributor").map((entry) => entry.route),
    editorialContent.contributors.map((entry) => entry.route).sort(),
  );
  assert.deepEqual(
    manifest.filter((entry) => entry.type === "tag"),
    tagRegistry.tags
      .map((tag) => ({
        route: tag.canonicalRoute,
        type: "tag",
        group: "learningCenter",
        itemId: tag.id,
        source: "tagRegistry.tags",
      }))
      .sort((left, right) => left.route.localeCompare(right.route)),
  );
  assert.equal(routes.some((route) => route.startsWith("/learning-center/market-news/")), false);
});

test("compatibility group counts retain Learning Center while validation derives live inputs", async () => {
  const { createPublicRouteManifest, PUBLIC_ROUTE_GROUP_COUNTS } = await import(pathToFileURL(manifestPath));
  const extendedSeed = {
    ...seed,
    blogPages: [
      ...seed.blogPages,
      {
        id: "blog-manifest-count-fixture",
        name: "Manifest count fixture",
        route: "/learning-center/manifest-count-fixture",
      },
    ],
  };
  const oneTagRegistry = { ...tagRegistry, tags: [tagRegistry.tags[0]] };
  const manifest = createPublicRouteManifest({
    seed: extendedSeed,
    editorialContent,
    tagRegistry: oneTagRegistry,
  });

  assert.equal(PUBLIC_ROUTE_GROUP_COUNTS.learningCenter, 41);
  assert.equal(
    manifest.filter((entry) => entry.group === "learningCenter").length,
    PUBLIC_ROUTE_GROUP_COUNTS.learningCenter + 2,
  );
});

test("historical tag slugs do not become manifest or sitemap-owned routes", async () => {
  const { createPublicRouteManifest } = await import(pathToFileURL(manifestPath));
  const historicalTag = {
    ...tagRegistry.tags.find((tag) => tag.slug === "florida"),
    redirectSlugs: ["florida-mortgages", "sunshine-state"],
  };
  const manifest = createPublicRouteManifest({
    seed,
    editorialContent,
    tagRegistry: { ...tagRegistry, tags: [historicalTag] },
  });
  const tagEntries = manifest.filter((entry) => entry.type === "tag");

  assert.deepEqual(tagEntries, [{
    route: historicalTag.canonicalRoute,
    type: "tag",
    group: "learningCenter",
    itemId: historicalTag.id,
    source: "tagRegistry.tags",
  }]);
  assert.equal(manifest.some((entry) => entry.route === "/learning-center/tags/florida-mortgages"), false);
  assert.equal(manifest.some((entry) => entry.route === "/learning-center/tags/sunshine-state"), false);
});

test("public route manifest rejects duplicate or malformed route ownership", async () => {
  assert.equal(fs.existsSync(manifestPath), true, "site/public-route-manifest.mjs must exist");
  const { createPublicRouteManifest } = await import(pathToFileURL(manifestPath));
  const duplicateSeed = {
    ...seed,
    cities: [...seed.cities, { ...seed.cities[0], id: "duplicate-city" }],
  };

  assert.throws(
    () => createPublicRouteManifest({ seed: duplicateSeed, editorialContent }),
    /Duplicate public route/,
  );
  assert.throws(
    () => createPublicRouteManifest({ seed: { ...seed, states: [{ ...seed.states[0], route: "locations/alabama" }] }, editorialContent }),
    /canonical absolute path/,
  );
});

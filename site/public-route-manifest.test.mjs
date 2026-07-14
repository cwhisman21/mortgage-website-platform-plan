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

test("public route manifest deterministically owns the 872 non-news routes", async () => {
  assert.equal(fs.existsSync(manifestPath), true, "site/public-route-manifest.mjs must exist");
  const { createPublicRouteManifest } = await import(pathToFileURL(manifestPath));

  const manifest = createPublicRouteManifest({ seed, editorialContent });
  const repeated = createPublicRouteManifest({ seed, editorialContent });
  const routes = manifest.map((entry) => entry.route);
  const groupCounts = Object.fromEntries(
    [...new Set(manifest.map((entry) => entry.group))]
      .sort()
      .map((group) => [group, manifest.filter((entry) => entry.group === group).length]),
  );

  assert.deepEqual(repeated, manifest, "same inputs must produce byte-stable manifest data");
  assert.equal(manifest.length, 872);
  assert.equal(new Set(routes).size, 872, "manifest routes must be unique");
  assert.equal(routes[0], "/", "root must be the first route");
  assert.deepEqual(routes.slice(1), [...routes.slice(1)].sort(), "non-root routes must be ASCII sorted");
  assert.deepEqual(groupCounts, {
    branches: 7,
    calculators: 6,
    learningCenter: 41,
    loanOfficers: 17,
    loanOptions: 6,
    locations: 789,
    prequal: 1,
    root: 1,
    singleton: 4,
  });
  assert.equal(manifest.find((entry) => entry.route === "/prequal/start")?.type, "prequalHandoff");
  assert.equal(manifest.filter((entry) => entry.type === "contributor").length, 6);
  assert.deepEqual(
    manifest.filter((entry) => entry.type === "contributor").map((entry) => entry.route),
    editorialContent.contributors.map((entry) => entry.route).sort(),
  );
  assert.equal(routes.some((route) => route.startsWith("/learning-center/market-news/")), false);
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

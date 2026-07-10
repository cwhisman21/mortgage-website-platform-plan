import test from "node:test";
import assert from "node:assert/strict";

import { assignMedia, createVerifiedMediaManifest, validateMediaAsset } from "../location-news/lib/media.mjs";

test("validates stock provenance and landscape shape", () => {
  const manifest = createVerifiedMediaManifest("2026-07-10");
  assert.ok(manifest.assets.length >= 7);
  assert.doesNotThrow(() => validateMediaAsset(manifest.assets[0]));
  assert.ok(manifest.assets.every((asset) => asset.locationScope === "non_local_theme"));
  assert.ok(manifest.assets.every((asset) => /^\/site\/assets\/news\/pexels-\d+\.jpeg$/.test(asset.localPath)));
});

test("assigns deterministically and uses the requested theme", () => {
  const assets = createVerifiedMediaManifest("2026-07-10").assets;
  const first = assignMedia("article-a", "home_values", assets);
  const second = assignMedia("article-a", "home_values", assets);
  assert.equal(first.id, second.id);
  assert.equal(first.theme, "home_values");
});

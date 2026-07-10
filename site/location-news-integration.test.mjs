import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("Vercel preserves generated articles without intercepting existing learning routes", () => {
  const articleRewrite = vercel.rewrites.find((rewrite) => rewrite.destination.includes("generated/learning-center"));
  assert.ok(articleRewrite, "missing generated article rewrite");
  assert.equal(articleRewrite.source, "/learning-center/market-news/:slug");
  for (const route of ["/buy", "/refinance", "/home-equity"]) {
    assert.ok(vercel.rewrites.some((rewrite) => rewrite.source === route && rewrite.destination === "/site/index.html"), `missing ${route} rewrite`);
  }
});

test("article loading guards stale responses and permits retry after rejection", () => {
  assert.match(appSource, /activeArticleRequestId/);
  assert.match(appSource, /articleBundlePromises\.delete\(indexItem\.contentPath\)/);
});

test("navigation from an open article normalizes modal history first", () => {
  assert.match(appSource, /function navigateFromArticleModal/);
  assert.match(appSource, /navigateFromArticleModal\(`/);
});

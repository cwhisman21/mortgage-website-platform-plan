import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const documentMetadataSource = fs.readFileSync(new URL("./document-metadata.mjs", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

const sourceBetween = (startMarker, endMarker) => {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return appSource.slice(start, end);
};

test("Vercel preserves generated articles without intercepting existing learning routes", () => {
  const articleRewrite = vercel.rewrites.find((rewrite) => rewrite.destination.includes("generated/learning-center"));
  assert.ok(articleRewrite, "missing generated article rewrite");
  assert.equal(articleRewrite.source, "/learning-center/market-news/:slug");
  for (const route of ["/buy", "/refinance", "/home-equity"]) {
    assert.ok(vercel.rewrites.some((rewrite) => rewrite.source === route && rewrite.destination === `/site/generated/routes${route}/index.html`), `missing ${route} rewrite`);
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

test("location-news cards resolve and link the assigned contributor byline", () => {
  const cardSource = sourceBetween("function newsCard(article)", "function locationNewsFeed(location)");

  assert.match(cardSource, /authorId/);
  assert.match(cardSource, /contributors/);
  assert.match(cardSource, /renderContributorBylineMarkup|data-editorial-byline/);
});

test("modal and direct article rendering receive the assigned contributor", () => {
  const directSource = sourceBetween("async function hydrateDirectArticle(indexItem)", "function setArticleModalLoading(indexItem)");
  const modalSource = sourceBetween("async function openArticleModal", "function closeArticleModal");

  for (const [label, source] of [["direct", directSource], ["modal", modalSource]]) {
    assert.match(source, /renderArticleContent\([\s\S]*author/, `${label} rendering does not pass an author`);
    assert.match(source, /contributors|authorId/, `${label} rendering does not resolve a contributor`);
  }
});

test("SPA Article JSON-LD uses Snap editorial organization authorship", () => {
  const metadataSource = sourceBetween("function setDocumentMeta", "function notFoundPage");

  assert.match(metadataSource, /contributors/);
  assert.match(metadataSource, /resolveDocumentMetadata/);
  assert.match(documentMetadataSource, /"@type":\s*"Organization"/);
  assert.match(documentMetadataSource, /Snap Mortgage Editorial/);
  assert.match(documentMetadataSource, /learning-center\/editorial-team/);
  assert.doesNotMatch(documentMetadataSource, /"@type":\s*"Person"/);
});

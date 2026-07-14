import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const modulePath = path.join(siteDir, "static-route-document.mjs");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const inputs = {
  seed: readJson("mock-data/production-seed.json"),
  editorialBundle: readJson("mock-data/editorial-content.json"),
  productCopyBundle: readJson("mock-data/product-copy.json"),
  mediaManifest: readJson("mock-data/location-news-media-manifest.json"),
  ratesMarketplaceFixture: readJson("mock-data/rates-marketplace-fixtures.json"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function visibleWordCount(html) {
  const text = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ");
  return (text.match(/\b[A-Za-z0-9][A-Za-z0-9'-]*\b/g) || []).length;
}

async function staticModule() {
  assert.equal(fs.existsSync(modulePath), true, "site/static-route-document.mjs must exist");
  return import(pathToFileURL(modulePath));
}

test("representative static documents expose route data before the SPA boots", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const render = (route) => renderStaticRouteDocument(context.recordsByRoute.get(route), context, { siteOrigin: "https://mortgage.example" });

  const city = render("/locations/texas/austin");
  assert.match(city, /<h1>Austin, TX mortgage market guide<\/h1>/);
  assert.match(city, /\$515K/);
  assert.match(city, /href="\/loan-options\/fha-loans"/);
  assert.match(city, /<link rel="canonical" href="https:\/\/mortgage\.example\/locations\/texas\/austin"/);

  const product = render("/loan-options/fha-loans");
  assert.match(product, /<h1>FHA Loans<\/h1>/);
  assert.match(product, /Learn how FHA loans handle mortgage insurance/);
  assert.match(product, /Questions to settle before you choose/);

  const article = render("/learning-center/austin-mortgage-market-update");
  assert.match(article, /data-production-article="article-austin-market-update"/);
  assert.match(article, /<meta property="og:type" content="article"/);
  assert.match(article, /"@type":"Article"/);

  const contributor = render("/learning-center/authors/rowan-hale");
  assert.match(contributor, /<h1>Rowan Hale<\/h1>/);
  assert.match(contributor, /mortgage-rate context, inflation signals, and financing conditions/);

  const prequal = render("/prequal/start");
  assert.match(prequal, /<h1>Start mortgage prequalification<\/h1>/);
  assert.doesNotMatch(prequal, /provider|prequalKey|query state|saved rate/i);
});

test("all 871 non-root documents are crawlable, substantive, and SPA-compatible", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const records = context.manifest.filter((entry) => entry.route !== "/").map((entry) => context.recordsByRoute.get(entry.route));

  assert.equal(records.length, 871);
  for (const record of records) {
    const html = renderStaticRouteDocument(record, context, { siteOrigin: "https://mortgage.example" });
    const metadata = context.metadataFor(record, { siteOrigin: "https://mortgage.example" });
    const h1Count = (html.match(/<h1\b/g) || []).length;
    const relatedBlock = html.match(/<nav[^>]+data-static-related-links[\s\S]*?<\/nav>/)?.[0] || "";
    const relatedRoutes = new Set([...relatedBlock.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]));

    assert.equal(h1Count, 1, `${record.entry.route} must contain exactly one h1`);
    assert.ok(visibleWordCount(html) >= 80, `${record.entry.route} must expose at least 80 borrower-facing words`);
    assert.ok(relatedRoutes.size >= 3, `${record.entry.route} must expose at least three related internal links`);
    assert.match(html, /<link rel="stylesheet" href="\/site\/styles\.css"/);
    assert.match(html, /<script type="module" src="\/site\/app\.js"><\/script>/);
    assert.match(html, /<div id="app"/);
    assert.ok(html.includes(`<title>${escapeHtml(metadata.title)}</title>`), `${record.entry.route} title must match shared metadata`);
    assert.ok(html.includes(`content="${escapeHtml(metadata.description)}"`), `${record.entry.route} description must match shared metadata`);
    assert.ok(html.includes(`href="${escapeHtml(metadata.canonical)}"`), `${record.entry.route} canonical must match shared metadata`);
    assert.doesNotMatch(html, /Loading Snap Mortgage|loading-state/i, record.entry.route);
    assert.doesNotMatch(html, /http-equiv=["']refresh|window\.location|location\.replace|href=["']#\//i, record.entry.route);
    assert.doesNotMatch(html, /Michael Thompson|snapMortgagePublicSession|prequalKey|fixture-/i, record.entry.route);
    assert.doesNotMatch(html, /Trust layer|Answer unlock|Topic guide|Content graph|Editorial graph|Branch content graph|City dashboard/i, record.entry.route);

    for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:css|js|mjs|png|jpe?g|webp|svg)(?:\?[^\"]*)?)"/gi)) {
      assert.match(match[1], /^(?:\/|https?:\/\/|data:)/, `${record.entry.route} has a relative asset ${match[1]}`);
    }
  }
});

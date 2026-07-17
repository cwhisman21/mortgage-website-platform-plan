import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderArticleDocument } from "./location-news-static.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const modulePath = path.join(siteDir, "static-route-document.mjs");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const inputs = {
  seed: readJson("mock-data/production-seed.json"),
  editorialBundle: readJson("mock-data/editorial-content.json"),
  productCopyBundle: readJson("mock-data/product-copy.json"),
  locationNewsIndex: readJson("mock-data/location-news-index.json"),
  mediaManifest: readJson("mock-data/location-news-media-manifest.json"),
  ratesMarketplaceFixture: readJson("mock-data/rates-marketplace-fixtures.json"),
  tagRegistry: readJson("mock-data/public-tag-registry.json"),
  searchIndex: readJson("mock-data/search-index.json"),
};
const planoNewsBundle = readJson("mock-data/location-news/texas/plano.json");

const currentDataWarningPattern = /Use current property details[\s\S]*can vary by property and change over time[\s\S]*home you are considering/i;

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

function familySection(html, family) {
  const marker = `data-tag-result-family="${family}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";
  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  return sectionEnd < 0 ? "" : html.slice(sectionStart, sectionEnd + "</section>".length);
}

function staticTagResultRoutes(html) {
  return [...html.matchAll(/\bdata-static-tag-result-route="([^"]+)"/g)].map((match) => match[1]);
}

function tagRecord(tag) {
  return {
    entry: {
      group: "learningCenter",
      type: "tag",
      itemId: tag.id,
      route: tag.canonicalRoute,
      source: "tagRegistry.tags",
    },
    found: { type: "tag", item: tag },
  };
}

function tagMetadata(tag, siteOrigin = "https://mortgage.example") {
  const title = `${tag.displayName} Mortgage Resources | Snap Mortgage`;
  const canonical = `${siteOrigin}${tag.canonicalRoute}`;
  return {
    title,
    description: tag.description,
    robots: "index,follow",
    canonical,
    openGraph: { type: "website", title, description: tag.description, url: canonical, image: "" },
    twitter: { card: "summary", title, description: tag.description, image: "" },
    jsonLd: [],
  };
}

test("single-tag documents expose complete crawlable results before enhancement", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const refinanceTag = context.tagRegistry.tagsBySlug.get("refinance");
  const renderContext = { ...context, metadataFor: ({ found }) => tagMetadata(found.item) };
  const html = renderStaticRouteDocument(tagRecord(refinanceTag), renderContext, { siteOrigin: "https://mortgage.example" });

  assert.match(html, /<nav[^>]+aria-label="Breadcrumb"[\s\S]*href="\/learning-center"[^>]*>Learning Center<\/a>[\s\S]*aria-current="page">Refinance/);
  assert.match(html, /<h1>Refinance mortgage resources<\/h1>/);
  assert.ok(html.includes(`<p class="lead">${escapeHtml(refinanceTag.description)}</p>`));
  assert.ok(html.includes(`<meta name="description" content="${escapeHtml(refinanceTag.description)}`));
  assert.match(html, new RegExp(`Last updated[\\s\\S]*datetime="${refinanceTag.reviewedAt}"`));
  assert.match(html, /<meta name="robots" content="index,follow"/);
  assert.match(html, new RegExp(`data-tag-search-root[^>]+data-selected-tag-id="${refinanceTag.id}"`));

  const relatedTag = context.tagRegistry.tagsById.get(refinanceTag.relatedTagIds[0]);
  assert.ok(html.includes(`href="${escapeHtml(relatedTag.canonicalRoute)}"`));
  assert.ok(html.indexOf(relatedTag.canonicalRoute) < html.indexOf('<script type="module" src="/site/app.js">'));

  const expectedFamilies = [
    ["articles", "Articles and education"],
    ["topic-guides", "Topic guides"],
    ["local-market-news", "Local market news"],
    ["product-guides", "Mortgage product guides"],
    ["calculators", "Calculators and tools"],
  ];
  let previousHeading = -1;
  const matchingRecords = inputs.searchIndex.records
    .filter((candidate) => candidate.tagIds.includes(refinanceTag.id));
  const matchingRoutes = new Set(matchingRecords.map((candidate) => candidate.route));
  const populatedFamilies = expectedFamilies.filter(([family]) => (
    matchingRecords.some((candidate) => candidate.family === family)
  ));

  for (const [family, heading] of populatedFamilies) {
    const headingIndex = html.indexOf(`<h2>${heading}</h2>`);
    assert.ok(headingIndex > previousHeading, `${heading} must follow the fixed family order`);
    previousHeading = headingIndex;

    const section = familySection(html, family);
    const cardCount = (section.match(/class="search-result-card"/g) || []).length;
    const expectedCardCount = Math.min(
      matchingRecords.filter((candidate) => candidate.family === family).length,
      20,
    );
    assert.equal(cardCount, expectedCardCount, `${family} must expose up to 20 static cards`);
    for (const match of section.matchAll(/<h3><a href="([^"]+)"/g)) {
      assert.ok(matchingRoutes.has(match[1]), `${match[1]} must be a canonical result for Refinance`);
    }
  }

  const renderedRoutes = staticTagResultRoutes(html);
  assert.equal(new Set(renderedRoutes).size, renderedRoutes.length, "static tag results must not repeat canonical routes");
  assert.deepEqual(
    renderedRoutes.slice().sort(),
    [...matchingRoutes].sort(),
    "the no-JS document must expose the exact canonical assignment set",
  );

  for (const [family, heading] of expectedFamilies.filter((item) => !populatedFamilies.includes(item))) {
    assert.doesNotMatch(html, new RegExp(`<section[^>]+data-search-family="${family}"`));
    assert.ok(!html.includes(`<h2>${heading}</h2>`), `${heading} must be omitted when it has no results`);
  }

  const scriptIndex = html.indexOf('<script type="module" src="/site/app.js">');
  assert.ok(html.indexOf("Refinance mortgage resources") < scriptIndex);
  assert.ok(html.indexOf('class="search-result-card"') < scriptIndex);

  const floridaTag = context.tagRegistry.tagsBySlug.get("florida");
  const floridaHtml = renderStaticRouteDocument(
    tagRecord(floridaTag),
    renderContext,
    { siteOrigin: "https://mortgage.example" },
  );
  assert.match(floridaHtml, /data-tag-result-family="articles"/);
  assert.match(floridaHtml, /data-tag-result-family="local-market-news"/);
  assert.doesNotMatch(floridaHtml, /data-tag-result-family="(?:topic-guides|product-guides|calculators)"/);
});

test("the broad FHA tag exposes every canonical assignment before JavaScript", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const fhaTag = context.tagRegistry.tagsBySlug.get("fha-loans");
  const html = renderStaticRouteDocument(tagRecord(fhaTag), context, { siteOrigin: "https://mortgage.example" });
  const expectedRoutes = inputs.searchIndex.records
    .filter((record) => record.tagIds.includes(fhaTag.id))
    .map((record) => record.route);
  const renderedRoutes = staticTagResultRoutes(html);

  assert.ok(expectedRoutes.length > 20, "the fixture must exercise static overflow disclosure");
  assert.equal(new Set(renderedRoutes).size, renderedRoutes.length);
  assert.deepEqual(renderedRoutes.slice().sort(), expectedRoutes.slice().sort());
});

test("tag resource titles stay grammatical and coherent across H1, title, and JSON-LD", async () => {
  const { composeTagResourceTitle, createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const tag = context.tagRegistry.tagsBySlug.get("refinance-a-mortgage");
  const html = renderStaticRouteDocument(tagRecord(tag), context, { siteOrigin: "https://mortgage.example" });
  const heading = html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const structuredData = JSON.parse(html.match(/<script type="application\/ld\+json" data-document-jsonld>([\s\S]*?)<\/script>/)[1]);
  const resourceNames = structuredData
    .filter((item) => ["CollectionPage", "ItemList"].includes(item["@type"]))
    .map((item) => item.name);

  assert.equal(composeTagResourceTitle(tag), "Mortgage refinance resources");
  assert.equal(heading, "Mortgage refinance resources");
  assert.equal(title, `${heading} | Snap Mortgage`);
  assert.deepEqual(resourceNames, [heading, heading]);
  for (const value of [title, heading, ...resourceNames]) {
    assert.doesNotMatch(value, /\bmortgage\s+mortgage\b/i);
  }
});

test("every indexed static family receives its route tag context", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const staticFamilies = new Set(["articles", "topic-guides", "product-guides", "calculators"]);

  for (const indexedRecord of inputs.searchIndex.records.filter(({ family }) => staticFamilies.has(family))) {
    const record = context.recordsByRoute.get(indexedRecord.route);
    assert.ok(record, `${indexedRecord.route} must have a static route record`);
    const tagContext = context.tagContextForRoute(indexedRecord.route);
    assert.ok(tagContext.primaryTags.length >= 1 && tagContext.primaryTags.length <= 3, `${indexedRecord.route} must resolve primary tags`);

    const html = renderStaticRouteDocument(record, context, { siteOrigin: "https://mortgage.example" });
    const primaryIndex = html.indexOf('class="content-primary-tags"');
    assert.ok(primaryIndex >= 0 && primaryIndex < html.indexOf("<h1"), `${indexedRecord.route} must render primary tags before its h1`);
    for (const tag of tagContext.primaryTags) {
      assert.ok(html.includes(`href="${escapeHtml(tag.canonicalRoute)}"`), `${indexedRecord.route} must link ${tag.displayName}`);
    }
  }

  const articleRoute = "/learning-center/austin-mortgage-market-update";
  const articleHtml = renderStaticRouteDocument(context.recordsByRoute.get(articleRoute), context);
  assert.ok(articleHtml.indexOf("article-sources-title") < articleHtml.indexOf('class="content-additional-tags"'));
  assert.ok(articleHtml.indexOf('class="content-additional-tags"') < articleHtml.indexOf("data-static-related-links"));
});

test("standalone local news forwards tag context into content and Article data", async () => {
  const { createStaticRouteContext } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const article = planoNewsBundle.articles[0];
  const tagContext = context.tagContextForRoute(article.route);
  const media = context.maps.media.get(article.imageId);
  const author = context.maps.contributors.get(article.authorId);
  const html = renderArticleDocument(article, media, {
    siteOrigin: "https://mortgage.example",
    author,
    tagContext,
  });

  assert.ok(html.indexOf('class="content-primary-tags"') < html.indexOf("<h1"));
  assert.ok(html.indexOf('class="news-article-sources"') < html.indexOf('class="content-additional-tags"'));
  assert.ok(html.indexOf('class="content-additional-tags"') < html.indexOf('class="news-article-related"'));
  const structuredData = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const assignedTags = [...tagContext.primaryTags, ...tagContext.additionalTags];
  assert.deepEqual(structuredData.keywords, assignedTags.map(({ displayName }) => displayName));
  assert.deepEqual(structuredData.articleSection, tagContext.primaryTags.map(({ displayName }) => displayName));
  assert.deepEqual(structuredData.about.map(({ name }) => name), assignedTags.map(({ displayName }) => displayName));
});

test("static head renders the robots value supplied by metadata", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const record = context.recordsByRoute.get("/learning-center/austin-mortgage-market-update");
  const metadata = context.metadataFor(record, { siteOrigin: "https://mortgage.example" });
  const html = renderStaticRouteDocument(record, {
    ...context,
    metadataFor: () => ({ ...metadata, robots: "noindex,follow" }),
  }, { siteOrigin: "https://mortgage.example" });

  assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
});

test("representative static documents expose route data before the SPA boots", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const render = (route) => renderStaticRouteDocument(context.recordsByRoute.get(route), context, { siteOrigin: "https://mortgage.example" });

  const city = render("/locations/texas/austin");
  assert.match(city, /<h1>Austin, TX mortgage market guide<\/h1>/);
  assert.match(city, /\$515K/);
  assert.match(city, /href="\/loan-options\/fha-loans"/);
  assert.match(city, /<link rel="canonical" href="https:\/\/mortgage\.example\/locations\/texas\/austin"/);
  assert.match(city, currentDataWarningPattern);
  assert.match(city, /For a property in Austin/);
  assert.match(city, /49 days for days on market/i);
  assert.equal((city.match(/data-static-location-news-card/g) || []).length, 4);
  assert.match(city, /<img[^>]+pexels-32045958\.jpeg/);
  assert.match(city, /data-editorial-byline/);
  assert.match(city, /Read more/);

  const state = render("/locations/texas");
  assert.match(state, currentDataWarningPattern);
  assert.equal((state.match(/data-static-location-news-card/g) || []).length, 4);

  const product = render("/loan-options/fha-loans");
  assert.match(product, /<h1>FHA Loans<\/h1>/);
  assert.match(product, /Learn how FHA loans handle mortgage insurance/);
  assert.match(product, /Questions to settle before you choose/);
  const fhaSummary = inputs.productCopyBundle.products.find(({ id }) => id === "product-fha").summary;
  assert.equal(product.split(escapeHtml(fhaSummary)).length - 1, 1, "the opening product summary must appear once");

  const article = render("/learning-center/austin-mortgage-market-update");
  assert.match(article, /data-production-article="article-austin-market-update"/);
  assert.match(article, /<meta property="og:type" content="article"/);
  assert.match(article, /"@type":"Article"/);

  const contributor = render("/learning-center/authors/rowan-hale");
  assert.match(contributor, /<h1>Rowan Hale<\/h1>/);
  assert.match(contributor, /mortgage-rate context, inflation signals, and financing conditions/);
  const rowanCount = [
    ...context.data.articles,
    ...inputs.locationNewsIndex.articles,
  ].filter(({ authorId }) => authorId === "contributor-rowan-hale").length;
  assert.match(contributor, new RegExp(`data-contributor-article-count="${rowanCount}"`));
  assert.match(contributor, /href="\/learning-center\/market-news\//);
  assert.match(contributor, /Snap editorial voice, not a loan officer or licensed mortgage professional/i);

  const prequal = render("/prequal/start");
  assert.match(prequal, /<h1>Review mortgage prequalification<\/h1>/);
  assert.match(prequal, /Choose a mortgage option on the rates page/);
  assert.doesNotMatch(prequal, /prequalKey|query state|saved rate/i);

  const officer = render("/loan-officers/ava-martinez");
  assert.match(officer, /Ava Martinez/);
  assert.doesNotMatch(officer, /NMLS|licensed states|specialty areas|languages listed/i);

  const company = render("/companies/harborline-home-lending");
  assert.match(company, /<h1>Harborline Home Lending<\/h1>/);
  assert.match(company, /company-placeholder\.svg/);
  assert.match(company, /href="\/rates"/);
});

test("seller document is crawlable before the address-first workspace enhances", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const record = context.recordsByRoute.get("/sell");

  assert.equal(record?.entry.type, "seller");
  const html = renderStaticRouteDocument(record, context, { siteOrigin: "https://mortgage.example" });

  assert.equal(record.found.item.metaTitle, "Sell a Home: Value and Proceeds in Snap Homes | Snap Mortgage");
  assert.equal(
    record.found.item.metaDescription,
    "See a property-value range, choose a value, confirm known obligations, then open detailed selling costs and projected proceeds through Snap Homes.",
  );
  assert.equal(
    record.found.item.purpose,
    "Help homeowners see a property-value range, choose a value, confirm known obligations, and open detailed selling costs and projected proceeds through Snap Homes.",
  );
  assert.match(html, /<h1>Start with what your sale could leave you\.<\/h1>/);
  assert.match(html, /Explore my property value range/);
  assert.match(html, /property[- ]value/i);
  assert.match(html, /mortgage payoff/i);
  assert.match(html, /selling costs/i);
  assert.match(html, /Snap Homes/i);
  assert.match(html, /Compare offers beyond the headline price/);
  assert.match(html, /Plan closing/i);
  assert.match(html, /seller-workspace\.css/);
  assert.match(html, /data-static-route="\/sell"/);
  assert.doesNotMatch(html, /Enter my own value/i);
  assert.doesNotMatch(html, /No account is required to see the estimate/i);
  assert.doesNotMatch(html, /The complete estimate remains visible/i);
  assert.doesNotMatch(html, /Save this home and estimate in Snap Homes/i);
  assert.doesNotMatch(html, /1842 Harbor View Drive|data-seller-projected-result|data-seller-net-sheet-row/i);
});

test("seller document answers borrower questions and links the approved source ledger", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const record = context.recordsByRoute.get("/sell");
  const html = renderStaticRouteDocument(record, context, { siteOrigin: "https://mortgage.example" });
  const workspaceStart = html.indexOf("data-seller-workspace");
  const staticEducationStart = html.indexOf("static-seller-education");
  const faqLandmarks = html.match(/<section\b[^>]*class="[^"]*(?:seller-faq-section|static-seller-faq)[^"]*"[^>]*>/g) || [];
  const sourceLedgerLandmarks = html.match(/<section\b[^>]*class="[^"]*(?:seller-methodology|static-seller-source-ledger)[^"]*"[^>]*>/g) || [];

  assert.equal(faqLandmarks.length, 1, "the seller document must contain one FAQ landmark");
  assert.equal(sourceLedgerLandmarks.length, 1, "the seller document must contain one source-ledger landmark");
  assert.match(html, /Is the estimated home value an appraisal\?/i);
  assert.match(html, /Why can my mortgage payoff differ from my loan balance\?/i);

  for (const sourceUrl of [
    "https://www.sdarcc.gov/content/arcc/home/divisions/recorder-clerk/recording.html",
    "https://www.consumerfinance.gov/rules-policy/regulations/1026/38/",
    "https://www.consumerfinance.gov/rules-policy/regulations/1026/2020-12-28/36/",
    "https://www.boe.ca.gov/lawguides/property/current/ptlg/annt/170-0087.html",
    "https://www.nar.realtor/the-facts/what-the-nar-settlement-means-for-home-buyers-and-sellers",
  ]) {
    const sourceLinkIndex = html.indexOf(`href="${sourceUrl}"`);
    assert.ok(
      sourceLinkIndex > workspaceStart && sourceLinkIndex < staticEducationStart,
      `${sourceUrl} must be an outbound source link from renderSellerWorkspace`,
    );
  }
});

test("seller runtime loads and passes the cost registry without making unrelated fixtures required", () => {
  const appSource = fs.readFileSync(path.join(siteDir, "app.js"), "utf8");

  assert.match(appSource, /const SELLER_COST_REGISTRY_URL = "\/mock-data\/seller-cost-registry\.json";/);
  assert.match(appSource, /let sellerCostRegistry = \{\};/);
  assert.match(appSource, /fetchOptionalJson\(SELLER_COST_REGISTRY_URL\)/);
  assert.match(appSource, /renderSellerWorkspace\(page, sellerWorkspaceFixture, \{[\s\S]*?costRegistry: sellerCostRegistry,/);
  assert.match(appSource, /wireSellerWorkspace\([\s\S]*?costRegistry: sellerCostRegistry,/);
});

test("all canonical non-root documents are crawlable, substantive, and SPA-compatible", async () => {
  const { createStaticRouteContext, renderStaticRouteDocument } = await staticModule();
  const context = createStaticRouteContext(inputs);
  const records = context.manifest.filter((entry) => entry.route !== "/").map((entry) => context.recordsByRoute.get(entry.route));

  assert.equal(records.length, 882 + inputs.tagRegistry.tags.length);
  for (const record of records) {
    const html = renderStaticRouteDocument(record, context, { siteOrigin: "https://mortgage.example" });
    const metadata = context.metadataFor(record, { siteOrigin: "https://mortgage.example" });
    const h1Count = (html.match(/<h1\b/g) || []).length;
    const relatedBlock = html.match(/<nav[^>]+data-static-related-links[\s\S]*?<\/nav>/)?.[0] || "";
    const relatedRoutes = new Set([...relatedBlock.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]));

    assert.equal(h1Count, 1, `${record.entry.route} must contain exactly one h1`);
    const minimumWordCount = record.entry.type === "tag" ? 40 : 80;
    assert.ok(visibleWordCount(html) >= minimumWordCount, `${record.entry.route} must expose at least ${minimumWordCount} borrower-facing words`);
    assert.ok(relatedRoutes.size >= 3, `${record.entry.route} must expose at least three related internal links`);
    assert.match(html, /<link rel="stylesheet" href="\/site\/styles\.css"/);
    assert.match(html, /<script type="module" src="\/site\/app\.js"><\/script>/);
    assert.match(html, /<div id="app"/);
    assert.match(html, /data-content-freshness/);
    assert.match(html, /Last updated/);
    assert.match(html, /datetime="\d{4}-\d{2}-\d{2}"/);
    assert.ok(html.includes(`<title>${escapeHtml(metadata.title)}</title>`), `${record.entry.route} title must match shared metadata`);
    assert.ok(html.includes(`content="${escapeHtml(metadata.description)}"`), `${record.entry.route} description must match shared metadata`);
    assert.ok(html.includes(`href="${escapeHtml(metadata.canonical)}"`), `${record.entry.route} canonical must match shared metadata`);
    assert.doesNotMatch(html, /Loading Snap Mortgage|loading-state/i, record.entry.route);
    assert.doesNotMatch(html, /http-equiv=["']refresh|window\.location|location\.replace|href=["']#\//i, record.entry.route);
    assert.doesNotMatch(html, /Michael Thompson|snapMortgagePublicSession|prequalKey|fixture-|NMLS\s+\d/i, record.entry.route);
    const internalCopyPattern = record.entry.type === "tag"
      ? /Trust layer|Answer unlock|Content graph|Editorial graph|Branch content graph|City dashboard|Use a branch page/i
      : /Trust layer|Answer unlock|Topic guide|Content graph|Editorial graph|Branch content graph|City dashboard|Use a branch page/i;
    assert.doesNotMatch(html, internalCopyPattern, record.entry.route);
    assert.doesNotMatch(html, /Open this related Snap Mortgage resource/i, record.entry.route);
    assert.doesNotMatch(html, /Request guidance|licensed conversation/i, record.entry.route);

    if (["state", "city"].includes(record.entry.type)) {
      const locationId = record.found.item.id;
      const expectedNews = inputs.locationNewsIndex.articles.filter((article) => article.locationId === locationId);
      const linkedNewsRoutes = [...html.matchAll(/data-static-location-news-card[\s\S]*?href="(\/learning-center\/market-news\/[^"]+)"/g)]
        .map((match) => match[1]);

      assert.match(html, currentDataWarningPattern, record.entry.route);
      assert.doesNotMatch(html, /seeded?|connected market-data|connected market data|public release|public reliance|provenance|planning assumption/i, record.entry.route);
      assert.equal((html.match(/data-static-location-news-card/g) || []).length, 4, `${record.entry.route} must expose four location-news cards`);
      assert.equal(expectedNews.length, 4, `${record.entry.route} must have four indexed articles`);
      for (const article of expectedNews) {
        assert.ok(html.includes(`href="${escapeHtml(article.route)}"`), `${record.entry.route} must link ${article.route}`);
        assert.equal(fs.existsSync(path.join(repoRoot, article.standalonePath)), true, `${article.route} must have a generated target`);
      }
      assert.ok(linkedNewsRoutes.length >= 4, `${record.entry.route} must expose crawlable news links`);
      assert.doesNotMatch(html, /current structured snapshot|current snapshot is dated/i, record.entry.route);
      assert.match(html, /data-freshness-basis="factual-audit-date"/, record.entry.route);
      assert.doesNotMatch(html, /data-freshness-basis="(?:market-snapshot-last-updated|governing-evidence-date)"/, record.entry.route);
    }

    for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:css|js|mjs|png|jpe?g|webp|svg)(?:\?[^\"]*)?)"/gi)) {
      assert.match(match[1], /^(?:\/|https?:\/\/|data:)/, `${record.entry.route} has a relative asset ${match[1]}`);
    }
  }
});

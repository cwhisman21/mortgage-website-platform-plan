import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { formatDate, renderArticleContent } from "./news-renderer.mjs";
import { renderArticleDocument } from "./location-news-static.mjs";

const contributorRegistry = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/contributors.json", import.meta.url), "utf8"),
).contributors;
const mayaBrooks = contributorRegistry.find((contributor) => contributor.id === "contributor-maya-brooks");

const article = {
  title: "Austin housing costs in context",
  dek: "A sourced look at housing costs and planning questions.",
  relevanceLabel: "Housing costs",
  authorId: "contributor-maya-brooks",
  publishedAt: "2026-07-10",
  sections: [{ heading: "What the data shows", paragraphs: ["The published estimates provide a broad market reference."] }],
  ctaPlacements: [{ route: "/calculators/mortgage-payment", label: "Estimate a payment", title: "Put the figures in context" }],
  sourceRecords: [{ sourceUrl: "https://api.census.gov/data/2024/acs/acs5", citationLabel: "U.S. Census Bureau" }],
  relatedRoutes: [{ route: "/locations/texas/austin", label: "Austin mortgage guide" }]
};

const media = {
  imageUrl: "https://images.pexels.com/photos/5071177/pexels-photo-5071177.jpeg",
  photoPageUrl: "https://www.pexels.com/photo/photo-of-a-house-exterior-5071177/",
  photographer: "Curtis Adams",
  provider: "Pexels",
  alt: "House exterior"
};

test("renders route-based contextual CTAs and linked stock attribution", () => {
  const html = renderArticleContent(article, media);
  assert.match(html, /href="\/calculators\/mortgage-payment"/);
  assert.match(html, /href="https:\/\/www\.pexels\.com\/photo\/photo-of-a-house-exterior-5071177\/"/);
  assert.match(html, />Curtis Adams</);
});

test("renders a linked contributor headshot, name, and UTC-safe publication date", () => {
  const html = renderArticleContent(article, media, { author: mayaBrooks });

  assert.match(html, /class="[^"]*editorial-byline/);
  assert.match(html, /href="\/learning-center\/authors\/maya-brooks"/);
  assert.match(html, /src="\/site\/assets\/contributors\/maya-brooks\.jpg"/);
  assert.match(html, /alt="Maya Brooks, Snap Mortgage editorial contributor"/);
  assert.match(html, />Maya Brooks</);
  assert.match(html, /Published July 10, 2026/);
  assert.doesNotMatch(html, /July 9, 2026/);
});

test("formats date-only article values in UTC", () => {
  assert.equal(formatDate("2026-07-10"), "July 10, 2026");
});

test("drops unsafe URL schemes from article links and images", () => {
  const html = renderArticleContent({
    ...article,
    ctaPlacements: [{ href: "javascript:alert(1)", label: "Unsafe" }],
    sourceRecords: [{ sourceUrl: "javascript:alert(2)", citationLabel: "Unsafe source" }],
    relatedRoutes: [{ route: "data:text/html,unsafe", label: "Unsafe related" }]
  }, { ...media, imageUrl: "javascript:alert(3)", photoPageUrl: "javascript:alert(4)" });
  assert.doesNotMatch(html, /javascript:|data:text\/html/);
});

test("keeps internal review statuses out of borrower-facing article metadata", () => {
  const html = renderArticleContent({ ...article, reviewStatus: "editorial_review_required" }, media);
  assert.doesNotMatch(html, /editorial_review_required/);
});

test("prefers approved local image mirrors over remote stock URLs", () => {
  const html = renderArticleContent(article, { ...media, localPath: "/site/assets/news/pexels-5071177.jpeg" });
  assert.match(html, /src="\/site\/assets\/news\/pexels-5071177\.jpeg"/);
});

test("does not emit trailing whitespace in rendered article markup", () => {
  const html = renderArticleContent({
    title: "Whitespace-free article",
    sections: [{ heading: "What the data shows", paragraphs: ["A concise public-data summary."] }]
  }, {});

  assert.doesNotMatch(html, /[ \t]+\r?\n/);
});

test("does not emit trailing whitespace in standalone article documents", () => {
  const html = renderArticleDocument({
    title: "Whitespace-free standalone article",
    route: "/learning-center/market-news/whitespace-free",
    sections: []
  }, {});

  assert.doesNotMatch(html, /[ \t]+\r?\n/);
});

test("standalone documents render the contributor byline and linked Person JSON-LD", () => {
  const siteOrigin = "https://example.snap.test";
  const html = renderArticleDocument(
    { ...article, route: "/learning-center/market-news/austin-housing-costs" },
    media,
    { siteOrigin, author: mayaBrooks },
  );

  assert.match(html, /href="\/learning-center\/authors\/maya-brooks"/);
  assert.match(html, /src="\/site\/assets\/contributors\/maya-brooks\.jpg"/);
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(jsonLdMatch, "missing Article JSON-LD");
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.deepEqual(jsonLd.author, {
    "@type": "Person",
    name: "Maya Brooks",
    url: "https://example.snap.test/learning-center/authors/maya-brooks",
    image: "https://example.snap.test/site/assets/contributors/maya-brooks.jpg",
  });
});

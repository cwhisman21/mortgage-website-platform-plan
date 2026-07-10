import test from "node:test";
import assert from "node:assert/strict";
import { renderArticleContent } from "./news-renderer.mjs";
import { renderArticleDocument } from "./location-news-static.mjs";

const article = {
  title: "Austin housing costs in context",
  dek: "A sourced look at housing costs and planning questions.",
  relevanceLabel: "Housing costs",
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

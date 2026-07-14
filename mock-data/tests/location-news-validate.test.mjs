import test from "node:test";
import assert from "node:assert/strict";

import { composeCityArticles } from "../location-news/lib/compose.mjs";
import { numericClaims, validateArticle, validateCorpus } from "../location-news/lib/validate.mjs";
import { cityFixture } from "./fixtures/location-news-fixtures.mjs";

const validArticleFixture = composeCityArticles(cityFixture)[0];
const validAuthorId = "contributor-maya-brooks";

test("extracts complete currency and percentage claims without overlapping fragments", () => {
  assert.deepEqual(
    numericClaims("The published limit is $1,039,375 and the cited change is -0.6%."),
    ["$1,039,375", "-0.6%"],
  );
});

test("accepts a complete evidence-backed article", () => {
  assert.doesNotThrow(() => validateArticle({ ...validArticleFixture, authorId: validAuthorId }));
});

test("rejects an article without an authorId", () => {
  const article = structuredClone(validArticleFixture);
  delete article.authorId;
  assert.throws(() => validateArticle(article), /authorId/i);
});

test("rejects an authorId that is not in the contributor registry", () => {
  const article = { ...structuredClone(validArticleFixture), authorId: "contributor-unknown" };
  assert.throws(() => validateArticle(article), /authorId|contributor registry|unknown contributor/i);
});

test("rejects unsupported numbers", () => {
  const article = structuredClone(validArticleFixture);
  article.sections[0].body.push("The local value is $999,999.");
  assert.throws(() => validateArticle(article), /numeric claim.*999,999/i);
});

test("accepts a cited negative percentage using the article display rounding", () => {
  const article = structuredClone(validArticleFixture);
  const fact = article.evidenceFacts.find((item) => item.id === "home-value-change");
  const previousDisplay = fact.display;
  fact.display = "-0.6%";
  article.sourceRecords[0].estimate = -0.57;
  for (const section of article.sections) {
    section.body = section.body.map((paragraph) => paragraph.replaceAll(previousDisplay, fact.display));
  }
  assert.doesNotThrow(() => validateArticle(article));
});

test("rejects borrower-facing scaffold language", () => {
  const article = structuredClone(validArticleFixture);
  article.sections[0].body.push("This section should explain the local market later.");
  assert.throws(() => validateArticle(article), /scaffold/i);
});

test("rejects duplicated substantive paragraphs", () => {
  const first = structuredClone(validArticleFixture);
  const second = structuredClone(validArticleFixture);
  second.id = "second";
  second.route = "/learning-center/market-news/second";
  second.title = "Second evidence article";
  assert.throws(() => validateCorpus([first, second]), /duplicate substantive paragraph/i);
});

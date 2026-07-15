import test from "node:test";
import assert from "node:assert/strict";

import { composeCityArticles } from "../location-news/lib/compose.mjs";
import { numericClaims, validateArticle, validateCorpus, validateCorpusSimilarity } from "../location-news/lib/validate.mjs";
import { cityFixture as baseCityFixture } from "./fixtures/location-news-fixtures.mjs";

const cityFixture = structuredClone(baseCityFixture);
cityFixture.census.current.metrics.medianOwnerCostWithMortgage.variableOrSeriesId = "B25088_002E";
cityFixture.relatedRoutes = [
  { route: "/locations/texas", label: "Texas mortgage and housing guide" },
  { route: "/loan-options", label: "Loan options" },
  { route: "/loan-options/conventional-loans", label: "Conventional loans" },
  { route: "/loan-options/fha-loans", label: "FHA loans" },
  { route: "/calculators/affordability", label: "Affordability calculator" },
  { route: "/rates", label: "Mortgage rates" },
];

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

test("requires evidence-derived asOf and sourcePeriod fields", () => {
  const missingAsOf = structuredClone(validArticleFixture);
  delete missingAsOf.asOf;
  assert.throws(() => validateArticle(missingAsOf), /asOf/i);

  const missingSourcePeriod = structuredClone(validArticleFixture);
  delete missingSourcePeriod.sourcePeriod;
  assert.throws(() => validateArticle(missingSourcePeriod), /sourcePeriod/i);

  const unboundSourcePeriod = { ...structuredClone(validArticleFixture), sourcePeriod: "2099Q4" };
  assert.throws(() => validateArticle(unboundSourcePeriod), /sourcePeriod|governing evidence/i);
});

test("rejects an article that has not cleared publication review", () => {
  const article = { ...structuredClone(validArticleFixture), reviewStatus: "editorial_review_required" };
  assert.throws(() => validateArticle(article), /not approved for publication/i);
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
  const context = structuredClone(cityFixture);
  context.census.prior.metrics.vacantUnits.estimate = context.census.current.metrics.vacantUnits.estimate * 2;
  const article = composeCityArticles(context).find((item) => item.articleType === "housing_supply_tenure");
  assert.match(article.evidenceFacts.find((item) => item.id === "vacancy-count-change").display, /^-/);
  assert.doesNotThrow(() => validateArticle(article));
});

test("rejects borrower-facing scaffold language", () => {
  const article = structuredClone(validArticleFixture);
  article.sections[0].body.push("This section should explain the local market later.");
  assert.throws(() => validateArticle(article), /scaffold/i);
});

test("rejects internal generator language in borrower-visible copy", () => {
  const article = structuredClone(validArticleFixture);
  article.methodology += " No missing figure is replaced with an estimate created by this generator.";
  assert.throws(() => validateArticle(article), /internal|generator|borrower-visible/i);
});

test("rejects raw source IDs and URLs in borrower-visible fields", () => {
  const article = structuredClone(validArticleFixture);
  article.tables[0].rows[0][2] = article.sourceRecords[0].sourceId;
  article.relatedRoutes = [{ route: "/loan-options", label: "https://internal.example/source" }];
  assert.throws(() => validateArticle(article), /source id|raw url|borrower-visible|related/i);
});

test("rejects dead routes and unsupported option-comparison copy", () => {
  const article = structuredClone(validArticleFixture);
  article.relatedRoutes = [{ route: "/loan-options/conventional", label: "Conventional loans" }, { route: "/loan-options", label: "Loan options" }];
  article.ctaPlacements[0].label = "Compare verified loan options";
  assert.throws(() => validateArticle(article), /dead route|verified loan options|unsupported/i);
});

test("rejects descriptions without a complete sentence ending", () => {
  const article = structuredClone(validArticleFixture);
  article.metaDescription = "Austin housing evidence and practical mortgage questions that end midwo";
  assert.throws(() => validateArticle(article), /meta description/i);
});

test("rejects a punctuated but clipped meta description", () => {
  const article = structuredClone(validArticleFixture);
  article.metaDescription = `${article.previewText.slice(0, article.previewText.lastIndexOf(" ", 80))}.`;
  assert.throws(() => validateArticle(article), /meta description|complete authored sentence/i);
});

test("rejects double-qualified locations and signed directional prose", () => {
  const doubled = structuredClone(validArticleFixture);
  doubled.previewText = "See the evidence for Austin, TX, TX's housing market.";
  doubled.metaDescription = doubled.previewText;
  assert.throws(() => validateArticle(doubled), /location|state|qualified|construction/i);

  const labor = composeCityArticles(cityFixture).find((item) => item.articleType === "local_labor_market");
  labor.sections[3].body[0] += " The cited unemployment-rate change fell -0.2%.";
  assert.throws(() => validateArticle(labor), /signed|direction|natural/i);
});

test("requires percentage-point units for unemployment-rate deltas", () => {
  const labor = composeCityArticles(cityFixture).find((item) => item.articleType === "local_labor_market");
  const delta = labor.evidenceFacts.find((fact) => fact.id === "annual-rate-change");
  delta.display = "-0.2%";
  assert.throws(() => validateArticle(labor), /percentage points|unemployment-rate delta/i);
});

test("requires each analysis section to bind its local evidence", () => {
  const article = structuredClone(validArticleFixture);
  delete article.sections[0].evidenceFactIds;
  assert.throws(() => validateArticle(article), /evidence binding|local evidence/i);
});

test("rejects repetitive evidence recitation in labor and HPI leads", () => {
  const article = composeCityArticles(cityFixture).find((item) => item.articleType === "local_labor_market");
  const rate = article.evidenceFacts.find((fact) => fact.id === "unemployment-rate").display;
  article.sections[0].body[0] += ` The same ${rate} figure is ${rate}, then ${rate}, and then ${rate} again.`;
  assert.throws(() => validateArticle(article), /repeat|recitation|evidence figure/i);
});

test("rejects duplicated substantive paragraphs", () => {
  const first = structuredClone(validArticleFixture);
  const second = structuredClone(validArticleFixture);
  second.id = "second";
  second.route = "/learning-center/market-news/second";
  second.title = "Second evidence article";
  second.metaDescription = "Second evidence article with a distinct local market description.";
  second.previewText = second.metaDescription;
  assert.throws(() => validateCorpus([first, second]), /duplicate substantive paragraph/i);
});

test("rejects a materially homogeneous same-type article group", () => {
  const repetitive = Array.from({ length: 24 }, (_, index) => ({
    id: `repetitive-${index}`,
    locationId: `city-example-${index}`,
    articleType: "affordability_home_values",
    title: `Example ${index} home values, income, and owner costs`,
    evidenceFacts: [],
    sections: Array.from({ length: 6 }, (__, sectionIndex) => ({
      id: `beat-${sectionIndex}`,
      heading: `Shared evidence heading ${sectionIndex}`,
      body: ["The same borrower explanation and next action appear in every generated article without meaningful sentence or structural variation."],
    })),
  }));

  assert.throws(() => validateCorpusSimilarity(repetitive), /similarity|structural signatures/i);
});

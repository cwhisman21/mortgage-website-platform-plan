import test from "node:test";
import assert from "node:assert/strict";

import { composeCityArticles, composeStateArticles } from "../location-news/lib/compose.mjs";
import { cityFixture, stateFixture } from "./fixtures/location-news-fixtures.mjs";

const expectedAuthorByType = new Map([
  ["affordability_home_values", "contributor-maya-brooks"],
  ["housing_supply_tenure", "contributor-maya-brooks"],
  ["state_home_price_movement", "contributor-maya-brooks"],
  ["state_housing_costs", "contributor-maya-brooks"],
  ["local_labor_market", "contributor-rowan-hale"],
  ["state_labor_market", "contributor-rowan-hale"],
  ["county_loan_limits", "contributor-marcus-lane"],
  ["state_loan_limit_landscape", "contributor-marcus-lane"],
]);

function assertComplete(articles, expectedTypes, locationId) {
  assert.equal(articles.length, 4);
  assert.deepEqual(new Set(articles.map((article) => article.articleType)), new Set(expectedTypes));
  for (const article of articles) {
    const words = article.sections.flatMap((section) => section.body).join(" ").split(/\s+/).filter(Boolean).length;
    assert.equal(article.locationId, locationId);
    assert.match(article.route, /^\/learning-center\/market-news\/[a-z0-9-]+$/);
    assert.ok(article.sourceRecords.length >= 4, article.id);
    assert.ok(article.evidenceFacts.length >= 4, article.id);
    assert.ok(article.evidenceFacts.some((fact) => fact.comparison), article.id);
    assert.ok(words >= 600 && words <= 900, `${article.id} has ${words} words`);
    assert.ok(article.visuals.length >= 1, article.id);
    assert.ok(article.tables.length >= 1, article.id);
    assert.ok(article.imageId, article.id);
    assert.equal(article.authorId, expectedAuthorByType.get(article.articleType), `${article.id} author`);
    assert.equal(article.reviewStatus, "editorial_reviewed", `${article.id} editorial status`);
    assert.equal(article.complianceStatus, "compliance_approved", `${article.id} compliance status`);
    assert.ok(article.metaDescription.length <= 160, `${article.id} meta description length`);
    assert.match(article.metaDescription, /[.!?]$/, `${article.id} meta description ending`);
    for (const section of article.sections) {
      assert.ok(section.evidenceFactIds?.length >= 2, `${article.id} ${section.id} evidence bindings`);
      const body = section.body.join(" ");
      const boundFacts = section.evidenceFactIds.map((id) => article.evidenceFacts.find((fact) => fact.id === id));
      assert.ok(boundFacts.every(Boolean), `${article.id} ${section.id} unknown evidence fact`);
      assert.ok(boundFacts.some((fact) => body.includes(fact.display)), `${article.id} ${section.id} missing evidence value`);
    }
  }
}

test("composes four complete and distinct Austin articles", () => {
  assertComplete(composeCityArticles(cityFixture), ["affordability_home_values", "housing_supply_tenure", "local_labor_market", "county_loan_limits"], "city-austin-tx");
});

test("uses the supplied county-equivalent FIPS in city loan-limit source records", () => {
  const context = {
    ...cityFixture,
    location: {
      ...cityFixture.location,
      id: "city-new-haven-ct",
      name: "New Haven",
      sourceGeography: { ...cityFixture.location.sourceGeography, countyFips: "09009", countyName: "New Haven" },
    },
    state: { ...cityFixture.state, id: "state-ct", name: "Connecticut", abbr: "CT" },
    limitCountyFips: "09170",
    limits: {
      conforming: { ...cityFixture.limits.conforming, countyFips: "09170" },
      fha: { ...cityFixture.limits.fha, countyFips: "09170" },
    },
  };
  const article = composeCityArticles(context).find((item) => item.articleType === "county_loan_limits");
  assert.ok(article);
  assert.ok(article.sourceRecords.every((record) => record.geographyId === "09170"));
  assert.match(article.title, /^New Haven, CT loan limits:/);
});

test("adds a state qualifier to each city article title", () => {
  const california = {
    ...cityFixture,
    location: { ...cityFixture.location, id: "city-glendale-ca", name: "Glendale" },
    state: { ...cityFixture.state, id: "state-ca", name: "California", abbr: "CA" },
  };
  const arizona = {
    ...cityFixture,
    location: { ...cityFixture.location, id: "city-glendale-az", name: "Glendale" },
    state: { ...cityFixture.state, id: "state-az", name: "Arizona", abbr: "AZ" },
  };
  const californiaTitle = composeCityArticles(california)[0].title;
  const arizonaTitle = composeCityArticles(arizona)[0].title;
  assert.match(californiaTitle, /^Glendale, CA /);
  assert.match(arizonaTitle, /^Glendale, AZ /);
  assert.notEqual(californiaTitle, arizonaTitle);
  assert.match(composeCityArticles(california)[0].sections[0].body[0], /Glendale, CA/);
  assert.match(composeCityArticles(arizona)[0].sections[0].body[0], /Glendale, AZ/);
});

test("composes four complete and distinct Texas articles", () => {
  const articles = composeStateArticles(stateFixture);
  assertComplete(articles, ["state_home_price_movement", "state_labor_market", "state_housing_costs", "state_loan_limit_landscape"], "state-tx");
  const housingVariables = new Set(
    articles
      .find((article) => article.articleType === "state_housing_costs")
      .sourceRecords.map((record) => record.variableOrSeriesId),
  );
  for (const variable of ["B25001_001E", "B25003_002E", "B25064_001E", "B25077_001E", "B25088_002E"]) {
    assert.ok(housingVariables.has(variable), `state housing article missing ${variable}`);
  }
  assert.ok(!housingVariables.has("B25103_001E"), "state housing article relabeled median real estate taxes as owner costs");
});

test("honors the BLS geography type for District of Columbia state series", () => {
  const context = {
    ...stateFixture,
    location: { ...stateFixture.location, id: "state-dc", name: "District of Columbia", abbr: "DC" },
    bls: { ...stateFixture.bls, geographyType: "state", geographyId: "CN1100100000000" },
  };
  const article = composeStateArticles(context).find((item) => item.articleType === "state_labor_market");
  assert.ok(article);
  assert.ok(article.sourceRecords.every((record) => record.geographyType === "state"));
});

test("keeps audit identifiers internal and emits canonical borrower-facing actions", () => {
  const articles = [...composeCityArticles(cityFixture), ...composeStateArticles(stateFixture)];
  for (const article of articles) {
    for (const source of article.sourceRecords) {
      assert.doesNotMatch(source.citationLabel, /\b[A-Z]\d{5}_\d{3}[EM]\b/, `${article.id} raw variable label`);
      assert.match(source.citationLabel, new RegExp(source.publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${article.id} source attribution`);
    }
    for (const table of article.tables) {
      for (const row of table.rows) {
        assert.doesNotMatch(String(row[2]), /(?:^|,)news-[a-z0-9-]+-source-/i, `${article.id} raw table source id`);
        assert.doesNotMatch(String(row[2]), /^https?:\/\//i, `${article.id} raw table URL`);
      }
    }
    for (const cta of article.ctaPlacements) {
      assert.notEqual(cta.label, "Compare verified loan options");
      assert.equal(cta.route, "/loan-options");
    }
    const related = article.relatedRoutes.map((item) => typeof item === "string" ? { route: item, label: item } : item);
    assert.ok(related.some((item) => item.route === "/loan-options/conventional-loans"), `${article.id} conventional route`);
    assert.ok(related.some((item) => item.route === "/loan-options/fha-loans"), `${article.id} FHA route`);
    assert.ok(related.every((item) => item.label && !item.label.startsWith("/") && !/^https?:\/\//.test(item.label)), `${article.id} borrower-facing related labels`);
    assert.ok(!related.some((item) => ["/loan-options/conventional", "/loan-options/fha"].includes(item.route)), `${article.id} dead related route`);
    assert.doesNotMatch(article.methodology, /created by this generator|source identifiers|structured source records/i);
  }
});

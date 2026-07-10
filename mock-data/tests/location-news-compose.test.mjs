import test from "node:test";
import assert from "node:assert/strict";

import { composeCityArticles, composeStateArticles } from "../location-news/lib/compose.mjs";
import { cityFixture, stateFixture } from "./fixtures/location-news-fixtures.mjs";

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
  for (const variable of ["B25001_001E", "B25003_002E", "B25064_001E", "B25077_001E", "B25103_001E"]) {
    assert.ok(housingVariables.has(variable), `state housing article missing ${variable}`);
  }
});

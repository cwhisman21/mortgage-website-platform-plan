import test from "node:test";
import assert from "node:assert/strict";

import { composeCityArticles, composeStateArticles } from "../location-news/lib/compose.mjs";
import { cityFixture as baseCityFixture, stateFixture as baseStateFixture } from "./fixtures/location-news-fixtures.mjs";

function productionIntegrityFixture(fixture, localRoute, localLabel) {
  const context = structuredClone(fixture);
  for (const census of Object.values(context.census)) {
    if (census?.metrics?.medianOwnerCostWithMortgage) {
      census.metrics.medianOwnerCostWithMortgage.variableOrSeriesId = "B25088_002E";
    }
  }
  context.relatedRoutes = [
    { route: localRoute, label: localLabel },
    { route: "/loan-options", label: "Loan options" },
    { route: "/loan-options/conventional-loans", label: "Conventional loans" },
    { route: "/loan-options/fha-loans", label: "FHA loans" },
    { route: "/calculators/affordability", label: "Affordability calculator" },
    { route: "/rates", label: "Mortgage rates" },
  ];
  return context;
}

const cityFixture = productionIntegrityFixture(baseCityFixture, "/locations/texas", "Texas mortgage and housing guide");
const stateFixture = productionIntegrityFixture(baseStateFixture, "/locations/texas/austin", "Austin mortgage and housing guide");

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
    assert.ok(article.asOf, `${article.id} asOf`);
    assert.ok(article.sourcePeriod, `${article.id} sourcePeriod`);
    assert.ok(article.sourceRecords.some((record) => record.period === article.sourcePeriod), `${article.id} governing source period`);
    assert.equal(article.keyTakeaways[0], `As of: ${article.asOf}. Source period: ${article.sourcePeriod}.`, `${article.id} visible evidence period`);
    assert.ok(article.evidenceFacts.length >= 4, article.id);
    assert.ok(article.evidenceFacts.some((fact) => fact.comparison), article.id);
    assert.equal(article.sections.length, 6, `${article.id} content beats`);
    assert.ok(words >= 600 && words <= 900, `${article.id} has ${words} words`);
    assert.ok(article.visuals.length >= 1, article.id);
    assert.ok(article.tables.length >= 1, article.id);
    assert.ok(article.imageId, article.id);
    assert.equal(article.authorId, expectedAuthorByType.get(article.articleType), `${article.id} author`);
    assert.equal(article.reviewStatus, "editorial_reviewed", `${article.id} editorial status`);
    assert.equal(article.complianceStatus, "compliance_approved", `${article.id} compliance status`);
    assert.ok(article.metaDescription.length <= 160, `${article.id} meta description length`);
    assert.match(article.metaDescription, /[.!?]$/, `${article.id} meta description ending`);
    assert.equal(article.metaDescription, article.previewText, `${article.id} meta description must use a complete authored sentence`);
    const opening = article.sections[0].body.join(" ");
    const usefulnessIndex = opening.search(/\b(?:can|helps?|useful|informs?|frames?|shows?|organizes?|identifies?|supports?|guides?|may matter)\b/i);
    const limitationIndex = opening.search(/\b(?:cannot|does not|do not|not a|not the|should not|rather than|too broad)\b/i);
    assert.ok(usefulnessIndex >= 0, `${article.id} opening does not explain what the evidence can inform`);
    assert.ok(limitationIndex < 0 || usefulnessIndex < limitationIndex, `${article.id} opening leads with limitations before borrower use`);
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

test("uses correct articles and answer-first pacing for Alabama labor and HPI updates", () => {
  const context = {
    ...stateFixture,
    location: { ...stateFixture.location, id: "state-al", name: "Alabama", abbr: "AL", route: "/locations/alabama" },
  };
  const articles = composeStateArticles(context);
  const labor = articles.find((article) => article.articleType === "state_labor_market");
  const hpi = articles.find((article) => article.articleType === "state_home_price_movement");

  assert.equal(labor.sourcePeriod, "2026-M05");
  assert.equal(labor.asOf, "May 2026");
  assert.equal(labor.sections[0].id, "monthly-movement");
  assert.match(labor.sections[0].body[0], /May 2026.*Alabama's unemployment rate .*3\.4%.*April 2026.*3\.5%.*May 2026/i);
  assert.match(labor.sections[0].body[0], /mortgage plan|documented income|borrower/i);

  assert.equal(hpi.sourcePeriod, "2026Q1");
  assert.equal(hpi.asOf, "2026 Q1");
  assert.equal(hpi.sections[0].id, "short-and-annual");
  assert.match(hpi.sections[0].body[0], /2026 Q1.*Alabama's .*1\.2%.*quarter.*3\.8%.*year/i);
  assert.match(hpi.sections[0].body[0], /search|payment|property|borrower/i);

  const copy = articles.flatMap((article) => article.sections.flatMap((section) => section.body)).join(" ");
  assert.doesNotMatch(copy, /\ba Alabama\b/i);
  assert.match(copy, /\ban Alabama (?:borrower|labor market|search plan)\b/i);
});

test("qualifies city references once and formats negative movements naturally", () => {
  const cityContext = {
    ...cityFixture,
    location: { ...cityFixture.location, id: "city-orlando-fl", name: "Orlando", route: "/locations/florida/orlando" },
    state: { ...cityFixture.state, id: "state-fl", name: "Florida", abbr: "FL", route: "/locations/florida" },
    bls: {
      ...cityFixture.bls,
      latest: { ...cityFixture.bls.latest, unemploymentRate: 3.1 },
      previous: { ...cityFixture.bls.previous, unemploymentRate: 3.5 },
      yearAgo: { ...cityFixture.bls.yearAgo, unemploymentRate: 4.5 },
    },
  };
  const labor = composeCityArticles(cityContext).find((article) => article.articleType === "local_labor_market");
  const laborCopy = [labor.title, labor.dek, labor.previewText, ...labor.sections.flatMap((section) => section.body)].join(" ");
  assert.doesNotMatch(laborCopy, /Orlando, FL, FL's/i);
  assert.equal(labor.evidenceFacts.find((fact) => fact.id === "monthly-rate-change").display, "-0.4 percentage points");
  assert.equal(labor.evidenceFacts.find((fact) => fact.id === "annual-rate-change").display, "-1.4 percentage points");
  assert.match(laborCopy, /fell from 3\.5% in April 2026 to 3\.1% in May 2026, a change of 0\.4 percentage points/i);
  assert.match(laborCopy, /fell from 4\.5% in May 2025 to 3\.1%, a change of 1\.4 percentage points/i);
  assert.doesNotMatch(laborCopy, /\b(?:fell|rose|increased|decreased|declined|grew)\s+-/i);
  assert.doesNotMatch(laborCopy, /\b(?:favorable|unfavorable)\b/i);

  const stateContext = {
    ...stateFixture,
    hpi: { ...stateFixture.hpi, quarterlyChange: -1.4, annualChange: -2.1 },
  };
  const hpi = composeStateArticles(stateContext).find((article) => article.articleType === "state_home_price_movement");
  const hpiCopy = hpi.sections.flatMap((section) => section.body).join(" ");
  assert.match(hpiCopy, /fell 1\.4%/i);
  assert.match(hpiCopy, /fell 2\.1%/i);
  assert.doesNotMatch(hpiCopy, /\b(?:fell|rose|increased|decreased|declined|grew)\s+-/i);
});

test("presents 2019 and 2024 ACS home values as non-comparable nominal observations", () => {
  for (const article of [
    composeCityArticles(cityFixture).find((item) => item.articleType === "affordability_home_values"),
    composeStateArticles(stateFixture).find((item) => item.articleType === "state_housing_costs"),
  ]) {
    const copy = article.sections.flatMap((section) => section.body).join(" ");
    assert.ok(!article.evidenceFacts.some((fact) => fact.id === "home-value-change"), `${article.id} precise home-value change fact`);
    assert.match(copy, /2019 ACS/i, `${article.id} 2019 observation`);
    assert.match(copy, /2024 ACS/i, `${article.id} 2024 observation`);
    assert.match(copy, /not inflation-adjusted/i, `${article.id} inflation limitation`);
    assert.match(copy, /methodolog/i, `${article.id} methodology limitation`);
    assert.doesNotMatch(copy, /home-value estimate[^.]{0,120}(?:change|increas|decreas)[^.]{0,80}\d+(?:\.\d+)?%/i, `${article.id} precise cross-vintage change`);
  }
});

test("varies same-type article structure deterministically across locations", () => {
  const contexts = [
    ["city-austin-tx", "Austin", "TX"],
    ["city-orlando-fl", "Orlando", "FL"],
    ["city-phoenix-az", "Phoenix", "AZ"],
    ["city-tacoma-wa", "Tacoma", "WA"],
    ["city-madison-wi", "Madison", "WI"],
    ["city-boise-id", "Boise", "ID"],
  ].map(([id, name, abbr]) => ({
    ...cityFixture,
    location: { ...cityFixture.location, id, name, route: `/locations/example/${id.replace(/^city-/, "")}` },
    state: { ...cityFixture.state, id: `state-${abbr.toLowerCase()}`, name: `${abbr} state`, abbr, route: `/locations/${abbr.toLowerCase()}` },
  }));
  const articles = contexts.map((context) => composeCityArticles(context).find((article) => article.articleType === "housing_supply_tenure"));
  const signatures = articles.map((article) => article.sections.map((section) => `${section.id}:${section.heading}`).join("|"));
  assert.ok(new Set(signatures).size >= 4, `only ${new Set(signatures).size} structural variants`);

  const rerendered = composeCityArticles(contexts[2]).find((article) => article.articleType === "housing_supply_tenure");
  assert.deepEqual(rerendered.sections, articles[2].sections, "variation must be deterministic for the same location and evidence");
});

test("does not split generic explanation into duplicate substantive paragraphs", () => {
  const contexts = [
    ["state-az", "Arizona", "AZ"],
    ["state-ar", "Arkansas", "AR"],
  ].map(([id, name, abbr]) => ({
    ...stateFixture,
    location: { ...stateFixture.location, id, name, abbr, route: `/locations/${name.toLowerCase()}` },
  }));
  const articles = contexts.map((context) => composeStateArticles(context).find((article) => article.articleType === "state_home_price_movement"));
  const substantiveParagraphs = (article) => article.sections.flatMap((section) => section.body)
    .filter((paragraph) => paragraph.split(/\s+/).length >= 35);
  const firstParagraphs = new Set(substantiveParagraphs(articles[0])
    .map((paragraph) => paragraph.toLowerCase().replace(/\s+/g, " ").trim()));
  const duplicate = substantiveParagraphs(articles[1])
    .map((paragraph) => paragraph.toLowerCase().replace(/\s+/g, " ").trim())
    .find((paragraph) => firstParagraphs.has(paragraph));

  assert.equal(duplicate, undefined);
});

test("keeps same-county loan-limit paragraphs local to each city", () => {
  const contexts = [
    ["city-glendale-az", "Glendale"],
    ["city-peoria-az", "Peoria"],
  ].map(([id, name]) => ({
    ...cityFixture,
    location: { ...cityFixture.location, id, name, route: `/locations/arizona/${name.toLowerCase()}` },
    state: { ...cityFixture.state, id: "state-az", name: "Arizona", abbr: "AZ", route: "/locations/arizona" },
  }));
  const articles = contexts.map((context) => composeCityArticles(context).find((article) => article.articleType === "county_loan_limits"));
  const normalized = (article) => article.sections.flatMap((section) => section.body)
    .filter((paragraph) => paragraph.split(/\s+/).length >= 35)
    .map((paragraph) => paragraph.toLowerCase().replace(/\s+/g, " ").trim());
  const firstParagraphs = new Set(normalized(articles[0]));

  assert.equal(normalized(articles[1]).find((paragraph) => firstParagraphs.has(paragraph)), undefined);
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

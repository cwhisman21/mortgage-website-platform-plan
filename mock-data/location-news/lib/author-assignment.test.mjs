import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contributors = JSON.parse(
  fs.readFileSync(new URL("../../editorial/contributors.json", import.meta.url), "utf8"),
).contributors;
const validContributorIds = new Set(contributors.map((contributor) => contributor.id));

const loadAssignment = () => import("./author-assignment.mjs");

const exactAssignments = new Map([
  ["affordability_home_values", "contributor-maya-brooks"],
  ["housing_supply_tenure", "contributor-maya-brooks"],
  ["state_home_price_movement", "contributor-maya-brooks"],
  ["state_housing_costs", "contributor-maya-brooks"],
  ["local_labor_market", "contributor-rowan-hale"],
  ["state_labor_market", "contributor-rowan-hale"],
  ["county_loan_limits", "contributor-marcus-lane"],
  ["state_loan_limit_landscape", "contributor-marcus-lane"],
]);

test("assigns every current location-news article type to its approved contributor", async () => {
  const { authorIdForLocationNews } = await loadAssignment();

  for (const [articleType, expectedAuthorId] of exactAssignments) {
    const actual = authorIdForLocationNews({ articleType, topicIds: [] });
    assert.equal(actual, expectedAuthorId, articleType);
    assert.ok(validContributorIds.has(actual), `${articleType} returned an unknown contributor`);
  }
});

test("uses the approved ordered topic fallbacks before the Maya Brooks default", async () => {
  const { authorIdForLocationNews } = await loadAssignment();
  const expectedByTopic = new Map([
    ["tax", "contributor-priya-bennett"],
    ["insurance", "contributor-priya-bennett"],
    ["methodology", "contributor-priya-bennett"],
    ["data", "contributor-priya-bennett"],
    ["source", "contributor-priya-bennett"],
    ["chart", "contributor-priya-bennett"],
    ["refinance", "contributor-elena-park"],
    ["equity", "contributor-elena-park"],
    ["cash-out", "contributor-elena-park"],
    ["breakeven", "contributor-elena-park"],
    ["buying", "contributor-jordan-avery"],
    ["first-time", "contributor-jordan-avery"],
    ["down-payment", "contributor-jordan-avery"],
    ["purchase-readiness", "contributor-jordan-avery"],
    ["offers", "contributor-jordan-avery"],
  ]);

  for (const [topicId, expectedAuthorId] of expectedByTopic) {
    assert.equal(
      authorIdForLocationNews({ articleType: "future_location_update", topicIds: [topicId] }),
      expectedAuthorId,
      topicId,
    );
  }

  assert.equal(
    authorIdForLocationNews({ articleType: "future_location_update", topicIds: ["offers", "equity", "data"] }),
    "contributor-priya-bennett",
    "topic fallback groups must use Priya, Elena, Jordan priority rather than input order",
  );
  assert.equal(
    authorIdForLocationNews({ articleType: "future_location_update", topicIds: ["offers", "equity"] }),
    "contributor-elena-park",
  );
  assert.equal(
    authorIdForLocationNews({ articleType: "future_location_update", topicIds: ["unclassified-local-topic"] }),
    "contributor-maya-brooks",
  );
});

test("gives exact article-type assignments precedence over topic fallbacks", async () => {
  const { authorIdForLocationNews } = await loadAssignment();

  assert.equal(
    authorIdForLocationNews({ articleType: "local_labor_market", topicIds: ["tax", "refinance", "offers"] }),
    "contributor-rowan-hale",
  );
  assert.equal(
    authorIdForLocationNews({ articleType: "county_loan_limits", topicIds: ["data"] }),
    "contributor-marcus-lane",
  );
});

test("is deterministic, pure, and always returns a registry contributor", async () => {
  const { authorIdForLocationNews } = await loadAssignment();
  const article = {
    articleType: "future_location_update",
    topicIds: ["purchase-readiness", "local-market"],
  };
  const original = structuredClone(article);
  const assignments = Array.from({ length: 25 }, () => authorIdForLocationNews(article));

  assert.deepEqual(new Set(assignments), new Set(["contributor-jordan-avery"]));
  assert.ok(assignments.every((authorId) => validContributorIds.has(authorId)));
  assert.deepEqual(article, original, "assignment must not mutate the article input");
});

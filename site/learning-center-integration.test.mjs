import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const homeStart = source.indexOf("function learningHome(");
const helpersStart = source.indexOf("function learningDiscovery(");
const topicStart = source.indexOf("function blogTopicPage(");
const articleStart = source.indexOf("function articlePage(");
const learningSource = source.slice(homeStart, topicStart);

test("Learning Center renders one search form before canonical topic links", () => {
  assert.ok(homeStart >= 0, "learningHome renderer is missing");
  assert.ok(helpersStart >= 0, "learningDiscovery helper is missing");
  assert.equal((learningSource.match(/data-search-form/g) || []).length, 1);
  assert.ok(
    learningSource.indexOf("data-search-form") <
      learningSource.indexOf("learning-topic-tags"),
  );
  assert.match(learningSource, /data-search-scope="learning"/);
  assert.match(source, /buildLearningCenterModel\(data\)\.searchItems/);
});

test("Learning Center uses the canonical model and shared CTA helpers", () => {
  assert.match(learningSource, /buildLearningCenterModel\(data\)/);
  assert.match(learningSource, /ctaButton\("prequal"/);
  assert.match(learningSource, /contextualCta\(/);
  assert.doesNotMatch(
    learningSource,
    /popular|trending|credit score|no obligation/i,
  );
});

test("Learning Center keeps the shared shell", () => {
  assert.match(learningSource, /return pageShell\(`/);
  assert.doesNotMatch(learningSource, /<header|<footer/);
});

test("Learning Center helpers remain top-level before article renderers", () => {
  assert.ok(
    helpersStart < topicStart,
    "Learning Center helpers must not be embedded in an article template",
  );
  assert.ok(topicStart < articleStart, "topic renderer must precede article renderer");
});

test("Learning Center renders the guidance CTA copy once", () => {
  assert.equal(
    (learningSource.match(/CTA_TYPES\.leadForm\.title/g) || []).length,
    1,
  );
  assert.equal(
    (learningSource.match(/CTA_TYPES\.leadForm\.text/g) || []).length,
    1,
  );
});

test("Learning Center styles are scoped and responsive", () => {
  for (const selector of [
    ".learning-center-page",
    ".learning-discovery",
    ".learning-search",
    ".learning-topic-tags",
  ]) {
    assert.ok(styles.includes(selector), `missing ${selector}`);
  }
  assert.match(
    styles,
    /@media \(max-width: 760px\)[\s\S]*\.learning-center-page/,
  );
});

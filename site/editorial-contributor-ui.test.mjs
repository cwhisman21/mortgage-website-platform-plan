import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const contributors = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/contributors.json", import.meta.url), "utf8"),
).contributors;

test("boot safely loads editorial registries, applies ownership, and registers every author route", () => {
  assert.match(
    source,
    /import\s*\{[\s\S]*applyArticleAuthorIds[\s\S]*normalizeEditorialContent[\s\S]*\}\s*from "\/site\/editorial-content\.mjs"/,
  );
  assert.match(source, /const CONTRIBUTORS_URL = "\/mock-data\/editorial\/contributors\.json"/);
  assert.match(source, /const TOPIC_HUBS_URL = "\/mock-data\/editorial\/topic-hubs\.json"/);
  assert.match(source, /fetchOptionalJson\(CONTRIBUTORS_URL\)/);
  assert.match(source, /fetchOptionalJson\(TOPIC_HUBS_URL\)/);
  assert.match(source, /function loadOptionalEditorialContent\(/);
  assert.match(source, /applyArticleAuthorIds\(editorialContent, loadedData\.articles\)/);
  assert.match(source, /contributors:\s*mapById\(editorialContent\.contributors\)/);
  assert.match(source, /contributorsBySlug:/);
  assert.match(source, /editorialContent\.authorRoutes[\s\S]*built\.routes\.set/);

  for (const contributor of contributors) {
    assert.equal(
      contributor.route,
      `/learning-center/authors/${contributor.slug}`,
      `${contributor.name} must keep the approved author route`,
    );
  }
});

test("the Editorial Team route renders the approved six-card contributor directory", () => {
  assert.match(source, /function editorialTeamPage\(topic\)/);
  assert.match(
    source,
    /editorialContent\.contributors\.map\(\(contributor\) =>[\s\S]*contributor-directory-card/,
  );
  assert.match(source, /contributor\.portrait\.src/);
  assert.match(source, /contributor\.portrait\.alt/);
  assert.match(source, /contributor\.name/);
  assert.match(source, /contributor\.beat/);
  assert.match(source, /contributor\.shortBio/);
  assert.match(
    source,
    /if \(topic\.route === "\/learning-center\/editorial-team"\) return editorialTeamPage\(topic\)/,
  );
  assert.doesNotMatch(source, /const isEditorialTeam =/);
  assert.equal(contributors.length, 6);
});

test("contributor routes render profile fields and an authorId-derived article archive", () => {
  assert.match(source, /function contributorProfilePage\(contributor\)/);
  assert.match(
    source,
    /articlesForContributor\(editorialContent, data\.articles, contributor\.id\)/,
  );
  assert.match(source, /contributor\.portrait\.src/);
  assert.match(source, /contributor\.title/);
  assert.match(source, /contributor\.beat/);
  assert.match(source, /contributor\.bio/);
  assert.match(source, /contributor\.topics\.map/);
  assert.match(source, /const archive = relatedArticles\.length/);
  assert.match(source, /found\.type === "contributor"\) html = contributorProfilePage\(found\.item\)/);
  assert.match(source, /buildLearningCenterModel\(data, editorialContent\)/);
});

test("Learning Center cards and articles render portrait, author, and date bylines", () => {
  assert.match(source, /function renderContributorByline\(article, \{ compact = false \} = \{\}\)/);
  assert.match(
    source,
    /const byline = renderBylineModel\(article, editorialContent\.contributors\)/,
  );
  assert.match(source, /byline\.portraitSrc/);
  assert.match(source, /byline\.portraitAlt/);
  assert.match(source, /byline\.name/);
  assert.match(source, /const dateLabel =/);
  assert.match(source, /<time>\$\{esc\(dateLabel\)\}<\/time>/);
  assert.match(source, /byline\.href\s*\?/);
  assert.match(source, /renderContributorByline\(article, \{ compact: true \}\)/);
  assert.match(source, /renderContributorByline\(article\)/);
});

test("article schema keeps Snap Mortgage responsible without person or credential markup", () => {
  assert.match(source, /"@type": "Organization",\s*name: "Snap Mortgage"/);
  assert.match(source, /publisher: snapMortgagePublisher/);
  assert.match(source, /author: snapMortgagePublisher/);
  assert.doesNotMatch(source, /"@type": "Person"/);
  assert.doesNotMatch(source, /reviewed[- ]by/i);
  assert.doesNotMatch(source, /credentialSchema|personLicenseSchema/);
});

test("contributor directory, profiles, and bylines have scoped responsive styles", () => {
  for (const selector of [
    ".editorial-directory-page",
    ".contributor-directory-grid",
    ".contributor-directory-card",
    ".contributor-profile-page",
    ".contributor-profile-hero",
    ".article-byline",
    ".article-card-byline",
  ]) {
    assert.ok(styles.includes(selector), `missing ${selector}`);
  }
  assert.match(
    styles,
    /@media \(max-width: 760px\)[\s\S]*\.contributor-directory-grid[\s\S]*\.contributor-profile-hero/,
  );
});

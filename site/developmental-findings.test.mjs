import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return appSource.slice(start, end);
}

test("dynamic state and city pages put the four-card news carousel immediately after the hero", () => {
  for (const [start, end] of [
    ["function statePage(state)", "function cityPage(city)"],
    ["function cityPage(city)", "function productPage("],
  ]) {
    const source = sourceBetween(start, end);
    const hero = source.indexOf("${hero({");
    const news = source.indexOf("${locationNewsFeed(");
    const editorial = source.indexOf("${editorialSection({");

    assert.ok(hero >= 0, `${start} is missing its hero`);
    assert.ok(news > hero, `${start} must render news after the hero`);
    assert.ok(editorial > news, `${start} must not put an editorial text wall before news`);
  }

  const feedSource = sourceBetween("function locationNewsFeed(location)", "function modalShell()");
  const cardSource = sourceBetween("function newsCard(article)", "function locationNewsFeed(location)");
  assert.doesNotMatch(feedSource, /localContext|location-evidence-summary/);
  assert.match(feedSource, /articles\.length !== 4/);
  assert.match(cardSource, /<img/);
  assert.match(cardSource, /previewText/);
  assert.match(cardSource, /renderContributorBylineMarkup/);
  assert.match(cardSource, /data-news-article-id/);
  assert.match(cardSource, /Read more/);
});

test("dynamic location pages carry borrower-facing current-data guidance", () => {
  const noticeSource = sourceBetween("function locationSnapshotGuidance", "function locationsPage()");
  assert.match(noticeSource, /Use current property details/);
  assert.match(noticeSource, /change over time/);
  assert.match(noticeSource, /Review the dated sources/);
  assert.doesNotMatch(noticeSource, /seed|integration|public reliance|provenance|planning assumption/i);

  for (const [start, end] of [
    ["function locationsPage()", "function ratesPage()"],
    ["function statePage(state)", "function cityPage(city)"],
    ["function cityPage(city)", "function productPage("],
  ]) {
    assert.match(sourceBetween(start, end), /locationSnapshotGuidance\(\)/, start);
  }
  assert.doesNotMatch(appSource, /marketSnapshotReference\("(?:state|city)_snapshot"/);
  assert.match(appSource, /function publicFreshnessRecord/);
  assert.match(appSource, /marketSnapshot:\s*\{[\s\S]*lastUpdated:\s*""/);
  assert.match(appSource, /snapshotEvidence:\s*undefined/);
});

test("navigation, notice actions, calculator inputs, and content labels use borrower-facing language", () => {
  assert.match(appSource, /navLink\("\/rates", "Rates"\)/);
  assert.match(appSource, /navLink\("\/learning-center", "Learning"\)/);
  assert.match(appSource, /navLink\("\/loan-options", "Loan Options"\)/);
  assert.match(appSource, /header-nav-action[^>]*data-cta-action="compareOffer"[^>]*>Compare Your Offer/);
  assert.doesNotMatch(appSource, /navLink\("\/loan-officers", "(?:Loan officers|Experts)"\)/);
  assert.doesNotMatch(appSource, /Request mortgage guidance|Request guidance|primary: "Get guidance"/);
  assert.doesNotMatch(appSource, />Start prequalification|Start a prequalification conversation/);
  assert.match(appSource, /function humanizePublicLabel/);
  assert.doesNotMatch(appSource, /\.captures(?:\.slice\([^)]*\))?\.join\(/);
  assert.doesNotMatch(appSource, /String\(article\.type[^\n]+replaceAll/);
  assert.doesNotMatch(appSource, /revalidated before release|compliance review required|editor reviewed|internal review/i);
  assert.match(appSource, /confirm the current fee with USDA and the lender before relying on this estimate/i);
});

test("dynamic contributor archives use the combined pre-indexed corpus with a bounded initial render", () => {
  const mapSource = sourceBetween("function buildMaps(", "function currentPath()");
  const profileSource = sourceBetween("function contributorProfilePage(contributor)", "function blogTopicPage(topic)");

  assert.match(mapSource, /buildContributorArticleIndex/);
  assert.match(mapSource, /compactNewsIndex\.articles/);
  assert.match(profileSource, /contributorArticles/);
  assert.match(profileSource, /limit:\s*24/);
  assert.match(profileSource, /showCount:\s*true/);
  assert.match(profileSource, /CONTRIBUTOR_DISCLOSURE/);
});

test("rate benchmarks do not attribute APR or points to Freddie Mac PMMS", () => {
  const benchmarkSource = sourceBetween("const rateBenchmarks = [", "const stateBriefs = {");
  assert.match(benchmarkSource, /Not reported by PMMS/);
  assert.doesNotMatch(benchmarkSource, /Benchmark average|Survey average terms/);
});

test("city planning paths send percentage and payment inputs to the calculator", () => {
  const citySource = sourceBetween("function cityPage(city)", "function productPage(");
  assert.match(citySource, /Run the payment calculator/);
  assert.match(citySource, /Enter your amount/);
  assert.doesNotMatch(citySource, /\["FHA option"[^\n]+"3\.5%"/);
});

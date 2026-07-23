import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as locationsHero from "./locations-hero.mjs";

const { renderLocationsHero } = locationsHero;

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("renders a centered map-first borrower hero", () => {
  const html = renderLocationsHero(seed.states);

  assert.match(html, /<section class="hero-band locations-hero">/);
  assert.match(html, /<h1>Where are you looking\?<\/h1>/);
  assert.match(html, /Choose a state or search for a city/);
  assert.match(html, /placeholder="Search city or state"/);
  assert.match(html, /data-search-form/);
  assert.equal((html.match(/data-state-id=/g) || []).length, 51);
  assert.doesNotMatch(html, /Start with Texas|Add to watchlist/);
});

test("the locations page renders one hero map and no duplicate map section", () => {
  const locationsSource = appSource.slice(
    appSource.indexOf("function locationsPage()"),
    appSource.indexOf("function ratesPage()"),
  );

  assert.equal((locationsSource.match(/renderLocationsHero\(data\.states\)/g) || []).length, 1);
  assert.doesNotMatch(locationsSource, /Browse state mortgage markets|renderUsStateMap/);
});

test("styles the locations hero as a large centered map composition", () => {
  assert.match(stylesheet, /\.locations-hero-inner\s*\{/);
  assert.match(stylesheet, /\.locations-hero \.us-state-map\s*\{/);
  assert.match(stylesheet, /width:\s*min\(1100px, 100%\)/);
  assert.match(stylesheet, /aspect-ratio:\s*1000\s*\/\s*589/);
  assert.match(stylesheet, /@media \(max-width: 760px\)[\s\S]*\.locations-hero-search/);
});

test("homepage state explorer renders one map and a crawlable state list", () => {
  assert.equal(
    typeof locationsHero.renderHomeStateExplorer,
    "function",
    "locations-hero.mjs must export renderHomeStateExplorer",
  );

  const html = locationsHero.renderHomeStateExplorer(seed.states);

  assert.match(html, /<h2[^>]*>Where are you looking\?<\/h2>/);
  assert.equal((html.match(/data-state-id=/g) || []).length, 51);
  assert.match(html, /<details[^>]*class="home-state-list"/);
  assert.match(html, /<summary>See state list<\/summary>/);
  assert.equal((html.match(/class="home-state-list-link"/g) || []).length, 51);
});

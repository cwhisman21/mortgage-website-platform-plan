import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { renderLocationsHero } from "./locations-hero.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

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

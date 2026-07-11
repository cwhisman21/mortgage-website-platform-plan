import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { renderUsStateMap } from "./us-state-map.mjs";
import { US_STATE_PATHS } from "./assets/us-state-map-paths.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));

const states = [
  { id: "state-tx", name: "Texas", abbr: "TX", route: "/locations/texas" },
  { id: "state-dc", name: "District of Columbia", abbr: "DC", route: "/locations/district-of-columbia" },
];

test("ships path data for every U.S. state", () => {
  assert.equal(Object.keys(US_STATE_PATHS).length, 50);
  assert.ok(Object.values(US_STATE_PATHS).every((path) => typeof path === "string" && path.length > 8));
});

test("renders route-bearing state SVG anchors and a D.C. star", () => {
  const html = renderUsStateMap(states);

  assert.match(html, /<nav class="us-state-map" aria-label="Browse mortgage markets by state">/);
  assert.match(html, /<svg[^>]*viewBox="0 0 975 610"/);
  assert.match(html, /href="\/locations\/texas"/);
  assert.match(html, /aria-label="Open Texas mortgage market"/);
  assert.match(html, /<title>Texas<\/title>/);
  assert.match(html, /data-state-id="state-dc"/);
  assert.match(html, /class="us-state-map-dc-star"/);
  assert.match(html, /href="\/locations\/district-of-columbia"/);
  assert.doesNotMatch(html, /role="img"/);
});

test("skips incomplete geography records instead of producing dead links", () => {
  const html = renderUsStateMap([
    ...states,
    { id: "state-ca", name: "California", abbr: "CA", route: "" },
    { id: "state-fl", name: "Florida", abbr: "FL", route: "#" },
    { id: "state-ny", name: "New York", abbr: "NY", route: "/missing" },
    { id: "state-ok", name: "Oklahoma", abbr: "OK", route: "/" },
  ]);

  assert.doesNotMatch(html, /href="#|href=""/);
  assert.doesNotMatch(html, /data-state-id="state-ca"|data-state-id="state-fl"|data-state-id="state-ny"|data-state-id="state-ok"/);
  assert.doesNotMatch(html, /Coming soon|placeholder|demo/i);
});

test("renders all 50 state hubs plus the District of Columbia from production inventory", () => {
  const html = renderUsStateMap(seed.states);
  const links = [...html.matchAll(/data-state-id="([^"]+)" href="([^"]+)"/g)];

  assert.equal(links.length, 51);
  assert.equal(new Set(links.map((match) => match[1])).size, 51);
  assert.equal(new Set(links.map((match) => match[2])).size, 51);
  assert.ok(links.every((match) => /^\/locations\/[a-z0-9-]+$/.test(match[2])));
  assert.equal((html.match(/class="us-state-map-dc-star"/g) || []).length, 1);
});

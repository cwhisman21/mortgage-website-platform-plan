import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seed = JSON.parse(
  fs.readFileSync(new URL("../production-seed.json", import.meta.url), "utf8"),
);
const sourceManifest = JSON.parse(
  fs.readFileSync(new URL("../national-location-source-manifest.json", import.meta.url), "utf8"),
);

test("every city retains source geography", () => {
  for (const city of seed.cities) {
    const geo = city.sourceGeography;
    assert.ok(geo, `${city.id} missing sourceGeography`);
    assert.match(geo.cityKey, /^[a-z0-9-]+\|[A-Z]{2}$/);
    assert.match(geo.stateFips, /^\d{2}$/);
    assert.match(geo.countyFips, /^\d{5}$/);
    assert.notEqual(geo.stateFips, "00", `${city.id} invalid state FIPS`);
    assert.notEqual(geo.countyFips, "00000", `${city.id} invalid county FIPS`);
    assert.ok(geo.countyName);
    assert.ok(Number.isFinite(geo.latitude));
    assert.ok(Number.isFinite(geo.longitude));
    assert.ok(geo.populationProper >= 50000);
  }
});

test("Honolulu uses the official Honolulu County source geography", () => {
  const honolulu = seed.cities.find((city) => city.id === "city-honolulu-hi");
  assert.equal(honolulu.sourceGeography.stateFips, "15");
  assert.equal(honolulu.sourceGeography.countyFips, "15003");
  assert.equal(honolulu.sourceGeography.countyName, "Honolulu");
});

test("covers every state and District of Columbia", () => {
  const required = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
    "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
    "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
    "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  ]);
  const present = new Set(seed.states.map((state) => state.abbr));
  assert.deepEqual(present, required);
});

test("every qualifying city has a state parent and a valid route", () => {
  const states = new Set(seed.states.map((state) => state.id));
  for (const city of seed.cities) {
    assert.ok(city.sourceGeography.populationProper >= 50000);
    assert.ok(states.has(city.stateId));
    assert.match(city.route, /^\/locations\/[a-z0-9-]+\/[a-z0-9-]+$/);
  }
});

test("keeps qualifying-city source coverage separate from routed state coverage", () => {
  assert.equal(sourceManifest.statesFromSource, 49);
  assert.equal(sourceManifest.pageCoverageStates, 51);
  assert.deepEqual(sourceManifest.statesWithoutCityProper50k, ["VT", "WV"]);
});

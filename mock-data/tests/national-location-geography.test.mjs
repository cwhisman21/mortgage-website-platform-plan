import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seed = JSON.parse(
  fs.readFileSync(new URL("../production-seed.json", import.meta.url), "utf8"),
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

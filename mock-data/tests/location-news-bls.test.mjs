import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLausCityName, parseSeriesId, selectLausMeasures } from "../location-news/lib/bls.mjs";

test("selects labor force, employment, unemployment, and rate periods", () => {
  const rows = [
    { measure: "06", period: "M05", year: "2026", value: "612345" },
    { measure: "05", period: "M05", year: "2026", value: "590123" },
    { measure: "04", period: "M05", year: "2026", value: "22222" },
    { measure: "03", period: "M05", year: "2026", value: "3.6" },
    { measure: "03", period: "M04", year: "2026", value: "3.5" },
    { measure: "03", period: "M05", year: "2025", value: "3.8" },
  ];
  const result = selectLausMeasures(rows);
  assert.equal(result.latest.unemploymentRate, 3.6);
  assert.equal(result.previous.unemploymentRate, 3.5);
  assert.equal(result.yearAgo.unemploymentRate, 3.8);
  assert.equal(result.latest.laborForce, 612345);
});

test("parses the published LAUS series positions", () => {
  assert.deepEqual(parseSeriesId("LAUCT480500000000003"), {
    seasonal: "U",
    areaCode: "CT4805000000000",
    measure: "03",
  });
});

test("normalizes BLS city areas without erasing City from a proper city name", () => {
  assert.equal(normalizeLausCityName("Lake Havasu City"), "lake-havasu-city");
  assert.equal(normalizeLausCityName("Lake Havasu City city, AZ"), "lake-havasu-city");
  assert.equal(normalizeLausCityName("Denver County/city, CO"), "denver");
  assert.equal(normalizeLausCityName("St. Petersburg city, FL"), "st-petersburg");
  assert.equal(normalizeLausCityName("Saint Petersburg"), "st-petersburg");
  assert.equal(normalizeLausCityName("Lee's Summit city, MO"), "lees-summit");
  assert.equal(normalizeLausCityName("Lees Summit"), "lees-summit");
  assert.equal(normalizeLausCityName("Bridgeport city/town, CT"), "bridgeport");
  assert.equal(normalizeLausCityName("Nashville-Davidson (consolidated) city, TN"), "nashville-davidson");
});

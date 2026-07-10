import test from "node:test";
import assert from "node:assert/strict";

import {
  countyLimitFipsForCity,
  joinCountyLimits,
  parseFhfaStateHpi,
  parseHudForwardLine,
} from "../location-news/lib/loan-limits.mjs";

function hudLine() {
  const fields = [
    "33860".padEnd(60),
    "203B ",
    "S",
    "0220000",
    "0541287",
    "0693050",
    "0837700",
    "1041125",
    "AL",
    "101",
    "ALABAMA".padEnd(26),
    "MONTGOMERY".padEnd(15),
    "20260101",
    "0220000",
    "2025",
  ];
  return fields.join("");
}

test("parses HUD 2026 forward-limit positions", () => {
  const row = parseHudForwardLine(hudLine());
  assert.equal(row.countyFips, "01101");
  assert.equal(row.oneUnit, 541287);
  assert.equal(row.fourUnit, 1041125);
});

test("joins FHFA and FHA limits by five-digit county FIPS", () => {
  const joined = joinCountyLimits(
    [{ countyFips: "01101", oneUnit: 832750 }],
    [{ countyFips: "01101", oneUnit: 541287 }],
  );
  assert.deepEqual(joined["01101"], {
    conforming: { countyFips: "01101", oneUnit: 832750 },
    fha: { countyFips: "01101", oneUnit: 541287 },
  });
});

test("uses Connecticut's current Census planning-region FIPS for loan-limit lookup", () => {
  assert.equal(countyLimitFipsForCity({ id: "city-bridgeport-ct", sourceGeography: { countyFips: "09001" } }), "09120");
  assert.equal(countyLimitFipsForCity({ id: "city-danbury-ct", sourceGeography: { countyFips: "09001" } }), "09190");
  assert.equal(countyLimitFipsForCity({ id: "city-waterbury-ct", sourceGeography: { countyFips: "09009" } }), "09140");
  assert.equal(countyLimitFipsForCity({ id: "city-austin-tx", sourceGeography: { countyFips: "48453" } }), "48453");
});

test("parses the latest state HPI quarter from the official quarterly file", () => {
  const source = "state\tyr\tqtr\tindex_nsa\tindex_sa\nTX\t2025\t4\t412.0\t410.0\nTX\t2026\t1\t416.2\t414.1\n";
  const result = parseFhfaStateHpi(source, ["TX"]);
  assert.equal(result.TX.period, "2026Q1");
  assert.equal(result.TX.index, 416.2);
  assert.ok(result.TX.annualChange !== undefined);
});

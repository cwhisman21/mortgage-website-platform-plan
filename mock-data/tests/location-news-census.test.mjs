import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ACS_SUMMARY_TABLES,
  ACS_VARIABLES,
  loadCensusEvidence,
  mapPlaceRows,
  mapStateRows,
  summaryColumnForApiVariable,
  summaryUrls,
} from "../location-news/lib/census.mjs";

test("maps an ACS place row to Austin with estimates and margins", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "B19013_001E", "B19013_001M", "B25077_001E", "B25077_001M", "state", "place"],
    ["Austin city, Texas", "967862", "18", "91761", "1634", "555300", "11734", "48", "05000"],
  ];
  const result = mapPlaceRows(
    rows,
    [{ id: "city-austin-tx", name: "Austin", sourceGeography: { stateFips: "48", cityKey: "austin|TX" } }],
    "2024",
  );
  assert.equal(result["city-austin-tx"].placeFips, "4805000");
  assert.equal(result["city-austin-tx"].metrics.medianHouseholdIncome.estimate, 91761);
  assert.equal(result["city-austin-tx"].metrics.medianHomeValue.marginOfError, 11734);
});

test("uses the complete ACS selected owner-cost measure", () => {
  assert.deepEqual(ACS_VARIABLES.medianOwnerCostWithMortgage, ["B25103_001E", "B25103_001M"]);
});

test("maps the Honolulu source alias without weakening exact matching", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "state", "place"],
    ["Urban Honolulu CDP, Hawaii", "350964", "900", "15", "71550"],
  ];
  const result = mapPlaceRows(
    rows,
    [{ id: "city-honolulu-hi", name: "Honolulu", sourceGeography: { stateFips: "15", cityKey: "honolulu|HI" } }],
    "2024",
  );
  assert.equal(result["city-honolulu-hi"].alias, "urban-honolulu");
});

test("selects official city places without confusing CDPs, villages, or City in a proper name", () => {
  const metricHeaders = Object.values(ACS_VARIABLES).flat();
  const row = (name, state, place) => [name, ...metricHeaders.map(() => "1"), state, place];
  const rows = [
    ["NAME", ...metricHeaders, "state", "place"],
    row("Burbank city, California", "06", "08954"),
    row("Burbank CDP, California", "06", "08968"),
    row("Mountain View city, California", "06", "49670"),
    row("Mountain View CDP, California", "06", "49651"),
    row("Plantation city, Florida", "12", "57425"),
    row("Plantation CDP, Florida", "12", "57450"),
    row("Lee's Summit city, Missouri", "29", "41348"),
    row("Carson City, Nevada", "32", "09700"),
    row("Mesquite city, Texas", "48", "47892"),
    row("Mesquite CDP, Texas", "48", "47898"),
    row("Waukesha city, Wisconsin", "55", "84250"),
    row("Waukesha village, Wisconsin", "55", "84275"),
  ];
  const cities = [
    ["city-burbank-ca", "Burbank", "06", "08954"],
    ["city-mountain-view-ca", "Mountain View", "06", "49670"],
    ["city-plantation-fl", "Plantation", "12", "57425"],
    ["city-lees-summit-mo", "Lees Summit", "29", "41348"],
    ["city-carson-city-nv", "Carson City", "32", "09700"],
    ["city-mesquite-tx", "Mesquite", "48", "47892"],
    ["city-waukesha-wi", "Waukesha", "55", "84250"],
  ].map(([id, name, stateFips, place]) => ({ id, name, sourceGeography: { stateFips, cityKey: `${name}|${stateFips}` }, expectedPlace: place }));

  const result = mapPlaceRows(rows, cities, "2024");
  for (const city of cities) assert.equal(result[city.id].placeFips, `${city.sourceGeography.stateFips}${city.expectedPlace}`);
});

test("preserves City in a city name while removing only the Census place type", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "state", "place"],
    ["Lake Havasu City city, Arizona", "57000", "22", "04", "39370"],
  ];
  const result = mapPlaceRows(
    rows,
    [{ id: "city-lake-havasu-city-az", name: "Lake Havasu City", sourceGeography: { stateFips: "04", cityKey: "lake-havasu-city|AZ" } }],
    "2024",
  );
  assert.equal(result["city-lake-havasu-city-az"].placeFips, "0439370");
});

test("uses explicit official aliases and handles Saint/St. source variants", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "state", "place"],
    ["Athens-Clarke County unified government (balance), Georgia", "127000", "200", "13", "03440"],
    ["St. Petersburg city, Florida", "261000", "300", "12", "63000"],
  ];
  const result = mapPlaceRows(
    rows,
    [
      { id: "city-athens-ga", name: "Athens", sourceGeography: { stateFips: "13", cityKey: "athens|GA" } },
      { id: "city-saint-petersburg-fl", name: "Saint Petersburg", sourceGeography: { stateFips: "12", cityKey: "saint-petersburg|FL" } },
    ],
    "2024",
  );
  assert.equal(result["city-athens-ga"].alias, "athens-clarke-county-unified-government-balance");
  assert.equal(result["city-saint-petersburg-fl"].placeFips, "1263000");
});

test("reports every unmatched ACS place in one failure", () => {
  const rows = [["NAME", "B01003_001E", "B01003_001M", "state", "place"]];
  assert.throws(
    () => mapPlaceRows(rows, [
      { id: "city-one-tx", name: "One", sourceGeography: { stateFips: "48" } },
      { id: "city-two-ca", name: "Two", sourceGeography: { stateFips: "06" } },
    ], "2024"),
    /city-one-tx[\s\S]*city-two-ca/,
  );
});

test("rejects an ACS geography row with a missing required estimate", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "B25001_001E", "B25001_001M", "state"],
    ["Texas", "30000000", "1000", "", "2000", "48"],
  ];
  assert.throws(
    () => mapStateRows(rows, [{ id: "state-tx", name: "Texas", abbr: "TX" }], "2024"),
    /state-tx.*totalHousingUnits.*B25001_001E/i,
  );
});

test("maps API variable IDs to table-based summary columns", () => {
  assert.equal(summaryColumnForApiVariable("B25103_001E"), "B25103_E001");
  assert.equal(summaryColumnForApiVariable("B25002_003M"), "B25002_M003");
});

test("uses the documented 2019 prototype source layout and CSV geography file", () => {
  const prior = summaryUrls("2019");
  const current = summaryUrls("2024");

  assert.equal(prior.geography, "https://www2.census.gov/programs-surveys/acs/summary_file/2019/prototype/Geos20195YR.csv");
  assert.equal(prior.geographyFilename, "Geos20195YR.csv");
  assert.equal(prior.tables.B25001, "https://www2.census.gov/programs-surveys/acs/summary_file/2019/prototype/5YRData/acsdt5y2019-b25001.dat");
  assert.equal(current.geographyFilename, "Geos20245YR.txt");
});

test("loads both ACS vintages from official-format summary files without an API key", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "acs-summary-fixture-"));
  const metricsByTable = new Map();
  for (const [metric, [estimateId, marginId]] of Object.entries(ACS_VARIABLES)) {
    const table = estimateId.split("_")[0];
    if (!metricsByTable.has(table)) metricsByTable.set(table, []);
    metricsByTable.get(table).push([metric, estimateId, marginId]);
  }
  for (const year of ["2024", "2019"]) {
    const yearDir = path.join(root, year);
    await fs.mkdir(yearDir, { recursive: true });
    const geography = year === "2019"
      ? "GEOID,DADSID,NAME\n04000US48,0400000US48,Texas\n04000US50,0400000US50,Vermont\n16000US4805000,1600000US4805000,\"Austin city, Texas\"\n"
      : "GEO_ID|NAME\n0400000US48|Texas\n0400000US50|Vermont\n1600000US4805000|Austin city, Texas\n";
    const geographyFilename = year === "2019" ? `Geos${year}5YR.csv` : `Geos${year}5YR.txt`;
    await fs.writeFile(path.join(yearDir, geographyFilename), geography);
    for (const table of ACS_SUMMARY_TABLES) {
      const columns = metricsByTable.get(table).flatMap(([, estimateId, marginId]) => [summaryColumnForApiVariable(estimateId), summaryColumnForApiVariable(marginId)]);
      const cityValues = columns.map((_, index) => String((year === "2024" ? 1000 : 800) + index));
      const stateValues = columns.map((_, index) => String((year === "2024" ? 2000 : 1600) + index));
      const vermontStateValues = columns.map((_, index) => String((year === "2024" ? 3000 : 2400) + index));
      await fs.writeFile(
        path.join(yearDir, `acsdt5y${year}-${table.toLowerCase()}.dat`),
        [`GEO_ID|${columns.join("|")}`, `0400000US48|${stateValues.join("|")}`, `0400000US50|${vermontStateValues.join("|")}`, `1600000US4805000|${cityValues.join("|")}`, ""].join("\n"),
      );
    }
  }

  const evidence = await loadCensusEvidence({
    cities: [{ id: "city-austin-tx", name: "Austin", sourceGeography: { stateFips: "48", cityKey: "austin|TX" } }],
    states: [
      { id: "state-tx", name: "Texas", abbr: "TX" },
      { id: "state-vt", name: "Vermont", abbr: "VT" },
    ],
    cacheDir: path.join(root, "cache"),
    summaryFileDir: root,
    apiKey: null,
  });
  assert.equal(evidence.mode, "table_based_summary_file");
  assert.equal(evidence.byCityId["city-austin-tx"].current.metrics.population.estimate, 1000);
  assert.equal(evidence.byStateId["state-tx"].prior.metrics.population.estimate, 1600);
  assert.equal(evidence.byStateId["state-vt"].current.metrics.population.estimate, 3000);
  assert.equal(evidence.sources.length, 18);
});

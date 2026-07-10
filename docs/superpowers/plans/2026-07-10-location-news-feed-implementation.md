# Location News Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four researched, borrower-facing articles to every state and city page, presented as image-forward news cards with crawlable full-article modals and standalone routes.

**Architecture:** Preserve `production-seed.json` as the compact public-site model, but add source geography to each location. Build a deterministic Node pipeline that caches official datasets, creates a media manifest through a provider adapter, writes one compact article index plus 786 lazy-loaded location bundles, and validates every claim and media asset before output. Extend the current static SPA with dedicated news-card, article-modal, route, metadata, and sitemap behavior without adding a backend.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js ES modules, built-in `fetch`, `node:test`, JSON/TSV/CSV source files, Pexels API at generation time, Vercel static hosting.

## Global Constraints

- Keep all 861 existing static routes working.
- Create at least 3,144 unique article records: four for each of 49 states and 737 cities.
- Generate locations and articles in auditable batches of 20 locations.
- Use official Census ACS, BLS LAUS, FHFA, and HUD evidence; never manufacture or infer a numeric fact.
- Cards use 16:9 faceless/headless news-style stock photography matched to article theme.
- Full articles use cited charts, tables, comparisons, methodology, and limitations.
- `Read more` is always a real anchor; ordinary clicks progressively enhance into an accessible modal.
- Core educational content remains public and crawlable.
- Keep account, watchlist, lead, prequal, rate review, and compare-offer actions simulated.
- Do not implement auth, CMS, backend persistence, CRM routing, pricing, underwriting, or Snap Homes portal screens.
- Do not expose API keys in browser code, generated JSON, logs, commits, or deployed assets.
- Preserve unrelated tracked and untracked work.

## File Map

- Modify `mock-data/generate-national-locations.mjs`: preserve county and coordinate source geography on every city.
- Modify `mock-data/production-seed.json`: regenerated compact location metadata and new article index references only.
- Create `mock-data/location-news/lib/core.mjs`: shared normalization, hashing, date, parsing, and cache helpers.
- Create `mock-data/location-news/lib/census.mjs`: ACS place/state ingestion and comparison records.
- Create `mock-data/location-news/lib/bls.mjs`: LAUS city/state ingestion and period selection.
- Create `mock-data/location-news/lib/loan-limits.mjs`: FHFA and HUD county-limit ingestion.
- Create `mock-data/location-news/lib/media.mjs`: Pexels search, theme mapping, attribution, and crop records.
- Create `mock-data/location-news/lib/compose.mjs`: eight article composers and internal-link selection.
- Create `mock-data/location-news/lib/validate.mjs`: evidence, article, duplication, media, and route validation.
- Create `mock-data/generate-location-news.mjs`: batch orchestration and output writing.
- Create `mock-data/location-news-index.json`: compact card and route metadata.
- Create `mock-data/location-news-source-manifest.json`: data provenance, checksums, retrieval dates, and batch reports.
- Create `mock-data/location-news-media-manifest.json`: image provenance, attribution, theme, alt text, and crop metadata.
- Create `mock-data/location-news/<state>/<location>.json`: four full article records per location.
- Create `mock-data/tests/*.test.mjs`: source, composition, validation, and corpus tests.
- Create `mock-data/tests/fixtures/location-news-fixtures.mjs`: complete deterministic Austin, state, media, and article fixtures.
- Create `site/news-renderer.mjs`: pure shared article markup renderer for browser modals and static generation.
- Modify `site/app.js`: lazy news loading, card renderer, article renderer, modal/history behavior, and route resolution.
- Modify `site/styles.css`: image-forward news cards, article modal/sheet, article typography, and responsive behavior.
- Modify `site/index.html`: canonical and social metadata hooks.
- Create `site/generated/learning-center/<slug>.html`: complete pre-rendered article documents for direct requests and no-JavaScript use.
- Create `site/sitemap.xml`: generated crawlable route inventory.
- Create `site/robots.txt`: sitemap declaration and public crawl policy.
- Modify `site/phase2-static-smoke.mjs`: corpus, links, modal, media, metadata, and route checks.
- Modify `.gitignore`: ignore source cache and local secret files only.

---

### Task 1: Preserve Location Geography

**Files:**
- Modify: `mock-data/generate-national-locations.mjs`
- Modify: `mock-data/production-seed.json`
- Create: `mock-data/tests/national-location-geography.test.mjs`

**Interfaces:**
- Produces: `city.sourceGeography = { cityKey, stateFips, countyFips, countyName, latitude, longitude, populationProper }`
- Consumed by: Census matching, BLS matching, loan-limit matching, media theme selection, and source validation.

- [ ] **Step 1: Write the failing geography test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seed = JSON.parse(fs.readFileSync(new URL("../production-seed.json", import.meta.url), "utf8"));

test("every city retains source geography", () => {
  for (const city of seed.cities) {
    const geo = city.sourceGeography;
    assert.ok(geo, `${city.id} missing sourceGeography`);
    assert.match(geo.cityKey, /^[a-z0-9-]+\|[A-Z]{2}$/);
    assert.match(geo.stateFips, /^\d{2}$/);
    assert.match(geo.countyFips, /^\d{5}$/);
    assert.ok(geo.countyName);
    assert.ok(Number.isFinite(geo.latitude));
    assert.ok(Number.isFinite(geo.longitude));
    assert.ok(geo.populationProper >= 50000);
  }
});
```

- [ ] **Step 2: Run the test and verify the missing field failure**

Run: `node --test mock-data/tests/national-location-geography.test.mjs`

Expected: FAIL on `city-austin-tx missing sourceGeography`.

- [ ] **Step 3: Add the source geography contract in `generatedCity`**

```js
sourceGeography: {
  cityKey: `${slugify(row.city_ascii || row.city)}|${row.state_id}`,
  stateFips: String(row.county_fips || "").padStart(5, "0").slice(0, 2),
  countyFips: String(row.county_fips || "").padStart(5, "0"),
  countyName: String(row.county_name || "").trim(),
  latitude: Number(row.lat),
  longitude: Number(row.lng),
  populationProper: Number(row.population_proper)
},
```

Insert that property immediately after `route` in the existing `generatedCity` return object; keep the existing market, relationship, and snapshot properties unchanged.

- [ ] **Step 4: Regenerate locations and rerun the test**

Run: `node mock-data/generate-national-locations.mjs --source "$env:TEMP\uscities.csv"`

Expected: `Generated 737 city routes across 49 state routes in 37 batches of 20.`

Run: `node --test mock-data/tests/national-location-geography.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit only the geography slice**

```powershell
git add mock-data/generate-national-locations.mjs mock-data/production-seed.json mock-data/tests/national-location-geography.test.mjs
git commit -m "feat: preserve location source geography"
```

### Task 2: Add Shared Source And Cache Utilities

**Files:**
- Create: `mock-data/location-news/lib/core.mjs`
- Create: `mock-data/tests/location-news-core.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `slugify`, `normalizePlaceName`, `parseDelimited`, `sha256File`, `fetchToCache`, `latestComparablePeriods`, and `writeJsonAtomic`.
- Consumed by: every source adapter and the generator.

- [ ] **Step 1: Write focused utility tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlaceName, parseDelimited, latestComparablePeriods } from "../location-news/lib/core.mjs";

test("normalizes Census and BLS place suffixes", () => {
  assert.equal(normalizePlaceName("Austin city, Texas"), "austin");
  assert.equal(normalizePlaceName("Urban Honolulu CDP"), "urban-honolulu");
});

test("parses quoted CSV and tab records", () => {
  assert.deepEqual(parseDelimited('"A, B",2\n', ","), [["A, B", "2"]]);
  assert.deepEqual(parseDelimited("A\tB\n", "\t"), [["A", "B"]]);
});

test("selects latest, prior month, and prior year", () => {
  const periods = latestComparablePeriods(["2025-M05", "2026-M04", "2026-M05"]);
  assert.deepEqual(periods, { latest: "2026-M05", previous: "2026-M04", yearAgo: "2025-M05" });
});
```

- [ ] **Step 2: Run the tests and verify the module-not-found failure**

Run: `node --test mock-data/tests/location-news-core.test.mjs`

Expected: FAIL because `core.mjs` does not exist.

- [ ] **Step 3: Implement the exact utility exports**

```js
export function normalizePlaceName(value) {
  return String(value || "")
    .replace(/,.*$/, "")
    .replace(/\s+(city|town|village|borough|municipality|cdp)$/i, "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function latestComparablePeriods(periods) {
  const sorted = [...new Set(periods)].sort();
  const latest = sorted.at(-1);
  const [year, month] = latest.split("-");
  const previousDate = new Date(Date.UTC(Number(year), Number(month.slice(1)) - 2, 1));
  const format = (date) => `${date.getUTCFullYear()}-M${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return { latest, previous: format(previousDate), yearAgo: `${Number(year) - 1}-${month}` };
}
```

Implement `parseDelimited` with quoted-field support, `fetchToCache(url, path, { refresh })` with a temporary file and rename, `sha256File` with `node:crypto`, and `writeJsonAtomic` with a sibling temporary file. Export all six names exactly.

- [ ] **Step 4: Ignore only local source cache and secrets**

```gitignore
mock-data/source-cache/
.env
.env.*
!.env.example
```

- [ ] **Step 5: Run the utility tests**

Run: `node --test mock-data/tests/location-news-core.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit the utility slice**

```powershell
git add .gitignore mock-data/location-news/lib/core.mjs mock-data/tests/location-news-core.test.mjs
git commit -m "feat: add location news source utilities"
```

### Task 3: Ingest Census ACS Evidence

**Files:**
- Create: `mock-data/location-news/lib/census.mjs`
- Create: `mock-data/tests/location-news-census.test.mjs`

**Interfaces:**
- Consumes: `city.sourceGeography.stateFips`, `city.sourceGeography.cityKey`, state IDs, cache helpers.
- Produces: `loadCensusEvidence({ cities, states, cacheDir, refresh }) -> { byCityId, byStateId, sources }`.

- [ ] **Step 1: Write a fixture-driven ACS mapping test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mapPlaceRows } from "../location-news/lib/census.mjs";

test("maps an ACS place row to Austin with estimates and margins", () => {
  const rows = [
    ["NAME", "B01003_001E", "B01003_001M", "B19013_001E", "B19013_001M", "B25077_001E", "B25077_001M", "state", "place"],
    ["Austin city, Texas", "967862", "18", "91761", "1634", "555300", "11734", "48", "05000"]
  ];
  const result = mapPlaceRows(rows, [{ id: "city-austin-tx", name: "Austin", sourceGeography: { stateFips: "48", cityKey: "austin|TX" } }], "2024");
  assert.equal(result["city-austin-tx"].placeFips, "4805000");
  assert.equal(result["city-austin-tx"].metrics.medianHouseholdIncome.estimate, 91761);
  assert.equal(result["city-austin-tx"].metrics.medianHomeValue.marginOfError, 11734);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test mock-data/tests/location-news-census.test.mjs`

Expected: FAIL because `census.mjs` does not exist.

- [ ] **Step 3: Implement the ACS variable contract**

```js
export const ACS_VARIABLES = {
  population: ["B01003_001E", "B01003_001M"],
  medianHouseholdIncome: ["B19013_001E", "B19013_001M"],
  totalHousingUnits: ["B25001_001E", "B25001_001M"],
  occupiedUnits: ["B25002_002E", "B25002_002M"],
  vacantUnits: ["B25002_003E", "B25002_003M"],
  ownerOccupiedUnits: ["B25003_002E", "B25003_002M"],
  renterOccupiedUnits: ["B25003_003E", "B25003_003M"],
  medianGrossRent: ["B25064_001E", "B25064_001M"],
  medianHomeValue: ["B25077_001E", "B25077_001M"],
  medianOwnerCostWithMortgage: ["B25088_002E", "B25088_002M"]
};
```

Query 2024 and 2019 ACS 5-year detailed tables. For place data use `for=place:*&in=state:{stateFips}`; for state data use `for=state:*`. Store every estimate, margin of error, variable ID, period, release URL, retrieval date, and the Census place FIPS returned by the API.

- [ ] **Step 4: Reject unmatched and duplicate place mappings**

```js
if (matches.length !== 1) {
  throw new Error(`ACS place match ${city.id} expected 1 row, found ${matches.length}`);
}
```

Use normalized place name plus state FIPS. Add an explicit alias map for `city-honolulu-hi -> urban-honolulu` and record the alias in the source manifest.

- [ ] **Step 5: Run Census tests**

Run: `node --test mock-data/tests/location-news-census.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the Census adapter**

```powershell
git add mock-data/location-news/lib/census.mjs mock-data/tests/location-news-census.test.mjs
git commit -m "feat: ingest census location evidence"
```

### Task 4: Ingest BLS LAUS Evidence

**Files:**
- Create: `mock-data/location-news/lib/bls.mjs`
- Create: `mock-data/tests/location-news-bls.test.mjs`

**Interfaces:**
- Consumes: city/state names, `la.area`, `la.series`, `la.data.65.City`, and `la.data.1.CurrentS`.
- Produces: `loadBlsEvidence({ cities, states, cacheDir, refresh }) -> { byCityId, byStateId, periods, sources }`.

- [ ] **Step 1: Write a BLS series/period test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { selectLausMeasures } from "../location-news/lib/bls.mjs";

test("selects labor force, employment, unemployment, and rate periods", () => {
  const rows = [
    { measure: "06", period: "M05", year: "2026", value: "612345" },
    { measure: "05", period: "M05", year: "2026", value: "590123" },
    { measure: "04", period: "M05", year: "2026", value: "22222" },
    { measure: "03", period: "M05", year: "2026", value: "3.6" },
    { measure: "03", period: "M04", year: "2026", value: "3.5" },
    { measure: "03", period: "M05", year: "2025", value: "3.8" }
  ];
  const result = selectLausMeasures(rows);
  assert.equal(result.latest.unemploymentRate, 3.6);
  assert.equal(result.previous.unemploymentRate, 3.5);
  assert.equal(result.yearAgo.unemploymentRate, 3.8);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test mock-data/tests/location-news-bls.test.mjs`

Expected: FAIL because `bls.mjs` does not exist.

- [ ] **Step 3: Implement source acquisition and streaming parse**

Use these official files:

```js
export const BLS_FILES = {
  areas: "https://download.bls.gov/pub/time.series/la/la.area",
  series: "https://download.bls.gov/pub/time.series/la/la.series",
  cities: "https://download.bls.gov/pub/time.series/la/la.data.65.City",
  states: "https://download.bls.gov/pub/time.series/la/la.data.1.CurrentS"
};
```

Parse `la.data.65.City` line-by-line with `node:readline`; never read the approximately 330 MB file into one string. Keep only 2025 and 2026 monthly rows for series mapped to the 737 project cities. Use measure codes `03` rate, `04` unemployment, `05` employment, and `06` labor force.

- [ ] **Step 4: Enforce exact area matching and data completeness**

```js
const cityKey = `${normalizePlaceName(area.area_text)}|${stateAbbrFromArea(area)}`;
const city = citiesByKey.get(cityKey);
if (city && !evidenceByCityId[city.id]) evidenceByCityId[city.id] = createEmptyLausRecord(city, area);
```

After parsing, throw once with the complete list of unmatched cities or missing required measures. Do not substitute county or metro data for a missing city series.

- [ ] **Step 5: Run BLS tests**

Run: `node --test mock-data/tests/location-news-bls.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the BLS adapter**

```powershell
git add mock-data/location-news/lib/bls.mjs mock-data/tests/location-news-bls.test.mjs
git commit -m "feat: ingest local labor market evidence"
```

### Task 5: Ingest FHFA And HUD Evidence

**Files:**
- Create: `mock-data/location-news/lib/loan-limits.mjs`
- Create: `mock-data/tests/location-news-loan-limits.test.mjs`

**Interfaces:**
- Consumes: city county FIPS, state abbreviations, FHFA 2026 county CSV, HUD 2026 fixed-width file, and FHFA 2026 Q1 state HPI data.
- Produces: `loadLoanAndHpiEvidence({ cities, states, cacheDir, refresh }) -> { countyLimits, stateLimitSummaries, stateHpi, sources }`.

- [ ] **Step 1: Write fixed-width HUD and county-join tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseHudForwardLine, joinCountyLimits } from "../location-news/lib/loan-limits.mjs";

test("parses HUD 2026 forward-limit positions", () => {
  const line = "33860".padEnd(60) + "203B " + "S" + "0220000" + "0541287" + "0693050" + "0837700" + "1041125" + "AL" + "101" + "ALABAMA".padEnd(26) + "MONTGOMERY".padEnd(15) + "20260101" + "0220000" + "2025";
  const row = parseHudForwardLine(line);
  assert.equal(row.countyFips, "01101");
  assert.equal(row.oneUnit, 541287);
  assert.equal(row.fourUnit, 1041125);
});

test("joins FHFA and FHA limits by five-digit county FIPS", () => {
  const joined = joinCountyLimits([{ countyFips: "01101", oneUnit: 832750 }], [{ countyFips: "01101", oneUnit: 541287 }]);
  assert.deepEqual(joined["01101"], { conforming: { oneUnit: 832750 }, fha: { oneUnit: 541287 } });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test mock-data/tests/location-news-loan-limits.test.mjs`

Expected: FAIL because `loan-limits.mjs` does not exist.

- [ ] **Step 3: Implement official source acquisition**

```js
export const LIMIT_SOURCES = {
  fhfa2026: "https://www.fhfa.gov/data/conforming-loan-limit",
  hud2026: "https://apps.hud.gov/pub/chums/cy2026-forward-limits.txt",
  fhfaHpi2026Q1: "https://www.fhfa.gov/document/d/hpi/fhfa-house-price-index-report-2026q1"
};
```

Resolve the FHFA CSV download link from the official conforming-limit page and cache the resolved CSV. Parse HUD positions 1-5 MSA, 61-65 SOA, 66 limit type, 67-73 median price, 74-80 one-unit, 81-87 two-unit, 88-94 three-unit, 95-101 four-unit, 102-103 state, 104-106 county, 107-132 state name, and 133-147 county name. Build five-digit county FIPS from the state FIPS lookup plus HUD's three-digit county code.

- [ ] **Step 4: Parse and validate state HPI evidence**

Capture state abbreviation, annual change, quarterly change, five-year change, period `2026Q1`, report URL, and retrieval date. Assert all 49 project states have one HPI record and that every city county FIPS joins to both FHFA and HUD records.

- [ ] **Step 5: Run loan-limit tests**

Run: `node --test mock-data/tests/location-news-loan-limits.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the loan and HPI adapter**

```powershell
git add mock-data/location-news/lib/loan-limits.mjs mock-data/tests/location-news-loan-limits.test.mjs
git commit -m "feat: ingest county loan limits and state hpi"
```

### Task 6: Build The Licensed Stock Media Library

**Files:**
- Create: `mock-data/location-news/lib/media.mjs`
- Create: `mock-data/location-news-media-manifest.json`
- Create: `mock-data/tests/location-news-media.test.mjs`
- Create: `site/assets/news/`
- Create: `.env.example`

**Interfaces:**
- Consumes: `PEXELS_API_KEY` only during `--refresh-media` generation.
- Produces: `loadMediaLibrary({ refresh, cacheDir, outputDir }) -> { assetsById, themePools, providerCredit }`.
- Article themes: `home_values`, `housing_supply`, `local_economy`, and `loan_limits`.

- [ ] **Step 1: Write media contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { assignMedia, validateMediaAsset } from "../location-news/lib/media.mjs";

const assets = [
  { id: "home-values-01", theme: "home_values", localPath: "/site/assets/news/home-values-01.jpg", provider: "Pexels", providerAssetId: "1", photographer: "A", photographerUrl: "https://www.pexels.com/@a", photoPageUrl: "https://www.pexels.com/photo/1", usageUrl: "https://www.pexels.com/license/", alt: "Detached homes viewed from a residential street", width: 1200, height: 627, focalPoint: "50% 50%", approvalStatus: "approved" },
  { id: "home-values-02", theme: "home_values", localPath: "/site/assets/news/home-values-02.jpg", provider: "Pexels", providerAssetId: "2", photographer: "B", photographerUrl: "https://www.pexels.com/@b", photoPageUrl: "https://www.pexels.com/photo/2", usageUrl: "https://www.pexels.com/license/", alt: "Home exterior with a sold sign", width: 1200, height: 627, focalPoint: "50% 50%", approvalStatus: "approved" }
];

test("validates stock provenance and landscape shape", () => {
  assert.doesNotThrow(() => validateMediaAsset(assets[0]));
});

test("assigns deterministically without repeating within one location", () => {
  const used = new Set();
  const first = assignMedia("article-a", "home_values", assets, used);
  used.add(first.id);
  const second = assignMedia("article-b", "home_values", assets, used);
  assert.notEqual(first.id, second.id);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test mock-data/tests/location-news-media.test.mjs`

Expected: FAIL because `media.mjs` does not exist.

- [ ] **Step 3: Implement the Pexels adapter and theme queries**

```js
export const MEDIA_QUERIES = {
  home_values: ["American home exterior real estate", "residential houses neighborhood exterior"],
  housing_supply: ["new home construction", "apartment building exterior housing"],
  local_economy: ["American city skyline business district", "office district local economy"],
  loan_limits: ["mortgage paperwork calculator house", "home finance documents desk"]
};
```

Request landscape, large results with `content_filter`-equivalent safe search behavior where supported. Select 12 approved photos per theme, for 48 total assets. Reject watermarks, baked text, visible rate numbers, approval stamps, identifiable financial documents, distressed-person imagery, and photos that imply exact locality.

- [ ] **Step 4: Download stable card assets and write provenance**

For each selected Pexels result, download `src.landscape` to `site/assets/news/<theme>-<nn>.jpg`. Write provider ID, photographer, photographer URL, Pexels photo page, Pexels license URL, retrieved date, source dimensions, local path, alt text, average color, focal point, and `approvalStatus: "approved"` to the media manifest. Add a `Photos provided by Pexels` link in the manifest for rendering near the section or inside the article modal.

- [ ] **Step 5: Document the build-time secret**

```dotenv
PEXELS_API_KEY=
```

The generator must throw `PEXELS_API_KEY is required with --refresh-media` before making a request. Existing approved media manifests must work without a key.

- [ ] **Step 6: Run media tests and asset checks**

Run: `node --test mock-data/tests/location-news-media.test.mjs`

Expected: PASS.

Run: `node -e "const m=require('./mock-data/location-news-media-manifest.json'); if(m.assets.length<48) process.exit(1); console.log(m.assets.length)"`

Expected: `48` or greater.

- [ ] **Step 7: Commit media code, manifest, and approved assets**

```powershell
git add .env.example mock-data/location-news/lib/media.mjs mock-data/location-news-media-manifest.json mock-data/tests/location-news-media.test.mjs site/assets/news
git commit -m "feat: add licensed location news media library"
```

### Task 7: Compose Articles And Enforce The Evidence Contract

**Files:**
- Create: `mock-data/location-news/lib/compose.mjs`
- Create: `mock-data/location-news/lib/validate.mjs`
- Create: `mock-data/tests/location-news-compose.test.mjs`
- Create: `mock-data/tests/location-news-validate.test.mjs`
- Create: `mock-data/tests/fixtures/location-news-fixtures.mjs`

**Interfaces:**
- Produces: `composeCityArticles(context)`, `composeStateArticles(context)`, `validateArticle(article)`, and `validateCorpus(corpus)`.
- Every article shape: `{ id, route, locationId, locationType, articleType, title, dek, previewText, publishedAt, updatedAt, imageId, keyTakeaways, sections, visuals, tables, ctaPlacements, methodology, limitations, sourceRecords, relatedRoutes, reviewStatus, complianceStatus }`.

- [ ] **Step 1: Write the city composition test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { composeCityArticles } from "../location-news/lib/compose.mjs";
import { cityFixture } from "./fixtures/location-news-fixtures.mjs";

test("composes four complete and distinct Austin articles", () => {
  const articles = composeCityArticles(cityFixture);
  assert.equal(articles.length, 4);
  assert.deepEqual(new Set(articles.map((a) => a.articleType)), new Set(["affordability_home_values", "housing_supply_tenure", "local_labor_market", "county_loan_limits"]));
  for (const article of articles) {
    assert.equal(article.locationId, "city-austin-tx");
    assert.ok(article.sourceRecords.length >= 1);
    assert.ok(article.sections.reduce((sum, section) => sum + section.body.join(" ").split(/\s+/).length, 0) >= 600);
    assert.ok(article.visuals.length >= 1);
    assert.ok(article.imageId);
  }
});
```

Create `location-news-fixtures.mjs` with Austin ACS 2024/2019 estimates and margins, BLS latest/previous/year-ago measures, Travis County FHFA/HUD limits, Texas comparison data, four complete media assets, product routes, and related routes. Export `cityFixture` and one composer-produced `validArticleFixture` so both tests share the same contract.

- [ ] **Step 2: Write validator failure tests**

```js
import { validArticleFixture } from "./fixtures/location-news-fixtures.mjs";

test("rejects unsupported numbers", () => {
  const article = structuredClone(validArticleFixture);
  article.sections[0].body.push("The local value is $999,999.");
  assert.throws(() => validateArticle(article), /numeric claim.*999,999/i);
});

test("rejects duplicated substantive paragraphs", () => {
  const a = structuredClone(validArticleFixture);
  const b = structuredClone(validArticleFixture);
  b.id = "second";
  b.route = "/learning-center/second";
  assert.throws(() => validateCorpus([a, b]), /duplicate substantive paragraph/i);
});
```

- [ ] **Step 3: Run composition and validation tests and verify failure**

Run: `node --test mock-data/tests/location-news-compose.test.mjs mock-data/tests/location-news-validate.test.mjs`

Expected: FAIL because composer and validator modules do not exist.

- [ ] **Step 4: Implement eight explicit composers**

Export these functions from `compose.mjs`:

```js
export const cityComposers = {
  affordability_home_values: composeCityAffordability,
  housing_supply_tenure: composeCityHousingSupply,
  local_labor_market: composeCityLabor,
  county_loan_limits: composeCityLoanLimits
};

export const stateComposers = {
  state_home_price_movement: composeStateHpi,
  state_labor_market: composeStateLabor,
  state_housing_costs: composeStateHousing,
  state_loan_limit_landscape: composeStateLoanLimits
};
```

Each composer must build 600-900 words from location-specific evidence, use at least four quantitative facts, include one comparison, cite every metric through `sourceRecordIds`, render one chart/table model, include a mid-article CTA, and explain what the data cannot decide for a borrower. Do not create a generic fallback composer.

- [ ] **Step 5: Implement strict corpus validation**

`validateArticle` must enforce IDs, routes, dates, 600-900 body words, at least four evidence facts, at least one comparison, source coverage, image provenance, visual/table data, methodology, limitations, CTAs, internal links, and review states. `validateCorpus` must enforce 3,144 minimum location articles, exactly four article types per location, unique IDs/routes/titles, no empty feeds, no scaffold phrases, and no exact normalized substantive paragraph shared by two articles.

- [ ] **Step 6: Run tests**

Run: `node --test mock-data/tests/location-news-compose.test.mjs mock-data/tests/location-news-validate.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit the composition slice**

```powershell
git add mock-data/location-news/lib/compose.mjs mock-data/location-news/lib/validate.mjs mock-data/tests/fixtures/location-news-fixtures.mjs mock-data/tests/location-news-compose.test.mjs mock-data/tests/location-news-validate.test.mjs
git commit -m "feat: compose and validate researched location articles"
```

### Task 8: Generate The National Corpus In Batches

**Files:**
- Create: `mock-data/generate-location-news.mjs`
- Create: `mock-data/location-news-index.json`
- Create: `mock-data/location-news-source-manifest.json`
- Create: `mock-data/location-news/<state>/<location>.json`
- Modify: `mock-data/production-seed.json`
- Create: `mock-data/tests/location-news-corpus.test.mjs`

**Interfaces:**
- Consumes: all source adapters, composers, validators, production seed, and approved media manifest.
- Produces: 786 bundles, 3,144+ article index records, location `newsArticleIds`, 40 batch reports, and source checksums.

- [ ] **Step 1: Write the corpus acceptance test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seed = JSON.parse(fs.readFileSync(new URL("../production-seed.json", import.meta.url), "utf8"));
const index = JSON.parse(fs.readFileSync(new URL("../location-news-index.json", import.meta.url), "utf8"));

test("covers every location with four unique articles", () => {
  const locations = [...seed.states, ...seed.cities];
  assert.equal(locations.length, 786);
  assert.ok(index.articles.length >= 3144);
  for (const location of locations) {
    assert.equal(location.newsArticleIds.length, 4, `${location.id} article count`);
    assert.equal(new Set(location.newsArticleIds).size, 4, `${location.id} duplicate article id`);
  }
});
```

- [ ] **Step 2: Run the corpus test and verify missing output failure**

Run: `node --test mock-data/tests/location-news-corpus.test.mjs`

Expected: FAIL because the news index does not exist.

- [ ] **Step 3: Implement the generator CLI**

```txt
node mock-data/generate-location-news.mjs \
  --batch-size 20 \
  --source-cache mock-data/source-cache \
  --refresh-sources \
  --refresh-media
```

Support `--refresh-sources`, `--refresh-media`, `--batch-size`, `--source-cache`, and `--location-id`. Default to cached official sources and the committed media manifest. Process state locations first, then cities, 20 per batch, for 40 total batches.

- [ ] **Step 4: Write outputs atomically and update compact references**

Write each location bundle before adding its four index rows. After every batch, validate the batch and append `{ batch, locationIds, articleIds, sourceIds, status }` to the manifest. After all batches pass, run `validateCorpus`, atomically replace the index and manifests, and update only `newsArticleIds` plus source geography in `production-seed.json`.

- [ ] **Step 5: Preserve existing article routes without generic bodies**

For each of the existing 24 article routes, either reuse that ID/route for an equivalent complete generated article or create a complete evergreen article record outside the 3,144 minimum. Add aliases only when the destination is semantically equivalent. Remove the generic article renderer dependency; no existing article route may fall back to scaffold body copy.

- [ ] **Step 6: Generate and test the full corpus**

Run: `node mock-data/generate-location-news.mjs --batch-size 20 --source-cache mock-data/source-cache`

Expected: `Generated at least 3144 articles for 786 locations in 40 validated batches.`

Run: `node --test mock-data/tests/location-news-corpus.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit generated data separately**

```powershell
git add mock-data/generate-location-news.mjs mock-data/location-news-index.json mock-data/location-news-source-manifest.json mock-data/location-news mock-data/production-seed.json mock-data/tests/location-news-corpus.test.mjs
git commit -m "feat: generate national location news corpus"
```

### Task 9: Replace Fragment Routing And Load The News Index

**Files:**
- Modify: `site/app.js`
- Modify: `site/index.html`
- Modify: `vercel.json`
- Modify: `site/phase2-static-smoke.mjs`

**Interfaces:**
- Produces: clean path routing, `maps.newsArticles`, `maps.newsByLocation`, `loadArticleContent(indexItem)`, and `navigate(path, options)`.
- Consumed by: cards, modal, direct article routes, metadata, and sitemap links.

- [ ] **Step 1: Add failing clean-route smoke assertions**

```js
if (/window\.location\.hash|hashchange/.test(appSource)) fail("site/app.js still uses fragment routing");
if (!/window\.history\.pushState/.test(appSource)) fail("site/app.js missing History API navigation");
if (!/location-news-index\.json/.test(appSource)) fail("site/app.js does not load the news index");
if (!/"rewrites"/.test(read("vercel.json"))) fail("vercel.json missing SPA route rewrites");
```

- [ ] **Step 2: Run smoke and verify the routing failures**

Run: `node site/phase2-static-smoke.mjs`

Expected: FAIL on fragment routing, missing History API, missing news index, and missing rewrites.

- [ ] **Step 3: Switch the shell to absolute static assets**

```html
<link rel="stylesheet" href="/site/styles.css" />
<script type="module" src="/site/app.js"></script>
```

Use absolute data URLs:

```js
const DATA_URL = "/mock-data/production-seed.json";
const NEWS_INDEX_URL = "/mock-data/location-news-index.json";
const NEWS_MEDIA_URL = "/mock-data/location-news-media-manifest.json";
```

- [ ] **Step 4: Implement clean navigation**

```js
function route(path) {
  return normalizeRoute(path || "/");
}

function currentPath() {
  return normalizeRoute(decodeURI(window.location.pathname || "/"));
}

function navigate(path, { replace = false, state = {} } = {}) {
  const method = replace ? "replaceState" : "pushState";
  window.history[method](state, "", route(path));
  void render();
}
```

Intercept only unmodified, same-origin, left-button anchor clicks. Leave external links, downloads, `target`, modifier keys, and hash-only links to native browser behavior. Replace `hashchange` with `popstate`.

- [ ] **Step 5: Load and map the compact index**

```js
const [seedResponse, newsResponse, mediaResponse] = await Promise.all([
  fetch(DATA_URL),
  fetch(NEWS_INDEX_URL),
  fetch(NEWS_MEDIA_URL)
]);
data = await seedResponse.json();
newsIndex = await newsResponse.json();
mediaManifest = await mediaResponse.json();
maps = buildMaps(data, newsIndex, mediaManifest);
```

Register every news index route in `maps.routes`, build `newsByLocation`, and cache location bundle promises by `contentPath`.

- [ ] **Step 6: Add Vercel SPA rewrites**

```json
{
  "rewrites": [
    { "source": "/locations/:path*", "destination": "/site/index.html" },
    { "source": "/learning-center/:path*", "destination": "/site/index.html" },
    { "source": "/rates/:path*", "destination": "/site/index.html" },
    { "source": "/loan-options/:path*", "destination": "/site/index.html" },
    { "source": "/calculators/:path*", "destination": "/site/index.html" },
    { "source": "/loan-officers/:path*", "destination": "/site/index.html" },
    { "source": "/branches/:path*", "destination": "/site/index.html" }
  ],
  "redirects": [{ "source": "/site", "destination": "/", "permanent": false }]
}
```

Also rewrite the exact directory roots that are public routes. Verify static `/site/*` and `/mock-data/*` assets remain direct files.

- [ ] **Step 7: Run smoke and representative direct-route HTTP checks**

Run: `node site/phase2-static-smoke.mjs`

Expected: fragment-routing assertions PASS and existing route checks remain green.

Run after starting a fallback-capable local server: `Invoke-WebRequest http://127.0.0.1:4173/locations/texas/austin -UseBasicParsing | Select-Object -ExpandProperty StatusCode`

Expected: `200`.

- [ ] **Step 8: Commit routing and index loading**

```powershell
git add site/app.js site/index.html site/phase2-static-smoke.mjs vercel.json
git commit -m "feat: add clean routes and location news index"
```

### Task 10: Render Image-Forward Location News Cards

**Files:**
- Modify: `site/app.js`
- Create: `site/news-renderer.mjs`
- Modify: `site/styles.css`
- Modify: `site/phase2-static-smoke.mjs`

**Interfaces:**
- Produces: `locationNewsFeed(location)` and `newsCard(article)`.
- Consumes: `maps.newsByLocation`, `maps.newsMedia`, and existing `section()`.

- [ ] **Step 1: Add failing placement and card assertions**

```js
if (!/function locationNewsFeed\(/.test(appSource)) fail("locationNewsFeed renderer missing");
if (!/class="news-card-media"/.test(appSource)) fail("news card media missing");
if (!/data-news-article-id/.test(appSource)) fail("news Read more hook missing");

const stateBrief = appSource.indexOf('label: "State brief"');
const stateFeed = appSource.indexOf('locationNewsFeed(state)');
const stateTable = appSource.indexOf('<section class="section">', stateBrief);
if (!(stateBrief < stateFeed && stateFeed < stateTable)) fail("state news feed placement is incorrect");

const cityBrief = appSource.indexOf('label: "Local cost read"');
const cityFeed = appSource.indexOf('locationNewsFeed(city)');
const cityTable = appSource.indexOf('<section class="section">', cityBrief);
if (!(cityBrief < cityFeed && cityFeed < cityTable)) fail("city news feed placement is incorrect");
```

- [ ] **Step 2: Run smoke and verify card/placement failures**

Run: `node site/phase2-static-smoke.mjs`

Expected: FAIL on missing renderer, media, hook, and placement.

- [ ] **Step 3: Implement the card renderer**

```js
function newsCard(article) {
  const media = maps.newsMedia[article.imageId];
  return `
    <article class="news-card">
      <a class="news-card-media" href="${route(article.route)}" data-news-article-id="${esc(article.id)}">
        <img src="${esc(media.localPath)}" alt="${esc(media.alt)}" loading="lazy" decoding="async" style="object-position:${esc(media.focalPoint)}" />
        <span class="news-card-topic">${esc(article.relevanceLabel)}</span>
      </a>
      <div class="news-card-body">
        <p class="news-card-meta">${esc(article.sourceLabels.join(" + "))} | ${esc(formatDate(article.publishedAt))}</p>
        <h3><a href="${route(article.route)}" data-news-article-id="${esc(article.id)}">${esc(article.title)}</a></h3>
        <p>${esc(article.previewText)}</p>
        <a class="text-link" href="${route(article.route)}" data-news-article-id="${esc(article.id)}">Read more</a>
      </div>
    </article>`;
}
```

- [ ] **Step 4: Implement the section and exact placements**

`locationNewsFeed(location)` must assert exactly four articles and render title `Latest {State} mortgage and housing updates` for states or `Latest {City} market updates` for cities. Insert it immediately after the opening `editorialSection()` in `statePage` and `cityPage`.

- [ ] **Step 5: Add headless-news styling**

```css
.news-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
.news-card { min-width:0; border-top:3px solid var(--snap-blue); background:#fff; }
.news-card-media { position:relative; display:block; aspect-ratio:16 / 9; overflow:hidden; background:#e7eef5; }
.news-card-media img { width:100%; height:100%; object-fit:cover; transition:transform 180ms ease; }
.news-card:hover .news-card-media img { transform:scale(1.025); }
.news-card-topic { position:absolute; left:10px; bottom:10px; padding:5px 8px; background:rgba(8,18,36,.9); color:#fff; font-size:11px; font-weight:900; }
.news-card-body { display:grid; gap:10px; padding:16px 2px 0; }
.news-card-body h3 { font-size:21px; }
.news-card-meta { font-size:12px; }
@media (max-width:1040px) { .news-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:760px) { .news-grid { grid-template-columns:1fr; } }
```

Keep text outside the photograph. Do not add presenter faces, decorative overlays, giant typography, or baked thumbnail text.

- [ ] **Step 6: Run static smoke**

Run: `node site/phase2-static-smoke.mjs`

Expected: PASS with both placement assertions green.

- [ ] **Step 7: Commit the card slice**

```powershell
git add site/app.js site/styles.css site/phase2-static-smoke.mjs
git commit -m "feat: add image-forward location news cards"
```

### Task 11: Build Full Article Routes And Progressive Modals

**Files:**
- Modify: `site/app.js`
- Modify: `site/styles.css`
- Modify: `site/phase2-static-smoke.mjs`

**Interfaces:**
- Produces: shared `renderArticleContent(article, media)`, `openArticleModal(indexItem, trigger)`, `closeArticleModal(options)`, and async modal loading.
- Keeps the existing action modal unchanged and separate.

- [ ] **Step 1: Add failing modal accessibility assertions**

```js
for (const required of ["data-article-modal", "aria-modal=\"true\"", "data-article-modal-title", "data-article-modal-close", "openArticleModal", "closeArticleModal"]) {
  if (!appSource.includes(required)) fail(`article modal missing ${required}`);
}
if (!/window\.history\.pushState\([^)]*articleModal/.test(appSource)) fail("article modal does not update history state");
```

- [ ] **Step 2: Run smoke and verify modal failures**

Run: `node site/phase2-static-smoke.mjs`

Expected: FAIL on the article modal requirements.

- [ ] **Step 3: Add a dedicated article dialog shell**

```html
<div class="article-modal-backdrop" data-article-modal hidden>
  <section class="article-modal" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
    <button class="modal-close" type="button" aria-label="Close article" data-article-modal-close>&times;</button>
    <div class="article-modal-scroll" data-article-modal-content></div>
  </section>
</div>
```

Do not reuse the compact CTA modal, because full article semantics, scroll behavior, focus placement, and history state differ.

- [ ] **Step 4: Render one article body for both surfaces**

Export `renderArticleContent(article, media)` from `site/news-renderer.mjs`. It renders headline, dek, desk/date/review metadata, stock hero photo and credit, key takeaways, every semantic section, chart/table models, mid-article CTAs, methodology, limitations, source links, related links, and disclosure. The browser modal imports this function; the Node generator imports the same function when emitting standalone HTML, so both surfaces share markup and data.

- [ ] **Step 5: Implement modal history and focus behavior**

```js
async function openArticleModal(indexItem, trigger) {
  const article = await loadArticleContent(indexItem);
  articleModalReturnFocus = trigger;
  articleModalOrigin = currentPath();
  articleModalContent.innerHTML = articleContent(article);
  articleModal.hidden = false;
  document.body.classList.add("no-scroll");
  window.history.pushState({ articleModal: true, origin: articleModalOrigin }, "", indexItem.route);
  articleModalContent.querySelector("h1, h2")?.setAttribute("tabindex", "-1");
  articleModalContent.querySelector("h1, h2")?.focus();
}
```

On close, use `history.back()` when the current state was created by the modal; direct article visits render the standalone route. `popstate` must close an open modal when returning to its origin and open the modal again on Forward when the state contains `articleModal`.

- [ ] **Step 6: Add large-dialog and mobile-sheet styling**

```css
.article-modal-backdrop { position:fixed; inset:0; z-index:130; display:grid; place-items:center; padding:24px; background:rgba(8,18,36,.58); }
.article-modal-backdrop[hidden] { display:none; }
.article-modal { position:relative; width:min(1040px,calc(100vw - 32px)); max-height:calc(100vh - 48px); overflow:hidden; background:#fff; border:1px solid var(--line); }
.article-modal-scroll { max-height:inherit; overflow:auto; overscroll-behavior:contain; }
.news-article { width:min(820px,calc(100% - 40px)); margin:0 auto; padding:48px 0 64px; }
.news-article p { font-size:18px; line-height:1.7; }
@media (max-width:760px) { .article-modal-backdrop { padding:0; } .article-modal { width:100%; max-height:100dvh; height:100dvh; border:0; } }
```

- [ ] **Step 7: Implement keyboard containment**

Trap `Tab` and `Shift+Tab` inside the article modal, close on Escape, close on backdrop only when `event.target === backdrop`, restore focus to the invoking link, and keep the compact action modal's existing behavior intact.

- [ ] **Step 8: Run static smoke**

Run: `node site/phase2-static-smoke.mjs`

Expected: PASS.

- [ ] **Step 9: Commit modal and article rendering**

```powershell
git add site/app.js site/news-renderer.mjs site/styles.css site/phase2-static-smoke.mjs
git commit -m "feat: add crawlable full article modals"
```

### Task 12: Add SEO Artifacts And Run End-To-End QA

**Files:**
- Modify: `mock-data/generate-location-news.mjs`
- Modify: `site/index.html`
- Modify: `site/app.js`
- Modify: `site/news-renderer.mjs`
- Create: `site/generated/learning-center/<slug>.html`
- Create: `site/sitemap.xml`
- Create: `site/robots.txt`
- Modify: `site/phase2-static-smoke.mjs`
- Create: `mock-data/tests/location-news-seo.test.mjs`

**Interfaces:**
- Consumes: complete route index, article metadata, `SITE_ORIGIN`, and article content.
- Produces: canonical metadata, Open Graph/Twitter metadata, `Article` JSON-LD, sitemap, robots file, and final validation evidence.

- [ ] **Step 1: Write sitemap and metadata tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sitemap = fs.readFileSync(new URL("../../site/sitemap.xml", import.meta.url), "utf8");
const index = JSON.parse(fs.readFileSync(new URL("../location-news-index.json", import.meta.url), "utf8"));

test("sitemap contains every article route once", () => {
  for (const article of index.articles) {
    const count = sitemap.split(article.route).length - 1;
    assert.equal(count, 1, article.route);
  }
});

test("article metadata is complete", () => {
  for (const article of index.articles) {
    assert.ok(article.title.length <= 70, article.id);
    assert.ok(article.metaDescription.length >= 120 && article.metaDescription.length <= 165, article.id);
    assert.match(article.route, /^\/learning-center\/[a-z0-9-]+$/);
  }
});
```

- [ ] **Step 2: Run SEO tests and verify missing artifact failure**

Run: `node --test mock-data/tests/location-news-seo.test.mjs`

Expected: FAIL because `site/sitemap.xml` does not exist or article metadata is incomplete.

- [ ] **Step 3: Generate sitemap and robots output**

Use `SITE_ORIGIN` with default `https://mortgage-website-platform-plan-thinkwhale.vercel.app`. Generate one `<url>` for every public seed route and news article route, with XML escaping and `lastmod` from article `updatedAt` or the source manifest generation date.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://mortgage-website-platform-plan-thinkwhale.vercel.app/</loc></url>
</urlset>
```

```txt
User-agent: *
Allow: /
Sitemap: https://mortgage-website-platform-plan-thinkwhale.vercel.app/sitemap.xml
```

- [ ] **Step 4: Pre-render every standalone article document**

For every article record, call the shared `renderArticleContent(article, media)` and write `site/generated/learning-center/<slug>.html` with complete `<title>`, meta description, canonical, Open Graph/Twitter tags, `Article` JSON-LD, `/site/styles.css`, the Snap public header/footer, full article markup, and related links. Do not load `site/app.js` on this document; all educational content and navigation must work without JavaScript.

Add this rewrite before the generic learning-center SPA rewrite:

```json
{ "source": "/learning-center/:slug", "destination": "/site/generated/learning-center/:slug.html" }
```

Add `/sitemap.xml -> /site/sitemap.xml` and `/robots.txt -> /site/robots.txt` rewrites, and point `robots.txt` to `/sitemap.xml`.

- [ ] **Step 5: Add dynamic canonical and social metadata**

Add canonical, Open Graph, Twitter card, and JSON-LD nodes to `site/index.html`. In `setDocumentMeta`, update title, description, canonical URL, `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card=summary_large_image`, and an `Article` JSON-LD object for article routes. Restore location metadata when a modal closes.

- [ ] **Step 6: Expand the final static smoke suite**

Validate:

- 49 states, 737 cities, 786 location bundles, and at least 3,144 location articles.
- Four article IDs and four article types for every location.
- Unique IDs, routes, titles, and meta descriptions.
- Complete source records and media records.
- Source geography matches article geography.
- Body word count, sections, takeaways, visuals/tables, methodology, limitations, CTAs, and related links.
- No duplicate substantive paragraphs.
- No scaffold phrases or unsupported claim phrases.
- Every internal route resolves.
- Every article route appears once in the sitemap.
- Every article route has one pre-rendered HTML file containing its title, preview, body, canonical, and source links.
- Clean routing, modal hooks, focus rules, photo credits, responsive classes, and hidden-state CSS.

- [ ] **Step 7: Run the complete automated verification**

```powershell
node --check mock-data/generate-location-news.mjs
node --check site/app.js
node --test mock-data/tests
node site/phase2-static-smoke.mjs
git diff --check
```

Expected: all commands exit 0; static smoke reports at least 3,981 routes and no failures.

- [ ] **Step 8: Run browser QA at representative routes**

Start a fallback-capable server on an unused port. Verify at minimum:

- `/locations/texas/austin`
- `/locations/california/irvine`
- `/locations/alabama/hoover`
- `/locations/hawaii/honolulu`
- one direct city article route
- one direct state article route

For each route, check desktop 1440x900 and mobile 390x844. Confirm all four images load, no horizontal overflow exists, headlines fit, `Read more` opens the modal, URL changes, Back closes, Forward reopens, Escape closes, focus returns, background is inert, modal scroll works, sources open, direct article refresh works, and console/network logs contain no errors.

- [ ] **Step 9: Run corpus spot review**

Review one generated article of every city and state article type across at least eight different states. Check every number against its source record, verify the image matches the topic without claiming exact locality, and confirm borrower language avoids approval, eligibility, savings, pricing, valuation, or government-endorsement implications.

- [ ] **Step 10: Commit SEO and final validation changes**

```powershell
git add mock-data/generate-location-news.mjs mock-data/tests/location-news-seo.test.mjs site/index.html site/app.js site/news-renderer.mjs site/generated/learning-center site/sitemap.xml site/robots.txt site/phase2-static-smoke.mjs vercel.json
git commit -m "feat: add location article seo and validation"
```

## Plan Compliance Matrix

| Requirement | Implementation task | Verification task |
| --- | --- | --- |
| Four articles per 786 locations | Tasks 7-8 | Tasks 8 and 12 |
| Official local evidence | Tasks 3-5 | Tasks 7, 8, and 12 |
| No filler or duplicated bodies | Task 7 | Tasks 7, 8, and 12 |
| Stock-photo news cards | Tasks 6 and 10 | Tasks 10 and 12 |
| Exact feed placement | Task 10 | Tasks 10 and 12 |
| Full article modal | Task 11 | Tasks 11 and 12 |
| Crawlable direct routes | Tasks 9 and 11 | Tasks 9 and 12 |
| SEO metadata and sitemap | Task 12 | Task 12 |
| Existing CTA simulations preserved | Tasks 9-11 | Task 12 |
| Mobile and accessibility behavior | Tasks 10-11 | Task 12 |

## External Preconditions

- `mock-data/source-cache/uscities.csv` or the existing `%TEMP%\uscities.csv` is available when regenerating national location geography.
- Network access is required only when refreshing official source files or the media library.
- `PEXELS_API_KEY` is required for the first approved media-library refresh. It is currently not configured in the local environment.
- A compliance/editorial reviewer must approve generated mortgage content before any production publishing decision.

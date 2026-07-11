import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { fetchToCache, slugify } from "./core.mjs";
import { STATE_FIPS } from "./state-geography.mjs";

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
  medianOwnerCostWithMortgage: ["B25103_001E", "B25103_001M"],
};

export const ACS_YEARS = ["2024", "2019"];
export const ACS_SUMMARY_TABLES = ["B01003", "B19013", "B25001", "B25002", "B25003", "B25064", "B25077", "B25103"];
export const ACS_RELEASE_URL = "https://www.census.gov/programs-surveys/acs/news/data-releases/2024/release.html";
export const ACS_SUMMARY_PAGE = "https://www.census.gov/programs-surveys/acs/data/summary-file.2024.html";
const PLACE_ALIASES = new Map([
  ["city-athens-ga", "athens-clarke-county-unified-government-balance"],
  ["city-augusta-ga", "augusta-richmond-county-consolidated-government-balance"],
  ["city-city-of-milford-balance-ct", "milford-city-balance"],
  ["city-honolulu-hi", "urban-honolulu"],
  ["city-indianapolis-in", "indianapolis-city-balance"],
  ["city-lexington-ky", "lexington-fayette-urban-county"],
  ["city-louisville-ky", "louisville-jefferson-county-metro-government-balance"],
  ["city-nashville-tn", "nashville-davidson-metropolitan-government-balance"],
]);

function canonicalPlaceName(value) {
  return slugify(String(value || "").replace(/\bsaint\b/gi, "St.").replace(/[’']/g, ""));
}

function censusPlaceNames(value) {
  const base = String(value || "").replace(/,.*$/, "").trim();
  return {
    raw: canonicalPlaceName(base),
    stripped: canonicalPlaceName(base.replace(/\s+(city|town|village|borough|municipality|cdp)(?:\s+\(part\))?$/i, "")),
    isCity: /\s+city(?:\s+\(part\))?$/i.test(base),
  };
}

function numeric(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > -1_000_000_000 ? parsed : null;
}

function rowObjects(rows) {
  const [headers, ...body] = rows;
  return body.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function metricRecords(row, year, geographyType, geographyId, sourceUrl) {
  return Object.fromEntries(
    Object.entries(ACS_VARIABLES).map(([metric, [estimateId, marginId]]) => [
      metric,
      {
        estimate: numeric(row[estimateId]),
        marginOfError: numeric(row[marginId]),
        variableOrSeriesId: estimateId,
        marginVariableId: marginId,
        dataset: "Census ACS 5-year detailed tables",
        geographyType,
        geographyId,
        period: year,
        sourceUrl,
      },
    ]),
  );
}

function assertCompleteMetrics(locationId, metrics, availableFields = null) {
  const missing = [];
  for (const [metric, record] of Object.entries(metrics)) {
    if (availableFields && !availableFields.has(record.variableOrSeriesId) && !availableFields.has(record.marginVariableId)) continue;
    if (!Number.isFinite(record.estimate)) missing.push(`${metric} ${record.variableOrSeriesId} estimate`);
    if (!Number.isFinite(record.marginOfError)) missing.push(`${metric} ${record.marginVariableId} margin of error`);
  }
  if (missing.length) throw new Error(`ACS evidence incomplete for ${locationId}: ${missing.join("; ")}`);
}

export function mapPlaceRows(rows, cities, year, { sourceUrl = `https://api.census.gov/data/${year}/acs/acs5`, retrievedAt = "2026-07-10" } = {}) {
  const objects = rowObjects(rows);
  const output = {};
  const failures = [];
  for (const city of cities) {
    const expectedName = PLACE_ALIASES.get(city.id) || canonicalPlaceName(city.name);
    const matches = objects.filter(
      (row) => {
        const names = censusPlaceNames(row.NAME);
        return row.state === city.sourceGeography.stateFips && (names.raw === expectedName || names.stripped === expectedName);
      },
    );
    const exactRaw = matches.filter((row) => censusPlaceNames(row.NAME).raw === expectedName);
    const cityMatches = matches.filter((row) => censusPlaceNames(row.NAME).isCity);
    const selected = exactRaw.length === 1 ? exactRaw[0] : cityMatches.length === 1 ? cityMatches[0] : matches.length === 1 ? matches[0] : null;
    if (!selected) {
      failures.push(`${city.id} expected 1 row, found ${matches.length}`);
      continue;
    }
    const row = selected;
    const placeFips = `${row.state}${String(row.place).padStart(5, "0")}`;
    const metrics = metricRecords(row, year, "place", placeFips, sourceUrl);
    assertCompleteMetrics(city.id, metrics, new Set(Object.keys(row)));
    output[city.id] = {
      locationId: city.id,
      geographyType: "place",
      geographyId: placeFips,
      placeFips,
      name: row.NAME,
      period: year,
      retrievedAt,
      sourceUrl,
      releaseUrl: ACS_RELEASE_URL,
      ...(PLACE_ALIASES.has(city.id) ? { alias: PLACE_ALIASES.get(city.id) } : {}),
      metrics,
    };
  }
  if (failures.length) throw new Error(`ACS place coverage failures (${failures.length}): ${failures.join("; ")}`);
  return output;
}

export function mapStateRows(rows, states, year, { sourceUrl = `https://api.census.gov/data/${year}/acs/acs5`, retrievedAt = "2026-07-10" } = {}) {
  const objects = rowObjects(rows);
  const output = {};
  for (const state of states) {
    const row = objects.find((candidate) => candidate.NAME === state.name);
    if (!row) throw new Error(`ACS state match ${state.id} for ${year} expected 1 row, found 0`);
    const metrics = metricRecords(row, year, "state", row.state, sourceUrl);
    assertCompleteMetrics(state.id, metrics, new Set(Object.keys(row)));
    output[state.id] = {
      locationId: state.id,
      geographyType: "state",
      geographyId: row.state,
      period: year,
      retrievedAt,
      sourceUrl,
      releaseUrl: ACS_RELEASE_URL,
      metrics,
    };
  }
  return output;
}

function variableQuery() {
  return ["NAME", ...Object.values(ACS_VARIABLES).flat()].join(",");
}

async function readJson(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  if (/^\s*</.test(source)) throw new Error(`Invalid Census API cache ${filePath}: received HTML instead of JSON`);
  return JSON.parse(source);
}

export function summaryColumnForApiVariable(variableId) {
  const match = String(variableId).match(/^([A-Z]\d+)_(\d{3})([EM])$/);
  if (!match) throw new Error(`Unsupported ACS variable id ${variableId}`);
  return `${match[1]}_${match[3]}${match[2]}`;
}

export function summaryUrls(year) {
  const isPrototypeRelease = year === "2019";
  const root = isPrototypeRelease
    ? `https://www2.census.gov/programs-surveys/acs/summary_file/${year}/prototype`
    : `https://www2.census.gov/programs-surveys/acs/summary_file/${year}/table-based-SF`;
  return {
    geographyFilename: `Geos${year}5YR.${isPrototypeRelease ? "csv" : "txt"}`,
    geography: isPrototypeRelease
      ? `${root}/Geos${year}5YR.csv`
      : `${root}/documentation/Geos${year}5YR.txt`,
    tables: Object.fromEntries(ACS_SUMMARY_TABLES.map((table) => [
      table,
      isPrototypeRelease
        ? `${root}/5YRData/acsdt5y${year}-${table.toLowerCase()}.dat`
        : `${root}/data/5YRData/acsdt5y${year}-${table.toLowerCase()}.dat`,
    ])),
  };
}

async function existingSummaryPath(root, year, filename) {
  for (const candidate of [path.join(root, year, filename), path.join(root, filename)]) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next supported local layout.
    }
  }
  throw new Error(`Missing Census summary-file input ${filename} under ${root}`);
}

async function acquireSummaryFiles({ year, cacheDir, summaryFileDir, refresh }) {
  const urls = summaryUrls(year);
  const filenames = {
    geography: urls.geographyFilename,
    tables: Object.fromEntries(ACS_SUMMARY_TABLES.map((table) => [table, `acsdt5y${year}-${table.toLowerCase()}.dat`])),
  };
  if (summaryFileDir) {
    return {
      urls,
      geography: await existingSummaryPath(summaryFileDir, year, filenames.geography),
      tables: Object.fromEntries(await Promise.all(ACS_SUMMARY_TABLES.map(async (table) => [table, await existingSummaryPath(summaryFileDir, year, filenames.tables[table])]))),
    };
  }
  const yearDir = path.join(cacheDir, "census-summary", year);
  const geography = path.join(yearDir, filenames.geography);
  const tables = Object.fromEntries(ACS_SUMMARY_TABLES.map((table) => [table, path.join(yearDir, filenames.tables[table])]));
  await Promise.all([
    fetchToCache(urls.geography, geography, { refresh }),
    ...ACS_SUMMARY_TABLES.map((table) => fetchToCache(urls.tables[table], tables[table], { refresh })),
  ]);
  return { urls, geography, tables };
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function parseGeographyLine(line, delimiter) {
  return delimiter === "," ? parseCsvLine(line) : line.split(delimiter);
}

async function readSummaryGeographies(filePath, stateFips) {
  const wantedStates = new Set(stateFips);
  const records = new Map();
  const lines = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let headers;
  let delimiter;
  for await (const line of lines) {
    if (!headers) {
      delimiter = line.includes("|") ? "|" : ",";
      headers = parseGeographyLine(line, delimiter).map((value) => value.trim());
      continue;
    }
    if (!line) continue;
    const values = parseGeographyLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    // The 2019 prototype CSV uses DADSID for the table row identifier.
    const geoId = row.GEO_ID || row.DADSID || row.GEOID;
    const code = geoId?.split("US").at(-1);
    if (geoId?.startsWith("0400000US") && wantedStates.has(code)) {
      records.set(geoId, { NAME: row.NAME, state: code });
    } else if (geoId?.startsWith("1600000US") && code?.length === 7 && wantedStates.has(code.slice(0, 2))) {
      records.set(geoId, { NAME: row.NAME, state: code.slice(0, 2), place: code.slice(2) });
    }
  }
  return records;
}

async function mergeSummaryTable(filePath, records, table) {
  const variables = Object.values(ACS_VARIABLES).flat().filter((variableId) => variableId.startsWith(`${table}_`));
  const wantedColumns = new Map(variables.map((variableId) => [summaryColumnForApiVariable(variableId), variableId]));
  const lines = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let headers;
  let indexes;
  for await (const line of lines) {
    if (!headers) {
      headers = line.split("|").map((value) => value.trim());
      indexes = [...wantedColumns].map(([column, variableId]) => ({ variableId, index: headers.indexOf(column) }));
      const missing = indexes.filter(({ index }) => index < 0);
      if (missing.length) throw new Error(`Census summary table ${table} missing required columns in ${filePath}`);
      continue;
    }
    if (!line) continue;
    const values = line.split("|");
    const record = records.get(values[0]);
    if (!record) continue;
    for (const { variableId, index } of indexes) record[variableId] = values[index];
  }
}

function summaryRows(records, geographyType) {
  const variables = Object.values(ACS_VARIABLES).flat();
  const headers = ["NAME", ...variables, "state", ...(geographyType === "place" ? ["place"] : [])];
  const body = [...records.values()]
    .filter((record) => geographyType === "place" ? record.place : !record.place)
    .map((record) => headers.map((header) => record[header]));
  return [headers, ...body];
}

function patchSummaryMetricSources(mapped, urls) {
  for (const location of Object.values(mapped)) {
    for (const metric of Object.values(location.metrics)) {
      const table = metric.variableOrSeriesId.split("_")[0];
      metric.dataset = "Census ACS 5-year Table-Based Summary File";
      metric.sourceUrl = urls.tables[table];
    }
  }
}

async function loadCensusSummaryEvidence({ cities, states, cacheDir, summaryFileDir, refresh }) {
  const byCityId = {};
  const byStateId = {};
  const sources = [];
  const cityStateFips = cities.map((city) => city.sourceGeography.stateFips);
  const missingStateFips = states.filter((state) => !STATE_FIPS[state.abbr]).map((state) => state.id);
  if (missingStateFips.length) throw new Error(`Missing state FIPS coverage: ${missingStateFips.join(", ")}`);
  const stateFips = [...new Set([...cityStateFips, ...states.map((state) => STATE_FIPS[state.abbr])])].sort();
  for (const year of ACS_YEARS) {
    const files = await acquireSummaryFiles({ year, cacheDir, summaryFileDir, refresh });
    const records = await readSummaryGeographies(files.geography, stateFips);
    for (const table of ACS_SUMMARY_TABLES) await mergeSummaryTable(files.tables[table], records, table);
    const mappedStates = mapStateRows(summaryRows(records, "state"), states, year, { sourceUrl: ACS_SUMMARY_PAGE });
    const mappedCities = mapPlaceRows(summaryRows(records, "place"), cities, year, { sourceUrl: ACS_SUMMARY_PAGE });
    patchSummaryMetricSources(mappedStates, files.urls);
    patchSummaryMetricSources(mappedCities, files.urls);
    for (const [id, record] of Object.entries(mappedStates)) {
      byStateId[id] ||= {};
      byStateId[id][year === "2024" ? "current" : "prior"] = record;
    }
    for (const [id, record] of Object.entries(mappedCities)) {
      byCityId[id] ||= {};
      byCityId[id][year === "2024" ? "current" : "prior"] = record;
    }
    sources.push({ dataset: `ACS ${year} 5-year geography labels`, sourceUrl: files.urls.geography, sourcePage: ACS_SUMMARY_PAGE, cachePath: files.geography });
    for (const table of ACS_SUMMARY_TABLES) sources.push({ dataset: `ACS ${year} 5-year ${table}`, sourceUrl: files.urls.tables[table], sourcePage: ACS_SUMMARY_PAGE, cachePath: files.tables[table] });
  }
  return { mode: "table_based_summary_file", byCityId, byStateId, aliases: Object.fromEntries(PLACE_ALIASES), sources };
}

async function loadCensusApiEvidence({ cities, states, cacheDir, refresh, apiKey }) {
  const byCityId = {};
  const byStateId = {};
  const sources = [];
  const stateFips = [...new Set(cities.map((city) => city.sourceGeography.stateFips))].sort();

  for (const year of ACS_YEARS) {
    const baseUrl = `https://api.census.gov/data/${year}/acs/acs5`;
    const stateUrl = `${baseUrl}?get=${variableQuery()}&for=state:*&key=${encodeURIComponent(apiKey)}`;
    const statePath = path.join(cacheDir, `census-acs5-${year}-states.json`);
    await fetchToCache(stateUrl, statePath, { refresh });
    const mappedStates = mapStateRows(await readJson(statePath), states, year, { sourceUrl: baseUrl });
    for (const [id, record] of Object.entries(mappedStates)) {
      byStateId[id] ||= {};
      byStateId[id][year === "2024" ? "current" : "prior"] = record;
    }

    for (const fips of stateFips) {
      const url = `${baseUrl}?get=${variableQuery()}&for=place:*&in=state:${fips}&key=${encodeURIComponent(apiKey)}`;
      const filePath = path.join(cacheDir, `census-acs5-${year}-places-${fips}.json`);
      await fetchToCache(url, filePath, { refresh });
      const stateCities = cities.filter((city) => city.sourceGeography.stateFips === fips);
      const mappedCities = mapPlaceRows(await readJson(filePath), stateCities, year, { sourceUrl: baseUrl });
      for (const [id, record] of Object.entries(mappedCities)) {
        byCityId[id] ||= {};
        byCityId[id][year === "2024" ? "current" : "prior"] = record;
      }
      sources.push({ dataset: `ACS ${year} 5-year places`, sourceUrl: url, cachePath: filePath, stateFips: fips });
    }
    sources.push({ dataset: `ACS ${year} 5-year states`, sourceUrl: stateUrl, cachePath: statePath });
  }

  return {
    mode: "api",
    byCityId,
    byStateId,
    aliases: Object.fromEntries(PLACE_ALIASES),
    sources,
  };
}

export async function loadCensusEvidence({
  cities,
  states,
  cacheDir,
  refresh = false,
  apiKey = process.env.CENSUS_API_KEY || null,
  summaryFileDir = null,
}) {
  if (apiKey) return loadCensusApiEvidence({ cities, states, cacheDir, refresh, apiKey });
  return loadCensusSummaryEvidence({ cities, states, cacheDir, summaryFileDir, refresh });
}

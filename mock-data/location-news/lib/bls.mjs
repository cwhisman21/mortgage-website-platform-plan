import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";

import { fetchToCache, latestComparablePeriods, slugify } from "./core.mjs";

export const BLS_FILES = {
  areas: "https://download.bls.gov/pub/time.series/la/la.area",
  series: "https://download.bls.gov/pub/time.series/la/la.series",
  cities: "https://download.bls.gov/pub/time.series/la/la.data.65.City",
  states: "https://download.bls.gov/pub/time.series/la/la.data.1.CurrentS",
};

const MEASURE_NAMES = {
  "03": "unemploymentRate",
  "04": "unemployment",
  "05": "employment",
  "06": "laborForce",
};
const PLACE_ALIASES = new Map([
  ["city-athens-ga", "athens-clarke-county"],
  ["city-augusta-ga", "augusta-richmond-county"],
  ["city-carson-city-nv", "carson"],
  ["city-city-of-milford-balance-ct", "milford"],
  ["city-honolulu-hi", "honolulu"],
  ["city-lexington-ky", "lexington-fayette"],
  ["city-louisville-ky", "louisville-jefferson-county"],
  ["city-nashville-tn", "nashville-davidson"],
]);

export function normalizeLausCityName(value) {
  const source = String(value || "");
  const label = source
    .replace(/[â€™']/g, "")
    .replace(/,.*$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/,\s*[A-Z]{2}(?:\b|$)/, "")
    .replace(/\s+(?:county\/city|borough\/municipality|city\/town|city|town|village)$/i, (match) => (/,[\s]*[A-Z]{2}(?:\b|$)/.test(source) ? "" : match))
    .replace(/\bsaint\b/gi, "St.");
  return slugify(label);
}

export function parseSeriesId(seriesId) {
  const value = String(seriesId || "").trim();
  if (!/^LA[US].{15}\d{2}$/.test(value)) throw new Error(`Invalid LAUS series id ${value}`);
  return {
    seasonal: value[2],
    areaCode: value.slice(3, -2),
    measure: value.slice(-2),
  };
}

export function selectLausMeasures(rows) {
  const usable = rows.filter(
    (row) => MEASURE_NAMES[row.measure] && /^M(0[1-9]|1[0-2])$/.test(row.period),
  );
  const periods = latestComparablePeriods(
    usable.map((row) => `${row.year}-${row.period}`),
  );
  const output = {};
  for (const [label, period] of Object.entries(periods)) {
    output[label] = { period };
    for (const row of usable.filter((candidate) => `${candidate.year}-${candidate.period}` === period)) {
      output[label][MEASURE_NAMES[row.measure]] = Number(row.value);
    }
  }
  return output;
}

function cleanHeader(value) {
  return value.trim().toLowerCase();
}

async function parseAreaFile(filePath) {
  const lines = (await fs.readFile(filePath, "utf8")).split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split("\t").map(cleanHeader);
  return lines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));
  });
}

function areaStateAbbr(areaText) {
  return String(areaText || "").match(/,\s*([A-Z]{2})(?:\b|$)/)?.[1] || null;
}

function cityAreaPriority(area) {
  const label = String(area.area_text || "").toLowerCase();
  if (label.includes("(incorporated)")) return 2;
  if (label.includes("(consolidated)")) return 1;
  return 0;
}

function targetAreas(areas, locations, type) {
  const targetsByKey = new Map();
  for (const location of locations) {
    if (type === "city") {
      const name = PLACE_ALIASES.get(location.id) || normalizeLausCityName(location.name);
      const stateAbbr = location.sourceGeography.cityKey.split("|").at(-1);
      targetsByKey.set(`${name}|${stateAbbr}`, location);
    } else {
      targetsByKey.set(location.name.toLowerCase(), location);
    }
  }
  const bestCityAreaByLocationId = new Map();
  const byAreaCode = new Map();
  for (const area of areas) {
    if (type === "city" && area.area_type_code !== "G") continue;
    const areaCode = area.area_code;
    const key = type === "city"
      ? `${normalizeLausCityName(area.area_text)}|${areaStateAbbr(area.area_text)}`
      : String(area.area_text || "").toLowerCase();
    const location = targetsByKey.get(key);
    if (!location) continue;
    if (type !== "city") {
      byAreaCode.set(areaCode, location);
      continue;
    }
    const previous = bestCityAreaByLocationId.get(location.id);
    if (!previous || cityAreaPriority(area) < cityAreaPriority(previous)) {
      bestCityAreaByLocationId.set(location.id, area);
    }
  }
  if (type === "city") {
    for (const area of bestCityAreaByLocationId.values()) {
      const key = `${normalizeLausCityName(area.area_text)}|${areaStateAbbr(area.area_text)}`;
      byAreaCode.set(area.area_code, targetsByKey.get(key));
    }
  }
  return byAreaCode;
}

async function readLausData(filePath, targetsByAreaCode) {
  const rowsByLocation = new Map();
  const input = createReadStream(filePath);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let headers;
  for await (const line of lines) {
    if (!headers) {
      headers = line.split("\t").map(cleanHeader);
      continue;
    }
    if (!line.trim()) continue;
    const values = line.split("\t");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));
    if (!/^M(0[1-9]|1[0-2])$/.test(row.period) || Number(row.year) < 2024) continue;
    let parsed;
    try {
      parsed = parseSeriesId(row.series_id);
    } catch {
      continue;
    }
    if (!MEASURE_NAMES[parsed.measure]) continue;
    const location = targetsByAreaCode.get(parsed.areaCode);
    if (!location) continue;
    if (!rowsByLocation.has(location.id)) rowsByLocation.set(location.id, []);
    rowsByLocation.get(location.id).push({
      ...parsed,
      year: row.year,
      period: row.period,
      value: row.value,
      footnotes: row.footnote_codes || null,
      seriesId: row.series_id,
    });
  }
  return rowsByLocation;
}

function finishEvidence(locations, targetsByAreaCode, rowsByLocation, geographyType, sourceUrl) {
  const areaByLocation = new Map(
    [...targetsByAreaCode.entries()].map(([areaCode, location]) => [location.id, areaCode]),
  );
  const output = {};
  const failures = [];
  for (const location of locations) {
    const rows = rowsByLocation.get(location.id);
    if (!rows?.length) {
      failures.push(location.id);
      continue;
    }
    const periods = selectLausMeasures(rows);
    const missing = Object.values(MEASURE_NAMES).filter(
      (measure) => !Number.isFinite(periods.latest[measure]),
    );
    if (missing.length) {
      failures.push(`${location.id} missing ${missing.join(",")}`);
      continue;
    }
    output[location.id] = {
      locationId: location.id,
      geographyType,
      geographyId: areaByLocation.get(location.id),
      areaCode: areaByLocation.get(location.id),
      seasonalAdjustment: geographyType === "city" ? "unadjusted" : rows[0].seasonal === "S" ? "seasonally_adjusted" : "unadjusted",
      latest: periods.latest,
      previous: periods.previous,
      yearAgo: periods.yearAgo,
      seriesIds: [...new Set(rows.map((row) => row.seriesId))],
      sourceUrl,
      retrievedAt: "2026-07-10",
      revisionStatus: "BLS data are subject to revision",
    };
  }
  if (failures.length) throw new Error(`LAUS coverage failures (${failures.length}): ${failures.join(", ")}`);
  return output;
}

export async function loadBlsEvidence({ cities, states, cacheDir, refresh = false }) {
  const paths = Object.fromEntries(
    await Promise.all(
      Object.entries(BLS_FILES).map(async ([key, url]) => {
        const filePath = path.join(cacheDir, path.basename(new URL(url).pathname));
        await fetchToCache(url, filePath, { refresh });
        return [key, filePath];
      }),
    ),
  );
  const areas = await parseAreaFile(paths.areas);
  const cityTargets = targetAreas(areas, cities, "city");
  const stateTargets = targetAreas(areas, states, "state");
  const cityRows = await readLausData(paths.cities, cityTargets);
  const stateRows = await readLausData(paths.states, stateTargets);
  const byCityId = finishEvidence(cities, cityTargets, cityRows, "city", BLS_FILES.cities);
  const byStateId = finishEvidence(states, stateTargets, stateRows, "state", BLS_FILES.states);
  return {
    byCityId,
    byStateId,
    periods: {
      cities: [...new Set(Object.values(byCityId).map((record) => record.latest.period))],
      states: [...new Set(Object.values(byStateId).map((record) => record.latest.period))],
    },
    sources: Object.entries(BLS_FILES).map(([dataset, sourceUrl]) => ({ dataset, sourceUrl, cachePath: paths[dataset] })),
  };
}

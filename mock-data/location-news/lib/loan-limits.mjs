import fs from "node:fs/promises";
import path from "node:path";

import { fetchToCache, parseDelimited } from "./core.mjs";

export const LIMIT_SOURCES = {
  fhfa2026: "https://www.fhfa.gov/document/d/cll/fullcountyloanlimitlist2026_hera-based_final_flat.csv",
  fhfa2026Page: "https://www.fhfa.gov/data/conforming-loan-limit",
  hud2026: "https://apps.hud.gov/pub/chums/cy2026-forward-limits.txt",
  fhfaHpi2026Q1: "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_po_state.txt",
  fhfaHpiPage: "https://www.fhfa.gov/house-price-index",
};

const STATE_FIPS = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11", FL: "12",
  GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23",
  MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33",
  NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56",
};

// Connecticut's planning regions became Census county equivalents in 2022.
const COUNTY_LIMIT_FIPS_ALIASES = new Map([
  ["city-bridgeport-ct", "09120"],
  ["city-danbury-ct", "09190"],
  ["city-norwalk-ct", "09190"],
  ["city-stamford-ct", "09190"],
  ["city-bristol-ct", "09110"],
  ["city-hartford-ct", "09110"],
  ["city-new-britain-ct", "09110"],
  ["city-waterbury-ct", "09140"],
  ["city-city-of-milford-balance-ct", "09170"],
  ["city-meriden-ct", "09170"],
  ["city-new-haven-ct", "09170"],
  ["city-west-haven-ct", "09170"],
]);

export function countyLimitFipsForCity(city) {
  return COUNTY_LIMIT_FIPS_ALIASES.get(city.id) || city.sourceGeography.countyFips;
}

function amount(value) {
  const parsed = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseHudForwardLine(line) {
  const state = line.slice(101, 103).trim();
  const county = line.slice(103, 106).trim().padStart(3, "0");
  const stateFips = STATE_FIPS[state];
  if (!stateFips || !/^\d{3}$/.test(county)) return null;
  return {
    msa: line.slice(0, 5).trim(),
    soa: line.slice(60, 65).trim(),
    limitType: line.slice(65, 66).trim(),
    medianPrice: amount(line.slice(66, 73)),
    oneUnit: amount(line.slice(73, 80)),
    twoUnit: amount(line.slice(80, 87)),
    threeUnit: amount(line.slice(87, 94)),
    fourUnit: amount(line.slice(94, 101)),
    state,
    countyCode: county,
    countyFips: `${stateFips}${county}`,
    stateName: line.slice(106, 132).trim(),
    countyName: line.slice(132, 147).trim(),
  };
}

export function joinCountyLimits(fhfaRows, hudRows) {
  const output = {};
  for (const row of fhfaRows) {
    output[row.countyFips] ||= {};
    output[row.countyFips].conforming = row;
  }
  for (const row of hudRows) {
    if (!row) continue;
    output[row.countyFips] ||= {};
    output[row.countyFips].fha = row;
  }
  return output;
}

function normalizedHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function recordValue(record, candidates) {
  for (const candidate of candidates) {
    const key = Object.keys(record).find((header) => normalizedHeader(header) === candidate);
    if (key) return record[key];
  }
  return undefined;
}

export function parseFhfaCountyCsv(source) {
  const [headers, ...rows] = parseDelimited(source, ",");
  return rows.filter((row) => row.some(Boolean)).map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    const stateFips = String(recordValue(record, ["fipsstatecode", "statefips"]) || "").padStart(2, "0");
    const countyFips = String(recordValue(record, ["fipscountycode", "countyfips"]) || "").padStart(3, "0");
    return {
      countyFips: `${stateFips}${countyFips}`,
      state: recordValue(record, ["state", "stateabbreviation"]),
      countyName: recordValue(record, ["county", "countyname"]),
      oneUnit: amount(recordValue(record, ["oneunitlimit", "oneunit"])),
      twoUnit: amount(recordValue(record, ["twounitlimit", "twounit"])),
      threeUnit: amount(recordValue(record, ["threeunitlimit", "threeunit"])),
      fourUnit: amount(recordValue(record, ["fourunitlimit", "fourunit"])),
    };
  }).filter((row) => /^\d{5}$/.test(row.countyFips) && Number.isFinite(row.oneUnit));
}

function percentChange(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return Number((((current / prior) - 1) * 100).toFixed(2));
}

export function parseFhfaStateHpi(source, stateAbbrs) {
  const rows = parseDelimited(source, "\t").filter((row) => row.some((value) => value.trim()));
  const headers = rows.shift().map(normalizedHeader);
  const wanted = new Set(stateAbbrs);
  const grouped = new Map();
  for (const values of rows) {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));
    const state = row.state || row.stateabbreviation;
    if (!wanted.has(state)) continue;
    const year = Number(row.yr || row.year);
    const quarter = Number(row.qtr || row.quarter);
    const index = Number(row.indexnsa || row.index || row.hpi);
    if (!Number.isFinite(year) || !Number.isFinite(quarter) || !Number.isFinite(index)) continue;
    if (!grouped.has(state)) grouped.set(state, []);
    grouped.get(state).push({ state, year, quarter, index });
  }

  const output = {};
  for (const state of wanted) {
    const records = (grouped.get(state) || []).sort((a, b) => a.year - b.year || a.quarter - b.quarter);
    const latest = records.at(-1);
    if (!latest) continue;
    const priorQuarter = records.find((row) => row.year * 4 + row.quarter === latest.year * 4 + latest.quarter - 1);
    const yearAgo = records.find((row) => row.year === latest.year - 1 && row.quarter === latest.quarter);
    const fiveYearsAgo = records.find((row) => row.year === latest.year - 5 && row.quarter === latest.quarter);
    output[state] = {
      state,
      period: `${latest.year}Q${latest.quarter}`,
      index: latest.index,
      quarterlyChange: percentChange(latest.index, priorQuarter?.index),
      annualChange: percentChange(latest.index, yearAgo?.index),
      fiveYearChange: percentChange(latest.index, fiveYearsAgo?.index),
      sourceUrl: LIMIT_SOURCES.fhfaHpiPage,
      datasetUrl: LIMIT_SOURCES.fhfaHpi2026Q1,
      retrievedAt: "2026-07-10",
      revisionStatus: "FHFA HPI values may be revised",
    };
  }
  return output;
}

function summarizeLimits(states, countyLimits) {
  const output = {};
  for (const state of states) {
    const stateFips = STATE_FIPS[state.abbr];
    const counties = Object.entries(countyLimits)
      .filter(([countyFips, limits]) => countyFips.startsWith(stateFips) && limits.conforming && limits.fha)
      .map(([countyFips, limits]) => ({ countyFips, ...limits }));
    const conformingValues = counties.map((row) => row.conforming.oneUnit);
    const fhaValues = counties.map((row) => row.fha.oneUnit);
    output[state.id] = {
      locationId: state.id,
      geographyType: "state_counties",
      geographyId: stateFips,
      countyCount: counties.length,
      conforming: {
        minimumOneUnit: Math.min(...conformingValues),
        maximumOneUnit: Math.max(...conformingValues),
        countiesAboveBaseline: conformingValues.filter((value) => value > Math.min(...conformingValues)).length,
      },
      fha: {
        minimumOneUnit: Math.min(...fhaValues),
        maximumOneUnit: Math.max(...fhaValues),
        countiesAboveFloor: fhaValues.filter((value) => value > Math.min(...fhaValues)).length,
      },
      countyFips: counties.map((row) => row.countyFips),
    };
  }
  return output;
}

export async function loadLoanAndHpiEvidence({ cities, states, cacheDir, refresh = false }) {
  const files = {
    fhfa: path.join(cacheDir, "fhfa-2026-county-limits.csv"),
    hud: path.join(cacheDir, "hud-2026-forward-limits.txt"),
    hpi: path.join(cacheDir, "fhfa-hpi-po-state.txt"),
  };
  await Promise.all([
    fetchToCache(LIMIT_SOURCES.fhfa2026, files.fhfa, { refresh }),
    fetchToCache(LIMIT_SOURCES.hud2026, files.hud, { refresh }),
    fetchToCache(LIMIT_SOURCES.fhfaHpi2026Q1, files.hpi, { refresh }),
  ]);
  const fhfaRows = parseFhfaCountyCsv(await fs.readFile(files.fhfa, "utf8"));
  const hudRows = (await fs.readFile(files.hud, "utf8")).split(/\r?\n/).filter(Boolean).map(parseHudForwardLine).filter(Boolean);
  const countyLimits = joinCountyLimits(fhfaRows, hudRows);
  const countyLimitFipsByCityId = Object.fromEntries(cities.map((city) => [city.id, countyLimitFipsForCity(city)]));
  const missingCounties = [...new Set(Object.values(countyLimitFipsByCityId))]
    .filter((countyFips) => !countyLimits[countyFips]?.conforming || !countyLimits[countyFips]?.fha);
  if (missingCounties.length) throw new Error(`County limit coverage failures (${missingCounties.length}): ${missingCounties.join(", ")}`);
  const stateHpiByAbbr = parseFhfaStateHpi(await fs.readFile(files.hpi, "utf8"), states.map((state) => state.abbr));
  const missingStates = states.filter((state) => !stateHpiByAbbr[state.abbr]).map((state) => state.id);
  if (missingStates.length) throw new Error(`FHFA HPI coverage failures (${missingStates.length}): ${missingStates.join(", ")}`);
  return {
    countyLimits,
    countyLimitFipsByCityId,
    countyLimitAliases: cities
      .filter((city) => countyLimitFipsByCityId[city.id] !== city.sourceGeography.countyFips)
      .map((city) => ({
        cityId: city.id,
        sourceCountyFips: city.sourceGeography.countyFips,
        limitCountyFips: countyLimitFipsByCityId[city.id],
        reason: "Connecticut planning region is the current Census county equivalent used by 2026 FHFA and HUD limit files",
      })),
    stateLimitSummaries: summarizeLimits(states, countyLimits),
    stateHpi: Object.fromEntries(states.map((state) => [state.id, stateHpiByAbbr[state.abbr]])),
    sources: [
      { dataset: "FHFA 2026 county conforming loan limits", sourceUrl: LIMIT_SOURCES.fhfa2026Page, datasetUrl: LIMIT_SOURCES.fhfa2026, cachePath: files.fhfa },
      { dataset: "HUD 2026 FHA forward mortgage limits", sourceUrl: LIMIT_SOURCES.hud2026, cachePath: files.hud },
      { dataset: "FHFA purchase-only state HPI", sourceUrl: LIMIT_SOURCES.fhfaHpiPage, datasetUrl: LIMIT_SOURCES.fhfaHpi2026Q1, cachePath: files.hpi },
    ],
  };
}

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizePlaceName(value) {
  return slugify(
    String(value || "")
      .replace(/,.*$/, "")
      .replace(/\s+(city|town|village|borough|municipality|cdp)$/i, ""),
  );
}

export function parseDelimited(source, delimiter = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = String(source || "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function latestComparablePeriods(periods) {
  const sorted = [...new Set(periods)].sort();
  const latest = sorted.at(-1);
  if (!latest || !/^\d{4}-M\d{2}$/.test(latest)) {
    throw new Error("At least one YYYY-MMM period is required");
  }
  const [year, month] = latest.split("-");
  const previousDate = new Date(
    Date.UTC(Number(year), Number(month.slice(1)) - 2, 1),
  );
  const format = (date) =>
    `${date.getUTCFullYear()}-M${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    latest,
    previous: format(previousDate),
    yearAgo: `${Number(year) - 1}-${month}`,
  };
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export async function fetchToCache(
  url,
  filePath,
  { refresh = false, fetchImpl = fetch } = {},
) {
  if (!refresh) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Fetch below when the cache is absent.
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "SnapMortgageLocationResearch/1.0" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Source request failed ${response.status} ${url}`);
  }
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath));
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
  return filePath;
}

export async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

export async function writeTextAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, String(value), "utf8");
  await fs.rename(temporaryPath, filePath);
}

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  fetchToCache,
  latestComparablePeriods,
  normalizePlaceName,
  parseDelimited,
  sha256File,
  slugify,
  writeJsonAtomic,
  writeTextAtomic,
} from "../location-news/lib/core.mjs";

test("normalizes Census and BLS place suffixes", () => {
  assert.equal(normalizePlaceName("Austin city, Texas"), "austin");
  assert.equal(normalizePlaceName("Urban Honolulu CDP"), "urban-honolulu");
  assert.equal(slugify("Coeur d'Alene"), "coeur-d-alene");
});

test("parses quoted CSV and tab records", () => {
  assert.deepEqual(parseDelimited('"A, B",2\n', ","), [["A, B", "2"]]);
  assert.deepEqual(parseDelimited("A\tB\n", "\t"), [["A", "B"]]);
});

test("selects latest, prior month, and prior year", () => {
  const periods = latestComparablePeriods(["2025-M05", "2026-M04", "2026-M05"]);
  assert.deepEqual(periods, {
    latest: "2026-M05",
    previous: "2026-M04",
    yearAgo: "2025-M05",
  });
});

test("caches a response atomically and reuses it", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "location-news-core-"));
  const target = path.join(dir, "source.txt");
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response("official-source", { status: 200 });
  };
  await fetchToCache("https://example.test/source", target, { fetchImpl });
  await fetchToCache("https://example.test/source", target, { fetchImpl });
  assert.equal(requests, 1);
  assert.equal(await fs.readFile(target, "utf8"), "official-source");
  assert.equal((await sha256File(target)).length, 64);
});

test("writes JSON atomically with a trailing newline", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "location-news-core-"));
  const target = path.join(dir, "output.json");
  await writeJsonAtomic(target, { verified: true });
  assert.equal(await fs.readFile(target, "utf8"), '{\n  "verified": true\n}\n');
});

test("writes text atomically without changing its rendered markup", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "location-news-core-"));
  const target = path.join(dir, "article.html");
  await writeTextAtomic(target, "<main>Published article</main>\n");
  assert.equal(await fs.readFile(target, "utf8"), "<main>Published article</main>\n");
});

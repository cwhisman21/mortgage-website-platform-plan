import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const index = JSON.parse(fs.readFileSync(new URL("../mock-data/location-news-index.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

const wordCount = (value) => (String(value || "").match(/\b[A-Za-z0-9][A-Za-z0-9'-]*\b/g) || []).length;

test("every state and city receives at least 250 words of evidence-led local context", () => {
  const wordsByLocation = new Map();
  for (const article of index.articles) {
    const words = wordCount((article.localContext || []).join(" "));
    wordsByLocation.set(article.locationId, (wordsByLocation.get(article.locationId) || 0) + words);
  }
  assert.equal(wordsByLocation.size, 788);
  const failures = [...wordsByLocation].filter(([, words]) => words < 250);
  assert.deepEqual(failures, [], `Location context below 250 words:\n${failures.map(([id, words]) => `${id}: ${words}`).join("\n")}`);
});

test("location pages render the evidence-led context rather than name-swapped filler", () => {
  assert.match(appSource, /article\.localContext/);
  assert.match(appSource, /location-evidence-summary/);
});


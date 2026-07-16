import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registryPath = new URL("./seller-cost-registry.json", import.meta.url);
const allowedGroups = new Set(["sellingExpenses", "obligations"]);
const allowedModes = new Set([
  "percent_of_sale_price",
  "fixed_amount",
  "statutory_transfer_tax",
  "prorated_annual",
  "customer_entered",
]);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

async function loadRegistry() {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

test("seller cost registry rows use supported identifiers, groups, and modes", async () => {
  const registry = await loadRegistry();
  const jurisdictionRows = Object.values(registry.jurisdictions || {}).flatMap((entry) => entry.rows || []);
  const rows = [...registry.defaultRows, ...registry.optionalRows, ...jurisdictionRows];
  const ids = rows.map((row) => row.id);

  assert.equal(new Set(ids).size, ids.length, "row ids must be unique");
  for (const row of rows) {
    assert.equal(allowedGroups.has(row.group), true, `${row.id} must use an allowed group`);
    assert.equal(allowedModes.has(row.mode), true, `${row.id} must use an allowed mode`);
  }
});

test("seller cost registry validates amounts, statutory formulas, and sources", async () => {
  const registry = await loadRegistry();
  const jurisdictionRows = Object.values(registry.jurisdictions || {}).flatMap((entry) => entry.rows || []);
  const rows = [...registry.defaultRows, ...registry.optionalRows, ...jurisdictionRows];

  for (const row of rows) {
    if (row.mode === "fixed_amount") {
      assert.equal(Number.isInteger(row.value), true, `${row.id} fixed amount must be integer cents`);
    }
    if (row.mode === "statutory_transfer_tax") {
      assert.equal(Number.isInteger(row.incrementCents) && row.incrementCents > 0, true, `${row.id} needs a positive increment`);
      assert.equal(Number.isInteger(row.rateCentsPerIncrement) && row.rateCentsPerIncrement > 0, true, `${row.id} needs a positive rate`);
    }
    if (row.asOf !== undefined) {
      assert.match(row.asOf, isoDatePattern, `${row.id} as-of date must be ISO formatted`);
    }
    if (row.sourceType === "official" || row.mode === "statutory_transfer_tax") {
      assert.match(row.sourceUrl || "", /^https:\/\//, `${row.id} requires a source URL`);
    }
    if (/compensation/i.test(row.id)) {
      assert.notEqual(row.sourceType, "official", `${row.id} cannot present compensation as official`);
    }
  }
});

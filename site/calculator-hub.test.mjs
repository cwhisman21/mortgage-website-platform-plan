import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(siteDir, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(siteDir, "styles.css"), "utf8");
const seed = JSON.parse(fs.readFileSync(path.join(siteDir, "..", "mock-data", "production-seed.json"), "utf8"));

test("calculator hub preserves the five canonical calculator destinations", () => {
  assert.deepEqual(seed.calculators.map(({ id }) => id), [
    "calc-payment",
    "calc-affordability",
    "calc-refinance",
    "calc-rent-vs-buy",
    "calc-down-payment",
  ]);

  for (const calculator of seed.calculators) {
    assert.match(appSource, new RegExp(`calculatorHubCard\\([^)]*${calculator.id}|data-calculator-id=`, "s"));
  }
});

test("calculator hub renders the approved editorial orbit and scenario stage structure", () => {
  assert.match(appSource, /<div class="calculator-hub-page">/);
  assert.doesNotMatch(appSource, /<main class="calculator-hub-page">/);
  for (const className of [
    "calculator-hub-page",
    "calculator-hub-intro",
    "calculator-hub-orbit",
    "calculator-hub-primary",
    "calculator-hub-supporting",
    "calculator-hub-prequal",
    "calculator-hub-mobile-stage",
  ]) {
    assert.match(appSource, new RegExp(`class=\"[^\"]*${className}`));
    assert.match(stylesSource, new RegExp(`\\.${className}\\b`));
  }

  assert.match(appSource, /Payment/);
  assert.match(appSource, /Affordability/);
  assert.doesNotMatch(appSource, /See what you qualify for in minutes/);
});

test("calculator cards remain whole-card links with canonical field summaries", () => {
  assert.match(appSource, /<a class="calculator-hub-card[^>]+data-calculator-id=/);
  assert.match(appSource, /calculator\.captures\.slice\(0, 5\)\.map\(humanizePublicLabel\)\.join/);
  assert.doesNotMatch(appSource, /calculator\.captures\.slice\(0, 5\)\.join/);
  assert.doesNotMatch(appSource, /calculator-hub-card[\s\S]{0,800}<button/);
});

test("prequalification CTA uses canonical copy and safe sticky mobile behavior", () => {
  assert.match(appSource, /Review prequalification details/);
  assert.match(appSource, /Organize the borrower, property, and timing details a lender may need to review next steps\./);
  assert.match(appSource, />Review prequalification/);
  assert.doesNotMatch(appSource, /Start a prequalification conversation|>Start prequalification|licensed loan officer/i);

  assert.match(stylesSource, /@media\s*\(max-width:\s*760px\)[\s\S]*\.calculator-hub-prequal\s*\{[\s\S]*position:\s*fixed/);
  assert.match(stylesSource, /padding-bottom:\s*calc\([^;]*env\(safe-area-inset-bottom\)/);
  assert.match(stylesSource, /\.calculator-hub-page[\s\S]*padding-bottom:\s*calc\(/);
}
);

test("interactive calculator hub elements expose visible keyboard focus", () => {
  assert.match(stylesSource, /\.calculator-hub-card:focus-visible/);
  assert.match(stylesSource, /\.calculator-hub-prequal[^,{]*:focus-visible|\.calculator-hub-prequal[\s\S]{0,500}\.button:focus-visible/);
  assert.match(stylesSource, /outline:\s*2px solid var\(--snap-blue\)/);
  assert.match(stylesSource, /outline-offset:\s*2px/);
});

test("calculator currency shells own one continuous focus treatment", () => {
  assert.match(stylesSource, /\.calculator-value-box input\s*\{[\s\S]*?border:\s*0;[\s\S]*?outline:\s*0;[\s\S]*?box-shadow:\s*none;/);
  assert.match(stylesSource, /\.calculator-value-box:focus-within\s*\{[\s\S]*?border-color:\s*var\(--snap-blue\);[\s\S]*?box-shadow:/);
});

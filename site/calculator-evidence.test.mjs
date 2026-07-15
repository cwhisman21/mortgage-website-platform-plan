import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(siteDir, "app.js"), "utf8");

function loadCalculatorEvidenceModel() {
  const startToken = "const FHA_MIP_BASE_LOAN_THRESHOLD";
  const endToken = "const calculatorProductModules";
  const start = appSource.indexOf(startToken);
  const end = appSource.indexOf(endToken);
  assert.ok(start >= 0 && end > start, "app.js must expose the bounded calculator evidence model");
  const modelSource = appSource.slice(start, end);
  return Function(`${modelSource}\nreturn { fhaAnnualMipAssumption, vaFundingFeeRate };`)();
}

test("FHA annual MIP follows the current HUD term, base-loan, and LTV matrix", () => {
  const { fhaAnnualMipAssumption } = loadCalculatorEvidenceModel();
  const mip = (termYears, baseLoanAmount, ltv) => fhaAnnualMipAssumption({ termYears, baseLoanAmount, ltv });

  assert.deepEqual(mip(30, 500000, 0.9), { annualRate: 0.005, duration: "11 years" });
  assert.deepEqual(mip(30, 500000, 0.95), { annualRate: 0.005, duration: "loan term" });
  assert.deepEqual(mip(30, 500000, 0.951), { annualRate: 0.0055, duration: "loan term" });
  assert.deepEqual(mip(30, 800000, 0.9), { annualRate: 0.007, duration: "11 years" });
  assert.deepEqual(mip(30, 800000, 0.95), { annualRate: 0.007, duration: "loan term" });
  assert.deepEqual(mip(30, 800000, 0.951), { annualRate: 0.0075, duration: "loan term" });
  assert.deepEqual(mip(15, 500000, 0.9), { annualRate: 0.0015, duration: "11 years" });
  assert.deepEqual(mip(15, 500000, 0.901), { annualRate: 0.004, duration: "loan term" });
  assert.deepEqual(mip(15, 800000, 0.78), { annualRate: 0.0015, duration: "11 years" });
  assert.deepEqual(mip(15, 800000, 0.9), { annualRate: 0.004, duration: "11 years" });
  assert.deepEqual(mip(15, 800000, 0.901), { annualRate: 0.0065, duration: "loan term" });

  assert.deepEqual(mip(30, 489250, 0.95), { annualRate: 0.005, duration: "loan term" });
});

test("VA funding fees are qualified by transaction, use, down payment, and exemption", () => {
  const { vaFundingFeeRate } = loadCalculatorEvidenceModel();
  const fee = (transaction, use, downPaymentPercent, exempt = false) => vaFundingFeeRate({ transaction, use, downPaymentPercent, exempt });

  assert.equal(fee("irrrl", "subsequent", 0), 0.005);
  assert.equal(fee("purchase", "first", 0), 0.0215);
  assert.equal(fee("purchase", "subsequent", 0), 0.033);
  assert.equal(fee("purchase", "first", 5), 0.015);
  assert.equal(fee("purchase", "subsequent", 10), 0.0125);
  assert.equal(fee("cash-out", "first", 0), 0.0215);
  assert.equal(fee("cash-out", "subsequent", 0), 0.033);
  assert.equal(fee("purchase", "subsequent", 0, true), 0);
});

test("calculator inputs replace universal DTI, PMI, down-payment, and closing-cost claims", () => {
  assert.match(appSource, /"Editable DTI planning assumption %", "dtiAssumption", "decimal", "36"/);
  assert.match(appSource, /form\.get\("dtiAssumption"\)/);
  assert.doesNotMatch(appSource, /dtiCap|selectedProgram === "fha" \? 0\.43/);

  assert.match(appSource, /"Hypothetical annual PMI rate %", "annualPmiRate", "decimal", "0"/);
  assert.doesNotMatch(appSource, /0\.0046|minDownRate|Minimum down payment shown/);

  assert.match(appSource, /"Editable closing-cost assumption %", "closingCostRate", "decimal", "4"/);
  assert.match(appSource, /form\.get\("closingCostRate"\)/);
  assert.doesNotMatch(appSource, /price \* 0\.018|price \* 0\.04/);
});

test("USDA always requires official property and income verification", () => {
  assert.doesNotMatch(appSource, /37601|72712|65201|isUsdaEligibleZip/);
  assert.match(appSource, /https:\/\/eligibility\.sc\.egov\.usda\.gov\/eligibility\//);
  assert.match(appSource, /USDA property and income verification is required/i);
  assert.match(appSource, /Confirm the current fee with USDA and the lender before relying on this estimate/i);
  assert.doesNotMatch(appSource, /revalidated before release/i);
});

test("calculator comparison statuses are neutral", () => {
  for (const blockedLabel of ["Available", "Needs review", "Check eligibility", "Location gated"]) {
    assert.doesNotMatch(appSource, new RegExp(`status: "${blockedLabel}"`));
  }
  assert.equal((appSource.match(/status: "Planning comparison"/g) || []).length, 4);
  assert.doesNotMatch(appSource, />Unavailable</);
});

test("calculator pages disclose formulas, boundaries, inclusions, and exclusions", () => {
  assert.match(appSource, /P &times; r\(1 \+ r\)<sup>n<\/sup>/);
  assert.match(appSource, /Result period and rounding/);
  assert.match(appSource, /Included cash-flow components/);
  assert.match(appSource, /Not modeled/);
  assert.match(appSource, /not a Freddie Mac benchmark, Snap offer, APR, or Loan Estimate/i);
  assert.match(appSource, /Lender verification can change/i);
  assert.doesNotMatch(appSource, /licensed review can change/i);
});

test("affordability mode does not imply an FHA or VA fee calculation", () => {
  assert.match(appSource, /FHA MIP is not calculated in this DTI planning target/);
  assert.match(appSource, /VA funding fee is not calculated in this DTI planning target/);
});

test("rent-versus-buy is framed as a partial payment comparison", () => {
  assert.match(appSource, /Partial rent-versus-buy payment comparison/);
  for (const exclusion of ["maintenance", "selling costs", "buying costs", "investment opportunity cost", "tax treatment"]) {
    assert.match(appSource, new RegExp(exclusion, "i"));
  }
  assert.doesNotMatch(appSource, /Estimated equity accumulated/);
});

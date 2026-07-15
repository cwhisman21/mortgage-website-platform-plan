import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));

function functionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = nextName ? appSource.indexOf(`function ${nextName}(`, start + 1) : appSource.length;
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}`);
  return appSource.slice(start, end);
}

test("watchlist state is session-only and its copy names the Snap Homes boundary", () => {
  assert.match(appSource, /let sessionState = \{\s*isLoggedIn: true/);
  assert.match(appSource, /sessionStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(appSource, /sessionStorage\.setItem\(STORAGE_KEY/);
  assert.doesNotMatch(appSource, /localStorage\.(?:getItem|setItem)\(STORAGE_KEY/);
  assert.match(appSource, /this browsing session/i);
  assert.match(appSource, /may continue in Snap Homes/i);
});

test("generic contact and prequalification modals state that they submit nothing", () => {
  const modalCopy = appSource.slice(appSource.indexOf("const CTA_MODALS"), appSource.indexOf("function ctaConfig"));
  assert.match(modalCopy, /No message is sent/i);
  assert.match(modalCopy, /No information is collected or submitted/i);
  assert.doesNotMatch(modalCopy, /available licensed|secure|request has been sent/i);
  assert.match(appSource, /No name, email, phone number, application, or credit decision is submitted here/i);
});

test("loan officer and branch views retain names and profile structure without invented proof", () => {
  const officerSource = functionSource("loanOfficerPage", "branchPage");
  const branchSource = functionSource("branchPage", "fhaAnnualMipAssumption");
  assert.match(officerSource, /profile-hero-card/);
  assert.match(officerSource, /officer\.name/);
  assert.match(branchSource, /branch\.name/);
  assert.doesNotMatch(appSource, /officer\.nmls/);
  assert.doesNotMatch(officerSource, /officer\.(?:licensedStates|languages|specialties|priorityCityIds)/);
  assert.doesNotMatch(branchSource, /(?:service area|address|hours|licens|NMLS|available|verified)/i);
  for (const officer of seed.loanOfficers) {
    assert.equal("nmls" in officer, false, officer.route);
    assert.equal("licensedStates" in officer, false, officer.route);
    assert.equal("languages" in officer, false, officer.route);
    assert.equal("specialties" in officer, false, officer.route);
    assert.equal("priorityCityIds" in officer, false, officer.route);
  }
  for (const branch of seed.branches) {
    assert.match(branch.coverageNote, /Only the branch name and related mortgage education are shown\./);
  }
});

test("directory recovery, product fit, and shared freshness are explicit", () => {
  const productSource = functionSource("productPage", "humanStatus");
  const directorySource = functionSource("directoryPage", "breadcrumb");
  const shellSource = functionSource("pageShell", "homePage");
  assert.doesNotMatch(directorySource, /Open first result/);
  assert.match(directorySource, /data-directory-clear/);
  assert.match(directorySource, /broader location|Browse all/i);
  assert.match(productSource, /productFitAnswer\(product\)/);
  assert.match(appSource, /costsAndTradeoffs/);
  assert.match(appSource, /propertyAndOccupancy/);
  assert.match(appSource, /lenderReview/);
  assert.match(shellSource, /currentPageFreshness\(\)/);
  assert.match(appSource, /renderContentFreshness\(publicFreshnessRecord\(found\)/);
});

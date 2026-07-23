import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function sourceFor(start, end) {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

test("the public header uses one combined mega-menu for navigation and account actions", () => {
  const headerSource = sourceFor("const SITE_NAVIGATION_GROUPS", "function footer()");

  assert.equal((headerSource.match(/data-nav-toggle/g) || []).length, 1);
  for (const label of ["Locations", "Rates", "Buy", "Sell", "Refinance", "Loan Options", "Calculators", "Learning", "Loan Officers", "Branches"]) {
    assert.match(headerSource, new RegExp(label));
  }
  assert.match(headerSource, /site-nav-account-actions/);
  assert.match(headerSource, /Start my Auto Prequal/);
  assert.doesNotMatch(headerSource, /mobilePublicMenu|account-dropdown|data-account-toggle/);
});

test("the homepage presents seven borrower goals, two primary actions, and the state explorer", () => {
  const homeSource = sourceFor("function homePage()", "function locationSnapshotGuidance()");

  for (const label of [
    "Buy a house",
    "Refinance my home",
    "Sell my home",
    "Use home equity",
    "Calculate payments",
    "See current rates",
    "Browse loan officer profiles",
  ]) assert.match(homeSource, new RegExp(label));
  for (const href of ["/buy", "/refinance", "/sell", "/home-equity", "/calculators/mortgage-payment", "/rates", "/loan-officers"]) {
    assert.match(homeSource, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
  assert.match(homeSource, /I want to \.\.\./);
  assert.match(homeSource, /Start your auto-prequal/);
  assert.match(homeSource, /Compare Your Offer/);
  assert.match(homeSource, /renderHomeStateExplorer\(data\.states\)/);
  assert.doesNotMatch(homeSource, /Compare with the numbers in view|Choose your goal|Research with the right context/);
});

test("state city actions jump to a labeled city comparison section", () => {
  const stateSource = sourceFor("function statePage(state)", "function cityPage(city)");

  assert.match(stateSource, /routeWithAnchor\(state\.route, "city-comparison"\)/);
  assert.match(stateSource, /id="city-comparison"/);
  assert.doesNotMatch(stateSource, /const primaryRoute = cities\[0\]/);
});

test("SVG state links resolve their route from the href attribute", () => {
  const clickSource = sourceFor("function handleDocumentClick(event)", "function handleDocumentKeydown(event)");

  assert.match(clickSource, /anchor\.getAttribute\("href"\)/);
  assert.doesNotMatch(clickSource, /new URL\(anchor\.href/);
});

test("responsive styles retain the single full-width mega-menu", () => {
  assert.match(stylesheet, /\.site-nav\.open\s*\{[\s\S]*position:\s*absolute/);
  assert.match(stylesheet, /\.site-nav-groups\s*\{[\s\S]*grid-template-columns:\s*repeat\(4/);
  assert.match(stylesheet, /@media \(max-width: 760px\)[\s\S]*\.site-nav-groups,[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.doesNotMatch(stylesheet, /\.mobile-public-menu/);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function sourceFor(start, end) {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

test("the public header has four actions and one combined menu trigger", () => {
  const headerSource = sourceFor("function mobilePublicMenu()", "function footer()");

  assert.doesNotMatch(headerSource, /data-nav-toggle|class="nav-toggle"/);
  assert.equal((headerSource.match(/data-account-toggle/g) || []).length, 2);
  for (const label of ["Rates", "Learning", "Loan Options", "Compare Your Offer"]) {
    assert.match(headerSource, new RegExp(label));
  }
  assert.match(headerSource, /data-mobile-public-menu/);
  assert.match(headerSource, /data-cta-action="compareOffer"/);
  assert.doesNotMatch(headerSource, />Locations<|>Calculators<|>Loan officers</);
});

test("the homepage presents six borrower goals, two primary actions, and the state explorer", () => {
  const homeSource = sourceFor("function homePage()", "function locationSnapshotGuidance()");

  for (const label of [
    "Buy a house",
    "Refinance my home",
    "Sell my home",
    "Calculate payments",
    "See current rates",
    "Browse loan officer profiles",
  ]) assert.match(homeSource, new RegExp(label));
  for (const href of ["/buy", "/refinance", "/sell", "/calculators/mortgage-payment", "/rates", "/loan-officers"]) {
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

test("mobile styles use the account menu as the only public navigation drawer", () => {
  assert.match(stylesheet, /@media \(max-width: 1040px\)[\s\S]*\.site-nav\s*\{[\s\S]*display:\s*none/);
  assert.match(stylesheet, /\.mobile-public-menu/);
  assert.match(stylesheet, /background:\s*transparent/);
  assert.match(stylesheet, /\.account-name\s*\{[\s\S]*min-width:\s*0/);
});

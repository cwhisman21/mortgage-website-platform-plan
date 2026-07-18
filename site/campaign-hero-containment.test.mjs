import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseStyles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const heroStyles = fs.readFileSync(new URL("./campaign-hero.css", import.meta.url), "utf8");
const staticRouteSource = fs.readFileSync(new URL("./static-route-document.mjs", import.meta.url), "utf8");

function ruleBlock(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*(?:,[^{]+)?\\{([^}]*)\\}`, "s"));
  assert.ok(match, `Expected a CSS rule for ${selector}`);
  return match[1];
}

test("non-home static routes do not load the homepage campaign stylesheet", () => {
  assert.doesNotMatch(staticRouteSource, /campaign-hero\.css/);
});

test("shared styles size the supplied logo on desktop and mobile", () => {
  const desktopLogo = ruleBlock(baseStyles, ".brand-logo");
  assert.match(desktopLogo, /height:\s*72px;/);
  assert.match(desktopLogo, /width:\s*auto;/);
  assert.match(desktopLogo, /max-width:\s*100%;/);

  const mobileStyles = baseStyles.slice(baseStyles.indexOf("@media (max-width: 760px)", 4000));
  const mobileLogo = ruleBlock(mobileStyles, ".brand-logo");
  assert.match(mobileLogo, /height:\s*56px;/);
  assert.match(mobileLogo, /width:\s*auto;/);
});

test("campaign styles do not alter root or shared header layout", () => {
  assert.doesNotMatch(heroStyles, /(^|\})\s*(?:html|body|\.header-inner|\.brand|\.brand-logo)(?:\s*,[^\{]+)?\s*\{/m);
});

test("shared root overflow clipping preserves viewport sticky positioning", () => {
  for (const selector of ["html", "body"]) {
    const rootRule = ruleBlock(baseStyles, selector);
    assert.match(rootRule, /overflow-x:\s*clip;/, `${selector} clips horizontal paint overflow`);
    assert.doesNotMatch(rootRule, /overflow-x:\s*hidden;/, `${selector} does not create a scrolling ancestor`);
  }
});

test("shared styles retain the restored homepage desktop layout contracts", () => {
  const readingShell = ruleBlock(baseStyles, ".home-reading-carousel-shell");
  assert.match(readingShell, /display:\s*grid;/);
  assert.match(readingShell, /gap:\s*14px;/);

  const readingCarousel = ruleBlock(baseStyles, ".home-reading-carousel");
  assert.match(readingCarousel, /grid-auto-columns:\s*minmax\(286px,\s*340px\);/);
  assert.match(readingCarousel, /padding-bottom:\s*16px;/);

  const primaryActions = ruleBlock(baseStyles, ".home-primary-actions");
  assert.match(primaryActions, /display:\s*flex;/);
  assert.match(primaryActions, /justify-content:\s*space-between;/);
  assert.match(primaryActions, /border-top:\s*4px solid var\(--snap-blue\);/);
  assert.match(primaryActions, /background:\s*var\(--navy\);/);

  const stateExplorer = ruleBlock(baseStyles, ".home-state-explorer");
  assert.match(stateExplorer, /display:\s*grid;/);
  assert.match(stateExplorer, /gap:\s*20px;/);
  assert.match(stateExplorer, /text-align:\s*center;/);

  const stateMap = ruleBlock(baseStyles, ".home-state-explorer .us-state-map");
  assert.match(stateMap, /width:\s*min\(1100px,\s*100%\);/);
  assert.match(stateMap, /background:\s*transparent;/);
  assert.match(stateMap, /box-shadow:\s*none;/);

  const stateList = ruleBlock(baseStyles, ".home-state-list-grid");
  assert.match(stateList, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
});

test("restored homepage actions and state list stack on mobile", () => {
  const mobileLayoutStart = baseStyles.indexOf("@media (max-width: 760px)", baseStyles.indexOf(".home-primary-actions {"));
  const mobileOverrideStart = baseStyles.lastIndexOf("@media (max-width: 760px)");
  assert.notEqual(mobileLayoutStart, -1, "Expected the homepage mobile layout breakpoint");
  assert.notEqual(mobileOverrideStart, -1, "Expected the homepage mobile override breakpoint");
  const mobileLayoutStyles = baseStyles.slice(mobileLayoutStart, baseStyles.indexOf("/* Consolidated account navigation", mobileLayoutStart));
  const mobileOverrideStyles = baseStyles.slice(mobileOverrideStart);

  const primaryActions = ruleBlock(mobileOverrideStyles, '[data-design-system="snap-figma-v1"] .section.compact.home-primary-actions');
  assert.match(primaryActions, /padding:\s*14px 22px;/);
  assert.match(primaryActions, /gap:\s*12px;/);

  const actionButtons = ruleBlock(mobileLayoutStyles, ".home-primary-action-buttons");
  assert.match(actionButtons, /display:\s*grid;/);
  assert.match(actionButtons, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);

  const stateList = ruleBlock(mobileLayoutStyles, ".home-state-list-grid");
  assert.match(stateList, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
});

test("campaign content is visible by default and animated only after enhancement", () => {
  for (const selector of [".campaign-loan-card", ".campaign-primary-cta", ".campaign-hero-disclosure"]) {
    const fallbackRule = ruleBlock(heroStyles, selector);
    assert.match(fallbackRule, /opacity:\s*1;/, `${selector} must be visible without JavaScript`);
    assert.match(fallbackRule, /transform:\s*none;/, `${selector} must rest in place without JavaScript`);

    const enhancedRule = ruleBlock(heroStyles, `.campaign-hero-sequence.is-enhanced ${selector}`);
    assert.match(enhancedRule, /opacity:\s*0;/, `${selector} may hide only after enhancement`);
  }
});

test("mobile card and disclosure copy remains readable", () => {
  const mobileStart = heroStyles.indexOf("@media (max-width: 900px)");
  const shortMobileStart = heroStyles.indexOf("@media (max-width: 900px) and (max-height: 720px)");
  const mobileStyles = heroStyles.slice(mobileStart, shortMobileStart);
  const shortMobileStyles = heroStyles.slice(shortMobileStart, heroStyles.indexOf("@media (max-width: 760px)"));

  assert.doesNotMatch(heroStyles, /\.campaign-example-badge/);
  for (const source of [mobileStyles, shortMobileStyles]) {
    assert.match(ruleBlock(source, ".campaign-option-status"), /font-size:\s*10px;/);
    assert.match(ruleBlock(source, ".campaign-terms-list dd"), /font-size:\s*10px;/);
    assert.match(ruleBlock(source, ".campaign-hero-disclosure"), /font-size:\s*11px;/);
  }
});

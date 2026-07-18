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

  for (const source of [mobileStyles, shortMobileStyles]) {
    assert.match(ruleBlock(source, ".campaign-option-status"), /font-size:\s*10px;/);
    assert.match(ruleBlock(source, ".campaign-example-badge"), /font-size:\s*10px;/);
    assert.match(ruleBlock(source, ".campaign-terms-list dd"), /font-size:\s*10px;/);
    assert.match(ruleBlock(source, ".campaign-hero-disclosure"), /font-size:\s*11px;/);
  }
});

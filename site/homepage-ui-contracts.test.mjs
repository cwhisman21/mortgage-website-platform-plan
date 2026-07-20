import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const baseStyles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const heroCardSource = fs.readFileSync(new URL("./campaign-hero-card-layer.mjs", import.meta.url), "utf8");
const heroStyles = fs.readFileSync(new URL("./campaign-hero.css", import.meta.url), "utf8");

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `Expected source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Expected source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function ruleBlock(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*(?:,[^{]+)?\\{([^}]*)\\}`, "s"));
  assert.ok(match, `Expected a CSS rule for ${selector}`);
  return match[1];
}

test("header uses one navigation menu and a plain logged-in welcome", () => {
  const headerSource = sourceBetween(appSource, "const SITE_NAVIGATION_GROUPS", "function footer()");
  const navigationModelSource = sourceBetween(headerSource, "const SITE_NAVIGATION_GROUPS", "function navigationGroup");
  const navSource = sourceBetween(headerSource, '<nav class="site-nav"', "</nav>");

  assert.equal((headerSource.match(/data-nav-toggle/g) || []).length, 1);
  assert.match(headerSource, /id="site-navigation"/);
  assert.match(headerSource, /aria-controls="site-navigation"/);
  assert.match(headerSource, /aria-expanded="false"/);
  assert.match(headerSource, /data-account-target[^>]*>[\s\S]*My Account/);
  assert.match(headerSource, /data-account-action="open" data-account-target>[\s\S]*?\$\{savedBadge\}\s*<\/button>\s*<button class="site-nav-action" type="button" data-cta-action="leadForm"/);
  assert.match(headerSource, /data-account-action="signout"[^>]*>Sign out/);
  assert.match(headerSource, /data-auth-action="login"[^>]*>[\s\S]*?Log in/);
  assert.match(headerSource, /data-cta-action="leadForm"[^>]*>Review guidance options/);
  assert.match(headerSource, /data-cta-action="rateReview"[^>]*>Review rates/);
  assert.match(headerSource, /data-cta-action="compareOffer"[^>]*>Compare an offer/);
  assert.match(headerSource, /class="header-welcome" aria-label="Welcome back, \$\{esc\(SNAP_CUSTOMER\.name\)\}"/);
  assert.match(headerSource, /header-welcome-full[^>]*>Welcome back, \$\{esc\(SNAP_CUSTOMER\.name\)\}/);
  assert.match(headerSource, /\$\{welcome\}\s*<button class="nav-toggle"/);
  assert.equal((navigationModelSource.match(/\bid: "/g) || []).length, 4);
  for (const [heading, links] of [
    ["Explore", [["/locations", "Locations"], ["/rates", "Rates"]]],
    ["Mortgage goals", [["/buy", "Buy"], ["/refinance", "Refinance"], ["/loan-options", "Loan Options"]]],
    ["Tools and learning", [["/calculators", "Calculators"], ["/learning-center", "Learning"]]],
    ["Guidance", [["/loan-officers", "Loan Officers"], ["/branches", "Branches"]]],
  ]) {
    assert.match(headerSource, new RegExp(`label: "${heading}"`));
    for (const [path, label] of links) {
      assert.match(headerSource, new RegExp(`path: "${path}", label: "${label}"`));
    }
  }
  assert.match(headerSource, /<section class="site-nav-group" aria-labelledby="site-nav-\$\{id\}">/);
  assert.match(headerSource, /<h2 class="site-nav-group-title" id="site-nav-\$\{id\}">/);
  assert.match(headerSource, /<ul class="site-nav-group-list">/);
  assert.match(navSource, /\$\{accountNavigation\(\)\}[\s\S]*class="site-nav-cta"[\s\S]*Start my Auto Prequal/);
  assert.match(navSource, /class="site-nav-cta" href="\$\{route\("\/prequal\/start"\)\}"/);
  assert.match(headerSource, /class="header-search-placeholder" aria-hidden="true"/);
  const searchSource = sourceBetween(headerSource, '<div class="header-search-placeholder"', "</div>");
  assert.match(searchSource, /\$\{icon\("search"\)\}/);
  assert.match(searchSource, /<span>Search<\/span>/);
  assert.doesNotMatch(searchSource, /<(?:input|button|a)\b|tabindex=|role="search"|data-/);
  assert.doesNotMatch(navSource, /role="dialog"|aria-modal/);
  assert.match(headerSource, /header-welcome-compact[^>]*>Welcome back, \$\{esc\(firstName\)\}/);
  assert.doesNotMatch(headerSource, /accountMenu|account-trigger|hamburger-lines|account-dropdown|data-account-(?:toggle|menu|root)/);
});
test("the single hamburger opens a full-width translucent semantic mega-menu", () => {
  const releaseStyles = baseStyles.slice(baseStyles.indexOf("/* Full-width semantic mega-menu release. */"));
  assert.match(ruleBlock(baseStyles, ".nav-toggle"), /display:\s*inline-flex;/);
  assert.match(ruleBlock(baseStyles, ".site-nav"), /display:\s*none;/);

  const search = ruleBlock(releaseStyles, ".header-search-placeholder");
  assert.match(search, /width:\s*230px;/);
  const openNavigation = ruleBlock(releaseStyles, ".site-nav.open");
  assert.match(openNavigation, /position:\s*absolute;/);
  assert.match(openNavigation, /inset:\s*100% 0 auto;/);
  assert.match(openNavigation, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(openNavigation, /gap:\s*0;/);
  assert.match(openNavigation, /width:\s*100%;/);
  assert.match(openNavigation, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);/);
  assert.match(openNavigation, /backdrop-filter:\s*blur\(12px\);/);
  assert.match(openNavigation, /border:\s*0;/);
  assert.match(openNavigation, /box-shadow:/);

  const inner = ruleBlock(releaseStyles, ".site-nav-inner");
  assert.match(inner, /max-height:\s*calc\(100vh - 76px\);/);
  assert.match(inner, /max-height:\s*calc\(100dvh - 76px\);/);
  assert.match(inner, /overflow-y:\s*auto;/);
  assert.match(ruleBlock(releaseStyles, ".site-nav-groups"), /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(ruleBlock(releaseStyles, ".site-nav-cta"), /width:\s*100%;/);

  const tablet = releaseStyles.slice(releaseStyles.indexOf("@media (max-width: 1040px)"));
  assert.match(ruleBlock(tablet, ".site-nav-groups"), /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  const mobile = releaseStyles.slice(releaseStyles.indexOf("@media (max-width: 760px)"));
  assert.match(ruleBlock(mobile, ".site-nav-groups"), /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(ruleBlock(mobile, ".header-search-placeholder"), /width:\s*clamp\(56px,\s*20vw,\s*80px\);/);
  assert.match(ruleBlock(mobile, '[data-design-system="snap-figma-v1"] .header-inner'), /42px;/);
});

test("navigation state is synchronized and saved items target the consolidated account action", () => {
  assert.match(appSource, /function closeNavigation\([\s\S]*classList\.remove\("open"\)[\s\S]*aria-expanded", "false"/);
  assert.match(appSource, /toggle\.setAttribute\("aria-expanded", String\(isOpen\)\)/);
  assert.match(appSource, /event\.key === "Escape"[\s\S]*closeNavigation\(\)/);
  assert.match(appSource, /nav\?\.classList\.contains\("open"\)[\s\S]*!headerNode\.contains\(event\.target\)[\s\S]*closeNavigation\(\{ restoreFocus: false \}\)/);
  assert.match(appSource, /if \(event\.key !== "Tab" \|\| !modalIsOpen\) return/);
  assert.match(appSource, /querySelector\("\[data-account-target\]"\)/);
  assert.match(appSource, /target\.getClientRects\(\)\[0\]/);
  assert.doesNotMatch(appSource, /data-account-toggle|function closeAccountMenu/);
});

test("header separation uses only a soft shadow", () => {
  const headerRule = ruleBlock(baseStyles, ".site-header");
  assert.match(headerRule, /border-bottom:\s*0;/);
  assert.match(headerRule, /box-shadow:\s*0 6px 20px rgba\(16, 37, 74, 0\.09\);/);
  const figmaHeaderRule = ruleBlock(baseStyles, '[data-design-system="snap-figma-v1"] .site-header');
  assert.match(figmaHeaderRule, /border-bottom:\s*0;/);
  assert.match(figmaHeaderRule, /box-shadow:\s*0 6px 20px rgba\(16, 37, 74, 0\.09\);/);
  assert.doesNotMatch(figmaHeaderRule, /box-shadow:\s*none/);
});

test("homepage goal cards are shorter without changing other cards", () => {
  const goalCards = ruleBlock(baseStyles, '[data-design-system="snap-figma-v1"] .home-paths .card');
  assert.match(goalCards, /min-height:\s*188px;/);
  assert.match(goalCards, /gap:\s*7px;/);
  assert.match(goalCards, /padding:\s*16px 18px;/);
  const genericCards = ruleBlock(baseStyles, '[data-design-system="snap-figma-v1"] .card');
  assert.match(genericCards, /min-height:\s*240px;/);
});

test("homepage action banner is full bleed and approximately half as padded", () => {
  const banner = ruleBlock(baseStyles, '[data-design-system="snap-figma-v1"] .section.compact.home-primary-actions');
  assert.match(banner, /width:\s*100%;/);
  assert.match(banner, /max-width:\s*none;/);
  assert.match(banner, /margin:\s*0;/);
  assert.match(banner, /padding:\s*17px max\(22px, calc\(\(100vw - var\(--content\)\) \/ 2 \+ 40px\)\);/);
  const mobileStart = baseStyles.lastIndexOf("@media (max-width: 760px)");
  const mobileBanner = ruleBlock(baseStyles.slice(mobileStart), '[data-design-system="snap-figma-v1"] .section.compact.home-primary-actions');
  assert.match(mobileBanner, /padding:\s*14px 22px;/);
});

test("campaign hero uses the approved reel palette and no Example card badges", async () => {
  const { renderCampaignHeroCardLayer } = await import("./campaign-hero-card-layer.mjs");
  const html = renderCampaignHeroCardLayer();
  assert.match(heroStyles, /--campaign-reel-blue:\s*#0b55ff;/);
  assert.match(heroStyles, /--campaign-reel-green:\s*#158b4a;/);
  assert.match(ruleBlock(heroStyles, ".campaign-loan-card__header"), /linear-gradient\(\s*180deg,\s*var\(--campaign-card-accent\)/);
  assert.doesNotMatch(html, /campaign-example-badge|>Example</);
  assert.equal((html.match(/>Daily pricing example<\/p>/g) || []).length, 3);
});

test("campaign hero removes the comparison eyebrow and uses the exact blue headline", async () => {
  const { renderCampaignHeroCardLayer } = await import("./campaign-hero-card-layer.mjs");
  const html = renderCampaignHeroCardLayer();
  assert.doesNotMatch(html, /Compare lender options/i);
  assert.doesNotMatch(heroCardSource, /campaign-hero-eyebrow/);
  assert.match(ruleBlock(heroStyles, ".campaign-hero-title"), /color:\s*#0b55ff;/);
});
test("campaign hero shifts breathing room above the copy and trims the following section gap", () => {
  assert.match(ruleBlock(heroStyles, ".campaign-hero-stage"), /place-items:\s*start center;/);

  const desktopHero = ruleBlock(heroStyles, ".campaign-hero-inner");
  assert.match(
    desktopHero,
    /padding:\s*clamp\(52px,\s*4\.5vw,\s*72px\) clamp\(24px,\s*4vw,\s*64px\) clamp\(8px,\s*1\.5vw,\s*24px\);/,
  );

  const mobileStart = heroStyles.indexOf("@media (max-width: 900px)");
  const shortMobileStart = heroStyles.indexOf("@media (max-width: 900px) and (max-height: 720px)");
  const mobileHero = ruleBlock(heroStyles.slice(mobileStart, shortMobileStart), ".campaign-hero-inner");
  const shortMobileHero = ruleBlock(heroStyles.slice(shortMobileStart), ".campaign-hero-inner");
  assert.match(mobileHero, /align-content:\s*start;/);
  assert.match(mobileHero, /padding:\s*48px 14px 2px;/);
  assert.match(shortMobileHero, /padding:\s*40px 10px 2px;/);

  const homePaths = ruleBlock(baseStyles, '[data-design-system="snap-figma-v1"] .section.home-paths');
  assert.match(homePaths, /padding-top:\s*2px;/);

  const mobileHomeStart = baseStyles.lastIndexOf("@media (max-width: 760px)");
  const mobileHomePaths = ruleBlock(
    baseStyles.slice(mobileHomeStart),
    '[data-design-system="snap-figma-v1"] .section.home-paths',
  );
  assert.match(mobileHomePaths, /padding-top:\s*2px;/);
});

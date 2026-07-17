import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("homepage renders the ordered campaign frame sequence", async () => {
  const {
    CAMPAIGN_HERO_FRAMES,
    campaignHeroFrameIndex,
    renderCampaignHero,
  } = await import("./campaign-hero.mjs");
  const html = renderCampaignHero();

  assert.equal(CAMPAIGN_HERO_FRAMES.length, 30);
  assert.equal(CAMPAIGN_HERO_FRAMES[0], "/site/assets/campaign-hero-frames/ezgif-frame-001.png");
  assert.equal(CAMPAIGN_HERO_FRAMES[29], "/site/assets/campaign-hero-frames/ezgif-frame-030.png");
  assert.equal(new Set(CAMPAIGN_HERO_FRAMES).size, 30);
  assert.equal(campaignHeroFrameIndex(-1), 0);
  assert.equal(campaignHeroFrameIndex(0.5), 15);
  assert.equal(campaignHeroFrameIndex(2), 29);
  assert.match(html, /data-campaign-sequence/);
  assert.match(html, /data-campaign-frame/);
  assert.match(html, /ezgif-frame-001\.png/);
  assert.match(html, /width="1855"/);
  assert.match(html, /height="1751"/);
  assert.match(html, /class="campaign-image-cta"/);
  assert.match(html, /data-cta-action="compareOffer"/);
  assert.match(html, /<h1 class="visually-hidden">A better way to compare mortgage options<\/h1>/);
});

test("campaign hero is connected to the homepage renderer", () => {
  assert.match(appSource, /import \{ initCampaignHero, renderCampaignHero \} from "\/site\/campaign-hero\.mjs"/);
  assert.match(appSource, /\$\{renderCampaignHero\(\)\}/);
  assert.match(appSource, /activeCampaignHeroController\?\.destroy\(\)/);
  assert.match(appSource, /activeCampaignHeroController = initCampaignHero\(app\)/);
});

test("public site loads the approved Figma typography", () => {
  assert.match(indexSource, /family=Inter/);
  assert.match(indexSource, /family=Outfit/);
  assert.match(stylesSource, /--font-display:\s*"Outfield",\s*"Outfit"/);
  assert.match(stylesSource, /--font-body:\s*"Inter"/);
});

test("campaign sequence defines the approved responsive and reduced-motion travel", () => {
  assert.match(stylesSource, /--campaign-scroll-travel:\s*1595px/);
  assert.match(stylesSource, /height:\s*calc\(100vh \+ var\(--campaign-scroll-travel\)\)/);
  assert.match(stylesSource, /\.campaign-hero-stage\s*\{[^}]*position:\s*sticky/s);
  assert.match(stylesSource, /@media \(max-width:\s*760px\)[\s\S]*--campaign-scroll-travel:\s*1015px/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*--campaign-scroll-travel:\s*0px/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*position:\s*relative/);
});

test("homepage follows the approved Figma decision-flow sequence", () => {
  const homeSource = appSource.slice(
    appSource.indexOf("function homePage()"),
    appSource.indexOf("function locationsPage()"),
  );

  assert.match(homeSource, /I want to \.\.\./);
  assert.match(homeSource, /home-primary-actions/);
  assert.match(homeSource, /Start your auto-prequal/);
  assert.match(homeSource, /Compare Your Offer/);
  assert.match(homeSource, /renderHomeStateExplorer/);
  assert.doesNotMatch(homeSource, /home-metrics|Choose your goal|home-decision-grid|Bring your research into one clear comparison/);
  assert.doesNotMatch(homeSource, /routeStrip\(/);
  assert.doesNotMatch(homeSource, /ctaDeck\(/);
});

test("shared public components opt into the approved Figma design layer", () => {
  assert.match(appSource, /data-design-system="snap-figma-v1"/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.hero-band/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.section-header/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.card/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.route-strip/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.cta-panel/);
  assert.match(stylesSource, /\[data-design-system="snap-figma-v1"\] \.site-footer/);
});

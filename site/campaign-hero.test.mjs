import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("homepage uses the approved editable Figma campaign hero", async () => {
  const { renderCampaignHero } = await import("./campaign-hero.mjs");
  const html = renderCampaignHero();

  assert.match(html, /class="campaign-hero"/);
  assert.match(html, /There is a better way than hoping for the best\./);
  assert.match(html, /Start My Comparison/);
  assert.match(html, /Explore local markets/);
  assert.match(html, /campaign-mortgage-machine\.webp/);
  assert.equal((html.match(/<div class="campaign-option /g) || []).length, 3);
});

test("campaign hero is connected to the homepage renderer", () => {
  assert.match(appSource, /import \{ renderCampaignHero \} from "\/site\/campaign-hero\.mjs"/);
  assert.match(appSource, /\$\{renderCampaignHero\(\)\}/);
});

test("public site loads the approved Figma typography", () => {
  assert.match(indexSource, /family=Inter/);
  assert.match(indexSource, /family=Outfit/);
  assert.match(stylesSource, /--font-display:\s*"Outfield",\s*"Outfit"/);
  assert.match(stylesSource, /--font-body:\s*"Inter"/);
});

test("campaign artwork is stored with the deployable site", () => {
  assert.equal(
    fs.existsSync(new URL("./assets/campaign-mortgage-machine.webp", import.meta.url)),
    true,
  );
});

test("homepage follows the approved Figma decision-flow sequence", () => {
  const homeSource = appSource.slice(
    appSource.indexOf("function homePage()"),
    appSource.indexOf("function locationsPage()"),
  );

  assert.match(homeSource, /home-metrics/);
  assert.match(homeSource, /Choose your path/);
  assert.match(homeSource, /home-decision-grid/);
  assert.match(homeSource, /Bring your research into one clear conversation/);
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

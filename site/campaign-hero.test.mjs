import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const staticRouteSource = fs.readFileSync(new URL("./static-route-document.mjs", import.meta.url), "utf8");
const baseStylesSource = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const campaignStylesSource = fs.readFileSync(new URL("./campaign-hero.css", import.meta.url), "utf8");
const campaignModuleSource = fs.readFileSync(new URL("./campaign-hero.mjs", import.meta.url), "utf8");
const stylesSource = `${baseStylesSource}\n${campaignStylesSource}`;

function mutableClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    contains: (value) => values.has(value),
    remove: (value) => values.delete(value),
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
  };
}

function revealFixture(revealFrame) {
  const attributes = new Map([["aria-hidden", "true"]]);
  return {
    classList: mutableClassList(),
    dataset: { revealFrame: String(revealFrame) },
    inert: true,
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
  };
}

function createCampaignHeroHarness({ reducedMotion = false } = {}) {
  let scrollY = 0;
  let nextAnimationFrameId = 1;
  let timeoutCalls = 0;
  const animationFrames = new Map();
  const listeners = new Map();
  const imageRequests = [];
  const images = [];
  const styleValues = new Map([["--campaign-scroll-step", "35px"]]);
  const frame = { src: "/site/assets/campaign-hero-frames/ezgif-frame-001.png" };
  const stage = { offsetHeight: 600 };
  const cards = [revealFixture(17), revealFixture(22), revealFixture(25)];
  const cta = revealFixture(25);
  const disclosure = revealFixture(25);
  cta.setAttribute("tabindex", "-1");
  const track = {
    classList: mutableClassList(),
    dataset: {},
    offsetHeight: 2140,
    style: {
      getPropertyValue: (name) => styleValues.get(name) || "",
      setProperty: (name, value) => styleValues.set(name, value),
    },
    getBoundingClientRect() {
      return { top: -scrollY, bottom: this.offsetHeight - scrollY };
    },
    querySelector(selector) {
      if (selector === ".campaign-hero-stage") return stage;
      if (selector === "[data-campaign-frame]") return frame;
      if (selector === "[data-post-reveal-cta]") return cta;
      if (selector === "[data-post-reveal-disclosure]") return disclosure;
      return null;
    },
    querySelectorAll: (selector) => selector === "[data-reveal-frame]" ? cards : [],
  };
  const header = { getBoundingClientRect: () => ({ height: 0 }) };
  const root = {
    querySelector(selector) {
      if (selector === "[data-campaign-sequence]") return track;
      if (selector === ".site-header") return header;
      return null;
    },
  };

  class FakeImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      images.push(this);
    }

    set src(value) {
      this._src = value;
      imageRequests.push(value);
    }

    get src() {
      return this._src;
    }
  }

  const environment = {
    Image: FakeImage,
    document: {
      documentElement: { contains: (element) => element === track },
      querySelector: () => header,
    },
    innerHeight: 600,
    matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) {
      const id = nextAnimationFrameId++;
      animationFrames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => animationFrames.delete(id),
    setTimeout(callback) {
      timeoutCalls += 1;
      callback();
      return timeoutCalls;
    },
    clearTimeout() {},
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    getComputedStyle: () => ({ getPropertyValue: (name) => styleValues.get(name) || "" }),
    scrollBy({ top }) {
      scrollY += top;
    },
    scrollTo(_x, y) {
      scrollY = y;
    },
  };
  Object.defineProperties(environment, {
    scrollY: { get: () => scrollY },
    pageYOffset: { get: () => scrollY },
  });

  function flushAnimationFrames() {
    while (animationFrames.size) {
      const callbacks = [...animationFrames.values()];
      animationFrames.clear();
      callbacks.forEach((callback) => callback(0));
    }
  }

  return {
    cards,
    cta,
    disclosure,
    environment,
    frame,
    imageRequests,
    images,
    root,
    track,
    get timeoutCalls() {
      return timeoutCalls;
    },
    flushAnimationFrames,
    setProgress(progress) {
      scrollY = progress * 1540;
      listeners.get("scroll")?.();
      flushAnimationFrames();
    },
  };
}

test("campaign hero card layer renders persistent copy and staged accessible options", async () => {
  const { renderCampaignHeroCardLayer } = await import("./campaign-hero-card-layer.mjs");
  const html = renderCampaignHeroCardLayer();

  assert.doesNotMatch(html, /Compare lender options/i);
  assert.match(html, /There is a better way than hoping for the best/);
  assert.match(html, /See lender choices side by side without guessing which path is strongest/);
  assert.match(html, /Lender 1/);
  assert.match(html, /Lender 2/);
  assert.match(html, /Lender 3/);
  assert.match(html, /class="campaign-loan-card campaign-loan-card--featured"[\s\S]*Lender 3/);
  assert.match(html, /30-Year Conventional/);
  assert.match(html, /FHA Loan/);
  assert.match(html, /VA Loan/);
  assert.match(html, /Rate and payment view/);
  assert.match(html, /Fees and credits/);
  assert.match(html, /Next-step clarity/);
  assert.match(html, /data-reveal-frame="17"/);
  assert.match(html, /data-reveal-frame="22"/);
  assert.match(html, /data-reveal-frame="25"/);
  assert.match(html, /--campaign-card-accent: var\(--campaign-reel-blue\)/);
  assert.match(html, /--campaign-card-accent: var\(--campaign-reel-green\)/);
  assert.doesNotMatch(html, /--campaign-card-accent: var\(--snap-blue\)/);
  assert.match(html, /data-post-reveal-cta/);
  assert.match(html, /data-post-reveal-disclosure/);
  assert.match(html, /href="\/prequal\/start"/);
  assert.doesNotMatch(html, /data-cta-action="startPrequal"/);
  assert.doesNotMatch(html, /Loan Type|5\.\d+%|APR|Est\. Payment|Best shown|Example terms|Final terms|underwriting|&#10003;/);
  assert.match(html, /not an offer or commitment to lend/);
  assert.doesNotMatch(html, /<article[^>]+(?:aria-hidden|\sinert(?:\s|>))/);
  assert.doesNotMatch(html, /<a[^>]+data-post-reveal-cta[^>]+(?:aria-hidden|\sinert(?:\s|>)|tabindex)/);
  assert.doesNotMatch(html, /<p[^>]+data-post-reveal-disclosure[^>]+(?:aria-hidden|\sinert(?:\s|>))/);
});

test("campaign hero card layer reveals, holds, and reverses at logical frame thresholds", async () => {
  const { syncCampaignHeroCardLayer } = await import("./campaign-hero-card-layer.mjs");

  function classList() {
    const values = new Set();
    return {
      contains: (value) => values.has(value),
      toggle(value, force) {
        if (force) values.add(value);
        else values.delete(value);
      },
    };
  }

  function fixture(revealFrame) {
    const attributes = new Map([["aria-hidden", "true"]]);
    return {
      classList: classList(),
      dataset: { revealFrame: String(revealFrame) },
      inert: true,
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, String(value)),
      removeAttribute: (name) => attributes.delete(name),
    };
  }

  const cards = [fixture(17), fixture(22), fixture(25)];
  const cta = fixture(25);
  cta.setAttribute("tabindex", "-1");
  const disclosure = fixture(25);
  const root = {
    querySelectorAll: (selector) => selector === "[data-reveal-frame]" ? cards : [],
    querySelector: (selector) => {
      if (selector === "[data-post-reveal-cta]") return cta;
      if (selector === "[data-post-reveal-disclosure]") return disclosure;
      return null;
    },
  };

  assert.equal(syncCampaignHeroCardLayer(17, root), 17);
  assert.equal(cards[0].classList.contains("is-revealed"), true);
  assert.equal(cards[0].getAttribute("aria-hidden"), "false");
  assert.equal(cards[0].inert, false);
  assert.equal(cards[1].classList.contains("is-revealed"), false);

  syncCampaignHeroCardLayer(22, root);
  assert.equal(cards[1].classList.contains("is-revealed"), true);
  assert.equal(cards[2].classList.contains("is-revealed"), false);

  syncCampaignHeroCardLayer(25, root);
  assert.equal(cards[2].classList.contains("is-revealed"), true);
  assert.equal(cta.classList.contains("is-ready"), true);
  assert.equal(cta.getAttribute("aria-hidden"), "false");
  assert.equal(cta.getAttribute("tabindex"), null);
  assert.equal(cta.inert, false);
  assert.equal(disclosure.classList.contains("is-ready"), true);
  assert.equal(disclosure.getAttribute("aria-hidden"), "false");

  assert.equal(syncCampaignHeroCardLayer(45, root), 45);
  assert.equal(cards.every((card) => card.classList.contains("is-revealed")), true);
  assert.equal(cta.classList.contains("is-ready"), true);

  syncCampaignHeroCardLayer(24, root);
  assert.equal(cards[2].classList.contains("is-revealed"), false);
  assert.equal(cards[2].getAttribute("aria-hidden"), "true");
  assert.equal(cards[2].inert, true);
  assert.equal(cta.classList.contains("is-ready"), false);
  assert.equal(cta.getAttribute("tabindex"), "-1");
  assert.equal(disclosure.classList.contains("is-ready"), false);
  assert.equal(disclosure.getAttribute("aria-hidden"), "true");

  syncCampaignHeroCardLayer(21, root);
  assert.equal(cards[1].classList.contains("is-revealed"), false);
  syncCampaignHeroCardLayer(16, root);
  assert.equal(cards[0].classList.contains("is-revealed"), false);
});

test("homepage renders the ordered campaign frame sequence", async () => {
  const {
    CAMPAIGN_HERO_FRAMES,
    campaignHeroClampedScrollDelta,
    campaignHeroFrameIndex,
    campaignHeroScrollProgress,
    renderCampaignHero,
  } = await import("./campaign-hero.mjs");
  const html = renderCampaignHero();

  assert.equal(CAMPAIGN_HERO_FRAMES.length, 45);
  assert.equal(CAMPAIGN_HERO_FRAMES[0], "/site/assets/campaign-hero-frames/ezgif-frame-001.png");
  assert.equal(new Set(CAMPAIGN_HERO_FRAMES).size, 30);
  assert.equal(CAMPAIGN_HERO_FRAMES[19], "/site/assets/campaign-hero-frames/ezgif-frame-020.png");
  assert.deepEqual(
    CAMPAIGN_HERO_FRAMES.slice(29),
    Array(16).fill("/site/assets/campaign-hero-frames/ezgif-frame-030.png"),
  );
  assert.equal(campaignHeroFrameIndex(-1), 0);
  assert.equal(campaignHeroFrameIndex(0.5), 22);
  assert.equal(campaignHeroFrameIndex(2), 44);
  const progressInput = { trackDocumentTop: 92, trackHeight: 2168, stageHeight: 628 };
  assert.equal(campaignHeroScrollProgress({ ...progressInput, trackTop: 92 }), 0);
  assert.equal(campaignHeroScrollProgress({ ...progressInput, trackTop: 91 }), 1 / 1540);
  assert.equal(campaignHeroScrollProgress({ ...progressInput, trackTop: -1448 }), 1);
  assert.equal(campaignHeroClampedScrollDelta(650, 35), 35);
  assert.equal(campaignHeroClampedScrollDelta(-650, 35), -35);
  assert.equal(campaignHeroClampedScrollDelta(24, 35), 24);
  assert.equal(campaignHeroClampedScrollDelta(650, 0), 650);
  assert.match(html, /data-campaign-sequence/);
  assert.match(html, /data-campaign-frame/);
  assert.match(html, /ezgif-frame-001\.png/);
  assert.match(html, /width="1855"/);
  assert.match(html, /height="1751"/);
  assert.match(html, /class="campaign-hero-visual"/);
  assert.match(html, /class="campaign-hero-copy-layer"/);
  assert.doesNotMatch(html, /campaign-image-cta/);
  assert.doesNotMatch(html, /<h1 class="visually-hidden">/);
  assert.doesNotMatch(campaignStylesSource, /\.campaign-image-cta\b/);
});

test("campaign hero is connected to the homepage renderer", () => {
  assert.match(appSource, /import \{ initCampaignHero, renderCampaignHero \} from "\/site\/campaign-hero\.mjs\?v=20260718-12"/);
  assert.match(appSource, /\$\{renderCampaignHero\(\)\}/);
  assert.match(appSource, /activeCampaignHeroController\?\.destroy\(\)/);
  assert.match(appSource, /activeCampaignHeroController = initCampaignHero\(app\)/);
});

test("browser entrypoints load the application module with the campaign module", () => {
  assert.match(indexSource, /src="\/site\/app\.js\?v=20260718-12"/);
  assert.match(staticRouteSource, /src="\/site\/app\.js"/);
  assert.match(campaignModuleSource, /from "\.\/campaign-hero-card-layer\.mjs\?v=20260718-12"/);
  assert.match(indexSource, /href="\/site\/styles\.css\?v=20260718-12"/);
  assert.match(staticRouteSource, /href="\/site\/styles\.css"/);
  assert.match(indexSource, /href="\/site\/campaign-hero\.css\?v=20260718-12"/);
  assert.doesNotMatch(staticRouteSource, /campaign-hero\.css/);
});

test("public site loads the approved Figma typography", () => {
  assert.match(indexSource, /family=Inter/);
  assert.match(indexSource, /family=Outfit/);
  assert.match(stylesSource, /--font-display:\s*"Outfield",\s*"Outfit"/);
  assert.match(stylesSource, /--font-body:\s*"Inter"/);
});

test("campaign sequence defines the approved responsive and reduced-motion travel", () => {
  assert.match(stylesSource, /--campaign-scroll-travel:\s*1540px/);
  assert.match(stylesSource, /--campaign-scroll-step:\s*35px/);
  assert.match(stylesSource, /height:\s*calc\(100vh - var\(--campaign-sticky-top\) \+ var\(--campaign-scroll-travel\)\)/);
  assert.match(stylesSource, /\.campaign-hero-stage\s*\{[^}]*position:\s*sticky/s);
  assert.match(stylesSource, /\.campaign-hero-stage\s*\{[^}]*top:\s*var\(--campaign-sticky-top\)[^}]*height:\s*calc\(100vh - var\(--campaign-sticky-top\)\)/s);
  assert.match(stylesSource, /\.campaign-hero-visual\s*\{[^}]*width:\s*60%[^}]*max-width:\s*63\.564vh[^}]*margin-left:\s*auto[^}]*margin-right:\s*15vw/s);
  assert.match(stylesSource, /\.campaign-hero-sequence \.campaign-hero-image\s*\{[^}]*width:\s*100%[^}]*max-height:\s*none/s);
  assert.match(stylesSource, /@media \(max-width:\s*760px\)[\s\S]*--campaign-scroll-travel:\s*1540px/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*--campaign-scroll-travel:\s*0px/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*position:\s*relative/);
});

test("mobile campaign hero stacks text, machine, cards, CTA, and disclosure in order", () => {
  const mobileStyles = stylesSource.slice(stylesSource.indexOf("@media (max-width: 900px)"));

  assert.match(mobileStyles, /\.campaign-hero-copy-layer\s*\{[^}]*display:\s*contents/s);
  assert.doesNotMatch(mobileStyles, /\.campaign-hero-copy-layer\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(mobileStyles, /\.campaign-hero-eyebrow\s*\{/s);
  assert.match(mobileStyles, /\.campaign-hero-title\s*\{[^}]*order:\s*1/s);
  assert.match(mobileStyles, /\.campaign-hero-lede\s*\{[^}]*order:\s*2/s);
  assert.match(mobileStyles, /\.campaign-hero-sequence \.campaign-hero-visual\s*\{[^}]*order:\s*3/s);
  assert.match(mobileStyles, /\.campaign-loan-card-stack\s*\{[^}]*order:\s*4/s);
  assert.match(mobileStyles, /\.campaign-primary-cta\s*\{[^}]*order:\s*5/s);
  assert.match(mobileStyles, /\.campaign-hero-disclosure\s*\{[^}]*order:\s*6/s);
});

test("campaign cards share a base height while Lender 3 is slightly larger", () => {
  assert.match(stylesSource, /\.campaign-loan-card-stack\s*\{[^}]*align-items:\s*stretch/s);
  assert.match(stylesSource, /\.campaign-loan-card\s*\{[^}]*height:\s*100%[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(stylesSource, /\.campaign-loan-card__body\s*\{[^}]*display:\s*flex[^}]*flex:\s*1[^}]*flex-direction:\s*column/s);
  assert.match(stylesSource, /\.campaign-loan-card--featured\.is-revealed\s*\{[^}]*scale\(1\.02\)/s);
});

test("campaign hero initialization preloads a bounded window without a timer sweep", async () => {
  const { initCampaignHero } = await import("./campaign-hero.mjs");
  const harness = createCampaignHeroHarness();
  const controller = initCampaignHero(harness.root, harness.environment);

  harness.flushAnimationFrames();

  assert.equal(harness.timeoutCalls, 0);
  assert.ok(harness.imageRequests.length <= 4, `expected at most four preload requests, received ${harness.imageRequests.length}`);
  controller.destroy();
});

test("campaign hero progressively preloads adjacent frames as the current frame advances", async () => {
  const { CAMPAIGN_HERO_FRAMES, initCampaignHero } = await import("./campaign-hero.mjs");
  const harness = createCampaignHeroHarness();
  const controller = initCampaignHero(harness.root, harness.environment);

  harness.flushAnimationFrames();
  harness.setProgress(0.5);

  const requestedUrls = new Set(harness.imageRequests);
  CAMPAIGN_HERO_FRAMES.slice(20, 25).forEach((url) => assert.ok(requestedUrls.has(url), `expected adjacent preload for ${url}`));
  assert.ok(harness.imageRequests.length <= 9, `expected a bounded progressive window, received ${harness.imageRequests.length} requests`);
  controller.destroy();
});

test("campaign hero deduplicates preload requests for logical hold frames by URL", async () => {
  const { CAMPAIGN_HERO_FRAMES, initCampaignHero } = await import("./campaign-hero.mjs");
  const harness = createCampaignHeroHarness();
  const controller = initCampaignHero(harness.root, harness.environment);

  harness.flushAnimationFrames();
  for (let frameIndex = 29; frameIndex < CAMPAIGN_HERO_FRAMES.length; frameIndex += 1) {
    harness.setProgress(frameIndex / (CAMPAIGN_HERO_FRAMES.length - 1));
  }

  const finalFrameUrl = CAMPAIGN_HERO_FRAMES.at(-1);
  assert.equal(harness.imageRequests.filter((url) => url === finalFrameUrl).length, 1);
  controller.destroy();
});

test("campaign hero enhancement lifecycle restores an accessible static fallback on destroy", async () => {
  const { initCampaignHero } = await import("./campaign-hero.mjs");
  const harness = createCampaignHeroHarness();
  const controller = initCampaignHero(harness.root, harness.environment);

  assert.equal(harness.track.classList.contains("is-enhanced"), true);
  controller.destroy();

  assert.equal(harness.track.classList.contains("is-enhanced"), false);
  assert.equal(harness.track.dataset.campaignInitialized, undefined);
  assert.equal(harness.cards.every((card) => card.getAttribute("aria-hidden") === "false" && card.inert === false), true);
  assert.equal(harness.cta.getAttribute("aria-hidden"), "false");
  assert.equal(harness.cta.inert, false);
  assert.equal(harness.disclosure.getAttribute("aria-hidden"), "false");
});

test("campaign hero queues no more than one 35px wheel step per animation frame", async () => {
  const { campaignHeroQueuedWheelDelta } = await import("./campaign-hero.mjs");
  const campaignSource = fs.readFileSync(new URL("./campaign-hero.mjs", import.meta.url), "utf8");

  assert.equal(campaignHeroQueuedWheelDelta(0, 650, 35), 35);
  assert.equal(campaignHeroQueuedWheelDelta(35, 650, 35), 35);
  assert.equal(campaignHeroQueuedWheelDelta(0, -650, 35), -35);
  assert.equal(campaignHeroQueuedWheelDelta(35, -10, 35), 25);
  assert.match(campaignSource, /pendingWheelDelta = campaignHeroQueuedWheelDelta\(pendingWheelDelta, delta, step\)/);
  assert.match(campaignSource, /if \(!wheelFrameId\) wheelFrameId = requestFrame\(flushWheelStep\)/);
});

test("campaign hero caps desktop wheel travel while the sticky sequence is active", () => {
  const campaignSource = fs.readFileSync(new URL("./campaign-hero.mjs", import.meta.url), "utf8");
  assert.match(campaignSource, /function handleWheel\(event\)/);
  assert.match(campaignSource, /environment\.addEventListener\("wheel",\s*handleWheel,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.match(campaignSource, /environment\.removeEventListener\("wheel",\s*handleWheel\)/);
});

test("reduced-motion mode exposes the complete static comparison", () => {
  const campaignSource = fs.readFileSync(new URL("./campaign-hero.mjs", import.meta.url), "utf8");

  assert.match(
    campaignSource,
    /if \(reducedMotion\) \{[\s\S]*frame\.src = CAMPAIGN_HERO_FRAMES\.at\(-1\)[\s\S]*syncCampaignHeroCardLayer\(CAMPAIGN_HERO_FRAMES\.length, track\)[\s\S]*return \{ destroy \}/,
  );
});

test("campaign hero styles do not alter root overflow", () => {
  assert.doesNotMatch(campaignStylesSource, /(^|\})\s*(?:html|body)(?:\s*,[^\{]+)?\s*\{/m);
});

test("homepage follows the approved Figma decision-flow sequence", () => {
  const homeSource = appSource.slice(
    appSource.indexOf("function homePage()"),
    appSource.indexOf("function locationsPage()"),
  );

  assert.match(homeSource, /I want to \.\.\./);
  const goalSource = homeSource.slice(
    homeSource.indexOf("const goalCards = ["),
    homeSource.indexOf("const productCards"),
  );
  assert.equal((goalSource.match(/{ title:/g) || []).length, 6);
  for (const title of [
    "Buy a house",
    "Refinance my home",
    "Use home equity",
    "Calculate payments",
    "See current rates",
    "Browse loan officer profiles",
  ]) {
    assert.match(goalSource, new RegExp(title));
  }
  assert.match(homeSource, /home-primary-actions/);
  assert.match(homeSource, /Start your auto-prequal/);
  assert.match(homeSource, /Compare Your Offer/);
  assert.match(homeSource, /renderHomeStateExplorer\(data\.states\)/);
  assert.match(homeSource, /homeReadingCarousel\(\)/);
  assert.match(appSource, /homeReadingItems\(10\)/);
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

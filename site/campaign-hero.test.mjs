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

test("campaign hero renders immutable neutral daily-pricing examples", async () => {
  const {
    CAMPAIGN_HERO_PRICING_EXAMPLES,
    campaignPricingExampleIsBest,
    renderCampaignHeroCardLayer,
  } = await import("./campaign-hero-card-layer.mjs");
  const html = renderCampaignHeroCardLayer();

  assert.equal(Object.isFrozen(CAMPAIGN_HERO_PRICING_EXAMPLES), true);
  assert.equal(CAMPAIGN_HERO_PRICING_EXAMPLES.every(Object.isFrozen), true);
  assert.deepEqual(
    CAMPAIGN_HERO_PRICING_EXAMPLES.map(
      ({ lender, rate, apr, downPayment, points, revealFrame, featured }) => ({
        lender, rate, apr, downPayment, points, revealFrame, featured,
      }),
    ),
    [
      { lender: "Lender 1", rate: "6.125%", apr: "6.284%", downPayment: "5%", points: "1.000", revealFrame: 17, featured: false },
      { lender: "Lender 2", rate: "6.000%", apr: "6.221%", downPayment: "10%", points: "0.500", revealFrame: 22, featured: false },
      { lender: "Lender 3", rate: "5.875%", apr: "6.164%", downPayment: "20%", points: "0.000", revealFrame: 25, featured: true },
    ],
  );

  for (const field of ["rate", "apr", "points"]) {
    const values = CAMPAIGN_HERO_PRICING_EXAMPLES.map((entry) => Number.parseFloat(entry[field]));
    assert.ok(
      values.every((value, index) => index === 0 || value < values[index - 1]),
      `${field} must improve across the displayed examples`,
    );
  }
  const featured = CAMPAIGN_HERO_PRICING_EXAMPLES.find((entry) => entry.featured);
  assert.equal(campaignPricingExampleIsBest(featured, CAMPAIGN_HERO_PRICING_EXAMPLES), true);
  assert.equal(campaignPricingExampleIsBest(CAMPAIGN_HERO_PRICING_EXAMPLES[0], CAMPAIGN_HERO_PRICING_EXAMPLES), false);
  assert.equal(CAMPAIGN_HERO_PRICING_EXAMPLES.some((entry) => "asOf" in entry), false);

  assert.match(html, /There is a better way than hoping for the best/);
  assert.match(html, /See lender choices side by side without guessing which path is strongest/);
  assert.equal((html.match(/>Daily pricing example<\/p>/g) || []).length, 3);
  assert.equal((html.match(/<dt>Rate<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>APR<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>Down payment<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>Points<\/dt>/g) || []).length, 3);
  for (const value of ["6.125%", "6.284%", "5%", "1.000", "6.000%", "6.221%", "10%", "0.500", "5.875%", "6.164%", "20%", "0.000"]) {
    assert.match(html, new RegExp(value.replace(".", "\\.")));
  }
  assert.match(html, /campaign-loan-card--featured[\s\S]*campaign-best-badge[^>]*>Best/);
  assert.doesNotMatch(html, /\b(?:Conventional|FHA|VA|veteran)\b/i);
  assert.doesNotMatch(html, /Daily pricing example\s+(?:as of|effective)/i);
  assert.match(html, /data-reveal-frame="17"/);
  assert.match(html, /data-reveal-frame="22"/);
  assert.match(html, /data-reveal-frame="25"/);
  assert.match(html, /--campaign-card-accent: var\(--campaign-reel-blue\)/);
  assert.match(html, /--campaign-card-accent: var\(--campaign-reel-green\)/);
  assert.match(html, /href="\/prequal\/start"/);
  assert.match(html, /not personalized pricing or an overall loan ranking/i);
  assert.match(html, /not a quote, approval, offer, rate lock, or commitment to lend/i);
  assert.match(html, /not universal minimum requirements/i);
  assert.match(html, /lowest displayed example rate, APR, and points only/i);
  assert.match(html, /does not establish the best loan for a viewer/i);
  assert.match(html, /<\/a>\s*<p class="campaign-hero-disclosure" data-post-reveal-disclosure>/);
  assert.doesNotMatch(html, /<article[^>]+(?:aria-hidden|\sinert(?:\s|>))/);
  assert.doesNotMatch(html, /<a[^>]+data-post-reveal-cta[^>]+(?:aria-hidden|\sinert(?:\s|>)|tabindex)/);
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
    campaignHeroCopyExitProgress,
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
  assert.equal(campaignHeroCopyExitProgress(0), 0);
  assert.equal(campaignHeroCopyExitProgress(9 / 88), 0.5);
  assert.equal(campaignHeroCopyExitProgress(9 / 44), 1);
  assert.equal(campaignHeroCopyExitProgress(1), 1);
  assert.equal(campaignHeroCopyExitProgress(Number.NaN), 0);
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
  assert.match(appSource, /import \{ initCampaignHero, renderCampaignHero \} from "\/site\/campaign-hero\.mjs\?v=20260719-1"/);
  assert.match(appSource, /\$\{renderCampaignHero\(\)\}/);
  assert.match(appSource, /activeCampaignHeroController\?\.destroy\(\)/);
  assert.match(appSource, /activeCampaignHeroController = initCampaignHero\(app\)/);
});

test("browser entrypoints load the application module with the campaign module", () => {
  assert.match(indexSource, /src="\/site\/app\.js\?v=20260719-1"/);
  assert.match(staticRouteSource, /src="\/site\/app\.js"/);
  assert.match(campaignModuleSource, /from "\.\/campaign-hero-card-layer\.mjs\?v=20260719-1"/);
  assert.match(indexSource, /href="\/site\/styles\.css\?v=20260719-1"/);
  assert.match(staticRouteSource, /href="\/site\/styles\.css"/);
  assert.match(indexSource, /href="\/site\/campaign-hero\.css\?v=20260719-1"/);
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
  assert.match(stylesSource, /--campaign-stage-height:\s*calc\(100vh - var\(--campaign-sticky-top\)\)/);
  assert.match(stylesSource, /height:\s*calc\(var\(--campaign-stage-height\) \+ var\(--campaign-scroll-travel\)\)/);
  assert.match(stylesSource, /\.campaign-hero-stage\s*\{[^}]*position:\s*sticky/s);
  assert.match(stylesSource, /\.campaign-hero-stage\s*\{[^}]*top:\s*var\(--campaign-sticky-top\)[^}]*height:\s*var\(--campaign-stage-height\)/s);
  assert.match(stylesSource, /@supports \(height:\s*100dvh\)[\s\S]*--campaign-stage-height:\s*calc\(100dvh - var\(--campaign-sticky-top\)\)/);
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

test("campaign hero copy exit is continuous through frame 10 and reverses", async () => {
  const { initCampaignHero } = await import("./campaign-hero.mjs");
  const harness = createCampaignHeroHarness();
  const controller = initCampaignHero(harness.root, harness.environment);
  harness.flushAnimationFrames();

  harness.setProgress(9 / 88);
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-transform"), "translateY(calc(-70% - 80px))");
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-opacity"), "0.5000");

  harness.setProgress(9 / 44);
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-transform"), "translateY(calc(-140% - 160px))");
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-opacity"), "0.0000");

  harness.setProgress(0);
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-transform"), "translateY(calc(0% - 0px))");
  assert.equal(harness.track.style.getPropertyValue("--campaign-copy-exit-opacity"), "1.0000");
  controller.destroy();
});

test("campaign hero uses Layered Horizon and exact 25 percent mobile artwork growth", () => {
  assert.match(campaignStylesSource, /\.campaign-hero-stage\s*\{[^}]*isolation:\s*isolate[^}]*linear-gradient/s);
  assert.match(campaignStylesSource, /\.campaign-hero-stage::before[\s\S]*pointer-events:\s*none/);
  assert.match(campaignStylesSource, /\.campaign-hero-stage::after[\s\S]*pointer-events:\s*none/);
  assert.match(campaignStylesSource, /\.campaign-hero-inner\s*\{[^}]*z-index:\s*1/s);

  const mobileStart = campaignStylesSource.indexOf("@media (max-width: 900px)");
  const shortStart = campaignStylesSource.indexOf("@media (max-width: 900px) and (max-height: 720px)");
  const standardMobile = campaignStylesSource.slice(mobileStart, shortStart);
  const shortMobile = campaignStylesSource.slice(shortStart, campaignStylesSource.indexOf("@media (max-width: 760px)"));
  assert.match(standardMobile, /width:\s*min\(72\.5vw,\s*450px\);/);
  assert.match(shortMobile, /width:\s*min\(50vw,\s*200px\);/);
  assert.doesNotMatch(campaignStylesSource, /min\(58vw,\s*360px\)|min\(40vw,\s*160px\)/);
  assert.match(standardMobile, /--campaign-copy-exit-transform/);
  assert.match(standardMobile, /--campaign-copy-exit-opacity/);
  assert.match(campaignStylesSource, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*opacity:\s*1[\s\S]*transform:\s*none/);
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

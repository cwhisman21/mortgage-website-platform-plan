# Homepage Hero and Mega-Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Layered Horizon homepage hero, neutral daily-pricing comparison cards, scroll-synchronized mobile copy exit, and translucent full-width mega-menu without changing the production hero's frame, reveal, scroll, fallback, or accessibility contracts.

**Architecture:** Keep the existing static-rendered JavaScript/CSS application and extend its current boundaries: immutable pricing examples feed the existing card renderer; the existing hero update loop publishes copy-exit presentation values without changing frame math; and the existing single navigation element receives semantic grouped content while retaining its current toggle and close behavior. Public cache tokens are bumped as one release, followed by focused tests, the complete regression suite, static-route smoke verification, responsive browser verification, and a production Vercel deployment.

**Tech Stack:** Browser-native ES modules, template-string HTML rendering, CSS Grid/custom properties/media queries, Node.js `node:test`, PowerShell, Git, and Vercel.

## Global Constraints

- Preserve 30 source images plus 15 repeated final frames for 45 logical frames.
- Preserve `--campaign-scroll-step: 35px` and `--campaign-scroll-travel: 1540px`.
- Preserve card reveal frames `17`, `22`, and `25`; keep the hero CTA and disclosure reveal at frame `25`.
- Preserve reverse scrolling, bounded frame preloading, dynamic viewport height, sticky-stage lifecycle, JavaScript fallback, and reduced-motion static behavior.
- Desktop remains the current two-column composition; mobile remains heading, supporting sentence, machine, cards, CTA, and disclosure in that order.
- Standard mobile machine width is exactly `min(72.5vw, 450px)`; short-height mobile width is exactly `min(50vw, 200px)`.
- Mobile heading and supporting sentence start exiting after frame 1 and are fully transparent and above the clipped stage by frame 10; desktop copy stays stationary.
- Card headers remain `Lender 1`, `Lender 2`, and `Lender 3`; no conventional, FHA, VA, veteran, or other program label may appear.
- Card values are exactly `6.125% / 6.284% / 5% / 1.000`, `6.000% / 6.221% / 10% / 0.500`, and `5.875% / 6.164% / 20% / 0.000` for rate, APR, down payment, and points respectively.
- The visible field label is exactly `Down payment`; rate and APR use equal markup and typographic prominence.
- `Best` is limited to the featured third example and is derived only when it owns the lowest displayed rate, APR, and points.
- Until the feed is connected, show `Daily pricing example` and do not fabricate an effective date or `asOf` value.
- Preserve one logo, one logged-in welcome outside navigation, one hamburger, one `#site-navigation`, and all current account-action hooks.
- The visual search element is `230px` on desktop and `clamp(56px, 20vw, 80px)` on mobile; it must not be an input, button, link, focus target, search landmark, or wired control.
- The mega-menu is a non-modal overlay below the sticky header with `rgba(255, 255, 255, 0.96)`, restrained blur, a soft shadow, no border separator, and no hero color accents inside it.
- Mega-menu navigation uses four columns on desktop, two on tablet, and one scrollable column on mobile.
- The menu CTA text is exactly `Start my Auto Prequal`, targets `/prequal/start`, spans the padded menu width, and stays in normal menu flow.
- Use one public cache token, `20260719-1`, for every changed CSS/JavaScript entrypoint in this release.
- Do not connect the daily-rate feed, implement search, add analytics, change eligibility logic, or add a modal focus trap.

---

## File Structure

- `site/campaign-hero-card-layer.mjs`: owns immutable pricing examples, Best qualification, card markup, disclosure copy, and the unchanged reveal/accessibility synchronizer.
- `site/campaign-hero.mjs`: owns frame/progress math, preload and wheel behavior, plus the new pure copy-exit progress calculation and presentation synchronization.
- `site/campaign-hero.css`: owns Layered Horizon hero paint, hero/card presentation, exact mobile machine sizes, mobile copy exit, and reduced-motion overrides.
- `site/app.js`: owns the search icon, grouped mega-menu model/markup, existing account markup, and unchanged navigation interaction wiring.
- `site/styles.css`: owns shared header sizing and the authoritative translucent full-width navigation overlay.
- `site/campaign-hero.test.mjs`: owns pricing-data, scroll/progress, cache-chain, responsive hero, and reduced-motion contracts.
- `site/homepage-ui-contracts.test.mjs`: owns header/menu/search semantics and overlay CSS contracts.
- `site/campaign-hero-fallback.test.mjs`: continues to prove the complete comparison is usable without enhancement.
- `site/campaign-hero-containment.test.mjs`: continues to prove hero CSS stays contained and mobile copy remains readable.
- `site/index.html`: owns cache-versioned public CSS and JavaScript entrypoints.

---

### Task 1: Replace Product Cards with Immutable Daily-Pricing Examples

**Files:**
- Modify: `site/campaign-hero-card-layer.mjs:1-54`
- Modify: `site/campaign-hero.css:81-198`
- Modify: `site/campaign-hero.css:306-449`
- Test: `site/campaign-hero.test.mjs:166-198`
- Test: `site/homepage-ui-contracts.test.mjs:95-103`

**Interfaces:**
- Consumes: Existing `syncCampaignHeroCardLayer(frame, root)` and its `data-reveal-frame`, `data-post-reveal-cta`, and `data-post-reveal-disclosure` hooks.
- Produces: `CAMPAIGN_HERO_PRICING_EXAMPLES: ReadonlyArray<CampaignPricingExample>`, `campaignPricingExampleIsBest(example, examples): boolean`, and unchanged `renderCampaignHeroCardLayer(): string` output consumed by `site/campaign-hero.mjs`.

- [ ] **Step 1: Replace the obsolete product-copy test with a failing immutable pricing contract**

In `site/campaign-hero.test.mjs`, replace the test beginning `campaign hero card layer renders persistent copy and staged accessible options` with this test while retaining the later reveal/reverse test unchanged:

```js
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
  assert.equal((html.match(/Daily pricing example/g) || []).length, 3);
  assert.equal((html.match(/<dt>Rate<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>APR<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>Down payment<\/dt>/g) || []).length, 3);
  assert.equal((html.match(/<dt>Points<\/dt>/g) || []).length, 3);
  for (const value of ["6.125%", "6.284%", "5%", "1.000", "6.000%", "6.221%", "10%", "0.500", "5.875%", "6.164%", "20%", "0.000"]) {
    assert.match(html, new RegExp(value.replace(".", "\\.")));
  }
  assert.match(html, /campaign-loan-card--featured[\s\S]*campaign-best-badge[^>]*>Best</);
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
```

In `site/homepage-ui-contracts.test.mjs`, keep the reel-palette assertions and replace its generic copy check with:

```js
assert.doesNotMatch(html, /campaign-example-badge|>Example</);
assert.equal((html.match(/Daily pricing example/g) || []).length, 3);
```

- [ ] **Step 2: Run the focused tests and confirm they fail for the missing pricing export and old product copy**

Run:

```powershell
node --test site/campaign-hero.test.mjs site/homepage-ui-contracts.test.mjs site/campaign-hero-fallback.test.mjs site/campaign-hero-containment.test.mjs
```

Expected: FAIL because `CAMPAIGN_HERO_PRICING_EXAMPLES` and `campaignPricingExampleIsBest` do not exist and the renderer still contains Conventional/FHA/VA copy.

- [ ] **Step 3: Implement the immutable data boundary, derived Best state, neutral markup, and disclosure**

Replace `site/campaign-hero-card-layer.mjs:1-55` with the following, then leave `setAccessibleVisibility()` and `syncCampaignHeroCardLayer()` unchanged:

```js
const MIN_FRAME = 1;
const MAX_FRAME = 45;
const BEST_PRICING_FIELDS = Object.freeze(["rate", "apr", "points"]);

/**
 * @typedef {Object} CampaignPricingExample
 * @property {string} key
 * @property {string} lender
 * @property {string} rate
 * @property {string} apr
 * @property {string} downPayment
 * @property {string} points
 * @property {string} accent
 * @property {number} revealFrame
 * @property {boolean} featured
 * @property {string=} asOf
 */

export const CAMPAIGN_HERO_PRICING_EXAMPLES = Object.freeze([
  Object.freeze({
    key: "good",
    lender: "Lender 1",
    rate: "6.125%",
    apr: "6.284%",
    downPayment: "5%",
    points: "1.000",
    accent: "var(--campaign-reel-blue)",
    revealFrame: 17,
    featured: false,
  }),
  Object.freeze({
    key: "better",
    lender: "Lender 2",
    rate: "6.000%",
    apr: "6.221%",
    downPayment: "10%",
    points: "0.500",
    accent: "var(--campaign-reel-blue)",
    revealFrame: 22,
    featured: false,
  }),
  Object.freeze({
    key: "best",
    lender: "Lender 3",
    rate: "5.875%",
    apr: "6.164%",
    downPayment: "20%",
    points: "0.000",
    accent: "var(--campaign-reel-green)",
    revealFrame: 25,
    featured: true,
  }),
]);

function normalizeFrame(frame) {
  const numericFrame = Number(frame);
  if (!Number.isFinite(numericFrame)) return MIN_FRAME;
  return Math.min(Math.max(Math.round(numericFrame), MIN_FRAME), MAX_FRAME);
}

export function campaignPricingExampleIsBest(example, examples = CAMPAIGN_HERO_PRICING_EXAMPLES) {
  if (!example?.featured || !Array.isArray(examples) || examples.length === 0) return false;
  return BEST_PRICING_FIELDS.every((field) => {
    const displayedValues = examples.map((entry) => Number.parseFloat(entry[field]));
    const candidate = Number.parseFloat(example[field]);
    return Number.isFinite(candidate)
      && displayedValues.every(Number.isFinite)
      && candidate === Math.min(...displayedValues);
  });
}

function optionCard(example) {
  const isBest = campaignPricingExampleIsBest(example);
  return `
    <article
      class="campaign-loan-card${example.featured ? " campaign-loan-card--featured" : ""}"
      data-reel-card="${example.key}"
      data-reveal-frame="${example.revealFrame}"
      style="--campaign-card-accent: ${example.accent}"
    >
      <header class="campaign-loan-card__header">
        <h2>${example.lender}</h2>
        ${isBest ? '<span class="campaign-best-badge">Best</span>' : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7h10m-3-3 3 3-3 3M17 17H7m3 3-3-3 3-3" /></svg>'}
      </header>
      <div class="campaign-loan-card__body">
        <p class="campaign-option-status">Daily pricing example</p>
        <dl class="campaign-terms-list">
          <div><dt>Rate</dt><dd>${example.rate}</dd></div>
          <div><dt>APR</dt><dd>${example.apr}</dd></div>
          <div><dt>Down payment</dt><dd>${example.downPayment}</dd></div>
          <div><dt>Points</dt><dd>${example.points}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

export function renderCampaignHeroCardLayer() {
  return `
    <section class="campaign-hero-copy-layer" aria-label="Mortgage comparison options">
      <h1 class="campaign-hero-title">There is a better way than hoping for the best</h1>
      <p class="campaign-hero-lede">See lender choices side by side without guessing which path is strongest.</p>
      <div class="campaign-loan-card-stack" data-card-stack aria-label="Daily pricing examples from three lenders">
        ${CAMPAIGN_HERO_PRICING_EXAMPLES.map(optionCard).join("")}
      </div>
      <a class="campaign-primary-cta" href="/prequal/start" data-post-reveal-cta>
        Start My Comparison <span aria-hidden="true">&rarr;</span>
      </a>
      <p class="campaign-hero-disclosure" data-post-reveal-disclosure>Daily pricing values shown are examples, not personalized pricing or an overall loan ranking, and are not a quote, approval, offer, rate lock, or commitment to lend. Rate, APR, points, fees, down payment, availability, and terms vary by borrower, property, market, and lender review. Displayed down payments are examples, not universal minimum requirements. &ldquo;Best&rdquo; identifies the lowest displayed example rate, APR, and points only; it does not establish the best loan for a viewer.</p>
    </section>
  `;
}
```

- [ ] **Step 4: Update card CSS for four equally prominent pricing fields and the derived Best badge**

In `site/campaign-hero.css`, replace the card-status/term blocks with these exact rules and remove every `.campaign-verified-row` selector:

```css
.campaign-best-badge {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: #fff;
  color: var(--campaign-card-accent);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.campaign-option-status {
  min-height: 32px;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.2;
}

.campaign-terms-list {
  margin: 0;
}

.campaign-terms-list div {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--line);
}

.campaign-terms-list dt {
  color: var(--ink-soft);
  font-size: 11px;
}

.campaign-terms-list dd {
  margin: 0;
  color: var(--campaign-card-accent);
  font-size: clamp(12px, 1vw, 16px);
  font-weight: 850;
  white-space: nowrap;
}
```

Inside the standard mobile rule, use:

```css
.campaign-best-badge {
  min-height: 18px;
  padding: 2px 5px;
  font-size: 9px;
}

.campaign-option-status {
  min-height: 24px;
  padding-bottom: 3px;
  font-size: 10px;
  line-height: 1.1;
}

.campaign-terms-list div {
  min-height: 24px;
  align-items: flex-start;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

.campaign-terms-list dt,
.campaign-terms-list dd {
  font-size: 10px;
  line-height: 1.1;
}
```

Inside the short-height mobile rule, use:

```css
.campaign-option-status {
  min-height: 20px;
  padding-bottom: 2px;
  font-size: 10px;
}

.campaign-terms-list div {
  min-height: 18px;
}

.campaign-terms-list dt,
.campaign-terms-list dd {
  font-size: 10px;
}
```

Do not change the existing `campaign-loan-card--featured.is-revealed` `scale(1.02)` rule.

- [ ] **Step 5: Run pricing, fallback, containment, and reveal tests**

Run:

```powershell
node --check site/campaign-hero-card-layer.mjs
node --test site/campaign-hero.test.mjs site/homepage-ui-contracts.test.mjs site/campaign-hero-fallback.test.mjs site/campaign-hero-containment.test.mjs
```

Expected: PASS. The existing threshold test must still prove forward and reverse behavior at 17, 22, and 25.

- [ ] **Step 6: Commit the pricing-card slice**

```powershell
git add -- site/campaign-hero-card-layer.mjs site/campaign-hero.css site/campaign-hero.test.mjs site/homepage-ui-contracts.test.mjs
git commit -m "feat: add neutral daily pricing hero cards"
```

---

### Task 2: Add Layered Horizon Paint, Exact Mobile Artwork Sizing, and Continuous Copy Exit

**Files:**
- Modify: `site/campaign-hero.mjs:13-34`
- Modify: `site/campaign-hero.mjs:193-240`
- Modify: `site/campaign-hero.css:1-63`
- Modify: `site/campaign-hero.css:266-470`
- Test: `site/campaign-hero.test.mjs:38-164`
- Test: `site/campaign-hero.test.mjs:277-461`

**Interfaces:**
- Consumes: Existing `CAMPAIGN_HERO_FRAMES`, `campaignHeroFrameIndex(progress)`, `scrollProgress()`, and the track style object.
- Produces: `campaignHeroCopyExitProgress(progress): number` in `[0, 1]` and two presentation-only track properties: `--campaign-copy-exit-transform` and `--campaign-copy-exit-opacity`.

- [ ] **Step 1: Add failing pure-progress, synchronization, sizing, background, and reduced-motion tests**

Extend the import destructuring in the ordered-frame test to include `campaignHeroCopyExitProgress`, then add:

```js
assert.equal(campaignHeroCopyExitProgress(0), 0);
assert.equal(campaignHeroCopyExitProgress(9 / 88), 0.5);
assert.equal(campaignHeroCopyExitProgress(9 / 44), 1);
assert.equal(campaignHeroCopyExitProgress(1), 1);
assert.equal(campaignHeroCopyExitProgress(Number.NaN), 0);
```

Add this new harness test after the preload tests:

```js
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
```

Add this CSS contract test:

```js
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
```

- [ ] **Step 2: Run the focused hero test and confirm it fails before behavior changes**

Run:

```powershell
node --test site/campaign-hero.test.mjs site/campaign-hero-containment.test.mjs
```

Expected: FAIL because the progress export, presentation properties, Layered Horizon paint, and enlarged mobile widths are absent.

- [ ] **Step 3: Add pure copy-exit progress and presentation synchronization without changing frame math**

In `site/campaign-hero.mjs`, add this constant and export after `PRELOAD_RADIUS` and `clamp()`:

```js
const COPY_EXIT_COMPLETE_FRAME = 10;

export function campaignHeroCopyExitProgress(progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const framePosition = safeProgress * (CAMPAIGN_HERO_FRAMES.length - 1);
  return clamp(framePosition / (COPY_EXIT_COMPLETE_FRAME - 1), 0, 1);
}

function syncCampaignHeroCopyExit(track, progress) {
  const exitProgress = campaignHeroCopyExitProgress(progress);
  const percent = Number((-140 * exitProgress).toFixed(3));
  const pixels = Number((-160 * exitProgress).toFixed(3));
  track.style.setProperty(
    "--campaign-copy-exit-transform",
    `translateY(calc(${percent}% - ${Math.abs(pixels)}px))`,
  );
  track.style.setProperty(
    "--campaign-copy-exit-opacity",
    (1 - exitProgress).toFixed(4),
  );
}
```

Replace `update()` with this version so `scrollProgress()` is computed once and existing frame selection remains identical:

```js
function update() {
  animationFrameId = 0;
  if (destroyed || !environment.document.documentElement.contains(track)) {
    destroy();
    return;
  }

  const progress = scrollProgress();
  const nextFrameIndex = campaignHeroFrameIndex(progress);
  const logicalFrame = nextFrameIndex + 1;
  syncCampaignHeroCopyExit(track, progress);
  track.dataset.currentFrame = String(syncCampaignHeroCardLayer(logicalFrame, track));
  if (nextFrameIndex !== requestedFrameIndex) preloadAdjacentFrames(nextFrameIndex);
}
```

Add `syncCampaignHeroCopyExit(track, 0);` immediately before restoring all cards in `destroy()`, and add the same call at the start of the reduced-motion branch before selecting the final frame. This guarantees static copy for both fallback paths.

- [ ] **Step 4: Paint the Layered Horizon behind the existing layout**

Replace the opening hero/stage rules in `site/campaign-hero.css` with:

```css
.campaign-hero {
  border-bottom: 0;
  background: #0b55ff;
}

.campaign-hero-sequence {
  --campaign-scroll-travel: 1540px;
  --campaign-scroll-step: 35px;
  --campaign-sticky-top: 0px;
  --campaign-stage-height: calc(100vh - var(--campaign-sticky-top));
  --campaign-reel-blue: #0b55ff;
  --campaign-reel-green: #158b4a;
  height: calc(var(--campaign-stage-height) + var(--campaign-scroll-travel));
  position: relative;
}

.campaign-hero-stage {
  display: grid;
  position: sticky;
  top: var(--campaign-sticky-top);
  height: var(--campaign-stage-height);
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(118deg, #f5f8ff 0%, #e2edff 42%, #8db9ff 70%, #0b55ff 100%);
  place-items: start center;
}

.campaign-hero-stage::before,
.campaign-hero-stage::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.campaign-hero-stage::before {
  background: rgba(190, 214, 255, 0.58);
  clip-path: polygon(0 14%, 56% 0, 100% 28%, 100% 58%, 42% 38%, 0 64%);
}

.campaign-hero-stage::after {
  background: rgba(88, 211, 161, 0.34);
  clip-path: polygon(0 66%, 35% 42%, 100% 68%, 100% 100%, 0 100%);
}
```

Add `z-index: 1;` to the existing `.campaign-hero-inner` rule. Do not change its width, desktop grid columns, gap, alignment, or padding.

- [ ] **Step 5: Apply the mobile-only continuous copy exit and exact artwork widths**

Inside `@media (max-width: 900px)`, add:

```css
.campaign-hero-sequence.is-enhanced .campaign-hero-title,
.campaign-hero-sequence.is-enhanced .campaign-hero-lede,
.campaign-hero-sequence[data-campaign-initialized="true"] .campaign-hero-title,
.campaign-hero-sequence[data-campaign-initialized="true"] .campaign-hero-lede {
  opacity: var(--campaign-copy-exit-opacity, 1);
  transform: var(--campaign-copy-exit-transform, none);
  will-change: opacity, transform;
}
```

In the same rule, change the visual width to:

```css
.campaign-hero-sequence .campaign-hero-visual {
  order: 3;
  width: min(72.5vw, 450px);
  max-width: none;
  margin: 0 auto;
}
```

Inside `@media (max-width: 900px) and (max-height: 720px)`, set:

```css
.campaign-hero-sequence .campaign-hero-visual {
  width: min(50vw, 200px);
}
```

Inside `@media (prefers-reduced-motion: reduce)`, append:

```css
.campaign-hero-sequence.is-enhanced .campaign-hero-title,
.campaign-hero-sequence.is-enhanced .campaign-hero-lede,
.campaign-hero-sequence[data-campaign-initialized="true"] .campaign-hero-title,
.campaign-hero-sequence[data-campaign-initialized="true"] .campaign-hero-lede {
  opacity: 1;
  transform: none;
  will-change: auto;
}
```

- [ ] **Step 6: Run syntax, motion, sizing, fallback, and containment tests**

Run:

```powershell
node --check site/campaign-hero.mjs
node --test site/campaign-hero.test.mjs site/campaign-hero-fallback.test.mjs site/campaign-hero-containment.test.mjs site/homepage-ui-contracts.test.mjs
```

Expected: PASS, including the unchanged 45-frame, 35px, 1,540px, 17/22/25, preload, reverse-scroll, dynamic viewport, and reduced-motion contracts.

- [ ] **Step 7: Commit the hero motion and visual slice**

```powershell
git add -- site/campaign-hero.mjs site/campaign-hero.css site/campaign-hero.test.mjs site/campaign-hero-containment.test.mjs
git commit -m "feat: add layered scroll hero treatment"
```

---

### Task 3: Build the Compact Search Visual and Full-Width Semantic Mega-Menu

**Files:**
- Modify: `site/app.js:458-475`
- Modify: `site/app.js:705-768`
- Modify: `site/styles.css:8078-8218`
- Test: `site/homepage-ui-contracts.test.mjs:25-73`

**Interfaces:**
- Consumes: Existing `navLink(path, label)`, `accountNavigation()`, `route(path)`, `esc(value)`, `icon(name)`, `closeNavigation()`, `handleDocumentClick()`, `handleDocumentKeydown()`, and `wireInteractions()`.
- Produces: `SITE_NAVIGATION_GROUPS`, `navigationGroup(group): string`, `.header-search-placeholder`, `.site-nav-inner`, `.site-nav-groups`, four `.site-nav-group` sections, unchanged `#site-navigation[data-nav]`, and `.site-nav-cta[href="/prequal/start"]`.

- [ ] **Step 1: Add failing semantic markup, noninteractive search, overlay, and responsive CSS tests**

In `site/homepage-ui-contracts.test.mjs`, first change the opening source slice in `header uses one navigation menu and a plain logged-in welcome` so it includes the navigation model and semantic group renderer:

```js
const headerSource = sourceBetween(appSource, "const SITE_NAVIGATION_GROUPS", "function footer()");
const navigationModelSource = sourceBetween(headerSource, "const SITE_NAVIGATION_GROUPS", "function navigationGroup");
const navSource = sourceBetween(headerSource, '<nav class="site-nav"', "</nav>");
```

Then extend the same test with:

```js
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
```

Replace the current open-navigation CSS test with one that reads only the authoritative final block:

```js
test("the single hamburger opens a full-width translucent semantic mega-menu", () => {
  const releaseStyles = baseStyles.slice(baseStyles.indexOf("/* Full-width semantic mega-menu release. */"));
  assert.match(ruleBlock(baseStyles, ".nav-toggle"), /display:\s*inline-flex;/);
  assert.match(ruleBlock(baseStyles, ".site-nav"), /display:\s*none;/);

  const search = ruleBlock(releaseStyles, ".header-search-placeholder");
  assert.match(search, /width:\s*230px;/);
  const openNavigation = ruleBlock(releaseStyles, ".site-nav.open");
  assert.match(openNavigation, /position:\s*absolute;/);
  assert.match(openNavigation, /inset:\s*100% 0 auto;/);
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
```

Extend the interaction-state test with:

```js
assert.match(appSource, /nav\?\.classList\.contains\("open"\)[\s\S]*!headerNode\.contains\(event\.target\)[\s\S]*closeNavigation\(\{ restoreFocus: false \}\)/);
assert.match(appSource, /if \(event\.key !== "Tab" \|\| !modalIsOpen\) return/);
```

- [ ] **Step 2: Run the header contract test and confirm the current flat menu fails it**

Run:

```powershell
node --test site/homepage-ui-contracts.test.mjs
```

Expected: FAIL because the search visual, semantic groups, Branches link, full-width CTA, and authoritative overlay styles do not exist.

- [ ] **Step 3: Add the search icon, navigation model, semantic group renderer, and approved header markup**

Add this entry to the `paths` object in `icon(name)` in `site/app.js`:

```js
search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
```

Between `navLink()` and `accountNavigation()`, add:

```js
const SITE_NAVIGATION_GROUPS = Object.freeze([
  Object.freeze({
    id: "explore",
    label: "Explore",
    links: Object.freeze([
      Object.freeze({ path: "/locations", label: "Locations" }),
      Object.freeze({ path: "/rates", label: "Rates" }),
    ]),
  }),
  Object.freeze({
    id: "mortgage-goals",
    label: "Mortgage goals",
    links: Object.freeze([
      Object.freeze({ path: "/buy", label: "Buy" }),
      Object.freeze({ path: "/refinance", label: "Refinance" }),
      Object.freeze({ path: "/loan-options", label: "Loan Options" }),
    ]),
  }),
  Object.freeze({
    id: "tools-learning",
    label: "Tools and learning",
    links: Object.freeze([
      Object.freeze({ path: "/calculators", label: "Calculators" }),
      Object.freeze({ path: "/learning-center", label: "Learning" }),
    ]),
  }),
  Object.freeze({
    id: "guidance",
    label: "Guidance",
    links: Object.freeze([
      Object.freeze({ path: "/loan-officers", label: "Loan Officers" }),
      Object.freeze({ path: "/branches", label: "Branches" }),
    ]),
  }),
]);

function navigationGroup({ id, label, links }) {
  return `
    <section class="site-nav-group" aria-labelledby="site-nav-${id}">
      <h2 class="site-nav-group-title" id="site-nav-${id}">${esc(label)}</h2>
      <ul class="site-nav-group-list">
        ${links.map(({ path, label: linkLabel }) => `<li>${navLink(path, linkLabel)}</li>`).join("")}
      </ul>
    </section>
  `;
}
```

Replace `header()` with:

```js
function header() {
  const firstName = SNAP_CUSTOMER.name.trim().split(/\s+/)[0] || SNAP_CUSTOMER.name;
  const welcome = sessionState.isLoggedIn
    ? `<p class="header-welcome" aria-label="Welcome back, ${esc(SNAP_CUSTOMER.name)}"><span class="header-welcome-full" aria-hidden="true">Welcome back, ${esc(SNAP_CUSTOMER.name)}</span><span class="header-welcome-compact" aria-hidden="true">Welcome back, ${esc(firstName)}</span></p>`
    : "";
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${route("/")}">
          <img class="brand-logo" src="${ASSETS.logo}" alt="Snap Mortgage" />
        </a>
        <div class="header-search-placeholder" aria-hidden="true">
          ${icon("search")}
          <span>Search</span>
        </div>
        ${welcome}
        <button class="nav-toggle" type="button" aria-label="Open navigation" aria-controls="site-navigation" aria-expanded="false" data-nav-toggle>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>
        <nav class="site-nav" id="site-navigation" data-nav aria-label="Primary navigation">
          <div class="site-nav-inner">
            <div class="site-nav-groups">
              ${SITE_NAVIGATION_GROUPS.map(navigationGroup).join("")}
            </div>
            ${accountNavigation()}
            <a class="site-nav-cta" href="${route("/prequal/start")}">Start my Auto Prequal</a>
          </div>
        </nav>
      </div>
    </header>
  `;
}
```

Do not change `accountNavigation()`, `closeNavigation()`, `handleDocumentClick()`, `handleDocumentKeydown()`, or the toggle listener in `wireInteractions()`.

- [ ] **Step 4: Replace the competing final menu overrides with one authoritative full-width overlay block**

Replace `site/styles.css` from the comment at line 8078 through the duplicate 360px media rules with:

```css
/* Full-width semantic mega-menu release. */
[data-design-system="snap-figma-v1"] .header-inner {
  grid-template-columns: minmax(120px, 1fr) 230px minmax(0, auto) 42px;
  column-gap: 16px;
  row-gap: 0;
}

.header-inner > .brand {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}

.header-search-placeholder {
  display: flex;
  width: 230px;
  min-height: 38px;
  grid-column: 2;
  grid-row: 1;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid rgba(16, 37, 74, 0.18);
  border-radius: 999px;
  background: rgba(247, 249, 253, 0.92);
  color: var(--ink-soft);
  font-size: 13px;
  pointer-events: none;
}

.header-search-placeholder .icon {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
}

.header-welcome {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  max-width: min(280px, 24vw);
}

.nav-toggle {
  grid-column: 4;
  grid-row: 1;
  justify-self: end;
  box-shadow: none;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.nav-toggle:hover,
.nav-toggle:focus-visible,
.nav-toggle[aria-expanded="true"] {
  border-color: color-mix(in srgb, var(--snap-blue), #fff 48%);
  background: #edf5ff;
  color: var(--snap-blue);
}

.site-nav.open {
  position: absolute;
  inset: 100% 0 auto;
  z-index: 1;
  display: grid;
  width: 100%;
  max-height: none;
  overflow: visible;
  padding: 0;
  border: 0;
  background: rgba(255, 255, 255, 0.96);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 36px rgba(16, 37, 74, 0.14);
}

.site-nav-inner {
  width: min(var(--content), calc(100vw - 32px));
  max-height: calc(100vh - 76px);
  max-height: calc(100dvh - 76px);
  margin: 0 auto;
  padding: 28px 0 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.site-nav-groups {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(20px, 4vw, 56px);
}

.site-nav-group {
  min-width: 0;
}

.site-nav-group-title {
  margin: 0 0 10px;
  color: var(--navy);
  font-size: 14px;
  font-weight: 850;
}

.site-nav-group-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

[data-design-system="snap-figma-v1"] .site-nav-group-list a {
  display: flex;
  min-height: 40px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-weight: 650;
}

[data-design-system="snap-figma-v1"] .site-nav-group-list a:hover,
[data-design-system="snap-figma-v1"] .site-nav-group-list a:focus-visible,
[data-design-system="snap-figma-v1"] .site-nav-group-list a.active {
  background: #edf5ff;
  color: var(--snap-blue);
  outline: none;
}

[data-design-system="snap-figma-v1"] .site-nav-group-list a:focus-visible,
[data-design-system="snap-figma-v1"] .site-nav-action:focus-visible,
.site-nav-cta:focus-visible {
  outline: 3px solid rgba(var(--snap-primary-rgb), 0.38);
  outline-offset: 2px;
}

.site-nav.open .site-nav-account-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 18px;
  padding: 0;
  border: 0;
}

[data-design-system="snap-figma-v1"] .site-nav.open .site-nav-action {
  width: 100%;
  min-height: 44px;
  justify-content: flex-start;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f7f9fd;
  font-weight: 650;
}

[data-design-system="snap-figma-v1"] .site-nav.open .site-nav-action:hover,
[data-design-system="snap-figma-v1"] .site-nav.open .site-nav-action:focus-visible {
  background: #edf5ff;
  color: var(--snap-blue);
}

[data-design-system="snap-figma-v1"] .site-nav .site-nav-cta {
  display: flex;
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--snap-blue), var(--snap-blue-700));
  color: #fff;
  font-weight: 850;
  text-decoration: none;
}

[data-design-system="snap-figma-v1"] .site-nav .site-nav-cta:hover,
[data-design-system="snap-figma-v1"] .site-nav .site-nav-cta:focus-visible {
  background: linear-gradient(180deg, var(--snap-blue-700), #073ba8);
  color: #fff;
}

@media (max-width: 1040px) {
  [data-design-system="snap-figma-v1"] .header-inner {
    grid-template-columns: minmax(100px, 1fr) 230px minmax(0, 140px) 42px;
    column-gap: 10px;
  }

  .header-welcome-full {
    display: none;
  }

  .header-welcome-compact {
    display: inline;
  }

  .site-nav-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  [data-design-system="snap-figma-v1"] .header-inner {
    width: min(var(--content), calc(100vw - 16px));
    grid-template-columns: minmax(82px, 1fr) auto minmax(0, clamp(68px, 22vw, 140px)) 42px;
    gap: 4px;
  }

  .brand-logo {
    width: min(140px, 100%);
    height: auto;
  }

  .header-search-placeholder {
    width: clamp(56px, 20vw, 80px);
    min-height: 34px;
    gap: 4px;
    padding: 0 7px;
    font-size: 10px;
  }

  .header-search-placeholder .icon {
    width: 14px;
    height: 14px;
    flex-basis: 14px;
  }

  .header-welcome {
    max-width: 100%;
    font-size: 11px;
  }

  .site-nav-inner {
    width: min(calc(100vw - 24px), var(--content));
    padding: 20px 0 18px;
  }

  .site-nav-groups,
  .site-nav.open .site-nav-account-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-design-system="snap-figma-v1"] .section.home-paths {
    padding-top: 2px;
  }

  [data-design-system="snap-figma-v1"] .section.compact.home-primary-actions {
    padding: 14px 22px;
    gap: 12px;
  }
}
```

The 96% white background is the no-blur fallback; unsupported browsers simply ignore the backdrop-filter declarations.

- [ ] **Step 5: Run header semantics, interaction-source, logo, and syntax checks**

Run:

```powershell
node --check site/app.js
node --test site/homepage-ui-contracts.test.mjs site/campaign-hero.test.mjs site/snap-mortgage-logo.test.mjs
```

Expected: PASS. One toggle still controls one menu, the welcome stays before and outside the menu, all account hooks remain inside it, and Escape/outside-click behavior remains source-identical.

- [ ] **Step 6: Commit the header and mega-menu slice**

```powershell
git add -- site/app.js site/styles.css site/homepage-ui-contracts.test.mjs
git commit -m "feat: add full-width mortgage mega-menu"
```

---

### Task 4: Bust Public Asset Caches and Run the Complete Regression Gate

**Files:**
- Modify: `site/index.html:26-29`
- Modify: `site/app.js:10`
- Modify: `site/campaign-hero.mjs:1`
- Modify: `site/campaign-hero.test.mjs:318-333`

**Interfaces:**
- Consumes: Changed `styles.css`, `campaign-hero.css`, `app.js`, `campaign-hero.mjs`, and `campaign-hero-card-layer.mjs` assets.
- Produces: One coherent `20260719-1` public import chain while retaining unversioned static-route assets.

- [ ] **Step 1: Make the cache-chain test fail on the new release token**

Update the cache assertions in `site/campaign-hero.test.mjs` to:

```js
test("campaign hero is connected to the homepage renderer", () => {
  assert.match(appSource, /import \{ initCampaignHero, renderCampaignHero \} from "\/site\/campaign-hero\.mjs\?v=20260719-1"/);
  assert.match(appSource, /\$\{renderCampaignHero\(\)\}/);
  assert.match(appSource, /activeCampaignHeroController\?\.destroy\(\)/);
  assert.match(appSource, /activeCampaignHeroController = initCampaignHero\(app\)/);
});

test("browser entrypoints load one coherent homepage asset release", () => {
  assert.match(indexSource, /src="\/site\/app\.js\?v=20260719-1"/);
  assert.match(staticRouteSource, /src="\/site\/app\.js"/);
  assert.match(campaignModuleSource, /from "\.\/campaign-hero-card-layer\.mjs\?v=20260719-1"/);
  assert.match(indexSource, /href="\/site\/styles\.css\?v=20260719-1"/);
  assert.match(staticRouteSource, /href="\/site\/styles\.css"/);
  assert.match(indexSource, /href="\/site\/campaign-hero\.css\?v=20260719-1"/);
  assert.doesNotMatch(staticRouteSource, /campaign-hero\.css/);
});
```

- [ ] **Step 2: Run the cache-chain test and confirm old version strings fail it**

Run:

```powershell
node --test site/campaign-hero.test.mjs
```

Expected: FAIL because public assets still use `20260718-12` and `20260718-14`.

- [ ] **Step 3: Apply the single release token through the public dependency chain**

Change `site/index.html` to:

```html
<link rel="stylesheet" href="/site/styles.css?v=20260719-1" />
<link rel="stylesheet" href="/site/campaign-hero.css?v=20260719-1" />
<link rel="stylesheet" href="/site/rates-marketplace.css" />
<script type="module" src="/site/app.js?v=20260719-1"></script>
```

Change `site/app.js:10` to:

```js
import { initCampaignHero, renderCampaignHero } from "/site/campaign-hero.mjs?v=20260719-1";
```

Change `site/campaign-hero.mjs:1` to:

```js
import { renderCampaignHeroCardLayer, syncCampaignHeroCardLayer } from "./campaign-hero-card-layer.mjs?v=20260719-1";
```

Do not version the imports in `site/static-route-document.mjs`; its existing tests require the unversioned shared assets.

- [ ] **Step 4: Run syntax checks and the focused release suite**

Run each command separately:

```powershell
node --check site/app.js
node --check site/campaign-hero.mjs
node --check site/campaign-hero-card-layer.mjs
node --test site/campaign-hero.test.mjs site/campaign-hero-fallback.test.mjs site/campaign-hero-containment.test.mjs site/homepage-ui-contracts.test.mjs site/snap-mortgage-logo.test.mjs
```

Expected: all commands exit 0 and all focused tests pass.

- [ ] **Step 5: Run the complete Node regression suite**

Run:

```powershell
$testFiles = Get-ChildItem site,mock-data -Recurse -Filter '*.test.mjs' | ForEach-Object FullName
node --test $testFiles
```

Expected: exit 0 with no failed, cancelled, or skipped-by-error tests. Record the exact pass count in the execution notes.

- [ ] **Step 6: Run the generated-route smoke suite**

Run:

```powershell
node site/phase2-static-smoke.mjs
```

Expected: `Phase 2 static smoke passed:` followed by the route count, with exit code 0.

- [ ] **Step 7: Inspect the diff for accidental frame, interaction, or unrelated changes**

Run:

```powershell
git diff --check
git diff --stat
git diff -- site/campaign-hero-card-layer.mjs site/campaign-hero.mjs site/campaign-hero.css site/app.js site/styles.css site/index.html site/campaign-hero.test.mjs site/homepage-ui-contracts.test.mjs
```

Expected: no whitespace errors; only the approved homepage hero, card, navigation, test, and cache-token changes appear.

- [ ] **Step 8: Commit the release token and regression gate**

```powershell
git add -- site/index.html site/app.js site/campaign-hero.mjs site/campaign-hero.test.mjs
git commit -m "chore: publish homepage refresh assets"
```

---

### Task 5: Verify Responsive Behavior, Push Main, Deploy to Vercel, and Verify Production

**Files:**
- Verify only: `site/index.html`
- Verify only: `site/app.js`
- Verify only: `site/campaign-hero.mjs`
- Verify only: `site/campaign-hero-card-layer.mjs`
- Verify only: `site/campaign-hero.css`
- Verify only: `site/styles.css`

**Interfaces:**
- Consumes: The committed clean `main` branch and linked Vercel project in `.vercel/project.json`.
- Produces: A pushed `think-whale/main`, a production Vercel deployment, and a verified public homepage at `https://mortgage-website-platform-plan-chi.vercel.app/`.

- [ ] **Step 1: Start the clean release repository locally and verify the homepage loads without console or asset errors**

Start a hidden local server from the repository root:

```powershell
Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "4173") -WorkingDirectory (Get-Location) -WindowStyle Hidden
```

Open `http://localhost:4173/site/index.html` with the browser-verification tooling. Expected: HTTP 200 for `styles.css?v=20260719-1`, `campaign-hero.css?v=20260719-1`, `app.js?v=20260719-1`, `campaign-hero.mjs?v=20260719-1`, the card-layer module, and hero frame images; no console errors.

- [ ] **Step 2: Verify the unchanged desktop hero contract at 1440px and 1024px**

At both widths:

- Confirm the existing two-column copy/cards/CTA/disclosure-left and machine-right composition remains intact.
- Confirm the stage background shows the Snap-blue gradient with crossing pale-blue and green layers behind content.
- Confirm the machine size is unchanged from desktop production.
- Scroll forward and backward; confirm images remain a 45-frame logical sequence, cards reveal at 17/22/25, and CTA/disclosure reveal and reverse at 25.
- Confirm the heading and lede remain stationary on desktop.
- Confirm no horizontal overflow: `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 3: Verify mobile composition, exact growth, copy exit, and reduced motion at 390px and 320px**

At both widths:

- Confirm the visible order remains heading, lede, machine, three cards, CTA, disclosure.
- Confirm the standard machine computed width follows `min(72.5vw, 450px)`; at a short-height viewport confirm `min(50vw, 200px)`.
- Confirm heading/lede are visible at frame 1, partially translated/faded between frames 1 and 10, fully above the clipped stage and opacity 0 by frame 10, and continuously restored on reverse scroll.
- Confirm cards show the exact neutral rate/APR/down-payment/points values and no product/program labels.
- Confirm the third card is green, slightly larger when revealed, and is the only card labeled Best.
- Emulate reduced motion and confirm the final frame, all cards, CTA, disclosure, heading, and lede are visible and static.
- Confirm no horizontal overflow.

- [ ] **Step 4: Verify the search visual and mega-menu behavior at 1440px, 1024px, 390px, and 320px**

At each width:

- Confirm one logo, visible noninteractive search visual, logged-in welcome outside the menu, and one hamburger fit without overlap.
- Confirm the search is not in the tab order and cannot be activated.
- Open the menu and record the hero top position before/after; the value must not change because the menu overlays rather than pushes content.
- Confirm the overlay spans the viewport, uses the translucent white surface, remains readable over every hero frame, and contains no blue/green decorative layers.
- Confirm group columns are 4 at desktop, 2 at tablet, and 1 scrollable column on mobile.
- Confirm Explore, Mortgage goals, Tools and learning, Guidance, account actions, and the full-width `Start my Auto Prequal` CTA appear in logical DOM/tab order.
- Confirm visible focus indicators on links, account actions, and CTA.
- Press Escape; confirm the menu closes and focus returns to the hamburger.
- Reopen, click outside the header; confirm the menu closes without moving focus unexpectedly.
- Reopen and activate the CTA; confirm navigation reaches `/prequal/start` through normal site navigation.

- [ ] **Step 5: Confirm the branch is clean and based on the intended production head**

Run:

```powershell
git status --short --branch
git log --oneline --decorate -12
git diff think-whale/main...HEAD --stat
```

Expected: no uncommitted files; `main` contains the approved spec, this plan, and the four implementation commits above the prior production head `29c286ca`.

- [ ] **Step 6: Push the clean main branch to the production GitHub remote**

Run:

```powershell
git push think-whale main:main
```

Expected: `think-whale/main` advances to the verified local `HEAD` without a force push.

- [ ] **Step 7: Create the production Vercel deployment from the same commit**

Run:

```powershell
vercel deploy --prod --yes
```

Expected: exit 0 and a production deployment URL. Confirm the deployment resolves to the public alias `https://mortgage-website-platform-plan-chi.vercel.app/`.

- [ ] **Step 8: Repeat the release-critical checks against production**

On `https://mortgage-website-platform-plan-chi.vercel.app/`:

- Confirm HTML references `20260719-1` and the changed assets return 200.
- Hard-refresh once to rule out stale cache behavior.
- Recheck desktop two-column layout, mobile stacked order, exact mobile machine growth, frame-10 copy exit/reverse, pricing values/disclosure, 4/2/1-column menu, Escape/outside click, CTA navigation, reduced motion, console, broken images, and horizontal overflow.
- Compare production screenshots at 1440px and 390px with the approved Layered Horizon direction and save them with the execution evidence.

- [ ] **Step 9: Report the public release evidence**

Record:

- final Git commit SHA,
- pushed branch and remote,
- complete test pass count,
- static smoke route count,
- production deployment URL,
- public alias,
- tested desktop/mobile viewport sizes,
- confirmation that asset token `20260719-1` is live,
- any deliberately deferred items: real rate-feed connection and functional search only.

Do not claim completion until the production checks pass.

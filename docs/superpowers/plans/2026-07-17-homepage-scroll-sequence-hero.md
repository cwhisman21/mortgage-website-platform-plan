# Homepage Scroll-Sequence Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's static campaign artwork with a sticky, 30-frame image sequence scrubbed by scroll.

**Architecture:** Keep rendering and behavior inside `site/campaign-hero.mjs`, which will expose ordered frame metadata, pure frame-selection helpers, the homepage markup renderer, and an initializer returning a lifecycle controller. `site/app.js` will own that controller across client-side route renders, while `site/styles.css` owns viewport pinning, the approved responsive scroll distances, and reduced-motion fallback.

**Tech Stack:** Static HTML/CSS, native browser ES modules, DOM APIs, Node.js built-in test runner.

## Global Constraints

- Change only the homepage campaign hero; preserve navigation, homepage sections, shared heroes, copy, and CTA action.
- Use exactly 30 frames in filename order from `ezgif-frame-001.png` through `ezgif-frame-030.png`.
- Use 55 CSS pixels per frame transition on desktop and 35 CSS pixels per transition on mobile.
- Use a normal `<img>` element; do not introduce canvas, autoplay, interpolation, cross-fades, or extra parallax layers.
- Preserve a usable frame-1 and CTA fallback without JavaScript.
- Disable the sticky extended sequence under `prefers-reduced-motion: reduce`.

---

### Task 1: Specify the sequence contract with failing tests

**Files:**
- Modify: `site/campaign-hero.test.mjs`
- Test: `site/campaign-hero.test.mjs`

**Interfaces:**
- Consumes: existing `renderCampaignHero()` export.
- Produces: test requirements for `CAMPAIGN_HERO_FRAMES`, `campaignHeroFrameIndex(progress)`, `renderCampaignHero()`, and `initCampaignHero(root, environment)`.

- [ ] **Step 1: Replace the static-image assertion with sequence tests**

Add assertions that import `CAMPAIGN_HERO_FRAMES`, `campaignHeroFrameIndex`, and `renderCampaignHero`; require 30 zero-padded ordered paths; require frame 1 in markup, `data-campaign-sequence`, `data-campaign-frame`, the existing hidden heading, and `data-cta-action="compareOffer"`; and require clamped mappings of `-1 -> 0`, `0.5 -> 15`, and `2 -> 29`.

- [ ] **Step 2: Add lifecycle and stylesheet contract tests**

Read `site/app.js` and `site/styles.css`. Assert that the app imports and invokes `initCampaignHero`, destroys an active campaign controller before rerendering, the stylesheet declares `--campaign-scroll-travel: 1595px`, overrides it with `1015px` at mobile width, uses `position: sticky`, and resets the travel and sticky positioning in a reduced-motion media query.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test site/campaign-hero.test.mjs`

Expected: FAIL because sequence exports, markup hooks, lifecycle wiring, and responsive scroll styles do not exist.

### Task 2: Implement the ordered frame module and homepage lifecycle

**Files:**
- Modify: `site/campaign-hero.mjs`
- Modify: `site/app.js`
- Test: `site/campaign-hero.test.mjs`

**Interfaces:**
- Consumes: browser `window`, `document`, `Image`, `requestAnimationFrame`, and the homepage's existing `compareOffer` CTA wiring.
- Produces: `CAMPAIGN_HERO_FRAMES: string[]`, `campaignHeroFrameIndex(progress: number): number`, `renderCampaignHero(): string`, and `initCampaignHero(root?: ParentNode, environment?: object): { destroy(): void } | null`.

- [ ] **Step 1: Add ordered metadata and pure frame selection**

Generate and freeze 30 asset paths under `/site/assets/campaign-hero-frames/`. Implement `campaignHeroFrameIndex` by clamping finite progress to 0–1 and rounding `progress * 29`.

- [ ] **Step 2: Render the progressive fallback and sequence hooks**

Render a `data-campaign-sequence` track containing a sticky stage, the current visually hidden heading, an `<img data-campaign-frame>` whose initial `src` is frame 1, and the existing native comparison button with `data-cta-action="compareOffer"`.

- [ ] **Step 3: Implement scroll updates, preloading, and cleanup**

Calculate progress from `getBoundingClientRect().top` over `offsetHeight - innerHeight`; update only when the rounded frame changes; use passive scroll and resize listeners with one `requestAnimationFrame` update; preload the next four frames immediately and the remaining frames during idle time or a zero-delay timeout; retain the last loaded frame when a requested image is unavailable; and return an idempotent `destroy()` that removes listeners and cancels pending work.

- [ ] **Step 4: Wire the controller into client-side rendering**

Import `initCampaignHero` beside `renderCampaignHero`. Add `activeCampaignHeroController`, destroy and clear it at the start of `render()`, then initialize it after `app.innerHTML = html` and interaction wiring. Remove the unrelated legacy `window.initSnapSlotHero?.()` call from the homepage render lifecycle only if it has no current matching markup.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test site/campaign-hero.test.mjs`

Expected: PASS with all campaign hero tests green.

### Task 3: Add responsive sticky presentation and deployable frames

**Files:**
- Modify: `site/styles.css`
- Create: `site/assets/campaign-hero-frames/ezgif-frame-001.png` through `site/assets/campaign-hero-frames/ezgif-frame-030.png`
- Test: `site/campaign-hero.test.mjs`

**Interfaces:**
- Consumes: `data-campaign-sequence`, `.campaign-hero-stage`, `.campaign-hero-inner`, `.campaign-hero-image`, and `.campaign-image-cta` markup from Task 2.
- Produces: a viewport-height sticky stage and deployable ordered frame assets.

- [ ] **Step 1: Copy the approved assets without renaming**

Copy all 30 files from `C:\Users\caleb\Downloads\Trimmed` into `site/assets/campaign-hero-frames` and verify the destination contains exactly 30 PNGs sorted from 001 to 030.

- [ ] **Step 2: Implement desktop and mobile scroll travel**

Set `.campaign-hero-sequence` to `--campaign-scroll-travel: 1595px` and `height: calc(100vh + var(--campaign-scroll-travel))`. Make `.campaign-hero-stage` sticky at `top: 0`, viewport-height, centered, and overflow-hidden. Preserve the artwork's intrinsic aspect ratio and current CTA hotspot percentages. At `max-width: 760px`, set `--campaign-scroll-travel: 1015px`.

- [ ] **Step 3: Implement reduced-motion fallback**

Inside `@media (prefers-reduced-motion: reduce)`, set the track travel to `0px`, use natural or one-viewport height, and set the stage to `position: relative` so scrolling does not scrub or pin the sequence.

- [ ] **Step 4: Run the focused test and asset check**

Run: `node --test site/campaign-hero.test.mjs`

Run: `(Get-ChildItem 'site/assets/campaign-hero-frames' -Filter '*.png').Count`

Expected: tests PASS and PowerShell prints `30`.

### Task 4: Verify the homepage behavior and regression surface

**Files:**
- Modify only if verification exposes a defect: `site/campaign-hero.mjs`, `site/campaign-hero.test.mjs`, `site/app.js`, `site/styles.css`

**Interfaces:**
- Consumes: completed hero implementation.
- Produces: verification evidence for completion.

- [ ] **Step 1: Run the complete site test suite**

Run: `node --test site/*.test.mjs`

Expected: all site tests PASS with zero failures.

- [ ] **Step 2: Run the static smoke test**

Run: `node site/phase2-static-smoke.mjs`

Expected: exit code 0.

- [ ] **Step 3: Verify source scope and asset order**

Run: `git diff --check`

Run: `git diff -- site/campaign-hero.mjs site/campaign-hero.test.mjs site/app.js site/styles.css`

Expected: no whitespace errors and changes limited to the homepage sequence behavior plus the existing user edits already present in `site/app.js`.

- [ ] **Step 4: Browser-check desktop, mobile, CTA, and reduced motion**

Serve the repository, open the homepage, and confirm frame 1 at the top, a middle frame near 50% progress, frame 30 before release into “I want to ...”, the comparison CTA opens its existing action, mobile uses the shorter track, and reduced-motion shows a non-sticky static frame.

- [ ] **Step 5: Commit the implementation files only**

Stage the campaign module, campaign test, stylesheet, app lifecycle change, 30 frame assets, and this plan. Do not stage unrelated modified or generated files.

Commit message: `feat: add homepage scroll sequence hero`

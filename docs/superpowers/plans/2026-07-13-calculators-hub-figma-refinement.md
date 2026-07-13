# Calculators Hub Figma Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce implementation-ready desktop and mobile Figma layouts for the `/calculators` hub using the approved desktop Editorial Orbit and mobile Scenario Stage directions.

**Architecture:** Refine the approved exploratory frames in the existing Figma file without changing application code. Establish a small local token and component layer from the current project CSS, compose final breakpoint frames from reusable card structures, then validate copy, layout, accessibility, and sticky/in-flow CTA behavior with screenshots and metadata reads.

**Tech Stack:** Figma Design, Figma Plugin API through `use_figma`, project CSS tokens from `site/styles.css`, canonical calculator data from `site/app.js` and `mock-data/production-seed.json`.

## Global Constraints

- Modify only the Figma file `ZuJBk0fE6bPmpcVvLXlLz4`; do not modify application code in this plan.
- The source spec is `docs/superpowers/specs/2026-07-13-calculators-hub-lead-in-redesign.md`.
- Use only the five canonical calculator destinations and their current names, routes, descriptions, and displayed fields.
- Do not add a guided chooser, calculator inputs, results, charts, estimates, new routes, or a standalone VA refinance calculator.
- Do not copy house imagery or unsupported qualification, approval, credit-impact, security, or no-obligation claims from the inspiration images.
- Desktop uses the light Editorial Orbit direction and an in-flow full-width banner.
- Mobile uses the blue Scenario Stage direction and a viewport-sticky footer.
- Use Outfit for display text and Inter for body text, matching the project fallbacks available in Figma.
- Preserve editable layers, meaningful names, and auto-layout relationships in the final frames.
- Every `use_figma` write loads `figma-use`, `figma-generate-design`, and `figma-generate-library`, returns every created or mutated node ID, and is followed by targeted validation.

---

## File Structure

The implementation changes no repository source files. It updates the following Figma objects:

- Create page: `Final — Calculators Hub`
- Create section: `Local Components`
- Create variables: project color, spacing, and radius values required by this page
- Create component: `Calculator Hub Card`
- Create component: `Prequalification CTA`
- Create frame: `Calculators Hub / Desktop / Editorial Orbit`
- Create frame: `Calculators Hub / Mobile / Scenario Stage`
- Preserve exploratory frames `2:2`, `2:62`, `4:2`, `4:40`, `5:2`, and `5:52` as references on the original page

## Canonical Content Fixture

Use this fixture for all card instances:

```js
const calculators = [
  {
    name: "Mortgage Payment Calculator",
    route: "/calculators/mortgage-payment",
    description: "Estimate principal, interest, taxes, insurance, HOA, and product-specific mortgage insurance or funding fees.",
    fields: "PRICE • DOWNPAYMENT • RATE • TAXES • INSURANCE"
  },
  {
    name: "Affordability Calculator",
    route: "/calculators/affordability",
    description: "Start from income, debts, cash available, and location costs, then show which product guardrails may constrain the result.",
    fields: "INCOME • DEBTS • DOWNPAYMENT • LOCATION • BORROWERGOAL"
  },
  {
    name: "Refinance Calculator",
    route: "/calculators/refinance",
    description: "Compare current payment, new payment, closing costs, break-even timing, and refinance-specific product rules.",
    fields: "CURRENTLOAN • NEWRATE • TERM • CLOSINGCOSTS • BREAKEVEN"
  },
  {
    name: "Rent vs Buy Calculator",
    route: "/calculators/rent-vs-buy",
    description: "Compare rent, ownership payment, estimated equity, transaction costs, and time horizon.",
    fields: "RENT • TARGETCITY • PRICE • TIMELINE • DOWNPAYMENT"
  },
  {
    name: "Down Payment Calculator",
    route: "/calculators/down-payment",
    description: "Estimate minimum down payment, cash-to-close, and the payment effect of changing the selected product.",
    fields: "PRICE • PROGRAM • CASHAVAILABLE • CLOSINGCOSTS • MORTGAGEINSURANCE"
  }
];
```

---

### Task 1: Create the final page and page-local foundations

**Files:**
- Read: `site/styles.css:1-42`
- Modify Figma file: `ZuJBk0fE6bPmpcVvLXlLz4`

**Interfaces:**
- Consumes: project tokens and available fonts discovered during exploration
- Produces: page ID for `Final — Calculators Hub`; variable IDs and style IDs used by Tasks 2-4

- [ ] **Step 1: Inspect before writing**

Run a read-only `use_figma` call that returns all page names, local variables, local text styles, local effect styles, and available Outfit/Inter font styles.

Expected: the exploratory page exists; no page named `Final — Calculators Hub` exists.

- [ ] **Step 2: Create the final page**

Create one design page named `Final — Calculators Hub`. Tag it with shared plugin data:

```js
page.setSharedPluginData("snap_calculators", "key", "final-calculators-hub");
```

Return the created page ID.

- [ ] **Step 3: Create scoped variables**

Create one collection named `Snap Calculators Hub` with one mode named `Default`. Create and scope these variables:

```js
const colorTokens = {
  "color/brand/primary": "#0B55FF",
  "color/brand/dark": "#073FC2",
  "color/navy": "#10254A",
  "color/text/primary": "#18243A",
  "color/text/muted": "#65738A",
  "color/border/default": "#DFE8F4",
  "color/bg/page": "#F6F9FD",
  "color/bg/soft": "#F5F8FC",
  "color/bg/surface": "#FFFFFF"
};
const spacingTokens = {
  "spacing/2xs": 4,
  "spacing/xs": 8,
  "spacing/sm": 12,
  "spacing/md": 16,
  "spacing/lg": 24,
  "spacing/xl": 32,
  "spacing/2xl": 48
};
const radiusTokens = {
  "radius/sm": 8,
  "radius/md": 16,
  "radius/lg": 24,
  "radius/xl": 32
};
```

Apply `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`, `GAP`, and `CORNER_RADIUS` scopes only where appropriate; do not leave any variable at `ALL_SCOPES`. Set WEB code syntax using the corresponding CSS custom property where one exists.

- [ ] **Step 4: Create text and shadow styles**

Create these local styles:

- `Display/H1/Desktop`: Outfit Bold, 64 px, 0.95 line height
- `Display/H1/Mobile`: Outfit Bold, 48 px, 1.0 line height
- `Display/Card/Primary`: Outfit Bold, 24 px, 1.1 line height
- `Display/Card/Supporting`: Outfit Bold, 20 px, 1.15 line height
- `Body/Lead`: Inter Regular, 18 px, 1.55 line height
- `Body/Card`: Inter Regular, 14 px, 1.45 line height
- `Label/Eyebrow`: Inter Bold, 12 px, uppercase, 0.06 em letter spacing
- `Label/Fields`: Inter Semi Bold, 10 px, uppercase, 0.04 em letter spacing
- `Effect/Card/Soft`: `0 10 26 rgba(16,37,74,0.08)`

- [ ] **Step 5: Validate foundations**

Read back the page, collection, variables, scopes, code syntax, text styles, and effect style. Expected: all listed objects exist exactly once and every variable has a specific scope.

- [ ] **Step 6: Commit planning checkpoint**

No Git commit is created because this task changes only Figma. Record the returned IDs in the execution log before continuing.

---

### Task 2: Build reusable calculator-card and CTA components

**Files:**
- Read: `site/app.js:1065-1071`
- Read: `site/app.js:2305-2398`
- Modify Figma page: `Final — Calculators Hub`

**Interfaces:**
- Consumes: Task 1 variable and style IDs; canonical content fixture
- Produces: `Calculator Hub Card` component-set ID and `Prequalification CTA` component-set ID

- [ ] **Step 1: Create the local-components section**

Create a section named `Local Components` at the right side of the page canvas. Add text annotations describing the card and CTA APIs.

- [ ] **Step 2: Create the calculator-card base component**

Create an auto-layout component named `Calculator Hub Card` with text properties:

```txt
Title
Description
Fields
Route
```

The route property is visible as a small design annotation outside the consumer-facing card content; it is not rendered as card copy. Include one decorative calculator icon slot and one arrow. Bind fills, strokes, spacing, radii, and text styles to Task 1 foundations.

- [ ] **Step 3: Create card variants**

Create and combine these variants:

```txt
Emphasis=Primary, Theme=Light
Emphasis=Supporting, Theme=Light
Emphasis=Primary, Theme=Blue
```

The blue variant uses a white surface inside the mobile blue stage; it does not use reversed white text for the card body. All variants retain at least a 44 px interaction target and room for two-line field summaries.

- [ ] **Step 4: Create the CTA component**

Create an auto-layout component named `Prequalification CTA` with variants:

```txt
Breakpoint=Desktop, Position=InFlow
Breakpoint=Mobile, Position=Sticky
```

Use only:

```txt
Title: Start a prequalification conversation
Desktop description: Organize the borrower, property, and timing details a licensed loan officer may need to review next steps.
Action: Start prequalification
```

The mobile variant omits the description and is 104 px tall before safe-area padding.

- [ ] **Step 5: Validate both component sets**

Call `get_metadata` on each component set and `get_screenshot` on each variant group.

Expected:

- Three card variants with the four named properties.
- Two CTA variants.
- No clipped placeholder text.
- Outfit on titles and Inter on descriptions/labels.
- No unsupported CTA claims.

- [ ] **Step 6: Record component IDs**

Store the two component-set IDs in the execution log for Tasks 3 and 4.

---

### Task 3: Compose the final desktop Editorial Orbit frame

**Files:**
- Read: `docs/superpowers/specs/2026-07-13-calculators-hub-lead-in-redesign.md`
- Reference Figma frame: `2:2`
- Modify Figma page: `Final — Calculators Hub`

**Interfaces:**
- Consumes: Task 1 styles/variables; Task 2 component-set IDs; canonical content fixture
- Produces: final desktop frame ID

- [ ] **Step 1: Create the desktop wrapper**

Create an auto-layout frame named `Calculators Hub / Desktop / Editorial Orbit`, width 1440 px, page fill `color/bg/page`, and a centered 1180 px content column. Position it at the left of the final page.

- [ ] **Step 2: Build the desktop header**

Use the canonical Snap Loans SVG from `site/assets/images/snap-loans.svg`. Reproduce the current primary navigation labels from the project header. Mark Calculators as the current location. Do not add an unverified account name.

- [ ] **Step 3: Build the split hero**

Left column:

```txt
Calculators
Mortgage calculators
Choose a calculator, enter visible assumptions, and compare product-aware estimates before a licensed review.
```

Right column: create a noninteractive abstract pathway with two small interface tiles labeled only `Payment` and `Affordability`, connected by a decorative line. Do not show currency, rates, scores, sliders, or computed outputs. Mark the entire pathway frame as decorative in its layer description.

- [ ] **Step 4: Place the five card instances**

Instantiate `Calculator Hub Card` using:

- Row 1: Payment and Affordability with `Emphasis=Primary, Theme=Light`
- Row 2: Refinance, Rent vs Buy, and Down Payment with `Emphasis=Supporting, Theme=Light`

Override Title, Description, Fields, and Route from the canonical fixture. Each row uses equal-height cards.

- [ ] **Step 5: Place the desktop CTA instance**

Place `Prequalification CTA` with `Breakpoint=Desktop, Position=InFlow` after the card rows. Keep it inside normal auto layout and span the full 1180 px content width.

- [ ] **Step 6: Validate the desktop frame**

Capture screenshots of the hero, both card rows, CTA, and full frame. Read all text nodes and assert:

- Exactly five calculator titles.
- Exactly five canonical descriptions.
- Every canonical field summary is present.
- No placeholder, qualification, approval, credit-score, security, or no-obligation copy.
- No clipped text or overlapping nodes.
- The CTA is in flow and not absolutely pinned.

---

### Task 4: Compose the final mobile Scenario Stage frame

**Files:**
- Read: `docs/superpowers/specs/2026-07-13-calculators-hub-lead-in-redesign.md`
- Reference Figma frame: `4:40`
- Modify Figma page: `Final — Calculators Hub`

**Interfaces:**
- Consumes: Task 1 styles/variables; Task 2 component-set IDs; canonical content fixture
- Produces: final mobile frame ID

- [ ] **Step 1: Create the mobile wrapper**

Create a 390 px wide frame named `Calculators Hub / Mobile / Scenario Stage`. Enable vertical scrolling and reserve at least 128 px of bottom content padding for the sticky CTA plus safe-area clearance.

- [ ] **Step 2: Build the compact mobile header**

Use the canonical Snap Loans SVG and a 44 px menu target. Do not render a user name. Preserve sufficient separation between the header and blue hero.

- [ ] **Step 3: Build the blue scenario stage**

Use an auto-layout blue gradient frame containing the canonical eyebrow, title, and description. Place Payment and Affordability card instances using `Emphasis=Primary, Theme=Blue` beneath the introduction.

The hero may be visually immersive, but it must not contain results, sliders, rates, property images, or recommendation language.

- [ ] **Step 4: Place the supporting cards**

Below the blue stage, place Refinance, Rent vs Buy, and Down Payment as `Emphasis=Supporting, Theme=Light` instances in one column. Use the canonical fixture overrides and preserve all displayed fields.

- [ ] **Step 5: Place and annotate the sticky CTA**

Place `Prequalification CTA` with `Breakpoint=Mobile, Position=Sticky` as a fixed child at the bottom of the viewport. Set the frame's fixed-child metadata/constraints and add a non-rendered annotation: `Viewport-sticky; content includes bottom clearance plus safe area.`

- [ ] **Step 6: Validate the mobile frame**

Capture screenshots of the blue stage, each supporting card, sticky CTA, and full frame. Assert:

- Width is exactly 390 px.
- All five cards are visible when scrolling.
- The last card remains unobscured above the sticky CTA.
- Titles, descriptions, and field labels do not overlap.
- Sticky CTA text is limited to the canonical title and action.
- The header, cards, and CTA maintain 44 px targets and readable contrast.

---

### Task 5: Final content, accessibility, and handoff audit

**Files:**
- Read: `mock-data/production-seed.json`
- Read: `site/app.js:2305-2428`
- Read: `docs/superpowers/specs/2026-07-13-calculators-hub-lead-in-redesign.md`
- Validate Figma page: `Final — Calculators Hub`

**Interfaces:**
- Consumes: final desktop and mobile frame IDs
- Produces: approved screenshots, metadata summary, and Figma handoff URL

- [ ] **Step 1: Run the canonical-content audit**

Read all rendered text from both final frames and compare calculator titles, descriptions, and fields against the fixture in this plan. Expected: exact membership and wording, allowing only display capitalization of field labels.

- [ ] **Step 2: Run the unsupported-copy audit**

Search rendered text case-insensitively for:

```txt
qualify for
approved
approval
credit score
no impact
safe
secure
no obligation
live rate
guaranteed
```

Expected: zero matches. The canonical phrase `prequalification conversation` is allowed.

- [ ] **Step 3: Run the layer and component audit**

Use `get_metadata` and a read-only `use_figma` call to confirm:

- Final frames use component instances for all five calculator cards and both CTAs.
- Major layers have meaningful names.
- Desktop CTA is an in-flow child.
- Mobile CTA is fixed to the bottom of the viewport.
- No text node uses a font outside Outfit or Inter except vectorized logo artwork.

- [ ] **Step 4: Run the visual audit**

Capture full-resolution screenshots of both final frames and section-level screenshots of the hero, cards, and CTA.

Expected: no overlap, clipping, placeholder text, broken logo, hidden field summary, or sticky-footer obstruction.

- [ ] **Step 5: Compare against approved directions**

Compare the desktop result with exploratory frame `2:2` and the mobile result with `4:40`. Preserve their approved composition while improving component reuse, text flow, brand accuracy, and annotations.

- [ ] **Step 6: Deliver the handoff**

Return the Figma URL with node-specific links for both final frames and summarize:

- Desktop: Editorial Orbit, in-flow full-width CTA.
- Mobile: Scenario Stage, viewport-sticky CTA.
- Canonical content audit result.
- Accessibility and overlap audit result.
- Any implementation notes attached to the Figma frames.

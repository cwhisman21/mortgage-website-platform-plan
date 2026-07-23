# Homepage Hero and Mega-Menu Design

Date: 2026-07-19  
Status: Approved design pending implementation plan

## Goal

Extend the production homepage without changing the hero's core scroll sequence. The release will:

- Apply the approved Layered Horizon color treatment to the existing hero layout.
- Enlarge the slot-machine artwork by 25% on mobile.
- Move the mobile hero heading and supporting sentence upward and out of view during the opening scroll frames.
- Replace product-type card copy with neutral daily-pricing examples.
- Add a compact, nonfunctional search-shaped element to the header.
- Turn the existing single hamburger menu into a translucent, full-width mega-menu overlay modeled on the supplied Sephora reference.
- Add a full-width `Start my Auto Prequal` CTA at the bottom of the expanded menu.

## Approved Visual Direction

The selected direction is **Layered Horizon (Option B)** with the current hero composition preserved.

- Desktop remains a two-column hero: copy, cards, CTA, and disclosure on the left; slot-machine artwork on the right.
- Mobile remains stacked: heading, supporting sentence, machine, cards, CTA, and disclosure.
- The hero background becomes a Snap-blue gradient with crossing pale-blue and green translucent layers.
- Decorative layers remain behind all content, do not receive pointer events, and do not change layout measurements.
- The menu does not inherit the hero's decorative color layers.

## Scope Boundaries

### In scope

- Homepage hero presentation and mobile copy-exit motion.
- Hero comparison-card content and placeholder pricing data structure.
- Header search-shaped placeholder.
- Existing hamburger menu markup, grouping, overlay styling, and menu CTA.
- Responsive, accessibility, regression, and browser verification.

### Out of scope

- Connecting the production daily-rate feed.
- Functional site-wide search.
- Changing the 45-frame image sequence, scroll distance, wheel step, preload behavior, reel timing, or sticky-stage lifecycle.
- Collecting borrower information or submitting a prequalification from the menu itself.
- Inferring conventional, FHA, VA, veteran, or other program eligibility.

## Existing Hero Contract

Implementation must preserve these production behaviors:

- 30 source images plus 15 repeated final frames create 45 logical frames.
- Desktop wheel movement remains capped at 35px per animation frame.
- Total scroll travel remains 1,540px.
- Lender cards reveal at logical frames 17, 22, and 25.
- The hero CTA and disclosure reveal at frame 25.
- Reverse scrolling restores prior visual and accessibility states.
- Dynamic viewport height continues to control the sticky stage on supported browsers.
- Reduced-motion mode renders the complete static comparison without scroll-driven transitions.

## Hero Motion

### Mobile artwork size

At viewports up to 900px wide:

- Increase the standard mobile machine width from `min(58vw, 360px)` to `min(72.5vw, 450px)`.
- Increase the short-height mobile width from `min(40vw, 160px)` to `min(50vw, 200px)`.

These values are an exact 25% increase. Desktop artwork dimensions do not change.

### Mobile heading exit

- Only the hero heading and supporting sentence participate in the copy-exit motion.
- They begin moving upward as the sequence leaves frame 1.
- They are fully above the clipped stage and visually transparent by frame 10.
- At completion, each moving copy element uses at least `translateY(-140%)` and `opacity: 0`; the exact easing may be tuned without changing the frame-10 endpoint.
- The motion is continuous rather than a single threshold jump.
- Reverse scrolling restores the copy continuously.
- The elements remain in the document and accessibility tree; the effect is visual only.
- Desktop copy remains stationary.
- Reduced-motion mode disables the exit transform and shows the complete static comparison.

The existing hero update loop is the synchronization point. It may expose one normalized copy-exit value through CSS custom properties, but it must not alter frame selection or progress math.

## Pricing Cards

### Labels and fields

Cards remain aligned with the existing reel colors and reveal frames:

| Card | Header | Rate | APR | Down payment | Points | Accent |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Lender 1 | 6.125% | 6.284% | 5% | 1.000 | Blue |
| 2 | Lender 2 | 6.000% | 6.221% | 10% | 0.500 | Blue |
| 3 | Lender 3 | 5.875% | 6.164% | 20% | 0.000 | Green and slightly enlarged |

- The visible field label is exactly `Down payment`.
- APR is at least as prominent as the interest rate.
- No conventional, FHA, VA, veteran, or other product/program labels appear.
- Values are structured placeholder examples until the rate feed is connected.
- The three examples use different displayed down payments and therefore must not be described as an overall loan ranking or an apples-to-apples quote comparison.
- Rate, APR, and points improve monotonically from Lender 1 through Lender 3.
- Lender 3 is the displayed `Best` example because it has the lowest rate, lowest APR, and lowest points in this placeholder set. `Best` applies only to those visible example pricing fields and is not a universal borrower recommendation or total-cost conclusion.

### Data boundary

Move pricing values into a small immutable data structure consumed by the card renderer. Each entry supports:

- `lender`
- `rate`
- `apr`
- `downPayment`
- `points`
- `accent`
- `revealFrame`
- `featured`
- optional future `asOf`

The future feed integration can replace this data source without changing card markup or reveal behavior. Until a real feed timestamp is supplied, the UI says `Daily pricing example` and must not fabricate an effective date.

### Disclosure

Keep a close-proximity disclosure beneath the CTA. It must explain that:

- Values are example daily-pricing inputs, not personalized pricing or an overall loan ranking.
- They are not a quote, approval, offer, rate lock, or commitment to lend.
- Rate, APR, points, fees, down payment, availability, and terms can vary by borrower, property, market, and lender review.
- Displayed down payments are examples, not universal minimum requirements.
- The `Best` treatment identifies the lowest displayed example rate, APR, and points only; it does not establish the best loan for a viewer.

## Header

Preserve the existing header contract:

- One Snap logo.
- Logged-in `Welcome back, {name}` outside the navigation menu.
- One hamburger button controlling one `#site-navigation` element.
- Existing account actions remain inside the navigation menu.
- Existing open/close hooks and data attributes remain stable.

### Search-shaped placeholder

- Add a compact 230px search-shaped element on desktop.
- It shows a search icon and the word `Search`.
- It is intentionally nonfunctional in this release.
- It is not focusable and does not impersonate a working input or button.
- On mobile it uses `clamp(56px, 20vw, 80px)` while preserving the visible welcome text and hamburger, including at 320px viewport width.
- No search index, submission handler, suggestion layer, or analytics event is added.

## Mega-Menu Overlay

### Structure

The existing navigation element becomes a grouped mega-menu while preserving its ID and toggle behavior.

1. **Explore**
   - Locations
   - Rates
2. **Mortgage goals**
   - Buy
   - Refinance
   - Loan Options
3. **Tools and learning**
   - Calculators
   - Learning
4. **Guidance**
   - Loan Officers
   - Branches

The account-action row remains inside the menu and includes the existing logged-in or logged-out actions.

### Presentation

- The menu opens immediately below the sticky header.
- It spans the full viewport width even though the header content is constrained.
- It overlays the hero rather than pushing the hero down.
- The surface uses `rgba(255, 255, 255, 0.96)` with a restrained backdrop blur.
- The hero remains faintly visible through the surface, but text contrast must remain AA-compliant.
- A soft shadow separates the menu from the hero; there is no hard border line.
- Desktop uses four navigation columns.
- Tablet uses two columns.
- Mobile uses one scrollable column within the available dynamic viewport height.
- Decorative blue/green hero layers never appear inside the menu.

### Menu CTA

- The last menu row is a full-width CTA labeled exactly `Start my Auto Prequal`.
- It links to `/prequal/start`.
- It spans 100% of the menu's padded inner content width on all breakpoints, retaining the same left and right gutters as the navigation groups rather than touching the viewport edges.
- It remains in normal menu flow rather than covering links.
- Activating it follows normal navigation behavior and closes the menu through the existing link-close path.

## Interaction and Accessibility

- The hamburger retains `aria-controls` and synchronized `aria-expanded` state.
- Its accessible label changes between open and close states.
- Escape closes the menu and restores focus to the toggle.
- Outside click closes the menu.
- Navigation and account actions remain keyboard reachable in logical DOM order.
- Focus indicators remain visible against the translucent surface.
- The overlay does not use a modal focus trap.
- Menu content uses semantic groups with headings and lists.
- The menu CTA has a descriptive focus state.
- Mobile heading motion never removes the heading from assistive technology.
- Decorative hero layers are hidden from assistive technology.

## Failure and Fallback Behavior

- If JavaScript enhancement fails, the complete hero comparison remains visible through the existing static fallback.
- If placeholder pricing data is incomplete, the card renderer must not invent an `asOf` value or product type.
- Browsers without backdrop-filter support receive the same 96% white menu surface without blur.
- Browsers without dynamic viewport units continue using the existing `vh` fallback.
- Reduced-motion users receive a static hero with all cards, CTA, disclosure, and heading visible.

## Expected Code Areas

- `site/campaign-hero-card-layer.mjs`: structured pricing examples, neutral card fields, disclosure.
- `site/campaign-hero.mjs`: mobile copy-exit synchronization only; frame and scroll behavior unchanged.
- `site/campaign-hero.css`: Layered Horizon background, 25% mobile machine sizing, copy-exit presentation, pricing-card refinements.
- `site/app.js`: grouped mega-menu markup and compact search placeholder.
- `site/styles.css`: header, translucent full-width overlay, grouped navigation, and menu CTA.
- Existing hero and homepage UI contract tests: updated and extended.
- `site/index.html`: cache-version bump for changed public assets.

## Verification Strategy

### Automated contracts

- Assert the 45-frame array, 35px step, 1,540px travel, and 17/22/25 thresholds remain unchanged.
- Assert heading-exit progress reaches completion by frame 10 and reverses correctly.
- Assert reduced-motion mode disables copy exit.
- Assert exact 25% mobile artwork sizing at both mobile rules.
- Assert the three neutral cards contain rate, APR, down payment, and points and contain no product types.
- Assert down payments are 5%, 10%, and 20%, and points improve from 1.000 to 0.500 to 0.000.
- Assert the green featured card owns the lowest displayed rate, APR, and points before it receives the `Best` treatment.
- Assert the disclosure remains adjacent to the CTA.
- Assert one hamburger controls one menu and the welcome remains outside it.
- Assert the four semantic nav groups, account row, and `Start my Auto Prequal` CTA exist inside the menu.
- Assert the CTA targets `/prequal/start`.
- Assert the search-shaped element has no interactive wiring or tab stop.
- Assert the menu surface is full width, overlays the hero, and uses a 96% white fallback.

### Browser verification

- Desktop: current two-column hero composition remains intact on the new background.
- Mobile: current stacked order remains intact, the machine is 25% larger, and copy exits by frame 10 without clipping the cards.
- Reverse scroll restores copy and card states.
- Menu overlays rather than moves the hero.
- Menu remains readable over all hero frames and at mobile breakpoints.
- Escape, outside click, menu navigation, focus return, and CTA navigation work.
- No horizontal overflow, console errors, broken frame loads, or stale CSS assets occur.

## Acceptance Criteria

1. The hero looks like the approved Layered Horizon mockup while retaining its production layout.
2. The hero remains a 45-frame, 35px-per-frame sequence with unchanged reveal timing.
3. Mobile machine artwork is exactly 25% larger at both mobile size rules.
4. Mobile heading and supporting sentence are visually out of view by frame 10 and return on reverse scroll.
5. Cards show neutral lender labels and the approved rate, APR, down payment, and improving points values without product types; the green final card is `Best` because it has the lowest displayed rate, APR, and points.
6. The expanded menu is a slightly translucent full-width white overlay above the hero.
7. The menu contains grouped navigation, existing account actions, and a full-width `Start my Auto Prequal` CTA.
8. The compact search-shaped element is visibly present but noninteractive.
9. Existing accessibility and reduced-motion behavior continue to work.
10. Automated tests and desktop/mobile browser verification pass before deployment.

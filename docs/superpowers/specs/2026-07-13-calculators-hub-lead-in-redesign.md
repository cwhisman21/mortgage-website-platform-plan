# Calculators Hub Lead-In Redesign

Date: 2026-07-13

Status: Approved design direction; awaiting written-spec review

Figma exploration: https://www.figma.com/design/ZuJBk0fE6bPmpcVvLXlLz4

## Objective

Redesign only the `/calculators` lead-in page as a polished editorial decision surface. The page should help a borrower scan the five available calculator destinations and select one without introducing a guided chooser, calculator inputs, scenario results, or new product logic.

The supplied desktop and mobile images are composition references only. Project files remain the source of truth for brand tokens, navigation, calculator names, descriptions, captured fields, routes, and conversion language.

## Scope

### Included

- One desktop `/calculators` hub layout at 1440 px.
- One mobile `/calculators` hub layout at 390 px.
- The existing global header represented at each breakpoint.
- The canonical hub eyebrow, title, and explanatory copy.
- Five whole-card calculator links.
- A desktop full-width prequalification banner.
- A mobile viewport-sticky prequalification footer.
- Responsive rules and accessibility annotations sufficient for implementation planning.

### Excluded

- Individual calculator pages or calculator workspaces.
- Calculator inputs, sliders, product toggles, results, charts, or estimates.
- A questionnaire, wizard, recommendation engine, or guided calculator chooser.
- A standalone VA refinance calculator.
- New calculator categories, routes, fields, claims, disclosures, or product behavior.
- Qualification, approval, rate-lock, credit-impact, security, or no-obligation promises not already supported by the project.
- House illustrations or other imagery copied from the inspiration images.

## Canonical Content

The hub uses the current source material in `site/app.js` and `mock-data/production-seed.json`.

### Page introduction

- Eyebrow: `Calculators`
- Title: `Mortgage calculators`
- Description: `Choose a calculator, enter visible assumptions, and compare product-aware estimates before a licensed review.`

### Calculator destinations

1. **Mortgage Payment Calculator**
   - Route: `/calculators/mortgage-payment`
   - Description: `Estimate principal, interest, taxes, insurance, HOA, and product-specific mortgage insurance or funding fees.`
   - Displayed fields: `price`, `downPayment`, `rate`, `taxes`, `insurance`
2. **Affordability Calculator**
   - Route: `/calculators/affordability`
   - Description: `Start from income, debts, cash available, and location costs, then show which product guardrails may constrain the result.`
   - Displayed fields: `income`, `debts`, `downPayment`, `location`, `borrowerGoal`
3. **Refinance Calculator**
   - Route: `/calculators/refinance`
   - Description: `Compare current payment, new payment, closing costs, break-even timing, and refinance-specific product rules.`
   - Displayed fields: `currentLoan`, `newRate`, `term`, `closingCosts`, `breakeven`
4. **Rent vs Buy Calculator**
   - Route: `/calculators/rent-vs-buy`
   - Description: `Compare rent, ownership payment, estimated equity, transaction costs, and time horizon.`
   - Displayed fields: `rent`, `targetCity`, `price`, `timeline`, `downPayment`
5. **Down Payment Calculator**
   - Route: `/calculators/down-payment`
   - Description: `Estimate minimum down payment, cash-to-close, and the payment effect of changing the selected product.`
   - Displayed fields: `price`, `program`, `cashAvailable`, `closingCosts`, `mortgageInsurance`

The visible field labels may be formatted for readability, but their meaning and membership must not change.

### Conversion content

- Title: `Start a prequalification conversation`
- Supporting copy: `Organize the borrower, property, and timing details a licensed loan officer may need to review next steps.`
- Action: `Start prequalification`

## Approved Visual Direction

The final direction combines Figma exploration A on desktop with exploration B on mobile.

### Desktop: Editorial Orbit

The desktop page uses a light editorial presentation.

1. Global header.
2. Split hero:
   - Left: eyebrow, title, and canonical description.
   - Right: an abstract scenario-pathway composition made from interface-like shapes and canonical calculator concepts. It must not display a calculated result or imply a recommendation.
3. Calculator destination area:
   - Mortgage Payment and Affordability are the two primary cards in the first row.
   - Refinance, Rent vs Buy, and Down Payment are equal supporting cards in the second row.
   - Hierarchy communicates common entry points, not eligibility or an algorithmic recommendation.
4. Full-width prequalification banner near the bottom of the hub.

The desktop banner is part of normal document flow and is not sticky.

### Mobile: Scenario Stage

The mobile page uses a more immersive blue hero.

1. Compact mobile header.
2. Blue hero containing:
   - Eyebrow, title, and canonical description.
   - Mortgage Payment and Affordability as prominent whole-card links.
3. Refinance, Rent vs Buy, and Down Payment as stacked cards below the hero.
4. Compact prequalification footer fixed to the viewport bottom.

The sticky footer must not contain the full desktop supporting paragraph. It uses the canonical conversion title and action in a compact form. Page content requires bottom padding at least equal to the footer height plus a safe-area allowance so the final card and any future disclosure remain readable.

## Interaction Model

- Every calculator card is one focusable link to its canonical route.
- Cards do not contain a nested button.
- Hover and keyboard-focus states may change border, shadow, or elevation without moving surrounding layout.
- The desktop banner and mobile sticky footer expose one prequalification action.
- The abstract desktop pathway is decorative and not interactive.
- The hierarchy does not collect answers or personalize card ordering.

## Responsive Behavior

- Desktop target: 1440 px frame with the project content width respected.
- Mobile target: 390 px frame.
- Between breakpoints, the two primary desktop cards collapse to a single column before the mobile blue-stage composition takes over.
- Card titles and descriptions must reflow without collision or truncation.
- Field summaries may wrap to two lines; they must not be ellipsized if doing so hides a canonical field.
- The sticky footer must account for mobile safe-area insets.

## Visual System

Use the project tokens from `site/styles.css`:

- Primary blue: `#0B55FF`
- Dark blue: `#073FC2`
- Navy: `#10254A`
- Ink: `#18243A`
- Muted: `#65738A`
- Border: `#DFE8F4`
- Soft background: `#F5F8FC`
- Page background: `#F6F9FD`
- Surface: `#FFFFFF`
- Display font fallback available in Figma: Outfit
- Body font: Inter

Use the canonical Snap Loans logo asset for the final composition. Abstract hero graphics should be built from simple interface geometry and project colors rather than external imagery.

## Accessibility and Compliance

- Maintain WCAG AA contrast for body text, field summaries, and interactive states.
- Provide a visible keyboard focus style on every whole-card link and CTA.
- Preserve a minimum 44 by 44 px pointer target for interactive controls.
- Do not communicate card identity through color alone.
- Treat calculator output as an estimate only on calculator pages; the hub itself shows no output.
- Do not imply approval, qualification, eligibility, live pricing, underwriting, or personalized credit terms.
- Do not add the inspiration image's credit-score, security, or no-obligation claims.

## Figma Deliverable

The final Figma page should contain:

- `Calculators Hub / Desktop / Editorial Orbit`
- `Calculators Hub / Mobile / Scenario Stage`
- Reusable local card structures or design-system instances where available.
- Clearly named layers for header, hero, calculator cards, desktop banner, and mobile sticky footer.
- Layout constraints or auto layout sufficient to demonstrate the responsive relationships.
- A short annotation identifying the mobile CTA as viewport-sticky and the desktop banner as in-flow.

## Acceptance Criteria

- Only the five canonical calculator destinations appear.
- Names, routes, descriptions, and displayed fields match the current project data.
- Payment and Affordability receive primary emphasis without being described as recommendations.
- All cards are whole-card links with no nested action buttons.
- Desktop uses the approved light Editorial Orbit layout.
- Mobile uses the approved blue Scenario Stage layout.
- Desktop uses a full-width in-flow banner.
- Mobile uses a compact sticky footer with sufficient content clearance.
- No copied inspiration imagery or unsupported claims appear.
- Text is legible at both target sizes without overlap, clipping, or placeholder copy.
- The Figma output remains editable and implementation-ready.

# Rates Results Redesign

**Date:** July 15, 2026  
**Status:** Approved for implementation  
**Surface:** Public `/rates` marketplace  
**Design language:** Snap Mortgage Decision Flow

## Objective

Make the rates marketplace faster to scan and easier to compare without changing the approved anonymous, frontend-only acquisition flow. Remove duplicated scenario information, move explanatory disclosures out of the primary comparison path, and redesign the result list as a responsive financial comparison surface.

## Approved Decisions

- Keep the left filter rail as the only place to view and edit scenario filters.
- Remove the complete `Your comparison filters` block from the results panel.
- Keep all useful comparison values visible in every collapsed result.
- Keep a provider-specific `Continue` button in every main result row.
- Do not label a result `Top result` or otherwise imply an unsupported ranking.
- Let the selected sort order communicate why results appear in their current order.
- Offer a sort option for every evidence-backed numeric metric shown in results.
- Use a responsive hybrid presentation: aligned comparison rows on desktop and compact metric cards on mobile.
- Let every result expand independently.
- Add `Expand all` and `Collapse all` controls for the currently rendered result set.
- Move illustrative-result and disclosure copy beneath the result list in a collapsed accordion.
- Keep scenario changes staged until `Update offers`; result-type and sort controls update immediately.
- Use one fixed provider-media slot for a contained company logo or circular loan-officer headshot so every metric column remains aligned.
- Keep borrower-facing filter names and remove technical field-type labels from the production interface.

## Scope

### In Scope

- Results utility bar.
- Desktop comparison header and result rows.
- Mobile result cards.
- Sorting controls and sort-state emphasis.
- Independent offer expansion state.
- Expand all and Collapse all behavior.
- Existing Details, Payment, and Reviews panel presentation within the redesigned result.
- Bottom disclosure accordion.
- Empty, validation, loading, and unavailable-result states within the marketplace.
- Figma design for desktop and mobile result states.
- Automated and browser validation of the changed marketplace.

### Out of Scope

- Changes to the approved filter questions or their underlying mortgage calculations.
- Real provider pricing, ranking, licensing, reviews, or prequalification integration.
- Provider subscription, lead routing, or marketplace administration.
- Changes to educational content beneath the marketplace unless needed to repair layout regressions.
- Changes to the homepage hero or paused hero-asset work.

## Information Architecture

The marketplace remains a two-column desktop workspace:

1. **Filter rail:** the existing purchase/refinance scenario form, progressive filters, Reset, and Update controls. Move Sort out of this rail.
2. **Results panel:** one utility bar, one comparison header, the result list, pagination, and the disclosure accordion.

The results panel must not repeat purchase price, down payment, ZIP, credit range, term, purpose, property type, occupancy, or other filter values already visible in the rail.

### Results Utility Bar

The utility bar contains:

- Result count.
- Companies / Loan officers segmented control.
- Sort label and select control.
- `Expand all` when at least one visible result is collapsed.
- `Collapse all` when all visible results are expanded.

This utility bar is the only Sort surface. Moving Sort here must not leave a duplicate control in the filter rail.

On narrow screens, result count occupies its own line. The type toggle and sort control remain directly usable without opening another menu. Expand/Collapse all is a secondary text-and-icon action.

## Result Presentation

### Desktop Comparison Header

An aligned header labels the scan columns:

- Provider.
- Rate.
- APR.
- Payment.
- Points.
- Upfront cost.
- 8-year cost.
- Rating, only when attributable rating data is supplied.
- Actions.

The currently selected sort column receives a subtle pale-blue background and a direction indicator. This emphasis communicates order without endorsing a result.

### Desktop Result Row

Each row presents:

- Provider logo or approved silhouette.
- Provider or loan-officer display name.
- Result-type context and supplied licensing/supporting identity information.
- Illustrative interest rate.
- Simplified APR.
- Estimated monthly principal and interest.
- Illustrative points.
- Listed upfront cost.
- 8-year borrowing cost.
- Attributable rating and review count when available.
- Filled Snap-blue `Continue` button.
- Secondary `View details` / `Hide details` control.

Rows use full-width white surfaces separated by restrained rules. They must not become decorative cards nested inside a larger card. Financial values carry more visual weight than supporting copy. `Continue` is the only filled action in a row.

### Rating Data Rule

The component contract reserves a rating position, but the current fixture intentionally contains no attributable provider ratings or reviews. The implementation must not invent them. Until valid source data exists:

- Do not show a numeric rating, stars, review count, or Highest rating sort option.
- The Figma component may document the populated variant as an integration-ready state, clearly separated from the current no-rating state.
- Enable the column and corresponding sort option together only when the adapter supplies valid rating evidence.

### Mobile Result Card

Below the desktop breakpoint, every row becomes a compact card:

- Provider identity spans the card width.
- Financial metrics use a stable two-column grid with visible labels.
- The active sorted metric receives the same subtle emphasis used on desktop.
- `Continue` is full-width and remains above the details control.
- No horizontal scrolling is required at supported mobile widths.

## Sorting

Current evidence-backed options:

- Lowest 8-year cost, default.
- Lowest APR.
- Lowest rate.
- Lowest monthly payment.
- Lowest points.
- Lowest upfront cost.

Highest rating is data-conditional and remains unavailable until the adapter provides attributable ratings. Sorting operates only on the returned fixture/integration set and does not introduce a new ranking policy.

Changing sort order must preserve which offer IDs are expanded. If an expanded offer is no longer in the rendered result set because filters or result type changed, remove that ID from expansion state.

## Expansion And Detail Behavior

- Each `View details` control independently toggles its offer.
- Any number of currently rendered offers may be open.
- `Expand all` opens every currently rendered offer.
- `Collapse all` closes every currently rendered offer.
- Loading more results does not automatically expand the newly added rows unless the user invokes Expand all again.
- Continue remains visible in the summary row while details are open.
- Every expanded result maintains its own active tab: Details, Payment, or Reviews.
- Sort changes preserve expanded offer IDs and per-offer tab state.
- Filter updates and Companies / Loan officers changes clear expansion state because the result identity set changes.

Expanded content appears as a full-width band attached to its summary row. The opening transition is brief and honors `prefers-reduced-motion`. Existing payment inputs, donut-chart details, assumptions, keyboard tabs, and prequalification handoff behavior remain functional.

## Disclosure Placement

Remove the always-visible disclosure from above the offers. After the result list and Show more control, render a native or equivalently accessible disclosure accordion:

- Collapsed by default.
- Borrower-facing summary: `About these illustrative results`.
- Contains the existing illustrative-result explanation and sample-offer disclosure.
- Uses `aria-expanded` and an associated content region when not implemented with native `details` and `summary`.
- Remains present in the DOM so the information is available to borrowers, assistive technology, and static inspection.

## Visual System

- Use the approved Decision Flow language.
- Use Outfield for headings where already supported by the site and the existing body typeface for dense comparison data.
- Use Snap blue for primary actions and active controls.
- Use pale blue only for active-sort and selected-state emphasis.
- Reserve green for factual positive statuses supplied by data; do not use it to imply a best offer.
- Use white surfaces, neutral text, restrained gray rules, and radii no greater than 8px.
- Use Lucide icons already available to the project for sort direction, expand/collapse, and disclosure affordances.
- Keep column widths stable so hover, expansion, longer provider names, and changing values do not shift the surrounding layout.
- Keep interface anatomy, control explanations, interaction sequences, and control-state examples in internal design documentation only. The borrower-facing rates page moves directly from useful context into the working scenario controls and results.

## Accessibility

- All controls are keyboard reachable and have visible focus treatment.
- Company / Loan officer controls expose selected state.
- Sort control has an explicit label and communicates current value.
- Expand controls use accurate `aria-expanded` and `aria-controls` relationships.
- Expand all / Collapse all announces the resulting state without moving focus unexpectedly.
- Arrow-key tab navigation remains within the tablist of the owning expanded result.
- Table-like desktop alignment retains semantic article/list structure rather than using an inaccessible visual-only table.
- Mobile labels remain in the DOM; column headers are not the only source of metric meaning.
- Motion is limited and disabled or reduced for `prefers-reduced-motion`.
- Color is never the only indicator of the selected sort field.

## Frontend State Contract

Replace the single `expandedOfferId` and global `expandedTab` model with:

- `expandedOfferIds`: a deduplicated list of non-sensitive offer IDs.
- `expandedTabsByOffer`: an allowlisted mapping from offer ID to `details`, `payment`, or `reviews`.

State parsing and persistence must ignore malformed IDs and unknown tabs. Analytics payloads remain allowlisted and contain no borrower contact information, exact credit data, or private financial information beyond the currently approved scenario contract.

Backward compatibility may read the existing `expandedOfferId` and `expandedTab` cache once, then normalize them into the new shape. New state serialization should use the collection form.

## Figma Deliverable

Create one rates-results design page containing:

- Desktop default results.
- Desktop active-sort state.
- Desktop one-result-expanded state.
- Desktop multiple-results-expanded state with Collapse all.
- Mobile default result card.
- Mobile expanded result card.
- Bottom disclosure accordion, collapsed and open.
- Empty and temporarily unavailable result states.
- Optional integration-ready rating variant, explicitly separated from the current evidence-free fixture state.

Use reusable components and variants for provider type, sort state, expansion state, viewport, and disclosure state. Preserve the current page architecture; the Figma work redesigns the result surface rather than inventing a new rates flow.

## Implementation Boundaries

Expected implementation areas:

- `site/rates-marketplace-ui.mjs`
- `site/rates-marketplace.mjs`
- `site/styles.css`
- `site/rates-marketplace-ui.test.mjs`
- `site/rates-marketplace.test.mjs`
- Generated static routes through the canonical repository generator, if required by the existing build.

Do not hand-edit generated route HTML when a canonical generator owns it.

## Acceptance Criteria

1. The left filter rail remains functional and is the only scenario-filter surface; Sort moves to the results utility bar and is not duplicated.
2. `Your comparison filters` and its explanatory paragraphs are absent from the results panel.
3. Result count, provider-type control, sort, and Expand all/Collapse all appear in the result utility bar.
4. Every collapsed desktop result shows provider, rate, APR, payment, points, upfront cost, 8-year cost, Continue, and details controls.
5. Rating appears only when attributable rating data is present.
6. Every evidence-backed displayed numeric metric has a corresponding sort option.
7. Continue remains directly available on every result and preserves the existing prequalification handoff.
8. Results can expand independently, and Expand all/Collapse all works for the rendered set.
9. Each expanded result retains its own active tab.
10. The existing Details, Payment, Reviews, chart interaction, assumptions, and accessibility behavior still works.
11. No internal interface-instruction block appears on the borrower-facing page, including control anatomy, interaction-sequence, or visible-state examples.
12. Disclosure copy appears below results in a collapsed accessible accordion.
13. Mobile layouts require no horizontal scrolling and keep all actions tappable.
14. Empty, validation, and fixture-error states remain borrower-facing and navigable.
15. Static routes continue to resolve without not-found regressions.
16. No real rates, provider availability, licensing, reviews, ranking, application, or underwriting behavior is implied.

## Validation Plan

- Unit tests for new sort options and sort-field mapping.
- Unit tests for expansion-list parsing, normalization, persistence, and backward compatibility.
- UI render tests confirming removal of the duplicated summary and new disclosure placement.
- UI interaction tests for independent expansion, Expand all, Collapse all, per-offer tabs, sorting, Show more, payment edits, and Continue handoff.
- Accessibility assertions for labels, expanded state, tab semantics, and disclosure semantics.
- Public-copy guard and static route document tests.
- Canonical static route generation/freshness checks.
- Browser verification at desktop, tablet, and mobile widths.
- Browser checks for no overflow, stable rows, keyboard operation, disclosure behavior, sorting, expansion, and chart interaction.
- Screenshots of the desktop and mobile Figma-matched implementation for visual review.

## Risks And Mitigations

- **Wide data density:** use explicit grid tracks and switch to the card layout before values become cramped.
- **Long expanded pages:** provide Collapse all and preserve local control of each offer.
- **State complexity:** normalize IDs and tabs through one adapter-owned state boundary and add focused tests.
- **Unsupported ratings:** keep the rating variant data-conditional and suppress it in the current fixture.
- **Disclosure discoverability:** use plain borrower-facing accordion text and retain the content in the document beneath results.
- **Regression to prequal flow:** preserve existing data attributes, analytics event names, and handoff URL behavior.

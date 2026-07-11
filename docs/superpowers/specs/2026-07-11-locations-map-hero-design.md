# Locations Map-First Hero Design

## Goal

Replace the simplified locations map with the supplied `us.svg` geometry and make the interactive map the dominant element in the locations-page hero. The hero should answer one immediate borrower question: "Where are you looking?"

## Source Asset

- Source file: `C:\Users\caleb\Downloads\us.svg`
- View box: `0 0 1000 589`
- Geometry: 51 individually identified paths covering all 50 states and the District of Columbia.
- Path IDs use state abbreviations and can map directly to the existing state inventory.
- The source file contains no scripts, links, or event handlers.
- Preserve the source's Simplemaps license notice with the extracted geometry.

The earlier `map.svg` is not used because its state geometry is fused into composite paths and cannot provide accurate state-sized links.

## Hero Composition

The locations hero becomes a centered, map-first composition rather than a two-column text and search-card layout.

Content order:

1. Eyebrow: "Explore mortgage markets"
2. H1: "Where are you looking?"
3. Supporting copy: "Choose a state or search for a city to explore local prices, payments, loan options, and market updates."
4. Centered city/state search with the placeholder "Search city or state"
5. Large interactive United States map

The map should be unframed on a white field, use Snap blue for states, and occupy up to approximately 1,100 pixels of width on desktop. It remains centered and preserves the SVG's `1000 / 589` aspect ratio.

Remove "Start with Texas" and "Add to watchlist" from the hero. The existing watchlist action remains in the later market-research section where it has clearer context.

## Map Interaction

Each state path is wrapped in a link to its existing state route. State IDs are resolved against `production-seed.json`; no route is manufactured when a matching state record is absent.

Interaction behavior:

- Default state fill is Snap blue (`#0B55FF`) on white.
- Hover and keyboard focus provide a clearly visible secondary highlight and pointer treatment.
- Every link receives an accessible name such as "Open Vermont mortgage market."
- The District of Columbia retains the approved star marker as the visible link target because its geographic path is too small for reliable interaction.
- Clicking a state or the D.C. star navigates directly to its state page.
- No modal, tooltip dependency, authentication step, or intermediate route is added.

## Page Restructure

Remove the standalone "Browse state mortgage markets" map section below the editorial introduction so the map appears only once.

Move the longer comparison and borrower-education content directly below the hero. Keep this content crawlable and preserve the existing state cards, city table, source references, internal links, and market-research CTAs.

The hero should stay focused on location selection. Deeper explanations of payment, inventory, taxes, insurance, and expert guidance remain below it.

## Responsive Behavior

- Desktop: centered text, compact search row, then the large map.
- Tablet: map scales fluidly without changing its aspect ratio.
- Mobile: text, search, and map stack in that order; the map fits the viewport without horizontal scrolling.
- The map remains usable with touch and keyboard input.
- Text and controls must not overlap the map at any supported viewport.

## Implementation Boundaries

- Replace the geometry in the existing map module rather than creating a second map system.
- Keep route creation and escaping in `site/us-state-map.mjs`.
- Keep visual geometry separate from route and state data.
- Reuse the existing search form behavior.
- Do not alter state-page content, state routes, account behavior, news feeds, charts, or backend simulations.

## Validation

Automated checks must confirm:

- 50 state paths plus one D.C. star are navigable.
- All map routes are unique and match existing state routes.
- The map appears inside the locations hero and is not duplicated later on the page.
- Missing or malformed state records cannot create dead links.
- The supplied SVG geometry retains its 51-state inventory and source notice.
- Existing static route smoke checks continue to pass.

Browser checks must confirm:

- State navigation works from the hero.
- Hover and keyboard focus are visible.
- D.C. remains discoverable and clickable.
- The search form remains usable.
- Desktop and 390-pixel mobile layouts have no horizontal overflow or incoherent overlap.

## Acceptance Criteria

1. The locations hero is centered around "Where are you looking?"
2. The supplied `us.svg` state geometry replaces the simplified map.
3. The map is large, centered, Snap blue on white, and the dominant hero element.
4. Every state and D.C. navigates directly to the correct state page.
5. Search remains in the hero while the Texas and watchlist hero CTAs are removed.
6. The duplicate map section is removed and crawlable educational content remains below the hero.
7. Static routes, keyboard interaction, and mobile overflow checks pass.

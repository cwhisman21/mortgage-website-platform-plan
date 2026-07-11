# Market Chart Tooltip Design

## Goal

Add consistent data inspection to every public chart and graph. A borrower should be able to point at, focus, or touch a chart mark and immediately see the represented data without opening the full table.

## Scope

The behavior applies to every chart produced by `site/market-charts.mjs`:

- Line-chart points
- Comparison bars
- Payment-breakdown segments
- Initial fixture-based charts
- Calculator charts generated after form submission

Rates, state, city, product, calculator, and article pages receive the behavior through the shared renderer. Page templates and chart fixtures do not implement their own tooltip logic.

## Tooltip Content

Each tooltip displays:

1. Point, category, or payment-component label
2. Formatted public value
3. Source name
4. Public as-of date

The formatted value comes from the chart's public table row so the tooltip, visible chart, and expandable data table cannot disagree. The source and date remain visible below the chart as well; the tooltip supplements that citation rather than replacing it.

## Rendering Contract

Every interactive SVG mark receives:

- A shared chart-mark class
- Its public label and formatted value
- Its source label and date
- A complete accessible name
- Keyboard focusability

Line charts retain their visible point and add a larger transparent hit target so precise mouse placement is not required. Bars and payment segments use their visible rectangles as the interaction targets.

Each chart figure renders one reusable tooltip element. Tooltip content is escaped by the existing chart renderer and is never assembled from raw HTML.

## Interaction Behavior

### Pointer

- Hovering a chart mark shows its tooltip.
- Moving within the mark updates the tooltip position so it follows the pointer.
- Tooltip positioning is clamped inside the chart figure and cannot create page overflow.
- The active mark receives a visible highlight.
- Leaving the active chart mark closes the tooltip unless it was opened by touch.

### Keyboard

- Tabbing to a chart mark shows the same tooltip above the focused mark.
- Focus styles do not rely on color alone.
- Moving focus to another mark updates the tooltip.
- Moving focus outside the chart closes the tooltip.
- Escape closes the tooltip.

### Touch

- Touching a mark opens its tooltip.
- Touching another mark updates the tooltip.
- Touching outside the active chart closes the tooltip.
- Chart marks do not navigate, so showing a tooltip does not intercept a required link action.

## Interaction Architecture

Export one chart-interaction initializer from `site/market-charts.mjs` and attach it once to the stable application root. Use event delegation so charts inserted later by calculator submissions work without separate listeners.

The initializer owns:

- Active mark state
- Tooltip content updates
- Pointer and keyboard positioning
- Figure-boundary clamping
- Touch persistence
- Escape and outside-interaction cleanup

The renderer remains responsible for validated, escaped markup. The initializer remains responsible for browser events and positioning. No charting library or page-specific interaction code is added.

## Visual Treatment

- Tooltip background uses the existing dark navy surface.
- Tooltip text is white with a clear label/value hierarchy.
- Source and date use a smaller secondary line while retaining readable contrast.
- Tooltip radius does not exceed the site's existing 8-pixel card radius.
- Active marks increase contrast and receive a visible outline or stroke.
- Motion is limited to a short opacity/position transition and is disabled when reduced motion is requested.

## Error Handling

- A chart without a valid fixture continues to render nothing, as it does now.
- A mark missing its public table value is rejected by existing fixture validation rather than receiving an incomplete tooltip.
- Tooltip positioning falls back to the mark's center when pointer coordinates are unavailable.
- Hiding or replacing a chart clears its active tooltip state.

## Accessibility

- Tooltip behavior is available by mouse, keyboard, and touch.
- Each mark's accessible name includes the same label and value shown visually.
- The expandable data table remains the complete non-visual and low-interaction fallback.
- The chart-level `aria-label` and source citation remain unchanged.
- Tooltip visibility is not the only way to obtain any data point.

## Validation

Automated checks must confirm:

- Line, bar, and payment markup exposes interactive chart marks.
- Every mark contains label, formatted value, source, and date data.
- Line-chart hit targets are larger than their visible points.
- Tooltip text is escaped.
- The existing source citation and expandable table remain present.
- Dynamically calculated charts use the same markup contract.

Browser checks must confirm:

- Mouse hover shows the correct tooltip for line points, bars, and payment segments.
- The tooltip follows the pointer and remains within the figure.
- Keyboard focus and Escape work.
- Touch-style pointer interaction opens and dismisses the tooltip.
- Calculator submission produces a chart whose tooltip works immediately.
- Desktop and mobile pages do not gain horizontal overflow.

## Acceptance Criteria

1. Every chart mark exposes its label, formatted value, source, and date on hover.
2. Keyboard focus and touch provide equivalent data access.
3. Tooltip placement stays inside the chart figure.
4. Line points, bars, and payment segments have visible active states.
5. Existing source lines and data tables remain available.
6. Calculator-generated charts require no special rewiring.
7. Existing chart, route, and mobile-overflow checks continue to pass.

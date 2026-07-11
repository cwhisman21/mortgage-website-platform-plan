# Snap Mortgage Chart, Map, And Content Completion Design

## Status

Approved design direction pending review of this written specification. This specification authorizes a frontend-only completion pass. It does not authorize live API fetching, backend persistence, authentication, CMS work, CRM routing, or changes to the approved public-route hierarchy.

## Goal

Complete the existing static Snap Mortgage public site without discarding approved borrower-facing content. Replace remaining public scaffolding or weak helper language, add source-aware visualizations, and make the main locations page a more useful state-entry surface with an interactive U.S. map.

## Product Boundary

- Product: Snap Mortgage public acquisition, education, local-market, and editorial site.
- Primary audience: borrowers researching mortgage options, local markets, payments, rates, and next steps.
- Snap Homes remains an external account/workstation destination. Existing simulated account, watchlist, lead, rate-review, prequal, and compare-offer actions remain simulated.
- The site remains static and anonymous. No live pricing, personalized decision, or data ingestion behavior is added in this phase.

## Approved Decisions

1. Every public market chart has a visible source line below the chart.
2. Source freshness is chart-level, not a potentially misleading page-level timestamp.
3. Every state and city uses a consistent core visualization system. Extra visuals appear only when a valid fixture and source contract support them.
4. Controlled temporary fixture values are allowed for this frontend pass. The live rate and market-data integration seam must be explicit in code and documentation, but no borrower-facing text may call values placeholders, fixtures, demos, or prototypes.
5. Selecting a state on the main locations map goes directly to that state's existing public page.
6. The map is inline SVG, Snap blue on a white background, and appears above the state cards in the locations-page hero area.
7. District of Columbia is shown as a Snap-blue SVG star over its geographic position and links to its existing public location hub.
8. Charts reveal a readable data table and expanded source details in place. They do not open a chart modal.
9. Rates, calculators, product detail, and editorial articles receive appropriate source-aware visualizations. Loan-officer and branch pages remain action-led and chart-free.
10. The public cleanup applies to every public route, including location pages and article routes, with automated protection against visible scaffolding language.
11. Snapshot-card groups receive one compact shared citation below the group.
12. Vermont and West Virginia are added as state pages. The site must cover all 50 states plus District of Columbia and every national city record with `populationProper >= 50,000` in the current geography source.

## Existing Source And Integration Boundary

The current static renderer loads `mock-data/production-seed.json` in `site/app.js`. It already defines source records and rate benchmarks in the renderer. The completion pass must preserve public page/content relationships in that seed and establish a clear chart-data seam rather than duplicating those relationships.

### Required Files And Responsibilities

| File | Responsibility |
| --- | --- |
| `mock-data/production-seed.json` | Existing public routes, location relationships, content, snapshot context, CTA relationships, and page metadata. It remains the route/content source of truth. |
| `mock-data/market-chart-fixtures.json` | Temporary chart series, comparison points, source metadata, visual units, cadence, table rows, and future integration keys. No rich page copy belongs here. |
| `site/market-charts.mjs` | Data normalization, reusable source-aware SVG chart renderers, chart-table disclosure markup, and safe empty/stale states. |
| `site/us-state-map.mjs` | Accessible inline SVG U.S. map renderer using the route-bearing state records. |
| `site/app.js` | Loads the fixture file, resolves it against existing routes/content, and places reusable map/chart modules in approved page locations. |
| `site/styles.css` | Responsive chart, source note, expanded table, and map visual system. |
| `docs/` handoff files | Documents the fixture data contract and live integration replacement boundary. |

### Fixture Contract

`market-chart-fixtures.json` must contain a versioned source registry and named page/chart fixtures. Each fixture includes:

- `chartId`, `scope`, and stable `entityId` or route reference.
- Question-led `title` and concise `summary` appropriate for borrowers.
- `chartType`, `unit`, `frequency`, and `cadence`.
- Ordered visual data points plus a matching accessible-table representation.
- `sourceId`, `sourceLabel`, `sourceUrl`, `vintage`, and `lastReviewed`.
- `integrationKey` naming the eventual rate/market-data replacement point.
- `status` set to an internal fixture/integration state that never renders publicly.
- A defined empty-state message and fallback route when a fixture is absent.

The browser must render only borrower-facing title, summary, unit, chart, table labels, source label, source URL, and vintage. Fixture-status and integration-key fields are implementation metadata only.

## Economic Visualization System

All new visualizations use semantic HTML plus inline SVG. Each visual must answer one borrower question, make its unit and time frequency visible, avoid dual axes, and include an HTML data table fallback.

### Core Chart Families

| Chart ID | Public question | Page placement | Chart family | Source family |
| --- | --- | --- | --- | --- |
| `market.price_trend` | How has broad home-price movement changed in this market? | State and city pages; selected local articles | Indexed or level line | FHFA HPI |
| `market.location_compare` | How do this location's visible planning factors compare with nearby locations? | State and city pages | Ordered comparison bars or dot plot | Market-data integration / source registry |
| `rates.benchmark_trend` | How have public mortgage benchmarks moved over time? | Rates page and rate articles | Line chart | Freddie Mac PMMS with optional FRED context |
| `payment.breakdown` | Which visible assumptions make up this payment scenario? | Calculators and location product modules | Stacked payment breakdown | Calculator inputs and market fixture metadata |
| `product.scenario_compare` | How can down payment, loan amount, and payment assumptions change across paths? | Product detail pages | Grouped comparison bars | Product fixture / market data integration |
| `article.evidence` | What published data supports this local editorial point? | Article and local-news route | Compact line, comparison bar, or table-first evidence panel | Article source records |

### Source Notes And Detail Behavior

- Every chart has a visible source line immediately beneath its figure: source label, data period or vintage, and a direct source link.
- Snapshot-card groups use one shared source line directly beneath the group.
- A keyboard-operable `details` control reveals a data table, source methodology, cadence, and relevant limitation in place.
- The visual stays understandable without opening the details control.
- Charts use color plus labels, line style, markers, or values so meaning does not rely only on color.
- Mobile uses the same source line and an expandable table below the visual; it does not squeeze a desktop chart into unreadable labels.

### Source Families

Fixture metadata must use the current public source families already recognized by the site:

- FHFA House Price Index for broad state/city home-price movement. FHFA describes its HPI collection as covering all 50 states and more than 400 American cities. [FHFA HPI datasets](https://www.fhfa.gov/house-price-index?tab=HPI+Datasets)
- Freddie Mac Primary Mortgage Market Survey for public national mortgage-rate benchmarks. [Freddie Mac PMMS](https://www.freddiemac.com/pmms)
- U.S. Census American Community Survey for housing, tenure, rent, income, and cost context. [Census Data API guide](https://www.census.gov/data/developers/guidance/api-user-guide.Available_Data.html)
- BLS Local Area Unemployment Statistics for local labor-force and unemployment context. [BLS LAUS](https://www.bls.gov/lau/home.htm)
- Existing FHFA/HUD loan-limit records for product and county-limit context when those fixtures are shown.

Source labels must not imply that an internal temporary value is a live borrower-specific quote, property valuation, approval, or eligibility decision.

## Main Locations Map

### Placement

The main locations page keeps its existing introduction and destination cards. The interactive map appears in the first locations-page market-entry section, after the hero copy and before the state-card grid.

### Behavior

- Render an inline SVG map of all 50 states as individual anchor elements with stable state IDs and direct route `href` values.
- Render District of Columbia as a Snap-blue SVG star in its geographic area with an accessible name and direct route to the District of Columbia page.
- Use a white map canvas, Snap-blue state treatment, and visible hover, focus, and pressed states. The active state treatment must preserve text and boundary contrast.
- Give every geographic link an accessible name such as `Open Texas mortgage market`.
- Pair the map with the existing textual state-card/list path so keyboard users, screen readers, no-JavaScript visitors, and crawlers have ordinary anchor alternatives.
- Do not show disabled geography, incomplete-state labels, `Coming soon`, demo wording, or empty interactions.

## Location Coverage And Content Preservation

### State Coverage

- Add Vermont and West Virginia to `production-seed.json` with the same record shape used by existing state pages.
- Add routes under `/locations/vermont` and `/locations/west-virginia`.
- Add source-aware state snapshot fixtures and the required location-news/article relationships. New borrower-facing state copy must match the existing state-page voice and contain no internal implementation language.
- Retain District of Columbia as its existing distinct location hub.

### City Coverage

- Validate the seed against the national geography source manifest and require every city with `populationProper >= 50,000` to have a complete public record.
- Preserve existing routes, city content, news associations, location-product modules, and local relationships.
- Add only missing qualifying cities, using the established city route, data, article, product, and internal-link model. Do not create thin pages or name-swapped copy.

### Content Cleanup

- Preserve approved borrower-facing copy wherever it remains useful and accurate.
- Replace visible planning jargon, demo labels, instructional content, unresolved tokens, empty navigation labels, generic helper copy, and scaffolding language with meaningful borrower-facing copy or remove the element when it adds no value.
- Never display `placeholder`, `wireframe`, `prototype`, `scaffold`, `demo`, `TBD`, `TODO`, `XXXX`, internal status values, or implementation keys in borrower-facing surfaces.
- Preserve crawlable anchors and existing valid public routes. Do not replace valid routes with `#`, a no-op button, or an unavailable destination.

## Page-Family Placement

| Page family | Required completion work |
| --- | --- |
| Locations directory | SVG map above state cards, shared source note, source-aware location comparison modules, state/city routing validation. |
| State market desk | Snapshot citation, price trend, nearby-city comparison, optional source-supported planning-factor chart, data-table disclosure. |
| City market desk | Snapshot citation, price trend, nearby-market comparison, payment/context visual, data-table disclosure. |
| Rates | Benchmark trend, table/source cleanup, rate source details, no personalized quote implication. |
| Calculator | Payment-breakdown visual tied to visible inputs, source/assumption detail, unchanged estimate-only behavior. |
| Product detail | Scenario comparison visual tied to product assumptions, concise source/assumption note, unchanged action flow. |
| Learning, topic guide, article, local news | Evidence visualization that matches the article's sourced claim; preserve article routes, modal behavior, and standalone pages. |
| Loan officer and branch | No decorative charts; preserve action-led content and existing placement/navigation behavior. |

## Accessibility And Responsive Requirements

- SVG maps and charts have meaningful text alternatives, accessible names, keyboard focus, visible focus styles, and non-color cues.
- Expandable source/data details are keyboard-operable and retain an obvious expanded/collapsed state.
- Source links remain ordinary anchors with direct URLs.
- Charts have readable mobile dimensions, no clipped labels, and a table-first fallback for narrow viewports or sparse data.
- Map, charts, expanded tables, CTAs, dialogs, header, footer, cards, and body content must remain free of desktop and mobile overflow.

## Validation And Acceptance Criteria

1. `market-chart-fixtures.json` has a validated source registry and fixture record for every rendered chart and snapshot group.
2. Each fixture has a title, unit, frequency/cadence, source label, source URL, vintage, table representation, empty-state behavior, and documented integration key.
3. Every public chart and snapshot-card group visibly renders a source line below it.
4. Chart detail controls reveal the associated table and source details in place with keyboard access.
5. The locations page renders a white-background, Snap-blue inline SVG map above state cards; each state links directly to a valid route and D.C. renders as a blue SVG star linked to its hub.
6. The seed contains all 50 states plus District of Columbia, including Vermont and West Virginia, and validates coverage for every qualifying 50k-plus city.
7. Existing borrower-facing content, page types, CTA simulations, article routes, modal behavior, and internal linking remain intact.
8. Automated tests reject borrower-facing scaffolding terms, broken map links, missing source lines, absent chart tables, missing fixtures, invalid coverage, unknown routes, and mobile overflow regressions.
9. Static syntax, existing news tests, location coverage tests, route smoke checks, and representative desktop/mobile browser QA pass.
10. The final handoff identifies `mock-data/market-chart-fixtures.json` and the corresponding adapter as the replacement seam for the live rate/market-data integration.

## Out Of Scope

- Live source ingestion or runtime API calls.
- Real-time mortgage-rate, APR, price, eligibility, payment, prequalification, or product-availability decisions.
- Backend accounts, Snap Homes portal work, CMS implementation, CRM routing, analytics persistence, and admin workflows.
- New loan-officer or branch visualizations beyond existing action-led content.
- Rewriting approved editorial content purely for style.

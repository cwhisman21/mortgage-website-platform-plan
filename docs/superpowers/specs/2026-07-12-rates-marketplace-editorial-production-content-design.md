# Snap Mortgage Rates Marketplace, Contributor Desk, and Production Content Pass

Date: 2026-07-12

Status: Approved design; awaiting written-spec review

## Build Title

Snap Mortgage Public Site: Rates Marketplace, Editorial Contributors, and Production Content Pass

## Summary

Turn the existing static Snap Mortgage public site into a stronger borrower-acquisition surface by adding a frontend-only provider rates marketplace, introducing six topic-led editorial contributors and their author pages, attributing public articles to those contributors, and replacing unfinished public copy across the site with borrower-ready production content.

The build remains frontend-only. Provider, pricing, licensing, ranking, review, account, and prequalification integrations are represented through replaceable contracts and static fixtures until the existing Snap ecosystem services are connected.

## Product Area

- Primary product: Snap Mortgage public acquisition, rates, content, and SEO site.
- Connected product context: Snap Homes account context may supply prefill data later, but the Snap Homes portal is not built in this repo.
- External system boundary: Existing Snap systems remain the source of truth for subscriber organizations, loan officers, pricing, licensing, ranking, lead routing, accounts, and prequalification integrations.

## Task Type

- Existing feature enhancement.
- Frontend-only marketplace build.
- Editorial content-system enhancement.
- Public copy and SEO production pass.
- UI/UX redesign within established page-type patterns.
- Structured fixture and adapter design for future integration.

## Approved Approach

Use one integrated production pass with three coordinated workstreams:

1. Rates marketplace and provider-specific prequalification handoff.
2. Editorial contributor registry, directory, profiles, and article attribution.
3. Site-wide production-copy audit and rewrite, including the audited Learning Center content.

This approach is preferred over rates-first or content-first sequencing because shared article cards, metadata, routes, fixture contracts, and copy-quality gates can be completed once and validated as one public experience.

## Relationship To Earlier Approved Work

This specification extends the existing canonical plans and resolves two direct conflicts:

1. The approved creation of six contributors, contributor routes, article bodies, dates, sources, metadata, and attribution supersedes the no-new-content-object restriction in `docs/superpowers/specs/2026-07-12-learning-center-home-redesign.md` only for the objects defined here. The approved Learning Center layout, route structure, shell, and page behavior remain in force.
2. The rates-result `Next` action may open the dedicated `/prequal/start` simulated handoff page. This is the only exception to the modal-only prequalification behavior established in `docs/16-phase-2-cleanup-build-brief.md`. Other generic prequalification CTAs retain their existing approved modal behavior unless separately approved later.

The homepage hero is explicitly sidelined. Do not integrate, delete, move, or alter the paused slot-machine hero assets, root `index.html`, hero screenshots, or delegated hero-kit work as part of this build.

## Problem Being Solved

The current `/rates` page explains public benchmarks but does not yet help a borrower compare visible participating-provider offers. The user cannot refine a realistic purchase or refinance scenario in place, compare company and individual loan-officer results, inspect costs and payment assumptions, or continue through a provider-specific Snap prequalification handoff.

The Learning Center also appears more complete than its underlying content. Twenty-four seeded article routes share one generic article body, nine topic hubs reuse substituted template prose, internal statuses are masked as public content, and several public states contain terms such as `dummy`, `mock`, or other implementation-oriented language.

Articles and location news do not yet use a coherent contributor system. The desired editorial model is a small topic-led desk whose pages help borrowers discover related content without adding AI chat, fake credentials, social profiles, or interaction simulations.

## Business Goal

- Increase the usefulness and conversion value of the rates page.
- Create a clear frontend contract for future Snap provider and prequalification integrations.
- Improve organic acquisition through distinct, source-backed, internally linked content.
- Build recognizable editorial continuity across mortgage education and local market news.
- Remove public signals that the site is a prototype or planning artifact.

## User Goal

A borrower should be able to:

1. See sample mortgage offers immediately.
2. Refine a prefilled purchase or refinance scenario without first sharing contact information.
3. Compare companies or individual loan officers using consistent financial fields.
4. Inspect costs, payment assumptions, and source-attributed reviews without leaving the results list.
5. Select a result and see a provider-specific prequalification handoff summary.
6. Read distinct, sourced mortgage articles attributed to a consistent contributor.
7. Move naturally among rates, calculators, products, locations, articles, loan officers, branches, and high-intent next steps.

## User Roles

### Primary

- Anonymous potential borrower or homeowner comparing mortgage options.

### Secondary

- Returning Snap Homes consumer whose available account context may prefill a future scenario.
- Public visitor reading mortgage education or local market news.
- Loan officer represented in marketplace fixtures now and supplied by the Snap integration later.
- Participating mortgage company represented in marketplace fixtures now and supplied by the Snap integration later.

### Admin And Operations

- Out of scope for this frontend build.
- Real subscriber administration, licensing, pricing, ranking, routing, reviews, and publishing workflow live elsewhere.

## Current State

- The public static app is rendered primarily by `site/app.js` from `mock-data/production-seed.json`.
- `/rates` currently presents benchmark education, benchmark cards, a rate table, a chart, methodology, contextual CTAs, and state links.
- The site already has reusable shell, card, table, chart, modal, account-menu, CTA, location-news, route-smoke, and public-copy-guard behavior.
- Location news is structured beneath `mock-data/location-news/` and has generated crawlable article routes beneath `site/generated/learning-center/market-news/`.
- The current working tree contains user-owned and other-agent changes. Existing uncommitted work must be preserved.
- A separate homepage-hero effort is paused and must remain untouched.

## Desired State

- `/rates` is an immediate-results marketplace supported by crawlable education rather than a benchmark-only page.
- Purchase and refinance scenarios update visible sample offers in place.
- Companies and loan officers are equal result types behind a selector, with Companies as the first-visit default.
- Offer details, payment assumptions, and reviews expand inline.
- `Next` opens a dedicated provider-specific prequalification handoff page with the submitted scenario summary.
- Six editorial contributors have directory/profile pages and are assigned to every applicable public article and news record.
- The 24 audited Learning Center articles are unique, substantive, source-backed pieces.
- The nine audited topic hubs contain distinct borrower-facing copy and useful navigation.
- Rendered public pages contain no unfinished, structural, or internal-planning language.
- Existing public routes, page types, account behavior, CTA behavior, and responsive design continue to work.

## Scope

### In Scope

- Frontend-only rates marketplace on `/rates`.
- Purchase and refinance scenario controls.
- URL, account-context, browser-cache, and neutral-default precedence.
- Company/Loan Officer result selector.
- Six sort options and eight-result initial pagination.
- Inline Details, Payment, and Reviews panels.
- Editable payment assumptions and an interactive donut chart.
- Dedicated `/prequal/start` simulated handoff page.
- Six contributor records, portraits, bios, author pages, and directory integration.
- Article-card and article-page contributor attribution.
- Contributor attribution for location-news records and generated pages.
- Unique rewrite of all 24 audited Learning Center article bodies.
- Distinct rewrite of all nine audited topic hubs.
- Site-wide rendered-copy inventory and cleanup.
- Real researched facts, source dates, and citations for article and chart content.
- Internal linking, titles, descriptions, canonical metadata, and sitemap updates.
- Tests, browser QA, independent review, and deployment after validation.

### Out Of Scope

- Real provider, subscriber, pricing, licensing, ranking, or lead-routing integration.
- Real authentication or Snap account creation.
- Real Snap Homes portal implementation.
- Real personalized rate quote or rate lock.
- Real prequalification questions, decisions, eligibility, underwriting, credit checks, or application submission.
- Real company profile pages.
- New branch-page structure or full branch administration.
- AI chat, persona responses, scripted responses, or assistant UI.
- Contributor social profiles, contact actions, or fabricated personal histories.
- Review collection or review-writing functionality.
- Backend, API, database, CRM, CMS, or n8n workflow implementation.
- Offer-document upload or real comparison.
- Homepage hero implementation or alteration.

## Rates Marketplace User Flow

1. A visitor opens `/rates` and sees populated sample company offers immediately.
2. The initial scenario is resolved in this order:
   1. Explicit URL or referring-page context.
   2. Available Snap account context through a nonblocking adapter.
   3. Valid browser-cached scenario values.
   4. Neutral defaults.
3. The app does not request or infer geolocation.
4. The visitor switches between Purchase and Refinance or edits visible scenario controls.
5. The page validates and applies the scenario in place, updates the static summary, and stores only approved nonprivate state.
6. The visitor switches between Companies and Loan Officers. First visit defaults to Companies; subsequent visits restore the last valid selection.
7. The visitor sorts and filters visible offers.
8. Eight offers appear initially. `Show more offers` reveals the next available group without discarding the scenario.
9. The visitor expands one offer and selects Details, Payment, or Reviews.
10. Editable payment assumptions update the offer-level total and donut chart locally.
11. The visitor selects `Next`.
12. The app opens `/prequal/start` with the selected provider/LO fixture key and the current nonprivate scenario context.
13. The handoff page identifies the selected result and summarizes the submitted scenario. It does not collect fields or make a lending decision.
14. Browser Back returns to `/rates` with filters, sort, result type, expanded result where practical, and scenario restored.

## Rates Scenario Requirements

### Shared Fields

- Sort by.
- Mortgage type: Purchase or Refinance.
- ZIP code.
- Credit score range.
- Loan term.
- Show FHA loans: Yes or No.
- Show VA loans: Yes or No.
- Debt-to-income range: Less than 40% or 40% and above.
- Points: All, 0, 0-1, or 1-2.
- Property type.
- Property use: Primary, Secondary, or Rental.
- Reset filters.
- Update.

### Purchase Fields

- Purchase price.
- Down payment in dollars.
- Down payment as a synchronized percentage.

### Refinance Fields

- Property value.
- Cash out: Yes or No.
- Loan balance.

### Progressive Disclosure

- Primary scenario controls remain visible.
- FHA, VA, DTI, points, property type, and property use live beneath `Show more`.
- Purchase and refinance values are preserved independently when switching modes during the same visit.
- Invalid or impossible combinations receive clear inline guidance and do not crash the result list.

## Sort Options

- Lowest 8-year cost, default.
- Lowest APR.
- Lowest rate.
- Lowest monthly payment.
- Lowest upfront cost.
- Highest rating.

The frontend sorts only the returned fixture set. It does not invent the production marketplace ranking policy, which remains owned by the external Snap system.

## Results Header

Display the following directly above results:

- Plain-language participating-provider disclosure.
- Static scenario summary, for example: `Purchase | 92109 | $1,060,000 price | 20% down | 780+ credit | 30-year | Primary home`.
- Companies/Loan Officers selector.
- Sort control.
- Result count.
- Filter-summary affordance on mobile.

The disclosure should explain that results include participating companies and mortgage professionals using Snap, Snap may receive platform fees, and not every provider or offer is represented. Do not explain internal ranking, licensing, subscription, or routing systems.

## Result Contract And Presentation

Company and loan-officer results use the same financial comparison fields:

- Stable result ID.
- Result type: company or loan officer.
- Display name.
- Logo or contributor-quality headshot.
- Sponsoring company for loan officers.
- NMLS fields supplied by the fixture/integration.
- Product and term label.
- Interest rate.
- APR.
- Points.
- Estimated monthly principal-and-interest payment.
- Upfront cost.
- Eight-year cost.
- Aggregate rating and review count.
- Availability/status needed to render the result.
- Details data.
- Payment assumptions.
- Reviews data.
- Provider-specific prequalification integration key.

Use fictional fixture identities and a borrower-facing sample-offer disclosure until the real integration is connected. Do not imply that fixture identities are currently licensed participants or that a displayed offer is available to the visitor.

## Result Interaction

Each result keeps its summary row visible while one inline panel opens beneath it.

### Details Tab

- Upfront-cost total.
- Eight-year-cost total.
- Plain-language explanation of each estimate.
- Points.
- Origination, underwriting, processing, and other fixture fee lines where supplied.
- Footnotes defining points and included fee categories.
- Clear statement that taxes, insurance, third-party costs, final pricing, and eligibility may vary as applicable.

### Payment Tab

- Principal and interest, read-only from the offer.
- Homeowners insurance, editable assumption.
- Property tax, editable assumption.
- HOA dues, editable assumption.
- PMI or mortgage insurance, editable assumption.
- Total monthly estimate.
- Interactive donut chart with mouse, keyboard, and touch details.
- Changes remain local to the expanded result and do not alter provider pricing.

### Reviews Tab

- Read-only source attribution.
- Aggregate rating.
- Rating distribution.
- Sort control for fixture reviews.
- Review attributes where supplied.
- Individual review cards.
- No `Write a review` action.
- No implication that Snap collected or verified fixture reviews.

Company results do not link to company profile pages in this phase. Loan-officer identity may link to an existing LO profile when a matching route exists. Missing profile routes render identity without a dead link.

## Prequalification Handoff

Create `/prequal/start` as a dedicated simulated handoff page for a selected marketplace result.

The page includes:

- Selected company or loan-officer identity.
- Product/term and key displayed offer values.
- A concise summary of the scenario submitted from `/rates`.
- Borrower-facing confirmation that the selected option and carried-forward scenario are ready to continue through the provider's Snap prequalification experience.
- A return-to-results action that restores prior comparison state.

The page contains no name, email, phone, financial-document, credit, income, asset, debt, SSN, or property-detail form. It does not make a decision, promise a rate, or simulate underwriting. A future integration may replace this route with the selected provider's configured Snap prequalification destination.

## Rates State And Data Flow

### State Precedence

1. Explicit valid URL values.
2. Available Snap account adapter values.
3. Valid local browser cache.
4. Neutral defaults.

Each source fills only values not already resolved by a higher-priority source. Malformed values are ignored individually rather than invalidating the complete scenario.

### Browser Storage

Allowed:

- Purchase/refinance mode.
- ZIP code.
- Property and loan amounts entered in the public comparison form.
- Credit-score range selection, not a credit report or exact score.
- Term, occupancy, property type, DTI band, points, FHA/VA toggles.
- Sort, result type, and UI expansion preferences.

Do not store:

- Name, email, phone, SSN, date of birth.
- Income, assets, debts, bank information, documents, or credit-report data.
- Authentication tokens.
- Underwriting or eligibility outcomes.
- Provider secrets or integration credentials.

### Adapter Boundary

Define a small frontend interface around:

- Scenario-context resolution.
- Offer listing.
- Offer details.
- Reviews.
- Prequalification destination/handoff.

The fixture adapter implements the complete UI contract now. Provider-specific fetch, authentication, ranking, licensing, routing, retry, and reconciliation behavior remain unknown and out of scope until the existing Snap integration contract is supplied.

## Editorial Contributor System

### Approved Initial Roster

1. Rowan Hale - Rates and economy.
2. Maya Brooks - Local markets.
3. Jordan Avery - Home buying.
4. Elena Park - Refinancing and equity.
5. Marcus Lane - Loan programs.
6. Priya Bennett - Mortgage data.

Each public role title is exactly `Snap Mortgage Editorial Contributor`.

### Contributor Profile Rules

Each contributor has:

- Stable ID.
- Slug.
- Name.
- Role title.
- Primary beat.
- Borrower-facing short bio.
- Borrower-facing full bio.
- Coverage-topic list.
- Consistent realistic editorial headshot.
- Descriptive image alt text.
- Profile route.
- Related article IDs resolved from article ownership rather than manually duplicated.

Bios describe what the contributor covers and how the coverage helps borrowers. Do not invent employment history, degrees, certifications, licenses, NMLS IDs, locations, awards, social accounts, personal experiences, quotes, testimonials, or first-person anecdotes.

The public presentation does not assert that the contributor is a licensed professional or a human mortgage expert. Publishing responsibility in structured article metadata remains with Snap Mortgage. Do not use structured metadata that falsely asserts personal credentials or licenses.

### Contributor Routes

- Directory: `/learning-center/editorial-team`.
- Profiles: `/learning-center/authors/{slug}`.

The directory introduces the six contributors, their beats, and links to their profiles. Each profile contains the headshot, name, approved role title, beat, borrower-facing bio, coverage topics, and linked article archive.

There is no chat, prompt box, simulated response, assistant launcher, direct contact, social link, or company/LO marketplace action on contributor pages.

### Article Attribution

- Every Learning Center article receives one required `authorId`.
- Every location-news article receives one required `authorId`.
- Assignment follows the article's dominant topic, not geography alone.
- Cards show a small headshot, contributor name, and published or updated date.
- Full article pages show a linked contributor byline near the headline.
- No separate `Reviewed by Snap Mortgage` credit is shown.
- Existing generic author/editor/reviewer scaffolding is removed or replaced by the approved contributor treatment.

Suggested deterministic assignment order:

- Rate movements, inflation, central-bank context, and broad financing conditions -> Rowan Hale.
- Inventory, home values, local taxes, insurance, labor-market effects, and city/state comparisons -> Maya Brooks unless mortgage-data interpretation is dominant.
- Purchase preparation, first-time buyers, down payments, offers, and property-use decisions -> Jordan Avery.
- Refinance, cash-out, HELOC, home equity, breakeven, and term changes -> Elena Park.
- Conventional, FHA, VA, USDA, jumbo, and program-comparison content -> Marcus Lane.
- Methodology, HMDA, census, affordability indices, chart interpretation, and data-source explainers -> Priya Bennett.

## Contributor Portrait Direction

- Generate six realistic, professionally styled editorial headshots.
- Use a consistent crop, lighting quality, background treatment, and visual finish.
- Preserve individual appearance and avoid six near-identical compositions.
- Store optimized local raster assets beneath a contributor-specific site asset directory.
- Verify desktop and mobile rendering, cropping, loading, and alt text.
- Portraits are temporary creative assets and may be replaced later without changing contributor IDs or article relationships.

## Production Content Requirements

### Site-Wide Standard

Every visible sentence must be borrower- or customer-ready production material. Public text must not explain the build, describe internal architecture, label fixture mechanics, narrate the UI, or expose editorial workflow.

Scan rendered pages, static generated pages, source templates, and public JSON-backed content for unfinished terms and patterns. The guard should cover at least:

- `dummy`
- `mock`
- `prototype`
- `placeholder`
- `wireframe`
- `scaffold` or `scaffolding`
- `simulated in this build`
- `would open next`
- `research seed`
- `production seed`
- internal review statuses
- generic labels such as `Topic guide`, `Trust layer`, `Content graph`, `Editorial graph`, `Answer unlock`, and `Readable body copy`
- repeated template passages identified in `C:\Users\caleb\OneDrive\Documents\Snap Ecosystem\learning-center-placeholder-text-audit.md`

Legitimate HTML input placeholder attributes may remain only when their text is polished borrower guidance, for example a clear mortgage-topic or ZIP search hint.

### Audited Learning Center Scope

Rewrite all 24 article routes listed in the audit as complete, distinct articles. Preserve each route. Titles and metadata may improve when a clearer borrower-facing SEO title better matches the existing intent.

Rewrite the nine audited topic hubs with distinct content:

- Local Market Updates.
- Buying a Home.
- Refinance.
- FHA Loans.
- VA Loans.
- Jumbo Loans.
- Home Equity.
- Taxes and Insurance.
- Editorial Team, which becomes the contributor directory.

Remove public status masking that makes draft or review-required content appear published. The completed static build should expose only finished public content; internal workflow statuses must not be rendered as borrower labels.

### Article Anatomy

Each full article includes:

1. SEO title and meta description.
2. One H1.
3. Borrower-facing summary/dek.
4. Contributor byline and published or updated date.
5. Relevant hero or supporting image when an approved asset is available.
6. Distinct introduction.
7. Practical key takeaways.
8. Multiple substantive H2/H3 sections.
9. Real comparisons, examples, tables, or decision factors appropriate to the topic.
10. A chart, table, or calculator when it materially improves understanding; do not add decorative data displays.
11. Contextual CTA and internal-link breaks between longer sections.
12. Borrower-focused conclusion.
13. FAQs.
14. Visible sources and source dates.
15. Related articles, products, locations, calculators, rates, LOs, or branches.

Do not hide the article's core SEO value behind account, watchlist, contact, or prequalification gates.

### Local Market And Evergreen Rules

- Local market updates are dated news pieces with an explicit `as of` date and source links.
- Product, calculator, and foundational education guides are evergreen and show `Last updated`.
- Article and chart numbers must be real and sourced. An `as of` date does not legitimize fixture or invented data.
- Mock figures are limited to the clearly identified sample-offer marketplace.
- Existing sourced location-news articles may be preserved if they pass copy, citation, date, and duplication checks.
- Location-news cards retain approved modal behavior while their links continue to resolve to crawlable canonical article pages.

### Research And Sources

- Use current authoritative sources appropriate to each claim.
- Prefer primary public sources for rates, program rules, limits, economic data, taxes, housing data, and government-backed loan information.
- Record source title, publisher, direct URL, source date, access/update date where useful, and the claim or chart supported.
- Put chart source and `as of` information directly below the chart.
- Do not fabricate citations, statistics, quotations, reviews, credentials, or local facts.
- Keep quotations short and use original borrower-facing synthesis.

### Charts And Data Displays

- Charts must answer a borrower question, not merely decorate a section.
- Every chart exposes values by mouse hover, keyboard focus, and touch.
- Every chart includes units, period, legend where needed, source, and source date.
- Visualized data and surrounding prose must agree.
- Empty or unavailable source data should omit the chart or show a polished unavailable state; never substitute invented article data.

### Internal Linking

Strengthen contextual links among:

- Rates and relevant calculators.
- Rates and purchase/refinance/product guides.
- Product guides and state/city pages.
- State/city pages and local news.
- Articles and relevant products, calculators, locations, LOs, and branches.
- Contributor profiles and their articles.
- Learning Center hubs and their related discovery paths.

Every visible link must resolve to an existing route. Do not create dead navigation labels or routes with no page behind them.

## Technical Architecture

### Module Boundaries

Keep the existing static architecture and shell. Avoid adding more domain logic directly to the large `site/app.js` file.

Create focused modules for:

- Rates marketplace scenario, filtering, sorting, rendering helpers, and interaction state.
- Editorial contributor lookup, article assignment, cards, bylines, and profile rendering.
- Data-contract validation where it can be shared by tests and generation scripts.

`site/app.js` remains responsible for top-level route wiring and shared page-shell composition. New modules should expose small, documented interfaces and pure helpers where possible.

### Structured Data

Add a contributor collection to the existing content source or a dedicated static JSON file with stable IDs. Extend Learning Center and location-news records with `authorId` and the content fields required by this specification.

Add a dedicated marketplace fixture file rather than mixing provider offers into general editorial seed metadata. Its shape must match the adapter contract expected by the UI.

Update location-news generation so regenerated records retain deterministic contributor attribution. Do not hand-edit thousands of generated files when the source generator can own the relationship.

### Crawlability And Routes

- Preserve existing article URLs.
- Add contributor routes to the route resolver, static smoke inventory, sitemap, and canonical metadata.
- Add `/prequal/start` to the route resolver and smoke inventory.
- Preserve generated canonical location-news pages.
- Ensure modal-enhanced news links remain ordinary crawlable links without JavaScript.
- Preserve one H1 and logical headings on each public page.

## Permissions And Role Logic

- All rates education, sample marketplace results, contributor pages, topic hubs, and articles are public.
- No contact information is required to browse or refine results.
- No backend create, update, delete, or admin permission is introduced.
- Account-context reading is an optional future adapter; failure or absence must not block public use.
- Contributor pages are editorial discovery surfaces, not user accounts or licensed-professional profiles.

## Integrations

### Current Build

- Static marketplace fixture adapter.
- Static contributor and article data.
- Existing frontend account/menu behavior.
- Existing public chart, location-news, and route systems.

### Future Integration Boundaries

- Participating company and loan-officer records.
- Pricing and offer calculations.
- Licensing and NMLS verification.
- Ranking and result eligibility.
- Reviews and review-source data.
- Snap account scenario context.
- Provider-specific Snap prequalification destination.
- Lead and opportunity routing.

Endpoint names, authentication, payloads, retry behavior, and source-of-truth reconciliation are unknown and intentionally excluded. The fixture adapter must be replaceable without redesigning the user interface.

## States

### Rates

- Initial populated state.
- Applying filters/loading state.
- Updated results state.
- No matching offers state with useful filter-reset guidance.
- Fixture unavailable or malformed state.
- Invalid URL/cache values state with safe fallback.
- Result expanded and collapsed states.
- Details, Payment, and Reviews tab states.
- Show-more exhausted state.
- Provider-specific prequalification handoff state.
- Return-to-results restored state.

### Contributors And Articles

- Directory populated state.
- Profile populated state.
- Contributor with no articles state, though launch data should avoid this.
- Missing author reference fallback that attributes publishing to Snap Mortgage without a broken page.
- Missing optional portrait fallback without a broken image.
- Article-source or chart-data unavailable state that omits unsupported claims/data.

All public error and fallback copy must be borrower-facing. Do not expose stack traces, fixture filenames, internal statuses, source object keys, or implementation instructions.

## Analytics Hooks

Provide existing-pattern event hooks or data attributes for future analytics; do not add a production analytics vendor.

Suggested events:

- `rates_scenario_updated`
- `rates_mortgage_type_changed`
- `rates_result_type_changed`
- `rates_sort_changed`
- `rates_filters_reset`
- `rates_offer_expanded`
- `rates_offer_tab_viewed`
- `rates_payment_assumption_changed`
- `rates_show_more_selected`
- `rates_provider_next_selected`
- `prequal_handoff_viewed`
- `prequal_handoff_returned`
- `contributor_directory_viewed`
- `contributor_profile_viewed`
- `article_opened`
- `article_related_link_selected`
- `contextual_cta_selected`

Do not emit private financial values, PII, exact freeform content, or integration credentials in analytics payloads.

## Compliance And Risk Flags

This specification does not make a legal or compliance conclusion. Human review remains appropriate for published mortgage claims, sample-offer disclosure, advertising language, NMLS presentation, reviews, program rules, and the future provider integration.

Implementation must:

- Avoid guaranteed approval, guaranteed savings, best-rate, lowest-rate-in-market, guaranteed eligibility, rate-lock, or commitment-to-lend language.
- Describe marketplace figures as sample offers or estimates until real provider data is connected.
- Avoid implying that fixture companies or LOs are licensed participating subscribers.
- Keep public benchmarks distinct from personalized offers.
- Explain that rates, APRs, payments, points, costs, product availability, and terms may change and depend on borrower/property/lender review.
- Avoid collecting PII, credit data, documents, or borrower financial data.
- Keep prequalification as a handoff, not a decision.
- Keep reviews read-only and source-attributed.
- Avoid fake contributor credentials, professional licenses, experiences, testimonials, or structured data claims.

## Notifications

- No email, SMS, push, CRM, or internal task notification is implemented.
- User feedback is limited to in-page state, validation, and the dedicated prequalification handoff confirmation.

## Error Handling

- Validate fixture and content contracts before rendering.
- Ignore malformed URL/cache fields individually and use the next valid source.
- Preserve the rest of the results experience if one offer lacks optional details or reviews.
- Never render links to absent company or LO profile routes.
- Use default publishing attribution only as a defensive fallback; tests must still fail missing launch attribution.
- Omit unsupported charts and claims rather than inserting invented values.
- Preserve public educational content if marketplace fixtures fail to load.

## Testing Strategy

### Unit And Contract Tests

- Scenario precedence and normalization.
- Purchase/refinance switching and independent values.
- Dollar/percent down-payment synchronization.
- Filter behavior and reset.
- All six sort orders.
- Eight-result initial limit and show-more behavior.
- Payment total and donut-segment calculations.
- URL/cache serialization and malformed-value recovery.
- Company/LO union rendering requirements.
- Contributor assignment by topic.
- Contributor/article relationship validation.
- Required article dates, sources, sections, and public status.
- Marketplace fixture contract validation.

### Static And Content Tests

- JavaScript syntax checks.
- JSON parsing and schema checks.
- Existing static route smoke suite.
- New author and prequalification route smoke coverage.
- No not-found links from visible navigation, cards, bylines, or CTAs.
- Canonical URL, metadata, sitemap, and heading checks.
- Rendered-copy guard across representative routes and generated content.
- Duplicate/template passage detection for the 24 audited articles and topic hubs.
- Article claim/source/date completeness checks.
- Every applicable article and news record has a valid `authorId`.

### Browser QA

- `/rates` desktop and mobile initial state.
- Purchase and refinance editing.
- Company/LO selector.
- Sorting, filtering, reset, and show more.
- Inline tabs and payment editing.
- Mouse, keyboard, and touch chart details.
- `Next` handoff and Back restoration.
- Editorial directory and each author profile.
- Learning Center home, one hub from each page pattern, all 24 articles through automated checks, and representative visual checks.
- Representative state/city news cards and article modals/routes.
- Existing LO and branch pages.
- No mobile horizontal overflow, clipped controls, text overlap, or unusable tap targets.
- Console and network error review.

### Independent Review

Use an independent review pass for:

- Specification compliance.
- Runtime wiring and route integrity.
- Public-copy completeness.
- Data/source integrity.
- Accessibility and responsive behavior.
- Regression risk against user-owned dirty work and paused hero assets.

## Acceptance Criteria

1. `/rates` displays populated sample company offers immediately without requiring contact information.
2. Companies is the first-visit result default and the selected mode can later be restored.
3. Companies and Loan Officers use the same approved financial comparison fields.
4. Purchase and refinance expose their approved shared and mode-specific fields.
5. URL, account context, browser cache, and neutral defaults resolve in the approved order with no automatic geolocation.
6. Six approved sort options work and lowest eight-year cost is the default.
7. Eight results appear initially and `Show more offers` reveals additional matches.
8. A participant/sample-offer disclosure and scenario summary appear above results.
9. Result expansion keeps the summary visible and provides Details, Payment, and Reviews tabs.
10. Payment assumptions update the displayed total and accessible donut chart.
11. Reviews are read-only and source-attributed.
12. Company rows do not create company profile routes.
13. LO rows link only when a valid existing LO route is available.
14. `Next` opens `/prequal/start` with selected-result and scenario context.
15. The prequalification handoff shows a summary but collects no fields and makes no decision.
16. Back navigation restores the comparison state.
17. All six approved contributors exist with consistent portraits, role titles, beats, and borrower-facing bios.
18. `/learning-center/editorial-team` is a production-ready contributor directory.
19. Six `/learning-center/authors/{slug}` pages resolve and list related articles.
20. Contributor bios contain no invented credentials, work history, licenses, locations, or personal experiences.
21. No contributor chat, simulated response, contact, or social feature exists.
22. Every applicable article and location-news item resolves to one valid contributor.
23. Article/news cards show headshot, name, and date.
24. Full article pages show a linked contributor byline and no separate reviewer credit.
25. All 24 audited Learning Center articles contain distinct production bodies and preserve their routes.
26. All nine audited topic hubs contain distinct borrower-facing copy and useful real links.
27. Local market updates use real sourced data with `as of` dates.
28. Evergreen guides show last-updated dates and source-backed factual claims.
29. Article and chart figures are real and cited; mock figures are limited to the sample-offer marketplace.
30. Charts expose values by mouse, keyboard, and touch and show sources below.
31. Public content remains crawlable and core article value is not gated.
32. Every visible navigation, card, byline, and CTA link resolves to a real page or approved modal behavior.
33. Rendered public routes contain no unfinished, structural, internal-planning, or fixture-language copy outside approved borrower-facing sample-offer disclosure.
34. Existing account, Watchlist, CTA modal, location, chart, LO, branch, and Learning Center behavior does not regress.
35. Existing and new static tests pass.
36. Desktop and mobile browser checks find no not-found routes, console-breaking errors, text overlap, or horizontal overflow.
37. The paused homepage hero and unrelated working-tree changes remain untouched.
38. Independent review finds no unresolved high-severity specification or runtime defects.

## Assumptions

- The existing Snap provider and prequalification systems will eventually supply the adapter contract.
- The current static-site architecture remains the implementation target for this phase.
- The existing route, chart, modal, account-menu, location-news, and static-generation systems remain available.
- Real public data can be researched from authoritative sources for the approved article scope.
- Contributor portraits may be generated now and replaced later while preserving IDs and routes.

## Open Questions

No open question blocks the frontend build.

Future integration details remain intentionally unknown:

- Production provider endpoint and authentication.
- Exact provider/LO payload schema.
- Licensing and NMLS verification source.
- Production ranking semantics.
- Review source and verification contract.
- Snap account-context bridge.
- Provider-specific production prequalification URL and handoff protocol.
- Analytics destination.

These unknowns must remain behind the frontend adapter and must not be invented during this build.

## Recommended Skill And Execution Sequence

1. `superpowers:writing-plans` to produce the implementation guide after written-spec approval.
2. `multi-skill-orchestrator` to coordinate disjoint implementation workstreams and preserve the dirty working tree.
3. `researcher` for current authoritative article and chart sources.
4. `copywriting` and `mortgage-copywriter` for borrower-facing content production and mortgage-language review.
5. `economist` for chart selection, units, interpretation, and source-to-visual consistency.
6. `imagegen` or the approved image workflow for contributor portraits.
7. `frontend-design` for rates, profile, and article-component implementation within the approved design language.
8. `seo-audit` for titles, metadata, canonical routes, structured content, internal links, and crawlability.
9. `snap-qa-testing`, `webapp-testing`, and Vercel browser verification for static and visual QA.
10. `superpowers:requesting-code-review` for independent final review.
11. `superpowers:verification-before-completion` before deployment or completion claims.

## Final Codex Build Prompt

```markdown
Inspect this repo first. Read `AGENTS.md`, `README.md`, `docs/00-chat-handoff.md`, `docs/10-v1-prd.md`, `docs/15-production-research-and-content-plan.md`, `docs/16-phase-2-cleanup-build-brief.md`, `docs/superpowers/specs/2026-07-12-learning-center-home-redesign.md`, and `docs/superpowers/specs/2026-07-12-rates-marketplace-editorial-production-content-design.md`. Inspect the current dirty working tree before changing anything. Treat existing modifications and untracked files as user-owned unless the implementation plan proves otherwise.

Then execute the approved implementation guide for the following build.

Objective:
Create one integrated frontend-only production pass for the Snap Mortgage public site: a Bankrate-style participating-provider rates marketplace using replaceable static fixtures, a six-contributor editorial system with author pages and article attribution, and a site-wide rewrite/removal of unfinished public copy. Preserve existing page types, routes, SEO value, approved account/CTA behavior, and current design conventions.

Snap ecosystem context:
This repo is the Snap Mortgage public acquisition, rates, content, and SEO surface. Existing Snap systems outside this repo own subscriber organizations, loan officers, pricing, licensing, ranking, reviews, account data, provider-specific prequalification integrations, and lead routing. Snap Homes may later supply account context, but this repo must not build the Snap Homes portal. Keep every external dependency behind a replaceable frontend adapter and use static fixtures now.

Product area:
Snap Mortgage public site with future Snap provider, account-context, and prequalification handoff integrations.

Scope:
- Replace the benchmark-first `/rates` experience with visible sample offers plus preserved crawlable rate education.
- Show sample offers immediately using neutral defaults and no contact gate.
- Resolve scenario values in this order: valid URL/page context, available Snap account context, valid browser cache, neutral defaults.
- Do not use automatic geolocation.
- Support the approved Purchase and Refinance field sets.
- Add Companies/Loan Officers selector; Companies is the first-visit default.
- Add six sorts: lowest 8-year cost, lowest APR, lowest rate, lowest payment, lowest upfront cost, highest rating.
- Show eight offers initially and a `Show more offers` action.
- Show participant/sample-offer disclosure and a static scenario summary above results.
- Use equal financial fields for company and LO results: identity, NMLS, rate, APR, points, payment, upfront cost, eight-year cost, rating, details, and `Next`.
- Add inline Details, Payment, and Reviews tabs.
- Make Payment assumptions editable and render an accessible interactive donut chart.
- Keep Reviews read-only and source-attributed.
- Create `/prequal/start` as a dedicated selected-result handoff with scenario summary and return-to-results behavior.
- Create six approved contributors: Rowan Hale, Maya Brooks, Jordan Avery, Elena Park, Marcus Lane, and Priya Bennett.
- Use the exact public title `Snap Mortgage Editorial Contributor`.
- Generate consistent realistic editorial headshots and create `/learning-center/authors/{slug}` profile pages.
- Turn `/learning-center/editorial-team` into the six-contributor directory.
- Add one valid `authorId` to every applicable Learning Center and location-news article.
- Show contributor headshot, name, and date on article/news cards and a linked byline on full articles.
- Do not add a separate reviewer credit.
- Rewrite all 24 article routes and nine topic hubs identified in `C:\Users\caleb\OneDrive\Documents\Snap Ecosystem\learning-center-placeholder-text-audit.md` as distinct production content.
- Preserve article URLs; improve titles and metadata only where clearer borrower-facing SEO wording helps.
- Audit every rendered public page, static generated page, template, and public data source for unfinished public copy.
- Use real researched data, source dates, citations, and chart source notes for articles and charts.
- Limit mock figures to the clearly disclosed sample-offer marketplace.
- Strengthen internal links among rates, calculators, products, locations, articles, LOs, branches, contributor pages, and contextual CTAs.

Rates field requirements:
- Shared: sort, Purchase/Refinance, ZIP, credit range, term, FHA yes/no, VA yes/no, DTI below 40%/40%+, points All/0/0-1/1-2, property type, occupancy Primary/Secondary/Rental, reset, update.
- Purchase: purchase price and synchronized dollar/percentage down payment.
- Refinance: property value, cash out yes/no, loan balance.
- Put secondary controls beneath `Show more`.

Result detail requirements:
- Details: upfront cost, eight-year cost, explanations, points, fee lines, footnotes, and assumptions.
- Payment: principal and interest, editable insurance/tax/HOA/PMI, total, accessible donut visualization.
- Reviews: source, aggregate score, distribution, sorting, attributes, and read-only individual reviews.
- Do not create company profile pages.
- Link LO identity only when an existing valid LO route exists.

Contributor requirements:
- Rowan Hale: rates and economy.
- Maya Brooks: local markets.
- Jordan Avery: home buying.
- Elena Park: refinancing and equity.
- Marcus Lane: loan programs.
- Priya Bennett: mortgage data.
- Bios describe coverage and borrower benefit only.
- Do not invent work history, degrees, licenses, NMLS IDs, locations, awards, personal experiences, testimonials, social accounts, or first-person anecdotes.
- Do not add chat, simulated answers, assistant UI, direct contact, or social features.
- Keep factual publishing responsibility with Snap Mortgage in metadata and do not add false credential schema.

Production-content requirements:
- Every visible sentence must be borrower/customer-ready production material.
- Remove or rewrite public `dummy`, `mock`, `prototype`, `placeholder`, `wireframe`, `scaffold`, internal status, instructional, and substituted-template language.
- Legitimate form placeholder attributes may remain only with polished borrower-facing search guidance.
- Articles need one H1, summary, byline/date, distinct introduction, useful takeaways, substantive H2/H3 sections, comparisons, relevant data/tool, contextual CTA/internal-link breaks, conclusion, FAQs, sources, and related content.
- Local market articles are dated news with `as of` dates; educational/product guides are evergreen with `Last updated`.
- Article and chart facts must be real and directly supported by authoritative sources.
- Charts must expose data by mouse, keyboard, and touch and cite the source below.
- Core crawlable content must remain visible without account/contact/prequal gates.
- Preserve location-news modal enhancement and crawlable canonical article links.

Out of scope:
- Real provider, pricing, licensing, ranking, review, account, CRM, lead-routing, or prequalification integrations.
- Real auth, account creation, backend persistence, API, database, CMS, or n8n workflow.
- Real personalized rate, eligibility, approval, underwriting, rate lock, or application.
- Company profile routes.
- Review submission.
- AI chat or persona interaction.
- Offer-document upload or comparison.
- Homepage hero work.

Important isolation rule:
The homepage hero is paused in another workstream. Do not modify, move, delete, integrate, or commit the untracked `site/assets/slot-hero/`, root `index.html`, slot-hero screenshots, delegated hero-kit files, or any related hero work. Do not revert unrelated dirty-tree changes.

Architecture requirements:
- Preserve the static site architecture and established design system.
- Keep top-level route wiring in `site/app.js` but extract rates and contributor domain logic into focused modules.
- Add a dedicated marketplace fixture contract and adapter.
- Add structured contributor records and stable `authorId` relationships.
- Update generators so regenerated location news preserves deterministic author assignment.
- Keep provider-specific APIs, authentication, ranking, licensing, retries, and reconciliation behind an unimplemented integration boundary.
- Store only approved nonprivate scenario/UI state in URLs or local browser storage.
- Do not store PII, credit reports, exact private credit data, income, assets, debts, documents, tokens, or underwriting outcomes.

States required:
- Populated initial results.
- Applying filters/loading.
- Updated results.
- No matching offers.
- Fixture unavailable/malformed.
- Invalid URL/cache fallback.
- Expanded/collapsed result and all three tabs.
- Show-more exhausted.
- Prequal handoff and restored return state.
- Contributor directory/profile, missing optional portrait, and defensive missing-author fallback.
- Article/chart source unavailable without invented replacement data.

Analytics hooks:
Add existing-pattern hooks for scenario updates, mortgage-type changes, result-type changes, sorting, reset, offer expansion, tab views, payment assumption changes, show more, provider Next, prequal handoff, contributor directory/profile views, article opens, related links, and contextual CTAs. Do not connect a vendor or emit PII/private financial values.

Compliance and risk flags:
- Avoid guaranteed approval, savings, eligibility, best-rate, rate-lock, or commitment claims.
- Clearly distinguish sample offers and estimates from personalized offers.
- Do not imply fixture companies/LOs are licensed subscribers.
- Rates, APRs, payments, points, fees, availability, and terms may change and require borrower/property/lender review.
- Prequalification is a handoff only.
- Reviews are read-only and source-attributed.
- Contributors have no fabricated credentials or licenses.
- Flag final marketplace disclosure, NMLS presentation, mortgage claims, and future integration behavior for human review; do not invent legal conclusions.

Acceptance criteria:
Use all acceptance criteria in `docs/superpowers/specs/2026-07-12-rates-marketplace-editorial-production-content-design.md` as the required compliance matrix. Do not mark the build complete until each item has implementation proof and verification proof.

Files likely involved:
- `site/app.js`
- `site/styles.css`
- `site/index.html`
- new focused `.mjs` feature modules and tests beneath `site/`
- `mock-data/production-seed.json`
- a new marketplace fixture JSON beneath `mock-data/`
- location-news source/generator/index files beneath `mock-data/`
- generated crawlable pages beneath `site/generated/`
- `site/sitemap.xml`
- contributor portrait assets beneath `site/assets/`
- existing static smoke and public-copy tests

Execution requirements:
- Follow the approved Superpowers implementation guide.
- Use a plan-compliance matrix.
- Decompose work into disjoint data/content/frontend/test/review ownership boundaries.
- Preserve all unrelated tracked and untracked user work.
- Use authoritative internet research for unstable financial and market facts and keep a source ledger.
- Use the Copywriting skill for all public copy and the Economist skill for chart/data communication.
- Validate every integration point before merging workstreams.
- Run independent review after implementation.

Tests to run:
- Syntax and JSON validation.
- Unit and contract tests for scenario precedence, purchase/refinance state, down-payment synchronization, all filters/sorts, pagination, payment math, cache recovery, provider union, contributor assignment, and content completeness.
- Existing `node --test site\\*.test.mjs` suite plus new focused tests.
- `node site\\phase2-static-smoke.mjs`.
- Expanded rendered public-copy guard.
- Broken-link, sitemap, metadata, canonical, heading, attribution, source/date, and duplicate-template checks.
- Browser QA on desktop and mobile for rates, handoff, contributor directory/profiles, Learning Center, representative articles/location news, LO, and branch pages.
- Keyboard, focus, touch, modal, chart-tooltip, Back-state, console, network, and overflow checks.

Deployment gate:
Do not deploy or claim completion until tests, browser QA, source/content checks, plan-compliance review, and independent code review pass. Once approved, deploy through the existing ThinkWhale Vercel project without changing team/project ownership.

Output expected:
- Summarize changed files by workstream.
- List validation performed and exact results.
- Identify the marketplace fixture and future integration adapter boundary.
- Note everything that remains simulated or external.
- List any residual source, compliance, content, or browser risks.
- Confirm the homepage hero and unrelated dirty-tree work were left untouched.
```

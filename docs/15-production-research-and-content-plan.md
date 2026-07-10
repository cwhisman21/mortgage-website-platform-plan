# Production Research And Content Plan

Date: 2026-07-09

Status: Production planning draft

Skill lenses applied: economist, researcher, copywriting, mortgage-copywriter

## Executive Answer

The information needed to build the pages out fully does exist, but the production site should not treat the internet as a pile of text to copy from. It should treat public and internal sources as a governed data and claims layer.

The next version of the site should move from "wireframe content" to a source-backed mortgage intelligence system:

- Public data powers market, economy, loan-limit, macro-rate, and educational context.
- Internal lender data powers actual rate/APR offers, loan officer placement, branch information, lead routing, reviews, and compliance-approved claims.
- Every market claim, chart, table, product explanation, rate example, payment example, and local statement carries source metadata, freshness, and review status.
- Competitor pages such as Bankrate, NerdWallet, Redfin, Rocket, loanDepot, Movement, New American Funding, and Novus should remain structure and UX references, not data sources to scrape.

## Research Questions

1. What page blocks can be filled with public, reliable internet data?
2. What blocks require internal lender, CMS, CRM, pricing, licensing, or compliance data?
3. What charts should exist on each page family, and what claims can those charts safely support?
4. What copy can be written as borrower-facing production copy without overpromising rates, approval, savings, or eligibility?
5. What source and review fields must exist before phase 2 moves from prototype to production build?

## Source Standard

Every page block that uses factual claims should store:

- `source_name`
- `source_url`
- `source_type`: official, public dataset, proprietary dataset, internal lender system, editorial, user-generated, partner/vendor
- `metric_definition`
- `geography`
- `date_range`
- `release_date`
- `accessed_at`
- `refresh_cadence`
- `transformation`
- `claim_supported`
- `claim_not_supported`
- `compliance_review_status`
- `last_human_reviewed_at`

No public page should show "demo", "prototype", "placeholder", "fictional", "this page should", "example block", "source date placeholder", or similar internal language.

## Public Source Map

| Source | What it can power | Refresh | Confidence | Production notes |
| --- | --- | --- | --- | --- |
| Freddie Mac Primary Mortgage Market Survey | National benchmark mortgage-rate context, rate trend chart, rate commentary, rates page market context | Weekly | High | Use as benchmark context, not personalized lender pricing. PMMS is based on loan application data submitted to Freddie Mac through Loan Product Advisor. |
| Internal rate/pricing engine | Actual Snap rate tables, APRs, points, fees, locks, scenario pricing, personalized quote CTAs | Real time or daily | Required internal source | Public data cannot replace this. Any advertised rate/APR/payment needs assumptions and compliance review. |
| FRED API | 10-year Treasury, Fed funds, inflation, recession/macro context, spread analysis | Daily/monthly/quarterly depending on series | High | Use for macro context and charts. Avoid implying simple causality between Fed actions and mortgage rates. |
| FHFA House Price Index | State, metro, county, ZIP, and tract home price index trends | Monthly/quarterly | High | Official HPI is an index, not a median sale price. Strong for trend charts and relative appreciation. |
| Redfin Data Center | Market inventory, sale price, days on market, listings, buyer/seller balance, market tracker modules | Weekly/monthly | Medium to high, subject to license | Strong fit for Redfin-style state/city pages if terms and attribution are approved. |
| Zillow Research Data | ZHVI, inventory, days to pending, market heat, affordability, rent and home value signals | Monthly/weekly depending metric | Medium to high, subject to license | Good borrower-facing market data if terms and attribution are approved. Methodology needs visible source notes. |
| Census API / ACS | Median household income, population, tenure, household counts, commute, owner/renter mix, local affordability denominators | Annual | High | Best for stable city/state context. Use ACS 5-year estimates for smaller geographies. |
| BLS Public Data API | Local unemployment, employment, wage/labor market context, state/metro economy blocks | Monthly/quarterly | High | Useful for "local economy" modules. Label series and seasonal adjustment. |
| CFPB HMDA data | Mortgage application/origination volume, product mix, lender activity, market lending context | Annual | High with privacy caveats | Use only aggregate/public forms. Do not use to steer, target, or imply protected-class suitability. |
| FHFA conforming loan limits | Conventional/jumbo threshold tables by county; jumbo context on city/state/product pages | Annual | High | 2026 county files are available from FHFA. Needed for conventional and jumbo pages. |
| HUD FHA mortgage limits | FHA county loan-limit tables and FHA product modules | Annual | High | Use HUD's FHA Mortgage Limits lookup/download data. Needed for state/city FHA sections. |
| VA Home Loans | VA loan-limit and entitlement explanations | As updated | High | VA says no county loan limits for borrowers with full VA home loan entitlement, but county limits still matter for some borrowers with used/unrestored entitlement. |
| USDA Rural Development | USDA eligibility, rural property/income context, guaranteed loan program explanation | As updated | High | Useful if USDA becomes a product path. Eligibility requires official USDA tools and lender review. |
| State/county tax sources | Property tax context, escrow assumptions, county links | Varies | High but fragmented | Needs state/county-specific source mapping. Do not imply exact tax bill without property-level data. |
| State insurance departments, FEMA/NOAA, approved vendors | Insurance and hazard context | Varies | Medium to high | Use carefully. Insurance premiums require vendor or user-specific quotes, not broad promises. |

## Data That Public Sources Cannot Safely Replace

These items must come from internal or approved partner systems:

- Current Snap mortgage rates, APRs, discount points, fees, and lock-period options.
- Personalized rate/payment scenarios.
- Loan officer licenses, NMLS IDs, states served, specialties, availability, routing rules, and contact preferences.
- Branch NMLS IDs, managers, roster, addresses, phone numbers, hours, reviews, and service areas.
- Testimonials, reviews, production stats, speed claims, "top LO" claims, and awards.
- Lead routing rules and consent records.
- Compliance-approved disclosures by state, product, and page type.
- Actual insurance quotes, property-specific taxes, HOA dues, and closing-cost estimates.

## Page Family Research Plan

### Home Page

Production role: lead-in hub, not a market dashboard.

Blocks to keep:

- Hero with mortgage intelligence positioning and primary "get matched" action.
- Veterans United-style lead-in card grid that routes to rates, locations, loan options, calculators, first-time buyer guidance, refinance, VA/FHA, and local experts.
- Light proof/trust strip using compliance-approved company facts only.
- Learning and local market entry points.

Data required:

- Product taxonomy from CMS.
- Featured route inventory.
- Approved proof points from internal systems.

Copy direction:

- Speak to borrower intent: "Compare loan options", "Estimate a payment", "Explore local markets", "Talk with a licensed loan officer".
- Do not show local market statistics on the home page except as teaser links into location pages.

### Rates Page

Production role: Bankrate/NerdWallet-style rate intelligence page.

Required blocks:

- Current rate snapshot with product tabs.
- Scenario filters: purchase/refinance, state, credit score band, down payment, loan amount, property type, occupancy.
- Rate/APR table powered by internal pricing or approved rate feed.
- Freddie Mac PMMS benchmark context.
- FRED macro-rate context such as 10-year Treasury and spread commentary.
- Rate trend chart.
- Payment example module with principal and interest, taxes/insurance assumptions, APR, loan amount, down payment, and date.
- Local rate links to state pages.
- Rate methodology, assumptions, and disclosures.
- Related calculators and learning articles.

Chart catalog:

- `mortgage.rate_snapshot_table`
- `mortgage.rate_trend_line`
- `mortgage.apr_vs_rate_comparison`
- `macro.ten_year_treasury_spread_line`
- `payment.scenario_comparison_table`

Copy rules:

- Use "estimated", "sample", "may", and "options" unless the rate is a firm lender offer.
- APR must be at least as prominent as the interest rate where required.
- Payment examples need close-proximity assumptions and tax/insurance inclusion notes.

### Locations Overview

Production role: searchable doorway into state and city mortgage intelligence.

Required blocks:

- Search by city, state, or ZIP.
- State cards with available cities, branches, loan officers, and market freshness.
- Compare markets table.
- Featured local market updates.
- Links to rates, calculators, and loan officer directory.

Data required:

- CMS state/city entities.
- Branch and loan officer relationships.
- Source freshness by geography.

### State Pages

Production role: statewide mortgage and housing intelligence hub.

Required blocks:

- State hero with primary borrower action.
- State snapshot: benchmark home-value trend, statewide income context, rates context, conforming/FHA county-limit notes.
- Major city comparison table.
- State HPI chart from FHFA.
- Inventory and market momentum chart from Redfin or Zillow if approved.
- Local economy module from BLS/Census/FRED.
- Property tax and insurance overview with state/county source links.
- Embedded local product sections: FHA, VA, jumbo, refinance, first-time buyer, not standalone localized product pages.
- Branch and loan officer placement.
- State articles and market updates.
- FAQ and disclosures.

Chart catalog:

- `housing.hpi_indexed_line`
- `housing.city_comparison_dot_rank`
- `housing.inventory_days_market_line`
- `economy.local_labor_snapshot`
- `loan_limits.county_threshold_table`

Supported claims:

- "Home values have moved faster/slower than..." when based on HPI or approved index.
- "This county is above/below the baseline conforming limit" when based on FHFA data.

Unsupported claims:

- "This is the best market to buy in."
- "You will qualify for FHA/VA/conventional."
- "This state has the lowest rates" without actual lender pricing and methodology.

### City Pages

Production role: narrow-column, Redfin-style local mortgage market page with richer mortgage routing.

Required blocks:

- City hero with market date, primary CTA, and local expert CTA.
- Market snapshot cards.
- Home value/price trend chart.
- Inventory and days-on-market chart.
- Payment scenario table using current rate assumptions and local home price inputs.
- Property tax, insurance, HOA, and escrow considerations.
- Nearby city comparison.
- Local product sections for FHA, VA, jumbo, refinance, and conventional as relevant.
- Local branch and loan officer modules.
- Local articles/news.
- FAQ with sourced answers.
- Source and methodology panel.

Chart catalog:

- `housing.city_price_trend`
- `housing.inventory_dom_trend`
- `payment.local_affordability_scenarios`
- `housing.nearby_city_comparison`
- `loan.product_fit_thresholds`

Copy direction:

- The page should read like a local mortgage analyst wrote it for a borrower, not like a generic city SEO page.
- Example tone: "Austin buyers are comparing payment pressure, inventory, and loan-limit fit before they choose a path. Use this page to see the local signals, then run a payment scenario with a licensed loan officer."

### Canonical Product Pages

Production role: national product explainers with routes into local pages and experts.

Required blocks:

- Product hero.
- Who it may fit.
- Requirements and documents.
- Benefits and tradeoffs.
- Product rules from official sources.
- Payment or cost example with assumptions.
- Loan-limit or eligibility table where relevant.
- Related city/state product modules.
- Specialist loan officers.
- Calculators and article feed.
- Methodology and disclosures.

Product source map:

- FHA: HUD FHA loan limits and HUD/FHA borrower-facing guidance.
- VA: VA Home Loans eligibility, entitlement, funding fee, and loan-limit guidance.
- Conventional/jumbo: FHFA conforming loan limits plus agency/lender product rules.
- Refinance/cash-out: lender/investor rules, CFPB education, internal pricing, and product-specific disclosures.
- HELOC/home equity: internal product availability plus Regulation Z open-end advertising guardrails.

Copy rules:

- Never imply approval, guaranteed savings, or universal eligibility.
- Explain tradeoffs: refinance may reduce monthly payment while increasing total interest or changing term; low down payment can mean mortgage insurance or funding fees.

### Location Product Sections

Production role: embedded local product intelligence on state/city pages.

Required blocks:

- Local product summary.
- Local loan-limit or eligibility context.
- Local payment example.
- Specialist loan officers licensed for that geography.
- Related product guide.
- FAQ.

Non-goal:

- Do not create standalone `fha-loans-in-austin` style pages for phase 1. Use anchors/sections on city and state pages.

### Loan Officer Pages

Production role: conversion-ready licensed profile with real trust signals.

Required blocks:

- Hero with headshot, NMLS ID, licensed states, branch relationship, phone/contact actions.
- Specialties, languages, product experience, markets served.
- Reviews/testimonials only if approved and sourceable.
- "How working together works" process section.
- Product paths this LO can discuss.
- Related markets and branch.
- Recent education/articles if authored or reviewed.
- Contact form with consent language and routing.
- Licensing/disclosure footer.

Data required:

- NMLS/internal licensing source.
- CRM/LOS/branch roster.
- Approved biography fields.
- Reviews/testimonials with permission and moderation.

Copy direction:

- Human, specific, and service-oriented.
- Avoid unsupported production claims such as "closes fastest", "best rates", or "guaranteed approval".

### Branch Pages

Production role: Novus-style local office hub.

Required blocks:

- Branch hero with name, address, phone, NMLS/branch licensing, map, and office hours.
- Branch manager card.
- Loan officer roster with NMLS IDs.
- Local service-area copy.
- Products served.
- Calculator/payment entry.
- Local market links.
- Reviews or proof only if approved.
- FAQ and contact form.

Data required:

- Branch CMS entity.
- LO roster relationship.
- Licensing and compliance disclosures.
- Location geometry and service-area rules.

### Learning Center, Topic Hubs, And Articles

Production role: editorial trust layer that supports SEO and borrower education.

Required blocks:

- Learning home with topic taxonomy, featured guides, local market updates, product education, and calculator entry points.
- Topic hubs for buying, refinance, FHA, VA, jumbo, home equity, taxes/insurance, market updates.
- Article template with author, reviewer, update date, source list, related calculators, related locations, and related loan officers.
- Market update article templates that can later be generated from research briefs, but must be human-reviewed before publishing.

Editorial source rules:

- Use official sources for program rules and legal/regulatory statements.
- Use public datasets for market statements.
- Use editorial sources only for interpretation and trend framing.
- Every article needs "last updated" and "reviewed by" metadata.

Copy direction:

- Borrower-facing, plain-language, specific.
- Avoid filler intros. Start with the decision the borrower is trying to make.

### Calculators

Production role: useful tools that preserve context and route to the next step.

Required blocks:

- Inputs with realistic defaults.
- Results with full assumption table.
- Taxes, insurance, PMI/MIP/funding-fee handling where relevant.
- Local market context if launched from a city/state page.
- Related products and loan officers.
- Save/share scenario.

Compliance rules:

- Calculators must not imply approval, rate lock, or final cost.
- Payment outputs must disclose assumptions and whether taxes/insurance are included.
- Refinance calculators must show tradeoffs such as closing costs, break-even, total interest, and term changes.

## Reusable Chart Library Requirements

Every chart component should define:

- `chart_id`
- Question answered
- Valid claims
- Invalid claims
- Data contract
- Source metadata fields
- Unit and frequency
- Default view
- Responsive behavior
- Empty/stale/error states
- Accessibility and data-table fallback
- Compliance caveats

Initial chart families:

| Chart ID | Used on | Question |
| --- | --- | --- |
| `mortgage.rate_trend_line` | Rates, articles | How have benchmark mortgage rates moved over time? |
| `mortgage.apr_rate_table` | Rates | What rate/APR examples are available for the selected scenario? |
| `housing.hpi_indexed_line` | State, city | How has a home price index changed over time? |
| `housing.inventory_dom_trend` | State, city | Is the local market loosening or tightening? |
| `payment.local_scenario_table` | City, product, calculator | How do price, down payment, rate, tax, and insurance assumptions affect payment? |
| `loan_limits.county_threshold_table` | State, city, FHA, jumbo | Which loan-limit thresholds matter locally? |
| `economy.local_snapshot` | State, city, articles | What local economic context may matter to borrowers? |
| `market.city_comparison_rank` | State, locations | How do nearby markets compare on price, affordability, and inventory? |

## Copy System

The production copy should follow this hierarchy:

1. Decision-first headline.
2. Concrete borrower value.
3. Data-backed context.
4. Clear next step.
5. Disclosure or caveat where needed.

Example production block copy:

### City Market Intro

Austin buyers are weighing price movement, inventory, taxes, insurance, and loan-limit fit before choosing a mortgage path. Review the local signals, compare payment scenarios, and connect with a licensed loan officer who serves Austin when you are ready to talk through options.

### Rates Intro

Mortgage rates change with market conditions and borrower details. Use this page to compare current rate context, review sample scenarios, and understand how APR, points, down payment, property type, and loan amount can affect the offer a borrower may receive.

### FHA Local Section

FHA loans may help borrowers compare a lower down payment path with mortgage insurance and county loan-limit rules. Review the local FHA limit, estimate a payment, and talk with a licensed loan officer before assuming a product fits your situation.

## Compliance Gates

Before any page or block ships:

- Rate, APR, payment, fee, down payment, finance charge, and term claims are screened under Regulation Z advertising rules.
- Mortgage advertising claims are screened under Regulation N / MAP rules for misrepresentation risk.
- Product and eligibility language is screened for approval, government-affiliation, "no cost", "free", "fixed", and savings claims.
- Targeting, imagery, examples, and copy are screened for ECOA/Regulation B and fair-lending discouragement risk.
- NMLS IDs, licensing, Equal Housing language, and state disclosures are present where required.
- All charts and tables have source metadata and date labels.
- All AI-generated or automated editorial content is human-reviewed before publication.

## CMS And Data Model Additions

Add these first-class objects before production build:

- `data_sources`
- `source_releases`
- `metric_definitions`
- `metric_observations`
- `rate_snapshots`
- `rate_scenarios`
- `chart_configs`
- `chart_annotations`
- `methodology_notes`
- `content_claims`
- `source_citations`
- `compliance_reviews`
- `page_publication_status`
- `editorial_briefs`
- `article_review_events`

## Research Ledger

| Claim / decision | Evidence | Confidence | Implementation impact |
| --- | --- | --- | --- |
| Public internet data can support rich state/city dashboards. | FHFA HPI, Census ACS, BLS API, FRED, Redfin Data Center, Zillow Research data. | High | Build source-backed location pages, not generic local SEO pages. |
| Actual rates/APRs require internal or approved lender pricing data. | Regulation Z advertising requirements and rate-advertising risk. | High | Rates page must not rely on scraped competitor rates. |
| FHA, VA, USDA, conforming, and jumbo content can be official-source-backed. | HUD, VA, USDA, FHFA official pages. | High | Product pages can become strong guides once official rules and local limits are wired in. |
| Loan officer and branch pages require internal source data. | Licensing, NMLS, reviews, roster, and claims cannot be reliably sourced from public web. | High | Mock LO/branch data must be replaced or clearly kept in prototype only. |
| Local product pages should be embedded sections, not standalone pages. | Prior product decision and SEO/content architecture. | High | Keep anchor modules on state/city pages. |
| Some city-level inventory/DOM data may require commercial terms review. | Redfin and Zillow provide public downloadable datasets but usage/attribution must be reviewed. | Medium | Legal/compliance should approve data source terms before production ingestion. |

## Phase 2 Build Recommendation

Phase 2 should not start by polishing the current static prototype. It should start by replacing the prototype's content engine:

1. Build the source registry and metric definitions.
2. Convert mock-data entities into source-aware fixtures.
3. Replace all visible instructional/demo copy with production borrower copy.
4. Build reusable chart blocks with source/date/methodology panels.
5. Wire state/city/product/rates pages to the same chart and source contracts.
6. Add compliance review fields before publishing controls.
7. Only then move the design into higher-fidelity production UI.

## Immediate Next Prototype Rebuild Tasks

1. Remove all internal/prototype language from `site/app.js` and `mock-data/prototype-seed.json`.
2. Add a source metadata object for every rates, market, loan-limit, article, and calculator block.
3. Replace generic metrics with public-source-shaped fixtures for the 4 states and 12 cities.
4. Add visible source/date/methodology rows to rates, state, city, product, calculator, and article pages.
5. Add a real rates page structure: filters, rate/APR table, benchmark chart, methodology, disclosures, and calculators.
6. Add state/city chart modules for HPI, inventory/DOM, payment scenarios, local economy, and loan limits.
7. Keep the home page as a routing surface with lead-in cards only.
8. Keep location product content embedded on city/state pages.

## Primary Sources Researched

- Freddie Mac PMMS: https://www.freddiemac.com/pmms
- FHFA House Price Index: https://www.fhfa.gov/data/hpi
- FHFA Conforming Loan Limits: https://www.fhfa.gov/data/conforming-loan-limit
- FRED API: https://fred.stlouisfed.org/docs/api/fred/
- Census API: https://www.census.gov/data/developers.html
- BLS Public Data API: https://www.bls.gov/developers/
- CFPB HMDA: https://www.consumerfinance.gov/data-research/hmda/
- HUD FHA Mortgage Limits: https://entp.hud.gov/idapp/html/hicostlook.cfm
- VA Home Loans loan limits: https://www.benefits.va.gov/HOMELOANS/purchaseco_loan_limits.asp
- USDA Single Family Housing Guaranteed Loan Program: https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-guaranteed-loan-program
- Regulation Z advertising, 12 CFR 1026.24: https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-C/section-1026.24
- Regulation N / MAP, 12 CFR Part 1014: https://www.ecfr.gov/current/title-12/chapter-X/part-1014
- ECOA / Regulation B, 12 CFR Part 1002: https://www.ecfr.gov/current/title-12/chapter-X/part-1002

## Public Product And Market Data Sources To Review For Licensing

- Redfin Data Center: https://www.redfin.com/news/data-center/
- Zillow Research Data: https://www.zillow.com/research/data/

# Snap Mortgage Public Site Evidence Audit

**Story ID:** `snap-public-site-production-content-2026-07-13`  
**Audit owner:** Report and research  
**Review date:** 2026-07-13  
**Source standard:** Current primary official sources only for material volatile, program, regulatory, and local-government claims  
**Scope:** Borrower-visible public pages, supporting manifests, source ledgers, fixtures, generators, and static output  
**Release verdict:** **NOT READY FOR PUBLICATION**  
**Code changes made by this audit:** None

## Executive Verdict

The repository has a useful evidence architecture in its generated location-news records, but the current public build cannot be released as factual mortgage content. Several market charts and location snapshots are deterministic planning illustrations that carry official-agency source labels and current-looking `As of` dates. Some calculator assumptions also conflict with current program rules. Loan-officer and branch records contain invented names, NMLS identifiers, licensing, specialties, languages, and service-area assertions.

The following are publication blockers:

1. Synthetic rates, home-price, inventory, days-on-market, payment, tax, insurance, and product-availability figures are presented with official-source attribution.
2. The plotted Freddie Mac rate series conflicts with the official PMMS archive and uses non-release dates.
3. The chart source registry cites a nonexistent `2025 ACS release`; the latest ACS 5-year release available on the review date is the 2020-2024 release published January 29, 2026.
4. The VA refinance preset applies a 2.15% funding fee to an `IRRRL style` scenario; the official IRRRL fee is 0.5%, subject to exemption.
5. FHA annual MIP is hardcoded at 0.55% even when current HUD rules call for 0.50% in the default loan amount/LTV band.
6. Calculator DTI caps, conventional PMI pricing, USDA ZIP eligibility, and product `Available` statuses are unsupported as universal rules.
7. Loan-officer and branch pages make unverified identity, NMLS, licensing, language, specialty, and coverage claims.
8. Most factual static pages omit required `Last updated`, figure-level `As of`, source, period, geography, and limitation displays.

No factual market number, eligibility result, professional profile, product availability result, or calculator output should ship until its blocker below is resolved.

## Research Scope

The audit reviewed the production story packet, repository source ledgers/manifests, public entity seed, product and marketplace fixtures, chart and location generators, dynamic page renderer, static page renderer, representative generated routes, and representative location-news records. Public page types inspected were:

| Public page type | Representative evidence inspected | Systemic evidence finding |
| --- | --- | --- |
| Home/conversion | Root `index.html`; home renderer and shared CTA/config code | Root still identifies a prototype; homepage hero remains a separately paused boundary. Conversion claims must not inherit synthetic rate or savings proof. |
| Rates | Rates renderer, generated rates route, marketplace fixtures, chart fixtures | The current headline PMMS values are supported; the plotted trend is not. Marketplace offers are illustrative and must remain visibly separate from benchmarks. |
| Products | Product seed/copy, dynamic/static product templates | Qualitative education is generally usable, but product availability, limits, fees, minimums, and fit claims require program-specific evidence and dates. |
| State/city/location | 51 state routes, 737 city routes, location generator, location-news manifest and Austin bundle | Location-news evidence records are strong; dashboard snapshots are synthetic and cannot be presented as observed local facts. |
| Calculators | Five calculator presets, program modules, result formulas, static calculator pages | Several program assumptions are wrong or universalized; rendered pages do not expose a complete formula/assumption/exclusion record. |
| Directories | Locations, products, calculators, loan-officers, and branches indexes | Counts and route relationships are seed-derived. Professional and coverage counts cannot be presented as real until the connected source is authoritative. |
| Loan officer/branch | Six branches, 16 loan officers, dynamic/static templates | Identity, NMLS, licenses, specialties, languages, and service areas are fixtures and are publication blockers. |
| Articles/topic hubs/contributors | Editorial source ledger, 24 articles, 15 topic hubs, six contributors, generated Learning Center routes | Article evidence is materially stronger than page-template evidence, but the canonical source ledger lacks the required claim metadata. Topic hubs need explicit dates and source inheritance rules. |
| Prequal/account/watchlist/CTAs | CTA inventory, prequal route, modal and handoff copy | These may remain simulated interfaces only. They cannot imply an application, decision, saved record, comparison review, provider handoff, or account persistence occurred. |
| Empty/loading/error/shared chrome | Shared app shell and static output | Nonfactual utility copy is lower risk, but terms such as `latest`, `licensed`, `available`, and `reviewed` require evidence or narrower wording. |

### Static Output Coverage

The generated static route scan found the following evidence-label coverage on 871 crawlable documents:

| Route group | Pages | Pages with `Last updated` | Pages with `As of` | Pages with a visible source marker |
| --- | ---: | ---: | ---: | ---: |
| Branches | 7 | 0 | 0 | 0 |
| Buy | 1 | 0 | 0 | 0 |
| Calculators | 6 | 0 | 0 | 0 |
| Home equity | 1 | 0 | 0 | 0 |
| Learning Center | 41 | 1 | 24 | 24 |
| Loan officers | 17 | 0 | 0 | 0 |
| Loan options | 6 | 0 | 0 | 0 |
| Locations | 789 | 51 | 0 | 0 |
| Prequal | 1 | 0 | 0 | 0 |
| Rates | 1 | 0 | 0 | 0 |
| Refinance | 1 | 0 | 0 | 0 |

The scan is a rendering audit, not proof that a displayed source supports each claim. A page-level source label cannot substitute for claim-level period, geography, variable/series, and limitation metadata.

## Canonical Evidence Record

All sources below were reviewed on **2026-07-13**. A source is approved only for the use and period stated here; it is not blanket approval for nearby figures, derived scenarios, or borrower-specific conclusions.

| ID | Primary official source | Period or effective date | Approved use | Limitation |
| --- | --- | --- | --- | --- |
| E-001 | [Freddie Mac PMMS archive](https://www.freddiemac.com/pmms/archive) | Weekly releases through July 9, 2026 | National weekly average 30- and 15-year fixed benchmark history | National survey averages are not Snap offers, APRs, personalized rates, or local quotes. Use the exact Freddie release date. |
| E-002 | [Freddie Mac PMMS](https://www.freddiemac.com/pmms) | Current methodology as reviewed | Benchmark definition and methodology | Do not infer borrower eligibility, points, APR, fees, or payment from PMMS alone. |
| E-003 | [FHFA 2026 conforming loan-limit release](https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026) | Calendar year 2026; announced November 25, 2025 | $832,750 one-unit baseline and $1,249,125 one-unit high-cost ceiling; county files control local values | Alaska, Hawaii, Guam, and U.S. Virgin Islands have special limits. Every local display must join by the official county/county-equivalent identifier. |
| E-004 | [HUD Mortgagee Letter 2025-23](https://www.hud.gov/sites/dfiles/hudclips/documents/2025-23hsgml.pdf) | Case numbers assigned January 1-December 31, 2026 | FHA one-unit national floor $541,287 and ceiling $1,249,125; official county/MSA file controls local values | National floor/ceiling is not a county limit. Ten jurisdictions decreased due to MSA changes. |
| E-005 | [FHFA HPI 2026 Q1](https://www.fhfa.gov/reports/house-price-index/2026/Q1) | 2026 Q1; published May 26, 2026 | U.S. HPI +1.7% year over year and +0.5% quarter over quarter; official attachment for state/MSA series | Repeat-sales index, not a median sale price, listing inventory, city valuation, forecast, or property appraisal. |
| E-006 | [FHFA monthly HPI, June 2026 release](https://www.fhfa.gov/reports/house-price-index/2026/6) | Data through April 2026; published June 30, 2026 | U.S. monthly -0.1% and year-over-year +2.0%; official tables for covered geographies | Recent observations are revised. Label seasonal adjustment, geography, series, and observation month. |
| E-007 | [Census 2020-2024 ACS 5-year release](https://www.census.gov/programs-surveys/acs/news/updates/2026.html) | Survey years 2020-2024; released January 29, 2026 | ACS 2024 5-year table estimates for supported Census geographies | A 5-year estimate is not a January 2026 point-in-time market observation. Use table/variable, geography ID, estimate, and MOE. |
| E-008 | [Census ACS 2024 accuracy documentation](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf) | 2020-2024 ACS 5-year | Sampling-error, MOE, and comparison method | ACS MOEs use 90% confidence. Apparent differences may not be statistically meaningful. |
| E-009 | [BLS Local Area Unemployment Statistics](https://www.bls.gov/lau/) | May 2026 was current on review date; state release June 23 and metro release July 1 | State/local labor-force and unemployment observations from the exact series | May state values were preliminary; seasonal adjustment and geography must be explicit. June releases were scheduled after the audit date. |
| E-010 | [HUD FHA MIP structure](https://answers.hud.gov/FHA/s/article/What-is-the-FHA-Mortgage-Insurance-Premium-structure-for-forward-mortgage-loans) and [Mortgagee Letter 2023-05](https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf) | Case numbers endorsed on/after March 20, 2023; current as reviewed | UFMIP 1.75% for most forward purchase/refinance loans; annual MIP schedule by term, base amount, and LTV | Annual MIP is not universally 0.55%. Exceptions and older endorsed loans have different treatment. |
| E-011 | [HUD FHA Handbook 4000.1](https://www.hud.gov/program_offices/housing/sfh/handbook_4000-1) | Current handbook and incorporated updates as reviewed | FHA maximum financing, credit-score/LTV relationships, and program definitions | A 580 score does not guarantee approval; lender overlays and complete underwriting still apply. |
| E-012 | [VA funding-fee and closing-cost page](https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/) | Rates effective April 7, 2023; page updated January 15, 2026 | First-use purchase below 5% down 2.15%; subsequent use 3.3%; IRRRL 0.5%; no monthly mortgage insurance | Fee depends on transaction/use/down payment and can be exempt or refundable. Lenders, not VA, set rate and most closing costs. |
| E-013 | [Fannie Mae Selling Guide: DTI ratios](https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios) | Guide published June 3, 2026 | 36% manually underwritten baseline; up to 45% with applicable requirements; DU maximum 50%, with transaction exceptions | Not a universal borrower affordability target or approval threshold. Government loans follow their agency rules. |
| E-014 | [USDA SFH Guaranteed loan-origination library](https://www.rd.usda.gov/resources/usda-linc-training-resource-library/loan-origination), [current fee training](https://www.rd.usda.gov/files/RD-SFH-LNGandIndemnificationNotes.pdf), and [USDA eligibility tools](https://eligibility.sc.egov.usda.gov/eligibility/) | Current resources as reviewed; fee material states 1.00% upfront and 0.35% annual | USDA fee mechanics and the required property/income eligibility path | Eligibility cannot be inferred from a small ZIP allowlist. Recheck the active fee authority at every release because fees are subject to change. |
| E-015 | [CFPB Loan Estimate explainer](https://www.consumerfinance.gov/owning-a-home/loan-estimate/) | Page current as reviewed | Definitions and comparison context for rate, APR, points, origination charges, payment, cash to close, and Loan Estimates | An illustrative result is not a Loan Estimate. Do not use CFPB attribution for numbers the CFPB did not publish. |
| E-016 | [CFPB compare Loan Estimates](https://www.consumerfinance.gov/owning-a-home/compare/compare-loan-estimates/) | Page modified December 12, 2024; current as reviewed | Apples-to-apples comparison of rate, total payment, upfront lender costs, credits, cash to close, and five-year cost | Taxes and insurance are not lender-controlled. Comparisons must use matching loan assumptions and dates. |
| E-017 | [Texas Comptroller property-tax exemptions](https://comptroller.texas.gov/taxes/property-tax/exemptions/) | Current on review date | $140,000 mandatory school-district residence-homestead exemption and local-administration context | Qualification and local-option exemptions vary. An older derivative PDF still showing $100,000 is stale and must not control. |
| E-018 | [California BOE supplemental assessments](https://www.boe.ca.gov/proptaxes/supplemental-assessment/) | Current on review date | Supplemental bills after ownership change/new construction; bills are additional to annual bills and sent to owners | County assessor/auditor data controls an actual property. Examples on the page are illustrative. |
| E-019 | [California DOI residential insurance](https://www.insurance.ca.gov/01-consumers/105-type/5-residential/) | Current on review date | General homeowners-insurance and FAIR Plan consumer context | No property-specific availability, premium, or coverage conclusion may be inferred. |
| E-020 | [Colorado Division of Property Taxation](https://cdola.colorado.gov/property-taxation) and [Colorado DOI homeowners insurance](https://doi.colorado.gov/types-of-insurance/homeowners/renters-insurance) | Current on review date | General state tax-administration and insurance education | Current county assessment, mill levy, premium, and availability require local/current records. |
| E-021 | [Florida DFS hurricane-deductible guidance](https://www.myfloridacfo.com/division/consumers/consumerprotections/floridashurricanedeductible) and [Florida OIR residential policy data](https://floir.gov/tools-and-data) | Current on review date | Hurricane-deductible explanation and regulator-published market-data context | OIR states that insurer-submitted data are not audited. Policy, county, ZIP, peril, and reporting period must be retained. |

## Claim And Exception Ledger

| Claim ID | Repository claim or behavior | Status | Evidence result and exact constraint |
| --- | --- | --- | --- |
| C-001 | July 9, 2026 benchmark: 30-year 6.49%; 15-year 5.82% | **Verified** | E-001 matches both values. Display as national Freddie Mac weekly averages `As of July 9, 2026`, never as Snap offers or APRs. |
| C-002 | Rate trend points: May 15 6.53%, May 29 6.65%, June 12 6.72%, June 26 6.78%, July 10 6.89% | **Conflicting / block** | E-001 reports May 14 6.36%, May 28 6.53%, June 11 6.52%, June 25 6.49%, July 2 6.43%, and July 9 6.49%. Replace the series with exact archive releases; do not shift dates or synthesize intermediate points. |
| C-003 | Chart registry `As of: 2025 ACS release` | **Unsupported / block** | E-007 establishes that the latest ACS 5-year product is the 2020-2024 release. Replace with `2024 ACS 5-year estimates (2020-2024), released January 29, 2026`. |
| C-004 | City median price, inventory, days on market, payment, tax, insurance, and product availability generated from seeded formulas | **Unsupported / block** | These are not observed official data. Remove from factual UI or label them as user-entered hypothetical scenarios without agency source labels, `As of` dates, or local-market wording. |
| C-005 | `planning_illustration` charts cite FHFA, Census, Freddie Mac, HUD, or CFPB as their source | **Misattributed / block** | An agency source may be attached only to exact imported values or formulas the source actually publishes. Synthetic values must cite the internal scenario assumptions, not an agency. |
| C-006 | 2026 conforming baseline $832,750 and one-unit high-cost ceiling $1,249,125 | **Verified** | E-003 supports the national values. County displays must come from the official 2026 county file using county/county-equivalent identifiers. |
| C-007 | 2026 FHA one-unit floor $541,287 and ceiling $1,249,125 | **Verified with geography constraint** | E-004 supports the national boundaries. Never substitute floor/ceiling for a local county limit; preserve effective year and case-number date rule. |
| C-008 | FHA 3.5% down pathway at a minimum decision score of at least 580; 500-579 limited to 90% LTV | **Verified with underwriting qualification** | E-011 supports the relationship. Copy must say `may` and explain that complete FHA and lender review still applies. |
| C-009 | FHA UFMIP 1.75% and annual MIP fixed at 0.55% | **Partly verified / conflicting** | E-010 supports 1.75% UFMIP for most forward loans. The annual rate varies. The default $515,000 price/5% down scenario falls in the 0.50% band under the current schedule, not 0.55%. Implement the full HUD matrix. |
| C-010 | VA upfront fee 2.15%, zero monthly MI, including the default `VA streamline / IRRRL style` refinance | **Partly verified / block refinance** | E-012 supports 2.15% only for a first-use purchase below 5% down (and first-use cash-out). IRRRL is 0.5%. Add use type, down payment, and exemption inputs; no universal VA fee. |
| C-011 | USDA 1.00% upfront fee and 0.35% annual fee | **Supported with freshness gate** | E-014 currently supports these figures. Preserve program/effective authority and revalidate at release. Do not convert fee evidence into eligibility evidence. |
| C-012 | USDA eligibility determined by ZIP allowlist `37601`, `72712`, `65201` | **Unsupported / block** | Delete eligibility result logic. Route borrowers to E-014's official property and income tools or return `verification required`. |
| C-013 | Affordability caps: FHA 43%, VA 41%, USDA 39%, conventional 36% | **Unsupported as universal / block** | E-013 alone disproves universal conventional 36%. Ratios vary by underwriting method, product, borrower, transaction, and compensating factors. If retained, call them editable planning assumptions and never `maximum`, `eligible`, or `affordable`. |
| C-014 | Conventional minimum down 3% and PMI 0.46% | **Unsupported as universal / block** | Product eligibility and private MI pricing vary. A calculator may use a clearly labeled editable hypothetical PMI input; it cannot imply current eligibility or premium. |
| C-015 | Product module statuses `Available`, `Needs review`, `Check eligibility`, `Location gated` | **Unsupported / block** | Replace availability language with neutral comparison labels until the connected product/eligibility service returns an attributable result. |
| C-016 | Six named branches and 16 named loan officers with `NMLS-000101` through `NMLS-000116`, licenses, languages, specialties, and coverage | **Invented fixture / block** | Do not publish as people or offices. Replace only from the canonical Snap/NMLS integration; preserve source timestamp and licensing jurisdiction. A disclaimer cannot cure a fabricated NMLS claim. |
| C-017 | Branch pages assert office identity, service area, team roster, and local coverage | **Unsupported / block** | Require verified legal/DBA name, branch NMLS, address or approved service-area representation, contact details, active status, roster, and last verification date. |
| C-018 | Forty provider/individual marketplace offers with rate, APR, payment, NMLS, ratings, reviews, costs, and ranking | **Illustrative only** | May remain only as visibly labeled sample scenarios with the existing no-quote/no-commitment disclosure on results, details, and prequal handoff. Do not call fixtures `current`, `matched`, `available`, or `verified`. |
| C-019 | Editorial source ledger is the canonical evidence record | **Structurally incomplete** | All 74 records have a title and URL but zero records populate organization, publication/effective date, period, retrieval/review date, geography, limitation, or approval state. Enrich before it can govern publication. |
| C-020 | Location-news bundles are source-aware and official-only | **Strong architecture; review labels unproven** | The manifest covers 788 locations/3,152 articles from 25 official datasets. Representative source records preserve publisher, dataset, URL, variable, geography ID, period, release/retrieval dates, estimate, MOE, and revision note. Use this schema sitewide. `editorial_reviewed` and `compliance_approved` strings are not proof that independent review occurred. |
| C-021 | City coverage is based on all U.S. cities with at least 50,000 people | **Method unsupported / block criterion** | The route inventory uses third-party SimpleMaps data, not a Census population vintage. Rebuild or validate the inclusion list against a named Census population-estimates dataset and reference date; document Honolulu/special handling. |
| C-022 | Texas school homestead exemption is $140,000 | **Verified** | E-017 supports the amount. Remove or quarantine stale $100,000 derivative references. Explain local administration and qualification. |
| C-023 | California supplemental property-tax bills may arrive separately from the annual bill and are sent to owners | **Verified** | E-018 supports the claim. Do not estimate an actual bill without county assessment, event date, tax rate, and proration inputs. |
| C-024 | Florida insurer-submitted residential data can describe availability/market conditions | **Verified with limitation** | E-021 supports use only with county/ZIP, policy/peril, reporting period, and the regulator's `not audited` limitation. It cannot prove a quote or property insurability. |
| C-025 | State/city dashboard snapshot has a source and review date | **False in current output** | The static location pages expose synthetic snapshot fields; only 51 state pages show `Last updated`, no location page shows `As of` or a visible source marker. Do not claim provenance that is not rendered and tied to each metric. |
| C-026 | Article publication/review status proves the article is ready | **Unsupported workflow assertion** | Dates and source records are evidence metadata; status strings are workflow data. Publication still requires independent developmental, fact/copy, mortgage-usefulness, compliance, and browser QA evidence. |
| C-027 | A flat 4% closing-cost or 1.8% default can estimate cash to close | **Hypothetical only** | Keep only as an editable, prominently labeled scenario assumption. It is not a local fee estimate or Loan Estimate and must not cite CFPB as the numeric source. |
| C-028 | Rent-versus-buy output supports a borrower decision | **Incomplete model / block decision language** | Before decision framing, expose appreciation, maintenance, selling/buying transaction costs, taxes, insurance, HOA, rent growth, investment opportunity cost, tax treatment, and holding period. Otherwise label the result a partial payment comparison. |

## Exact Implementation Constraints

### Global Claim Contract

Every material factual value must resolve to a record with these non-null fields:

- `publisher`
- `datasetOrAuthority`
- `sourceUrl`
- `variableOrSeriesId` or governing section
- `periodOrEffectiveDate`
- `geographyType` and `geographyId` where applicable
- `releasedAt`
- `retrievedAt` or `reviewedAt`
- `value` and unit when numeric
- `marginOfError` or revision status when applicable
- `methodologyOrLimitation`
- `approvalState` backed by an actual independent review artifact

If any required field is unavailable, the UI must omit the claim, show `Data unavailable`, or show an explicitly hypothetical user-controlled scenario. It must not infer or backfill a value.

### Dates And Sources

- Show factual page-level `Last updated` on every factual public route.
- Show `As of [observation period/date]` beside every volatile figure, not merely in a footer.
- Keep `released`, `retrieved`, `reviewed`, and `effective` dates distinct; none may substitute for the observation period.
- A source link must open the exact official table, release, file, or rule supporting the displayed claim.
- Derived values must identify the source inputs and formula. Do not imply the agency published the derived value.

### Charts And Market Data

- Replace every `planning_illustration` series carrying official attribution with exact imported observations or relabel it as a hypothetical scenario with no agency attribution.
- Preserve series, frequency, seasonal adjustment, geography, unit, observation period, release date, and revision status.
- Hover tooltips must show value, unit, period, geography, source, and whether a value is preliminary/revised/derived.
- Never use FHFA HPI as city median price, live inventory, days on market, forecast, or property valuation.
- Never use ACS as current inventory, asking-price movement, or property valuation.
- Never use BLS values without the correct LAUS series/geography and preliminary/seasonal status.

### Rates And Marketplace

- Separate three concepts visually and semantically: national public benchmark, illustrative sample offer, and personalized/provider result.
- PMMS values must use exact release dates and the official archive series.
- Every offer comparison must preserve rate, APR, points/credits, fees, loan amount, term, loan type, lock assumption, payment components, cash to close, and comparison horizon.
- The sample marketplace may not use `best`, `matched`, `approved`, `available`, `verified`, or provider-ranking claims.
- A CTA may start a simulated prequal handoff, but it cannot state that a provider received data, reviewed a file, or made a decision.

### Locations

- Remove or quarantine all seeded `medianHomePrice`, `inventory`, `daysOnMarket`, `paymentScenario`, tax, insurance, and product-availability fields from factual dashboards.
- Use the generated location-news source-record schema as the minimum evidence model for every local metric.
- Join Census by official geography ID and show ACS estimate/MOE; join FHFA/HUD limits by official county or county-equivalent ID.
- Treat the 12 Connecticut county-equivalent mappings as explicit QA cases.
- Validate the 50,000-population route criterion against a named Census vintage before claiming national coverage.
- Each location page needs at least three genuinely local, sourced findings; generic seeded positioning does not count.

### Products And Calculators

- Encode FHA MIP as the current HUD term/base-loan/LTV matrix, including duration and relevant exceptions.
- Encode VA funding fee by transaction, first/subsequent use, down payment, and exemption; IRRRL must use 0.5% under the reviewed schedule.
- Use official USDA property/income eligibility tools; do not return an eligibility decision from ZIP alone.
- Treat DTI, PMI, closing costs, taxes, insurance, HOA, appreciation, maintenance, and transaction costs as visible editable assumptions unless an authoritative adapter supplies them.
- Do not label an output `eligible`, `available`, `approved`, `prequalified`, or `affordable`.
- Calculator pages must display formula, inputs, defaults, exclusions, rounding, result period, cash-flow components, and what licensed review changes.

### Loan Officers And Branches

- Suppress all fixture profiles from production discovery, metadata, sitemaps, structured data, and public routes.
- Publish only connected records with verified full name, current NMLS ID, applicable licensing/registration, branch relationship, jurisdictions, contact permissions, and verification timestamp.
- Specialties, languages, biography, service area, address, hours, ratings, reviews, and testimonials require their own authoritative records.
- Do not use silhouettes, disclaimers, or `confirm before relying` language to make invented identities publishable.

### Editorial, Topic Hubs, And Contributors

- Enrich the 74-record editorial ledger to the global claim contract before treating it as canonical.
- Preserve the location-news source-record fields and methodology/limitations sections.
- Topic hubs must show `Last updated` and inherit only sources tied to claims actually rendered on the hub.
- Contributor pages may describe assigned coverage topics and link to work; do not invent credentials, experience, licensing, or human identity claims.
- `As of` is for evidence periods; `Published` and `Last updated` describe the article itself.

### Simulated Account And CTA Surfaces

- Account/login, Snap Homes, watchlist, Compare Offer, contact, and prequal remain modal or route-level simulations.
- Confirmation copy may say that the next step would continue to Snap Homes or the selected experience. It may not state that an account, watchlist item, lead, review, upload, comparison, or prequalification was created.
- Core educational and SEO value must remain crawlable and must not be gated.

## Data Gaps Requiring Owners

| Data gap | Required owner/source before publication |
| --- | --- |
| Legal company identity, company NMLS, licenses, disclosures, equal-housing marks | Snap legal/compliance company packet and connected licensing source |
| Loan-officer/branch identities and service coverage | Existing Snap provider/organization system plus NMLS verification |
| Provider offer rates, APRs, points, fees, payments, reviews, rankings | Connected provider feed with scenario, timestamp, licensing, and disclosure contract |
| Local median prices, inventory, DOM, taxes, insurance, listing activity | Approved official/licensed market adapters with geography and period contracts |
| County conforming/FHA limits | Official FHFA/HUD annual files joined by county/county-equivalent ID |
| Product availability and eligibility | Connected product rules/availability service; no fixture fallback presented as factual |
| Calculator policy and math | Versioned product-rule matrix, actuarial/finance QA, and compliance-approved disclosure set |
| National 50,000-population city inventory | Census population-estimates dataset, vintage, threshold rule, and exception ledger |
| Editorial approval state | Independent review artifacts for developmental, fact/copy, mortgage usefulness, compliance, and Snap QA |

## Conflicts And Staleness To Resolve

1. Replace the synthetic PMMS trend and its shifted dates with E-001's exact releases.
2. Replace every `2025 ACS release` reference with the precise E-007 product and period.
3. Correct the VA IRRRL fee and prevent a purchase fee from leaking into refinance scenarios.
4. Replace the fixed FHA 0.55% annual MIP with E-010's complete matrix.
5. Remove fixed DTI/PMI/USDA ZIP eligibility from decision language.
6. Resolve the Texas $100,000 versus $140,000 homestead-source conflict in favor of the live official E-017 authority.
7. Replace third-party city-coverage evidence with a Census population vintage.
8. Treat generated `editorial_reviewed` and `compliance_approved` values as unverified until independent artifacts exist.

## Readiness Decision

**Current state: NOT READY FOR PUBLICATION.**

Potentially reusable after normal independent review:

- The borrower-oriented educational structure.
- The location-news claim-record pattern, methodology, and limitation language.
- The July 9, 2026 PMMS headline benchmark with proper national-average qualification.
- The current 2026 FHFA and FHA national limit facts with local-geography controls.
- Marketplace interaction design when every result remains unmistakably illustrative.

Blocked until corrected or connected:

- All synthetic official-attributed charts and local dashboard snapshots.
- Calculator program decisions and outputs.
- Product availability states.
- All loan-officer and branch profiles.
- Location coverage claims based on SimpleMaps.
- Factual routes without complete dates, source records, and limitations.

This audit authorizes no publication, deployment, or code change. It supplies the evidence contract and correction constraints for the subsequent implementation and independent review stages.

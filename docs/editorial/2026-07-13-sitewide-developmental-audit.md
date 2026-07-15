# Snap Mortgage Sitewide Developmental Audit

**Audit date:** 2026-07-13  
**Assignment:** `snap-public-site-production-content-2026-07-13`  
**Verdict:** **REVISE - publication blocked**  
**Owner of this document:** Editorial director / developmental editor  

## Editorial Letter

The public-site system now has a strong information architecture and several genuinely useful content families. The production articles, product explanations, rate-comparison form, source cards, chart tables, and recovery states show the right instincts: answer a real borrower question, expose assumptions, explain limits, and provide a next action.

The site is not yet ready to present as production mortgage content. Its strongest editorial work is surrounded by precise-looking planning data, invented professional/provider records, incomplete freshness labeling, and templated location prose. Those weaknesses are systemic, not sentence-level. A copy polish alone would make the experience look more trustworthy without making it more trustworthy.

The next pass should preserve the approved templates and interactions while changing what they are allowed to claim. Live or verified records must replace illustrative values before those values receive production visual treatment. Until then, affected modules should be visibly bounded or withheld. Location pages need fewer generic paragraphs and more dated local findings. Loan-officer, branch, provider, rating, and review surfaces need canonical records before publication. Every factual page needs a factual-review date derived from its evidence, not a blanket copy-edit date.

## Scope Reviewed

This audit compared the assignment packet with the canonical and rendered public surfaces, including:

- Dynamic page templates in `site/app.js` and the specialized renderers for rates, products, editorial, local news, prequalification, metadata, locations, charts, and calculators.
- Static SEO templates in `site/static-route-document.mjs` and representative generated route output.
- `mock-data/production-seed.json`: 51 states, 737 cities, 836 location-product modules, 16 loan officers, 6 branches, 8 products, 5 calculators, 6 directories, and shared CTA/disclosure records.
- `mock-data/market-chart-fixtures.json`: 1,614 charts and 790 snapshot-source records.
- `mock-data/rates-marketplace-fixtures.json`: 40 illustrative results, split evenly between companies and loan officers.
- `mock-data/editorial-content.json` and canonical editorial sources: 24 articles, 9 public topic hubs, 6 contributors, and 74 source records.
- `mock-data/location-news-index.json`, representative full article bundles, and the source manifest: 3,152 articles across 788 locations.
- Shared header, footer, account/watchlist language, modal copy, metadata, empty/loading/error states, and CTA labels.

The paused homepage hero asset boundary was respected. This audit comments on the copy around the hero but does not commission changes to root `index.html`, slot-hero assets, or delegated hero work.

## Strengths To Preserve

| Category | Exact quote | Location | Why it works |
| --- | --- | --- | --- |
| KEEP | "Compare mortgage offers with your priorities in view" | Rates marketplace H1 | Directly states the job and leaves room for cost, payment, and provider preferences. |
| KEEP | "The companies, loan officers, NMLS identifiers, ratings, reviews, and pricing shown on this page are illustrative examples, not live offers or commitments to lend." | Rates fixture disclosure | Clearly separates the frontend comparison experience from live pricing and lending decisions. Keep this boundary while illustrative results remain accessible. |
| KEEP | "A useful purchase plan connects the home price with cash to close, the full monthly housing obligation, post-closing reserves, and the time you expect to own the property." | Purchase product summary | Answer-first, financially complete, and useful before a CTA. |
| KEEP | "Austin buyers can use dated rate, home-price, and household-cost evidence to pressure-test a payment plan without mistaking broad market data for a quote or a live listing report." | Austin article summary | Gives the answer, names the evidence, and states the limit in one sentence. |
| KEEP | "A lower monthly payment can still increase total interest or extend the payoff timeline." | Refinance product brief | A concise and important tradeoff. |
| KEEP | "We could not load this update. You can try again or return to the local market guide." | News error state | Explains what happened and gives two safe recovery actions. |
| KEEP | "No name, email, or phone number has been requested on this comparison page." | Prequalification handoff | Accurately describes the current no-PII boundary. |
| KEEP | "Calculator outputs are estimates based on the inputs shown. They are not a Loan Estimate, credit approval, rate lock, or commitment to lend." | Calculator disclosure | Clear educational boundary; retain it beside results. |

## Prioritized Systemic Fixes

### Blocking

1. **Replace or withhold precise illustrative market values.** All 1,614 chart fixtures are marked `planning_illustration`; all 737 city snapshots lack `lastUpdated`. They cannot carry production visual weight or imply a current local observation.
2. **Remove placeholder professional and provider proof from publishable routes.** All 16 loan-officer records use placeholder NMLS values; all 6 branch records lack address, phone, and hours; all 40 marketplace results contain illustrative pricing/NMLS data and no `asOf` field.
3. **Establish evidence-derived freshness.** Product guides, public topic hubs, calculators, directories, contributor pages, city snapshots, and professional pages do not have defensible page-level factual-review dates. A global fallback date is not evidence.
4. **Rebuild location uniqueness.** After removing the city name, 725 of 737 `marketPositioning` values use one of four repeated templates. The 836 location-product records contain relationships and names but no local evidence of their own.
5. **Remove simulated review content from production presentation.** Ratings, distributions, named review snippets, and dated testimonials are fabricated UI fixtures. Disclosure does not convert invented reviews into customer proof.

### Major

6. Rewrite state/city openings around three dated local findings, then explain their borrower consequence.
7. Replace the long pre-card `location-evidence-summary` dump with a short answer-first local brief; let the four cards carry the deeper stories.
8. Complete calculator assumptions and formulas, especially affordability, refinance, down payment, and rent-versus-buy.
9. Make CTA labels describe the actual frontend outcome. A modal-only confirmation is not the same action as starting prequalification, sending a request, opening Snap Homes, or saving to a persisted account.
10. Align dynamic content, static SEO content, and metadata. The same route must not promise contact fields, secure handoff, verified licensing, or current data when its rendered experience does not provide them.

### Minor After The Above

11. Remove remaining content-about-content language such as "hub," "profile includes," "show what happens," and "structured snapshot."
12. Replace generic repeated article rail CTAs with a decision tied to each article's subject.
13. Improve empty states and directory actions so no result is chosen arbitrarily for the customer.

## Exact-Quote Findings

### Data, Trust, And Freshness

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P0 | DATA REQUIRED | "Austin home price planning pattern" / "Planning illustration. Reference: FHFA House Price Index. As of: 2026 Q1." | Austin chart fixture and chart renderer | The chart looks sourced, but its `dataMode` is `planning_illustration`. Do not present generated points as FHFA observations. Connect the integration or label the entire module as an example with no location claim. |
| P0 | DATA REQUIRED | "$515K" / "$3,480/mo" / "3.2 months" / "1.82%" / "Moderate" | Austin city snapshot | The values have no city-level `lastUpdated`, calculation record, or claim-level source. Supply source, period, geography, methodology, and assumptions for each; replace qualitative insurance labels with a defined measure or remove them. |
| P0 | DATA REQUIRED | "$396K" / "$2,710/mo" / "4.3 months" | Alabama state snapshot | A date alone does not validate an estimated price, payment, or inventory figure. Tie each value to a source record and calculation, or do not publish it as a current snapshot. |
| P0 | DATA REQUIRED | "NMLS-000101" | Ava Martinez and all 16 loan-officer records | Placeholder NMLS values are an automatic publication failure. No officer profile should be public until identity, NMLS, licenses, availability, and approved service details come from the canonical system. |
| P0 | DATA REQUIRED | "Where to find us" / "Texas service area and branch coverage." | Branch hero panel | None of the 6 branch records has an address, phone, or hours. Rename the panel to service coverage for a non-location mockup, or wait for verified branch records before claiming a place customers can find. |
| P0 | DELETE | "This fixture profile reads like someone who would explain tradeoffs clearly before the next step." | Marketplace illustrative review | Internal fixture language is visible to borrowers and the review is invented. Delete all review snippets, distributions, ratings, reviewer names, and dates until a governed review source is connected. |
| P0 | DATA REQUIRED | "5.875%" / "6.112%" / "$2,226" / "4.8 / 5" | Illustrative marketplace result | All 40 offers have precise pricing and NMLS fields but no `asOf`. Keep only in an explicitly non-production review environment, or replace through the connected provider feed with complete assumptions, timestamp, licensing, and source. |
| P0 | COMPLIANCE REVIEW | `PUBLIC_CONTENT_LAST_UPDATED = "2026-07-13"` | `site/content-freshness.mjs` | A global fallback can falsely imply factual verification. A copy-only change must not reset a market, product, licensing, rate, or program review date. Derive dates from the canonical evidence record by page. |
| P1 | DATA REQUIRED | "Interest rate" / "6.75" | Calculator defaults | A precise rate drives payment outputs without an `As of` date or pricing source. Label it as a user-editable example assumption with no market implication, or populate it from the approved benchmark adapter with timestamp and scenario. |
| P1 | COMPLIANCE REVIEW | "Available" / "Needs review" / "Check eligibility" / "Location gated" | Calculator product toggles | These labels imply product availability or eligibility despite no live product/borrower/property integration. Use neutral program names and explain what must be verified. |
| P1 | DATA REQUIRED | "Funding fee can change by use type, down payment, service category, and exemption." | VA calculator rules | The direction is useful, but the calculator hard-codes a fee rate. Cite the current VA authority and show the exact scenario assumptions or remove the computed fee until verified. Apply the same rule to FHA and USDA fee assumptions. |
| P1 | DATA REQUIRED | "Last updated" is absent | 8 product guides, 9 public topic hubs, 5 calculator pages, city pages, directories, contributors, LO/branch pages | Add a factual-review date from the governing record. The 9 public hubs also have no source IDs; add source records where they explain program rules or time-sensitive market concepts. |
| P1 | DATA REQUIRED | "Published July 10, 2026 | Updated July 10, 2026" | All 3,152 location-news articles | Publication/update dates do not identify when each time-sensitive figure was measured. Render source period or `As of` beside figures, takeaways, charts, and tables; all 3,152 compact records currently lack an `asOf` field. |

### Location Pages And Local News

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P0 | REWRITE | "Los Angeles borrowers often compare jumbo fit, cash to close, local taxes, insurance, and payment range before choosing a loan path." | City `marketPositioning` | This sentence is one of four normalized templates used by 725 cities. Replace it with at least three dated local findings and a consequence specific to the geography. |
| P0 | DATA REQUIRED | "FHA loans in Austin, TX" | Location-product module | The record has only IDs, a name, and a relationship; the renderer adds the same product brief everywhere. Either enrich the module with local limits, dates, costs, official links, and comparisons, or use a simple link to the canonical product guide instead of presenting it as local guidance. |
| P1 | REWRITE | "A Alabama search plan can use those three changes..." | Alabama generated HPI article | Fix article selection and grammar in the generator (`an Alabama`). Run the correction across every geography that requires an article change. |
| P1 | REWRITE | "The latest LAUS release reports a Alabama labor force of 2,374,506..." | Alabama generated labor article | The opening is grammatically broken and starts with dataset mechanics rather than the borrower answer. Lead with what changed, over which period, and what it can and cannot change in a mortgage plan. |
| P1 | REWRITE | "The combination of a 0.5% quarterly change, 2.4% annual change, and 40.7% five-year change gives Alabama borrowers three dated views of the same statewide index." | Alabama local evidence summary | Useful evidence is buried in repetitive number recitation. Reduce the location-page summary to 2-3 short findings, then keep methodology and detailed limits in the article modal. |
| P1 | DATA REQUIRED | "Entry buyer" / "5%" / "$3,480/mo" / "Includes taxes and insurance assumptions" | City payment scenario table | This is not a complete payment example. Show price, loan amount, rate, APR where applicable, term, points/credits, taxes, insurance, mortgage insurance, HOA, date, and included/excluded costs, or remove the dollar result. |
| P1 | REWRITE | "Review local price, payment, inventory, taxes, insurance, loan options, and experts in one place." | City hero lead | It inventories sections instead of answering what is materially different in the city. Lead with dated local findings; put navigation in supporting UI. |
| P1 | REWRITE | "Alabama planning often starts with affordability, FHA fit, property taxes, and payment range." | State narrative | This is plausible but unsupported and generic. Replace with a dated statewide comparison and name the local variation a borrower should verify. |
| P2 | REWRITE | "The current structured snapshot shows a $515K median price..." | Static Austin route | `Structured snapshot` is implementation language. Use direct borrower copy and preserve the same evidence/date boundaries as the hydrated page. |

### Rates, Prequalification, Accounts, And CTAs

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P1 | REWRITE | "8 illustrative lender scenarios" | Rates results heading | The result toggle includes companies and loan officers. Use "8 illustrative results" or name the selected result type. |
| P1 | REWRITE | "Next" | Every marketplace result | The action is too vague for a high-intent handoff. Use "Continue with [provider]" or "Review prequalification next step" and state that no application is submitted. |
| P1 | REWRITE | "Start prequalification" | Generic CTA and modal-only flow | The current action opens a confirmation modal and collects nothing. Use language that accurately previews the handoff, or route to `/prequal/start` when a provider/scenario exists. |
| P1 | REWRITE | "Start a secure mortgage prequalification path and review your borrowing goals, property plans, and contact details with an available licensed team." | Prequalification meta description | The page does not establish secure transmission, collect contact details, or verify team availability. Replace with a description of the no-PII provider/scenario summary. |
| P1 | COMPLIANCE REVIEW | "Save this market, rate, calculator, product, or article to your account while you keep browsing." | Watchlist CTA | Current state is browser-local/simulated, not persisted to a verified account. Production copy must not claim an account save until the Snap Homes handoff is real. |
| P1 | COMPLIANCE REVIEW | "Michael Thompson" / "Open My Account" | Default logged-in header and account modal | A default fictional customer can look like real account data. Restrict this state to review environments or connect it to authenticated account context before public release. |
| P2 | REWRITE | "Get ready to connect with licensed help when your question needs a person." | Lead-form CTA | It does not explain the result of clicking or that no request is sent. State the actual modal outcome or connect the approved contact flow. |

### Products And Calculators

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P1 | KEEP | "FHA loans are made by approved lenders and insured by the Federal Housing Administration." | FHA topic hub | Accurate framing that avoids saying FHA lends directly. Preserve while adding source and factual-review date. |
| P1 | REWRITE | "Could FHA Loans fit my situation?" / "FHA Loans may be worth comparing based on your goal..." | Product gated answer | The public answer is circular. Give the strongest verified public fit indicators, principal costs, and property/occupancy constraints before explaining what requires lender review. |
| P1 | DATA REQUIRED | "Compare rent, ownership payment, estimated equity, transaction costs, and time horizon." | Rent-versus-buy calculator | The visible inputs omit appreciation, maintenance, buying/selling transaction costs, tax treatment, insurance changes, and opportunity cost. Add or explicitly exclude each before showing an equity comparison. |
| P1 | REWRITE | "product-aware estimate" | Calculator hub | The phrase overstates a simplified frontend calculation. Use "planning estimate with selected program assumptions" and expose formula, inclusions, exclusions, and sensitivity. |
| P1 | DATA REQUIRED | "Down payment assistance can help eligible borrowers cover some upfront cash..." | Calculator DPA option | Helpful overview, but no program, jurisdiction, limit, source, or date is connected. Keep as education only outside the calculation, or connect an official program record before changing the result. |
| P2 | REWRITE | "Estimate principal, interest, taxes, insurance, HOA, and product-specific mortgage insurance or funding fees." | Payment calculator lead | Good inventory, but it needs a plain statement of which inputs are user-entered, which are defaults, and which costs remain excluded. |

### Loan Officers, Branches, Directories, And Contributors

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P0 | DELETE | "Consent-aware contact form" | Loan-officer profile side list | No contact form exists. Remove the promise or implement the separately approved contact experience. |
| P1 | REWRITE | "A strong loan officer profile explains service style, licensed coverage, specialties, and what happens after a borrower reaches out." | Loan-officer intro | This describes the template. Replace it with verified information about the named officer and the actual contact outcome. |
| P1 | REWRITE | "Show what happens after a borrower reaches out." | Loan-officer section intro | Visible instruction/scaffolding. State the sequence directly: what information is requested, what is not, and who responds. |
| P1 | REWRITE | "A local branch hub brings the team, market coverage, product paths, and contact options into one place." | Branch intro | Content-about-content. Replace with verified office/service facts, or keep the lightweight page to a team list, service area, and valid actions. |
| P1 | REWRITE | "Open first result" | Directory hero | An arbitrary first record is not a customer decision. Replace with a useful filter/search action or remove the button. |
| P1 | REWRITE | "Loan Officers helps borrowers choose a useful next click." | Directory editorial section | The sentence is about navigation rather than borrower choice. Explain how profiles differ and which facts should drive selection. |
| P1 | REWRITE | "No matching results found." | Directory empty state | Add a safe recovery: clear filters, browse a broader geography, or request general licensed guidance. |
| P2 | REWRITE | "Rowan covers mortgage-rate context, inflation signals, and financing conditions for Snap Mortgage readers." | Contributor bio pattern | Clear but generic and repeated structurally. Add a concrete coverage promise and link to dated work; retain the prohibition on invented credentials, licensing, and contact details. |
| P1 | COMPLIANCE REVIEW | Named contributor portraits and personal bylines | Contributor pages and article bylines | Confirm the approved disclosure and identity policy for editorial personas before publication. Do not imply licensing, independent credentials, or firsthand reporting that the canonical records do not support. |

### Editorial, Metadata, Shared Chrome, And States

| Priority | Category | Exact quote | Location | Finding and required action |
| --- | --- | --- | --- | --- |
| P2 | DELETE | "Index for city and state market update articles." | `blog-local-market-updates.purpose` | Internal taxonomy copy appears in home/directory cards. Replace every seed `purpose` containing "index" or "hub" with a customer answer, or use the production hub's `heroSummary`. |
| P2 | DELETE | "Buyer education hub and first-time buyer path." | `blog-buying-a-home.purpose` | Scaffolding language. Replace with the specific decisions and costs the guide helps compare. |
| P2 | REWRITE | "Use this guide as education, then bring borrower and property details into a licensed conversation." | Repeated article rail CTA | Safe but generic. Tie the CTA to the article's actual decision and approved action. |
| P2 | REWRITE | "Related mortgage page" | Editorial related-card fallback | A missing relationship label should not become visible fallback copy. Resolve the record or omit the card. |
| P2 | REWRITE | "Loading the latest sourced update..." | Article loading state | `Latest` is a freshness claim. Use "Loading this sourced market update..." unless a current-feed check has run. |
| P2 | REWRITE | "Local mortgage intelligence, rate details, market data, education, and licensed expert help." | Footer | Broad positioning without a customer outcome. State the practical benefit: compare local costs and loan paths, then choose a valid next step. |
| P1 | REWRITE | "Explore Snap Mortgage guidance and related borrower resources." | Metadata fallback | Too generic for search and hides missing canonical descriptions. Require a unique description per route; fail generation when one is absent. |

## Page-Type Acceptance Checks

### Home And Shared Chrome

- [ ] The first 100 words below the paused hero state where to start and what each primary action does.
- [ ] No card displays seed terms such as `hub`, `index`, `path`, or other content-model language.
- [ ] Account and watchlist language matches real persistence/authentication state.
- [ ] Shared footer and metadata state a customer outcome rather than a catalog of site sections.
- [ ] A factual `Last updated` date is shown only when it represents actual review.

### Rates And Prequalification

- [ ] Every rate/APR/payment has purpose, product, term, amount/LTV, credit, geography, occupancy, property, lock, points/credits, included/excluded costs, source, and `As of` timestamp.
- [ ] Benchmark, illustrative result, personalized review, and commitment to lend are visually and verbally distinct.
- [ ] No invented provider, NMLS, rating, review, or testimonial appears in a publishable environment.
- [ ] Result headings work for both companies and individuals.
- [ ] Every result CTA names the destination and accurately describes the no-application/no-credit-decision boundary.
- [ ] Prequalification metadata and visible copy match the fields and behavior actually present.

### Product Guides

- [ ] The opening answers who should evaluate the product and names its principal cost/tradeoff.
- [ ] Eligibility, limits, cash, insurance/funding fees, property/occupancy rules, documentation, pricing drivers, alternatives, and personalized-review needs are covered.
- [ ] Agency/program claims have visible authoritative sources and factual-review dates.
- [ ] Public product-fit answers provide useful criteria before asking for borrower details.
- [ ] All location links are contextual; no thin localized product module is presented as substantive guidance.

### State And City Pages

- [ ] The first 100 words contain at least three dated, sourceable local findings and their borrower consequence.
- [ ] Every chart and snapshot value maps to a canonical evidence record; no `planning_illustration` is styled as current local data.
- [ ] Every city has a factual `Last updated` date and every volatile figure has an `As of` period.
- [ ] A complete payment example lists all assumptions and exclusions.
- [ ] Tax, insurance, loan-limit, official-program, and geographic-variation context is present.
- [ ] Less than 20% of non-disclosure prose is shared across comparable location pages.
- [ ] News cards follow the opening without an eight-paragraph evidence dump.

### Location News

- [ ] The lead states what changed, over which period, and why it may matter.
- [ ] Figures carry source periods or `As of` labels where they appear, not only in a final source list.
- [ ] Generated grammar, articles, agreement, and number formatting pass copy review.
- [ ] The body avoids repeating every figure in every paragraph.
- [ ] Methodology and limitations remain, but do not crowd out the decision answer.
- [ ] Titles, descriptions, and body copy are genuinely local rather than a location-name substitution.

### Calculators

- [ ] Every default is labeled as user input, example assumption, or sourced current value.
- [ ] Formula, inclusions, exclusions, and sensitivity are visible near results.
- [ ] Product statuses do not imply availability or eligibility.
- [ ] Program fees/rules are current, sourced, dated, and scenario-qualified.
- [ ] Refinance separates principal/interest from escrow and compares remaining/new term, costs, breakeven, and total interest.
- [ ] Rent-versus-buy includes or explicitly excludes appreciation, maintenance, transaction costs, tax, insurance, opportunity cost, rent growth, and holding period.
- [ ] Result CTAs state what licensed review adds and what data is or is not transmitted.

### Directories

- [ ] The opening explains what customers can find and how results meaningfully differ.
- [ ] Visible filters match functional filters.
- [ ] No arbitrary "first result" action remains.
- [ ] Result cards use verified public details only.
- [ ] Empty states offer clear recovery routes.
- [ ] Placement is not described as ranking, endorsement, or availability unless governed data supports it.

### Loan Officers And Branches

- [ ] Identity, NMLS, licenses, service areas, branch association, and availability are verified from canonical records.
- [ ] No placeholder NMLS, address, hours, language, specialty, contact, or review appears.
- [ ] Branch pages do not say "Where to find us" without a verified address.
- [ ] Copy describes the named person/office, not what a profile template is meant to contain.
- [ ] Contact CTAs state whether a message is sent and what happens next.
- [ ] Lightweight page structure is retained unless verified data supports more.

### Articles, Topic Hubs, And Contributors

- [ ] The title is fulfilled directly in the first 100 words.
- [ ] Articles retain their answer, evidence, example/table, tradeoff, sources, byline, and date structure.
- [ ] Every public topic hub has a factual-review date and sources for program or time-sensitive claims.
- [ ] Article rail CTAs are contextual and use approved actions.
- [ ] Contributor pages contain no invented credentials, licensing, experience, contact, testimonials, or social accounts.
- [ ] Editorial persona/byline disclosure follows an approved trust policy.

### Empty, Loading, Error, Metadata, And Static SEO

- [ ] Loading states make no unsupported freshness claim.
- [ ] Every error/empty state says what happened and offers a valid recovery.
- [ ] Every route has a unique useful title and description; missing descriptions fail generation rather than use generic fallback copy.
- [ ] Static and hydrated pages make the same factual claims and show the same evidence/date boundaries.
- [ ] Static pages contain no `structured`, `hub`, `index`, generator, fixture, mock, planning, or workflow language unless explicitly required as an honest data boundary.

## Customer-Useful Mortgage Audit Scores

Scores use the required 0-2 scale. A production recommendation requires at least 17/20 and 2/2 for Evidence, Trust, Product accuracy, and CTA clarity.

| Page family | Score | Critical dimensions | Gate |
| --- | ---: | --- | --- |
| Production articles | 19/20 | Evidence 2, Trust 2, Product accuracy 2, CTA clarity 1 | Revise contextual CTA, then pass |
| Product guides | 17/20 | Evidence 2, Trust 2, Product accuracy 2, CTA clarity 1 | Add page dates and improve fit CTA |
| Public topic hubs | 16/20 | Evidence 1, Trust 2, Product accuracy 2, CTA clarity 2 | Blocked on sources/dates |
| Rates marketplace | 11/20 | Evidence 0, Trust 0, Product accuracy 1, CTA clarity 1 | Blocked on illustrative proof/pricing |
| State and city pages | 8/20 | Evidence 0, Trust 0, Product accuracy 1, CTA clarity 2 | Blocked on data and uniqueness |
| Location news | 13/20 | Evidence 2, Trust 1, Product accuracy 2, CTA clarity 1 | Blocked on claim dates, grammar, pacing |
| Calculators | 10/20 | Evidence 0, Trust 1, Product accuracy 1, CTA clarity 1 | Blocked on assumptions and program status |
| Directories | 11/20 | Evidence 1, Trust 1, Product accuracy 1, CTA clarity 1 | Blocked where records are illustrative |
| Loan officer and branch pages | 7/20 | Evidence 0, Trust 0, Product accuracy 1, CTA clarity 1 | Blocked on canonical professional records |
| Contributor pages | 14/20 | Evidence 1, Trust 1, Product accuracy 2, CTA clarity 2 | Needs date and identity-policy review |
| Error/loading/shared chrome | 14/20 | Evidence 1, Trust 1, Product accuracy 2, CTA clarity 1 | Revise claims and outcomes |

## Revision Brief

1. **Evidence boundary:** Inventory every precise public value and assign `verified`, `illustrative`, or `remove`. Do not let visual polish erase this distinction.
2. **Canonical dates:** Add page-level factual-review fields and claim-level periods to canonical datasets. Do not use a global date to imply review.
3. **Location rewrite:** Build each state/city opening from verified findings, then regenerate only after uniqueness and source checks pass.
4. **Professional/provider gate:** Withhold LO, branch, provider, review, and rating claims until the connected systems supply approved records.
5. **Calculator contract:** Document formulas, assumptions, exclusions, program sources, and sensitivity before revising explanatory copy.
6. **Template rewrite:** Remove content-about-content language, clarify actual CTA outcomes, and align dynamic/static/meta copy.
7. **Independent review:** Re-run developmental review, fact/copy check, customer-useful mortgage audit, compliance review, and Snap QA before publication.

## Next Desk

**Next:** canonical evidence/claim-record owner and `report-and-research-story` for the blocking data gaps.  
**Then:** `draft-editorial-content` / implementation team for the bounded rewrite.  
**Required before release:** independent fact/copy review, mortgage compliance review, customer-useful audit at 17/20 with all critical dimensions at 2, browser/static parity QA, and human publication approval.


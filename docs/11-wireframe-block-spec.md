# Wireframe Block Spec

Date: 2026-07-07

Status: Designer handoff draft

## Purpose

This document translates the product plan into page-by-page visual structure. It is meant to give a designer enough direction to build reusable blocks, low-fidelity wireframes, and then high-fidelity page comps without guessing at the platform architecture.

The site should feel like a local mortgage intelligence product, not a brochure. The design should combine:

- Local market dashboard.
- Editorial publication.
- Mortgage product guide.
- Loan officer and branch placement surface.
- Compliance-aware conversion path.

## Visual Direction

Recommended design stance: calm local intelligence.

The interface should feel credible, data-rich, and easy to scan. Use enough editorial polish to feel trustworthy, but keep the page structure operational and dashboard-first. Avoid giant marketing-only hero sections, decorative card piles, and long uninterrupted prose.

Design priorities:

- Make local data visible in the first viewport.
- Keep primary CTAs persistent but not loud.
- Let charts, tables, and comparisons create the page rhythm.
- Use repeated blocks consistently across city, state, product, article, loan officer, and branch pages.
- Design for compliance notes, source dates, and review states from the beginning.

## Shared Page Shell

Every major public page should share the same base shell.

```txt
+------------------------------------------------------------------+
| Global Header                                                     |
| Logo | Buy | Refinance | Home Equity | Rates | Calculators | ...  |
+------------------------------------------------------------------+
| Page Context Bar                                                  |
| Breadcrumbs | Location/Product context | Last updated/source note  |
+------------------------------------------------------------------+
| Main Content Area                                      | CTA Rail  |
|                                                        |           |
| Page-specific blocks                                  | Sticky    |
|                                                        | CTA       |
|                                                        | panel     |
+------------------------------------------------------------------+
| Related Content / Directory / Footer                               |
+------------------------------------------------------------------+
```

Desktop structure:

- Header stays simple and global.
- Page context bar sits under header.
- Main content uses a wide content column plus a right sticky CTA rail.
- Data-heavy modules can span the full content width.
- Related content bands can be full-width below the main content.

Mobile structure:

- Header collapses to logo, menu, and primary action.
- Page context bar becomes compact breadcrumbs plus last-updated text.
- Main content stacks vertically.
- Sticky CTA rail becomes bottom CTA bar with up to three actions.
- Tables should become scrollable, stacked, or comparison cards depending on complexity.

## Placeholder Block Taxonomy

These blocks should become the reusable designer/component library.

### Navigation And Context

- `GlobalHeader`: primary navigation, sign in, apply/get prequalified.
- `MobileMenu`: grouped navigation with primary CTA.
- `PageContextBar`: breadcrumbs, page type label, last updated/source summary.
- `LocationSwitcher`: city/state selector or nearby-market picker.

### Hero Blocks

- `LocationHero`: city/state title, short local promise, primary CTA, secondary local expert CTA.
- `ProductHero`: product title, borrower-fit summary, primary CTA.
- `ArticleHero`: article title, dek, author/reviewer, dates.
- `ProfileHero`: loan officer or branch identity, contact routes, licensing summary.

### Dashboard Blocks

- `MarketSnapshotCards`: 4 to 6 key metrics.
- `TrendChartBlock`: home price, payment, inventory, days-on-market, or rate trend.
- `ScenarioTable`: payment, down payment, refinance, or affordability examples.
- `ComparisonTable`: nearby cities, products, branches, or scenarios.
- `TaxInsuranceTable`: property tax and insurance context.
- `FreshnessAndSourceNote`: source, date range, last updated, reviewer.

### Editorial Blocks

- `GuidanceSection`: short scannable advice for a borrower goal.
- `LocalNewsFeed`: articles attached to location/product/topic.
- `ArticleBody`: rich article layout with inline links and source notes.
- `RelatedExplainers`: supporting education modules.
- `FAQBlock`: structured FAQs with compliance-aware answers.

### Placement Blocks

- `LoanOfficerCard`: photo, name, NMLS, specialties, service area, contact CTA.
- `LoanOfficerGrid`: ranked loan officer placement.
- `BranchCard`: location, hours/contact, coverage, team CTA.
- `BranchGrid`: nearby or state branch placement.
- `PlacementReasonNote`: explains why this expert or branch appears.

### Conversion Blocks

- `StickyCTARail`: desktop persistent CTA panel.
- `MobileCTABar`: bottom mobile actions.
- `InlineCTAPanel`: contextual CTA inside content.
- `LeadCaptureLightbox`: low-friction lead/opportunity capture.
- `CalculatorCTA`: action attached to scenario or calculator result.

### Compliance Blocks

- `DisclosureBlock`: page or module-level disclosures.
- `AssumptionsBlock`: rate/payment assumptions.
- `LicensingBlock`: NMLS, state licensing, Equal Housing language.
- `ReviewStatusBadge`: draft/reviewed/compliance-approved metadata for admin preview.

## Page 1: City Page

Purpose: local mortgage and housing market hub.

Priority: highest.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| GlobalHeader                                                      |
+------------------------------------------------------------------+
| PageContextBar: Home > Locations > Texas > Austin                 |
+------------------------------------------------------------------+
| LocationHero                                           | CTA Rail  |
| Austin, TX mortgage and housing market                 |           |
| Primary CTA | Find local expert                        |           |
+--------------------------------------------------------+           |
| MarketSnapshotCards                                    |           |
| Price | Payment | Inventory | Tax | Insurance | DOM     |           |
+--------------------------------------------------------+           |
| HomePriceTrendChart                                    |           |
+--------------------------------------------------------+           |
| PaymentScenarioTable       | TaxInsuranceTable          |           |
+--------------------------------------------------------+-----------+
| NearbyCityComparisonTable                                          |
+------------------------------------------------------------------+
| BuyerGuidanceSection | RefinanceGuidanceSection                    |
+------------------------------------------------------------------+
| LoanOfficerGrid                                                 |
+------------------------------------------------------------------+
| BranchGrid                                                      |
+------------------------------------------------------------------+
| RelatedProductCards                                             |
+------------------------------------------------------------------+
| LocalNewsFeed                                                   |
+------------------------------------------------------------------+
| FAQBlock                                                        |
+------------------------------------------------------------------+
| DisclosureBlock                                                 |
+------------------------------------------------------------------+
```

Above-the-fold goal:

- The user should immediately see the city name, market snapshot, and primary action.
- At least one real data module should be visible without scrolling.
- The sticky rail should show a context-aware CTA such as estimate payment, get prequalified, or contact a local expert.

Placeholder blocks to design:

- City hero.
- Six-metric market snapshot.
- Large line chart.
- Payment scenario table.
- Tax and insurance table.
- Nearby city comparison.
- Two short guidance sections.
- Ranked loan officer grid.
- Branch fallback grid.
- Related products.
- Local news feed.
- FAQ.
- Disclosure/source footer.

Mobile order:

1. Header.
2. Context bar.
3. City hero.
4. Market snapshot cards.
5. Primary chart.
6. Payment scenarios.
7. Tax/insurance table.
8. Local expert card preview.
9. Buyer/refinance guidance.
10. Nearby city comparison.
11. Related products.
12. News.
13. FAQ.
14. Disclosures.
15. Bottom CTA bar.

## Page 2: State Page

Purpose: statewide mortgage guidance and parent hub for city pages.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| GlobalHeader                                                      |
+------------------------------------------------------------------+
| PageContextBar: Home > Locations > Texas                          |
+------------------------------------------------------------------+
| LocationHero: Texas mortgage guide                     | CTA Rail  |
+--------------------------------------------------------+           |
| StateMarketSnapshotCards                               |           |
+--------------------------------------------------------+           |
| MajorCityComparisonTable                               |           |
+--------------------------------------------------------+-----------+
| PropertyTaxInsuranceOverview                                      |
+------------------------------------------------------------------+
| StateProductGuidance                                              |
+------------------------------------------------------------------+
| FeaturedCityLinks / CityDirectory                                 |
+------------------------------------------------------------------+
| StatewideLoanOfficerGrid                                          |
+------------------------------------------------------------------+
| BranchDirectory                                                   |
+------------------------------------------------------------------+
| StateNewsFeed                                                     |
+------------------------------------------------------------------+
| StateFAQ + DisclosureBlock                                        |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- State hero.
- Statewide snapshot.
- Major city comparison.
- Property tax/insurance overview.
- Product guidance band.
- City directory.
- State loan officer directory.
- Branch directory.
- State news feed.
- FAQ and disclosures.

## Page 3: Product Page

Purpose: explain a mortgage product and route the user toward the right local next step.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| ProductHero                                           | CTA Rail   |
+-------------------------------------------------------+            |
| WhoItFitsBlock                                        |            |
+-------------------------------------------------------+            |
| RequirementsOverview                                  |            |
+-------------------------------------------------------+            |
| BenefitsTradeoffsComparison                           |            |
+-------------------------------------------------------+------------+
| PaymentOrDownPaymentScenarioTable                                  |
+------------------------------------------------------------------+
| RelatedCalculators                                                 |
+------------------------------------------------------------------+
| SpecialistLoanOfficerGrid                                          |
+------------------------------------------------------------------+
| RelatedLocationProductModules                                      |
+------------------------------------------------------------------+
| RelatedArticles                                                    |
+------------------------------------------------------------------+
| ProductFAQ + DisclosureBlock                                       |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Product hero.
- Borrower-fit summary.
- Requirements overview.
- Benefits/tradeoffs comparison.
- Scenario examples.
- Related calculators.
- Specialist loan officers.
- Related city/state product modules.
- Related articles.
- Product FAQ and disclosures.

## Page 4: Location Product Module

Purpose: combine product education with local market context inside a city or state page.

Example: an FHA loans in Austin, TX section on the Austin city page.

This is not a standalone page. It is an embedded section used on city and state templates.

Desktop module wireframe:

```txt
+------------------------------------------------------------------+
| LocalProductSnapshot                                  |            |
+-------------------------------------------------------+            |
| LocalEligibilityAndRequirements                       |            |
+-------------------------------------------------------+            |
| LocalPaymentScenarioTable                             |            |
+-------------------------------------------------------+------------+
| CityMarketDataPullthrough                                          |
+------------------------------------------------------------------+
| LocalSpecialistLoanOfficerGrid                                     |
+------------------------------------------------------------------+
| NearbyBranchGrid                                                   |
+------------------------------------------------------------------+
| CanonicalProductLink + LocalProductArticles                        |
+------------------------------------------------------------------+
| LocationProductFAQ + DisclosureBlock                              |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Product-location snapshot.
- Local requirement notes.
- Local payment scenarios.
- Pullthrough city data module.
- Specialist loan officers.
- Nearby branches.
- Canonical product link.
- Related local articles.
- FAQ and disclosures.

## Page 5: Blog / News Article

Purpose: editorial content that feeds SEO, local context, and conversion.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| ArticleHero                                           | CTA Rail   |
| Title, dek, author/reviewer, dates                    |            |
+-------------------------------------------------------+            |
| ArticleBody                                           |            |
| Inline links, source notes, callouts                  |            |
+-------------------------------------------------------+------------+
| RelatedLocationCards                                                |
+------------------------------------------------------------------+
| RelatedProductCards                                                 |
+------------------------------------------------------------------+
| RelatedLoanOfficerCards                                             |
+------------------------------------------------------------------+
| RelatedCalculatorCards                                              |
+------------------------------------------------------------------+
| SourceNotes + DisclosureBlock                                       |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Article hero.
- Article metadata row.
- Article body.
- Inline CTA panel.
- Source notes.
- Related locations.
- Related products.
- Related experts.
- Related calculators.
- Disclosures.

Article pages should look like a publication, but still connect back to the content graph. Avoid isolating articles as dead-end blog posts.

## Page 6: Loan Officer Profile

Purpose: establish trust, show local/product fit, and route contact.

Approved reference direction: combine New American Funding's conversion-heavy loan officer profile with Movement Mortgage's Amanda Silber profile structure.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| ProfileHero                                           | CTA Rail   |
| Photo, name, title, NMLS, market fit, contact actions |            |
+-------------------------------------------------------+            |
| ProofStatsAndServiceAreaSummary                       |            |
+-------------------------------------------------------+            |
| LicensingAndStateAuthorization                        |            |
+-------------------------------------------------------+            |
| SpecialtiesAndBorrowerFit                             |            |
+-------------------------------------------------------+------------+
| LocalMarketsServed                                                 |
+------------------------------------------------------------------+
| RelatedProducts                                                    |
+------------------------------------------------------------------+
| ArticlesAndQuotes                                                  |
+------------------------------------------------------------------+
| BranchAffiliation                                                  |
+------------------------------------------------------------------+
| ContactForm + OfficeHours                                          |
+------------------------------------------------------------------+
| TestimonialsOrTrustSignals                                         |
+------------------------------------------------------------------+
| FAQ + LicensingBlock                                               |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Profile hero.
- Proof stats and service area summary.
- Contact action panel.
- Licensing and state authorization summary.
- Specialty tags.
- Local markets served.
- Related products.
- Articles/quotes.
- Branch affiliation.
- Contact form and office hours.
- Testimonials/trust signals.
- FAQ and licensing block.

Hero guidance:

- Prioritize a mortgage-native hero: prominent headshot, name, role, NMLS line, market served, branch/location, specialty labels, proof/review signals, and direct contact/apply actions.
- Borrow New American Funding's apply CTA, phone/email, review proof, product/promotion modules, education feed, and contact form.
- Borrow Movement's Amanda Silber structure for headshot/contact/NMLS hero, calculator and loan-fit action cards, reviews, social links, impact/trust block, blog feed, office/address data, state licenses, and licensing footer.
- Performance or proof stats must be structured, sourceable, and compliance-reviewed.

## Page 7: Branch Profile

Purpose: local office hub and fallback routing destination.

Approved reference direction: use Novus Home Mortgage's Edina branch (`https://www.novushomemortgage.com/location/edina-branch/`) as the primary branch-profile model. The branch mockup should prioritize branch identity, phone/contact, branch manager, LO roster with NMLS IDs, address/map, local service copy, service modules, and embedded calculator/product flow.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| ProfileHero: Branch                                  | CTA Rail    |
| Address, contact, map placeholder, primary actions    |            |
+-------------------------------------------------------+            |
| BranchCoverageSummary                                 |            |
+-------------------------------------------------------+            |
| TeamLoanOfficerGrid                                   |            |
+-------------------------------------------------------+------------+
| CitiesServed                                                       |
+------------------------------------------------------------------+
| ProductSpecialties                                                 |
+------------------------------------------------------------------+
| LocalArticles                                                      |
+------------------------------------------------------------------+
| NearbyBranches                                                     |
+------------------------------------------------------------------+
| BranchFAQ + LicensingBlock                                         |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Branch hero.
- Contact/map block.
- Branch manager card.
- Coverage summary.
- Team loan officer grid.
- Cities served.
- Product specialties.
- Embedded calculator/product flow.
- Local articles.
- Nearby branches.
- FAQ and licensing block.

## Page 8: Calculator / Tool Page

Purpose: let the user model a scenario, then convert with captured context.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| ToolHero                                              | CTA Rail   |
+-------------------------------------------------------+            |
| CalculatorInputPanel       | CalculatorResultPanel     |            |
+-------------------------------------------------------+------------+
| ScenarioAssumptionsBlock                                           |
+------------------------------------------------------------------+
| RelatedGuidanceSection                                             |
+------------------------------------------------------------------+
| RelatedProducts                                                    |
+------------------------------------------------------------------+
| RelatedLocations                                                   |
+------------------------------------------------------------------+
| RecommendedLoanOfficerOrBranch                                     |
+------------------------------------------------------------------+
| FAQ + DisclosureBlock                                              |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Tool hero.
- Input panel.
- Results panel.
- Assumptions block.
- Scenario CTA.
- Related guidance.
- Related products.
- Related locations.
- Recommended expert or branch.
- FAQ and disclosures.

## Page 9: Rates Page

Purpose: compare mortgage rates, explain rate movement, and route users into calculators, local market pages, and loan officer contact.

Approved reference direction: use a Bankrate/NerdWallet-style rates page. The page should combine national rate snapshot cards, personalized filters, rate comparison tables, trend context, local rate links, calculators, rate news, methodology, and disclosures.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| RatesHero                                            | CTA Rail   |
| Today's mortgage rates, updated date, primary CTA     |            |
+------------------------------------------------------+            |
| PersonalizedRateQuoteForm                            |            |
+------------------------------------------------------+------------+
| CurrentRateSnapshotCards                                          |
+------------------------------------------------------------------+
| PurchaseRateTable                  | RefinanceRateTable            |
+------------------------------------------------------------------+
| RateTrendChart                     | RateMarketContext             |
+------------------------------------------------------------------+
| LocalRateLinks / StateRateCards                                    |
+------------------------------------------------------------------+
| RelatedCalculators                                                 |
+------------------------------------------------------------------+
| RateNewsFeed                                                       |
+------------------------------------------------------------------+
| Methodology + APRAssumptions + DisclosureBlock                     |
+------------------------------------------------------------------+
```

Placeholder blocks to design:

- Rates hero.
- Personalized rate quote form.
- Current rate snapshot cards.
- Purchase rate table.
- Refinance rate table.
- Rate trend chart.
- Rate market context.
- Local/state rate links.
- Related calculators.
- Rate news feed.
- Methodology, assumptions, and disclosures.

## Page 10: Search And Directory Pages

Purpose: help users find locations, loan officers, branches, products, and articles.

Desktop wireframe:

```txt
+------------------------------------------------------------------+
| DirectoryHero                                                     |
+------------------------------------------------------------------+
| FilterRail                  | ResultsList / ResultsGrid            |
| Keyword, state, city,       | Cards, map/list toggle where useful  |
| product, topic, intent      |                                      |
+------------------------------------------------------------------+
| Pagination / Load More                                             |
+------------------------------------------------------------------+
| RelatedDirectoryLinks                                             |
+------------------------------------------------------------------+
```

Directory variants:

- Location directory.
- Loan officer directory.
- Branch directory.
- Blog/resource search.
- Product finder.

Placeholder blocks to design:

- Directory hero.
- Filter rail.
- Results grid.
- Results list.
- Empty state.
- Pagination/load more.
- Related directory links.

## CTA Rail Behavior

The CTA rail should change by page type and section.

City page examples:

- Hero: Get prequalified.
- Market section: Estimate payment.
- Product section: Compare loan options.
- Loan officer section: Contact local expert.
- News section: Get local guidance.

Product page examples:

- Hero: See if this loan fits.
- Requirements: Talk through eligibility.
- Scenario table: Estimate my payment.
- Specialist section: Contact a specialist.

Article page examples:

- Local market article: Get local guidance.
- Product article: Compare options.
- Refinance article: Check refinance options.

Mobile CTA bar:

- Maximum three actions.
- Primary action centered or visually strongest.
- Secondary actions use icons and concise labels.
- The bar should not cover important form fields, table controls, or disclosures.

## Placeholder Fidelity Guidance

For the first designer pass, use named gray or lightly tinted blocks with realistic proportions:

- Hero blocks should include real title length and two CTA placeholders.
- Charts should reserve actual chart space, legends, and source notes.
- Tables should show column counts and row density.
- Loan officer and branch cards should include photo/map placeholders.
- Article blocks should show headline, dek, metadata, and related-object slots.
- Disclosure blocks should be present even if the copy is placeholder.

The wireframes should prove the page structure before visual styling begins.

## Open Design Questions

- Should the city page use a right CTA rail on all desktop widths or only above a specific breakpoint?
- Should city market charts be one large featured chart plus smaller secondary modules, or a tabbed chart area?
- Should loan officer cards be compact by default, with expanded detail on click, or full cards in the main page?
- Should directories use map/list views, or list-only for v1?
- What is the minimum mobile table pattern for payment and nearby-city comparisons?
- Should product pages lead with education or with a quick product-fit decision module?

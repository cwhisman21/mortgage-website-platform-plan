# Prototype Content Seed Plan

Date: 2026-07-07

Status: Planning draft

## Purpose

The first clickable prototype needs enough mock content to feel like a real website. A designer or frontend team should be able to move through state pages, city pages, product pages, loan officer pages, branch pages, articles, calculators, and directories without hitting empty corridors.

This is not a production content inventory. It is the minimum realistic seed set needed to test:

- Page structure.
- Navigation.
- Cross-linking.
- Loan officer placement.
- Branch fallback.
- Product guidance modules embedded in state and city pages.
- Sticky CTA behavior.
- Compliance/source metadata placement.
- Search and directory filters.

All prototype names and values should be treated as fictional placeholder data unless explicitly replaced later.

## Recommended V1 Prototype Counts

| Page or object type | Recommended count | Why this count is enough |
| --- | ---: | --- |
| Site entry pages | 1 | Tests the homepage/entry experience without making it a generic brochure page. |
| State pages | 4 | Tests multiple state contexts without overloading the prototype. |
| City pages | 12 | Gives each state 3 cities, enough for nearby-city comparisons and directories. |
| Branch pages | 6 | Tests local branch coverage plus markets with no direct branch. |
| Loan officer pages | 16 | Tests ranking by city, branch, state license, specialty, language, and fallback. |
| Product pages | 8 | Covers the core mortgage/navigation categories. |
| Location product modules | 16 | Tests state-level and city-level product guidance without creating standalone duplicate routes. |
| Blog / learning center section pages | 10 | Tests editorial navigation beyond individual article pages. |
| Blog/news articles | 24 | Enough for local feeds, product feeds, article pages, and empty/low-density cases. |
| Calculator/tool pages | 4 | Covers the main high-intent conversion paths. |
| Directory/search pages | 5 | Tests locations, loan officers, branches, articles, and product discovery. |
| CTA rules | 20 | Enough to prove sticky rail and mobile CTA changes by page/section. |
| Compliance disclosures | 10 | Enough to test product, rate/payment, licensing, and article disclosure placement. |

## Site Entry Page

Create 1 site entry page:

- `/`

The homepage should not be a generic lender brochure page. It should act as a routing surface into:

- City/state search.
- Buyer, refinance, home equity, and product paths.
- Calculators.
- Featured local market updates.
- Featured loan officers or local expert matching.
- Learning Center content.

## Seed Market Strategy

Use four states that create different design/content cases.

| State | Prototype role | Cities |
| --- | --- | --- |
| Texas | Primary growth market with broad city coverage and purchase/refi demand. | Austin, Dallas, Houston |
| California | High-cost market for jumbo and affordability comparisons. | Irvine, San Diego, Sacramento |
| Colorado | VA, relocation, and mixed metro/mountain affordability context. | Denver, Colorado Springs, Boulder |
| Florida | Insurance, taxes, refinance, and migration-driven market context. | Tampa, Orlando, Miami |

Why this mix works:

- Texas tests scale and branch density.
- California tests high-cost/jumbo content.
- Colorado tests VA and military-heavy routing.
- Florida tests insurance and risk/context-heavy local guidance.

## State Pages

Create 4 state pages:

- `/locations/texas`
- `/locations/california`
- `/locations/colorado`
- `/locations/florida`

Each state page should include:

- State hero.
- Statewide market snapshot.
- Major city comparison table.
- Tax and insurance overview.
- Related product guidance.
- City directory.
- Statewide loan officer directory.
- Branch directory.
- State news feed.
- FAQ.
- Disclosures.

## City Pages

Create 12 city pages:

| City | Route | Prototype emphasis |
| --- | --- | --- |
| Austin, TX | `/locations/texas/austin` | Dashboard-first city hub, purchase and refinance demand. |
| Dallas, TX | `/locations/texas/dallas` | Branch-rich metro and conventional/FHA comparison. |
| Houston, TX | `/locations/texas/houston` | Refinance, insurance, and affordability spread. |
| Irvine, CA | `/locations/california/irvine` | Jumbo and high-cost affordability. |
| San Diego, CA | `/locations/california/san-diego` | VA, coastal pricing, branch fallback. |
| Sacramento, CA | `/locations/california/sacramento` | Move-up and affordability comparison. |
| Denver, CO | `/locations/colorado/denver` | Relocation and conventional/jumbo mix. |
| Colorado Springs, CO | `/locations/colorado/colorado-springs` | VA-heavy city and military borrower routing. |
| Boulder, CO | `/locations/colorado/boulder` | High-cost small-market comparison. |
| Tampa, FL | `/locations/florida/tampa` | Insurance/tax context and refinance. |
| Orlando, FL | `/locations/florida/orlando` | First-time buyer and move-up buyer content. |
| Miami, FL | `/locations/florida/miami` | High-cost, condo, insurance, and multilingual routing. |

Each city page should include enough mock values to fill:

- 6 market snapshot cards.
- 1 primary trend chart.
- 1 payment scenario table.
- 1 tax/insurance table.
- 1 nearby city comparison table.
- 2 local guidance blocks.
- 2 to 4 loan officer cards.
- 1 to 2 branch cards, or a fallback state/company routing card.
- 3 to 5 related products.
- 3 to 5 related articles.
- 5 to 7 FAQs.

## Branch Pages

Create 6 branch pages:

| Branch | Route | Coverage role |
| --- | --- | --- |
| Austin Central Branch | `/branches/austin-central` | Primary Texas city branch. |
| Dallas North Branch | `/branches/dallas-north` | Dense metro branch with multiple LOs. |
| Houston West Branch | `/branches/houston-west` | Texas fallback branch for nearby cities. |
| Orange County Branch | `/branches/orange-county` | California jumbo and high-cost branch. |
| Denver Tech Center Branch | `/branches/denver-tech-center` | Colorado metro and relocation branch. |
| Tampa Bay Branch | `/branches/tampa-bay` | Florida insurance/refi branch. |

Intentional coverage gaps:

- San Diego should test branch fallback to Orange County or state-licensed specialists.
- Sacramento should test state coverage without a nearby branch.
- Boulder should test nearby Denver branch placement.
- Orlando and Miami should test Florida branch/state fallback.

## Loan Officer Pages

Create 16 fictional loan officer pages.

| Loan officer | Route | Branch | States | Specialties | Priority markets |
| --- | --- | --- | --- | --- | --- |
| Ava Martinez | `/loan-officers/ava-martinez` | Austin Central | TX | First-time buyer, FHA, bilingual English/Spanish | Austin, San Antonio |
| Marcus Reed | `/loan-officers/marcus-reed` | Austin Central | TX, CO | VA, relocation | Austin, Colorado Springs |
| Priya Shah | `/loan-officers/priya-shah` | Dallas North | TX | Conventional, jumbo, self-employed | Dallas |
| Ethan Brooks | `/loan-officers/ethan-brooks` | Houston West | TX | Refinance, cash-out refinance | Houston |
| Sofia Nguyen | `/loan-officers/sofia-nguyen` | Orange County | CA | Jumbo, high-cost purchase | Irvine |
| Caleb Turner | `/loan-officers/caleb-turner` | Orange County | CA | VA, first-time buyer | San Diego |
| Naomi Patel | `/loan-officers/naomi-patel` | None | CA | Refinance, move-up buyer | Sacramento |
| Jordan Kim | `/loan-officers/jordan-kim` | Denver Tech Center | CO | Conventional, relocation | Denver |
| Leah Foster | `/loan-officers/leah-foster` | Denver Tech Center | CO | VA, FHA | Colorado Springs |
| Owen Blake | `/loan-officers/owen-blake` | Denver Tech Center | CO | Jumbo, self-employed | Boulder |
| Camila Torres | `/loan-officers/camila-torres` | Tampa Bay | FL | First-time buyer, bilingual English/Spanish | Tampa, Orlando |
| Daniel Price | `/loan-officers/daniel-price` | Tampa Bay | FL | Refinance, home equity | Tampa |
| Mia Alvarez | `/loan-officers/mia-alvarez` | None | FL | Condo, jumbo, bilingual English/Spanish | Miami |
| Grace Morgan | `/loan-officers/grace-morgan` | None | TX, FL | Home equity, cash-out refinance | Houston, Miami |
| Nolan Carter | `/loan-officers/nolan-carter` | None | CA, CO | Jumbo, relocation | Irvine, Denver, Boulder |
| Harper Ellis | `/loan-officers/harper-ellis` | None | TX, CA, CO, FL | Product specialist fallback | Statewide fallback |

This set tests:

- A loan officer assigned directly to a city.
- A loan officer inherited from a nearby branch.
- A state-licensed specialist with no local branch.
- A multi-state specialist.
- A bilingual match.
- Product-specialty ranking.
- A statewide fallback profile.

## Product Pages

Create 8 product pages:

| Product | Route | Prototype role |
| --- | --- | --- |
| Home Purchase Loans | `/buy` | Top-level purchase path. |
| Refinance | `/refinance` | Top-level refinance path. |
| FHA Loans | `/loan-options/fha-loans` | First-time buyer and lower down payment path. |
| VA Loans | `/loan-options/va-loans` | Veteran and military borrower path. |
| Conventional Loans | `/loan-options/conventional-loans` | Baseline product comparison. |
| Jumbo Loans | `/loan-options/jumbo-loans` | High-cost markets and specialist placement. |
| Home Equity / HELOC | `/home-equity` | Equity borrower path. |
| Cash-Out Refinance | `/loan-options/cash-out-refinance` | Refinance/equity overlap path. |

## Location Product Modules

Create 16 location product modules. These should appear as sections on the relevant state or city pages, not as standalone routes:

| Module | Parent page | Anchor |
| --- | --- | --- |
| FHA loans in Texas | `/locations/texas` | `#fha-loans` |
| FHA loans in Austin, TX | `/locations/texas/austin` | `#fha-loans` |
| VA loans in Texas | `/locations/texas` | `#va-loans` |
| Refinance in Houston, TX | `/locations/texas/houston` | `#refinance` |
| Jumbo loans in California | `/locations/california` | `#jumbo-loans` |
| Jumbo loans in Irvine, CA | `/locations/california/irvine` | `#jumbo-loans` |
| VA loans in San Diego, CA | `/locations/california/san-diego` | `#va-loans` |
| Refinance in Sacramento, CA | `/locations/california/sacramento` | `#refinance` |
| VA loans in Colorado | `/locations/colorado` | `#va-loans` |
| VA loans in Colorado Springs, CO | `/locations/colorado/colorado-springs` | `#va-loans` |
| Jumbo loans in Boulder, CO | `/locations/colorado/boulder` | `#jumbo-loans` |
| Refinance in Denver, CO | `/locations/colorado/denver` | `#refinance` |
| Refinance in Florida | `/locations/florida` | `#refinance` |
| Refinance in Tampa, FL | `/locations/florida/tampa` | `#refinance` |
| FHA loans in Orlando, FL | `/locations/florida/orlando` | `#fha-loans` |
| Jumbo loans in Miami, FL | `/locations/florida/miami` | `#jumbo-loans` |

## Articles And News

Create 24 mock articles:

- 12 local market update articles, one for each city.
- 4 state tax/insurance explainers, one for each state.
- 4 product explainers tied to FHA, VA, jumbo, and refinance.
- 4 borrower-intent guides tied to first-time buyer, move-up buyer, home equity, and cash-out refinance.

Each article should include:

- Article type.
- Related state/city.
- Related products.
- Related loan officers or branch when appropriate.
- Source note placeholder.
- Publish date.
- Last reviewed date.
- Compliance review status.

## Blog / Learning Center Pages

Create 10 blog section pages in addition to the 24 individual article pages:

| Page | Route | Purpose |
| --- | --- | --- |
| Learning Center home | `/learning-center` | Editorial landing page with featured articles, topic hubs, local market updates, and product education. |
| Local Market Updates | `/learning-center/local-market-updates` | Index for city/state market update articles. |
| Buying a Home | `/learning-center/buying-a-home` | Buyer education hub and first-time buyer path. |
| Refinance | `/learning-center/refinance` | Refinance article hub. |
| FHA Loans | `/learning-center/fha-loans` | FHA article hub. |
| VA Loans | `/learning-center/va-loans` | VA article hub. |
| Jumbo Loans | `/learning-center/jumbo-loans` | Jumbo/high-cost article hub. |
| Home Equity | `/learning-center/home-equity` | HELOC, cash-out, and equity education hub. |
| Taxes & Insurance | `/learning-center/taxes-insurance` | Tax, insurance, and affordability context hub. |
| Editorial Team | `/learning-center/editorial-team` | Author/reviewer placeholder page for article bylines and review credibility. |

Each blog section page should include:

- Topic hero.
- Search/filter entry.
- Featured article.
- Related article feed.
- Related locations.
- Related products.
- Related calculators.
- Compliance/review note where needed.

## Calculators And Tools

Create 4 calculator/tool pages:

| Tool | Route | Captured context |
| --- | --- | --- |
| Mortgage Payment Calculator | `/calculators/mortgage-payment` | Price, down payment, rate, taxes, insurance, location. |
| Affordability Calculator | `/calculators/affordability` | Income, debts, down payment, location, borrower goal. |
| Refinance Calculator | `/calculators/refinance` | Current loan, new rate, term, closing costs, breakeven. |
| Rent vs Buy Calculator | `/calculators/rent-vs-buy` | Rent, target city, price, timeline, down payment. |

## Directory/Search Pages

Create 5 directory/search pages:

- `/locations`
- `/loan-officers`
- `/branches`
- `/learning-center/search`
- `/loan-options`

Each directory should support enough mock filters to test:

- Keyword.
- State.
- City.
- Product.
- Borrower goal.
- Topic.
- Loan officer.
- Branch.

## Prototype Navigation Loops

The mock data should support these feedback paths:

1. Start on Austin city page, compare nearby cities, use the FHA module, choose Ava Martinez, and start lead capture.
2. Start on California state page, compare Irvine and San Diego, open jumbo product page, view Sofia Nguyen, and open Orange County Branch.
3. Start on Colorado Springs city page, use the VA loans module, compare Marcus Reed and Leah Foster, then use the payment calculator.
4. Start on Tampa city page, read insurance/refinance article, open refinance product page, and route to Daniel Price.
5. Start on Miami city page, see no nearby branch, route to Mia Alvarez or Florida fallback contact.
6. Start on calculator page, enter Austin scenario, view related city/product/expert recommendations.
7. Start on article page, navigate to related city, related product, and related loan officer.

## Prototype Edge Cases

The seed set should intentionally include:

- A city with multiple strong loan officer matches.
- A city with no branch but state-licensed LOs.
- A city with branch fallback but no direct LO.
- A product with multiple specialist LOs.
- A product with only statewide specialist fallback.
- A stale market metric requiring last-updated/source messaging.
- An article requiring compliance review.
- A payment example requiring assumptions and disclosures.
- A mobile table too wide for simple stacking.
- A search result with no matches.

## Mock Data File

The structured seed file should live at:

```txt
mock-data/prototype-seed.json
```

It should not be treated as a production schema. It is a prototype contract that helps designers and developers use the same fake entities, labels, relationships, and routes.

## Next Planning Step

After this seed plan is accepted, the next artifact should be a page-by-page low-fidelity wireframe checklist that maps each seeded route to actual placeholder block instances.

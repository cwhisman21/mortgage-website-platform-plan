# Prototype Route Inventory

Date: 2026-07-07

Status: Planning draft

## V1 Routed Prototype

Local prototype entry point:

`http://127.0.0.1:8791/site/index.html#/`

Implemented files:

- `site/index.html`
- `site/styles.css`
- `site/app.js`
- `site/assets/images/`
- `site/screenshots/`

Validation on 2026-07-07:

- 91 seeded routes rendered.
- Home search routed to Austin.
- Refinance calculator returned a route-specific result.
- Directory filtering returned matching results.
- Location-product anchor route rendered, including `#/locations/texas/austin#fha-loans`.
- Sampled desktop and mobile pages had no horizontal overflow.
- Browser console was clean.

## Purpose

This document lists every page route that should exist in the first clickable prototype. The goal is to make the prototype navigable enough for design feedback, content feedback, CTA feedback, and routing feedback.

This is not the production sitemap. It is the first testable content graph.

## Prototype Page Counts

| Page family | Count |
| --- | ---: |
| Site entry pages | 1 |
| State pages | 4 |
| City pages | 12 |
| Branch pages | 6 |
| Loan officer pages | 16 |
| Product pages | 8 |
| Rates pages | 1 |
| Blog / learning center section pages | 10 |
| Blog/news article pages | 24 |
| Calculator/tool pages | 4 |
| Directory/search pages | 5 |

Total prototype routes: 91.

## Site Entry Page

| Page | Route | Notes |
| --- | --- | --- |
| Home / path entry | `/` | Should not be a generic brochure homepage or a market dashboard. Use lead-in cards that route users to deeper pages for rates, locations, borrower goals, products, calculators, learning content, and local expert entry points. |

## State Pages

| Page | Route |
| --- | --- |
| Texas mortgage guide | `/locations/texas` |
| California mortgage guide | `/locations/california` |
| Colorado mortgage guide | `/locations/colorado` |
| Florida mortgage guide | `/locations/florida` |

## City Pages

| Page | Route |
| --- | --- |
| Austin, TX mortgage and housing market | `/locations/texas/austin` |
| Dallas, TX mortgage and housing market | `/locations/texas/dallas` |
| Houston, TX mortgage and housing market | `/locations/texas/houston` |
| Irvine, CA mortgage and housing market | `/locations/california/irvine` |
| San Diego, CA mortgage and housing market | `/locations/california/san-diego` |
| Sacramento, CA mortgage and housing market | `/locations/california/sacramento` |
| Denver, CO mortgage and housing market | `/locations/colorado/denver` |
| Colorado Springs, CO mortgage and housing market | `/locations/colorado/colorado-springs` |
| Boulder, CO mortgage and housing market | `/locations/colorado/boulder` |
| Tampa, FL mortgage and housing market | `/locations/florida/tampa` |
| Orlando, FL mortgage and housing market | `/locations/florida/orlando` |
| Miami, FL mortgage and housing market | `/locations/florida/miami` |

## Branch Pages

| Page | Route |
| --- | --- |
| Austin Central Branch | `/branches/austin-central` |
| Dallas North Branch | `/branches/dallas-north` |
| Houston West Branch | `/branches/houston-west` |
| Orange County Branch | `/branches/orange-county` |
| Denver Tech Center Branch | `/branches/denver-tech-center` |
| Tampa Bay Branch | `/branches/tampa-bay` |

## Loan Officer Pages

| Page | Route |
| --- | --- |
| Ava Martinez | `/loan-officers/ava-martinez` |
| Marcus Reed | `/loan-officers/marcus-reed` |
| Priya Shah | `/loan-officers/priya-shah` |
| Ethan Brooks | `/loan-officers/ethan-brooks` |
| Sofia Nguyen | `/loan-officers/sofia-nguyen` |
| Caleb Turner | `/loan-officers/caleb-turner` |
| Naomi Patel | `/loan-officers/naomi-patel` |
| Jordan Kim | `/loan-officers/jordan-kim` |
| Leah Foster | `/loan-officers/leah-foster` |
| Owen Blake | `/loan-officers/owen-blake` |
| Camila Torres | `/loan-officers/camila-torres` |
| Daniel Price | `/loan-officers/daniel-price` |
| Mia Alvarez | `/loan-officers/mia-alvarez` |
| Grace Morgan | `/loan-officers/grace-morgan` |
| Nolan Carter | `/loan-officers/nolan-carter` |
| Harper Ellis | `/loan-officers/harper-ellis` |

## Product Pages

| Page | Route |
| --- | --- |
| Home Purchase Loans | `/buy` |
| Refinance | `/refinance` |
| FHA Loans | `/loan-options/fha-loans` |
| VA Loans | `/loan-options/va-loans` |
| Conventional Loans | `/loan-options/conventional-loans` |
| Jumbo Loans | `/loan-options/jumbo-loans` |
| Home Equity / HELOC | `/home-equity` |
| Cash-Out Refinance | `/loan-options/cash-out-refinance` |

## Rates Pages

| Page | Route | Notes |
| --- | --- | --- |
| Mortgage Rates | `/rates` | Bankrate/NerdWallet-style rate comparison page with national averages, personalized filters, rate tables, rate trend context, local rate links, calculators, rate news, methodology, and disclosures. |

## Location Product Modules

These are embedded sections on city and state pages, not standalone routes. They can use anchors in the prototype for review.

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

## Blog / Learning Center Section Pages

These are the missing blog pages beyond individual article routes.

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

## Blog / News Article Pages

| Page | Route |
| --- | --- |
| Austin mortgage market update: payments, inventory, and buyer leverage | `/learning-center/austin-mortgage-market-update` |
| Dallas buyer update: comparing conventional and FHA payment paths | `/learning-center/dallas-buyer-market-update` |
| Houston refinance watch: equity, insurance, and payment tradeoffs | `/learning-center/houston-refinance-market-update` |
| Irvine jumbo buyer update: high-cost payment scenarios to watch | `/learning-center/irvine-jumbo-market-update` |
| San Diego VA and coastal affordability update | `/learning-center/san-diego-va-affordability-update` |
| Sacramento move-up buyer update: price and inventory context | `/learning-center/sacramento-move-up-market-update` |
| Denver relocation buyer update: payment scenarios and timing | `/learning-center/denver-relocation-market-update` |
| Colorado Springs VA buyer update: inventory and payment context | `/learning-center/colorado-springs-va-market-update` |
| Boulder high-cost market update: jumbo and self-employed borrowers | `/learning-center/boulder-jumbo-market-update` |
| Tampa refinance update: insurance costs and payment decisions | `/learning-center/tampa-refinance-market-update` |
| Orlando first-time buyer update: payment and inventory trends | `/learning-center/orlando-first-time-buyer-market-update` |
| Miami condo and jumbo buyer update: insurance and affordability | `/learning-center/miami-condo-jumbo-market-update` |
| How Texas property taxes affect mortgage payments | `/learning-center/texas-property-tax-mortgage-guide` |
| California taxes, insurance, and high-cost mortgage planning | `/learning-center/california-tax-insurance-mortgage-guide` |
| Colorado property tax and insurance considerations for buyers | `/learning-center/colorado-property-tax-insurance-guide` |
| Florida insurance costs and mortgage payment planning | `/learning-center/florida-insurance-mortgage-guide` |
| How FHA loans work for lower down payment buyers | `/learning-center/fha-loan-basics` |
| VA loan basics for eligible military borrowers | `/learning-center/va-loan-basics` |
| Jumbo loan basics for high-cost home purchases | `/learning-center/jumbo-loan-basics` |
| When refinancing may change your payment strategy | `/learning-center/refinance-basics` |
| First-time buyer checklist for comparing local markets | `/learning-center/first-time-buyer-local-market-checklist` |
| Move-up buyer guide: comparing payment, equity, and timing | `/learning-center/move-up-buyer-payment-equity-guide` |
| Home equity guide: HELOC and refinance options to compare | `/learning-center/home-equity-options-guide` |
| Cash-out refinance guide for homeowners with equity | `/learning-center/cash-out-refinance-guide` |

## Calculator / Tool Pages

| Page | Route |
| --- | --- |
| Mortgage Payment Calculator | `/calculators/mortgage-payment` |
| Affordability Calculator | `/calculators/affordability` |
| Refinance Calculator | `/calculators/refinance` |
| Rent vs Buy Calculator | `/calculators/rent-vs-buy` |

## Directory / Search Pages

| Page | Route |
| --- | --- |
| Locations overview/search | `/locations` |
| Loan officers directory | `/loan-officers` |
| Branches directory | `/branches` |
| Learning Center search | `/learning-center/search` |
| Loan options directory | `/loan-options` |

## Blog Page Structure Notes

The blog should not be a detached article list. It should be a structured Learning Center that connects articles back to:

- Locations.
- Products.
- Calculators.
- Loan officers.
- Branches.
- Borrower goals.
- Compliance/source metadata.

Minimum blog section blocks:

- Blog hero with search.
- Featured article.
- Topic navigation.
- Local market update feed.
- Product education feed.
- Borrower goal feed.
- State/city filter.
- Related calculators.
- Disclosure/review note where needed.

## Prototype Feedback Paths

The route inventory should support these navigation tests:

- City page to location product module to loan officer profile.
- Home lead-in card to rates/location/product/calculator/learning depth page.
- Rates page to calculator, local market page, and loan officer contact.
- State page to city comparison to city page.
- Blog home to topic hub to article to related city/product.
- Calculator result to city/product/expert recommendations.
- Directory search to filtered loan officer or branch result.
- City with no branch to state-licensed LO fallback.
- Product page to related city/state product module and specialist LO.

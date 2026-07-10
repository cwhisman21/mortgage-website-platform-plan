# Design Reference Examples

Date: 2026-07-07

Status: Approval draft

## Purpose

This document lists five outside examples for each prototype page type before we build the routed low-fidelity website prototype. The goal is not to copy any one site. The goal is to approve reference patterns for structure, navigation, density, content hierarchy, local data display, conversion behavior, and editorial trust.

Research note: Many lender and banking pages are JavaScript-heavy or partially inaccessible to text crawlers. Links here should be visually reviewed in-browser before final approval.

## 1. Homepage / Site Entry

| Example | URL | Useful pattern |
| --- | --- | --- |
| Rocket Mortgage | https://www.rocketmortgage.com/ | Mortgage-first nav with product, calculator, learning, and apply paths. |
| Better Mortgage | https://better.com/ | Simple fintech mortgage entry with direct conversion flow. |
| Zillow | https://www.zillow.com/ | Search-first real estate entry with mortgage and agent paths in nav. |
| Redfin | https://www.redfin.com/ | Search-first real estate entry with buy/sell/mortgage/agent ecosystem. |
| Bankrate | https://www.bankrate.com/ | Finance marketplace entry with tools, rates, editorial, and comparison surfaces. |

## 2. State Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Zillow Texas Housing Market | https://www.zillow.com/home-values/54/tx/ | State-level market facts, trend metrics, and city links. |
| Redfin Texas Housing Market | https://www.redfin.com/state/Texas/housing-market | State-level housing market snapshot and chart/report style. |
| Bankrate Texas Mortgage Rates | https://www.bankrate.com/mortgages/mortgage-rates/texas/ | State-localized mortgage rate page with personalized rate form. |
| NerdWallet Texas Mortgage Rates | https://www.nerdwallet.com/mortgages/mortgage-rates/texas | State-localized mortgage marketplace and education structure. |
| Zillow California Housing Market | https://www.zillow.com/home-values/9/ca/ | Same state data pattern in a high-cost state context. |

## 3. City Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Zillow Austin Housing Market | https://www.zillow.com/home-values/10221/austin-tx/ | City dashboard with metrics, home value data, rent data, listings, and financing CTA. |
| Redfin Austin Housing Market | https://www.redfin.com/city/30818/TX/Austin/housing-market | City market report with market stats and housing trend framing. |
| Realtor.com Austin Market | https://www.realtor.com/local/market/texas/travis-county/austin | Local market overview with inventory, price, and related market context. |
| NeighborhoodScout Austin Real Estate | https://www.neighborhoodscout.com/tx/austin/real-estate | Dense local data page with methodology/source notes. |
| Movoto Austin Market Trends | https://www.movoto.com/austin-tx/market-trends/ | Compact market trend page with city-level data and listing tie-in. |

## 4. Product Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Rocket Mortgage FHA Loans | https://www.rocketmortgage.com/learn/fha-loans | Product guide with requirements, benefits, qualification CTAs, and related links. |
| Rocket Mortgage VA Loans | https://www.rocketmortgage.com/learn/va-loans | Product guide with eligibility, tables, CTA paths, and related VA content. |
| Bankrate FHA Loans | https://www.bankrate.com/mortgages/fha-loans/ | Editorial product guide with author/reviewer trust layer. |
| Chase Refinance | https://www.chase.com/personal/mortgage/refinance | Bank product page for refinance conversion and education. |
| Bank of America Fixed-Rate Mortgage | https://www.bankofamerica.com/mortgage/fixed-rate-mortgage/ | Bank product page for product explanation and application path. |

## 5. Location Product Module

| Example | URL | Useful pattern |
| --- | --- | --- |
| Bankrate Texas Mortgage Rates | https://www.bankrate.com/mortgages/mortgage-rates/texas/ | Product/rate page localized to state with form, data, and editorial trust. |
| NerdWallet Texas Mortgage Rates | https://www.nerdwallet.com/mortgages/mortgage-rates/texas | Localized mortgage marketplace and education page. |
| NerdWallet First-Time Buyer Programs by State | https://www.nerdwallet.com/mortgages/learn/first-time-home-buyer-programs-by-state | Localized buyer-program structure by state. |
| The Mortgage Reports Texas First-Time Buyer Programs | https://themortgagereports.com/77780/texas-first-time-home-buyer-programs-grants | Localized buyer product/program guide. |
| Zillow Texas Mortgage Rates | https://www.zillow.com/mortgage-rates/tx/ | Localized mortgage-rate entry connected to Zillow Home Loans. |

Decision: these are structure references for embedded modules on city and state pages, not standalone routes.

## 6. Loan Officer / Expert Profile

| Example | URL | Useful pattern |
| --- | --- | --- |
| CrossCountry Mortgage Steve Cathey profile | https://crosscountrymortgage.com/san-diego-ca-8013/steve-cathey/ | Strong full-page LO structure: local hero, NMLS, apply/qualification CTAs, office contact, personal intro, reviews, resources, calculators, FAQ, and contact close. |
| Movement Mortgage Amanda Silber profile | https://movement.com/lo/amanda-silber | Strong standard LO profile with headshot/contact/NMLS hero, calculator and loan-fit action cards, reviews, social links, impact/trust block, blog feed, contact form, and detailed state licensing. |
| New American Funding Kaitlyn Scalera profile | https://www.newamericanfunding.com/mortgage_loans/kaitlynscalera/ | Conversion-heavy lender profile with NMLS, apply CTA, phone/email, review proof, promotional product module, education feed, and contact form. |
| Wells Fargo Laura Beck Brown profile | https://homeloans.wellsfargo.com/mortgage/ca/san-diego/laura | Large-bank mortgage consultant profile with specialty labels, reviews, apply/callback CTAs, NMLSR, locations, calculators/tools, FAQs, and trust layer. |
| Guild Mortgage Jason Cole profile | https://branches.guildmortgage.com/tn/franklin/jason-cole-245-chjac.html | Mortgage-specific LO profile with NMLS, branch/contact details, pre-approval/application CTAs, loan programs, calculators, contact form, state authorization, and licensing footer. |

Note: Redfin's agent profile remains useful only as an adjacent hero inspiration. The stronger approval set should be mortgage-native.

## 7. Branch / Location Page

Approved primary reference: Novus Home Mortgage Edina branch (`https://www.novushomemortgage.com/location/edina-branch/`).

Secondary mortgage-branch references remain useful for completeness checks, especially Guild's branch/LO entity pattern and CrossCountry's richer local office hub.

| Example | URL | Useful pattern |
| --- | --- | --- |
| Novus Home Mortgage Edina branch | https://www.novushomemortgage.com/location/edina-branch/ | Approved branch profile direction: manager, LO roster, NMLS IDs, address, local branch copy, service modules, and embedded calculator/product flow. |
| CrossCountry Mortgage San Diego branch | https://crosscountrymortgage.com/san-diego-ca-8013/ | Rich local office hub with hero, address, branch NMLS, office hours, specialties, team roster, support staff, resources, calculators, reviews, FAQs, and contact form. |
| New American Funding Temecula branch | https://www.newamericanfunding.com/branches/temecula | Mortgage branch page with review count, address/phone, local copy, branch team roster, loan products, calculators, housing/news content, Latino Focus module, and lead form. |
| Rate Roanoke branch | https://www.rate.com/branches/va/roanoke/3565-electric-roadsuite-b | Clean branch profile with breadcrumb, branch NMLS, address, phone, open/closed state, apply CTA, branch team, and product/program cards. |
| Fairway Saline branch | https://www.fairway.com/branch/saline-mi-643-48176-300 | Lighter branch shell with state/branch breadcrumb, apply CTA, address, phone, branch sharing, about copy, and link to all loan officers. |

## 8. Learning Center Home

| Example | URL | Useful pattern |
| --- | --- | --- |
| New American Funding Learning Center | https://www.newamericanfunding.com/learning-center/ | Mortgage-lender learning hub with category nav, featured articles, housing news, guides, videos, calculator CTA, newsletter, and compliance/footer structure. |
| Rocket Mortgage Learn | https://www.rocketmortgage.com/learn | Clean mortgage learning center with search, featured story, topic cards, featured resources, and apply/refinance CTA. |
| The Mortgage Reports | https://themortgagereports.com/ | Mortgage publication-style home with popular topics, rate/news modules, guides, lender reviews, and buyer/refi eligibility CTA. |
| Bankrate Mortgages | https://www.bankrate.com/mortgages/ | Editorial mortgage hub with rates, calculators, lender reviews, tools, topic navigation, and strong trust/disclosure layer. |
| Movement Mortgage Blog | https://movement.com/blog | Brand-forward lender blog with featured story, search, categories, article feed, tool links, and compliance footer. |

## 9. Blog Topic Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| New American Funding Homebuyers | https://www.newamericanfunding.com/learning-center/homebuyers/ | Deep topic page with subcategories, featured stories, grouped article feeds, dates, newsletter, and mortgage calculator cross-linking. |
| New American Funding Housing News | https://www.newamericanfunding.com/learning-center/housing-news/ | News topic page with current housing/mortgage headlines, subcategories, dated article cards, and source-aware editorial cadence. |
| Movement Market Update | https://movement.com/blog/category/market-update | Category page with featured market story, category rail, search, dated story feed, and lender compliance footer. |
| Movement Mortgage Sense | https://movement.com/blog/category/mortgage-sense | Educational topic feed with homeowner/buyer explainers, featured story, search, categories, dated cards, and related mortgage topics. |
| Rocket Mortgage Home Buying | https://www.rocketmortgage.com/learn/home-buying | Topic hub with search, featured story, subtopic tiles, resource carousel, and purchase CTA. |

## 10. Article Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Bankrate: How to Buy a House | https://www.bankrate.com/mortgages/how-to-buy-a-house/ | Strongest editorial trust model: author/editor bios, disclosure, table of contents, key takeaways, FAQs, citations, feedback, and related articles. |
| Rocket Mortgage: How to Buy a House | https://www.rocketmortgage.com/learn/how-to-buy-a-house | Mortgage-conversion article with author/fact-checking, updated date, read time, table of contents, inline product CTAs, and related links. |
| New American Funding: Great, You're Pre-Approved | https://www.newamericanfunding.com/learning-center/homebuyers/great-youre-preapproved-now-its-time-to-secure-the-mortgage/ | Lender article with category breadcrumb, author/date, in-article CTAs, related articles, latest videos, calculators, newsletter, and licensing footer. |
| New American Funding: Mortgage Rates Fall | https://www.newamericanfunding.com/learning-center/housing-news/mortgage-rates-fall-to-a-seven-week-low/ | Short news article pattern with source references, market context, quick apply CTA, author card, related/latest content, and calculator links. |
| Movement Mortgage: June 2026 Market Update | https://movement.com/blog/2026/06/june-2026-market-update | Market-update article with share actions, source-linked data points, plain-language sections, related stories, and lender compliance footer. |

## 11. Rates Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Bankrate Mortgage Rates | https://www.bankrate.com/mortgages/mortgage-rates/ | Rate comparison hub with mortgage-rate nav, rate products, calculators, news, rate-lock education, methodology, and disclosure/trust layer. |
| NerdWallet Mortgage Rates | https://www.nerdwallet.com/mortgages/mortgage-rates | Consumer-friendly rate page with today's rates framing, rate/news analysis, education, and comparison-oriented routing. |
| Bankrate 30-Year Mortgage Rates | https://www.bankrate.com/mortgages/30-year-mortgage-rates/ | Rate-type specific page that can inform child rate sections and product-specific rate modules. |
| NerdWallet Refinance Rates | https://www.nerdwallet.com/mortgages/refinance-rates | Refinance-specific rate comparison and education structure. |
| Mortgage News Daily Mortgage Rates | https://www.mortgagenewsdaily.com/mortgage-rates | Daily rate tracking and trend/news orientation for market context. |

## 12. Calculator / Tool Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| NerdWallet Mortgage Calculator | https://www.nerdwallet.com/mortgages/calculators/mortgage-calculator | Calculator with taxes/insurance/PMI and educational support. |
| Bankrate Mortgage Calculator | https://www.bankrate.com/mortgages/mortgage-calculator/ | Calculator with inputs, results, assumptions, and related mortgage content. |
| Zillow Mortgage Calculator | https://www.zillow.com/mortgage-calculator/ | Consumer-friendly payment calculator tied to home search and financing. |
| Rocket Mortgage Calculator | https://www.rocketmortgage.com/calculators/mortgage-calculator | Mortgage calculator connected to application and product pathways. |
| Calculator.net Mortgage Calculator | https://www.calculator.net/mortgage-calculator.html | Dense utility-first calculator with tables and amortization-style detail. |

## 13. Directory / Search Page

| Example | URL | Useful pattern |
| --- | --- | --- |
| Zillow Homes Search | https://www.zillow.com/homes/ | Filterable search, saved search, empty state, and listing cards. |
| Redfin Austin Homes Search | https://www.redfin.com/city/30818/TX/Austin | Dense filter/search/listing result interface. |
| Realtor.com Austin Search | https://www.realtor.com/realestateandhomes-search/Austin_TX | Search result page with filters, cards, and local SEO framing. |
| Guild Mortgage Branch / LO Finder | https://branches.guildmortgage.com/ | Mortgage-specific directory for branches and loan officers. |
| Bankrate Mortgage Reviews | https://www.bankrate.com/mortgages/reviews/ | Provider-review directory pattern for mortgage comparison. |

## Approved Reference Decisions

### Homepage / Site Entry

Approved direction: Rocket Mortgage plus loanDepot, revised to use a Veterans United-style lead-in card grid.

Use Rocket for mortgage-first navigation, product paths, calculators, learning center access, and strong primary CTAs. Use loanDepot for the simpler purchase/refinance split, lender credibility, rate/payment entry points, product cards, and direct-lender feel. Do not use the home page as a market dashboard. Reserve it for lead-in cards that route users into deeper pages for rates, locations, products, calculators, learning content, and loan officer matching.

### State And City Pages

Approved direction: Redfin-style market data and chart structure, adapted for a narrower content column and mortgage-specific modules.

Use Redfin for market snapshot density, chart-forward layout, trend language, related-market navigation, and local report pacing. Add the platform-specific sections previously outlined: local loan officers, branches, product paths, local articles/news, FAQs, contextual mortgage CTAs, data/source dates, compliance disclosures, and future Snap Homes hooks.

### Product Pages

Approved direction: same chart/data/product intelligence posture as the state and city pages, with Bankrate's FHA lender page as the key structure reference.

Reference: https://www.bankrate.com/mortgages/best-lenders/fha-mortgage-lenders/#largest

Use Bankrate's combination of editorial trust metadata, table of contents, lender/product comparison table, qualification guidance, largest-provider context, FAQ, methodology/disclosure language, related articles, and clear product navigation. Narrow the content column and add our mortgage-specific routing: related state/city product modules, nearby loan officers/branches, location-specific requirements or limits, calculator handoffs, and sticky contextual CTAs.

### Rates Pages

Approved direction: Bankrate plus NerdWallet.

References:

- https://www.bankrate.com/mortgages/mortgage-rates/
- https://www.nerdwallet.com/mortgages/mortgage-rates

Use Bankrate for rate comparison structure, mortgage-rate navigation, calculator/news links, methodology, and disclosure/trust layer. Use NerdWallet for consumer-friendly rate framing, plain-language analysis, and comparison-oriented routing. The rates page should include current rate snapshot cards, personalized filters, purchase/refinance rate tables, trend context, local/state rate links, related calculators, rate news, methodology, APR assumptions, and compliance disclosures.

### Location Product Modules

Approved direction: do not create standalone location-specific product routes. FHA, VA, jumbo, refinance, and similar local product content should appear as sections on city and state pages, with links back to the canonical product pages.

### Loan Officer Profiles

Approved direction: New American Funding plus Movement Mortgage's Amanda Silber profile.

References:

- https://www.newamericanfunding.com/mortgage_loans/kaitlynscalera/
- https://movement.com/lo/amanda-silber

Use New American Funding for conversion-heavy profile structure: top apply CTA, phone/email, review proof, product/promotion modules, education feed, and detailed contact form. Use Movement's Amanda Silber profile for the stronger standard LO identity layer: headshot/contact/NMLS hero, calculator and loan-fit cards, reviews, social links, impact/trust block, blog feed, office/address data, state licenses, and licensing footer.

Any performance or proof stats must be admin-controlled, sourceable, and compliance-reviewed before publication.

### Branch Profiles

Approved direction: Novus Home Mortgage's Edina branch.

Reference:

- https://www.novushomemortgage.com/location/edina-branch/

Use Novus for the branch-page structure: branch name and phone in the top identity area, branch manager card, loan officer roster with NMLS IDs and profile links, address/map block, local "proud to serve homebuyers" copy, service modules, embedded mortgage calculator flow, and clear product/loan-process education below the branch identity. Keep Guild, CrossCountry, and New American Funding as secondary checks for mortgage-specific branch completeness: branch NMLS/licensing, office hours, reviews/proof, FAQs, lead form, and stronger local office routing.

## Recommended Approval Path

Approve references in this order:

1. Homepage and city page.
2. State page and location product module.
3. Product page and calculator page.
4. Learning Center home, topic page, and article page.
5. Loan officer, branch, and directory/search pages.

## Early Design Direction From Research

- The strongest page pattern for this project is a hybrid of Zillow/Redfin city market pages, Rocket Mortgage learning/product pages, Bankrate/NerdWallet editorial trust, and Guild-style local expert placement.
- City and state pages should borrow dashboard density from Zillow/Redfin, but add mortgage-specific CTA logic and LO/branch placement.
- Product and article pages should include author/reviewer/source metadata from the beginning.
- Directory pages should behave more like product search/results pages than static lists.
- Calculators should preserve scenario context and route users into city/product/expert recommendations.

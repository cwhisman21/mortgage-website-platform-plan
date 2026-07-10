# V1 PRD

Date: 2026-07-07

Status: Planning draft

## Product Decision

V1 should be a Snap Mortgage acquisition surface with Snap Homes intelligence hooks.

The public site should primarily educate borrowers and create qualified mortgage opportunities for loan officers and branches. It should also preserve structured consumer-intelligence context that can later feed Snap Homes experiences when a user saves a market, claims a property, starts a journey, or returns with a known identity.

## Problem

Most mortgage websites are generic brochure and application funnels. They do not give borrowers a strong local understanding of affordability, inventory, taxes, insurance, loan options, and local expert coverage before asking them to convert.

The platform should make local mortgage research useful enough to earn organic demand, then route that demand to the right mortgage team with clear context.

## V1 Outcome

V1 succeeds when city, state, product, article, loan officer, and branch pages work together as a structured content graph that:

- Helps borrowers understand local mortgage and housing conditions.
- Captures user intent before requiring a full mortgage application.
- Routes qualified leads or opportunities to relevant loan officers or branches.
- Gives editors and admins control over market data, relationships, CTAs, SEO, and compliance review.

## First Conversion Object

The first conversion object is a `lead_or_opportunity_record`, not a full mortgage application.

Each conversion should capture:

- Source page.
- Location context.
- Product interest.
- Calculator or scenario inputs when available.
- Article path or referring content.
- Selected loan officer or branch when available.
- Borrower intent.
- Consent fields.
- Assigned loan officer or branch.
- Routing reason.

## Primary Audiences

- First-time buyers researching affordability and local requirements.
- Move-up buyers comparing cities, payment scenarios, and timing.
- Refinancing homeowners watching rates, equity, and payment tradeoffs.
- Home equity borrowers.
- Veterans and VA borrowers.
- Self-employed, jumbo, and other product-specific borrowers.
- Real estate referral partners.
- Loan officers and branch teams who need local placement and context-rich opportunities.

## V1 Public Surfaces

V1 should define requirements for these public page families:

- State pages.
- City pages.
- Product pages.
- Blog/news articles.
- Loan officer profiles.
- Branch profiles.
- Calculator/tool pages.
- Search and directory pages.

The highest-priority public surface is the city page because it combines market data, editorial content, local expert placement, and intent capture.

## City Page Requirements

City pages should be dashboard-first, with short editorial support rather than long generic copy.

Required modules:

- Hero with city/state context and primary CTA.
- Market snapshot cards.
- Home price trend chart.
- Payment scenario chart or table.
- Inventory or days-on-market chart.
- Property tax and insurance table.
- Nearby city comparison table.
- Buyer guidance.
- Refinance guidance.
- Related loan products.
- Local loan officer cards.
- Nearby branch cards.
- Local news/editorial feed.
- FAQ.
- Compliance/disclosure block.
- Desktop sticky CTA rail and mobile sticky CTA bar.

Publication requires enough unique local data, useful local context, related experts or fallback routing, and compliance-ready disclosures.

## Product And Location Product Module Requirements

Product pages should explain borrower fit, requirements, benefits, tradeoffs, examples, FAQs, calculators, specialist loan officers, related locations, and related articles.

Location-specific product content should be a module on the relevant city or state page, not a standalone route. These modules must add location-specific market facts, local loan officers or branch fallback routing, local articles, and location-specific FAQs. They should link to canonical product pages rather than creating duplicate product pages with city or state names swapped in.

## CMS/Admin Requirements

The admin should be a mortgage operating CMS, not a generic page builder.

V1 planning should cover admin objects for:

- Locations.
- Loan officers.
- Branches.
- Products.
- Blog/news.
- Market data.
- Page templates.
- CTA rules.
- SEO.
- Compliance.
- Leads/opportunities.
- AI writer briefs.
- Settings.

Editors should own copy and articles. Admins or data managers should own structured facts, charts, relationships, and CTA rules. Overrides should be allowed, visible, reviewable, and versioned.

## Placement And Routing Requirements

Loan officer placement should be explainable.

Ranking factors:

- Licensed state.
- City or nearby office/service area.
- Product specialty.
- Language fit.
- Availability.
- Priority market assignment.
- Admin override.

Fallback behavior:

- City-based loan officers first.
- Nearby branch coverage second.
- State-licensed specialists third.
- Company or branch contact routing if no appropriate individual loan officer exists.

Every routed opportunity should store the routing reason.

## Compliance Requirements

Compliance review and data provenance are first-class v1 requirements.

Content requiring explicit review includes:

- Rates and APR.
- Payment examples.
- Qualification or eligibility claims.
- State-specific mortgage claims.
- Down payment assistance.
- Loan officer licensing claims.
- AI-written local news.
- Product comparisons.

Each sensitive module should support assumptions, source, effective date, last reviewed date, reviewer or approver, attached disclosures, and version history.

## Snap Homes Intelligence Hooks

V1 should not become a full Snap Homes product, but it should preserve signals that can later power one.

Useful hooks:

- Saved city or state interest.
- Calculator scenario inputs.
- Product interest.
- Repeated article or city visits.
- Claimed or entered property address.
- Market-following or newsletter intent.
- Preferred loan officer or branch.
- Buyer, refinance, home equity, or browsing intent.

Important boundary:

- City and state pages are market/content/service-area context.
- A property address record should exist only when a user enters, claims, or otherwise identifies a specific property.

## Non-Goals

V1 planning should not assume:

- A framework or production implementation stack.
- A full mortgage application.
- A generic CMS-only architecture.
- Thin city SEO pages.
- AI auto-publishing without editorial and compliance review.
- A full Snap Homes consumer account system.

## Acceptance Criteria

Before implementation starts, the repo should contain:

- A PRD with v1 scope and non-goals.
- Wireframes for city, state, product, article, loan officer, and branch pages.
- CMS/admin object model.
- Data schema proposal for the content graph.
- Page module inventory with required and optional modules.
- Lead/opportunity routing requirements.
- Compliance review workflow and source/provenance rules.
- Implementation issues that can be picked up independently.

## Open Questions

- Which city/state markets are the first launch targets?
- Which market data sources are acceptable for v1?
- What lead system or CRM should receive opportunities?
- How much of the admin should be custom versus configured in an existing CMS?
- Which roles can publish, approve, override relationships, and change CTA rules?
- What is the minimum viable calculator/tool set for launch?
- How should local news be handled before the n8n/AI pipeline exists?

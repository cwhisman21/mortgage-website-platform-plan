# Snap Mortgage Public Site Production Content Story Packet

**Story ID:** `snap-public-site-production-content-2026-07-13`  
**Status:** `awaiting-approval`  
**Factual review date:** 2026-07-13  
**Publication state:** Prepared for review; not published by this packet

## Original Request

Audit and rewrite every borrower-visible surface of the Snap Mortgage public site so the entire experience is useful, factual, production-ready, and consistent with the approved Snap ecosystem boundaries. This includes home and conversion copy, rates, products, locations, state and city templates, calculators, directories, loan-officer and branch surfaces, articles, topic hubs, metadata, CTAs, shared chrome, and empty, loading, and error states.

## Binding Constraints

- Preserve the current canonical static-site architecture, route inventory, approved Figma structures, internal links, and approved CTA capabilities.
- Keep the homepage hero asset work paused. Do not modify root `index.html`, `site/assets/slot-hero/`, slot-hero screenshots, or delegated hero kits.
- Keep the build frontend-only. Provider feeds, accounts, licensing, reviews, ranking, CRM routing, prequalification, and Snap Homes destinations remain replaceable or simulated interfaces.
- Do not invent rates, APRs, fees, payments, savings, licensing, reviews, eligibility, product availability, company proof, or underwriting outcomes.
- No real borrower PII, authentication, credit decision, document upload, or backend persistence.
- Use borrower-facing language only. Never expose fixture IDs, schema names, generator language, review states, or planning terminology.
- Keep transactional, rate, eligibility, calculator, disclosure, and hardship copy restrained. Educational content may use a warmer, more engaging voice when clarity is preserved.
- Use only existing approved actions: account/login modal, lead/contact modal, prequalification start, rate review, Compare Offer, Add to watchlist, and valid public routes.
- Show `Last updated` on every factual public page. Show `As of` beside every time-sensitive figure.

## Audience And Decisions

- **Primary audience:** anonymous prospective borrower comparing mortgage paths, local conditions, products, costs, and professionals.
- **Secondary audience:** returning Snap Homes customer using the public site before continuing to an existing account experience.
- **Primary decision:** choose the next useful comparison, calculation, product guide, location guide, provider result, or licensed conversation without being forced through a gate.
- **Secondary decision:** understand what is educational, what is illustrative, what requires borrower/property review, and what happens after a CTA.

## Page-Type Questions

| Page type | Customer question the page must answer |
| --- | --- |
| Home/conversion | Where should I start, and what will happen when I act? |
| Rates | What am I comparing, under which assumptions, and how do rate, APR, points, fees, payment, and time horizon differ? |
| Product | Who commonly evaluates this option, what does it cost, what are its constraints, and what alternatives should I compare? |
| State/city | What is materially different here, which dated local measures matter, and how might they change the mortgage plan? |
| Calculator | What assumptions drive the estimate, what is excluded, and how should I interpret the result? |
| Directory | What can I find here, how do results differ, and which route is useful next? |
| Loan officer/branch | What verified public information is available, where is service offered, and what does contact do? |
| Article/topic hub | What is the direct answer, evidence, example, tradeoff, and next useful action? |
| Contributor | What topics does this contributor cover, and which published work can I read? |
| Empty/loading/error | What happened, what can I safely do next, and which public route still works? |

## Canonical Evidence Record

1. `mock-data/editorial/source-ledger.json` and compiled `mock-data/editorial-content.json` for educational and article claims.
2. `mock-data/location-news-source-manifest.json`, location-news source caches, and generated source ledgers for Census, BLS, FHFA, HUD, and related local-market claims.
3. `mock-data/production-seed.json` for canonical public entities, routes, approved CTA inventory, and mock profile/branch records.
4. `mock-data/product-copy.json` for product explanations and public source links.
5. `mock-data/rates-marketplace-fixtures.json` for explicitly illustrative sample-offer content only.
6. Current primary agency and government sources when a volatile or regulated claim is not adequately supported by those records.

Every material claim record must preserve source name, URL or internal ID, period, geography, retrieval or review date, limitation, and approval state. Unsupported claims are removed, qualified, or reported as a data gap; they are never filled by inference.

## Draft Acceptance Criteria

- The first 100 words of every substantive page answer its primary customer question.
- Every meaningful paragraph supplies an answer, fact, explanation, example, tradeoff, consequence, decision criterion, or specific approved action.
- All routes have unique, useful titles and meta descriptions.
- Every location has at least three genuinely local findings and no unsupported local claim.
- Product pages explain mechanics, common fit, costs, tradeoffs, alternatives, reviewed facts, and educational boundaries.
- Calculator pages explain inputs, assumptions, exclusions, result interpretation, and what licensed review adds.
- Rates distinguish public benchmarks, illustrative sample offers, and personalized review.
- Contributor and profile content contains no invented credentials, contact details, social links, experience, licensing, or testimonials.
- All internal links resolve to public routes; no dead or empty navigation controls remain.
- All borrower-visible copy passes the repository copy guard and contains no placeholder or internal planning language.
- Customer-useful mortgage audit scores at least 17/20, with 2/2 for Evidence, Trust, Product accuracy, and CTA clarity before release.

## Required Independent Stages

1. Editorial commission and contract.
2. Primary-source research and claim-ledger validation.
3. Draft and implementation against the canonical records.
4. Developmental review.
5. Fact and copy review.
6. Customer-useful mortgage audit.
7. Mortgage content compliance review.
8. Snap QA, browser verification, and independent release review.

## Open Data Boundaries

- Marketplace providers, NMLS displays, prices, ratings, and reviews are illustrative fixture content until replaced by the connected provider system.
- Rates and local-market feeds remain replaceable data adapters; their current public values must retain source and date labels.
- Account, Snap Homes, lead routing, Compare Offer, and prequalification outcomes remain simulated frontend handoffs.
- Full home search and saved-search controls remain Phase 3 or existing Snap Homes capabilities.

## Approval And Publication

The user approved implementation of this content pass. Publication or deployment is a separate execution gate and requires explicit authorization plus clean verification evidence.

## Implementation Result

- Rewrote and validated borrower-visible content across shared chrome, conversion pages, rates, products, calculators, locations, directories, contributor and editorial surfaces, CTA notices, metadata, and generated route documents.
- Preserved the approved location-news corpus: 788 state/city bundles and 3,152 locally attributed articles, with four articles per location.
- Completed the frontend rates marketplace with purchase/refinance scenarios, company/loan-officer result modes, cost sorting, expandable details, payment assumptions, accessible chart controls, and a no-PII prequalification handoff.
- Prevented unsupported term repricing: the current fixtures contain 30-year samples, and other selected terms now return a no-match state instead of relabeling 30-year pricing.
- Corrected down-payment synchronization, form validation, URL/account/cache precedence, stale handoff recovery, simplified-APR labeling, and borrower-facing sample-pricing disclosures.
- Kept root `index.html` and `site/assets/slot-hero/` unchanged as required by the paused hero boundary.

## Validation Evidence

- `node --test`: 276 tests passed, 0 failed.
- `node site/phase2-static-smoke.mjs`: 872 routes checked and passed.
- `node mock-data/generate-static-routes.mjs --check`: 871 generated non-root route documents are fresh.
- Focused rates, prequalification, and public-copy suite: 38 tests passed, 0 failed.
- `git diff --check`: passed; Git reported only existing LF-to-CRLF working-copy notices.
- Local server response: `http://127.0.0.1:8791/site/index.html` returned HTTP 200.
- Protected homepage hero boundary SHA-256: `04D4D8D3A16A38EB459C830D0D586BF6053B661FCA47A8002DEAF909C2AE0541`.

## Release Boundaries

This build is ready for stakeholder, legal, and compliance review but not for production publication. Provider pricing, provider identities, licensing, reviews, account/authentication, Snap Homes navigation, lead and CRM routing, prequalification decisions, Compare Offer processing, persistent watchlists, and live local-market data remain simulated or adapter-backed. Full home search remains a Phase 3 candidate.

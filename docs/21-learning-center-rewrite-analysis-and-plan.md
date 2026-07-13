# Learning Center Rewrite Analysis and Editorial Plan

Date: 2026-07-13

Status: Commissioned; research and rewrite planning complete; drafting not started

Live target: https://mortgage-website-platform-plan-chi.vercel.app/learning-center

## Executive Decision

Rewrite the Learning Center as a decision-led editorial system, not as a set of generic category and article templates.

The current experience has a useful content graph and sensible safety language, but its public copy still explains the prototype instead of answering borrower questions. The most serious problem is structural: 24 legacy article records with different titles, topics, locations, and products all resolve through one generic article body. A reader opening an FHA guide, Florida insurance guide, Austin market update, or cash-out refinance guide receives substantially the same argument, takeaways, questions, sources, and next steps.

The rewrite should preserve the structured relationships while replacing the generic body with four evidence contracts and eight topic-specific editorial assignments. Drafting should begin with the Learning Center home, the buying hub, and four cornerstone guides; local market updates should move onto the already-built source-backed local-news system rather than receive 12 manual one-off rewrites.

## Scope and Collection Method

This analysis covers:

- The Learning Center home.
- Nine adjoining topic/about pages: Local Market Updates, Buying a Home, Refinance, FHA Loans, VA Loans, Jumbo Loans, Home Equity, Taxes & Insurance, and Editorial Team.
- All 24 legacy article records exposed through those hubs.
- The relationship between those pages and the separate 3,152-page generated local-news corpus.

Collection occurred on 2026-07-13. A respectful same-domain HTTP crawl of the live URL returned the JavaScript application shell but no rendered links. Browser-rendered extraction timed out. Coverage was therefore verified against the deployed route configuration, the current public renderers, the production content seed, and the generated article index in this source-of-truth repository. Live links below identify the intended deployed routes; this report does not claim that every route was visually inspected in a rendered browser.

## What Works Now

- The information architecture recognizes useful borrower topics and connects articles to products, locations, calculators, and licensed help.
- The home has clear discovery surfaces: search, topic hubs, featured articles, calculators, and loan paths.
- Copy generally avoids guaranteed approval, universal eligibility, and personalized-advice implications.
- Article pages reserve space for update details, sources, disclosures, tools, and contextual calls to action.
- The generated local-news corpus has a materially stronger evidence model: source records, methodology, limitations, review status, compliance status, structured visuals, and related routes.

These are system strengths worth preserving. They are not yet a substitute for distinct editorial substance.

## Blocking Findings

### 1. Distinct titles lead to a generic article

All 24 legacy records use the same body structure and nearly identical prose. Only the article type, location labels, and related product names change. This breaks the title promise, produces thin pages, weakens trust, and creates substantial search-quality risk.

Pass condition: every published article must contain a thesis, questions, evidence, examples, tradeoffs, and next action specific to its assignment.

### 2. The site speaks about its content system instead of solving a decision

Examples include phrases such as “articles link back,” “topic hubs,” “related paths,” “this article connects,” and “the reader can understand.” These are product-spec explanations, not borrower guidance.

Pass condition: headings and introductions lead with the reader's decision, not the site's architecture.

### 3. The Local Market Updates hub does not surface the real local-news corpus

The hub features three legacy articles while 3,152 source-backed generated articles live under `/learning-center/market-news/`. The Learning Center search model also includes legacy articles and topic pages, not the generated index.

Pass condition: the market-update hub and search use the generated index, with geography, topic, source, and freshness filters.

### 4. Trust labels are asserted more strongly than the workflow supports

The public renderer converts `draft`, `editor_reviewed`, and `compliance_review_required` into the same label: “Mortgage guide.” Nine records are marked editor reviewed, three draft, and twelve compliance review required. None of those internal states should be flattened into a public trust signal.

Pass condition: only approved publication states are public. Draft or compliance-pending content is preview-only or unpublished. Public pages show a named author/reviewer, review date, sources, and correction policy when those facts exist.

### 5. Sources are generic rather than claim-specific

The shared legacy template attaches FHFA HPI, Freddie Mac PMMS, and Regulation Z to every article, whether the subject is FHA eligibility, VA loans, state insurance, taxes, home equity, or a city market.

Pass condition: every material claim maps to a relevant primary source, geography, effective date, and claim state.

### 6. CTAs arrive before sufficient value and overuse lead capture

The Learning Center home places a prequalification block before featured editorial content. Topic pages lead with “Get guidance.” Articles lead with a lead form. This makes an education surface feel like a disguised funnel.

Pass condition: early CTAs help the reader continue the decision—compare, calculate, check a local rule, or save—while licensed-contact and prequalification CTAs appear after meaningful education or when intent is explicit.

## Page-Family Analysis

### Learning Center home

Current promise: “Mortgage education connected to local decisions.” This is strategically correct but abstract. The page lists formats rather than helping a visitor identify their question. Featured cards expose only a title and generic “Mortgage guide” label; they do not communicate who the article is for, what decision it helps make, source date, geography, or reading value.

Rewrite direction:

- Headline around a job: understand a mortgage decision before acting.
- Lead with four intent paths: buy, refinance, use equity, understand a local market.
- Place search and “start here” guidance above conversion.
- Turn article cards into decision cards with audience, takeaway, geography, update date, and related tool.
- Surface current local reporting from the generated corpus.
- Move prequalification lower; use a calculator or market-search CTA first.
- Add “How we review” as a compact trust module linking to a real standards page.

### Topic hubs

All ordinary hubs currently reuse the same overview with the topic name substituted. They promise beginner education, comparisons, local details, and next steps without providing a topic-specific orientation.

Each hub needs:

- A one-paragraph answer to the topic's central question.
- A “start here” cornerstone guide.
- A decision tree or comparison module specific to the topic.
- Topic-specific tools, official sources, and local modules.
- Freshness and review language appropriate to the claims.

Hub distinctions:

| Hub | Reader job | Required distinctive module |
| --- | --- | --- |
| Buying a Home | Prepare to compare homes, cash, payment, and loan paths | Buying sequence and cash-to-close checklist |
| Refinance | Decide whether changing the loan improves the full outcome | Break-even, term, closing-cost, and total-interest comparison |
| FHA Loans | Understand fit, limits, mortgage insurance, and tradeoffs | FHA requirements/limits table from HUD sources |
| VA Loans | Understand eligibility, entitlement, funding fee, and property process | VA entitlement and funding-fee explainer from VA sources |
| Jumbo Loans | Understand threshold, reserves, documentation, and pricing variability | County-limit boundary and lender-variation explainer |
| Home Equity | Compare HELOC, home-equity loan, and cash-out refinance | Side-by-side product comparison with variable-rate risks |
| Taxes & Insurance | Model local ownership costs without treating estimates as quotes | Cost-component worksheet and jurisdiction/source finder |
| Local Market Updates | Find current evidence for a geography | Generated-news feed with geography, topic, source, and freshness filters |

### Editorial Team page

The current page describes helpful content attributes but does not identify an editorial team, reviewer qualifications, correction process, sourcing standard, update cadence, AI policy, or distinction between editorial and commercial influence.

Rewrite direction: rename it “Editorial standards and review,” unless real staff profiles are available. Publish verifiable authors and reviewers only. Include source hierarchy, claim states, update triggers, correction process, AI-use policy, compliance gate, commercial independence, and contact method for corrections.

### Legacy article template

The shared body is usable only as scaffolding. It does not fulfill any of the 24 titles. Replace it with four article contracts:

1. Local market update: dated market question, local metrics, comparisons, what changed, what the data cannot establish, borrower implications, related local tool/expert.
2. Tax/insurance explainer: jurisdiction, cost component, source/assessment mechanics, escrow/payment effect, estimate limitations, questions for local professionals.
3. Product explainer: who may consider it, authoritative rules, costs, tradeoffs, documents/process, comparison alternatives, explicit non-eligibility boundary.
4. Borrower-intent guide: decision sequence, checklist, scenario comparisons, common mistakes, tool handoffs, when licensed review becomes necessary.

## Complete Legacy Article Inventory and Rewrite Disposition

Every route below currently requires replacement of the generic body. The status is source metadata, not a publication-readiness verdict from this review.

| Article | Family | Current status | Rewrite disposition |
| --- | --- | --- | --- |
| [Austin mortgage market update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/austin-mortgage-market-update) | Local market | editor reviewed | Redirect or rebuild from Austin generated evidence |
| [Dallas buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/dallas-buyer-market-update) | Local market | draft | Redirect or rebuild from Dallas generated evidence |
| [Houston refinance watch](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/houston-refinance-market-update) | Local market | compliance required | New brief combining local evidence with refinance tradeoffs |
| [Irvine jumbo buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/irvine-jumbo-market-update) | Local market | editor reviewed | New brief combining county limits and local affordability |
| [San Diego VA affordability update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/san-diego-va-affordability-update) | Local market | editor reviewed | New brief; VA claims require official VA evidence |
| [Sacramento move-up buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/sacramento-move-up-market-update) | Local market | draft | Reframe around sell/buy timing and payment scenarios |
| [Denver relocation buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/denver-relocation-market-update) | Local market | editor reviewed | Reframe around relocation decision inputs |
| [Colorado Springs VA buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/colorado-springs-va-market-update) | Local market | editor reviewed | New brief; local data plus official VA evidence |
| [Boulder high-cost market update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/boulder-jumbo-market-update) | Local market | compliance required | Separate market evidence from self-employed/jumbo rules |
| [Tampa refinance update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/tampa-refinance-market-update) | Local market | editor reviewed | New brief centered on insurance and refinance break-even |
| [Orlando first-time buyer update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/orlando-first-time-buyer-market-update) | Local market | draft | New brief linking local costs to first-time-buyer preparation |
| [Miami condo and jumbo update](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/miami-condo-jumbo-market-update) | Local market | compliance required | Split condo/project risks from jumbo threshold discussion |
| [Texas property taxes and mortgage payments](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/texas-property-tax-mortgage-guide) | Tax/insurance | compliance required | Cornerstone state explainer with county/appraisal boundaries |
| [California taxes, insurance, and high-cost planning](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/california-tax-insurance-mortgage-guide) | Tax/insurance | compliance required | Split tax, insurance availability, and loan-limit questions |
| [Colorado property tax and insurance](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/colorado-property-tax-insurance-guide) | Tax/insurance | editor reviewed | Replace with sourced state process and estimate limitations |
| [Florida insurance costs and mortgage planning](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/florida-insurance-mortgage-guide) | Tax/insurance | compliance required | Priority cornerstone; current insurance evidence required |
| [How FHA loans work](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/fha-loan-basics) | Product | compliance required | Priority cornerstone from HUD/FHA sources |
| [VA loan basics](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/va-loan-basics) | Product | compliance required | Priority cornerstone from VA sources; revise audience wording |
| [Jumbo loan basics](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/jumbo-loan-basics) | Product | compliance required | Explain threshold versus lender-specific underwriting |
| [When refinancing may change your payment strategy](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/refinance-basics) | Product | compliance required | Priority cornerstone with break-even and total-cost framework |
| [First-time buyer local-market checklist](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/first-time-buyer-local-market-checklist) | Borrower guide | editor reviewed | Priority cornerstone checklist with staged actions |
| [Move-up buyer payment, equity, and timing guide](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/move-up-buyer-payment-equity-guide) | Borrower guide | editor reviewed | Scenario-led guide; avoid assumed equity or sale outcome |
| [Home equity options guide](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/home-equity-options-guide) | Borrower guide | compliance required | Compare HELOC, home-equity loan, and cash-out refinance |
| [Cash-out refinance guide](https://mortgage-website-platform-plan-chi.vercel.app/learning-center/cash-out-refinance-guide) | Borrower guide | compliance required | Explain balance, costs, term, payment, and equity tradeoffs |

## Editorial Assignment Contract

- Story ID: `LC-REWRITE-2026-01`
- Status: `commissioned`
- Decision: commission a Learning Center system rewrite; do not polish the generic article body.
- Working premise: help borrowers identify the mortgage decision they face, understand authoritative and local evidence, compare tradeoffs, and choose an appropriate tool or licensed next step.
- Primary audience: cautious, time-constrained borrowers in research and comparison stages.
- Desired action: continue into the most relevant guide, calculator, local market, or licensed conversation—not immediate conversion by default.
- Voice: plain, calm, specific, analytically useful, locally aware, and transparent about uncertainty.
- Included: home, hubs, editorial standards, 24 legacy routes, search/card copy, CTA hierarchy, source/review requirements.
- Excluded: drafting all 24 articles in this commission; publishing; performance claims; invented authors/reviewers; current lender pricing; personalized advice.
- Freshness: verify product rules and insurance/tax claims immediately before drafting; market updates must show dataset period and retrieval/update date.
- Required specialists: research, developmental editing, copy/fact check, mortgage compliance; legal/compliance escalation for state-specific interpretation, specific credit terms, or regulated advertising triggers.

## Rewrite Sequence

### Wave 0: publishing controls

1. Prevent draft and compliance-pending legacy pages from presenting as reviewed guides.
2. Define public statuses: unpublished, published, needs update, archived.
3. Define author, reviewer, source, claim, correction, and update fields.
4. Decide redirect/canonical behavior for legacy market-update routes.

### Wave 1: system copy

1. Learning Center home.
2. Editorial standards and review page.
3. Search, taxonomy, article-card, and CTA microcopy.
4. Local Market Updates hub wired to the generated index.

### Wave 2: first cornerstone cluster

1. Buying a Home hub.
2. First-time buyer local-market checklist.
3. FHA loan basics.
4. Refinance hub.
5. Refinance basics.
6. Florida insurance and mortgage planning.

This cluster tests buying, product, refinance, and state-cost article contracts before scaling.

### Wave 3: remaining evergreen hubs and guides

- VA, jumbo, home equity, and taxes/insurance hubs.
- VA, jumbo, home equity, cash-out, move-up buyer, and remaining state explainers.

### Wave 4: local editorial migration

- Replace the 12 generic legacy market updates with curated generated evidence, or commission synthesis pieces only when they answer a distinct borrower question that four atomic local reports do not.
- Add geography/topic/source/freshness discovery to Learning Center search.

## Evidence and Compliance Rules

- Use official sources for FHA, VA, conforming limits, credit advertising, and program rules.
- Use approved public datasets for market claims and show geography, series, period, unit, and limitations.
- Do not use a market index as a property valuation or a loan limit as an eligibility claim.
- Do not state rates, APRs, payments, fees, savings, or terms unless actually available and accompanied by required assumptions and disclosures.
- Treat prequalification as distinct from approval.
- Refinance content must disclose closing costs, term changes, break-even, and total-cost tradeoffs when discussing payment reduction.
- Home-equity content must distinguish HELOC variable-rate/open-end risks, home-equity loans, and cash-out refinances.
- Insurance and property-tax content must not imply a broad estimate is a property-specific quote or bill.
- Public licensing, NMLS, testimonial, ranking, and “expert” claims require verified internal sources.

## Acceptance Criteria

The rewrite passes only when:

- Every page answers a specific reader question in its first screen.
- No public copy describes internal modules, content graphs, review states, or prototype behavior.
- Each article has a unique assignment and does not reuse generic body paragraphs except approved disclosures.
- Every material claim has a source, effective date, geography/jurisdiction, and claim state.
- Article cards show decision value, topic/geography, and freshness rather than a generic status label.
- Hubs have topic-specific orientation and do not use noun substitution in a shared paragraph.
- The Local Market Updates hub and search expose the generated local-news corpus.
- Draft and compliance-pending pages are not represented as reviewed public guides.
- CTAs match reader intent and appear after appropriate value.
- Developmental review, fact/copy review, mortgage compliance review, and human approval are recorded independently before publication.

## Story Packet State

- Completed: commission, repository evidence review, crawl attempt, content inventory, structural/developmental analysis, preliminary fact/copy risk review, mortgage compliance screen, rewrite sequencing, acceptance criteria.
- Deferred by design: article research packets, drafting, developmental review of new drafts, final fact check, final compliance approval, packaging, publication, and performance review.
- Claim readiness: structural findings are high confidence because the renderer and seed are source-of-truth code/data. Live visual findings are limited because rendered browser extraction timed out.
- Publication status: not authorized and not attempted.
- Human decisions needed before drafting at scale: brand voice nuances; named author/reviewer availability; first launch geographies; approved current sources; and whether legacy market routes redirect or become synthesis articles.
- Next action: approve Wave 1 and create individual story packets for the Learning Center home, editorial standards page, Local Market Updates hub, and the six Wave 2 cornerstone assets.

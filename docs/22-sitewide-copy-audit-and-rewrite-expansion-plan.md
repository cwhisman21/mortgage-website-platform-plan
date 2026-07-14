# Sitewide Copy Audit and Rewrite/Expansion Plan

Date: 2026-07-13

Status: Implemented in repository; automated release gates pass; generated corpus remains subject to recorded editorial/compliance review status

## Implementation Result

- Completed all 24 legacy article rewrites. Each exceeds the 800-word target and resolves its claim-level source records.
- Expanded all eight borrower topic guides beyond the 500-word hard floor.
- Added eight product-specific guides beyond the 500-word hard floor with authoritative source links.
- Removed public placeholder, dummy, and meta-editorial copy and added regression tests.
- Replaced public fictional lender offers with a verified-terms handoff.
- Corrected the public Freddie Mac benchmark to the July 9, 2026 survey values used by the source ledger.
- Added evidence-led local context to all 51 state and 737 city routes; every location exceeds 250 local words.
- Assigned contributor ownership to all 3,152 generated articles and retained their explicit editorial/compliance review states.
- Full repository content and rendering suite: 177 tests passed, 0 failed on July 13, 2026.

The generated corpus passes structural, numeric-provenance, anti-filler, attribution, length, and crawlability checks. Its recorded `editorial_review_required` and `compliance_review_required` states remain authoritative; automated validation is not represented as human publication approval.

Production target: https://mortgage-website-platform-plan-chi.vercel.app/

## Executive Decision

Commission a complete public-copy remediation program across the 4,015-route site. Remove all copy that describes the prototype, template, page, article, module, or desired editorial behavior instead of answering the visitor's question. Require at least 500 meaningful body words for borrower-facing topic hubs, product guides, and legacy articles. Do not count navigation, footer text, disclosure boilerplate, card titles, repeated CTAs, source lists, or interface labels toward the threshold.

The screenshot is a blocking example. “A useful mortgage article…,” “This article connects…,” “The reader can understand…,” and “Read this with the market…” are editorial instructions exposed as borrower copy. They must be replaced, not polished.

## Audit Scope

The audit covers all visible public text in:

- Home, rates, locations, directories, account/lead interactions, and shared navigation/footer.
- 51 state pages and 737 city pages.
- 8 product pages.
- Learning Center home, 8 borrower topic hubs, and the editorial team/standards surface.
- 24 legacy articles.
- 3,152 generated local-market articles across 788 data bundles.
- 5 calculator pages and the calculator hub.
- 16 loan-officer profiles and 6 branch pages.
- Shared cards, tables, charts, source notes, FAQs, empty/error states, disclosures, and CTAs.

## Counting Standard

“Meaningful body words” include page-specific explanatory prose, comparisons, examples, decision guidance, FAQs, and limitations.

They exclude:

- Header, footer, breadcrumbs, menus, and accessibility labels.
- Repeated CTA text and modal chrome.
- Source citations and disclosure boilerplate.
- Table column labels, card titles, related-link labels, and metadata.
- Text repeated unchanged across a page family.

Minimums:

| Page family | Required meaningful words | Additional requirement |
| --- | ---: | --- |
| Legacy or evergreen article | 800 target; 500 hard floor | Unique thesis, evidence, tradeoffs, and conclusion |
| Borrower topic hub | 600 target; 500 hard floor | Topic-specific orientation and decision path |
| Product guide | 900 target; 500 hard floor | Official rules, fit, costs, tradeoffs, process, comparison |
| Generated market article | Existing 1,000+ may remain | Quality, data, repetition, and compliance gates |
| State/city dashboard | No article minimum | At least 250 unique local words plus structured local evidence |
| Calculator/tool | No article minimum | Clear assumptions, result explanation, limitations, and next step |
| LO/branch profile | No article minimum | Verified identity, service, licensing, and local relevance only |

Word count is a floor, not a quality goal. Filler added to reach 500 words fails.

## Quantitative Inventory

| Surface | Count | Length result | Current disposition |
| --- | ---: | --- | --- |
| Legacy articles | 24 | All under 500 meaningful words | Block and rewrite |
| Borrower topic hubs | 8 | Under 500 and generic | Expand and specialize |
| Learning Center home | 1 | Landing page; exempt from 500 floor | Rewrite discovery and positioning copy |
| Editorial team/about page | 1 | Not a substantive standards page | Rewrite as verifiable editorial standards/contributors page |
| Product pages | 8 | Under 500 product-specific words | Expand all eight |
| Generated local-news articles | 3,152 | Minimum 1,084; median 1,158; maximum 1,239 | Length passes; quality QA required |
| State pages | 51 | Shared template | Rewrite template and require local uniqueness |
| City pages | 737 | Shared template | Rewrite template and require local uniqueness |
| Calculators | 5 plus hub | Visible dummy/instructional language | Replace production-facing assumptions and labels |
| LO profiles | 16 | Template-driven | Verify and humanize without unsupported claims |
| Branch pages | 6 | Template-driven | Verify local service and licensing copy |
| Sitemap routes | 4,015 | Full public universe | Automated release gate required |

The generated-news count was measured with `research/audit-generated-news-copy.mjs`. All 3,152 generated articles exceed 1,000 visible words. None matched the initial explicit placeholder phrase set. That does not establish editorial quality: the corpus is formula-generated and needs repetition, anomalous-data, and sample-based human review.

## Blocking Placeholder and Instructional Patterns

The release scanner must reject visible copy containing these patterns or close semantic equivalents:

- “Dummy data,” “dummy estimate,” “dummy limit,” or “dummy inputs.”
- “Placeholder,” “prototype,” “wireframe,” “scaffold,” “mock,” or “simulated.”
- “A useful mortgage article…”
- “This article connects…”
- “The reader can understand…”
- “Read this with the market, product, and next step in view.”
- “A product page educates…”
- “Products route into calculators…”
- “Articles link back…”
- “Topic hub” when used as reader-facing positioning.
- “The next step stays clear…”
- “The article stays readable…”
- “Open a city or state page…” when the sentence describes site architecture rather than borrower value.
- “Source notes stay close…” when it describes intended template behavior rather than naming the actual source and date.
- “Use the related cards below…” and similar interface instructions that replace substantive conclusions.

The scanner should also flag meta-editorial constructions:

- “This page/article/guide helps…” when followed by a description of the content system rather than a direct answer.
- “The reader/user can…”
- “In this section/page/module…”
- “Content moves readers…”
- “Browse this topic” without a topic-specific proposition.

## Page-Family Rewrite Briefs

### 1. Legacy articles — 24 complete rewrites

The legacy renderer currently gives every title substantially the same body. Replace the shared generic body with article-owned structured content.

Required article schema:

- Decision-first title and dek.
- Named primary audience and question.
- Three to five evidence-backed takeaways.
- Unique opening that answers why the issue matters now.
- Four to seven article-specific sections.
- At least one useful comparison, checklist, table, or worked example when appropriate.
- Tradeoffs and limitations.
- Questions to ask a licensed professional.
- Conclusion that states the next decision, not “use the cards below.”
- Claim-level sources, effective dates, author, reviewer, and update trigger.

Rewrite groups:

1. Twelve local-market synthesis articles: either rebuild from the generated evidence corpus or redirect to curated local-report collections. Do not repeat broad city-template prose.
2. Four state tax/insurance explainers: jurisdiction-specific source map, assessment/insurance mechanics, escrow/payment effect, and property-specific limitations.
3. Four product explainers: FHA, VA, jumbo, and refinance rules and tradeoffs from authoritative sources.
4. Four borrower-intent guides: first-time buyer, move-up buyer, home equity, and cash-out refinance decision sequences.

### 2. Borrower topic hubs — 8 expansions

Each hub needs at least 500 meaningful words and a distinct editorial architecture:

| Hub | Required editorial spine |
| --- | --- |
| Local Market Updates | How to interpret date, geography, measure, comparison, and property-level limits |
| Buying a Home | Budget, cash to close, documents, property search, offer, underwriting, closing |
| Refinance | Goal, current-vs-proposed comparison, costs, break-even, term, total interest |
| FHA Loans | Lender/FHA roles, down payment, mortgage insurance, limits, property standards, alternatives |
| VA Loans | Eligibility, COE, entitlement, funding fee, occupancy, appraisal/property process |
| Jumbo Loans | Conforming boundary, lender variation, reserves, documentation, property and market risk |
| Home Equity | HELOC, home-equity loan, cash-out refinance, variable rate, costs, lien and repayment risks |
| Taxes & Insurance | Assessment, escrow, insurance quote/availability, exemptions, reassessment, local sources |

The Learning Center home remains a discovery surface and is exempt from the 500-word minimum. Rewrite it around four borrower intents—buy, refinance, use equity, and understand a market—then surface freshness, author/reviewer, and the appropriate calculator.

### 3. Product pages — 8 expansions

All product pages currently share meta-copy such as “A product page educates…” and generic requirement tables. Each product needs 500+ meaningful words, with a 900-word target.

Required modules:

- Plain-language product definition.
- Who may reasonably compare it, without implying eligibility.
- Authoritative requirements and current source date.
- Upfront and ongoing costs.
- Mortgage insurance, funding fee, variable-rate, lien, or refinance mechanics where applicable.
- Benefits and material tradeoffs.
- Documents and process.
- Property, occupancy, geography, and loan-limit constraints.
- Comparison against at least one realistic alternative.
- Illustrative example only when assumptions and disclosures are available.
- Five to eight product-specific FAQs.
- Related calculator, local module, and licensed-review handoff.

Product assignments:

- Purchase: transaction sequence, cash to close, offer-to-closing risks.
- Refinance: cost recovery, term reset, total interest, cash-flow objective.
- Cash-out refinance: increased balance, equity reduction, costs, term/payment effects.
- Home equity/HELOC: draw period, repayment period, variable APR, fees, lien risk.
- Conventional: conforming limits, mortgage insurance, down-payment and property variation.
- FHA: HUD rules, MIP, limits, occupancy, appraisal/property standards.
- VA: eligibility/entitlement, funding fee, occupancy, property process, lender review.
- Jumbo: county threshold, lender-specific underwriting, reserves, documentation, pricing variability.

### 4. Generated market articles — 3,152 QA reviews, not length expansion

The corpus passes the 500-word gate, but it should not be mass-approved based on length.

Required automated checks:

- Normalize geography names, dates, and numbers, then measure sentence/paragraph similarity across the corpus.
- Flag articles whose normalized body is more than 70% similar to another article.
- Validate units, denominators, series IDs, margins of error, date windows, and geography joins.
- Detect anomalous values and changes before publication.
- Confirm each takeaway is supported by an attached source record.
- Confirm source URLs, periods, and release dates are present.
- Reject universal eligibility, property valuation, rate/payment quote, ranking, forecast, or “best market” implications.

Required human sampling:

- Review every article type in every state before that state is publishable.
- Review all anomalous-value flags.
- Review at least 10% of each generated batch, increasing to 100% after any material failure until two clean batches pass.
- Review high-risk loan-limit, tax, insurance, affordability, and labor-market interpretations separately.

### 5. State and city pages — template rewrite plus uniqueness gate

The 788 location pages are dashboard surfaces, not articles, so 500 words is not the objective. Replace template-explaining phrases such as “A state guide translates…” and “The city market page remains public…” with direct local interpretation.

Each location must contain:

- At least 250 words unique to the geography, excluding names and swapped variables.
- A dated market interpretation tied to displayed metrics.
- Local tax and insurance context with jurisdiction-appropriate sources.
- Local loan-limit or product relevance where supported.
- A clear explanation of what the data cannot determine.
- Local FAQ answers that are not generated by replacing the city/state name.

Do not publish a location page whose unique content is only entity substitution.

### 6. Calculators and interactive copy

Current public text exposes “Dummy data,” “dummy conforming limit,” “dummy FHA limit,” “dummy ZIP,” and “dummy DPA offset.” These are blocking production defects.

Replace them with one of two valid states:

1. Approved illustrative assumptions with explicit source, effective date, geography, and limitations; or
2. A neutral “illustrative planning estimate” that does not claim program availability or current limits.

Every calculator must explain inputs, result components, exclusions, changeable assumptions, and the difference between an estimate, prequalification, rate quote, and approval.

### 7. Shared site copy

Audit home, rates, directories, cards, CTAs, empty states, and errors for language that describes internal architecture. Replace “page,” “route,” “module,” “card,” “content,” and “system” language with the actual borrower action or information.

CTA rules:

- Education-first pages lead to another comparison, calculator, or source before lead capture.
- “Get prequalified” must not imply approval.
- Rate CTAs must not imply a rate is available without review.
- Local-expert CTAs require verified licensing and routing context.

## Editorial Production Workflow

Every rewrite batch follows the copywrite-orchestrator gates:

1. Editorial Director: commission a page-specific assignment with an observable definition of done.
2. Research: build source and claims ledgers from primary/authoritative sources.
3. Drafting: write from the approved assignment and evidence, not from the current placeholder prose.
4. Developmental edit: verify thesis, reader value, structure, completeness, and originality.
5. Copy/fact check: verify names, dates, numbers, rules, comparisons, links, and close paraphrases.
6. Mortgage compliance: screen rates, APR, payments, fees, savings, eligibility, approvals, government programs, taxes, insurance, fair lending, and licensing.
7. Human approval: record approval for the canonical copy.
8. Package/publish: update structured content and validate the live route.
9. Performance review: only after search and engagement evidence exists.

No writer or generator approves its own work.

## Recommended Production Sequence

### Wave 0 — stop publishing placeholders

- Add the forbidden-language scanner to the release suite.
- Add meaningful-word-count extraction by page family.
- Prevent draft, compliance-pending, or failed pages from publishing.
- Replace visible calculator “dummy” language immediately.

### Wave 1 — highest-visibility editorial surfaces

- Learning Center home.
- Eight borrower topic hubs.
- Editorial standards/contributors page.
- Article-card, byline, freshness, source, and CTA microcopy.

### Wave 2 — cornerstone guides

- FHA basics.
- VA basics.
- Refinance basics.
- First-time buyer checklist.
- Home equity comparison.
- Cash-out refinance guide.
- Florida insurance guide.
- Texas property-tax guide.

### Wave 3 — product pages

- Rewrite all eight product guides and their FAQs.
- Align related articles, calculators, local modules, and compliance disclosures.

### Wave 4 — remaining legacy articles

- Complete remaining evergreen and borrower-intent guides.
- Redirect, consolidate, or rebuild the twelve legacy market updates using generated evidence.

### Wave 5 — local templates

- Rewrite state and city shared templates.
- Add uniqueness scoring and source/date gates.
- Roll out by state only after sample review passes.

### Wave 6 — generated corpus review

- Run normalized similarity and anomaly checks across all 3,152 articles.
- Human-review by article type and state.
- Publish or retain only clean batches.

## Release Acceptance Criteria

A route passes only when:

- It contains no forbidden placeholder, prototype, dummy, or meta-editorial language.
- Articles, product guides, and borrower topic hubs contain at least 500 meaningful body words.
- The page fulfills a unique assignment; word count is not achieved through filler or repeated boilerplate.
- The opening answers a reader question instead of describing the page.
- Material claims have source, effective date, geography/jurisdiction, and claim state.
- Rates, APRs, payments, fees, limits, taxes, insurance, savings, and eligibility language pass mortgage compliance review.
- CTAs match the reader's stage and do not overpromise an outcome.
- Author, reviewer, last-updated date, and correction path are present when asserted.
- Internal links are relevant and do not substitute for a conclusion.
- The deployed page is re-crawled and its rendered meaningful-word count and forbidden-language result are stored.

## Story Packet

- Story ID: `SITE-COPY-REMEDIATION-2026-01`
- Status: `commissioned`
- Decision: commission a full-site audit and staged rewrite; block cosmetic polishing of placeholder templates.
- Audience: borrowers researching purchase, refinance, equity, products, and local markets.
- Voice: calm, plain, specific, evidence-led, locally aware, and transparent about uncertainty.
- Completed stages: commission, local source inventory, explicit placeholder scan, word-count audit of generated news, developmental diagnosis, preliminary mortgage compliance screen, remediation sequencing, acceptance criteria.
- Deferred stages: page-level research packets, drafting, developmental review of new drafts, final fact/copy checks, final compliance approvals, packaging, publication, and performance review.
- Claim readiness: route and content-model counts are high confidence from the repository and sitemap. Generated-news word counts are measured. Legacy/product/topic word failures are renderer-level findings; a rendered route-by-route audit should be added as Wave 0 automation.
- Publication status: planning only; no copy was rewritten or published in this task.
- Next action: approve Wave 0 and Wave 1, then commission page-specific story packets for the eight hubs and first eight cornerstone guides.

# Location News Research And Build Brief

Date: 2026-07-10

Status: Design ready for review

## 1. Build Title

Evidence-Backed Location News Cards And Full-Article Modals

## 2. Product Area

- Primary product: Snap Mortgage public acquisition website.
- Connected surface: Snap Homes `Add to watchlist` and account actions.
- This build does not create or replace the Snap Homes consumer portal.

## 3. Task Type

- Public-site content enhancement.
- UI/UX enhancement.
- Structured editorial data expansion.
- SEO and internal-linking enhancement.
- Frontend-only prototype implementation with researched seed content.

## 4. Problem Being Solved

State and city pages need timely local reporting immediately after their opening explanation. The reporting must give borrowers useful evidence and next steps without becoming thin, location-swapped SEO copy.

The current article records contain route and relationship metadata but do not contain complete researched article bodies. The current article renderer also uses generic orientation and body copy that does not change meaningfully with the article evidence. Both conditions must be replaced.

## 5. Users

Primary users:

- Potential borrowers researching a city or state.
- Buyers comparing local housing costs and loan options.
- Homeowners considering refinance or home-equity questions.

Secondary users:

- Returning Snap Homes consumers.
- Loan officers and branch teams receiving later simulated intent.
- Editors, compliance reviewers, and data managers in the future production system.

## 6. Confirmed Experience

For both state and city pages, the location news section appears directly below the first editorial section.

State page order begins:

1. Breadcrumb and hero.
2. State brief.
3. Latest state mortgage and housing updates.
4. Existing market tables, charts, products, experts, and FAQ.

City page order begins:

1. Breadcrumb and hero.
2. Local cost read.
3. Latest city market updates.
4. Existing charts, payment scenarios, comparisons, products, experts, and FAQ.

Each location displays at least four cards. Each card contains a 16:9 theme-matched stock photo, headline, source/date, preview copy, relevance label, and a crawlable `Read more` link. The composition should feel like a faceless/headless news channel: strong editorial crop, immediate subject recognition, and no presenter personality.

Selecting `Read more` opens the full article in a modal. The article also has a complete standalone route for direct visits, sharing, browser history, no-JavaScript fallback, crawling, canonical metadata, and sitemap inclusion.

## 7. Research Decision

Use authoritative primary sources that can cover the complete national location inventory in bulk.

### Census ACS

The 2020-2024 ACS 5-year release became available January 29, 2026 and covers places and states. Use it for household income, home value, selected monthly owner costs, rent, tenure, vacancy, housing units, and population. Use margins of error and Census comparison guidance when describing change.

Primary references:

- https://api.census.gov/data/2024/acs/acs5.html
- https://www.census.gov/programs-surveys/acs/news/data-releases/2024/release.html
- https://www.census.gov/about/policies/citation.html

### BLS LAUS

BLS LAUS publishes monthly and annual employment, unemployment, labor-force, and unemployment-rate data for states and cities with populations of 25,000 or more. That threshold covers the project's 50,000-population city inventory.

Primary references:

- https://www.bls.gov/lau/
- https://www.bls.gov/lau/laufaq.htm
- https://download.bls.gov/pub/time.series/la/

### FHFA

Use the latest FHFA HPI release for state home-price movement and the official 2026 all-county conforming loan-limit files for county-level product context.

Primary references:

- https://www.fhfa.gov/data/hpi
- https://www.fhfa.gov/data/conforming-loan-limit

### HUD FHA

Use HUD's official 2026 FHA loan-limit materials for county-level FHA context. The 2026 one-unit floor is $541,287 and the standard high-cost ceiling is $1,249,125, with special exception areas handled from the official county data rather than a national assumption.

Primary references:

- https://www.hud.gov/news/hud-no-25-145
- https://www.hud.gov/LENDERS
- https://www.hud.gov/sites/dfiles/hudclips/documents/2025-23hsgml.pdf

### Search And Modal Requirements

Google documents that crawlable links should be ordinary anchors with resolvable `href` values. Google also warns that generating many pages without adding user value may violate its scaled-content-abuse policy. W3C's modal-dialog pattern requires contained focus, Escape behavior, a labeled dialog, and focus restoration.

Primary references:

- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/essentials/spam-policies
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

### Stock Media

The preferred Phase A provider is the Pexels API because it returns landscape crops, stable photo-page links, photographer metadata, alt text, average color, and multiple image sizes. Its API requires an access key, a prominent link to Pexels, and photographer credit when possible. Keep the provider behind an adapter so a future licensed library or CMS media service can replace it without changing article records.

Primary references:

- https://www.pexels.com/api/documentation/
- https://www.pexels.com/license/

## 8. Article Inventory

| Geography | Locations | Articles per location | Minimum articles |
| --- | ---: | ---: | ---: |
| State | 49 | 4 | 196 |
| City | 737 | 4 | 2,948 |
| Total | 786 | 4 | 3,144 |

Each article is a unique record with a unique route. County and state facts may be relevant to multiple cities, but each city article must contain city-specific context and may not be a duplicate body with a swapped place name.

## 9. City Article Set

### Article 1: Affordability And Home Values

Use ACS median home value, household income, selected monthly owner costs for households with a mortgage, the parent-state comparison, and an appropriate prior ACS period.

Borrower question: `How do local home values and household income frame the payment conversation?`

### Article 2: Housing Supply, Ownership, And Rent

Use ACS housing units, occupied and vacant units, owner and renter tenure, median gross rent, and a parent-state or prior-period comparison.

Borrower question: `What does the local housing mix suggest I should compare before buying or renting?`

### Article 3: Local Labor Market

Use the latest BLS LAUS city labor force, employment, unemployment, unemployment rate, and month-over-month and year-over-year comparisons when available.

Borrower question: `What changed in the local labor market, and what does it not say about mortgage eligibility?`

### Article 4: 2026 County Loan Limits

Use the city-to-county FIPS mapping, FHFA 2026 one- through four-unit conforming limits, HUD 2026 one- through four-unit FHA limits, and high-cost or special-exception status when applicable.

Borrower question: `How do current county loan limits help organize conventional, jumbo, and FHA questions?`

## 10. State Article Set

### Article 1: State Home-Price Movement

Use the latest FHFA state HPI release with quarterly and annual comparisons. Explain that an index describes broad movement and is not a property valuation.

### Article 2: State Labor Market

Use BLS LAUS state employment, unemployment, labor force, and unemployment rate with monthly and annual comparisons.

### Article 3: State Housing Costs And Ownership

Use ACS state home value, household income, owner costs, rent, tenure, vacancy, and housing-stock data with a relevant comparison.

### Article 4: State Loan-Limit Landscape

Summarize current FHFA and HUD county limits, the number of counties above the baseline, the range of one-unit limits, and major exceptions. Do not imply that a limit determines eligibility or available pricing.

## 11. Article Structure

Every full article contains:

1. Borrower-facing headline and dek.
2. Geography, publication date, update date, source desk, and review status.
3. Three to five key takeaways derived from the evidence.
4. An opening that states what changed or what the latest release shows.
5. A local chart, graph, or comparison table.
6. Multiple substantive sections explaining the local facts.
7. A contextual CTA between major sections.
8. A section explaining what the data may mean for comparison and planning.
9. A section explaining what the data cannot determine for an individual borrower.
10. Methodology, data vintage, margins-of-error or revision limitations, and direct source links.
11. Related location, product, calculator, rate, and licensed-guidance links.

Target body length is 600 to 900 useful words, excluding source metadata and disclosures. Length alone does not satisfy quality requirements.

## 12. Anti-Filler Evidence Contract

Every generated article must pass all of these rules:

- Minimum four verified quantitative location facts.
- Minimum one meaningful comparison.
- Minimum one primary source; two source records when the topic combines programs or datasets.
- Numeric claims are generated only from structured evidence fields, never from prose prompts.
- Each evidence field stores source URL, dataset, variable or series ID, geography ID, period, retrieved date, estimate, margin of error when applicable, and revision status when applicable.
- Interpretations use conditional language and state limitations.
- Substantive paragraph hashes are checked across the corpus; duplicates fail the batch.
- Location names alone do not count as unique content.
- Generic introductions, scaffold labels, unresolved tokens, fake quotes, fake experts, fake local events, and unsupported predictions fail validation.
- Missing data triggers an approved alternate evidence path or fails the location batch. It never triggers fabricated copy.

## 13. Data Objects

### `newsArticleIndexItem`

- `id`, `route`, `locationId`, `locationType`, and `articleType`
- `title`, `dek`, and `previewText`
- `publishedAt`, `updatedAt`, and `relevanceLabel`
- `topicIds`, `productIds`, and `sourceLabels`
- `reviewStatus` and `complianceStatus`
- `contentPath` and `imageId`

### `newsArticleContent`

- `articleId`
- `keyTakeaways`
- `sections`
- `visuals` and `tables`
- `ctaPlacements`
- `methodology` and `limitations`
- `sourceRecords`
- `relatedRoutes`

### `sourceRecord`

- `sourceId`, `publisher`, `dataset`, and `sourceUrl`
- `variableOrSeriesId`
- `geographyType` and `geographyId`
- `period`, `releasedAt`, and `retrievedAt`
- `estimate`, `marginOfError`, and `revisionStatus`
- `citationLabel`

### `newsMediaAsset`

- `id`, `provider`, and `providerAssetId`
- `photographer` and `photographerUrl`
- `photoPageUrl`, `imageUrl`, and `usageUrl`
- `retrievedAt`, `articleTheme`, and `locationScope`
- `alt`, `focalPoint`, and `crop`
- `width`, `height`, and `averageColor`
- `approvalStatus`

## 14. Static Data Architecture

Do not add all article bodies to `production-seed.json`. Loading several thousand full articles during initial page boot would unnecessarily increase transfer, parse time, and memory use.

Use:

- `mock-data/location-news-index.json` for card metadata and route resolution.
- `mock-data/location-news/{state-slug}/{location-slug}.json` for four full article records associated with one location.
- `mock-data/location-news-source-manifest.json` for dataset versions, retrieval dates, checksums, source URLs, generator version, batch reports, and exceptions.
- `mock-data/location-news-media-manifest.json` for stock-photo provenance, usage metadata, theme assignments, alt text, and crops.
- `mock-data/generate-location-news.mjs` for deterministic ingestion, analysis, copy assembly, relationship generation, and validation.
- `site/generated/learning-center/<slug>.html` for complete pre-rendered standalone article responses.

The location page loads only the news index needed to display cards and lazy-loads the location article bundle when the modal opens. Direct article requests receive complete pre-rendered HTML generated from the same article record and shared renderer, so no-JavaScript visitors and crawlers do not receive an empty app shell.

## 15. Modal And Route Behavior

- `Read more` remains a real anchor.
- An ordinary click opens the article modal and pushes the article route with the History API.
- Modified clicks, new-tab actions, direct visits, refreshes, and crawler requests use the standalone route.
- Closing restores the location route, scroll position, and link focus.
- Browser Back closes the modal; Forward reopens it.
- The modal displays semantic headings, paragraphs, lists, tables, figures, captions, source links, and CTA links.
- Mobile uses a full-height article sheet.
- Loading, error, and unavailable-content states remain borrower-facing and provide a working standalone article link or a return to the location page.

## 16. Permissions And Integrations

- Public read access only in this frontend phase.
- No authentication, account creation, CRM routing, CMS, publishing API, or backend persistence.
- `Add to watchlist`, lead, rate review, prequal, compare offer, and account actions remain simulated according to the existing Phase 2 behavior.
- Future ingestion and publishing must support editor and compliance review before publication.

## 17. States Needed

- Loading: article skeleton in the modal without shifting the location-page layout.
- Success: complete article loaded with sources, visual, CTAs, and related links.
- Error: borrower-facing explanation, retry control, direct article link, and close control.
- Unavailable: return to the location page and show other verified articles; never show internal coverage language.
- No JavaScript: `Read more` opens the complete standalone route.

## 18. Analytics Events

- `location_news_impression`
- `location_news_card_click`
- `location_news_modal_open`
- `location_news_modal_close`
- `location_news_article_route_view`
- `location_news_source_click`
- `location_news_related_link_click`
- `location_news_contextual_cta_click`
- `location_news_watchlist_click`

Event properties include location ID, location type, article ID, article type, source family, relevance rank, CTA type, and modal-versus-route view.

## 19. Compliance And Risk Flags

- Treat rates, APRs, payments, fees, loan limits, eligibility, approval, product fit, tax, insurance, government-program, and savings language as review triggers.
- Loan limits organize product questions; they do not establish eligibility, approval, pricing, or a recommended product.
- Labor, housing, and demographic data must not be used to steer, discourage, rank neighborhoods, or infer borrower characteristics.
- Broad market data is not a property valuation, rate quote, payment quote, underwriting decision, or personalized advice.
- Do not imply government endorsement or present Snap Mortgage as a government agency.
- Use source links and concise summaries. Do not reproduce copyrighted local-publisher articles.
- Production publishing requires editorial review. Compliance-sensitive articles require compliance review.

## 20. Assumptions And Open Questions

Confirmed:

- Four distinct articles are required for every state and city.
- No filler, scaffold, or internal planning copy may appear publicly.
- News cards appear directly below the opening editorial section.
- Cards use faceless/headless news-style stock photography matched to the article theme.
- `Read more` opens the complete article in a modal backed by a real article route.

Assumptions for implementation review:

- Exactly four articles per location are sufficient for the first national seed.
- Full articles retain data visualizations even though cards use stock photography.
- Stock images do not claim exact locality unless their metadata confirms it.
- Pexels is the preferred Phase A provider; `PEXELS_API_KEY` is required only while refreshing the media manifest and is never exposed to the browser or committed.
- The latest available official release is used at generation time and recorded in the source manifest.
- The generator may fail a batch when source coverage or quality checks fail.

## 21. Acceptance Criteria

1. All 49 state pages and 737 city pages display at least four news cards directly below the first editorial section.
2. The seed contains at least 3,144 unique article records and 786 location bundles.
3. Every article passes the evidence contract and contains complete borrower-facing body copy.
4. No article contains filler, generic scaffold copy, unresolved tokens, fake reporting, or an unsupported local claim.
5. Every card contains a licensed, theme-matched 16:9 stock photo, preview text, source/date context, and crawlable `Read more` link.
6. `Read more` opens a full article modal while the same URL renders a complete standalone article.
7. Browser Back/Forward, direct navigation, refresh, modified clicks, focus trapping, Escape, close, and focus return work correctly.
8. Every standalone article has a unique title, description, canonical URL, internal links, and sitemap entry.
9. Numeric claims resolve to source records with geography, period, retrieval date, and variable or series identifiers.
10. Smoke validation fails for missing articles, missing sources, missing dates, missing photo usage metadata, missing article visuals, duplicate substantive paragraphs, broken routes, or empty feeds.
11. Existing public routes, CTA simulations, account behavior, and anonymous browsing continue to work.
12. Desktop and mobile checks show no overflow, clipped modal content, inaccessible controls, or background interaction while the modal is open.

## 22. Recommended Downstream Skills

- `multi-skill-orchestrator` for batching, integration, and independent review.
- `researcher` for official data acquisition and source verification.
- `mortgage-copywriter` for borrower-facing drafting and claim screening.
- `frontend-design` for image-forward cards, article visuals, and modal presentation.
- `seo-audit` for route, metadata, internal-link, duplicate-content, and sitemap checks.
- `snap-qa-testing` and `webapp-testing` for static, interaction, accessibility, and responsive validation.

## 23. Final Codex Build Prompt

Objective:

Build the researched, frontend-only location news system for the Snap Mortgage public acquisition site. Every one of the 49 state pages and 737 city pages must display at least four complete, evidence-backed news articles directly below its opening editorial section. Do not use filler, scaffold text, location-name swapping, fake reporting, unsupported local facts, or borrower-facing planning language.

Inspect `AGENTS.md`, `README.md`, `docs/00-chat-handoff.md`, `docs/03-page-templates.md`, `docs/05-data-model.md`, `docs/07-seo-and-compliance.md`, `docs/15-production-research-and-content-plan.md`, `docs/19-location-news-feed-plan.md`, `docs/20-location-news-research-and-build-brief.md`, `site/`, `mock-data/production-seed.json`, `mock-data/generate-national-locations.mjs`, and `site/phase2-static-smoke.mjs` before changing files. Preserve existing routes, approved page-type behavior, visual system, CTA simulations, account behavior, and unrelated worktree changes.

Use official primary data:

- 2020-2024 Census ACS 5-year place/state estimates for housing, income, tenure, rent, vacancy, population, and housing units, including margins of error and comparison limitations.
- BLS LAUS for current city/state employment, unemployment, labor force, and unemployment rates.
- FHFA for current state HPI and 2026 all-county conforming loan limits.
- HUD for 2026 county FHA loan limits.

Create exactly four initial article types per city: affordability/home values, housing supply/ownership/rent, local labor market, and county loan limits. Create exactly four initial article types per state: FHFA HPI, state labor market, ACS housing costs/ownership, and statewide county loan-limit landscape. Generate in auditable batches of 20 locations.

Create a compact news index, per-location article bundles, a source manifest, and a deterministic generator. Do not put all full article bodies into `production-seed.json`. Each article must include at least four verified local quantitative facts, a meaningful comparison, source records, a useful data visual, 600-900 words of substantive borrower-facing copy, key takeaways, methodology, limitations, contextual CTAs, and related internal links. Fail the batch when evidence or quality checks are missing. Detect duplicate substantive paragraphs across locations; permit repeated disclosures and methodology labels only.

Place the news cards directly after `State brief` on state pages and directly after `Local cost read` on city pages. Each card includes a 16:9 theme-matched stock photo in a faceless/headless news style, headline, date/source, preview, relevance label, and a real `<a href>` `Read more` link. Store provider, photographer, photo page, usage URL, alt text, theme, crop, and approval metadata in a separate media manifest. Do not imply exact locality unless the asset metadata supports it. Keep charts, tables, and data comparisons inside the full article.

Implement progressive article modals. Ordinary clicks open the complete article in an accessible, scrollable modal and update the URL with the History API. Direct visits, refreshes, modified clicks, no-JavaScript use, and crawlers receive a complete standalone article route. Back/Forward, Escape, backdrop close, visible close, focus trapping, focus return, scroll restoration, and mobile full-height behavior must work. Modal and route views use the same article data.

Keep core educational content public. Do not implement auth, CMS, backend persistence, CRM routing, real prequalification, real rate or payment decisions, real offer comparison, or Snap Homes portal screens. Existing account/watchlist/lead/prequal/rate-review/compare-offer actions remain simulated.

Use conservative mortgage language. Do not imply approval, eligibility, personalized pricing, guaranteed savings, best rates, property valuation, underwriting, or government endorsement. Treat loan limits as planning context only. Do not use local data for steering or demographic targeting. Flag all compliance-sensitive output for review.

Expand static validation to prove inventory counts, exact location coverage, unique routes and IDs, source completeness, source geography, data vintages, stock-photo provenance and usage metadata, article visual data, article body completeness, paragraph duplication limits, canonical metadata, sitemap entries, modal controls, no broken links, no not-found routes, no borrower-facing scaffold language, and no mobile overflow. Run syntax checks, the static route smoke suite, corpus validation, a representative batch verification for every article type, and browser QA on representative state/city pages and article modals at desktop and mobile sizes.

After implementation, summarize changed files, article and location counts, source vintages, batches generated, validation performed, any source gaps, what remains simulated, and Phase 3 production candidates including CMS review workflow, scheduled ingestion, backend publishing, analytics persistence, and Snap Homes account integration.

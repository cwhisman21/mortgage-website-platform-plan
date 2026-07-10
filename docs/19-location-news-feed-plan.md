# Location News Feed Plan

Date: 2026-07-10

Status: Planning draft

## Objective

Add a location-aware news block to every state and city page so borrowers can see recent housing, mortgage, tax, insurance, affordability, inventory, local economy, and loan-program context tied to the market they are researching.

The block should support the current static prototype first, then become a governed production pipeline through CMS, source capture, editorial review, compliance review, and optional n8n/AI assistance.

Current location scale:

- 49 state pages.
- 737 city pages.
- 786 total location routes.

## Product Role

The news feed is not a generic blog widget. It should answer:

- What changed in this market?
- Why could it matter for a buyer, homeowner, or refinance borrower?
- What should I compare next?
- Which internal page, calculator, product, or licensed guidance path helps me act on it?

News cards should create useful next steps, not anxiety or unsupported predictions.

## Page Placement

### State Pages

Place the news block directly below the opening `State brief` editorial section. It appears before the market tables, home-price chart, product guidance, local experts, and FAQ.

This makes current market reporting the first substantive module after the page introduction without replacing the crawlable state guide, snapshot, or source context.

Recommended section title:

`Latest {State} mortgage and housing updates`

Recommended card mix:

- 1 state home-price movement article.
- 1 state labor-market article.
- 1 state housing-cost and ownership article.
- 1 state county loan-limit landscape article.

### City Pages

Place the news block directly below the opening `Local cost read` editorial section. It appears before the home-price chart, payment scenarios, local cost signals, nearby-city comparison, product guidance, local experts, and FAQ.

The news block should connect the opening explanation to current local evidence before the borrower reaches deeper comparison tools.

Recommended section title:

`Latest {City} market updates`

Recommended card mix:

- 1 city affordability and home-value article.
- 1 city housing-supply, ownership, and rent article.
- 1 city labor-market article.
- 1 city-contextualized county loan-limit article.

## Feed Composition Rules

Every location page must have four unique article records. The underlying evidence can use the exact place, city, county, metro, or state geography when that scope is explicit and genuinely relevant. Use this hierarchy when selecting evidence and ranking later supplemental stories:

1. Exact city match.
2. County or metro match.
3. Parent state match.
4. Product/topic match tied to the city page product mix.
5. Evergreen educational guidance only after the four required researched location articles.

County or state evidence does not become city evidence. Label its true geography and explain why it matters to the city. Do not reuse the same body across multiple city routes.

## Card Design

Each card should include:

- A 16:9 editorial stock photo selected to match the article theme.
- Story title.
- Short borrower-facing summary.
- Source or editorial status.
- Published or updated date.
- Location relevance label, such as `Austin`, `Texas`, `Nearby market`, or `Statewide`.
- Topic tags: purchase, refinance, FHA, VA, jumbo, taxes, insurance, inventory, affordability, economy.
- A `Read more` anchor with a real article URL.
- Secondary contextual CTA where appropriate: estimate payment, review rates, save market, compare product, request guidance.

The image direction is a faceless/headless news thumbnail: image-forward, strongly cropped, current, and editorial rather than lifestyle-advertising. Use HTML for topic and location labels instead of baking text into the image.

Do not imply that a stock photo depicts the exact city, property, borrower, or event unless the asset metadata proves that relationship. Avoid distressed-family clichés, demographic targeting, neighborhood ranking cues, identifiable financial documents, rate numbers, approval stamps, and imagery that could imply a borrower outcome.

Every photo needs an auditable media record with provider, provider asset ID, photographer, photo page URL, image URL, usage or license URL, retrieval date, article theme, alt text, focal point, crop, and approval status. Full articles still use cited charts, tables, and data comparisons for evidence.

Recommended card copy pattern:

```txt
Inventory has shifted in this market.
Why it matters: More listings may change timing, offer strategy, and payment conversations, but it does not decide your loan options.
```

Avoid:

- Best market claims.
- Guaranteed savings.
- Approval or eligibility implications.
- “Rates are lower here” without internal pricing methodology.
- Unsupported urgency language.

## Full Article Modal

Selecting `Read more` opens the full article in a large, scrollable modal without taking the borrower away from the state or city page.

The modal is progressive enhancement over a real article route:

- Every `Read more` control is an `<a href="/learning-center/...">` link.
- The link destination renders the complete article when opened directly, refreshed, shared, or visited without JavaScript.
- JavaScript intercepts an ordinary click to open the same article content in the modal.
- The History API updates the browser URL to the article route while the modal is open and restores the location URL when it closes.
- Back and forward navigation open or close the correct article state.
- The article route remains crawlable, canonical, internally linked, and eligible for the XML sitemap.
- Modal content and route content use the same article record so the two views cannot drift.

Accessibility requirements:

- Use `role="dialog"`, `aria-modal="true"`, and a visible title referenced by `aria-labelledby`.
- Move focus to the article heading when opened.
- Keep keyboard focus inside the modal while it is open.
- Close on `Escape`, backdrop selection, or the visible close button.
- Return focus to the invoking `Read more` link.
- Prevent background scrolling and interaction.
- Use a full-height sheet treatment on narrow mobile screens.

The full article modal includes:

- Headline, dek, byline or editorial desk, publication date, updated date, and geography label.
- Key takeaways.
- Multiple borrower-facing paragraphs organized with meaningful headings.
- At least one useful chart, graph, or comparison table based on cited data.
- A contextual CTA between major article sections.
- Methodology and limitations.
- Direct source links and source dates.
- Editorial and compliance review status.
- Related location, product, calculator, rate, and licensed-guidance links.

## Minimum Article Coverage

Create at least four complete, distinct articles for every state and city location.

Current minimum inventory:

- 49 state locations x 4 articles = 196 state articles.
- 737 city locations x 4 articles = 2,948 city articles.
- 786 locations x 4 articles = 3,144 total articles.

Every city receives these evidence-backed article types:

1. Local home values, household income, and affordability context.
2. Ownership, rental costs, vacancy, and housing-supply context.
3. Local employment, unemployment, and labor-force movement.
4. Current county-level conforming and FHA loan-limit context.

Every state receives these evidence-backed article types:

1. State home-price movement using the latest FHFA HPI release.
2. State employment and unemployment movement using BLS LAUS.
3. State housing costs, ownership, and affordability using ACS.
4. Current conforming and FHA loan-limit variation across the state's counties.

If an expected metric is unavailable, the generator must select an approved alternate evidence set for that geography. It must never manufacture a number, silently substitute another city, or publish a generic article with only the location name changed.

## Anti-Filler Quality Gates

An article may be generated only when all of these checks pass:

- At least four verified quantitative facts are tied to the article geography.
- Every quantitative claim maps to a source record, source URL, data vintage, retrieval date, and geography identifier.
- At least one comparison is present: prior period, state, national, county, or another clearly labeled benchmark.
- The body explains what the data can and cannot tell a borrower.
- The body contains multiple substantive paragraphs, a local visual, a methodology note, and a useful next action.
- The title, summary, takeaways, interpretation, and visual values are derived from the location's evidence.
- No unresolved tokens, generic scaffold labels, production notes, or planning language appear.
- No normalized substantive paragraph is duplicated across location articles. Shared disclosures, methodology language, and source labels are the only permitted repeated text.
- Rates, APRs, payments, approval, eligibility, savings, and product-fit claims are excluded unless supported and reviewed under the required advertising rules.
- Automated output remains unpublished until editorial review; compliance-sensitive output also requires compliance review.

The generator should fail the affected location batch instead of emitting thin or unsupported content.

## Data Model Additions

Add these entities to the production model.

### `news_sources`

Represents an approved source.

Fields:

- `id`
- `name`
- `source_type`: official, public_dataset, local_publisher, trade_association, internal_editorial, internal_market_data
- `base_url`
- `allowed_use`
- `attribution_required`
- `refresh_cadence`
- `terms_review_status`
- `compliance_notes`
- `active`

### `news_source_items`

Represents an ingested external story or source record before editorial use.

Fields:

- `id`
- `source_id`
- `source_url`
- `canonical_url`
- `headline`
- `summary`
- `published_at`
- `retrieved_at`
- `byline`
- `raw_location_text`
- `raw_topic_text`
- `source_payload`
- `dedupe_key`
- `ingestion_status`

### `news_location_matches`

Represents classification of a source item or article to locations.

Fields:

- `id`
- `item_id` or `article_id`
- `state_id`
- `city_id`
- `county`
- `metro`
- `match_type`: exact_city, county, metro, state, inferred, fallback
- `confidence`
- `reason`
- `human_review_status`

### `news_topics`

Controlled taxonomy.

Initial topics:

- home_prices
- inventory
- days_on_market
- affordability
- property_tax
- homeowners_insurance
- flood_or_hazard
- local_economy
- mortgage_rates
- fha
- va
- conventional
- jumbo
- refinance
- home_equity
- first_time_buyer
- move_up_buyer

### `news_feed_rules`

Controls what each page shows.

Fields:

- `id`
- `page_type`: state, city, product, branch, loan_officer, learning_topic
- `location_id`
- `topic_weights`
- `freshness_window_days`
- `minimum_exact_local_items`
- `fallback_topic_ids`
- `fallback_article_ids`
- `max_items`
- `requires_human_review`
- `requires_compliance_review`

### `location_news_feed_items`

Materialized feed rows used by the public site.

Fields:

- `id`
- `location_id`
- `article_id` or `source_item_id`
- `rank`
- `relevance_score`
- `relevance_label`
- `why_it_matters`
- `primary_cta_type`
- `secondary_cta_type`
- `display_status`
- `expires_at`
- `last_ranked_at`

## Article Relationship Requirements

Every published article used in a location feed should relate to:

- At least one state or city.
- At least one topic.
- At least one borrower intent.
- At least one product when relevant.
- At least one internal next step: calculator, rates, product page, location page, LO directory, or lead CTA.
- Source metadata.
- Review status.

## Static Prototype Path

For the current frontend-only prototype, keep the researched article corpus separate from the main production seed:

- `location-news-index.json`
- `location-news/{state-slug}/{location-slug}.json`
- `location-news-source-manifest.json`
- `generate-location-news.mjs`

Prototype feed generation should:

- Replace the 24 scaffold article records with researched article metadata or migrate any record that receives a complete evidence-backed body.
- Generate at least four distinct complete articles for every state and city.
- Use exact place, city, county, and state geography relationships with FIPS or official series identifiers.
- Label source/date in borrower-facing language.
- Avoid visible words like demo, placeholder, mock, generated, or internal.
- Fail an affected batch when its evidence contract cannot be met.

Recommended static index object:

```json
{
  "id": "news-austin-affordability-2024-acs",
  "title": "What Austin home values and household income show in the latest Census release",
  "dek": "The latest five-year estimates provide a local baseline for comparing home value, income, and owner-cost questions without turning public data into a payment quote.",
  "previewText": "Compare Austin's latest home-value, household-income, and owner-cost estimates with the Texas baseline.",
  "route": "/learning-center/austin-home-values-income-2024-acs",
  "contentPath": "/mock-data/location-news/texas/austin.json",
  "sourceLabels": ["U.S. Census Bureau, 2020-2024 ACS 5-year estimates"],
  "publishedAt": "2026-07-10",
  "updatedAt": "2026-07-10",
  "locationId": "city-austin-tx",
  "locationType": "city",
  "articleType": "affordability_home_values",
  "topicIds": ["home_prices", "affordability", "purchase"],
  "productIds": ["product-purchase", "product-conventional"],
  "relevanceLabel": "Austin",
  "imageId": "pexels-housing-market-exterior-001",
  "reviewStatus": "editorial_reviewed",
  "complianceStatus": "review_required"
}
```

## Production Pipeline

### Ingestion

Use source adapters rather than scraping random pages directly.

Adapter categories:

- Official public data and releases.
- State/county/city government updates.
- Local housing and business publications with approved terms.
- Trade association releases with approved use.
- Internal market updates and editorial briefs.

Store the original source item before drafting or publishing anything.

### Classification

Each item is classified by:

- Location: city, county, metro, state.
- Topic.
- Product relevance.
- Borrower intent.
- Urgency.
- Compliance sensitivity.
- Source confidence.

### Editorial Brief

An AI or automation step can draft a brief, but it should not directly publish.

Brief fields:

- Story angle.
- Borrower question answered.
- Facts supported by source.
- Facts not supported by source.
- Suggested internal links.
- Compliance cautions.
- Recommended page placements.

### Human Review

Required before publishing:

- Editor review for usefulness, tone, and accuracy.
- Compliance review when content touches rates, payments, eligibility, product fit, fees, approval, insurance, tax, or government-loan claims.
- Licensing review when the story is used to place a specific LO or branch.

### Publishing

After approval:

- Article or short market brief becomes public.
- Location matches are materialized into feeds.
- Internal links are attached.
- Feed cache is refreshed.
- Source and review metadata remain visible.

## Relevance Scoring

Initial scoring model:

- Exact city match: +50.
- County/metro match: +35.
- Parent state match: +25.
- Product match: +15.
- Topic match: +10.
- Fresh within 14 days: +10.
- Fresh within 45 days: +5.
- Human reviewed: +10.
- Compliance reviewed when required: +10.
- Stale over 180 days: -30.
- Unreviewed compliance-sensitive content: exclude.

Feed rules should always prefer reviewed content over fresh but unreviewed content.

## CMS/Admin Requirements

Admin screens needed:

- Source registry.
- Source-item inbox.
- Location matching review.
- Topic taxonomy.
- Article/news editor.
- Feed rule editor.
- Feed preview by state/city.
- Compliance queue.
- Stale feed dashboard.

Feed preview should let an editor open any state/city and see:

- Exact items shown.
- Why each item is ranked.
- Which fallback items were used.
- Missing local coverage warnings.
- Review status.

## Compliance Rules

News feed content must not:

- Promise approval, savings, rates, payment reductions, or eligibility.
- Present a public news item as lender underwriting guidance.
- Use protected-class or neighborhood steering language.
- Overstate what a market statistic means for an individual borrower.
- Use unapproved source content beyond allowed summary/attribution limits.
- Use scraped publisher content as if it were original reporting.

Required:

- Source and date.
- Review status.
- Clear distinction between public market context and borrower-specific review.
- CTA copy that says review, compare, estimate, options, or guidance.

## Missing Evidence

No location page should render an empty or generic news block. If a planned metric is unavailable, use an approved alternate public dataset that still has a documented relationship to the location. County and state evidence must be labeled at its actual geography and interpreted in the city context.

If the alternate evidence contract cannot be met, fail the affected generation batch and record the exception in the source manifest. Do not publish a renamed fallback article, invent a local fact, or expose an internal coverage warning to borrowers.

## Implementation Phases

### Phase A: Static Prototype

- Add `location-news-index.json`, per-location article bundles, and a source manifest outside `production-seed.json`.
- Add the deterministic researched-content generator and batch validation.
- Add reusable `locationNewsFeed(location)` renderer.
- Add the feed block directly below the opening editorial section on state and city pages.
- Add progressive full-article modal and standalone route behavior.
- Generate at least four distinct researched articles for all 786 location routes.
- Add smoke and corpus validation for evidence, source/date/review fields, article bodies, licensed image metadata, article visuals, unique routes, paragraph duplication, modal behavior, and no empty feeds.

### Phase B: CMS Model

- Add source registry, news source items, location matches, feed rules, and materialized feed items.
- Build admin preview and review states.
- Add stale-feed warnings.

### Phase C: Ingestion And n8n

- Add approved source adapters.
- Add dedupe.
- Add location/topic/product classification.
- Create AI brief drafting.
- Route to editor and compliance review.

### Phase D: Production Publishing

- Publish reviewed market briefs and articles.
- Add feed refresh jobs.
- Add sitemap/indexing rules.
- Add analytics for feed clickthrough, CTA engagement, and stale coverage.

## Acceptance Criteria For Phase A

1. Every state and city page renders at least four news cards directly below its opening editorial section.
2. The corpus includes at least 3,144 unique article records and 786 location bundles.
3. Cards show a theme-matched 16:9 stock photo, title, preview, location relevance, source/date, review status, and `Read more` link.
4. Every full article includes substantive borrower-facing copy, a comparison visual, methodology, limitations, sources, internal links, and contextual CTAs.
5. Every quantitative claim resolves to a source record with geography and data vintage.
6. The full article modal and standalone article route use the same record and support direct navigation, refresh, browser history, keyboard access, and focus restoration.
7. No unsupported local-expert, rate, payment, approval, eligibility, or savings claims are introduced.
8. Static and corpus validation catches missing evidence, articles, source dates, review status, photo usage metadata, article visuals, routes, bodies, and duplicate substantive paragraphs.
9. Borrower-facing copy contains no demo, placeholder, scaffold, internal planning, or wireframe language.

## Confirmed Decisions

- Four distinct articles per state and city for the initial national seed.
- Four cards on desktop and a responsive card layout on mobile without hiding an article.
- Faceless/headless news-style stock photography on cards, with data visuals inside full articles.
- Internal article routes with direct source links inside the article.
- Full article opens in a progressive modal while remaining available at its standalone URL.
- Latest available official release at generation time, with every vintage recorded in the source manifest.

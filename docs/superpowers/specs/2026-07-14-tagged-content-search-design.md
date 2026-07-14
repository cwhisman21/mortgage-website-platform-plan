# Tagged Content Discovery and Search Design

Date: 2026-07-14

Status: Approved design; awaiting written-spec review

## Objective

Create a frontend-only tagged content discovery system for the Snap Mortgage public site. Articles, education, topic guides, local market news, mortgage product guides, and calculators should be easier for borrowers and search engines to understand, connect, and browse.

The system must provide:

- Clickable primary and additional tags on public content pages.
- A controlled tag registry that can accept valuable new tags automatically.
- Crawlable single-tag result pages.
- A system search page with exact-tag autocomplete, removable tokens, free text, and `AND` / `OR` expressions.
- Separate result sections with carousels and full-result modals.
- Structured metadata and internal links that strengthen content discovery without hiding public content behind JavaScript.

## Approved Product Decisions

- Search includes articles and education, topic guides, local market news, mortgage product guides, and calculators.
- Search excludes the rates marketplace, loan-officer and branch directories, account pages, authentication, and other transactional surfaces.
- States and cities are first-class tags.
- Each page has one to three primary tags.
- Up to eight additional tags appear initially near Sources and Citations; a `Show more` accordion reveals the remainder.
- Autocomplete suggests tags only.
- Autocomplete matches case-insensitive prefixes of exact registered tag display names only. It does not use aliases, fuzzy matching, typo correction, or content-title suggestions.
- Selecting a suggestion converts it into a removable tag token.
- Every connector between adjacent tokens can be changed between `AND` and `OR`.
- `AND` has precedence over `OR`; the interface does not expose parentheses or manual grouping.
- Tag logic determines which results qualify and has priority over free text. Free text ranks the qualifying results.
- Results appear in separate, fixed-order content sections.
- Each section exposes a carousel of up to 20 results.
- `Show more` opens all matching results for that section in a modal.
- The modal supports `Relevance` and `Newest` sorting and becomes full-screen on mobile.
- Matching tags appear first on result cards with subtle visual emphasis.
- No deployment or publication is included without separate approval.

## Relationship to Existing Designs

This specification supersedes only the search and taxonomy constraints in `docs/superpowers/specs/2026-07-12-learning-center-home-redesign.md`.

The earlier design described Learning Center topic chips as links over existing `blogPages`, not a taxonomy. This design introduces a canonical tag registry and replaces the earlier first-match Learning Center search behavior. It does not authorize a redesign of the Learning Center home composition, shared header, footer, CTA system, article body structure, location templates, rates marketplace, account behavior, or other unrelated surfaces.

The root homepage hero and `site/assets/slot-hero/` remain a paused work boundary and must not be changed by this feature.

## Audience and Customer Jobs

The primary audience is a borrower or homeowner reading public mortgage content. The system should help that person:

- Continue from one useful page to closely related material.
- Combine concepts such as `FHA AND Down Payment Assistance`.
- Broaden a path such as `FHA AND Down Payment Assistance OR VA`.
- Combine location and mortgage concepts such as `Florida AND Insurance`.
- Find a calculator or product guide alongside educational content.
- Understand why a result matched without reading internal taxonomy labels.

The secondary audience is a search crawler. Core links, titles, summaries, tag relationships, and single-tag results must be present in generated HTML.

## Canonical Content Scope

The generated search index includes these content families:

1. Articles and education.
2. Topic guides.
3. Local market news.
4. Mortgage product guides.
5. Calculators and tools.

The generator should consume the existing canonical seed, compiled editorial records, location-news records, route manifest, and the relevant product and calculator collections. It must not create a second article, product, location, calculator, or route source of truth.

## Tag Registry

Maintain one canonical registry for all public tags. Each record requires:

- Stable tag ID.
- Exact borrower-facing display name.
- Stable URL slug.
- Tag type.
- Borrower-facing description used by the tag page.
- Source content IDs or routes supporting the tag.
- Related tag IDs when relationships are supported by canonical content.
- Primary canonical route relationship, when applicable.
- Created, reviewed, and last-updated dates.
- Redirect history for renamed slugs.

Supported tag types include:

- Mortgage topic or cost.
- Loan product or program.
- Borrower goal or stage.
- State or city.
- Property or occupancy concept.
- Market or economic topic.

The registry display name is the autocomplete vocabulary. Normalized forms may be used internally for duplicate detection, but they must not become public aliases or autocomplete suggestions.

## Automatic Tag Extraction

The generation pipeline should inspect structured relationships, titles, summaries, headings, topic fields, product fields, and location fields. It should reuse an existing tag before creating a new record.

A new candidate may be added automatically when it:

- Names a durable borrower-facing concept within an approved tag type.
- Represents the page's central or supporting subject.
- Is not an internal workflow, schema, planning, review, or scaffolding term.
- Is not a generic adjective, navigation instruction, or isolated common word.
- Is not a normalized duplicate of an existing tag.
- Has a production-ready display name and borrower-facing description.

The mechanical generator enforces registry shape, duplicate normalization, forbidden internal language, valid route relationships, and required fields. The content-quality workflow applies `customer-useful-mortgage-content` to the accessible canonical corpus before calling tag-page copy publication-ready.

The content skill's competing-page review distinguishes shared subject matter from duplicate page purpose. Multiple pages may discuss FHA, insurance, payments, or a location when they answer different questions or perform different jobs. Topic overlap alone is not a conflict.

Do not invent traffic, result-count, word-count, or content-volume thresholds for accepting or rejecting a tag.

## Page Tag Assignment

Every indexed content page must have one to three primary tags. Primary tags describe the page's central borrower questions and appear as clickable links above the title.

All other assigned tags are additional tags. The first eight appear near the page's Sources and Citations area. If a page has no formal Sources or Citations section, place the additional-tag block near the bottom of the main content, before related-content navigation or the page footer. If more than eight tags exist, a `Show more` accordion reveals the rest without navigating away.

All assigned tags remain available to:

- The search index.
- Structured metadata.
- Internal relationship generation.
- Tag result pages.

Location tags should usually support a subject tag rather than displace it. For example, an article about Florida homeowners insurance can use `Taxes and Insurance`, `Florida`, and `Mortgage Payment Planning` as its primary tags.

## Public Routes

Preserve and upgrade `/learning-center/search` as the shared search surface.

Generate one crawlable route for every accepted single tag:

`/learning-center/tags/{tag-slug}`

A single-tag route renders the search interface with that tag already selected. It must also contain crawlable result cards and links in the generated HTML before JavaScript runs.

Combined tag expressions and free-text queries update a shareable search URL. They are search states, not separately generated content pages. They should not enter the XML sitemap or create combinatorial static routes.

Stable tag IDs, rather than display strings, should be used in serialized query state. Slug redirects preserve inbound links when a display name or slug changes.

## Search Expression Model

The search bar accepts ordinary text and exact-tag autocomplete selections. A selected tag becomes a token. Each gap between adjacent tokens contains a compact `AND` / `OR` control.

The parser uses standard Boolean precedence without parentheses:

`FHA AND Down Payment Assistance OR VA`

is evaluated as:

`(FHA AND Down Payment Assistance) OR VA`

Implementation may model the expression as `OR`-separated groups of `AND`-connected tag IDs. A record qualifies when it satisfies every tag in at least one group.

New connectors default to `AND`, while the user can change each connector independently. The interface must visually communicate `AND` groups without exposing an advanced expression editor.

## Autocomplete

Autocomplete behavior is intentionally narrow:

- Suggestions contain tags only.
- Matching is case-insensitive.
- The typed value must match the beginning of the exact registered display name.
- No aliases, synonyms, fuzzy matching, typo correction, article titles, guide titles, calculator titles, or product titles appear as suggestions.
- Selecting a suggestion replaces the matching typed fragment with a removable token.
- Keyboard users can move through suggestions, select one, remove tokens, and dismiss the list.

Ordinary text that is not selected as a tag remains in the free-text query.

## Ranking

Tag evaluation occurs before free-text ranking:

1. Apply the Boolean tag expression to determine eligible records.
2. Rank eligible records using free-text relevance across title, summary or dek, registered tag names, location, product relationship, and approved compact index fields.
3. Break equal relevance using deterministic canonical order unless the selected modal sort is `Newest`.

If no tag tokens exist, free text searches the entire index.

For `Newest`, use the canonical published or materially updated date. Undated products and calculators remain available but sort after dated content, with deterministic canonical order as their tie-breaker.

Matched tags should appear first on result cards with subtle emphasis. The interface must not imply that an unselected related tag satisfied the query.

## Results Layout

Use this fixed section order:

1. Articles and education.
2. Topic guides.
3. Local market news.
4. Mortgage product guides.
5. Calculators and tools.

Omit empty sections. Each populated section includes its result count, a horizontal carousel containing up to 20 matching records, and a `Show more` action.

Carousel requirements:

- Stable card dimensions at each breakpoint.
- Responsive visible-card count without horizontal page overflow.
- Previous and next icon buttons with accessible names.
- Keyboard operation.
- Touch swiping.
- Reduced-motion support.
- Restored position when returning from content.

`Show more` opens a section-specific modal containing every matching record. The modal supports `Relevance` and `Newest` sorting, preserves the active query, traps focus, closes with Escape, restores focus to its trigger, and becomes a full-screen sheet on mobile.

## Result Cards

Cards link directly to canonical content routes and contain only fields supported by the underlying record:

- Content image or approved content-type visual.
- Content type.
- Borrower-facing title.
- Borrower-facing preview.
- Author and date where applicable.
- Location where applicable.
- Subtly emphasized matching tags followed by quieter related tags.

Cards must not invent reading time, popularity, ratings, recency labels, product availability, eligibility, rates, or other unsupported claims.

Missing optional images use an approved content-type fallback without rendering broken image controls.

## Component Boundaries

Keep the implementation separated into focused modules:

1. **Tag registry loader and validator** - owns tag shape, stable IDs, normalized duplicate detection, and route relationships.
2. **Tag extraction pipeline** - proposes and assigns tags from canonical structured content.
3. **Search-index generator** - creates a compact browser payload without full article bodies.
4. **Boolean expression parser** - converts ordered tokens and connectors into `OR` groups of `AND` terms.
5. **Search and ranking engine** - applies tag eligibility, free-text scoring, and deterministic sorting.
6. **Search state serializer** - owns URL parsing, history, restoration, and invalid-token handling.
7. **Autocomplete combobox** - owns exact-prefix tag suggestions and token creation.
8. **Result section and carousel** - owns fixed grouping, counts, navigation, and card presentation.
9. **Full-results modal** - owns section-wide results, sorting, focus, and mobile presentation.
10. **Article tag presentation** - owns primary and additional tag links without changing article body content.

Do not grow the existing `site/app.js` into the sole owner of registry generation, query parsing, ranking, rendering, and interaction state. It may compose focused helpers using current repo conventions.

## Search Index

Generate a compact index containing only fields required for discovery:

- Record ID.
- Canonical route.
- Content family.
- Title.
- Preview text.
- Image reference when available.
- Author when applicable.
- Published or updated date when applicable.
- Tag IDs.
- Location and product relationships needed for ranking.
- Approved compact searchable text fields.

Do not ship full article bodies, source ledgers, internal review states, private data, or unsupported mock personalization in the browser index.

Load the index only on Learning Center search and tag routes unless a smaller shared autocomplete payload is intentionally required elsewhere.

## SEO and Structured Data

Every single-tag page requires:

- Unique borrower-facing title, meta description, H1, and introduction.
- Self-referencing canonical URL unless a separately approved competing-page disposition changes it.
- Crawlable result links in generated HTML.
- Breadcrumb links.
- Related-tag links supported by canonical relationships.
- Inclusion in the public route manifest and XML sitemap.
- `CollectionPage` and `ItemList` structured data.
- A factual `Last updated` date sourced from the registry review record, not merely the latest build time.

Articles and guides should express tag relationships through appropriate Article structured-data properties such as `keywords`, `about`, and `articleSection`. Existing author, publisher, date, source, and breadcrumb data must remain intact.

Arbitrary multi-tag and free-text search states are shareable but not standalone SEO pages. They should use the base search canonical strategy, emit `noindex,follow`, and remain outside the sitemap. This is a rule for combinatorial search states, not a quality judgment or temporary status for single-tag pages.

All public labels and metadata must be borrower-facing. Do not expose registry IDs, Boolean parser terms, internal review status, scaffolding language, or generation instructions.

## Competing-Page Review

The updated `customer-useful-mortgage-content` skill requires a named competing-page inventory before an indexable page is recommended or called publication-ready. The review compares borrower question, intent, audience, entity, substantive coverage, and action rather than exact keywords alone.

It classifies related pages as `DIRECT`, `NEAR`, or `SUPPORTING` and assigns each direct or near overlap one disposition:

- `KEEP DISTINCT`.
- `DIFFERENTIATE`.
- `MERGE`.
- `CANONICALIZE`.
- `REDIRECT`.
- `DO NOT CREATE`.

This review must not classify ordinary topic clusters as duplicates. An FHA topic guide, eligibility article, calculator, product page, local guide, and tagged discovery page can coexist when each performs a distinct customer job.

The build records the review result. It does not silently delete, redirect, canonicalize, or merge an already approved public route. Any disposition that changes an existing approved route requires explicit human approval.

## Progressive Enhancement

Single-tag routes must work as useful public pages without JavaScript. Generated HTML includes the page heading, introduction, tag context, section headings, and crawlable result cards.

JavaScript enhances those pages with:

- Autocomplete.
- Tokens and operator controls.
- Combined tag expressions.
- Free-text ranking.
- Carousels.
- Sorting.
- Full-result modals.
- URL state restoration.

If the compact index fails to load, the static single-tag results remain available. The page should show a borrower-facing search-unavailable message without exposing an exception or internal implementation language.

## Empty and Error States

- A zero-result expression keeps the selected tokens visible and offers direct actions to remove a tag, change `AND` to `OR`, or clear free text.
- Empty content families are omitted rather than shown as empty scaffolding.
- Unknown tag IDs in shared URLs are ignored with a concise borrower-facing notice; valid tokens remain active.
- Renamed slugs resolve through the registry redirect history.
- A malformed expression falls back to valid tokens in their original order and defaults missing connectors to `AND`.
- Missing optional metadata never prevents a valid canonical result from appearing.
- Index load failure preserves static content and normal site navigation.

## Accessibility

- Preserve one page-level H1 and logical heading order.
- Render tags as real links when they navigate and as removable buttons only after they become selected tokens.
- Implement autocomplete using accessible combobox semantics.
- Give every operator control an accessible label that identifies the neighboring tags.
- Keep visible focus styles on tag links, tokens, operators, carousel buttons, cards, sorting, accordions, and modal controls.
- Do not rely on color alone to communicate matched tags or active operators.
- Trap and restore modal focus correctly.
- Respect reduced-motion preferences.
- Keep controls readable and tappable without mobile overflow.

## Validation

### Registry and generation

- Every assigned tag ID resolves to exactly one registry record.
- Every indexed page has one to three primary tags.
- Primary tags also exist in the complete assigned-tag set.
- New tags pass normalization, duplicate, forbidden-language, required-field, and relationship checks.
- Internal and scaffolding terms cannot enter public labels or metadata.
- Every accepted tag has a valid public route.
- Every generated tag route has a completed competing-page review record.

### Query behavior

- Exact-name prefix autocomplete is case-insensitive.
- Aliases, fuzzy matches, typo corrections, and content-title suggestions do not appear.
- Token selection and removal preserve ordered connectors.
- `AND` is evaluated before `OR`.
- Tag expressions determine eligibility before free-text scoring.
- URL serialization round-trips tags, connectors, free text, section state, and sorting.
- Invalid and renamed tokens follow the documented recovery behavior.

### Results behavior

- Content families appear in the approved fixed order.
- Empty families are omitted.
- Each carousel contains no more than 20 matching records.
- `Show more` exposes all matching records for its content family.
- Modal sorting supports relevance and newest.
- Matched-tag emphasis is subtle and accurate.
- Returning from content restores query and carousel state.

### SEO and static output

- Single-tag pages contain crawlable links before JavaScript runs.
- Tag routes have valid metadata, canonical links, breadcrumbs, and structured data.
- Article structured data includes canonical tag relationships.
- Tag routes enter the public manifest and sitemap.
- Combined query states do not create combinatorial sitemap entries.
- No tag link points to a not-found route.

### Browser and regression checks

- Desktop, tablet, and mobile layouts have no horizontal overflow.
- Combobox, tokens, operators, carousel, accordion, sorting, and modal work by keyboard.
- Focus enters and leaves the modal correctly.
- Touch carousel behavior works without trapping vertical page scrolling.
- Static route smoke checks pass for all existing and new routes.
- Public copy guards remain green.
- Existing editorial, location-news, product, calculator, and Learning Center tests remain green.
- The paused root homepage hero hash and asset boundary remain unchanged.

## Acceptance Criteria

1. Public articles and education pages expose one to three primary clickable tags above the title.
2. Up to eight additional tags appear near Sources and Citations, with a working `Show more` accordion for the remainder.
3. Every tag click opens the shared filtered search experience.
4. Every accepted single tag has a crawlable static route and valid internal links.
5. Autocomplete suggests exact registered tag-name prefixes only and converts selections into tokens.
6. Users can place `AND` or `OR` between each adjacent tag, with `AND` precedence and no parentheses UI.
7. Tag logic has priority over free-text ranking.
8. Search results use the approved five-section order.
9. Each section provides a carousel of up to 20 cards and a complete full-results modal.
10. The full-results modal supports relevance and newest sorting.
11. Result cards subtly identify matching tags.
12. Core single-tag page content remains crawlable and useful without JavaScript.
13. Generated tag pages and public copy pass the customer-useful content and competing-page review requirements.
14. Existing routes, navigation, public browsing, mobile layouts, and the paused homepage hero remain intact.

## Out of Scope

- Backend search services.
- Authentication or account persistence.
- Personalized search history.
- CRM or prequalification routing changes.
- Search suggestions for specific articles, guides, products, or calculators.
- Fuzzy matching, aliases, spelling correction, semantic vector search, or AI chat responses.
- Parentheses or an advanced Boolean query builder.
- Search across rates marketplace offers, loan officers, branches, account pages, or internal content.
- CMS or admin user interfaces for tag moderation.
- Redesigning unrelated public pages.
- Changing the paused homepage hero.
- Deployment or publication.

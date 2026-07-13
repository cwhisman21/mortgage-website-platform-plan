# Learning Center Home Redesign

Date: 2026-07-12

Status: Approved visual direction; awaiting written-spec review

## Objective

Replace the current `/learning-center` home page with a fuller education-hub composition inspired by the supplied Homewise reference while preserving Snap Mortgage's existing header, footer, design system, routes, interactions, and canonical content model.

The redesigned page should help visitors search, browse, and move among mortgage topics, articles, calculators, products, and existing conversion paths without turning the page into a new or separate content system.

## Nonnegotiable Content Constraint

The page may render only canonical objects and approved strings already present in the site implementation or `mock-data/production-seed.json`.

No implementation work may silently create any of the following:

- Topic or tag taxonomy.
- Learning-path object.
- Article, guide, calculator, or loan-product object.
- CTA type or CTA copy.
- Promotional badge or content classification.
- Editorial copy block.
- Media or image content object.

If implementation reveals a need for one of these objects, work stops at that boundary and the proposed addition is presented to the user for explicit approval.

Purely presentational treatment—layout, spacing, color, borders, responsive behavior, and decorative use of the existing icon system—does not create a content object. Presentational labels should reuse existing public labels wherever possible.

## Approved Direction

Use the reference page's long-form rhythm and hierarchy while filling the modules exclusively with Snap's existing canonical objects. Preserve the current site shell.

The approved composition is:

1. Existing site header.
2. Learning Center hero using the existing eyebrow, title, lead, and two canonical actions.
3. One search bar.
4. Canonical topic links presented as tags immediately below the search bar.
5. Existing prequalification CTA presentation.
6. Featured canonical articles.
7. Canonical topic hubs.
8. Canonical calculators.
9. Additional canonical article discovery.
10. Canonical loan paths/products.
11. Existing guidance CTA presentation.
12. Existing site footer.

The page should feel substantially closer to the supplied reference in density, pacing, and scanability, but it should remain recognizably part of the current Snap Mortgage site.

## Existing Shell

The `header()` and `footer()` output in `site/app.js` must remain the page shell. Their navigation items, account control, footer columns, disclosure, and routes are outside the redesign scope.

Shared global header/footer styling may not be changed solely to support this page. Learning Center-specific layout should be scoped to the page so unrelated routes do not regress.

## Hero

Reuse the current canonical Learning Center content:

- Eyebrow: `Learning center`.
- Title: `Mortgage education connected to local decisions.`
- Lead: `Read market updates, product explainers, tax and insurance guides, calculator walkthroughs, and first-time buyer resources.`
- Primary action: `Market updates` linking to `/learning-center/local-market-updates`.
- Secondary action: `Buying guides` linking to `/learning-center/buying-a-home`.

The hero may use an existing Snap visual asset already shipped by the site. It may not introduce a new stock photograph, generated image, or editorial media record without explicit approval.

## Search and Topic Tags

Render exactly one Learning Center search form above the topic tags. Do not leave a second search form in the hero.

The search should preserve the current behavior:

- Submit a nonempty query through the existing `data-search-form` interaction.
- Search current canonical data collections.
- Navigate to the first matching canonical route.
- Fall back to `/learning-center/search` when there is no direct match.
- Do nothing on an empty query.

The tag row is a presentation of existing `blogPages` records, excluding the Learning Center home record. Each tag uses the record's canonical `name` and `route`. It is not a new taxonomy.

Current canonical topic records are:

- Local Market Updates.
- Buying a Home.
- Refinance.
- FHA Loans.
- VA Loans.
- Jumbo Loans.
- Home Equity.
- Taxes & Insurance.
- Editorial Team.

## Featured Articles

The featured section should resolve article IDs from the Learning Center home record's `featuredArticleIds`, preserving data order:

- Austin mortgage market update: payments, inventory, and buyer leverage.
- Florida insurance costs and mortgage payment planning.
- How FHA loans work for lower down payment buyers.

Cards link to canonical article routes. Labels should derive from existing article type, topic relationship, or the existing `humanStatus()` presentation; the implementation must not create promotional classifications such as “popular” or “trending.”

## Topic Hubs

Render the eight borrower-facing topic records as compact, scannable cards. The `Editorial Team` record remains available through the topic-tag row and existing footer link, but it is not part of the borrower-topic card grid. Each card uses only:

- `name`.
- `purpose`.
- `route`.
- Existing shared icon treatment.

The section is a navigation surface over these existing `blogPages` records: Local Market Updates, Buying a Home, Refinance, FHA Loans, VA Loans, Jumbo Loans, Home Equity, and Taxes & Insurance. It does not introduce a numbered curriculum or learning-path model.

## Calculators

Render all current canonical calculator objects:

- Mortgage Payment Calculator.
- Affordability Calculator.
- Refinance Calculator.
- Rent vs Buy Calculator.
- Down Payment Calculator.

Cards use the canonical calculator name and route. Supporting text, if included, must derive from existing `captures` data or existing calculator-page copy.

## Additional Article Discovery

Render a compact selection of canonical articles not already displayed in the featured group. Selection should be deterministic and should preserve seed-data order unless the canonical model supplies an explicit alternative ordering.

The implementation must prevent duplicate articles from appearing in both featured and additional article sections.

No reading-time estimate, badge, summary, or date should be invented. Only fields already available from canonical article objects or existing article presentation helpers may be shown.

## Loan Paths

Render four canonical `products` as the visual discovery section, using existing product names, borrower goals, routes, and shared icon treatment:

- Home Purchase Loans.
- Refinance.
- FHA Loans.
- VA Loans.

Other canonical products remain available through their existing routes and the global Loan Options navigation; they are not added to this home-page shelf in this scope.

## CTAs

CTA content and behavior must come from the existing `CTA_TYPES` configuration and shared CTA helpers.

The approved page uses existing prequalification and guidance paths. It must not introduce the reference site's claims about credit impact, speed, qualification, security, or obligation unless those claims become approved canonical CTA content later.

Buttons retain their existing event attributes and modal behavior.

## Component Boundaries

Keep `learningHome()` understandable by extracting page-specific rendering helpers where useful. Suggested boundaries are:

- Learning hero and discovery controls.
- Canonical topic-tag row.
- Featured article resolver and card shelf.
- Topic-hub shelf.
- Calculator shelf.
- Additional-article resolver and shelf.
- Product/loan-path shelf.

Helpers should receive canonical records and return markup. They should not contain a second source of truth for names, routes, or editorial copy.

## Responsive Behavior

Desktop should retain the reference's broad horizontal shelves and compact vertical rhythm within the existing Snap content width.

On smaller screens:

- Hero content becomes a single column.
- The search control remains full width and stays above tags.
- Tags wrap without horizontal page overflow.
- Three-, four-, and five-column shelves collapse progressively.
- CTAs stack without truncating canonical labels.
- Existing mobile header and footer behavior remains unchanged.

## Accessibility

- Preserve a single page-level `h1`.
- Keep heading order logical across sections.
- Search retains an accessible label and keyboard submission.
- Topic tags are links, not inert chips.
- Cards expose meaningful link text.
- Keyboard focus styles remain visible.
- Decorative artwork is hidden from assistive technology; meaningful existing imagery retains appropriate alternative text.
- Color is not the sole indicator of article type or interaction state.

## Empty and Error States

- Missing featured article IDs are skipped without breaking the section.
- The featured section is omitted if no featured records resolve.
- Empty canonical collections omit their corresponding section rather than showing invented placeholder content.
- Search behavior retains its current empty-query and no-match handling.
- A missing optional image falls back to the card's presentational treatment without a broken image.

## Verification

Implementation verification should cover:

- Header and footer markup remain present and behaviorally unchanged.
- Exactly one Learning Center search form is rendered.
- Search appears before the topic tag row in document order.
- Every visible topic tag maps to an existing `blogPages` record and canonical route.
- Featured cards resolve from the Learning Center home record's `featuredArticleIds` in order.
- Additional article cards exclude featured IDs.
- Calculator and product cards use canonical records and routes.
- CTAs use existing CTA configuration and event attributes.
- No public copy-guard regression is introduced.
- Desktop and mobile visual checks confirm hierarchy, wrapping, focus visibility, and no horizontal overflow.
- Existing static smoke and integration tests remain green.

## Out of Scope

- Creating new topic/tag records.
- Defining a new learning-path schema.
- Adding article summaries, reading times, popularity, or trend rankings.
- Adding new editorial images or image-generation work.
- Changing article, topic, calculator, product, CTA, header, or footer canonical data.
- Redesigning topic pages, article pages, calculator pages, global navigation, or the footer.
- Selecting a new framework or replacing the current static application architecture.

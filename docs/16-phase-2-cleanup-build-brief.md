# Phase 2 Public Site Cleanup Build Brief

Date: 2026-07-09

Status: Build brief and implementation prompt

Source: User Q&A from the Phase 2 Snap Mortgage public-site cleanup conversation.

## Build Title

Snap Mortgage Phase 2 Public Site Cleanup: Borrower-Facing Copy, Real Navigation, Modal CTAs, and Account Save Actions

## Product Area

Snap Mortgage public acquisition site, with Snap Homes account handoff language only.

This is not a Snap Homes portal build. Snap Homes is the consumer account/workstation destination elsewhere in the ecosystem.

## Task Type

- Existing feature enhancement.
- UI/UX redesign.
- Frontend-only prototype cleanup.
- Borrower-facing copy rewrite.
- Navigation and CTA behavior cleanup.

## Problem Being Solved

The current static site introduced Phase 2 acquisition concepts, but visible public pages still include instructional language, internal scaffold labels, fake or unusable navigation links, and standalone Watchlist/CTA pages that make the site feel like a planning prototype instead of a borrower-facing public website.

The cleanup should make the public site feel like a real Snap Mortgage acquisition/content/SEO surface while preserving the approved page-type functionality.

## Primary Users

- Potential inquiring customer / borrower visitor.

## Secondary Users

- Returning Snap Homes consumer.
- Loan officer or branch team receiving simulated lead intent later.

## Admin / Operations Users

- Out of scope for this frontend-only cleanup.

## Business Goal

Improve borrower trust, SEO usefulness, and conversion quality by turning static planning copy into borrower-facing public-site copy and by routing high-intent actions into simulated account/contact handoff states without building real backend/auth/CRM logic.

## User Goal

A borrower should be able to:

1. Browse public mortgage education, rates, products, locations, calculators, loan officers, and branch pages.
2. See clear borrower-facing CTAs in context.
3. Save useful content with an Add to watchlist action.
4. Understand when a question requires account/contact/licensed review.
5. Continue through a simulated account/contact handoff without encountering fake pages, broken links, or internal planning language.

## Current State

Known current static-site state before cleanup:

- Static frontend lives under `site/`.
- Seed content lives in `mock-data/production-seed.json`.
- Phase 2 CTA and Watchlist work added reusable CTA concepts, simulated gated answers, standalone Watchlist routes, and dedicated CTA flow routes.
- User found visible internal/scaffold copy such as "Rate context", "Topic guide", "Trust layer", "dashboard", and similar labels.
- User also found unusable navigation links and public-site behavior that implied pages/flows that should not exist in this repo.

## Desired State

After cleanup:

- All visible public-site copy is borrower-facing production copy.
- Public SEO pages remain crawlable and useful.
- Every visible navigation link points to a real public content page.
- High-intent CTAs are modal-only handoffs, not dedicated fake routes.
- No standalone Watchlist page exists.
- No standalone Snap Homes public page exists.
- Watchlist behavior is only contextual Add to watchlist actions that animate toward the top-right account menu and confirm Saved to your account.
- Account menu is a compact top-right hamburger-style menu with logged-in and logged-out states.
- LO and branch pages stay lightweight and follow the approved reference structures.
- The build remains frontend-only: no real auth, backend, CRM routing, rate quote, prequal decision, offer review, upload, admin, or CMS.

## Captured Q&A Decisions

1. Instructional/explanatory sections should be rewritten into borrower-facing production copy, not simply removed.
2. Copy should use multiple paragraphs broken up by CTAs, charts, graphs, tables, and other useful page modules.
3. Article/learning pages should follow the provided SEO article anatomy: title/H1, intro, H2/H3 sections, supporting visuals/charts/tables, internal and external links, CTAs, and conclusion/next step.
4. City, state, product, rates, and calculator pages should also use long-form borrower-facing sections adapted around page-specific tools/charts/tables.
5. LO and branch pages are exceptions: keep them lightweight and use the approved inspiration structures.
6. LO profile references: New American Funding plus Movement Mortgage Amanda Silber.
7. Branch page reference: Novus Home Mortgage Edina branch.
8. Cleanup should cover all public pages.
9. Visible nav items must not link to pages that do not exist.
10. If a nav label represents a required public section from the PRD, it should map to a real page; otherwise remove the nav item.
11. Remove the standalone Watchlist page altogether.
12. Remove Watchlist from main navigation.
13. Do not create standalone Snap Homes public pages.
14. Snap Homes may appear only as contextual account/save/handoff language inside Snap Mortgage pages.
15. The Watchlist action label should be Add to watchlist.
16. After Add to watchlist, confirmation should say Saved to your account.
17. Add to watchlist should animate a small saved item/card toward the top-right account menu and increment a badge.
18. Saved count badge starts at 0.
19. Saved state persists locally in the same browser with `localStorage`.
20. Saved state must not imply backend persistence, cross-device sync, CRM routing, or Snap Homes portal storage.
21. Sign out switches the header to logged-out state and clears local saved state.
22. Default simulated state is logged in.
23. Logged-in account menu primary action is Open My Account.
24. Open My Account should show only a confirmation that the borrower would have been navigated to their account.
25. Use an existing Snap ecosystem customer identity if available.
26. Existing ecosystem docs identify Michael Thompson as a Snap Homes consumer.
27. Use a silhouette/avatar for the headshot, not a real photo.
28. Logged-in header/menu should show full name and circular headshot/avatar.
29. Logged-in account dropdown actions are limited to:
    - Open My Account
    - Request mortgage guidance
    - Review rates
    - Compare an offer
    - Sign out
30. Logged-out dropdown should be limited to:
    - Log in
    - Request mortgage guidance
31. Simulated login restores the existing Snap customer identity and logged-in header state.
32. Logged-out Add to watchlist opens the create account / login modal first.
33. In the account modal, Create account is primary and Log in is secondary.
34. Account modal is a popup/handoff only; no fields.
35. Create account and Log in both resolve to simulated logged-in state in this static site.
36. Compare an offer is modal-only, no form, no document upload, no real review.
37. Request mortgage guidance is modal-only, no form.
38. Review rates is modal-only, while public rates content remains crawlable.
39. Start prequal is modal-only with no prequal questions or decision simulation.
40. All high-intent CTA popups should share one reusable modal pattern with different titles/messages.
41. Dedicated CTA route pages such as `/prequal`, `/rates/review`, `/compare-offer`, and `/contact/request-guidance` should be removed.
42. Old CTA routes should be removed, not kept as fallback pages.
43. All internal scaffolding words should be replaced or removed from visible borrower-facing copy.
44. Zero visible labels, words, or copy should read like internal planning language.
45. It is acceptable to restructure heavily, provided the approved page-type functionality remains.

## User Flow

1. Anonymous or logged-in borrower lands on a public Snap Mortgage page.
2. Borrower browses rates, locations, loan options, calculators, learning content, loan officers, or branches.
3. Borrower clicks a contextual CTA:
   - Add to watchlist saves locally and animates toward the account menu.
   - Request mortgage guidance opens a no-fields modal.
   - Review rates opens a no-fields modal.
   - Compare an offer opens a no-fields modal.
   - Start prequalification opens a no-fields modal.
   - Contact an expert opens a no-fields modal or routes to a real LO/directory page when the action is normal navigation.
4. If logged out and borrower clicks Add to watchlist, show create account / login modal first.
5. If borrower creates account or logs in in the static modal, restore simulated logged-in state.
6. Successful save shows Saved to your account, increments badge, and persists local saved count in this browser.
7. Open My Account shows a confirmation that the borrower would have been navigated to Snap Homes.
8. Sign out clears local saved state and switches header into logged-out state.
9. Borrower can continue browsing public pages; no fake Watchlist or CTA routes should be reached.

## Pages / Components Needed

### Pages

- Home.
- Locations overview.
- State pages.
- City pages.
- Rates page.
- Loan option/product pages.
- Learning center.
- Topic pages.
- Article pages.
- Calculator pages.
- Directory/search pages.
- Loan officer profiles.
- Branch profiles.

### Components

- Borrower-facing section copy blocks.
- Contextual CTA panels/decks/cards.
- Reusable high-intent modal.
- Top-right account menu.
- Logged-in account trigger with hamburger icon, full name, silhouette avatar, and saved-count badge.
- Logged-out account menu.
- Add to watchlist button.
- Save-to-account animation.
- Saved confirmation/toast.
- Gated/personalized-review panels that keep public SEO content visible.

### Modals / Drawers

- Shared CTA modal pattern:
  - Create account / log in.
  - Open My Account confirmation.
  - Request mortgage guidance.
  - Review rates.
  - Compare an offer.
  - Start prequalification.
  - Contact an expert.

No modal should collect real fields.

### Tables / Lists

Preserve existing approved tables/lists/charts for:

- Rates.
- Market data.
- Product comparisons.
- Calculator assumptions/results.
- Related articles.
- LO/branch rosters.

### States

- Logged-in account state: default.
- Logged-out account state.
- Save success.
- Logged-out save requires account/create/login modal.
- Modal open/close.
- Local saved badge starts at 0 and increments.
- Sign-out clears saved state.
- Route not found should remain safe but no visible nav/CTA should point to removed routes.

## Data Objects Touched

### Created

- No real backend objects.
- Frontend-only session object in `localStorage` for simulated logged-in/saved state.

### Read

- Existing static seed data from `mock-data/production-seed.json`.
- Existing route/content structures in `site/app.js`.
- Existing public page metadata in `site/index.html`.

### Updated

- Frontend UI state only:
  - `isLoggedIn`
  - `savedCount`
  - `savedItems`

### Deleted / Archived

- Remove public navigation or routes for:
  - Standalone Watchlist page.
  - Standalone Snap Homes page.
  - Dedicated CTA flow pages.

### Linked Relationships

- Preserve public content relationships:
  - Rates to calculators, products, locations, learning, LOs.
  - Products to locations, calculators, learning, LOs.
  - Locations to products, calculators, articles, branches, LOs.
  - Articles to products, locations, calculators, CTA actions.

## Required Fields

No real user-submitted fields are required in Phase 2 cleanup.

## Optional Fields

None for CTA modals. The modal is a no-fields handoff.

## Sensitive Fields

Do not store:

- Name typed by user.
- Email.
- Phone.
- Credit data.
- Income.
- Assets.
- Debts.
- SSN.
- Property-specific private data.
- Uploaded documents.
- Personalized rates or APRs.
- Prequalification answers.
- Offer documents.

## Derived Fields

Frontend-only:

- Saved count.
- Saved item label.
- Current route at time of save.
- Save timestamp, only if useful and non-sensitive.

## Integrations Touched

### Internal Systems

None in this frontend-only build.

### External Systems

None.

### Events / Webhooks

None.

### Imports / Exports

None.

### Source of Truth

- Public site content source: static seed and static JS renderer.
- Real account, auth, Snap Homes portal, CRM, lead routing, pricing, and prequalification remain outside this repo.

## Permissions / Role Logic

### Create

No backend create permission.

### Read

All public content remains readable by anonymous visitors.

### Update

Only local browser session state is updated.

### Delete / Archive

No backend delete/archive. Simulated sign out clears local saved state.

### Admin Override

Out of scope.

### Audit / Logging

Out of scope. No real audit trail.

## Analytics / Events To Track

No analytics implementation is required in the static build unless an existing analytics pattern already exists.

Future recommended events:

- `cta_modal_opened`
- `account_modal_opened`
- `account_login_simulated`
- `account_create_simulated`
- `watchlist_item_added`
- `watchlist_save_requires_login`
- `account_open_confirmation`
- `account_signout_simulated`
- `public_nav_clicked`

## Compliance / Risk Flags

This work touches regulated mortgage advertising and borrower trust areas. It must avoid:

- Guaranteed approval.
- Guaranteed savings.
- Best-rate or lowest-rate claims.
- Unsupported product eligibility claims.
- Personalized rate, APR, or payment claims.
- Real prequalification or credit decision language.
- Real offer comparison or underwriting implication.
- Real document upload or review.
- Government endorsement implication.
- Storing borrower financial data in localStorage.

Use safer language:

- may
- estimate
- review
- compare
- options
- licensed review
- account handoff
- no credit decision
- no rate lock
- no commitment to lend

## Assumptions

- The current repo remains a static frontend prototype, not a production app.
- `site/app.js`, `site/styles.css`, `site/index.html`, and `mock-data/production-seed.json` are the likely implementation files.
- Michael Thompson is an acceptable existing Snap Homes consumer fixture based on `central-2-design/docs/unified-ecosystem-entity-model.md`.
- A silhouette avatar is acceptable for the simulated headshot.
- `localStorage` is acceptable for frontend-only saved state.
- Browser-facing copy is what matters for removing internal scaffold language; source code helper names may remain if they are not visible.

## Open Questions

- Real Snap Homes account URL is unknown and should not be invented.
- Real auth/session provider is unknown and out of scope.
- Real CRM/lead/opportunity destination is unknown and out of scope.
- Real pricing/rate review system is unknown and out of scope.
- Real offer-comparison workflow is unknown and out of scope.
- Final compliance/legal review requirements are unknown and should be handled before production launch.

## Recommended Downstream Skills

- `snap-ecosystem-brain`: preserve Snap product boundaries and account/portal language.
- `repo-intelligence`: inspect current static route/content implementation.
- `ui-ux-builder` / `frontend-design`: build the account menu, modal, save animation, and responsive UI.
- `mortgage-copywriter`: rewrite borrower-facing mortgage copy and risk-screen claims.
- `compliance-risk-reviewer`: review regulated language and disclaimers. Skill category recommended; exact installed skill may differ.
- `implementation-builder`: perform code edits after this brief.
- `qa-testing` / `snap-qa-testing`: validate routes, CTAs, modal behavior, mobile overflow, and mortgage risk copy.
- `code-review-refactor`: remove dead routes/functions and reduce implementation clutter after behavior passes.

## Acceptance Criteria

1. All visible public pages use borrower-facing copy; no visible internal scaffold labels remain.
2. Visible navigation links route only to real public content pages.
3. No standalone Watchlist page or Snap Homes public page exists.
4. Watchlist is removed from main navigation.
5. Add to watchlist remains available contextually on designated pages.
6. Add to watchlist animates toward the top-right account menu.
7. Add to watchlist increments a saved-count badge that starts at 0.
8. Add to watchlist confirms Saved to your account.
9. Saved count/state persists locally in the same browser only.
10. Sign out switches to logged-out state and clears local saved state.
11. Default header state is logged in as Michael Thompson with a circular silhouette avatar.
12. Logged-in account menu contains only Open My Account, Request mortgage guidance, Review rates, Compare an offer, and Sign out.
13. Open My Account shows a confirmation that the borrower would have been navigated to Snap Homes.
14. Logged-out menu contains only Log in and Request mortgage guidance.
15. Logged-out Add to watchlist opens create account / login modal first.
16. Create account and Log in are no-fields actions and restore simulated logged-in state.
17. Request mortgage guidance, Review rates, Compare an offer, Start prequalification, and Contact an expert use no-fields modal handoffs.
18. Dedicated CTA routes such as `/prequal`, `/rates/review`, `/compare-offer`, and `/contact/request-guidance` are removed from the static route map and visible UI.
19. Anonymous educational browsing still works.
20. Public SEO content is not hidden behind gates or modals.
21. Gated/personalized-review panels clearly explain that specific borrower answers need account/contact/licensed review without implementing real auth or decisions.
22. Compare an offer does not imply real upload, underwriting, review, or guaranteed savings.
23. LO pages remain lightweight and follow New American Funding + Movement Mortgage inspiration.
24. Branch pages remain lightweight and follow Novus Edina inspiration.
25. Static route smoke checks pass with no not-found routes from visible nav/links.
26. Mobile layouts have no horizontal overflow.

## Final Codex Build Prompt

```markdown
Inspect the repo first. Read `AGENTS.md`, `README.md`, `docs/10-v1-prd.md`, `docs/14-design-reference-examples.md`, `docs/15-production-research-and-content-plan.md`, the current static site under `site/`, and `mock-data/production-seed.json`. Also read relevant Snap skills/references if available, especially `snap-ecosystem-brain` and this build brief at `docs/16-phase-2-cleanup-build-brief.md`. Then build the following.

Objective:
Create the Snap Mortgage Phase 2 public-site cleanup build. Rewrite the public static site so it reads and behaves like a borrower-facing Snap Mortgage acquisition/content/SEO site, with contextual modal-only high-intent CTAs and lightweight Snap Homes account handoff behavior. Do not build a Snap Homes portal.

Snap ecosystem context:
This repo is the Snap Mortgage public acquisition surface. It should educate anonymous borrowers, support SEO, show rates/products/locations/calculators/learning/LO/branch content, and route higher-intent actions into simulated account/contact handoffs. Snap Homes is the consumer account/workstation destination elsewhere in the ecosystem; this repo should only mention Snap Homes in account/login/handoff language. Watchlist behavior here is only an Add to watchlist action that saves locally and visually moves toward the account menu.

Product area:
Snap Mortgage public site, with Snap Homes account handoff language only.

Scope:
- Public static site pages only.
- Rewrite visible public copy into borrower-facing production copy.
- Remove internal/instructional/scaffold wording from visible UI.
- Preserve crawlable public content and SEO value.
- Preserve approved page-type functionality.
- Keep article/learning pages in SEO content anatomy: title/H1, intro, H2/H3 sections, supporting visuals/charts/tables, internal/external links, CTAs, conclusion/next step.
- Apply long-form borrower-facing structure to city, state, product, rates, and calculator pages around their tools/charts/tables.
- Keep LO and branch pages lightweight, using the approved references:
  - LO pages: New American Funding + Movement Mortgage Amanda Silber.
  - Branch pages: Novus Home Mortgage Edina branch.
- Add a top-right account menu.
- Add reusable no-fields CTA modal.
- Add contextual Add to watchlist buttons.
- Add save-to-account animation and saved-count badge.
- Use frontend-only local state for simulated logged-in/saved behavior.

Out of scope:
- Real authentication.
- Real account creation.
- Real Snap Homes portal/workstation.
- Standalone Snap Homes public pages.
- Standalone Watchlist page.
- Real backend persistence.
- Real CRM or opportunity routing.
- Real lead form submission.
- Real prequalification questions or decisions.
- Real rate quote or pricing decisions.
- Real offer document upload, review, underwriting, or comparison.
- Admin/CMS implementation.
- Full Phase 3 home search, listings, filters, saved homes, or alerts.

User roles:
- Primary: potential inquiring customer / borrower visitor.
- Secondary: returning Snap Homes consumer.
- Secondary: loan officer / branch team receiving simulated lead intent later.
- Admin/operations: out of scope.

Workflow:
1. Borrower browses public Snap Mortgage pages anonymously or as the simulated logged-in customer.
2. Public content remains visible and useful without requiring account or contact.
3. Borrower clicks contextual CTA.
4. High-intent CTA opens a no-fields modal/handoff.
5. Add to watchlist saves locally, animates toward the account menu, increments the saved badge, and confirms Saved to your account.
6. If logged out, Add to watchlist opens the create account / login modal first.
7. Create account or Log in restores the simulated logged-in state.
8. Open My Account shows only a confirmation that the borrower would have been navigated to Snap Homes.
9. Sign out clears local saved state and switches to logged-out header state.
10. Borrower can continue browsing public content with no fake route dead ends.

UI requirements:
- Top-right account menu should look like a hamburger menu with account identity.
- Default state is logged in.
- Logged-in customer identity should use existing Snap ecosystem fixture: Michael Thompson, Snap Homes consumer.
- Use a circular silhouette/avatar, not a real headshot.
- Logged-in account menu actions are limited to:
  - Open My Account
  - Request mortgage guidance
  - Review rates
  - Compare an offer
  - Sign out
- Logged-out menu actions are limited to:
  - Log in
  - Request mortgage guidance
- Open My Account opens a confirmation modal only.
- Create account is the primary action in account/login modal; Log in is secondary.
- Both Create account and Log in resolve to simulated logged-in state.
- No modal should collect fields.
- Add to watchlist label must be exactly "Add to watchlist".
- Add to watchlist confirmation must say "Saved to your account".
- Saved badge starts at 0.
- Saved state may persist with `localStorage` in this browser only.
- Sign out clears local saved state.
- Remove Watchlist from main nav and footer nav.
- Remove standalone Watchlist/Snap Homes pages and visible links to them.
- Remove or replace visible internal words such as context, placeholder, demo, prototype, wireframe, workflow, dashboard, unlock, Topic guide, Trust layer, Content graph, Editorial graph, and Answer unlock unless the word is truly natural borrower-facing copy.
- Preserve existing visual patterns where useful, but restructure heavily where needed to make pages borrower-facing.
- Preserve responsive behavior and avoid mobile overflow.

Backend requirements:
- None. This is frontend-only.
- Do not add backend persistence, APIs, auth, CRM routing, pricing, prequal, upload, or portal integration.

Data requirements:
- Objects touched:
  - Static seed content.
  - Static route map.
  - Frontend-only local session state.
- Required fields:
  - `isLoggedIn`
  - `savedCount`
  - `savedItems` if useful.
- Optional fields:
  - saved item label, route, timestamp.
- Sensitive fields:
  - Do not store borrower financial data, PII, rates, APRs, uploaded files, offer documents, or prequalification answers in localStorage.
- Permissions/role logic:
  - Anonymous visitors can read public content.
  - Logged-out Add to watchlist prompts account/create/login modal.
  - Simulated logged-in state can save locally.
- Audit/history needs:
  - None.

Integration requirements:
- Internal systems: none.
- External systems: none.
- Events/webhooks/imports/exports: none.
- Source of truth: real account, Snap Homes portal, CRM, lead routing, pricing, prequal, and offer comparison are external/out of scope.
- Failure/retry behavior: not applicable beyond safe modal close states and localStorage fallback.

Compliance and risk flags:
- Avoid guaranteed approval, guaranteed savings, best-rate claims, unsupported eligibility claims, and implied underwriting.
- Use "may", "estimate", "review", "compare", "options", and "licensed review" language.
- Personalized rates, APRs, payments, product availability, prequalification, and offer comparison are not performed here.
- Compare an offer must not imply real upload, document review, underwriting, or savings.
- Public content should disclose that actual terms depend on borrower facts, property details, market conditions, and lender review where relevant.
- Do not make compliance conclusions; flag remaining legal/compliance review needs.

Analytics:
- No analytics implementation required unless existing project patterns already support it.
- Future events to consider:
  - `cta_modal_opened`
  - `account_modal_opened`
  - `account_login_simulated`
  - `account_create_simulated`
  - `watchlist_item_added`
  - `account_open_confirmation`
  - `account_signout_simulated`

Acceptance criteria:
1. All visible public pages use borrower-facing copy with no internal scaffold language.
2. Every visible navigation link routes to a real existing public page.
3. No visible nav/CTA links route to `/snap-homes`, `/snap-homes/watchlist`, `/prequal`, `/rates/review`, `/compare-offer`, or `/contact/request-guidance`.
4. Standalone Watchlist and Snap Homes public pages are removed from route map and visible UI.
5. High-intent CTAs are modal-only and no-fields.
6. Default account state is logged in as Michael Thompson with circular silhouette avatar.
7. Logged-in and logged-out account menus match the action lists above.
8. Open My Account shows Snap Homes handoff confirmation only.
9. Add to watchlist appears contextually, animates toward the account menu, increments badge, persists locally, and confirms Saved to your account.
10. Logged-out Add to watchlist opens create account / login modal first.
11. Sign out clears local saved state and switches to logged-out state.
12. Public SEO content remains crawlable and not hidden behind gates.
13. Gated/personalized-review panels clearly explain that deeper answers require account/contact/licensed review without real auth or decisions.
14. Compare an offer is a placeholder handoff and does not imply real review/upload/underwriting.
15. Existing static route smoke checks pass with no not-found links from visible navigation.
16. Mobile checks show no horizontal overflow.

Files likely involved:
- `site/app.js`
- `site/styles.css`
- `site/index.html`
- `mock-data/production-seed.json`
- `docs/16-phase-2-cleanup-build-brief.md`

Tests to run:
- JavaScript syntax check for `site/app.js`.
- JSON parse check for `mock-data/production-seed.json`.
- Static scan for removed route references in visible UI.
- Static or rendered scan for internal scaffold language in borrower-facing text.
- Route smoke check for all known public routes.
- CTA modal behavior check.
- Add to watchlist save animation and badge behavior check.
- Logged-in/logged-out account menu behavior check.
- Mobile overflow checks for representative routes.

Output expected:
- Summarize changed files.
- List validation performed and results.
- Note what remains simulated.
- Note Phase 3 candidates, especially full home search, real backend/account integration, real Snap Homes portal handoff URL, real CRM/lead routing, real auth, real rates/prequal, and real offer comparison.
```

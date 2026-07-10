# Phase 2 Optimization Handoff Brief

Date: 2026-07-09

Status: Superpowers review findings, Snap prompt, and multi-skill implementation handoff

## Build Title

Snap Mortgage Phase 2 Optimization: Source Copy Cleanup, Link Integrity, Modal Polish, and Static QA Guardrails

## Product Area

Snap Mortgage public acquisition site, with Snap Homes account handoff language only.

## Task Type

- Existing feature enhancement.
- Repo cleanup/refactor.
- UI/UX polish.
- Borrower-facing copy hardening.
- Static QA/regression hardening.

## Problem Being Solved

The current Phase 2 cleanup build now has the intended public-site direction, but the implementation still carries old planning language and route-era residue in source templates, CSS, and source-note links. Runtime copy sanitizing masks some visible issues, but it leaves the source of truth fragile and makes future edits more likely to reintroduce internal planning language.

## Superpowers Optimization Findings

1. Replace runtime borrower-copy sanitizing with direct source copy cleanup. The source still contains labels such as "Trust layer," "Answer unlock," "Topic guide," "Content graph," and broad "context" phrasing. Those should be rewritten in the templates rather than corrected by a text-walker after render.
2. Remove dead standalone Watchlist styling. Standalone Watchlist routes were removed, but CSS for Watchlist dashboard cards remains. Keep only the contextual Add to watchlist action and save animation styling.
3. Remove unusable `#` source links. Internal pricing/licensing source notes should render as non-clickable source labels unless they have a real destination.
4. Add a deterministic static QA script. The repo needs a local check that catches removed route references, source-note dead anchors, obvious scaffold phrases, seed JSON errors, and broken static route relationships before visual QA.
5. Improve modal and menu interaction quality where practical. Modal handoffs should close with Escape, preserve clear focus behavior, and keep actions as no-fields handoffs.
6. Preserve the approved Phase 2 surface. Do not add standalone Snap Homes, Watchlist, prequal, compare-offer, rate-review, lead form, auth, CRM, or backend pages.

## Primary Users

- Potential inquiring customer / borrower visitor.

## Secondary Users

- Returning Snap Homes consumer.
- Loan officer or branch team receiving simulated lead intent later.
- Future editor/developer maintaining borrower-facing public pages.

## User Flow

1. Borrower opens any public Snap Mortgage page.
2. Page copy is borrower-facing from the source template, not corrected after rendering.
3. Borrower can navigate only to real public content pages or open modal-only CTA handoffs.
4. Borrower can use Add to watchlist contextually; the saved item animates toward the account menu and confirms "Saved to your account."
5. Source disclosures either link to real public sources or display non-clickable internal source labels.
6. Static QA can be run before manual browser QA to catch regressions.

## Pages / Components Needed

- Existing static pages only:
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
- Existing components to harden:
  - Section labels and intro copy.
  - Source note rendering.
  - CTA modals.
  - Account menu.
  - Add to watchlist animation.
  - Static route/link smoke checks.

## Data Objects Touched

- Created:
  - Optional local QA script only.
- Read:
  - Static seed content.
  - Static route map.
  - Frontend-only local session state.
- Updated:
  - Public-page source strings.
  - Source-note rendering logic.
  - CSS for removed/remaining UI patterns.
  - QA checks.
- Deleted/archived:
  - Dead CSS for removed standalone Watchlist dashboard/card UI.
- Linked relationships:
  - Preserve public content links among rates, products, calculators, learning, locations, loan officers, and branches.

## Required Fields

No new borrower fields.

## Integrations Touched

None. This is frontend-only.

## Permissions / Role Logic

- Public content remains readable by anonymous visitors.
- Simulated logged-in state remains local-only.
- Add to watchlist remains local-only.
- No backend permissions, auth, CRM routing, or audit events are added.

## States Needed

- Empty state: route not found remains safe, but no visible nav/CTA should target removed routes.
- Loading state: unchanged static seed load behavior.
- Error state: source/seed load failure remains safe.
- Success state: modal opens, save confirms, static QA exits 0.
- Abandoned/incomplete state: modal close returns the borrower to public browsing.

## Analytics / Events To Track

No analytics implementation in this pass. Future events remain:

- `cta_modal_opened`
- `account_modal_opened`
- `watchlist_item_added`
- `account_open_confirmation`
- `account_signout_simulated`

## Compliance / Risk Flags

- Do not imply guaranteed approval, guaranteed savings, real prequalification, real pricing, real rate lock, real offer review, document upload, underwriting, or backend account persistence.
- Keep rate, APR, payment, eligibility, product availability, refinance, and offer-comparison language qualified.
- Source notes for internal systems should not become fake links or imply public access to internal pricing/licensing systems.
- This is not legal advice; final production launch still needs compliance/legal review.

## Assumptions

- The repo remains a static frontend-only prototype.
- `site/app.js`, `site/styles.css`, `site/index.html`, `mock-data/production-seed.json`, and documentation are the likely affected files.
- Browser automation may remain unavailable in this environment, so static QA should be strengthened as a useful floor, not a replacement for visual/manual QA.

## Open Questions

- Real Snap Homes account URL is unknown and remains out of scope.
- Real auth/session provider is unknown and remains out of scope.
- Real CRM/lead routing destination is unknown and remains out of scope.
- Real production compliance approval process is unknown and remains out of scope.

## Recommended Downstream Skills

- `snap-ecosystem-brain`: preserve Snap Mortgage and Snap Homes boundaries.
- `mortgage-copywriter`: rewrite source copy with mortgage risk language in mind.
- `frontend-design`: polish modal/account/watchlist interaction without adding new pages.
- `code-review-refactor`: remove dead route-era residue and reduce fragile runtime transformations.
- `snap-qa-testing`: run static, route, responsive, and manual QA planning after edits.

## Acceptance Criteria

1. Runtime text sanitizer is removed or reduced so borrower-facing copy is correct in the source templates.
2. No visible source template labels use internal scaffold phrasing such as "Trust layer," "Answer unlock," "Topic guide," "Content graph," or "Editorial graph."
3. Broad "context" labels are rewritten into borrower-facing alternatives such as assumptions, local factors, market details, source notes, next steps, or related pages where appropriate.
4. No visible public link points to `#` as a fake destination.
5. Internal source records without public URLs render as non-clickable source labels.
6. Dead standalone Watchlist dashboard/card CSS is removed while contextual Add to watchlist styling remains.
7. Existing public routes continue to work.
8. Removed route references do not return in visible UI or seed review loops.
9. High-intent CTAs remain modal-only and no-fields.
10. Add to watchlist behavior remains contextual, local-only, animated, and account-menu based.
11. A static QA command exists and checks the important Phase 2 route/copy/link invariants.
12. Existing fast checks pass: JavaScript syntax, JSON parse, route/link smoke checks, and static QA.
13. If rendered browser QA remains blocked by environment, final notes state that clearly.

## Final Codex Build Prompt

```markdown
Inspect the repo first. Read `AGENTS.md`, `README.md`, `docs/16-phase-2-cleanup-build-brief.md`, the static site under `site/`, and `mock-data/production-seed.json`. Use Snap ecosystem context where relevant. Then implement the Phase 2 optimization pass below.

Objective:
Harden the Snap Mortgage Phase 2 public-site cleanup build so borrower-facing copy is correct at the source, visible links are real, removed Watchlist/dashboard residue is gone, CTA/account behavior remains modal-only, and static QA can catch regressions.

Snap ecosystem context:
This repo is the Snap Mortgage public acquisition/content/SEO site. Snap Homes is the consumer account/workstation destination elsewhere in the ecosystem. This repo should only use Snap Homes for account/save/handoff language. Do not build a Snap Homes portal, Watchlist dashboard, auth flow, backend persistence, CRM routing, prequal decisioning, rate quote logic, or offer review.

Scope:
- Public static site only.
- Rewrite remaining source-template internal labels and broad scaffold phrasing into borrower-facing production copy.
- Remove or reduce runtime borrower-copy sanitizing once source strings are corrected.
- Remove dead standalone Watchlist dashboard/card styling.
- Keep contextual Add to watchlist CTA and save animation.
- Replace fake `#` source links with non-clickable source labels unless a real public URL exists.
- Add a deterministic static QA script for Phase 2 route/copy/link invariants.
- Preserve existing page type functionality, routes, visual system, and static seed structure.

Out of scope:
- Real authentication.
- Real account creation.
- Real Snap Homes portal/workstation.
- Standalone Watchlist page.
- Real backend persistence.
- Real CRM/opportunity routing.
- Real lead form submission.
- Real prequalification questions or decisions.
- Real personalized rates, APRs, pricing, rate locks, or offer review.
- Admin/CMS implementation.
- Full Phase 3 home search.

User roles:
- Primary: borrower visitor.
- Secondary: returning Snap Homes consumer.
- Secondary: future public-site editor/developer.
- Admin/operations: out of scope.

Workflow:
1. Borrower browses public Snap Mortgage pages.
2. Public copy reads correctly without runtime cleanup.
3. Borrower navigates only to real public pages or opens modal-only CTA handoffs.
4. Borrower can add content to watchlist contextually; save remains local-only and account-menu based.
5. Source notes either link to real public sources or display non-clickable internal source labels.
6. Developer can run static QA to catch route/copy/link regressions.

UI requirements:
- Keep the top-right account menu and modal-only CTA pattern from Phase 2.
- Keep default simulated logged-in user as Michael Thompson with circular silhouette avatar.
- Keep Add to watchlist label exactly "Add to watchlist" and confirmation "Saved to your account."
- Do not add standalone Snap Homes/Watchlist navigation.
- Do not add input fields to CTA/account modals.
- Improve modal/account interaction polish only where it supports the existing behavior.

Backend requirements:
- None.
- Do not add API routes, auth providers, databases, server actions, CRM routing, uploads, analytics pipelines, or integrations.

Data requirements:
- Objects touched: static seed, static route map, local-only session/save state, optional QA script.
- Sensitive fields: do not store borrower PII, financial data, credit data, personalized pricing, prequal answers, or offer documents.
- Permissions/role logic: anonymous browsing remains public; simulated account/save state remains browser-local only.

Integration requirements:
- Internal systems: none.
- External systems: none.
- Source of truth: real account, CRM, pricing, prequal, and offer comparison remain external and out of scope.

Compliance and risk flags:
- Avoid guaranteed approval, guaranteed savings, lowest-rate/best-rate claims, unsupported eligibility claims, government endorsement implication, real underwriting implication, or real offer-review implication.
- Use "may," "estimate," "review," "compare," "options," and "licensed review" language.
- Treat rates, APRs, payments, refinance, eligibility, product availability, and offer comparison as compliance-sensitive.

Analytics:
- No analytics implementation required.

Acceptance criteria:
1. Source templates no longer require a broad runtime text sanitizer for borrower-facing copy.
2. No visible source-template labels use internal scaffold phrases such as "Trust layer," "Answer unlock," "Topic guide," "Content graph," or "Editorial graph."
3. Broad "context" wording is replaced where it reads like scaffold copy.
4. No visible public link points to `#`.
5. Internal-only source notes render as non-clickable text.
6. Dead standalone Watchlist dashboard/card CSS is removed.
7. Contextual Add to watchlist behavior remains intact.
8. High-intent CTAs remain modal-only and no-fields.
9. Removed routes do not reappear in visible nav, CTA hrefs, seed loops, or static route checks.
10. Static QA script exists and passes.
11. `node --check site/app.js` passes.
12. `mock-data/production-seed.json` parses.
13. If browser automation is unavailable, final output notes that rendered/mobile checks still need manual browser verification.

Files likely involved:
- `site/app.js`
- `site/styles.css`
- `site/index.html`
- `mock-data/production-seed.json`
- `docs/17-phase-2-optimization-handoff-brief.md`
- Optional: `site/phase2-static-smoke.mjs`

Tests to run:
- JavaScript syntax check for `site/app.js`.
- JSON parse check for `mock-data/production-seed.json`.
- Static QA script for Phase 2 invariants.
- Route/link scan for removed routes and fake `#` links.
- Browser/manual QA if environment supports it.

Output expected:
- Summarize changed files.
- List validation performed and results.
- Note what remains simulated.
- Note Phase 3 candidates and any manual QA still needed.
```

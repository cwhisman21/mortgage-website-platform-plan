# Vercel / v0 Modern Stylization Prompt

Use this prompt when importing this repo into v0 or asking Vercel Agent to propose a UI modernization patch.

```markdown
Inspect the repo first. Read `AGENTS.md`, `README.md`, `docs/16-phase-2-cleanup-build-brief.md`, `docs/17-phase-2-optimization-handoff-brief.md`, the static site under `site/`, and `mock-data/production-seed.json`.

Objective:
Apply modern, production-grade visual styling to the Snap Mortgage public acquisition site without changing the approved Phase 2 behavior, routes, or simulated-only scope.

Product context:
This is a Snap Mortgage borrower-facing public site. It educates anonymous borrowers through rates, local market pages, loan options, calculators, learning content, loan officer profiles, and branch pages. Snap Homes appears only as contextual account/save/handoff language. Do not build a Snap Homes portal.

Design direction:
- Make the site feel modern, polished, editorial, and trustworthy for mortgage borrowers.
- Use a refined acquisition-site visual system, not a generic SaaS dashboard and not a marketing-only landing page.
- Improve typography hierarchy, spacing, section rhythm, card density, CTA clarity, tables, charts, account menu, modals, and mobile polish.
- Preserve a professional mortgage-finance tone: confident, transparent, calm, and easy to scan.
- Use a varied but disciplined palette; avoid one-note purple/blue gradients, excessive glow, decorative blobs, bokeh, or over-rounded cards.
- Prefer useful visual structure: readable content columns, clear comparison tables, restrained cards, source/disclosure blocks, compact CTA panels, and mobile-friendly controls.
- Keep cards at 8px border radius or less unless the existing CSS token already requires otherwise.
- Do not hide SEO copy behind gates, accordions, modals, or client-only interactions.

Functional constraints:
- Preserve all existing public routes.
- Preserve modal-only high-intent CTAs.
- Preserve Add to watchlist behavior, local saved badge, and account menu.
- Preserve default simulated logged-in state as Michael Thompson with circular silhouette avatar.
- Preserve no-fields CTA/account modals.
- Do not add real auth, backend persistence, CRM routing, prequal decisions, real rate quotes, offer uploads, admin/CMS, or full home search.
- Do not add standalone Snap Homes, Watchlist, prequal, compare-offer, contact, or rate-review pages.
- Do not introduce new framework dependencies unless absolutely necessary.

Copy and compliance constraints:
- Keep all visible copy borrower-facing.
- Avoid internal scaffold language such as demo, prototype, placeholder, wireframe, dashboard, trust layer, answer unlock, content graph, editorial graph, or topic guide.
- Avoid guaranteed approval, guaranteed savings, lowest-rate/best-rate claims, unsupported eligibility claims, government endorsement implication, or real underwriting implication.
- Use "may," "estimate," "review," "compare," "options," and "licensed review" where appropriate.

Likely files:
- `site/styles.css`
- `site/app.js`
- `site/index.html`
- `site/phase2-static-smoke.mjs`

Validation:
- Run `node --check site/app.js`.
- Run `node --check site/phase2-static-smoke.mjs`.
- Run `node site/phase2-static-smoke.mjs`.
- Parse `mock-data/production-seed.json`.
- Render-check representative desktop/mobile routes if browser tooling is available:
  - `/site/`
  - `/site/#/rates`
  - `/site/#/locations/texas/austin`
  - `/site/#/loan-options/fha-loans`
  - `/site/#/learning-center/buying-a-home`
  - `/site/#/loan-officers/ava-martinez`
  - `/site/#/branches/austin-central`
- Verify no horizontal overflow on mobile.
- Verify Add to watchlist still animates and increments the account badge.
- Verify Open My Account still opens the Snap Homes handoff confirmation modal.

Output expected:
- Summarize visual changes.
- List changed files.
- List tests run.
- Note anything still simulated.
- Note any remaining manual QA needed.
```

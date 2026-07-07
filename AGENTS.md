# Agent Instructions

This repo is the source of truth for the mortgage website platform planning project.

## Start Here

When a new Codex chat opens this repo, read these files first:

1. `README.md`
2. `docs/00-chat-handoff.md`
3. `docs/01-vision-and-positioning.md`
4. `docs/02-information-architecture.md`
5. `docs/03-page-templates.md`
6. `docs/04-backend-and-cms-admin.md`
7. `docs/05-data-model.md`
8. `docs/08-grill-me-questions.md`

The original planning conversation is not automatically available to new chats. The handoff and docs exist so future agents can recover the plan from the repo itself.

## Project Intent

Plan a high-value mortgage website that functions as a local mortgage intelligence, editorial, SEO, and loan officer placement platform.

The site should not be a simple brochure site. It should combine:

- City and state market dashboards.
- Local news/editorial coverage.
- Standardized tables, charts, facts, and FAQs.
- Product and localized product pages.
- Loan officer and branch placement.
- Sticky contextual CTAs.
- CMS/admin controls.
- Compliance-aware publishing.
- Future AI/n8n local news generation.

## Current Status

- Planning repository only.
- No application code yet.
- No framework has been selected for implementation inside this repo.
- The current docs are the product and architecture source of truth.

## Working Assumptions

- The platform should scale through structured entities and relationships, not manually written one-off pages.
- City and state pages should be dashboard-first, with news and editorial modules supporting SEO.
- Blog/news, product pages, loan officer profiles, branch profiles, and city/state pages should all cross-link through structured relationships.
- The admin/CMS should manage mortgage-specific objects, not just generic rich text pages.
- Compliance review, data provenance, source dates, and disclosures are first-class requirements.

## Important Distinction

This planning repo is separate from `central-2-design`.

`central-2-design` contains existing Snap ecosystem architecture and frontend prototype work. This repo captures the mortgage website platform plan. Future implementation may align with the Snap ecosystem architecture, but do not assume this repo already contains that app.

## Preferred Next Actions

Before implementing code, create or refine:

- PRD.
- Wireframes.
- CMS/admin object model.
- Data schema proposal.
- Page module inventory.
- Implementation issues.
- Acceptance criteria.

If asked to continue planning, use `docs/08-grill-me-questions.md` as the next interrogation path.

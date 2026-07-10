# Chat Handoff

Date: 2026-07-07

This file captures the original planning conversation so a new Codex chat can recover the project context from the repo.

## Why This Repo Exists

The project began as a conversation about building a high-value mortgage website that stands out in the current web environment.

The plan evolved from a mortgage website into a broader platform:

> A local mortgage intelligence, editorial, SEO, and loan officer placement platform.

The user clarified that the site should not be word-heavy or written content alone. City and state pages need standardized dashboards with tables, graphs, charts, market facts, local news, FAQs, and contextual calls to action.

## Core Product Idea

The website should help borrowers:

- Understand their local housing and mortgage market.
- Compare mortgage and refinance options.
- Learn through local editorial/news content.
- Find the right local loan officer or branch.
- Start prequalification or a lead/opportunity workflow.

The recurring page-level questions are:

- What should I know?
- What should I do next?
- Who can help me here?

## Main Architecture Idea

The site should be a correlated content graph, not a flat marketing site.

Important entities:

- State.
- City.
- Branch/office.
- Loan officer.
- Loan product.
- Location-specific product module on state/city pages.
- Blog/news article.
- Calculator/tool.
- Market data.
- CTA rule.
- Compliance disclosure.

Every page should know its related pages and objects.

Example:

```txt
Austin, TX city page
-> Texas state page
-> Austin and nearby branches
-> Austin-area and Texas-licensed loan officers
-> FHA, VA, jumbo, refinance, first-time buyer products
-> Austin market articles
-> Texas tax/insurance explainers
-> affordability and payment calculators
```

## City And State Page Direction

City and state pages should be dashboard-first, not long-form article pages.

Required page elements:

- Market snapshot cards.
- Home price trend chart.
- Payment scenario chart/table.
- Inventory or days-on-market chart.
- Property tax and insurance table.
- Nearby city comparison table.
- Local buyer/refinance/seller guidance.
- Local loan officer cards.
- Nearby branch cards.
- Related product cards.
- Local news/editorial feed.
- FAQ.
- Sticky CTA rail or mobile CTA bar.

Each page should have unique local substance so the site does not become thin SEO content.

## Local News And AI Pipeline

The plan includes local news modules on city and state pages.

Later, an n8n workflow should:

1. Discover local housing, mortgage, tax, insurance, and affordability news.
2. Save sources and metadata.
3. Classify stories by city/state/topic/product.
4. Create an article brief.
5. Draft with AI.
6. Insert related internal links.
7. Send to editorial/compliance review.
8. Publish.
9. Attach articles to related city/state/product/LO/branch pages.

For now, only wireframe and model this workflow.

## CMS/Admin Direction

The CMS/admin should be mortgage-specific.

It should manage:

- Locations.
- Loan officers.
- Branches.
- Products.
- Articles/news.
- Market data.
- Page templates.
- CTA rules.
- SEO metadata.
- Compliance review.
- AI writer briefs.
- Lead/opportunity routing context.

The admin should not become a generic rich-text page builder.

## Backend Direction

The backend should be based on structured entities and relationships.

Important needs:

- Content graph.
- Market data and visualization layer.
- Editorial workflow.
- Local news pipeline.
- CTA engine.
- Loan officer/branch placement rules.
- Lead/opportunity routing.
- Compliance/disclosure/versioning layer.
- Search indexing.

## Sticky CTA Direction

Each page should support a sticky CTA that changes based on context.

Examples:

- Market section: Estimate payment.
- Product section: Compare loan options.
- Loan officer section: Contact local expert.
- News section: Get local guidance.
- Refinance section: Check refinance options.

Desktop should use a sticky side rail. Mobile should use a bottom sticky bar.

## Existing Snap Ecosystem Note

During the conversation, the user noted that this concept resembles work in another project.

The existing project inspected was:

```txt
C:\Users\caleb\OneDrive\Documents\GitHub\central-2-design
```

That repo contains Snap ecosystem architecture docs, including one database/codebase, global users, addresses, transactions, opportunities, workspaces, permissions, and settings/control-plane concepts.

This planning repo is separate, but future implementation may align with that architecture.

Important distinction:

- City/state editorial pages are not the same thing as `global_addresses`.
- City/state pages are market/content/service-area context.
- A real property address belongs in an address/property model only when the user enters or claims a specific property.

## Current GitHub Repo

GitHub:

```txt
https://github.com/cwhisman21/mortgage-website-platform-plan
```

Local path:

```txt
C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan
```

The accidental nested repo folder was removed.

## Recommended Next Step

Use `docs/08-grill-me-questions.md` to continue pressure-testing the plan.

For the production-site direction, also use `docs/15-production-research-and-content-plan.md`. It adds the economist, researcher, copywriting, and mortgage-copywriter research layer: public data source map, page-family data requirements, chart catalog, copy rules, compliance gates, and the next prototype rebuild tasks needed to remove demo/instructional language from the current static prototype.

The next unresolved strategic question from the prior conversation was:

> Is the public mortgage website/editorial layer primarily a Snap Mortgage acquisition surface that creates opportunities for loan officers, or a Snap Homes consumer intelligence surface that later routes into mortgage help?

Recommended answer from the prior chat:

> Snap Mortgage acquisition surface with Snap Homes intelligence hooks.

Reason:

The commercial motion is loan officer/branch placement and mortgage lead routing, so the first conversion object should be a lead/opportunity. But the content and city/state intelligence should be designed to feed Snap Homes later when a user claims an address, saves a city, follows a market, or starts a journey.

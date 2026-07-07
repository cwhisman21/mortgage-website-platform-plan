# AI Local News Pipeline

## Initial Wireframe

For now, local news is a page module and admin workflow. Automation can be added later.

City and state pages should include:

- Latest local mortgage and housing news.
- Market update articles.
- Buyer/refinance guides.
- Tax and insurance explainers.
- Local product guidance.

## Future n8n Workflow

Planned automation flow:

1. Discover local housing, mortgage, tax, insurance, and affordability news.
2. Save source URLs and metadata.
3. Classify by city, state, topic, product, and borrower intent.
4. Create an article brief.
5. Draft with AI.
6. Add required internal links.
7. Send to editor.
8. Send to compliance review when needed.
9. Publish.
10. Attach article to related city/state/product/LO/branch pages.

## AI Writer Brief

Each city/state should maintain a reusable brief:

- Audience.
- Local content angles.
- Required facts to refresh.
- Preferred sources.
- Preferred internal links.
- Related loan products.
- Related loan officers.
- Prohibited claims.
- Compliance reminders.

Example: Austin, TX.

- Audience: first-time buyers, move-up buyers, relocating workers, refinance homeowners.
- Angles: affordability, Travis/Williamson/Hays property taxes, new construction, jumbo buyers, refinance equity.
- Internal links: Texas mortgage guide, Austin loan officers, FHA loans, VA loans, refinance, affordability calculator.

## Article Relationship Requirements

Every article should relate back to:

- One or more locations.
- One or more products.
- One or more loan officers or branches when appropriate.
- One or more calculators/tools.
- Relevant FAQs.

This keeps the blog from becoming isolated content.

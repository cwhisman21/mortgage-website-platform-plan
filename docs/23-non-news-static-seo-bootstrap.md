# Non-News Static SEO Bootstrap

## Scope

The non-news public route manifest owns 872 canonical routes:

- One root route.
- 789 location routes.
- 41 learning-center routes, including six contributor profiles.
- 17 loan-officer routes.
- Seven branch routes.
- Six calculator routes.
- Six `/loan-options` routes.
- Four singleton routes: `/buy`, `/refinance`, `/home-equity`, and `/rates`.
- `/prequal/start`.

The generator writes crawlable documents for the 871 non-root routes under `site/generated/routes/<route>/index.html`. Generated documents include route metadata, one H1, borrower-facing content from the structured data registries, contextual internal links, `/site/styles.css`, and `/site/app.js`. The browser keeps the requested clean path, and the SPA replaces the bootstrap document after its data loads.

Generate and verify the documents with:

```powershell
node mock-data/generate-static-routes.mjs
node mock-data/generate-static-routes.mjs --check
```

`--check` compares every expected file byte for byte and reports missing, stale, or unexpected files without writing. Ordinary generation writes and cleans only `site/generated/routes`.

## Ownership Boundaries

Market-news generation, market-news bundles, generated market-news documents, and `site/sitemap.xml` remain owned by the news workstream. The market-news Vercel rewrite stays ahead of the general learning-center rewrite.

## Remaining Root Limitation

The `/` rewrite still serves `site/index.html`. Its initial response therefore retains the homepage metadata shell and loading text until JavaScript renders the homepage. Root delivery and the homepage hero are a separate paused workstream. This bootstrap intentionally does not modify root `index.html`, `site/index.html`, slot-hero assets, campaign-hero files, or hero screenshots.

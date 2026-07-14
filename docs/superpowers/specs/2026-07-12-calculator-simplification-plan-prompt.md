# Calculator Simplification Plan Prompt

Use this prompt to guide a focused implementation pass on the Snap Mortgage calculator pages.

## Objective

Simplify the public calculator experience so `/calculators` is a clean hub and each calculator page moves quickly from light introductory text into the calculator body.

## Approved Requirements

- The `/calculators` page should be a simple grid/list of calculator cards.
- Calculator cards should be clickable as a whole.
- Calculator cards should not include separate “Open calculator” buttons.
- The standalone VA Refinance Calculator page should be removed.
- VA refinance should be represented inside the Refinance Calculator experience, not as its own route.
- Individual calculator pages should have a light hero: eyebrow, title, and short text only.
- Individual calculator pages should move directly from the light hero into the main calculator body.
- Product program selection should stay inside the calculator form.
- Related calculator cards should appear near the bottom of individual calculator pages.
- The persistent left-side calculator rail should be removed from individual calculator pages.
- Do not redesign charts in this pass.
- Do not introduce a guided chooser in this pass.
- Do not restructure unrelated pages.

## Target App

Repository: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan`

Static app files:

- `site/app.js`
- `site/styles.css`
- `mock-data/production-seed.json`
- `mock-data/prototype-seed.json`
- `mock-data/market-chart-fixtures.json`

## Success Criteria

- `/calculators` renders a calculator hub instead of the generic directory page.
- `/calculators/va-refinance` is no longer a calculator route in seed data.
- Public product pages no longer reference `calc-va-refinance`.
- `/calculators/refinance` still supports VA refinance as an internal refinance type or product/program assumption.
- Individual calculator pages no longer render `.calculator-type-rail`.
- Individual calculator pages render the calculator module immediately after a lightweight hero.
- Related calculator cards render below the main calculator/logic sections.
- Existing static tests pass.

## Verification Commands

Run from `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan`:

```powershell
node --check site\app.js
node site\phase2-static-smoke.mjs
node site\public-copy-guard.test.mjs
node site\market-charts.test.mjs
node site\campaign-hero.test.mjs
node site\location-news-integration.test.mjs
node site\us-state-map.test.mjs
node site\news-renderer.test.mjs
```

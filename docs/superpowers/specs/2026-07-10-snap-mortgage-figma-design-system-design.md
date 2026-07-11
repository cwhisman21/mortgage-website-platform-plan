# Snap Mortgage Figma Design System And Core Templates

## Status

Approved for Figma design work. This document does not authorize changes to the public site's routes, content hierarchy, or application code.

## Goal

Create a high-fidelity Figma source of truth for the Snap Mortgage public-site component system and six core responsive templates. The system should clean up reusable visual components while preserving the existing page structure and borrower-facing content architecture.

## Product Boundary

- Product: Snap Mortgage public acquisition and education site.
- Primary audience: anonymous borrowers researching markets, rates, loan options, and next steps.
- Snap Homes remains an external account/workstation destination; this Figma work does not design the Snap Homes portal.
- No real authentication, pricing, eligibility, prequalification, account, CRM, or backend behavior is introduced.

## Scope

### In Scope

- A new Figma file named `Snap Mortgage - Component System & Core Templates`.
- A component-first Figma foundation for existing public-site structure.
- High-fidelity desktop and mobile layouts for Home, City/State, Rates, Calculator, Product, and Article templates.
- Existing Snap Mortgage logo and blue, navy, teal, and orange palette refined into a coherent token system.
- Outfield for display and heading text.
- Existing clean Aptos/Segoe-style sans-serif for body copy, navigation, forms, tables, and dense interface text.
- The supplied mortgage-machine campaign image reconstructed as editable visual and text layers for the homepage hero concept.
- Editable hero copy: `There is a better way than hoping for the best.`
- Decorative, non-interactive loan cards in the homepage hero.
- Primary homepage hero CTA: `Start My Comparison`.

### Out Of Scope

- Changing routes, information architecture, approved page blocks, or borrower-facing copy without separate approval.
- Rebuilding the public frontend during this Figma phase.
- Full page-specific custom imagery beyond the homepage campaign hero.
- New product features, real calculator behavior, account behavior, data integrations, or backend work.
- A full Snap Homes portal or account/workstation design.

## Principles

1. Preserve the existing content and route structure. Figma improves the shared visual system, not the site's information architecture.
2. Build shared components before composing screens. Individual screens must use instances and variants rather than independently styled copies.
3. Use page-family composition intentionally. A city dashboard should not look like an editorial article, and an action tool should not look like a market report.
4. Keep the system readable at mobile widths. Every desktop component requires a documented mobile behavior.
5. Keep all text layers editable. Do not leave baked text in the campaign illustration where it needs to be maintained as UI copy.

## Figma File Structure

The authenticated Figma Starter workspace allows three file pages. Preserve the approved organization with three Figma pages and named canvas sections rather than seven Figma pages.

### 00 Reference & Foundations

- Current approved public-site screenshots.
- Existing wireframe inventory and page-template reference.
- A short note that page structure is fixed during component cleanup.
- Color variables for core navy, blue, teal, orange, neutral surfaces, borders, and semantic states.
- Typography variables and styles: Outfield display headings plus the existing sans-serif UI/body scale.
- Spacing, grid, breakpoint, radius, stroke, and elevation tokens.
- Desktop and mobile layout rules.

### 02 Components

- Header, global navigation, mobile navigation trigger, account menu, breadcrumb, and footer.
- Buttons, text links, icon buttons, tags, badges, and status labels.
- Hero shells, section headers, page-intro blocks, and side-rail patterns.
- Card variants for market, product, loan officer, branch, article/news, directory result, and generic related-content uses.
- Metric cards, comparison rows, chart panels, table wrappers, source notes, and disclosure panels.
- CTA panels, CTA decks, decision steps, gated-answer panels, modals, and toast states.
- Calculator input controls, result summaries, assumption blocks, and compact calculator modules.
- FAQ blocks, news cards, carousel controls, empty states, loading states, and error states.

### 02 Templates & Campaign

Create these named sections on this Figma page: `Desktop Templates`, `Mobile Templates`, `Campaign Hero`, and `Future Custom Work`.

#### Desktop Templates

- Homepage.
- City/State market dashboard.
- Rates page.
- Calculator page.
- Product page.
- Article page.

#### Mobile Templates

- Matching mobile frame for each desktop core template.
- Mobile navigation, single-column stacking, chart/table overflow behavior, sticky action treatment, and touch target rules.

#### Campaign Hero

- Supplied mortgage-machine image retained as the visual source.
- Baked wording removed from the working hero composition where editable copy is needed.
- Headline, supporting copy, button label, machine-panel wording, and card labels recreated as editable text layers.
- Decorative loan cards remain visual campaign elements; they do not become product selection controls.

#### Future Custom Work

- Reserved for later page-specific image direction, bespoke illustrations, local-market visual treatments, and custom modules after the component system is approved.

## Page Family Composition

| Page Family | Composition | Notes |
| --- | --- | --- |
| Home | Decision Flow | A broad goal-first gateway into markets, learning, and action tools. Uses the campaign hero. |
| City and State | Intelligence Desk | Data-first market dashboard without a left-side menu. |
| Directory and Search | Intelligence Desk | Utility-oriented filters, results, and comparison without a left-side menu. |
| Rates | Hybrid | Intelligence Desk for public benchmarks, tables, and trends; Decision Flow hero for next actions. |
| Product | Decision Flow plus Editorial Journey | Product fit and action lead; concise education follows. |
| Calculator | Decision Flow | Inputs, results, assumptions, and next actions lead. |
| Loan Officer and Branch | Decision Flow | Contact, scenario handoff, and trust information lead. |
| Learning, News, and Article | Editorial Journey | Narrative, sourced context, and related next steps lead. |

## Homepage Hero Direction

- Use the supplied mortgage-machine visual as the hero art direction.
- Reconstruct visible copy as editable layers rather than relying on image-baked wording.
- Keep the campaign headline: `There is a better way than hoping for the best.`
- Use `Start My Comparison` as the primary hero CTA.
- Include a secondary local-market path.
- Loan cards communicate the comparison concept visually only; primary and secondary hero CTAs carry navigation.

## Responsive Requirements

- Build desktop and mobile frames for all six core templates.
- Use responsive variants and auto layout for components instead of manually redrawing mobile copies.
- Tables must define a horizontal-scroll or transformed-card mobile behavior.
- Charts retain a readable axis/source relationship at mobile widths and have a data-table fallback pattern.
- Dense desktop grids collapse predictably without altering content order unless a component explicitly defines a mobile order.

## Validation

- Inspect all Figma component instances to confirm they use shared tokens and variants.
- Verify desktop and mobile screenshots for all six core templates: no clipped text, overlaps, invisible controls, or broken component instances.
- Compare each template against the current route structure to confirm no approved section was lost or reordered without approval.
- Verify hero text is editable and separate from the source image.
- Verify Outfield is available in Figma before creating heading styles. If unavailable, stop and ask for a font-file or approved replacement before substituting another family.

## Deferred Review Note

The supplied campaign source uses approval and rate/APR language. It is accepted as design-stage creative direction at the user's request. Before any borrower-facing production use, the final campaign asset and related copy require a separate review; this design brief does not treat the source image as approved production mortgage advertising.

## Acceptance Criteria

- A new Figma file follows the approved three-page Starter-plan structure above.
- Foundations and reusable components are created before page-level custom work.
- The six core templates have high-fidelity desktop and mobile frames using component instances.
- Page-family composition matches the approved map.
- The public site's existing routes and page structure remain unchanged during this phase.
- The homepage campaign hero uses the supplied visual direction with editable text layers.
- The Figma output can guide a later frontend cleanup without requiring designers or engineers to infer component behavior.

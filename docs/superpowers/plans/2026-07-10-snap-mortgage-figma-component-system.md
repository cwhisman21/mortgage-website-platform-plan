# Snap Mortgage Figma Component System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Create a high-fidelity Figma component system and responsive core-template source of truth for the existing Snap Mortgage public site without changing the live site's routes or content structure.

**Architecture:** Build one approved three-page Figma file: Reference & Foundations, Components, and Templates & Campaign. Use named sections on the final page for desktop templates, mobile templates, campaign hero, and future custom work. Compose all screens from component instances so page families can have different visual patterns without drift.

**Tech Stack:** Figma Design, Figma Plugin API through mcp__codex_apps__figma_use_figma, Figma variables, Figma styles, Figma Auto Layout, and the existing static HTML/CSS/JavaScript site as structural reference.

## Current Execution State

- Figma file: [Snap Mortgage - Component System & Core Templates](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8) (`0ISr9MuEIGMXIA1zgD9kL8`).
- The Professional workspace retains the approved three-page organization: `00 Reference & Foundations` (`0:1`), `01 Components` (`10:26`), and `02 Templates & Campaign` (`10:27`). The templates page contains `Desktop Templates` (`10:28`), `Mobile Templates` (`10:29`), `Campaign Hero` (`10:30`), and `Future Custom Work` (`10:31`).
- `Snap Primitives` (`VariableCollectionId:5:2`), `Snap Color` (`VariableCollectionId:5:3`), and `Snap Layout` (`VariableCollectionId:5:4`) contain 66 variables: 21 primitives, 23 semantic aliases, and 21 layout values. `Elevation/Soft`, `Elevation/Strong`, and `Accent/Offset` effect styles exist; validation found no missing web syntax or broken aliases.
- The Figma source uses the user-approved Outfit heading substitute and Inter UI/body substitute because Outfield, Aptos, and Segoe UI are unavailable in the workspace. The original fonts can replace these source-file substitutions when installed.
- The reusable system contains navigation, signed-in account menu, buttons, CTA and gated-answer panels, charts, metrics, table, calculator, FAQ, person, article, and footer components. All use editable text and component variants.
- Fourteen high-fidelity desktop templates and fourteen matching 390 px mobile templates are complete: Home, Locations Directory, State Market Desk, City Market Desk, Rates Hybrid, Directory Search, Loan Options, Product Detail, Calculator, Loan Officer Profile, Branch Profile, Learning Center, Topic Guide, and Article.
- The editable campaign hero uses the supplied source image as a locked reference, then rebuilds the borrower-facing headline, CTA labels, and decorative comparison visual as editable layers. The source reference is `41:3468`; the editable desktop and mobile hero instances are `41:3411` and `41:3446`.
- Final structural QA confirmed 14 desktop frames, 14 mobile frames, headers and footers in every template, no mobile-width failures, no chrome failures, and successful renders for all 28 templates. Representative desktop, mobile, editorial, market-desk, campaign, and foundation screenshots were visually reviewed.
- No public-site code, routes, or existing content hierarchy changed during this Figma phase.

## Global Constraints

- Preserve public-site routes, page hierarchy, content blocks, and borrower-facing copy unless separately approved.
- Make no public frontend code changes in this Figma phase.
- Retain the Snap Mortgage logo and core blue, navy, teal, and orange palette.
- Use Outfit for display headings and Inter for body, navigation, forms, and dense data UI in the Figma source file until the intended fonts are installed.
- Build desktop and mobile variants for Home, City/State, Rates, Calculator, Product, and Article.
- City/State and Directory/Search use Intelligence Desk without a left-side menu.
- Learning, News, and Article use Editorial Journey.
- Home, Calculator, Product, Loan Officer, and Branch use Decision Flow; Rates uses an Intelligence Desk plus Decision Flow hero hybrid.
- The campaign image is design-stage visual direction. Recreate its copy as editable Figma text and keep loan cards decorative.
- Outfit and Inter are the user-approved Figma source-file substitutes while Outfield, Aptos, and Segoe UI are unavailable.
- Do not stage .superpowers visual-companion artifacts in Git.

---

### Task 1: Create The Figma File And Reference Pages

**Files:**
- Create in Figma: Snap Mortgage - Component System & Core Templates
- Create in Figma: 00 Reference & Foundations, 01 Components, 02 Templates & Campaign
- Create in Figma: sections Desktop Templates, Mobile Templates, Campaign Hero, Future Custom Work on 02 Templates & Campaign
- Reference: docs/superpowers/specs/2026-07-10-snap-mortgage-figma-design-system-design.md
- Reference: wireframes/screenshots/remaining-wireframes-contact-sheet.png
- Reference: site/screenshots/v5-home-modern.png
- Reference: site/screenshots/v5-city-austin-modern.png
- Reference: site/screenshots/v5-rates-modern.png

**Interfaces:**
- Consumes: the approved design brief and current public-site screenshots.
- Produces: a Figma file key, file URL, and named Figma page IDs for every later task.

- [x] **Step 1: Resolve the authenticated Figma plan**

Run mcp__codex_apps__figma_whoami with an empty object.

Expected: one or more plans with a key. If exactly one plan is returned, use that key. If multiple plans are returned, ask the user which plan should own the Figma file before creating it.

- [x] **Step 2: Create the design file**

Run mcp__codex_apps__figma_create_new_file with this payload after resolving the plan key:

    {
      "planKey": "resolved-plan-key",
      "fileName": "Snap Mortgage - Component System & Core Templates",
      "editorType": "design"
    }

Expected: a Figma file key and a design URL.

- [x] **Step 3: Create the approved three-page file structure**

Rename the initial page to 00 Reference & Foundations. Create two pages in this exact order: 01 Components and 02 Templates & Campaign. Create four named sections on 02 Templates & Campaign: Desktop Templates, Mobile Templates, Campaign Hero, and Future Custom Work.

Run a use_figma script equivalent to:

    const pageNames = ["01 Components", "02 Templates & Campaign"];
    const createdPageIds = [];
    for (const pageName of pageNames) {
      const page = figma.createPage();
      page.name = pageName;
      createdPageIds.push({ name: pageName, id: page.id });
    }
    return { createdPageIds };

Expected: three named Figma pages with no unnamed initial page remaining and four named sections on 02 Templates & Campaign.

- [ ] **Step 4: Add durable current-state references**

On 00 Reference & Foundations, create named frames Current Home, Current City, and Current Rates. Place labelled screenshot reference areas with the source paths above. Do not alter screenshot files in the repository.

Expected: the Figma file records the approved public structure before component styling work begins.

- [x] **Step 5: Validate file structure**

Run a read-only use_figma script:

    return figma.root.children.map((page) => ({
      id: page.id,
      name: page.name,
      childCount: page.children.length
    }));

Expected: pages 00 Reference & Foundations, 01 Components, and 02 Templates & Campaign appear in exact order.

### Task 2: Build Token Foundations And Typography

**Files:**
- Modify in Figma: 00 Reference & Foundations
- Test in Figma: variable collections, text styles, and Foundation Showcase

**Interfaces:**
- Consumes: the Task 1 Figma page IDs and source visual tokens in site/styles.css.
- Produces: named variables and text styles used by all components and templates.

- [x] **Step 1: Verify required fonts**

Run a read-only use_figma script:

    const fonts = await figma.listAvailableFontsAsync();
    return fonts
      .filter((font) => ["Outfield", "Aptos", "Segoe UI"].includes(font.fontName.family))
      .map((font) => font.fontName);

Expected: one or more Outfield styles are returned. If no Outfield style is returned, stop this task and request a font source or approved replacement.

- [x] **Step 2: Create semantic variables**

Create local variable collections named Snap Color and Snap Layout. Add named variables for color/ink/primary, color/action/primary, color/data/positive, color/accent/warm, color/surface/default, color/surface/subtle, color/border/default, color/text/muted, color/status/success, color/status/warning, spacing/04 through spacing/64, radius/small through radius/large, layout/desktop-gutter, and layout/mobile-gutter.

Bind each normal component color, spacing, and radius to these variables.

Expected: components do not rely on untracked hard-coded visual values.

- [x] **Step 3: Create text styles**

Create exactly these named styles:

    Display/Hero
    Display/Page
    Heading/Section
    Heading/Card
    Body/Large
    Body/Default
    Body/Small
    UI/Label
    UI/Button
    Data/Metric

Use Outfit for the four Display and Heading styles. Use Inter for the remaining six styles. Load each selected font before changing text.

Expected: Outfit creates a distinct heading voice while data, tables, forms, and body copy remain readable.

- [x] **Step 4: Build Foundation Showcase**

On 00 Reference & Foundations, create an Auto Layout frame named Foundation Showcase with color swatches, type samples, 8-point spacing samples, radius samples, border/elevation samples, desktop grid, and mobile grid.

Expected: every shared visual decision is inspectable in one Figma frame.

- [x] **Step 5: Validate foundations**

Use metadata to confirm both variable collections and all ten styles. Capture a Foundation Showcase screenshot and verify that text is not clipped, UI/body text is readable, and contrast is sufficient.

Expected: token and typography foundations are ready for component binding.

### Task 3: Build Shared Components

**Files:**
- Modify in Figma: 02 Components
- Test in Figma: Component Audit frame, metadata, and desktop/mobile screenshots

**Interfaces:**
- Consumes: Task 2 variables and text styles.
- Produces: global, data, action, tool, content, and feedback components used by all core templates.

- [ ] **Step 1: Create global components**

Create these component sets and variants:

    Navigation/Header: desktop, mobile
    Navigation/Account Menu: signed-in, signed-out
    Navigation/Breadcrumb
    Action/Button: primary, secondary, text, icon
    Action/Icon Button: default, hover, disabled
    Global/Footer

Use Auto Layout and token-bound spacing. The mobile header uses a hamburger trigger. Do not create a market-page left rail.

Expected: global navigation works consistently across desktop and mobile.

- [ ] **Step 2: Create content, data, and trust components**

Create these component sets:

    Content/Section Header: default, compact, side-note
    Content/Card: market, product, expert, branch, article, directory
    Data/Metric Card: default, compact, dark
    Data/Chart Panel: line, table, source-visible
    Data/Table Wrapper: desktop, mobile-scroll
    Trust/Source Note
    Trust/Disclosure

Expected: the Intelligence Desk layout can assemble cities, states, and directories without custom card rewrites.

- [ ] **Step 3: Create action, tool, and feedback components**

Create these component sets:

    Action/Decision Step
    Action/CTA Panel
    Action/CTA Deck
    Action/Gated Answer
    Tool/Calculator Field
    Tool/Calculator Result
    Tool/Assumption List
    Content/FAQ Item
    Content/News Card
    Feedback/Modal
    Feedback/Toast
    Feedback/Empty State
    Feedback/Loading State
    Feedback/Error State

Expected: action pages can use Decision Flow while retaining shared feedback, tool, and handoff behavior.

- [ ] **Step 4: Create compact calculator variants**

Create Tool/Compact Calculator with payment, affordability, refinance, and rent-vs-buy variants. Each variant has two or three high-impact inputs, one result area, and a See full breakdown action. Add neutral and location-prefilled states.

Expected: embedded location calculators visibly inherit public local assumptions while linked calculators remain neutral.

- [ ] **Step 5: Validate reusable-component coverage**

Create Component Audit containing an instance of every component and variant. Inspect metadata and capture desktop/mobile screenshots.

Expected: every core template can be built from instances instead of hand-styled copies.

### Task 4: Compose Desktop Core Templates

**Files:**
- Modify in Figma: 02 Templates & Campaign/Desktop Templates section
- Test in Figma: desktop screenshots for all approved templates

**Interfaces:**
- Consumes: Task 3 component instances and approved composition map.
- Produces: high-fidelity desktop Home, Location Desk, Rates Hybrid, Calculator, Product, and Article templates.

- [x] **Step 1: Compose Desktop - Home**

Use Navigation/Header, the named Hero/Campaign Comparison insertion point, goal-first path cards, related market/product/learning cards, and Global/Footer. Use Start My Comparison as primary and a local-market path as secondary.

Expected: home is a broad Decision Flow gateway to market intelligence, editorial guidance, and action tools.

- [x] **Step 2: Compose Desktop - Location Desk**

Use city/state hero, market metrics, price chart, payment scenario table, local-cost data, nearby-city comparison, product cards, experts/branches, news cards, FAQ, sources, disclosures, and footer. Do not create a persistent left menu.

Expected: city and state retain their approved data-first sequence with cleaned components.

- [x] **Step 3: Compose Desktop - Rates Hybrid**

Use a Decision Flow hero, public benchmark metrics, rate table, trend chart, local market links, rate-review CTA, methodology, sources, disclosures, and footer.

Expected: the page separates public benchmark research from the personal next-action pathway.

- [x] **Step 4: Compose Desktop - Calculator and Desktop - Product**

Calculator begins with tool inputs, result, and assumptions. Product begins with product-fit and action steps. Both include concise editorial explanation, related cards, and CTA handoff.

Expected: tool and product pages feel action-forward without losing their approved content modules.

- [x] **Step 5: Compose Desktop - Article**

Use editorial hero, metadata, source/image area, takeaways, body, data/table block, mid-article CTA, related cards, sources, and footer.

Expected: Article uses a calmer Editorial Journey distinct from market dashboards.

- [x] **Step 6: Validate desktop template structure**

Return component-instance counts for each desktop frame and capture screenshots. Confirm each includes its approved header, footer, and required content blocks.

Expected: all desktop templates are compositionally distinct but structurally faithful.

### Task 5: Compose Mobile Core Templates

**Files:**
- Modify in Figma: 02 Templates & Campaign/Mobile Templates section
- Test in Figma: 390 px mobile screenshots for all approved templates

**Interfaces:**
- Consumes: desktop hierarchy and responsive component variants.
- Produces: mobile frames for Home, Location Desk, Rates Hybrid, Calculator, Product, and Article.

- [x] **Step 1: Create mobile frames**

Create frames at 390 px width named Mobile - Home, Mobile - Location Desk, Mobile - Rates Hybrid, Mobile - Calculator, Mobile - Product, and Mobile - Article.

Expected: every desktop core template has an explicitly designed mobile counterpart.

- [x] **Step 2: Apply mobile layout rules**

Use single-column stacking for cards, steps, editorial blocks, and CTA panels. Use horizontal-scroll or card-transformed table behavior. Stack chart and source content. Preserve mobile hamburger and account affordances.

Expected: mobile does not resemble compressed desktop or introduce unreadable data UI.

- [x] **Step 3: Apply mobile page-family hierarchy**

Prioritize snapshot, chart, scenario, and comparison on Location Desk. Prioritize goal, tool, result, and next action on Decision Flow pages. Prioritize title, narrative, evidence, and related reading on Editorial Journey pages.

Expected: mobile hierarchy follows the approved page-family system.

- [x] **Step 4: Validate mobile usability**

Capture six screenshots and inspect tap targets, clipped text, content overlap, table labels, chart labels, source placement, and bottom action affordances.

Expected: all approved mobile frames are clear at a 390 px viewport.

### Task 6: Build The Editable Campaign Hero

**Files:**
- Modify in Figma: 02 Templates & Campaign/Campaign Hero section
- Modify in Figma: Desktop - Home and Mobile - Home
- Source asset: C:/Users/caleb/AppData/Local/Temp/codex-clipboard-904a9bb1-022f-47f0-838f-f7527255b32a.png

**Interfaces:**
- Consumes: campaign source art, Task 2 foundations, and Task 3 hero/button/card components.
- Produces: Hero/Campaign Comparison desktop/mobile component variants with editable campaign copy.

- [x] **Step 1: Place source art as reference**

Upload the supplied image and place it in a locked frame named Campaign Source Reference in the Campaign Hero section. Preserve the complete original for comparison.

Expected: the source visual direction remains available while UI copy becomes editable elsewhere.

- [x] **Step 2: Rebuild editable hero layers**

Create Hero/Campaign Comparison from these parts:

    Hero/Headline: There is a better way than hoping for the best.
    Hero/Supporting Copy
    Hero/Primary CTA: Start My Comparison
    Hero/Secondary CTA: Explore local markets
    Hero/Machine Artwork Group
    Hero/Loan Visual Card: conventional, FHA, VA

Do not assign interactions or navigation properties to Hero/Loan Visual Card instances.

Expected: headline, support copy, CTA labels, machine-panel wording, and loan-card labels are editable text rather than image-baked copy.

- [x] **Step 3: Create responsive hero variants**

Create desktop and mobile variants. Desktop can stage the machine and decorative cards beside campaign copy. Mobile preserves campaign copy and primary CTA while simplifying decorative layers.

Expected: the hero remains readable and balanced at both breakpoints.

- [x] **Step 4: Validate hero editability**

Use metadata to confirm all visible words in the hero composition are TEXT nodes. Capture desktop and mobile hero screenshots.

Expected: campaign messaging can change without image editing.

### Task 7: Run Final Figma QA And Publish Handoff

**Files:**
- Modify in Figma: all approved pages
- Modify only if scope changed: docs/superpowers/specs/2026-07-10-snap-mortgage-figma-design-system-design.md
- Test: Figma metadata and screenshots

**Interfaces:**
- Consumes: all preceding components and frames.
- Produces: a validated Figma URL, page IDs, key template node IDs, and handoff-ready component system.

- [x] **Step 1: Audit core inventory**

Verify the three Figma pages and these minimum components:

    Navigation/Header
    Action/Button
    Content/Card
    Data/Metric Card
    Data/Chart Panel
    Action/Decision Step
    Tool/Compact Calculator
    Hero/Campaign Comparison

Expected: each relevant template uses an instance of each required component.

- [x] **Step 2: Audit token and typography binding**

Inspect representative components for bound color, spacing, and radius variables. Inspect display text for Outfit and UI/body text for Inter.

Expected: ordinary components require no unapproved ad hoc visual values.

- [x] **Step 3: Capture final review frames**

Capture screenshots for all approved desktop and mobile templates. Check crop errors, overlap, clipped type, contrast, broken Auto Layout, and deviations from the composition map.

Expected: twelve review-ready screenshots.

- [x] **Step 4: Publish the handoff**

Return the Figma URL, Figma page IDs, core-template node IDs, component-page node IDs, and an explicit statement that public-site code and page structure did not change.

Expected: a developer can use the Figma file to implement visual cleanup without guessing component behavior.

- [ ] **Step 5: Commit the implementation plan**

Run:

    git add docs/superpowers/plans/2026-07-10-snap-mortgage-figma-component-system.md
    git commit -m "Plan Snap Mortgage Figma component system"
    git push think-whale main

Expected: the plan is available on Think Whale main and excludes local .superpowers artifacts.

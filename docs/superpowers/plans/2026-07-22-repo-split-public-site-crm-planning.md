# Repo Split Public Site CRM Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current mixed mortgage repo into separate repositories for the public mortgage website, Snap Homes consumer experience, the CRM/CMS/admin app, and planning/docs so each product has a clear path, deployment, and release process.

**Architecture:** The current repository contains three implemented responsibilities: static public mortgage website under `site/`, CRM/CMS/admin app under `apps/cms/`, and planning/architecture assets under `docs/`, `mock-data/`, `research/`, and `wireframes/`. Snap Homes is a fourth product boundary and should live in its own repo even if the first migration only creates the repo contract and moves no runtime files from this mortgage repo. The split preserves those boundaries by moving each responsibility into its own repo with its own README, deployment config, verification commands, and ownership rules.

**Tech Stack:** Git worktrees or clean clones, PowerShell on Windows, Node.js, pnpm for `apps/cms`, static HTTP serving for `site`, GitHub remotes, Vercel project separation.

## Global Constraints

- Do not modify or reset the dirty working checkout at `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan`.
- Perform split work from clean clones or clean git worktrees only.
- Public website source of truth becomes `Think-Whale/mortgage-website`.
- Snap Homes source of truth becomes `Think-Whale/snap-homes`.
- CRM/CMS/admin source of truth becomes `Think-Whale/mortgage-platform-admin`.
- Planning/docs source of truth remains a planning repository and must not contain runtime app code after the split.
- Public website Vercel project must deploy only the public site.
- Snap Homes Vercel project must deploy only the Snap Homes consumer app.
- CRM/admin Vercel project must deploy only the CRM/admin app.
- Preserve the ability to preview the public website locally at `/site/index.html` during transition, then normalize to `/` after the public repo owns only the website.
- Do not push to production remotes until the relevant local verification command passes.

---

## File Structure

## Shared Platform Assets And Shared Asset Pathway

Shared assets include code, data contracts, domain models, content/data feeds, integrations, and visual/static files. They must be explicitly classified before they are copied into another repo. Do not leave shared files in a vague root folder where future agents can mistake them for app-local source.

### Shared Platform Asset Categories

- Calculator engine and calculator modules:
  - Shared calculation engine, consumer-safe estimation rules, input/output schemas, and program-specific modules.
  - Confirmed shared programs: Conventional, FHA, VA, and USDA.
  - Current source candidates in this mixed repo: calculator files under `site/**` and confirmed Snap calculator rules in `snap-ecosystem-brain/references/mortgage-logic.md`.
  - Initial migration path: keep public-facing calculator UI in `Think-Whale/mortgage-website`; extract reusable calculation logic into a future shared package only after the public site and Snap Homes both consume it.
  - Future source of truth: `Think-Whale/snap-shared` package path `packages/calculators/**`, or dedicated repo `Think-Whale/snap-calculators` if calculator logic needs independent release and compliance review.

- Global contacts:
  - Shared contact/person/organization concepts, lead routing contacts, loan officer contact records, branch contacts, consumer contact handoff context, and permission-safe public contact projections.
  - Current source candidates: CRM/admin data model planning under `docs/04-backend-and-cms-admin.md`, `docs/05-data-model.md`, and public site loan officer/branch display modules under `site/**`.
  - Initial migration path: CRM/admin owns private editable contact records; public website and Snap Homes consume read-only projections or static/generated exports.
  - Future source of truth: CRM/admin or a dedicated shared API/data service, not duplicated editable data in each repo.

- Locations and market geography:
  - States, cities, counties, service areas, market pages, ZIP/location lookup boundaries, map paths, location slugs, nearby-city relationships, branch service areas, and localized content relationships.
  - Current source candidates: `site/generated/routes/locations/**`, `site/assets/us-state-map-paths.mjs`, `site/assets/us-map-source.svg`, location docs under `docs/**`, and dummy ZIP/location provider rules in `snap-ecosystem-brain/references/mortgage-logic.md`.
  - Initial migration path: public mortgage website owns generated public location pages; Snap Homes may later own consumer saved-market/property-location experiences; shared location identifiers and provider contracts must be documented before duplication.
  - Future source of truth: shared location/market data package or API, path `packages/locations/**` if using a shared monorepo/package model.

- Rate and pricing data contracts:
  - Daily/example pricing feed shape, rate/APR/points/down-payment fields, stale-data handling, lender option comparison schema, and disclaimer requirements.
  - Current source candidates: `site/rates-marketplace*.mjs`, `site/rates-marketplace.css`, public marketplace tests, and compliance copy docs.
  - Initial migration path: public website owns public display; CRM/admin owns editorial/admin controls if needed; shared data contract is documented in planning until the real feed is integrated.
  - Future source of truth: shared API contract package or backend service, not hard-coded UI-only objects.

- Lead/opportunity and handoff contracts:
  - Auto prequal entry, mortgage comparison CTA, Snap Homes to Snap Mortgage handoff, public website to CRM/admin handoff, seller/net-sheet handoff, and saved-user context.
  - Current source candidates: `site/prequal-handoff.mjs`, `site/seller-workspace*.mjs`, `site/seller-net-sheet-pdf.mjs`, and planning docs.
  - Initial migration path: public website owns consumer entry UI; CRM/admin owns operational follow-up; Snap Homes owns home/property journey context and passes mortgage intent to Snap Mortgage.
  - Future source of truth: shared handoff contract package or API schema under `packages/handoffs/**`.

- Disclosure and compliance copy blocks:
  - Calculator disclaimers, pricing disclaimers, example/illustrative language, rate feed freshness notes, lending limitation copy, and product eligibility warnings.
  - Current source candidates: `site/**` disclaimer copy, `docs/07-seo-and-compliance.md`, `snap-ecosystem-brain/references/compliance-flags.md`, and calculator compliance decisions in `decision-log.md`.
  - Initial migration path: keep copy with the consuming app, but record shared canonical language in planning until compliance ownership is formalized.
  - Future source of truth: shared compliance copy registry or CMS-managed disclosure library.

- Shared design system and brand assets:
  - Logos, icon marks, favicon art, color tokens, typography notes, spacing rules, buttons, card treatments, and brand usage notes.
  - Current source candidates in this mixed repo: `site/assets/images/snap-mortgage.png`, `site/assets/images/**`, `site/styles.css`, and any brand docs under `docs/**`.
  - Initial migration path: copy app-needed assets into each consuming repo under `public/brand/` or `site/assets/images/`, then record the copied source in that repo README and `docs/shared-assets.md`.
  - Future source of truth: `Think-Whale/snap-brand-assets` or `Think-Whale/snap-design-system` if brand/design assets start changing independently of app releases.

- Brand assets:
  - Logos, icon marks, favicon art, color tokens, typography notes, and brand usage notes.
  - Current source candidates in this mixed repo: `site/assets/images/snap-mortgage.png`, `site/assets/images/**`, and any brand docs under `docs/**`.
  - Initial migration path: copy app-needed assets into each consuming repo under `public/brand/` or `site/assets/images/`, then record the copied source in that repo README.
  - Future source of truth: `Think-Whale/snap-brand-assets` or `Think-Whale/snap-design-system` if brand assets start changing independently of app releases.

- Public mortgage website assets:
  - Homepage hero frames, campaign art, public site CSS/JS, generated route assets, and public SEO/static assets.
  - Current source path: `site/assets/**`, `site/styles.css`, `site/campaign-hero.css`, `site/campaign-hero.mjs`, `site/app.js`.
  - Destination path: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\site\assets\**`.
  - Repo owner: `Think-Whale/mortgage-website`.

- Snap Homes assets:
  - Home/property intelligence images, saved-home UI assets, property journey illustrations, map/property visualization assets, and Snap Homes product-specific brand applications.
  - Current source path: none in this mortgage repo unless a file is explicitly identified as Snap Homes.
  - Destination path: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\public\assets\**` once Snap Homes app implementation begins.
  - Repo owner: `Think-Whale/snap-homes`.

- CRM/admin assets:
  - Admin UI assets, Payload/Next public assets, internal workflow icons, admin-only image assets, and CRM-specific seed fixtures.
  - Current source path: `apps/cms/**`.
  - Destination path: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\apps\cms\**`.
  - Repo owner: `Think-Whale/mortgage-platform-admin`.

- Planning/reference assets:
  - Wireframes, screenshots, research PDFs, docs images, screenshots used as planning evidence, and product references that are not directly loaded by a runtime app.
  - Current source paths: `wireframes/**`, `research/**`, `docs/**`, root-level audit screenshots.
  - Destination path: keep in `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\docs\assets\**` or `research\assets\**`.
  - Repo owner: `Think-Whale/mortgage-website-platform-plan`.

### Shared Asset Decision Rule

Use this rule before moving or copying any asset:

```text
If the asset is private editable operational data, CRM/admin or a backend service owns it.
If the asset is public display UI loaded by one app, it belongs in that app repo.
If the asset is a domain rule, schema, calculator, location model, or handoff contract used by two or more apps, copy only for the initial split and document the source.
If the asset changes independently and must stay identical across apps, promote it to a future shared package, shared service, or shared repo.
If the asset is only evidence, research, or planning context, keep it in the planning repo.
```

### Shared Asset Manifest

Each runtime repo must include a manifest once assets are copied:

- Public website manifest: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\docs\shared-assets.md`
- Snap Homes manifest: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\docs\shared-assets.md`
- CRM/admin manifest: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\docs\shared-assets.md`

Each manifest must use this format:

```markdown
# Shared Assets

| Asset | Local Path | Original Source | Owner | Notes |
| --- | --- | --- | --- | --- |
| Snap Mortgage logo | `site/assets/images/snap-mortgage.png` | `mortgage-website-platform-plan/site/assets/images/snap-mortgage.png` | Public website | Copied during repo split. Promote to shared brand repo if reused by Snap Homes or CRM/admin. |
| Calculator engine | `packages/calculators/**` or app-local calculator module | `mortgage-website-platform-plan/site/**` and Snap calculator rules | Shared platform | Create only when two apps consume calculator logic. Public UI stays app-local. |
| Locations contract | `packages/locations/**` or app-local generated locations | `mortgage-website-platform-plan/site/generated/routes/locations/**` | Shared platform | Generated public pages stay in public website; shared identifiers/provider contracts can move later. |
| Global contacts contract | `packages/contacts/**` or CRM/admin API schema | planning docs and CRM/admin data model | CRM/admin or shared service | CRM/admin owns private editable records; apps consume projections. |
```

### Public Website Repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website`

- Keep from current repo:
  - `site/**`
  - `.gitignore`
  - `.vercelignore` after pruning CRM/admin exclusions
  - `vercel.json` rewritten for the static public website only
  - `README.md` rewritten for public website development and deployment
  - `AGENTS.md` rewritten for public website agent instructions
- Remove from public repo:
  - `apps/**`
  - CRM/admin runtime dependencies
  - planning-only docs except a short `docs/public-site-release-notes.md`
  - root-level generated scratch files

### CRM/Admin Repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin`

- Keep from current repo:
  - `apps/cms/**`
  - CRM/admin-specific docs copied into `docs/`
  - `.gitignore`
  - `.vercelignore` rewritten for CRM/admin only
  - `vercel.json` rewritten for `apps/cms`
  - `README.md` rewritten for Payload/Next CRM/admin development
  - `AGENTS.md` rewritten for CRM/admin agent instructions
- Remove from CRM/admin repo:
  - `site/**`
  - public website generated pages and static assets
  - planning-only docs not needed by admin implementers

### Snap Homes Repo: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes`

- Keep or create:
  - `README.md` describing Snap Homes as the consumer home intelligence and property journey product
  - `AGENTS.md` defining Snap Homes boundaries
  - `docs/product-boundary.md`
  - future app source once Snap Homes implementation begins
- Do not copy from current mortgage repo by default:
  - `site/**`, because that is Snap Mortgage public acquisition
  - `apps/cms/**`, because that is CRM/CMS/admin
  - generated mortgage location pages, because those belong to the mortgage public website unless explicitly promoted into shared data later
- Integration boundary:
  - Snap Mortgage may link or route to Snap Homes when a user saves a city, claims a property, starts a home-shopping journey, or needs property intelligence
  - Snap Homes may route to Snap Mortgage when a user needs mortgage prequalification, rate comparison, refinance, or loan officer help

### Planning Repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan`

- Keep:
  - `docs/**`
  - `mock-data/**`
  - `research/**`
  - `wireframes/**`
  - `automation/**`
  - `n8n/**`
  - `README.md`
  - `AGENTS.md`
- Remove after app repos are verified:
  - `site/**`
  - `apps/**`
  - root Vercel deployment config for runtime apps
  - runtime `node_modules/` and generated app caches

---

### Task 1: Freeze Current State And Create Migration Snapshot

**Files:**
- Modify: no source files
- Create: local tag `pre-repo-split-2026-07-22`

**Interfaces:**
- Consumes: current repository at `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan`
- Produces: immutable git reference used by later tasks: `pre-repo-split-2026-07-22`

- [ ] **Step 1: Verify clean source branch for split**

Run from a clean `main` worktree, not the dirty feature checkout:

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root status --short --branch
git -C $root rev-parse --short HEAD
```

Expected:

```text
## main...think-whale/main
10202cf80
```

- [ ] **Step 2: Tag the split starting point**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root tag pre-repo-split-2026-07-22 10202cf80fdddb57ba57361cbc9af6cbb4688b43
git -C $root tag --list pre-repo-split-2026-07-22
```

Expected:

```text
pre-repo-split-2026-07-22
```

- [ ] **Step 3: Commit nothing**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root status --short
```

Expected: no output.

---

### Task 2: Create Public Website Repository From `site`

**Files:**
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\README.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\AGENTS.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\docs\shared-assets.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\vercel.json`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\.gitignore`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\.vercelignore`
- Copy: `site/**` into `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\site\**`

**Interfaces:**
- Consumes: public website source under `site/**`
- Produces: standalone public website repo with local preview command and static smoke verification

- [ ] **Step 1: Create a clean local repo folder**

```powershell
$source = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
New-Item -ItemType Directory -Force -Path $target
New-Item -ItemType Directory -Force -Path "$target\docs"
git -C $target init
git -C $target branch -M main
```

Expected:

```text
Initialized empty Git repository
```

- [ ] **Step 2: Copy public website files**

```powershell
$source = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
robocopy "$source\site" "$target\site" /E /XD node_modules .next .git
if ($LASTEXITCODE -le 7) { $global:LASTEXITCODE = 0 }
Copy-Item "$source\.gitignore" "$target\.gitignore" -Force
Copy-Item "$source\.vercelignore" "$target\.vercelignore" -Force
```

Expected: robocopy returns exit code `0` through `7`.

- [ ] **Step 3: Write public website README**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\README.md`:

```markdown
# Snap Mortgage Public Website

Public mortgage website and local mortgage intelligence experience for Snap Mortgage.

## Local Preview

Serve the repository root and open `/site/index.html`:

```powershell
node scripts\serve-static.mjs
```

Then open:

```text
http://localhost:3001/site/index.html
```

## Source Layout

- `site/index.html` is the public homepage shell.
- `site/app.js` controls public website interactions.
- `site/styles.css` contains shared public website styles.
- `site/campaign-hero.*` contains the homepage campaign hero system.
- `site/generated/**` contains generated static route output.

## Verification

```powershell
node site\phase2-static-smoke.mjs
node --test site\campaign-hero.test.mjs site\homepage-ui-contracts.test.mjs site\static-route-document.test.mjs
```
```

- [ ] **Step 4: Write public website AGENTS instructions**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\AGENTS.md`:

```markdown
# Agent Instructions

This repo is the source of truth for the Snap Mortgage public website.

## Boundaries

- Public website work belongs in `site/**`.
- Do not add CRM/admin app code to this repo.
- Do not add Payload CMS or private admin workflows here.
- Keep public website deployment separate from CRM/admin deployment.

## Verification

Before claiming a public website change is complete, run the focused tests for the touched module and the static smoke test:

```powershell
node site\phase2-static-smoke.mjs
```

For homepage hero changes, also run:

```powershell
node --test site\campaign-hero.test.mjs site\campaign-hero-containment.test.mjs site\homepage-ui-contracts.test.mjs
```
```

- [ ] **Step 5: Add static server script**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\scripts\serve-static.mjs`:

```javascript
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3001;
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

http
  .createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const pathname = url.pathname === '/' ? '/site/index.html' : decodeURIComponent(url.pathname);
    let filePath = path.normalize(path.join(root, pathname));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (!statError && stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readError, data) => {
        if (readError) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }

        response.writeHead(200, {
          'content-type': types.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
        });
        response.end(data);
      });
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Snap Mortgage public website: http://localhost:${port}/site/index.html`);
  });
```

- [ ] **Step 6: Write public website Vercel config**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\docs\shared-assets.md`:

```markdown
# Shared Assets

| Asset | Local Path | Original Source | Owner | Notes |
| --- | --- | --- | --- | --- |
| Snap Mortgage logo | `site/assets/images/snap-mortgage.png` | `mortgage-website-platform-plan/site/assets/images/snap-mortgage.png` | Public website | Runtime logo for the public Snap Mortgage site. Promote to shared brand/design-system repo if reused by Snap Homes or CRM/admin. |
| Campaign hero frames | `site/assets/campaign-hero-frames/**` | `mortgage-website-platform-plan/site/assets/campaign-hero-frames/**` | Public website | Homepage mortgage campaign animation frames. Not shared with Snap Homes by default. |
| Slot hero assets | `site/assets/slot-hero/**` | `mortgage-website-platform-plan/site/assets/slot-hero/**` | Public website | Public mortgage homepage interaction assets. Not shared with CRM/admin. |
| US map source | `site/assets/us-map-source.svg` | `mortgage-website-platform-plan/site/assets/us-map-source.svg` | Public website | Can become shared with Snap Homes only if Snap Homes uses the same market map implementation. |
| Public calculator UI | `site/**calculator**` | `mortgage-website-platform-plan/site/**calculator**` | Public website | UI belongs here. Shared calculator rules move only when Snap Homes or CRM/admin consume the same engine. |
| Public locations pages | `site/generated/routes/locations/**` | `mortgage-website-platform-plan/site/generated/routes/locations/**` | Public website | Generated pages belong here. Shared location identifiers/provider contracts can be promoted later. |
| Rate marketplace display | `site/rates-marketplace*.mjs` | `mortgage-website-platform-plan/site/rates-marketplace*.mjs` | Public website | Public display belongs here. Feed schema may become a shared contract. |
| Prequal handoff UI | `site/prequal-handoff.mjs` | `mortgage-website-platform-plan/site/prequal-handoff.mjs` | Public website | Public entry point belongs here. Handoff schema may become shared with CRM/admin. |
```

- [ ] **Step 7: Write public website Vercel config**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/",
      "destination": "/site/index.html"
    }
  ]
}
```

- [ ] **Step 8: Verify public website locally**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
node "$target\site\phase2-static-smoke.mjs"
node --test "$target\site\campaign-hero.test.mjs" "$target\site\homepage-ui-contracts.test.mjs" "$target\site\static-route-document.test.mjs"
```

Expected:

```text
tests pass
static routes pass
```

- [ ] **Step 9: Commit public website repo**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
git -C $target add .
git -C $target commit -m "chore: initialize public mortgage website repo"
git -C $target remote add origin https://github.com/Think-Whale/mortgage-website.git
git -C $target push -u origin main
```

Expected:

```text
branch 'main' set up to track 'origin/main'
```

---

### Task 3: Create CRM/Admin Repository From `apps/cms`

**Files:**
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\apps\cms\**`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\README.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\AGENTS.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\docs\shared-assets.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\vercel.json`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\.gitignore`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\.vercelignore`

**Interfaces:**
- Consumes: CRM/admin source under `apps/cms/**`
- Produces: standalone CRM/admin repo with Next/Payload install, build, and deployment path

- [ ] **Step 1: Create local CRM/admin repo folder**

```powershell
$source = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin'
New-Item -ItemType Directory -Force -Path $target
New-Item -ItemType Directory -Force -Path "$target\docs"
git -C $target init
git -C $target branch -M main
```

- [ ] **Step 2: Copy CRM/admin app files**

```powershell
$source = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin'
New-Item -ItemType Directory -Force -Path "$target\apps"
robocopy "$source\apps\cms" "$target\apps\cms" /E /XD node_modules .next .git
if ($LASTEXITCODE -le 7) { $global:LASTEXITCODE = 0 }
Copy-Item "$source\.gitignore" "$target\.gitignore" -Force
```

- [ ] **Step 3: Write CRM/admin README**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\README.md`:

```markdown
# Snap Mortgage Platform Admin

CRM/CMS/admin application for Snap Mortgage platform operations.

## Local Development

```powershell
Set-Location apps\cms
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open:

```text
http://localhost:3000
```

## Source Layout

- `apps/cms` contains the Next.js and Payload CMS application.
- `apps/cms/src` contains admin runtime code.
- `apps/cms/tests` contains CRM/admin tests.

## Verification

```powershell
Set-Location apps\cms
corepack pnpm build
```
```

- [ ] **Step 4: Write CRM/admin AGENTS instructions**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\AGENTS.md`:

```markdown
# Agent Instructions

This repo is the source of truth for the Snap Mortgage CRM/CMS/admin app.

## Boundaries

- CRM/admin work belongs in `apps/cms/**`.
- Do not add public static website generated pages to this repo.
- Do not deploy this repo to the public mortgage website Vercel project.
- Keep customer-facing public site changes in the public website repo.

## Verification

Before claiming CRM/admin changes are complete, run the relevant focused tests and:

```powershell
Set-Location apps\cms
corepack pnpm build
```
```

- [ ] **Step 5: Write CRM/admin Vercel config**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\docs\shared-assets.md`:

```markdown
# Shared Assets

| Asset | Local Path | Original Source | Owner | Notes |
| --- | --- | --- | --- | --- |
| Admin runtime assets | `apps/cms/**` | `mortgage-website-platform-plan/apps/cms/**` | CRM/admin | CRM/admin-owned files copied during repo split. Do not copy public mortgage hero assets here unless an admin screen directly loads them. |
| Global contacts admin model | `apps/cms/**` or future API schema | planning data model and CRM/admin implementation | CRM/admin | CRM/admin owns editable private contact records. Public website and Snap Homes consume projections, not admin internals. |
| Lead/opportunity routing admin model | `apps/cms/**` or future API schema | planning docs and CRM/admin implementation | CRM/admin | Operational follow-up belongs here. Consumer entry forms belong in their app repos. |
| Disclosure management | `apps/cms/**` or future CMS collection | planning compliance docs and app copy | CRM/admin or shared compliance registry | If disclosures become CMS-managed, CRM/admin owns editing while runtime apps consume published copy. |
```

- [ ] **Step 6: Write CRM/admin Vercel config**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\vercel.json`:

```json
{
  "buildCommand": "cd apps/cms && corepack pnpm install --frozen-lockfile && corepack pnpm build",
  "outputDirectory": "apps/cms/.next",
  "installCommand": "cd apps/cms && corepack pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

- [ ] **Step 7: Verify CRM/admin install and build**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\apps\cms'
Set-Location $target
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 8: Commit CRM/admin repo**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin'
git -C $target add .
git -C $target commit -m "chore: initialize mortgage platform admin repo"
git -C $target remote add origin https://github.com/Think-Whale/mortgage-platform-admin.git
git -C $target push -u origin main
```

Expected:

```text
branch 'main' set up to track 'origin/main'
```

---

### Task 4: Create Snap Homes Repository Boundary

**Files:**
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\README.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\AGENTS.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\docs\product-boundary.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\docs\shared-assets.md`
- Create: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\.gitignore`

**Interfaces:**
- Consumes: planning context from `docs/00-chat-handoff.md` and Snap ecosystem distinction that Snap Homes is consumer/property intelligence, not mortgage acquisition and not CRM/admin
- Produces: standalone Snap Homes repo contract ready for future app implementation

- [ ] **Step 1: Create local Snap Homes repo folder**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes'
New-Item -ItemType Directory -Force -Path "$target\docs"
git -C $target init
git -C $target branch -M main
```

Expected:

```text
Initialized empty Git repository
```

- [ ] **Step 2: Write Snap Homes README**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\README.md`:

```markdown
# Snap Homes

Consumer home intelligence and property journey product for the Snap ecosystem.

## Product Boundary

Snap Homes helps consumers understand homes, markets, saved cities, claimed properties, buying journeys, selling journeys, ownership context, and property intelligence.

Snap Homes is not the Snap Mortgage public acquisition website.

Snap Homes is not the CRM/CMS/admin application.

## Neighboring Repositories

- Snap Mortgage public website: `Think-Whale/mortgage-website`
- Snap Mortgage CRM/admin: `Think-Whale/mortgage-platform-admin`
- Mortgage planning/docs: `Think-Whale/mortgage-website-platform-plan`

## Integration Direction

Snap Homes can route users to Snap Mortgage for prequalification, mortgage comparison, refinance help, and loan officer routing.

Snap Mortgage can route users to Snap Homes when a user saves a market, claims a property, starts a home-shopping journey, or wants property/home intelligence beyond mortgage conversion.
```

- [ ] **Step 3: Write Snap Homes AGENTS instructions**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\AGENTS.md`:

```markdown
# Agent Instructions

This repo is the source of truth for Snap Homes.

## Boundaries

- Build consumer home intelligence, property journey, saved market, saved home, home-shopping, seller journey, and ownership experiences here.
- Do not add Snap Mortgage public website implementation here.
- Do not add CRM/CMS/admin implementation here.
- Mortgage prequalification and lender comparison should route to Snap Mortgage, not be duplicated here.
- Admin workflows should route to the CRM/admin repo, not be duplicated here.

## Current Status

This repo starts as a product boundary and implementation home. Do not infer a framework until a Snap Homes implementation plan selects one.
```

- [ ] **Step 4: Write product boundary doc**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\docs\product-boundary.md`:

```markdown
# Snap Homes Product Boundary

## Owns

- Consumer home intelligence.
- Saved homes.
- Saved cities and markets.
- Claimed property experiences.
- Buying journey context.
- Selling journey context.
- Ownership and property intelligence.
- Home-to-mortgage handoff context.

## Does Not Own

- Public mortgage acquisition pages.
- Mortgage rate marketplace pages.
- Loan officer and branch placement pages.
- CRM/admin editorial workflow.
- Payload CMS admin.
- Mortgage compliance publishing workflow.

## Handoffs

Snap Homes to Snap Mortgage:

- User wants prequalification.
- User wants lender comparison.
- User wants refinance options.
- User wants a loan officer or mortgage expert.

Snap Mortgage to Snap Homes:

- User saves a city or market.
- User claims a home.
- User wants to track a property.
- User wants buy/sell journey guidance beyond a mortgage CTA.
```

- [ ] **Step 5: Write Snap Homes `.gitignore`**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\docs\shared-assets.md`:

```markdown
# Shared Assets

| Asset | Local Path | Original Source | Owner | Notes |
| --- | --- | --- | --- | --- |
| Snap Homes brand assets | `public/assets/**` | none yet | Snap Homes | No assets should be copied from the mortgage website by default. Add rows here only when a Snap Homes implementation explicitly consumes an asset. |
| Saved homes/property model | future app source | none yet | Snap Homes | Snap Homes owns consumer property journey concepts. Do not source this from mortgage public pages. |
| Saved markets/locations UI | future app source | shared location contract once created | Snap Homes | Snap Homes may consume shared location identifiers later, but generated mortgage location pages stay in the public website repo. |
| Mortgage handoff contract | future app source or shared package | planning docs and public prequal handoff | Shared platform | Snap Homes routes mortgage intent to Snap Mortgage; it should not duplicate mortgage prequal workflows. |
```

- [ ] **Step 6: Write Snap Homes `.gitignore`**

Create `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\.gitignore`:

```gitignore
node_modules/
.next/
dist/
build/
.env
.env.*
!.env.example
.DS_Store
Thumbs.db
```

- [ ] **Step 7: Commit Snap Homes boundary repo**

```powershell
$target = 'C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes'
git -C $target add .
git -C $target commit -m "chore: initialize snap homes product boundary"
git -C $target remote add origin https://github.com/Think-Whale/snap-homes.git
git -C $target push -u origin main
```

Expected:

```text
branch 'main' set up to track 'origin/main'
```

---

### Task 5: Convert Planning Repository Back To Planning Only

**Files:**
- Modify: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\README.md`
- Modify: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\AGENTS.md`
- Delete after app repo verification: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\site\**`
- Delete after app repo verification: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\apps\**`
- Delete after app repo verification: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\vercel.json`

**Interfaces:**
- Consumes: verified public website repo and verified CRM/admin repo
- Produces: planning-only repo that cannot be mistaken for a deployable app repo

- [ ] **Step 1: Create planning-only branch**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root switch -c codex/planning-repo-runtime-removal
```

- [ ] **Step 2: Remove runtime app folders from planning repo**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root rm -r site apps
git -C $root rm vercel.json .vercelignore
```

Expected:

```text
rm 'site/index.html'
rm 'apps/cms/package.json'
```

- [ ] **Step 3: Rewrite planning README**

Update `README.md`:

```markdown
# Mortgage Website Platform Plan

Planning repository for Snap Mortgage public website, CRM/admin, content architecture, local mortgage intelligence, compliance, data model, and workflow design.

## Runtime Repositories

- Public website: https://github.com/Think-Whale/mortgage-website
- Snap Homes: https://github.com/Think-Whale/snap-homes
- CRM/admin: https://github.com/Think-Whale/mortgage-platform-admin

## This Repository Contains

- Product strategy and PRDs.
- Information architecture.
- Page templates and content models.
- Data model and CMS/admin requirements.
- Research plans and content operations plans.
- n8n/editorial workflow planning.

## This Repository Does Not Deploy Apps

Do not add public website runtime code or CRM/admin runtime code to this planning repo.
```

- [ ] **Step 4: Rewrite planning AGENTS instructions**

Update `AGENTS.md`:

```markdown
# Agent Instructions

This repo is the source of truth for mortgage platform planning.

## Boundaries

- Keep product, architecture, research, workflow, and documentation here.
- Public website implementation belongs in `Think-Whale/mortgage-website`.
- Snap Homes implementation belongs in `Think-Whale/snap-homes`.
- CRM/admin implementation belongs in `Think-Whale/mortgage-platform-admin`.
- Do not add app runtime code, generated static pages, or Vercel app configs to this repo.

## Start Here

1. `README.md`
2. `docs/00-chat-handoff.md`
3. `docs/01-vision-and-positioning.md`
4. `docs/02-information-architecture.md`
5. `docs/03-page-templates.md`
6. `docs/04-backend-and-cms-admin.md`
7. `docs/05-data-model.md`
8. `docs/08-grill-me-questions.md`
```

- [ ] **Step 5: Verify planning repo contains no runtime app folders**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
Test-Path "$root\site"
Test-Path "$root\apps"
Test-Path "$root\vercel.json"
```

Expected:

```text
False
False
False
```

- [ ] **Step 6: Commit planning-only cleanup**

```powershell
$root = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
git -C $root add README.md AGENTS.md
git -C $root commit -m "chore: make planning repo documentation-only"
git -C $root push -u think-whale codex/planning-repo-runtime-removal
```

Expected:

```text
branch 'codex/planning-repo-runtime-removal' set up to track 'think-whale/codex/planning-repo-runtime-removal'
```

---

### Task 6: Separate Vercel Projects And Deployment Ownership

**Files:**
- Modify in public repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website\README.md`
- Modify in Snap Homes repo when implementation begins: `C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes\README.md`
- Modify in CRM/admin repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin\README.md`
- Modify in planning repo: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\README.md`

**Interfaces:**
- Consumes: public website repo and CRM/admin repo pushed to GitHub
- Produces: explicit Vercel ownership so public site and admin app cannot overwrite each other

- [ ] **Step 1: Link public website Vercel project**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
Set-Location $repo
vercel link --project mortgage-website --yes
vercel deploy --prod
```

Expected:

```text
Production: https://mortgage-website-...
```

- [ ] **Step 2: Link CRM/admin Vercel project**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin'
Set-Location $repo
vercel link --project mortgage-platform-admin --yes
vercel deploy --prod
```

Expected:

```text
Production: https://mortgage-platform-admin-...
```

- [ ] **Step 3: Record production URLs in READMEs**

Add to public website `README.md`:

```markdown
## Deployment

Production Vercel project: `mortgage-website`
Production URL: `https://mortgage-website-platform-plan-chi.vercel.app/`
```

Add to CRM/admin `README.md`:

```markdown
## Deployment

Production Vercel project: `mortgage-platform-admin`
Production URL: recorded after the first admin-only production deployment.
```

Add to planning repo `README.md`:

```markdown
## Runtime Repo Ownership

- Public website runtime: `Think-Whale/mortgage-website`
- Snap Homes runtime: `Think-Whale/snap-homes`
- CRM/admin runtime: `Think-Whale/mortgage-platform-admin`
- Planning/docs only: this repository
```

- [ ] **Step 4: Commit deployment ownership docs**

```powershell
git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website' add README.md .vercel vercel.json
git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website' commit -m "docs: record public website deployment ownership"
git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website' push

git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin' add README.md .vercel vercel.json
git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin' commit -m "docs: record admin deployment ownership"
git -C 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin' push
```

---

### Task 7: Final Verification Matrix

**Files:**
- Modify: no source files

**Interfaces:**
- Consumes: three separated repositories
- Produces: go/no-go evidence for retiring mixed-repo deploys

- [ ] **Step 1: Verify public website repo has no CRM/admin app**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website'
Test-Path "$repo\apps"
rg "payload|@payloadcms|next dev" $repo
```

Expected:

```text
False
```

The `rg` command may return lines only if old documentation mentions the admin repo boundary.

- [ ] **Step 2: Verify CRM/admin repo has no public generated site**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin'
Test-Path "$repo\site"
rg "campaign-hero|phase2-static-smoke|generated/routes" $repo
```

Expected:

```text
False
```

The `rg` command may return lines only if README boundary text mentions the public repo.

- [ ] **Step 3: Verify Snap Homes repo has no mortgage website or CRM/admin runtime**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\snap-homes'
Test-Path "$repo\site"
Test-Path "$repo\apps"
rg "campaign-hero|@payloadcms|phase2-static-smoke|loan officer|Payload CMS" $repo
```

Expected:

```text
False
False
```

The `rg` command may return lines only in boundary documentation that says those responsibilities belong to neighboring repos.

- [ ] **Step 4: Verify planning repo has no runtime app folders**

```powershell
$repo = 'C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local'
Test-Path "$repo\site"
Test-Path "$repo\apps"
Test-Path "$repo\vercel.json"
```

Expected:

```text
False
False
False
```

- [ ] **Step 5: Verify production URLs**

```powershell
Invoke-WebRequest -Uri 'https://mortgage-website-platform-plan-chi.vercel.app/' -UseBasicParsing -TimeoutSec 20 | Select-Object StatusCode
```

Expected:

```text
StatusCode
----------
       200
```

- [ ] **Step 6: Document completion**

Create `docs/repo-split-completion-2026-07-22.md` in the planning repo:

```markdown
# Repo Split Completion

Date: 2026-07-22

## Repositories

- Public website: `Think-Whale/mortgage-website`
- Snap Homes: `Think-Whale/snap-homes`
- CRM/admin: `Think-Whale/mortgage-platform-admin`
- Planning/docs: `Think-Whale/mortgage-website-platform-plan`

## Verification

- Public website local smoke passed.
- Snap Homes boundary repo created and contains no mortgage public site or CRM/admin runtime.
- CRM/admin build passed.
- Planning repo contains no runtime app folders.
- Public website Vercel project serves the public site.
- CRM/admin Vercel project is separate from the public website project.
```

---

## Self-Review

**Spec coverage:** This plan addresses the user requirement that CMS/CRM and the public site become completely different apps in different repositories. It also preserves the planning repository as a documentation and architecture source of truth.

**Placeholder scan:** The plan uses concrete repository names, local paths, commands, file contents, and expected outputs. It avoids placeholder repo names and undefined commands.

**Type consistency:** The path names are consistent across tasks:

- Public website: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website`
- CRM/admin: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-platform-admin`
- Planning worktree: `C:\Users\caleb\OneDrive\Documents\GitHub\mortgage-website-platform-plan\.worktrees\main-local`

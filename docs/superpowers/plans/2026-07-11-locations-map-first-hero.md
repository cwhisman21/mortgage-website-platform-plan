# Locations Map-First Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simplified map with the supplied 51-path U.S. SVG and make a large, centered, fully linked map the dominant locations-page hero.

**Architecture:** Preserve the supplied SVG as a licensed source asset and generate the existing path-data module from it with an XML-aware PowerShell script. Keep state-route rendering in `us-state-map.mjs`, add a focused pure `locations-hero.mjs` template, and let `app.js` compose that template once on `/locations`.

**Tech Stack:** Static ES modules, semantic HTML, inline SVG, CSS, Node test runner, PowerShell XML parser, local Chrome browser verification.

## Global Constraints

- Use `C:\Users\caleb\Downloads\us.svg` as the geometry source.
- Preserve all 51 state and District of Columbia path IDs and the embedded Simplemaps source notice.
- Use Snap blue `#0B55FF` on white.
- Keep every state route clickable and retain the approved D.C. star marker.
- Hero copy is: eyebrow "Explore mortgage markets", H1 "Where are you looking?", and lead "Choose a state or search for a city to explore local prices, payments, loan options, and market updates."
- Remove the Texas and watchlist hero CTAs; keep the existing later watchlist section.
- Remove the duplicate map section below the hero.
- Do not alter state pages, routes, charts, news, account behavior, or backend simulations.
- Do not add a frontend dependency.

---

### Task 1: Adopt the detailed state geometry

**Files:**
- Create: `site/assets/us-map-source.svg`
- Create: `site/scripts/generate-us-state-map-paths.ps1`
- Modify: `site/assets/us-state-map-paths.mjs`
- Modify: `site/us-state-map.mjs`
- Test: `site/us-state-map.test.mjs`

**Interfaces:**
- Consumes: supplied SVG path IDs matching `/^[A-Z]{2}$/`.
- Produces: `US_MAP_VIEWBOX: string`, `US_STATE_PATHS: Record<string, string>`, `DC_STAR: string`, and `renderUsStateMap(states): string`.

- [ ] **Step 1: Write the failing geometry and renderer tests**

Update `site/us-state-map.test.mjs` imports and the first two tests to assert the new source inventory and view box:

```js
import { DC_STAR, US_MAP_VIEWBOX, US_STATE_PATHS } from "./assets/us-state-map-paths.mjs";

test("ships the supplied path data for every U.S. state and D.C.", () => {
  assert.equal(US_MAP_VIEWBOX, "0 0 1000 589");
  assert.equal(Object.keys(US_STATE_PATHS).length, 51);
  assert.ok(Object.keys(US_STATE_PATHS).includes("DC"));
  assert.ok(Object.values(US_STATE_PATHS).every((path) => typeof path === "string" && path.length > 100));
  assert.match(DC_STAR, /^M880 220/);
});

test("renders detailed route-bearing state anchors and a D.C. star", () => {
  const html = renderUsStateMap(states);

  assert.match(html, /<svg[^>]*viewBox="0 0 1000 589"/);
  assert.match(html, /href="\/locations\/texas"/);
  assert.match(html, /aria-label="Open Texas mortgage market"/);
  assert.match(html, /<title>Texas<\/title>/);
  assert.match(html, /data-state-id="state-dc"/);
  assert.match(html, /class="us-state-map-dc-star"/);
});
```

- [ ] **Step 2: Run the map test and verify it fails**

Run:

```powershell
node --test site\us-state-map.test.mjs
```

Expected: FAIL because `US_MAP_VIEWBOX` is not exported and the existing geometry has only 50 state paths in the old view box.

- [ ] **Step 3: Preserve the supplied source SVG**

Run the mechanical asset copy:

```powershell
Copy-Item -LiteralPath 'C:\Users\caleb\Downloads\us.svg' -Destination 'site\assets\us-map-source.svg'
```

Confirm its contract:

```powershell
[xml]$svg = Get-Content site\assets\us-map-source.svg -Raw
$paths = @($svg.SelectNodes("//*[local-name()='path']") | Where-Object { $_.id -match '^[A-Z]{2}$' })
if ($svg.svg.viewBox -ne '0 0 1000 589' -or $paths.Count -ne 51) { throw 'Unexpected U.S. map source contract.' }
```

Expected: no output and exit code `0`.

- [ ] **Step 4: Add the XML-aware path generator**

Create `site/scripts/generate-us-state-map-paths.ps1` with:

```powershell
param(
  [string]$Source = "site/assets/us-map-source.svg",
  [string]$Output = "site/assets/us-state-map-paths.mjs"
)

$ErrorActionPreference = "Stop"
[xml]$document = Get-Content -LiteralPath $Source -Raw
$viewBox = [string]$document.svg.viewBox
$paths = @(
  $document.SelectNodes("//*[local-name()='path']") |
    Where-Object { $_.id -match "^[A-Z]{2}$" } |
    Sort-Object id
)

if ($viewBox -ne "0 0 1000 589") {
  throw "Unexpected map viewBox: $viewBox"
}
if ($paths.Count -ne 51) {
  throw "Expected 51 state and District paths; received $($paths.Count)."
}
if (-not ($paths.id -contains "DC")) {
  throw "The supplied map is missing the District of Columbia path."
}

$entries = $paths | ForEach-Object {
  "  $($_.id): $([string]$_.d | ConvertTo-Json -Compress),"
}
$lines = @(
  "// Geometry extracted from Simplemaps us.svg (commercial-use source notice retained in us-map-source.svg)."
  "// Generated by site/scripts/generate-us-state-map-paths.ps1; do not hand-edit path data."
  "export const US_MAP_VIEWBOX = $($viewBox | ConvertTo-Json -Compress);"
  "export const US_STATE_PATHS = {"
  $entries
  "};"
  ""
  'export const DC_STAR = "M880 220 L883 227 L891 227 L885 232 L887 240 L880 236 L873 240 L875 232 L869 227 L877 227 Z";'
)

$outputPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($outputPath, ($lines -join [Environment]::NewLine) + [Environment]::NewLine, $utf8)
Write-Output "Generated $Output from $($paths.Count) state paths."
```

- [ ] **Step 5: Generate the detailed path module**

Run:

```powershell
& site\scripts\generate-us-state-map-paths.ps1
```

Expected: `Generated site/assets/us-state-map-paths.mjs from 51 state paths.`

- [ ] **Step 6: Update the state-map renderer**

Replace `site/us-state-map.mjs` with:

```js
import { DC_STAR, US_MAP_VIEWBOX, US_STATE_PATHS } from "./assets/us-state-map-paths.mjs";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const hasStateHubRoute = (route) => /^\/locations\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route || "");

function stateAnchor(state, path, className = "us-state-map-link") {
  if (!state || !hasStateHubRoute(state.route)) return "";
  const name = escapeHtml(state.name);
  return `<a class="${className}" data-state-id="${escapeHtml(state.id)}" href="${escapeHtml(state.route)}" aria-label="Open ${name} mortgage market"><path data-state-path="${escapeHtml(state.abbr)}" d="${path}"><title>${name}</title></path></a>`;
}

export function renderUsStateMap(states) {
  const byAbbr = new Map((Array.isArray(states) ? states : []).map((state) => [state?.abbr, state]));
  const stateAnchors = Object.entries(US_STATE_PATHS)
    .filter(([abbr]) => abbr !== "DC")
    .map(([abbr, path]) => stateAnchor(byAbbr.get(abbr), path))
    .join("");
  const dcStar = stateAnchor(byAbbr.get("DC"), DC_STAR, "us-state-map-dc-star");

  return `<nav class="us-state-map" aria-label="Browse mortgage markets by state"><svg viewBox="${US_MAP_VIEWBOX}" aria-label="United States mortgage market map">${stateAnchors}${dcStar}</svg></nav>`;
}
```

- [ ] **Step 7: Run focused and full map tests**

Run:

```powershell
node --test site\us-state-map.test.mjs
node --test site\*.test.mjs
```

Expected: all map tests pass; the site test suite has zero failures.

- [ ] **Step 8: Commit the geometry task**

```powershell
git add site/assets/us-map-source.svg site/scripts/generate-us-state-map-paths.ps1 site/assets/us-state-map-paths.mjs site/us-state-map.mjs site/us-state-map.test.mjs
git commit -m "feat: adopt detailed US state map geometry"
```

### Task 2: Render a focused map-first locations hero

**Files:**
- Create: `site/locations-hero.mjs`
- Create: `site/locations-hero.test.mjs`
- Modify: `site/app.js`

**Interfaces:**
- Consumes: `renderUsStateMap(states)` from Task 1 and the existing `data.states` inventory.
- Produces: `renderLocationsHero(states): string` used exactly once by `locationsPage()`.

- [ ] **Step 1: Write the failing hero contract test**

Create `site/locations-hero.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { renderLocationsHero } from "./locations-hero.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("renders a centered map-first borrower hero", () => {
  const html = renderLocationsHero(seed.states);

  assert.match(html, /<section class="hero-band locations-hero">/);
  assert.match(html, /<h1>Where are you looking\?<\/h1>/);
  assert.match(html, /Choose a state or search for a city/);
  assert.match(html, /placeholder="Search city or state"/);
  assert.match(html, /data-search-form/);
  assert.equal((html.match(/data-state-id=/g) || []).length, 51);
  assert.doesNotMatch(html, /Start with Texas|Add to watchlist/);
});

test("the locations page renders one hero map and no duplicate map section", () => {
  const locationsSource = appSource.slice(
    appSource.indexOf("function locationsPage()"),
    appSource.indexOf("function ratesPage()"),
  );

  assert.equal((locationsSource.match(/renderLocationsHero\(data\.states\)/g) || []).length, 1);
  assert.doesNotMatch(locationsSource, /Browse state mortgage markets|renderUsStateMap/);
});
```

- [ ] **Step 2: Run the hero test and verify it fails**

Run:

```powershell
node --test site\locations-hero.test.mjs
```

Expected: FAIL because `site/locations-hero.mjs` does not exist.

- [ ] **Step 3: Implement the pure locations hero**

Create `site/locations-hero.mjs`:

```js
import { renderUsStateMap } from "./us-state-map.mjs";

export function renderLocationsHero(states) {
  return `
    <section class="hero-band locations-hero">
      <div class="locations-hero-inner">
        <div class="locations-hero-copy">
          <p class="eyebrow">Explore mortgage markets</p>
          <h1>Where are you looking?</h1>
          <p class="lead">Choose a state or search for a city to explore local prices, payments, loan options, and market updates.</p>
          <form class="search-form locations-hero-search" data-search-form>
            <input name="query" aria-label="Search city or state" placeholder="Search city or state" />
            <button class="button" type="submit">Search</button>
          </form>
        </div>
        ${renderUsStateMap(states)}
      </div>
    </section>
  `;
}
```

- [ ] **Step 4: Integrate the hero once in `app.js`**

Add the import:

```js
import { renderLocationsHero } from "/site/locations-hero.mjs";
```

Remove the direct `renderUsStateMap` import. In `locationsPage()`, replace the complete existing generic `hero({` template call with:

```js
${renderLocationsHero(data.states)}
```

Delete the standalone section call that begins with:

```js
${section("Browse state mortgage markets",
```

Do not change the editorial section or any sections after it.

- [ ] **Step 5: Run the hero, copy, and route tests**

Run:

```powershell
node --test site\locations-hero.test.mjs site\us-state-map.test.mjs site\public-copy-guard.test.mjs
node site\phase2-static-smoke.mjs
```

Expected: all tests pass and static smoke reports `863 routes checked` or a higher valid count.

- [ ] **Step 6: Commit the semantic hero task**

```powershell
git add site/locations-hero.mjs site/locations-hero.test.mjs site/app.js
git commit -m "feat: make locations hero map first"
```

### Task 3: Style and visually verify the large centered map

**Files:**
- Modify: `site/locations-hero.test.mjs`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: the `locations-hero-*` classes from Task 2.
- Produces: a stable desktop/mobile layout with the map at `min(1100px, 100%)` and no overflow.

- [ ] **Step 1: Add a failing stylesheet contract test**

Append to `site/locations-hero.test.mjs`:

```js
const stylesheet = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("styles the locations hero as a large centered map composition", () => {
  assert.match(stylesheet, /\.locations-hero-inner\s*\{/);
  assert.match(stylesheet, /\.locations-hero \.us-state-map\s*\{/);
  assert.match(stylesheet, /width:\s*min\(1100px, 100%\)/);
  assert.match(stylesheet, /aspect-ratio:\s*1000\s*\/\s*589/);
  assert.match(stylesheet, /@media \(max-width: 760px\)[\s\S]*\.locations-hero-search/);
});
```

- [ ] **Step 2: Run the stylesheet test and verify it fails**

Run:

```powershell
node --test site\locations-hero.test.mjs
```

Expected: FAIL because the locations-specific layout rules are absent.

- [ ] **Step 3: Add the locations hero and detailed-map CSS**

Add this block near the existing map rules in `site/styles.css`, and replace the existing state-path stroke width with `1.2`:

```css
.locations-hero {
  background: #fff;
}

.locations-hero-inner {
  position: relative;
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 48px 0 30px;
  text-align: center;
}

.locations-hero-copy {
  width: min(760px, 100%);
  margin: 0 auto;
}

.locations-hero-copy .eyebrow {
  justify-content: center;
}

.locations-hero-copy h1,
.locations-hero-copy .lead {
  max-width: none;
}

.locations-hero-search {
  width: min(640px, 100%);
  margin: 24px auto 0;
}

.locations-hero .us-state-map {
  width: min(1100px, 100%);
  margin: 22px auto 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: #fff;
  box-shadow: none;
  aspect-ratio: 1000 / 589;
}

.locations-hero .us-state-map svg {
  width: 100%;
  height: 100%;
}

.us-state-map-link path,
.us-state-map-dc-star path {
  cursor: pointer;
  stroke-width: 1.2;
}

.us-state-map-dc-star path {
  stroke-width: 2.5;
}

@media (max-width: 760px) {
  .locations-hero-inner {
    width: min(calc(100vw - 24px), 1200px);
    padding: 34px 0 26px;
  }

  .locations-hero-search {
    grid-template-columns: 1fr;
  }

  .locations-hero .us-state-map {
    margin-top: 18px;
  }
}
```

- [ ] **Step 4: Run focused and full automated validation**

Run:

```powershell
node --test site\locations-hero.test.mjs site\us-state-map.test.mjs
node --test site\*.test.mjs mock-data\tests\*.test.mjs
node site\phase2-static-smoke.mjs
node --check site\app.js
git diff --check
```

Expected: all tests pass, static smoke has no missing routes, syntax exits `0`, and diff check is clean.

- [ ] **Step 5: Verify the hero in local Chrome**

Use the rewrite-aware local site at `http://127.0.0.1:4176/locations`. If port `4176` is not listening, start the same Node rewrite server used for this worktree before opening Chrome.

At `1440x1080`, verify:

```text
H1: Where are you looking?
Map links: 51
D.C. star links: 1
Duplicate map sections: 0
Horizontal overflow: false
```

Click Vermont and confirm the URL becomes `/locations/vermont`. Tab to a state link and confirm the focused state has an amber outline. At `390x844`, confirm the search stacks above the full map and `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 6: Commit the responsive visual task**

```powershell
git add site/locations-hero.test.mjs site/styles.css
git commit -m "style: center the interactive locations map"
```

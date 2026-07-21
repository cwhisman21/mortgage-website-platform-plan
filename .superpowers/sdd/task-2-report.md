# Task 2 Report: Hero Asset Manifest

## Status

DONE

## Files

- `mock-data/hero-asset-manifest.json`
- `mock-data/hero-asset-manifest.test.mjs`
- `schemas/hero-asset-manifest.schema.json`
- `.superpowers/sdd/task-2-report.md`

## Coverage

- 29 total draft entries.
- All 4 prototype state routes and all 12 prototype city routes.
- One representative for each of the other 13 in-scope page families.
- No homepage, locations directory, calculator directory, individual calculator, or rates entry.
- Every city/state brief has 3 visual truths, 2 stereotypes to avoid, desired lived behavior, crop-safe focal guidance, and public authoritative evidence URLs.

## Draft Safety

The base `HeroImageRecord` now distinguishes planned and selected asset references. Every manifest entry uses only an honest planning slot: `selection_status: "unselected"`, `rights_review_status: "not_started"`, and `publishing_status: "prohibited"`. Planning slots cannot carry an asset ID, origin, source URL, rights record, acquisition date, or license. Local evidence briefs likewise use `asset_selection_status: "unselected"` and cannot claim an asset-selection tier, selected geography, or approval. Selected assets retain strict provenance rules, and an approved hero cannot use a planned asset.

## Research

Locality briefs were checked against primary or authoritative public sources, including municipal planning, parks, trails, historic-preservation, and urban-forestry pages; state environmental agencies; and the Colorado Climate Center. The URLs are evidence for art-direction briefs, not image-source or license selections.

## TDD Evidence

RED command:

`node --test mock-data/hero-asset-manifest.test.mjs`

RED result: expected failure — 5 tests failed because the manifest and wrapper schema did not yet exist.

GREEN command:

`node --test mock-data/hero-asset-manifest.test.mjs`

GREEN result: PASS — 5 tests passed, 0 failed.

## Final Verification

Command:

`node --test schemas/hero-image.schema.test.mjs mock-data/hero-asset-manifest.test.mjs`

Result: PASS — 13 tests passed, 0 failed.

Command:

`git diff --check`

Result: PASS — no whitespace errors.

Manifest audit result: 29 unique routes; page-type counts are 4 state, 12 city, and 1 each for buy, refinance, home equity, canonical loan product, Learning Center, topic hub, article, loan officer, branch, company, search/directory, prequalification, and seller/move-up.

## Self-review

- Confirmed the wrapper uses JSON Schema Draft 2020-12 and references `hero-image.schema.json`.
- Confirmed route uniqueness, complete prototype locality coverage, and protected-route exclusions.
- Confirmed each page type uses the approved composition with no exception records.
- Confirmed all entries remain unselected drafts and include no purported approval or selected external asset.
- Confirmed locality facts describe multiple resident-recognizable signals rather than landmarks alone.
- Confirmed Task 1 and Task 2 tests pass together.

## Concerns

- The manifest is intentionally not publishable. Asset selection, individual-license verification, creator attribution, release checks, crop review, alt-text finalization, editorial review, and rights review remain future work.
- `/company`, `/prequalification`, and `/seller-move-up` are representative planning routes for spec families not listed in the 91-route prototype inventory.

## Review Fixes (2026-07-21)

- Added the artifact's top-level `$schema` property to the wrapper contract.
- Added a dependency-free JSON Schema evaluator to the Task 2 test. It traverses local and external `$ref` values, required/properties/additional-properties rules, arrays, scalar constraints, `allOf`, `anyOf`, `oneOf`, `if/then/else`, and `not`.
- Replaced all 29 invented pending asset records with acquisition-free planning slots.
- Added negative tests for acquisition facts on unselected slots, selected locality tiers on unselected briefs, and approval of heroes that still contain planned assets.
- Replaced the stale Irvine URL with current `cityofirvine.gov` sources.

Review RED command:

`node --test schemas/hero-image.schema.test.mjs mock-data/hero-asset-manifest.test.mjs`

Review RED result: expected failure — 9 tests passed and 5 failed on the wrapper mismatch, invented acquisition model, selected locality tier, and missing planned/selected schema branches.

Review GREEN command:

`node --test schemas/hero-image.schema.test.mjs mock-data/hero-asset-manifest.test.mjs`

Review GREEN result: PASS — 14 tests passed, 0 failed.

## Local Truth-to-Evidence Audit

Each truth below was checked against the named authoritative sources. `source_links` and `geography_evidence` now contain the corresponding URLs.

| Route | Truth coverage |
| --- | --- |
| Texas | TPWD ecoregions supports statewide terrain, vegetation, and light; TDHCA regional allocation methodology supports distinct urban/rural housing regions. |
| California | California State Parks supports coast-range, valley, Sierra, desert, and climate cues; HCD statewide plans support varied housing and community context. |
| Colorado | Colorado Climate Center supports plains, foothills, mountains, seasonal light, and altitude; CSU Extension supports semi-arid, water-wise residential landscaping. |
| Florida | Florida DEP coastal and wetland resources support dunes, mangroves, wetlands, water, and humid landscapes; Florida Division of Library and Information Services supports regionally varied residential architecture. |
| Austin | City community profile supports limestone, converging ecoregions, and oak vegetation; historic-district records support neighborhood housing; Urban Trails supports daily walking and cycling. |
| Dallas | Citywide plans support parks, trails, complete streets, and housing patterns; The Bottoms area plan supports residential form, walkable streets, and park connections. |
| Houston | The Houston Bike Plan directly supports all three revised truths: bayou greenways, neighborhood/destination connections, and routine walking or cycling. |
| Irvine | Gateway Preserve supports housing beside preserved open space; Open Space & Trails supports landscape and recreation; Neighborhood Parks supports village-scale parks and daily activity. |
| San Diego | Open Space Canyons supports canyon terrain and trail behavior; the Southeastern San Diego/Encanto community plan supports neighborhood housing and parks. |
| Sacramento | Urban Forestry supports canopy, shade, neighborhood trees, and daily stewardship; Riverfront planning supports the Sacramento/American River setting and bicycle use. |
| Denver | Colorado Climate Center supports high-plains and Front Range light; Denver parkway guidelines support tree-lined residential parkways; Mountain Parks supports foothill and mountain backdrops. |
| Colorado Springs | Parks, Trails & Open Spaces supports foothills, red rock, grasslands, canyons, and trail behavior; Greater Westside planning supports residential neighborhoods beside open space. |
| Boulder | OSMP supports foothills, grassland, open space, and trail routines; the Boulder Valley Comprehensive Plan supports the urban/natural edge, housing, and neighborhood context. |
| Tampa | City neighborhood guidance supports bungalows, multifamily housing, parks, and grand oaks; South Seminole Heights supports river, bungalow, tree, and boardwalk cues. |
| Orlando | Historic Preservation Districts supports documented home styles and tree-lined brick streets; the Lake Eola master plan supports lake-edge neighborhoods and routine park use. |
| Miami | City Historic Preservation supports Mediterranean Revival, Art Deco, Craftsman, and Bahamian housing; Miami-Dade forests supports tropical hardwood hammock; City Parks supports resident activity and Biscayne Bay island ecology. |

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

The base `HeroImageRecord` requires a desktop asset for photographic variants. Each manifest entry therefore uses an explicit `asset_selection_status: "unselected"` plus an internal `pending-hero-*` placeholder. Its rights record says that no asset has been selected or acquired, marks release status `not_verified`, and prohibits publication. No source asset URL, license URL, review timestamp, reviewer, variant exception, fallback approval, generated prompt, or selected-asset approval was invented.

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

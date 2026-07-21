# Task 4 Report: Audited Locality Hero Candidate Pass

## Corrected outcome

The 32-source corpus is an audited failed free-stock pass, not a selected hero set.

- 16 locality pools, all unresolved and publication-prohibited
- 10 candidates nominated for rights review only
- 10 candidates explicitly ineligible on editorial-locality grounds
- 0 selected, acquired, rights-complete, approved, or publishable assets
- 0 newly sourced or generated assets in this correction

Every route now proceeds to a commissioned neighborhood-scale lived-behavior photograph or approved tier-3 generation under the existing playbook.

## Fixes

- Reclassified the ten former selections as nominations and replaced `selected_candidate_id` with `nominated_candidate_id`.
- Split `rights_eligibility` from `editorial_locality_eligibility` while preserving all source, license, and release facts.
- Marked both Texas, both California, both Colorado state, Everglades, both Irvine, and Boulder Chautauqua candidates editorially ineligible with reasons.
- Renamed `required_attribution` to `attribution_label`; the final rights record must add source/license links and crop/change notices.
- Added structural visual motifs and a failed manual set audit: skyline 9/maximum 4, water 7/maximum 3, lived behavior 0/minimum 4.
- Added Austin's unproven required 4:5 mobile-crop risk.
- Updated the 16-row review so every route is unresolved and routed to commissioning or approved tier-3 generation.

Schema v1.2.0 models the playbook order: research candidate → nominated → acquired with complete rights → selected → reviewed/approved. A future selection requires acquisition and complete rights; a failed manual audit, missing lived behavior, or repetition-threshold failure prevents selection.

## TDD and verification

- RED: `node --test mock-data/hero-locality-candidates.test.mjs` — 3 passed, 8 failed for the expected missing review behavior.
- GREEN: the same suite — 11/11 passed.
- Affected compatibility suite — 33/33 passed.
- Dependency-free repository suite, excluding the independently stale generated-route freshness test — 516/516 passed.
- Parsed preservation audit: all 29 hero entries unchanged; all candidate source/license/release facts unchanged; 16 unresolved, 10 nominated, 0 selected, 10 editorially ineligible; 16 documentation rows.

Known unrelated repository conditions remain: four CMS TypeScript tests require absent `vitest`, and checked-in generated HTML is stale even though its generator does not read this manifest.

## Remaining concern

The free-stock corpus does not depict release-cleared neighborhood-scale lived behavior and must not ship as the locality hero system. Rights-blocked sources remain blocked, editorially ineligible sources cannot be nominated or selected, and all publishing gates remain intact.

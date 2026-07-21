# Task 4 Report: Pilot Locality Hero Candidates

## Outcome

Completed a governed research candidate pool for all four prototype states and twelve prototype cities.

- 16 locality pools
- 32 unique photographic candidates
- 10 city research selections
- 6 explicit unresolved outcomes: Texas, California, Colorado, Florida, Irvine, and Boulder
- 0 acquired assets
- 0 rights-approved assets
- 0 publishable assets
- 0 generated substitutes

Each candidate points to an individual Wikimedia Commons asset page and an official Creative Commons license page. Metadata records creator/agency, caption, dimensions, access date, required attribution, release position, risk notes, visible locality evidence, disposition, and nonpublication status.

## Implementation

- Advanced `hero-asset-manifest.json` to schema version 1.1.0 and added `locality_candidate_pools` without altering any of the 29 existing hero entries.
- Extended `hero-asset-manifest.schema.json` with candidate-pool, candidate, locality-signal, release-risk, disposition, and acquisition-state contracts.
- Preserved `hero-image.schema.json` publication gates unchanged.
- Extended the repository's dependency-free schema test helper to support JSON Schema `integer`, `contains`, `minContains`, and `maxContains` semantics required by the stronger manifest contract.
- Added a dependency-free candidate suite covering route completeness, unique source pages, provenance, signal thresholds, selected/unresolved outcomes, release blocking, protected routes, status boundaries, dimensions, and unchanged publication gates.
- Added the 16-route human review plus set-level repetition and stereotype audit in `docs/24-hero-locality-candidate-review.md`.

## TDD and verification evidence

Red phase:

- `node --test mock-data/hero-locality-candidates.test.mjs`
- Result before implementation: 9 tests, 6 passed, 3 failed because pools and schema v1.1.0 did not yet exist.

Green phase:

- `node --test mock-data/hero-locality-candidates.test.mjs`
- Result: 9/9 passed.

Affected compatibility suite:

- `node --test mock-data/hero-asset-manifest.test.mjs schemas/hero-image.schema.test.mjs docs/hero-sourcing-playbook.test.mjs mock-data/hero-locality-candidates.test.mjs`
- Result: 31/31 passed.

Dependency-free repository suite:

- All `*.test.mjs` except the independently stale `mock-data/generate-static-routes.test.mjs`
- Result: 514/514 passed.

Raw all-files run:

- `node --test`
- Result: 517/522 passed.
- Four unrelated CMS TypeScript tests could not load because `vitest` is not installed in this worktree.
- The checked-in static-route freshness test reports the repository's generated HTML as stale. It does not read the hero candidate manifest, and it also fails when isolated. No generated route files were changed or regenerated for this task.

Additional checks:

- JSON-schema wrapper validation passed with the new candidate pools.
- `git diff --check` passed.
- Parsed comparison against `HEAD` confirmed all 29 original manifest `entries` are unchanged.
- The review contains exactly 16 route rows.

## Unresolved decisions and production risk

- State sourcing remains unresolved because the verifiable choices are narrow scenery, not balanced statewide housing/lived context.
- Irvine remains unresolved because exact-city park views are not visually distinctive enough without captions.
- Boulder remains unresolved because the landscape option lacks lived context and the stronger Pearl Street option contains identifiable people without release evidence.
- Nine of ten selected city candidates include a skyline; seven use water foregrounds; none contains a selected `lived_behavior` signal. The set is too repetitive for production approval.
- Selected candidates are research preferences only. Counsel and production must still verify license version, attribution, creator identity, releases, architecture/artwork/trademark treatment, source stability, full-resolution content, and crop suitability.

## Self-review

No weakening of publication or review gates was introduced. Candidates with unresolved person/property release concerns are blocked and cannot be selected. Protected routes and page families remain excluded. The most important concern is the available pool's systematic skyline/landscape bias; the documentation treats that as a remediation requirement rather than a cosmetic caveat.

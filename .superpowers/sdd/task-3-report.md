# Task 3 Independent Review: Hero Sourcing Playbook

Reviewed range: `789fad70..2c547f39`

## Verdicts

- **Spec compliance: CHANGES REQUIRED**
- **Task quality: CHANGES REQUIRED**

## Findings

### Critical

None.

### Important

1. **The required assigning-editor and image-producer signoffs cannot be recorded with the supplied operator templates.**

   The playbook makes “Intake accepted” and “Production package complete” required signoffs for the assigning editor and image producer, and states that every signoff records a user ID, display name, decision, timestamp, and notes (`docs/22-hero-sourcing-playbook.md:39-47`). Its approval transition then requires all role signoffs to pass (`docs/22-hero-sourcing-playbook.md:184`). However:

   - The intake template records only `assigning_editor` plus a separate local-researcher signoff; it has no assigning-editor decision, timestamp, or notes (`docs/22-hero-sourcing-playbook.md:224-245`).
   - The candidate log records only `operator` and `checked_at`, before rights, crop/export, and delivery work is complete; it has no producer “Production package complete” signoff (`docs/22-hero-sourcing-playbook.md:248-265`).
   - The final signoff sheet captures editorial/compliance, accessibility/visual QA, and publisher signoffs, but not the producer signoff (`docs/22-hero-sourcing-playbook.md:317-338`).

   Consequently, an operator who copies every template still cannot produce the evidence needed to satisfy the playbook's own approval gate or its requirement that review fields be complete. Add explicit `intake_signoff` and `production_package_signoff` records (or one complete role-signoff block covering all seven roles), each carrying identity, decision, timestamp, and notes.

   The dependency-free test misses this gap: it checks section presence and several high-risk phrases, but asserts neither the complete role set nor the required signoff fields (`docs/hero-sourcing-playbook.test.mjs:10-95`). Extend it so removal of either signoff fails.

### Minor

None.

## `generation_model` schema assessment

The lack of a first-class `generation_model` property is **not a Task 3 blocking spec or quality issue**.

- The approved specification requires a generation prompt and reviewer for generated assets, not a dedicated model field (`docs/21-hero-image-system-spec.md:112-125`).
- The current schema requires `generation_prompt` and `generation_reviewer`; its closed `rights_record` has no `generation_model` property (`schemas/hero-image.schema.json:88-96`).
- The playbook goes beyond the approved contract by requiring provider/product/version, terms evidence, job or seed ID, checksum, and reviewer (`docs/22-hero-sourcing-playbook.md:125-148`, `297-314`). It explicitly routes model metadata through the immutable generation case file and requires a summary in schema-valid `usage_notes` until the schema is revised (`docs/22-hero-sourcing-playbook.md:148`).

This is a reasonable compatibility bridge for the Task 3 playbook. First-class schema support would improve machine enforcement because the current schema can validate an approved generated record whose `usage_notes` omit model details, but that is follow-up schema hardening, not a reason to reject Task 3. The blocking issue is the missing signoff capture above.

## Other requested checks

The remaining requested areas comply:

- Selection ladder order and stop rule match the approved specification (`docs/22-hero-sourcing-playbook.md:79-88`).
- Exact-place/subregion evidence, local-signal thresholds, and exception approval are operationally defined (`docs/22-hero-sourcing-playbook.md:65-103`).
- Rights, license, provenance, intended-use, entitlement, release, and asset-level snapshot checks are explicit and reject uncertainty (`docs/22-hero-sourcing-playbook.md:105-123`, `268-295`, `341-357`).
- The current official Unsplash, Pexels, Wikimedia Commons, USAGov, U.S. Copyright Office, and National Archives links resolve and support the playbook's cautious summaries. Government hosting is correctly treated as neither blanket public-domain status nor evidence that state/local works are federal works (`docs/22-hero-sourcing-playbook.md:196-216`).
- Generated-media fallback order, documentary prohibitions, real-person restrictions, input rights, model metadata, and review provenance are complete (`docs/22-hero-sourcing-playbook.md:125-148`).
- Both worked examples are clearly hypothetical, unselected, rejected, and non-publishable (`docs/22-hero-sourcing-playbook.md:359-388`).
- Crop/export, no-upscaling, AVIF/WebP/JPEG, focal-point, motion-poster, failure-path, and reduced-motion guidance is complete (`docs/22-hero-sourcing-playbook.md:150-175`).
- CMS state order, rejection returns, approval checks, retirement, re-verification, and protected exclusions are explicit (`docs/22-hero-sourcing-playbook.md:13-33`, `177-194`).

## Verification note

I did not modify source files or rerun the reported 21-test suite. I reviewed the supplied package, approved specification, current schemas, playbook, and dependency-free tests, and independently checked the time-sensitive official source links on 2026-07-21.

## Important-finding resolution

Status: RESOLVED

The assigning-editor and image-producer gates are now operationally recordable:

- The intake template includes `intake_accepted_signoff` with `role: assigning_editor`, identity, `decision: intake_accepted`, timestamp, and notes.
- The crop/export template includes `production_package_complete_signoff` with `role: image_producer`, identity, `decision: production_package_complete`, timestamp, and notes.
- The corresponding workflow exits explicitly require those structured records.
- The dependency-free content test asserts both complete role-specific records, so deleting either signoff or any required audit field fails.

Fix RED command:

`node --test docs/hero-sourcing-playbook.test.mjs`

Fix RED result: expected failure — 7 tests passed and the new signoff-record test failed before the templates were updated.

Fix GREEN command:

`node --test docs/hero-sourcing-playbook.test.mjs`

Fix GREEN result: PASS — 8 tests passed, 0 failed.

Combined verification command:

`node --test schemas/hero-image.schema.test.mjs mock-data/hero-asset-manifest.test.mjs docs/hero-sourcing-playbook.test.mjs`

Combined verification result: PASS — 22 tests passed, 0 failed.

Whitespace verification:

`git diff --check`

Whitespace result: PASS — no whitespace errors.

Remaining concern: the non-blocking `generation_model` schema observation above is unchanged; no additional Task 3 concerns remain.

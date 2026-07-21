# Task 3 Report: Hero Sourcing Playbook

## Status

DONE

## Files

- `docs/22-hero-sourcing-playbook.md`
- `docs/hero-sourcing-playbook.test.mjs`
- `.superpowers/sdd/task-3-report.md`

## Delivered

- One end-to-end operator workflow covering intake, protected-route checks, local evidence research, the exact-place/subregion/original/fallback ladder, candidate logging, per-asset rights and release verification, generated-media safeguards, crop/export review, CMS transitions, publishing, reverification, and retirement.
- Copyable intake, evidence, candidate, selected-rights, generation, crop/export, and role-signoff templates.
- Explicit AVIF, WebP, and JPEG fallback guidance; no-upscaling and responsive-crop rules; and motion poster/reduced-motion requirements.
- Hypothetical, unselected, non-publishable examples for an Austin candidate and an Orlando generated fallback. Both are rejected rather than implying invented acquisition or approval facts.
- A dependency-free Node content test covering required sections, locality ladder order, protected exclusions, rights fields, generation/documentary safeguards, crop and motion safeguards, CMS state order, and unfinished-placeholder exclusion.

## Official rights research

Checked current official primary sources on 2026-07-21:

- Unsplash License and Unsplash Releases and Trademarks guidance.
- Pexels License and Pexels Terms of Service.
- Wikimedia Commons reuse guidance.
- USAGov federal-material guidance, 17 U.S.C. §§ 101/105 through the U.S. Copyright Office, and National Archives permissions guidance.

The playbook states that provider summaries do not clear individual assets, that each asset and intended use must be verified at acquisition, and that not all government-hosted media is public domain.

## Test evidence

RED command:

`node --test docs/hero-sourcing-playbook.test.mjs`

RED result: expected failure because `docs/22-hero-sourcing-playbook.md` did not yet exist (`ENOENT`).

GREEN command:

`node --test docs/hero-sourcing-playbook.test.mjs`

GREEN result: PASS — 7 tests passed, 0 failed.

Combined Task 1 + Task 2 + Task 3 command:

`node --test schemas/hero-image.schema.test.mjs mock-data/hero-asset-manifest.test.mjs docs/hero-sourcing-playbook.test.mjs`

Combined result: PASS — 21 tests passed, 0 failed.

Whitespace command:

`git diff --check`

Whitespace result: PASS — no whitespace errors.

## Self-review

- Reconciled terminology and state values with both hero schemas and the approved specification.
- Confirmed the ladder stops at the first fully acceptable asset, not the first visually attractive candidate.
- Kept asset-level license/release checks separate from local evidence sources and repository-level terms.
- Required an independent rights signoff for externally sourced or generated work.
- Confirmed the generated workflow captures prompt, negative instructions, model/version, provider terms, inputs, job/seed ID, output checksum, edits, and reviewer while prohibiting documentary invention and real-person likenesses.
- Confirmed selected asset examples were not fabricated; both examples leave the CMS in a prohibited draft state.
- Confirmed only Task 3 files are intended for the Task 3 commit.

## Concerns

- `hero-image.schema.json` has first-class `generation_prompt` and `generation_reviewer` fields but no `generation_model` field. The playbook therefore requires model/provider/version, terms evidence, job/seed ID, and checksum in an immutable generation case file and summarized in `usage_notes`. A future schema revision should consider first-class generation provenance fields.
- Rights and release conclusions remain asset- and use-specific. The playbook appropriately routes ambiguity to counsel and prohibits publication rather than asserting legal clearance from a source-level license.

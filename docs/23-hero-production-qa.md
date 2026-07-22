# Hero Production QA Gate

Date: 2026-07-21

Status: executable release gate for every in-scope hero asset, page, location set, and page-family set

Inputs: `docs/21-hero-image-system-spec.md`, `docs/22-hero-sourcing-playbook.md`, both hero schemas, `mock-data/hero-asset-manifest.json`, and the candidate reviews in `docs/24-hero-locality-candidate-review.md` and `docs/25-hero-page-family-candidate-review.md`

This checklist is the last production control before a CMS publisher may authorize a hero. Every checkbox needs linked evidence, a status, and an accountable reviewer. A visual opinion, nomination, provider-level license summary, or approval by silence is not approval.

## Current release state

The manifest is version 1.3.0 and remains `draft`. The current state is honestly release-blocked:

- 16 locality pools contain 32 researched locality candidates and 10 nominations, but 0 acquired, 0 selected, 0 approved, and 0 authorized assets.
- The locality manual audit failed: skyline 9 against a maximum of 4, water 7 against a maximum of 3, and lived behavior 0 against a minimum of 4.
- 13 page-family pools contain 19 nominated external candidates, but 0 acquired, 0 rights-complete, 0 approved, and 0 authorized assets.
- The page-family audit is `failed` with `decision: no_selection`. The Learning Center evidence candidate has disputed rights; loan officer and branch assets are still internal-only requirements; Company is internal-first; Search/directory still requires a reviewed non-photographic treatment.
- All 29 hero entries remain `unselected`, `draft`, and publish-prohibited. This document does not advance any candidate lifecycle state.

Current release decision: `BLOCK`. Publishing status: `prohibited`.

## Status contract

Use exactly one status at each check, gate, and release level:

| Status | Exact meaning | Required action |
| --- | --- | --- |
| `PASS` | The requirement is met and immutable evidence is linked. | Continue to the next gate. |
| `FAIL` | Evidence proves the requirement is not met. | Reject or correct the asset/package, record an owner, and retest the failed check plus dependent checks. |
| `BLOCK` | Evidence, authority, required signoff, or a prerequisite is missing, disputed, expired, or unresolved. | Keep `publishing_status: prohibited`; do not infer a pass. Resolve the block, reopen affected approvals, and retest. |

`overall_status` is the worst status among every applicable asset, page, set, regression, and signoff record. Any `FAIL` or `BLOCK` prevents release. A failed manual set audit is `BLOCK` for every member of that set. Disputed rights are `BLOCK`. A missing required signoff is `BLOCK`. Only `PASS` permits publication.

Use `not_applicable` only for a named conditional check with a written rationale and reviewer. It is not a fourth status and cannot replace required evidence.

## Evidence artifacts

Store these artifacts in the immutable release case and link them from the records below:

1. Asset case: acquired original, `original_sha256`, original filename, `source_dimensions`, color profile, source page snapshot, exact controlling `terms_snapshot`, receipt/entitlement where relevant, release evidence, and risk review.
2. Generation case when applicable: prompt, negative instructions, model/provider/version, terms snapshot, timestamp, job/seed ID, inputs and their rights, untouched output, output checksum, iteration history, edits, disclosure, and independent reviewer.
3. Page case: route build ID, approved asset IDs/checksums, desktop/tablet/mobile screenshots, crop coordinates, contrast measurements, CTA-clearance overlays, responsive delivery trace, layout-shift evidence, LCP/preload trace, motion/reduced-motion capture, claims review, and composition mapping.
4. Set case: machine counts plus a signed contact sheet/manual audit for locality signals, exact-place truth, stereotypes, skyline/water/lived behavior, clichÃ©s, creator/subject/composition repetition, and source strategy.
5. Protected-route baseline: before/after screenshots and DOM/style/build hashes for every protected experience.
6. Release ledger: superseded record IDs, retest history, exceptions, each named signoff, final preview URL/build ID, and publish or rejection event.

Evidence must identify artifact URI, SHA-256 where file-backed, captured timestamp, environment/viewport, actor, and the check it supports. Mutable chat messages and bare source URLs are not sufficient evidence.

## Asset-level gate

Complete once for every still, mobile alternate, motion file, poster, collage component, internal asset, and generated output.

- [ ] Identity/provenance: `asset_id`, `asset_origin`, original filename, `source_url` or internal ownership trail, repository, `creator_or_agency`, `acquired_at`, and acquisition actor match the exact bytes reviewed.
- [ ] Exact rights basis: record `rights_basis_type`, `rights_basis_name` and version, `license_url` or controlling terms URL, immutable `source_snapshot`, exact `terms_snapshot`, account/receipt entitlement, allowed use, modifications, geography, attribution, ShareAlike/change notices, advertising limits, and `reverify_at` where applicable.
- [ ] Rights chain: the source is the rights holder, authorized licensor, commissioned provider, or traceable agency. Disputed rights are `BLOCK`; provider reputation or a public-domain mark alone cannot pass.
- [ ] Creator and attribution: creator/agency is named; `attribution_text` is exact, complete, and placed/tested when required.
- [ ] Releases: `release_status`, `model_release_evidence`, `property_release_evidence`, recognizable-person/minor/publicity/privacy review, and ownership/likeness consent are complete. `not_verified` or `required` without evidence is `BLOCK`.
- [ ] Third-party risk: `third_party_risk_review`, `trademark_review`, artwork/logo/signage/vehicle/screen/personal-data review, private-property review, and no-endorsement/sensitive-use analysis are signed.
- [ ] Accessibility semantics: `decorative` is explicit. Meaningful media has verifiable `alt_text` that neither repeats the headline nor makes a claim; decorative media has `alt_text: ""`.
- [ ] Integrity: `original_sha256`, `source_dimensions`, source format, archive location, and delivered derivative checksums match the case.
- [ ] Resolution: native pixels support every approved crop. `upscale_check: passed` means no upscale occurred; otherwise status is `FAIL`.
- [ ] Generated media, when applicable: `generated_disclosure`, complete `generation_prompt`, `negative_instructions`, `generation_model`, generated timestamp/job ID, inputs, `generation_terms_snapshot`, `original_output_sha256`, edits, and `generation_reviewer` distinct from the producer are recorded. Documentary, real-person, landmark, signage, malformed-detail, and regulated-claim checks pass.
- [ ] State: the selected CMS reference, origin, source, rights record, checksum, and case file agree. A nomination or unacquired candidate cannot pass.

Asset gate result is `PASS` only when every applicable check passes and the named rights reviewer and image producer have signed.

## Page-level gate

Run against the release build and exact route after asset approval.

- [ ] `desktop_preview` at 1440 px with a 560â€“720 px hero, `tablet_preview` at every implementation breakpoint, and `mobile_preview` at the approved 4:5 or portrait-friendly ratio are stored with viewport/build metadata.
- [ ] `focal_point_desktop` and `focal_point_mobile` preserve the primary subject, faces, required local cues, and documentary meaning.
- [ ] `text_cta_clearance` overlays prove headline, dek, primary CTA, and optional secondary CTA do not cover faces, essential cues, or each other; CTAs remain visible.
- [ ] WCAG 2.2 AA contrast is measured for all text/control states at every crop and breakpoint, including the worst image frame where motion exists. Record ratios, colors, tool/method, and `contrast_mode`.
- [ ] Meaningful/decorative behavior and alt output are verified in rendered markup; zoom, reflow, keyboard focus, and screen-reader naming remain usable.
- [ ] Motion has a separately cleared `poster_asset`; motion is non-essential and muted. With `prefers-reduced-motion: reduce`, animation never starts and the truthful poster appears. Poster-before-load, failure, data-saving, and disabled-motion paths pass.
- [ ] `reserved_aspect_ratio` or intrinsic dimensions reserve the final box. Capture CLS for the hero and route; asset/poster swaps do not move content.
- [ ] Responsive delivery includes AVIF and WebP plus JPEG fallback when the selected stack requires it. `srcset` and `sizes` select viewport-appropriate derivatives, derivative dimensions/bytes/checksums are logged, and no derivative is upscaled.
- [ ] Above-fold performance evidence shows only the current viewport's hero candidate receives high priority/preload. Record request waterfall, chosen candidate, priority, hero LCP element, LCP timing, and budget/result; non-winning alternates and motion are not eagerly preloaded.
- [ ] The page uses its schema-assigned composition. Any change has a complete `variant_exception` with rationale, identity, timestamp, notes, and design approval.
- [ ] `regulated_claim_review` confirms the image and surrounding copy do not imply approval, eligibility, rate, savings, protected-class targeting, wealth, customer status, endorsement, or borrower outcome.
- [ ] Subject relevance is unique to the page; actual IDs/checksums rendered match the approved records and required attribution is visible.

Page gate result is `PASS` only when every applicable check passes and editorial, design, accessibility, and compliance reviewers have signed.

## Location-set gate

Run on the complete intended city/state release set after every member passes asset and page gates.

```yaml
city_signal_minimum: 3
state_signal_minimum: 2
maximum_skyline_count: 4
maximum_water_count: 3
minimum_lived_behavior_count: 4
```

- [ ] `truth_to_source_evidence` maps every counted architecture, terrain/ecology, street form, lived behavior, civic/infrastructure, season/light, and geography claim to authoritative evidence and the visible pixels.
- [ ] `exact_place_ladder_log` proves exact geography was searched first, then verified subregion, then commissioned/generated work, then approved non-photographic treatment or hold. Each skipped/rejected tier has query, source, date, operator, and reason.
- [ ] City selections contain at least three distinct visible signal types. State selections contain at least two and do not collapse a state into one narrow neighborhood or landscape.
- [ ] `generic_fallback_check` proves there is no silent generic suburb, skyline, landscape, or stock substitute. Any generic fallback is `BLOCK`.
- [ ] `local_recognition_review` records named editorial/research review of ordinary resident-recognizable place truth and neighborhood-scale lived behavior.
- [ ] `stereotype_review` checks every evidence brief's avoid list, state diversity, tourism/landmark dominance, protected-class tokenism, and misleading season/weather.
- [ ] `repetition_review` records skyline, water, lived-behavior, architecture, creator, subject, crop, and composition counts plus a signed contact-sheet judgment.
- [ ] The numeric thresholds pass and the manual editorial audit passes. Numeric success cannot override manual failure.

If `manual_editorial_result: failed`, the set status is `BLOCK`, every pool stays unresolved, and no `selected_candidate_id` or publish authorization may be recorded.

## Family-set gate

Run on all intended non-location families together after member asset/page gates.

- [ ] ClichÃ© audit checks key handoff, cash pile, handshake, generic laptop, anonymous boardroom, staged celebration, keys-as-certainty, moving-box-only storytelling, generic house reuse, and tourist/office shorthand.
- [ ] `repetition_review` compares asset URLs, creators, people/casting, action, property form, paperwork, crop, color, and composition; adjacent families do not drift into the same visual idea.
- [ ] Buy, Refinance, Home Equity, canonical products, Learning Center, topic hub, article, prequalification, and seller/move-up remain subject-specific and their final crops are reviewed simultaneously.
- [ ] `actual_loan_officer_asset_check` verifies the current named person's approved likeness; stock/generated substitutes are `FAIL`.
- [ ] `actual_branch_asset_check` verifies the current branch exterior/interior or immediate operating context; stock/generated substitutes are `FAIL`.
- [ ] `company_internal_first_check` verifies actual Snap people/operating context or documents an approved sourcing exception after internal-first commissioning is exhausted.
- [ ] `non_photo_search_check` verifies Search/directory uses the approved accessible structured search/planning composition and truthful data instead of decorative stock photography.
- [ ] Rights eligibility is rechecked across components. A disputed component, including an unresolved public-domain assertion or third-party data right, is `BLOCK`.
- [ ] The manual family audit result is `passed`; a failed audit is `BLOCK` even when prohibited-clichÃ© and duplicate counts are zero.

## Protected-route regression gate

The hero system must leave these experiences unchanged:

- Homepage (`/`).
- Locations directory (`/locations`).
- Calculator directory (`/calculators`).
- Individual calculators (`/calculators/*`).
- Rates (`/rates`).

- [ ] Inventory every deployed individual calculator route and retain it in the regression record.
- [ ] Capture unchanged baseline evidence before implementation and matching release-build evidence at desktop, tablet, and mobile.
- [ ] Compare hero DOM, styles, assets, content, interactions, accessibility tree, requests, and screenshots; record accepted noise separately.
- [ ] Confirm no protected route imports, resolves, preloads, or publishes a governed hero asset/configuration.
- [ ] Any unexplained change is `FAIL`; any missing route/baseline is `BLOCK`.

## Retest and reopen rules

1. A `FAIL` returns the affected record to its owning production step. Retest the failed check and every dependent page/set/regression check on a new build.
2. A `BLOCK` remains publish-prohibited until the missing evidence or authority is supplied; the blocker resolver cannot self-approve a role requiring independence.
3. A new checksum, replacement asset, re-export, crop or focal-point change, text/CTA/layout change, contrast-mode change, format/loader change, motion/poster change, or composition change reopens asset/page and downstream set approvals.
4. A rights complaint or rights dispute, terms/source change, materially new use, mistaken location/identity, expired permission, or withdrawn release immediately reopens rights/compliance review and requires unpublish/retirement while reviewed.
5. A set membership change reopens both the new/changed member and the full relevant set audit. A protected-route implementation change reopens the complete protected regression gate.
6. Retest records link the prior record, reason, changed IDs/checksums/build, tests rerun, reviewer, timestamp, decision, and superseding record. Never overwrite prior evidence.

## Publish gate

The publisher may set `publishing_status: authorized` only when all of these are true:

- [ ] Every referenced asset record is `PASS`, rights-complete, acquired, checksum-matched, and not expired/disputed.
- [ ] Every route record is `PASS` on the final build.
- [ ] Applicable locality and family set records are `PASS` with `manual_editorial_result: passed`.
- [ ] Protected-route regression is `PASS` for the same build.
- [ ] Required editorial, rights, design, accessibility, and compliance signoffs are present; assigning editor, image producer, and publisher sign where required.
- [ ] CMS state is `approved` with `reviewed_at` and `reviewed_by`; final preview asset IDs, checksums, attribution, and evidence links match.

Otherwise set `overall_status: BLOCK` or `FAIL` as applicable and keep `publishing_status: prohibited`. Direct-to-production delivery is forbidden.

## Copyable QA records

Replace every angle-bracket instruction with verified evidence. Decisions are `approved` or `rejected`; QA statuses are `PASS`, `FAIL`, or `BLOCK`.

### Per-asset record

```yaml
record_type: hero_asset_qa
asset_id: <immutable ID>
asset_origin: <stock | commissioned | internal | generated>
status: <PASS | FAIL | BLOCK>
source_url: <individual asset URL or internal case URI>
creator_or_agency: <verified name>
acquired_at: <YYYY-MM-DD>
rights_basis_type: <license | ownership | commissioned_agreement | public_domain | generated_terms | disputed>
rights_basis_name: <exact title and version>
license_url: <direct controlling URL or not_applicable with rationale>
source_snapshot: <immutable URI, timestamp, checksum>
terms_snapshot: <immutable URI, timestamp, checksum>
attribution_text: <exact text or verified empty>
release_status: <not_applicable | verified | not_verified | required>
model_release_evidence: <URI or reason not applicable>
property_release_evidence: <URI or reason not applicable>
third_party_risk_review: <status, findings, evidence>
trademark_review: <status, findings, evidence>
decorative: <true | false>
alt_text: <visible verifiable description or empty>
original_sha256: <sha256>
source_dimensions: { width: <pixels>, height: <pixels> }
upscale_check: <passed | failed>
generated_disclosure: <internal label or not applicable>
generation_prompt: <complete prompt or not applicable>
negative_instructions: <complete list or not applicable>
generation_model: <provider, product, version or not applicable>
generation_terms_snapshot: <URI/checksum or not applicable>
original_output_sha256: <sha256 or not applicable>
generation_reviewer: <identity or not applicable>
evidence_artifacts: [<immutable artifact URIs>]
failure_or_block_reason: <specific reason or none>
retest_of: <record ID or none>
signoffs:
  - { role: image_producer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: rights_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Per-page record

```yaml
record_type: hero_page_qa
route: <exact route>
build_id: <immutable build>
asset_ids_and_checksums: [<ID:sha256>]
status: <PASS | FAIL | BLOCK>
desktop_preview: <URI, viewport, timestamp>
tablet_preview: <URI, viewport, timestamp>
mobile_preview: <URI, viewport, timestamp>
focal_point_desktop: { x: <0..1>, y: <0..1> }
focal_point_mobile: { x: <0..1>, y: <0..1> }
text_cta_clearance: <PASS/FAIL and overlay URI>
contrast_results: <WCAG 2.2 AA ratios by breakpoint/state>
poster_asset: <ID/checksum or not used>
reduced_motion_test: <prefers-reduced-motion: reduce evidence or not used>
reserved_aspect_ratio: <ratio/intrinsic dimensions>
CLS: <measured value and trace URI>
responsive_formats: [AVIF, WebP, <JPEG fallback or documented stack rationale>]
responsive_selection: <srcset/sizes/request trace URI>
preload: <winning above-fold request or none with reason>
LCP: <element, timing, environment, trace URI>
composition_mapping: <assigned variant>
variant_exception: <approval record or none>
regulated_claim_review: <PASS/FAIL, findings, evidence>
failure_or_block_reason: <specific reason or none>
retest_of: <record ID or none>
signoffs:
  - { role: assigning_editor, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: editorial_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: accessibility_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: compliance_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Location-set record

```yaml
record_type: hero_location_set_qa
release_set_id: <immutable ID>
member_routes_and_assets: [<route:asset ID:sha256>]
status: <PASS | FAIL | BLOCK>
city_signal_minimum: 3
state_signal_minimum: 2
maximum_skyline_count: 4
maximum_water_count: 3
minimum_lived_behavior_count: 4
observed_counts: { skyline: <n>, water: <n>, lived_behavior: <n> }
truth_to_source_evidence: <matrix URI>
exact_place_ladder_log: <case URI>
generic_fallback_check: <PASS/FAIL with findings>
local_recognition_review: <PASS/FAIL with named reviewer>
stereotype_review: <PASS/FAIL with contact sheet>
repetition_review: <PASS/FAIL with counts/contact sheet>
manual_editorial_result: <passed | failed>
failure_or_block_reason: <specific reason or none>
signoff: { role: editorial_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Family-set record

```yaml
record_type: hero_family_set_qa
release_set_id: <immutable ID>
member_routes_and_assets: [<route:asset ID:sha256>]
status: <PASS | FAIL | BLOCK>
cliche_audit: <PASS/FAIL with counts/contact sheet>
repetition_review: <PASS/FAIL across URL/creator/subject/action/crop/composition>
actual_loan_officer_asset_check: <PASS/FAIL/not applicable with evidence>
actual_branch_asset_check: <PASS/FAIL/not applicable with evidence>
company_internal_first_check: <PASS/FAIL/not applicable with evidence>
non_photo_search_check: <PASS/FAIL/not applicable with evidence>
rights_dispute_check: <PASS/BLOCK with evidence>
manual_editorial_result: <passed | failed>
failure_or_block_reason: <specific reason or none>
signoffs:
  - { role: editorial_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Protected-route regression record

```yaml
record_type: protected_route_regression
build_id: <immutable build>
status: <PASS | FAIL | BLOCK>
routes:
  - { route: /, baseline: <URI/hash>, release: <URI/hash>, result: <PASS | FAIL | BLOCK> }
  - { route: /locations, baseline: <URI/hash>, release: <URI/hash>, result: <PASS | FAIL | BLOCK> }
  - { route: /calculators, baseline: <URI/hash>, release: <URI/hash>, result: <PASS | FAIL | BLOCK> }
  - { route_pattern: /calculators/*, inventory: <URI>, baseline_set: <URI/hash>, release_set: <URI/hash>, result: <PASS | FAIL | BLOCK> }
  - { route: /rates, baseline: <URI/hash>, release: <URI/hash>, result: <PASS | FAIL | BLOCK> }
unchanged_baseline_evidence: <screenshots, DOM/style/request/accessibility comparisons>
failure_or_block_reason: <specific reason or none>
signoff: { role: design_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Release signoff record

```yaml
record_type: hero_release_signoff
release_id: <immutable ID>
build_id: <immutable build>
asset_record_ids: [<IDs>]
page_record_ids: [<IDs>]
set_record_ids: [<IDs>]
protected_regression_record_id: <ID>
overall_status: <PASS | FAIL | BLOCK>
publishing_status: <authorized | prohibited>
retest_history: [<superseded record IDs>]
signoffs:
  - { role: assigning_editor, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: image_producer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: editorial_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: rights_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: accessibility_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: compliance_reviewer, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: publisher, identity: <user ID and name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
final_preview: <route/build evidence URI>
decision_reason: <release or rejection rationale>
```

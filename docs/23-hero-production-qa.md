# Hero Production QA Gate

Date: 2026-07-21

Status: executable release gate for every in-scope hero asset, page, location set, and page-family set

Inputs: the approved hero specification, `docs/22-hero-sourcing-playbook.md`, both hero schemas, `mock-data/hero-asset-manifest.json`, and `docs/24-hero-locality-candidate-review.md` / `docs/25-hero-page-family-candidate-review.md`

Every mandatory check is a keyed `check_result`. Visual opinion, nomination, provider-level license summaries, or approval by silence cannot satisfy a check.

## Current release state

The manifest is version 1.3.0 and remains `draft`. The current state is honestly release-blocked:

- 16 locality pools contain 32 researched locality candidates and 10 nominations, but 0 acquired, 0 selected, 0 approved, and 0 authorized assets.
- The locality manual audit failed: skyline 9 against a maximum of 4, water 7 against a maximum of 3, and lived behavior 0 against a minimum of 4.
- 13 page-family pools contain 19 nominated external candidates, but 0 acquired, 0 rights-complete, 0 approved, and 0 authorized assets.
- The page-family audit is `failed` with `decision: no_selection`. Learning Center includes disputed rights; loan officer and branch assets are unresolved internal-only requirements; Company is internal-first; Search/directory needs a reviewed non-photographic treatment.
- All 29 hero entries remain `unselected`, `draft`, and publish-prohibited. This gate advances no lifecycle state.

Current release decision: `BLOCK`. Publishing status: `prohibited`.

## Status contract

Use exactly `PASS`, `FAIL`, or `BLOCK` per check:

- `PASS`: requirement met. `PASS` requires a nonempty `evidence_uris` array containing immutable evidence for that exact check.
- `FAIL`: evidence proves the requirement is not met. `FAIL` requires a nonempty `evidence_uris` array showing the observed failure.
- `BLOCK`: evidence, authority, prerequisite, or signoff is missing, disputed, expired, or unresolved. `BLOCK` requires a nonempty `block_reason`; include block-reason evidence in `evidence_uris` wherever available.

Missing or disputed evidence resolves to `BLOCK`. It never passes by omission. A condition that does not apply still uses `PASS` with evidence documenting why it does not apply; there is no fourth status.

Each record's `required_check_results` must contain every ID in the catalog below. Record overall status cannot be `PASS` unless every key in `required_check_results` is `PASS`. Publication cannot be authorized unless every key in `required_check_results` is `PASS` for the release and all referenced asset, page, set, and protected-route records. Missing keys are `BLOCK`.

### Universal check result

Copy this value for every key and replace every angle-bracket instruction:

```yaml check-result-template
check_result:
  check_id: <exact key from required_check_results>
  status: <PASS | FAIL | BLOCK>
  evidence_uris:
    - <immutable evidence URI; nonempty for PASS/FAIL and when block evidence exists>
  reviewer:
    user_id: <stable user ID>
    display_name: <reviewer name>
  checked_at: <ISO 8601 timestamp>
  notes: <what was inspected, method, environment, and decision>
  block_reason: <required nonempty when status BLOCK; otherwise omit>
```

The `reviewer` is the accountable person for the individual check. Role signoffs do not replace check-level identity, time, notes, or evidence.

### Machine-readable check catalog

This JSON is the normative mandatory-ID catalog. Templates and implementations must match it exactly.

```json qa-check-catalog
{
  "check_result": {
    "required_fields": ["check_id", "status", "evidence_uris", "reviewer", "checked_at", "notes"],
    "status_enum": ["PASS", "FAIL", "BLOCK"],
    "block_reason_required_when": "status=BLOCK",
    "evidence_nonempty_when": "status=PASS|FAIL"
  },
  "rules": {
    "missing_or_disputed_evidence_status": "BLOCK",
    "overall_pass_requires_every_required_check_pass": true,
    "authorize_requires_every_required_check_pass": true
  },
  "records": {
    "asset": { "required_check_ids": ["asset_provenance_identity", "asset_acquisition_actor", "asset_entitlement", "asset_allowed_use", "asset_modification_rights", "asset_geography_rights", "asset_advertising_rights", "asset_sharealike_change_notice", "asset_reverification", "asset_attribution_placement", "asset_people_minor_privacy", "asset_ownership_releases", "asset_endorsement_sensitive_use", "asset_third_party_trademark", "asset_alt_decorative", "asset_generated_job_timestamp", "asset_generated_input_rights", "asset_generated_untouched_output", "asset_generated_iteration_edits", "asset_generated_disclosure_reviewer", "asset_archive_source_integrity", "asset_derivative_integrity", "asset_no_upscale"] },
    "page": { "required_check_ids": ["page_responsive_crops_focal", "page_rendered_contrast", "page_zoom_reflow", "page_keyboard_focus", "page_screen_reader_alt", "page_cta_visibility_clearance", "page_motion_muted_nonessential", "page_reduced_motion_poster", "page_data_saving_failure_poster", "page_derivative_integrity", "page_no_upscale", "page_hero_cls", "page_route_cls", "page_viewport_preload_winner", "page_nonwinner_preload", "page_lcp", "page_subject_relevance", "page_attribution_placement", "page_composition", "page_regulated_claims"] },
    "location_set": { "required_check_ids": ["location_signal_thresholds", "location_truth_to_source", "location_exact_place_ladder", "location_no_generic_fallback", "location_local_recognition", "location_stereotype_audit", "location_repetition_audit", "location_manual_audit"] },
    "family_set": { "required_check_ids": ["family_cliche_audit", "family_repetition_audit", "family_actual_loan_officer", "family_actual_branch", "family_company_internal_first", "family_nonphoto_search", "family_rights_disputes", "family_manual_audit"] },
    "protected_route": { "required_check_ids": ["protected_route_inventory", "protected_route_visual_baselines", "protected_route_dom_style_assets", "protected_route_accessibility_requests", "protected_route_no_governed_hero"] },
    "release": { "required_check_ids": ["release_asset_records", "release_page_records", "release_set_records", "release_protected_regression", "release_required_signoffs", "release_cms_state", "release_preview_match"] }
  }
}
```

## Evidence artifacts

Evidence URIs must resolve to immutable case artifacts and identify checksum when file-backed, capture timestamp, actor, environment/viewport, and the check ID supported. Bare URLs, mutable chat, and inherited evidence without an explicit link do not pass.

- Asset case: exact acquired original; source and controlling terms snapshots; creator, acquisition actor, entitlement/receipt, use permissions/restrictions, releases, reverify date, archive record, and responsive derivatives.
- Generation case: complete prompt/negative instructions/model/terms, generated timestamp and job/seed, every input and its rights, untouched output, iterations, edits, disclosure, output checksum, and independent reviewer.
- Page case: exact build/route/asset checksums, desktop/tablet/mobile crops, focal points, rendered accessibility results, motion/poster paths, responsive delivery, CLS, request waterfall, preload winner/nonwinners, and LCP trace.
- Set case: route/contact-sheet inventory, signal and motif counts, truth sources, exact-place ladder logs, stereotype/cliche/repetition findings, and signed manual audit.
- Protected case: route inventory and before/after visual, DOM/style/asset, accessibility, and network evidence.
- Release ledger: referenced record IDs, exceptions, retests, named signoffs, final preview/build, and publish/reject event.

## Asset-level gate

Complete every asset ID for each still, mobile alternate, motion file, poster, collage component, internal asset, and generated output:

- [ ] `asset_provenance_identity`: asset ID/origin, source URL or internal ownership trail, creator/agency, original filename, and exact bytes agree.
- [ ] `asset_acquisition_actor`: named acquisition actor and acquisition timestamp/date are evidenced.
- [ ] `asset_entitlement`: exact license product/account, receipt/subscription entitlement, source/terms snapshots, and rights chain are evidenced.
- [ ] `asset_allowed_use`: commercial mortgage-site hero use, routes, CDN/web distribution, overlays, crops, compression, and promotions are allowed.
- [ ] `asset_modification_rights`, `asset_geography_rights`, `asset_advertising_rights`, `asset_sharealike_change_notice`, and `asset_reverification`: each condition is separately evidenced, including attribution/link/change/ShareAlike obligations and time limits.
- [ ] `asset_attribution_placement`: exact attribution is rendered in the required location and format.
- [ ] `asset_people_minor_privacy`: every recognizable person, minor/guardian authority, privacy/publicity, sensitive-use context, and personal data are resolved.
- [ ] `asset_ownership_releases`: model/property/likeness/commissioned/internal ownership evidence is complete.
- [ ] `asset_endorsement_sensitive_use`: no person, brand, property, business, or government endorsement/customer/financial circumstance is implied.
- [ ] `asset_third_party_trademark`: marks, logos, artwork, architecture, signage, vehicles, screens, interiors, and third-party rights are resolved.
- [ ] `asset_alt_decorative`: meaningful alt is visible/verifiable/nonrepetitive, or decorative state and empty alt are evidenced.
- [ ] Generated IDs evidence job and timestamp; every input right; untouched original output; iteration and edit history; internal disclosure and independent reviewer. Generated media cannot invent documentary claims or real-person likenesses.
- [ ] `asset_archive_source_integrity`: archive/source checksum, dimensions, format, color profile, and URI match the reviewed master.
- [ ] `asset_derivative_integrity`: every derivative records checksum, width, height, format, bytes, settings, and source master.
- [ ] `asset_no_upscale`: each derivative/crop fits within native source pixels. Any upscale is `FAIL`.

Disputed rights, unresolved releases, missing entitlement, or missing generated provenance are `BLOCK`.

## Page-level gate

Run every page ID on the exact final route/build:

- [ ] `page_responsive_crops_focal`: desktop at 1440 px/560â€“720 px hero, every tablet breakpoint, mobile 4:5 or approved portrait ratio, focal points, faces, local cues, text separation, and CTA visibility are evidenced.
- [ ] `page_rendered_contrast`: measured WCAG 2.2 AA results cover every crop, state, contrast mode, and worst motion frame.
- [ ] `page_zoom_reflow`, `page_keyboard_focus`, and `page_screen_reader_alt`: rendered 200%/400% behavior, reflow, focus order/visibility, accessible names, decorative output, and alt results pass.
- [ ] `page_cta_visibility_clearance`: headline/dek/actions remain visible and clear of faces, focal subjects, cues, and one another at all viewports.
- [ ] `page_motion_muted_nonessential`: motion is muted, nonessential, separately rights-cleared, and cannot delay the usable hero.
- [ ] `page_reduced_motion_poster`: `poster_asset` is truthful and readable; `prefers-reduced-motion: reduce` prevents animation start and displays it.
- [ ] `page_data_saving_failure_poster`: poster-before-load, data-saving, disabled-motion, load-failure, and playback-failure paths pass.
- [ ] `page_derivative_integrity`: selected AVIF/WebP and JPEG fallback where required record dimensions, bytes, checksum, format, crop, and actual request.
- [ ] `page_no_upscale`: the delivered crop/derivative is not upscaled.
- [ ] `page_hero_cls` and `page_route_cls`: reserved aspect ratio/intrinsic dimensions and measured hero-specific/whole-route CLS traces pass.
- [ ] `page_viewport_preload_winner`: only the current viewport winner receives above-fold preload/high priority.
- [ ] `page_nonwinner_preload`: alternates, nonmatching sources, poster/motion, and nonwinning candidates are not eagerly preloaded.
- [ ] `page_lcp`: hero LCP element, timing, environment, waterfall, selected candidate, and budget/result are recorded.
- [ ] `page_subject_relevance`: subject is uniquely relevant and direct documentary meaning survives crops.
- [ ] `page_attribution_placement`: rendered attribution matches asset obligations.
- [ ] `page_composition`: assigned variant is used or a complete named/timestamped `variant_exception` is evidenced.
- [ ] `page_regulated_claims`: image/context do not imply approval, eligibility, rates, savings, wealth, protected-class targeting, customer status, endorsement, or borrower outcome.

## Location-set gate

```yaml
city_signal_minimum: 3
state_signal_minimum: 2
maximum_skyline_count: 4
maximum_water_count: 3
minimum_lived_behavior_count: 4
```

- [ ] `location_signal_thresholds`: cities have three distinct visible signal types; states have two and represent more than one narrow stereotype.
- [ ] `location_truth_to_source`: every counted cue/geography claim maps to an authoritative truth source and visible pixels.
- [ ] `location_exact_place_ladder`: logs prove exact place, verified subregion, commissioned/generated, then non-photographic/hold order with rejections.
- [ ] `location_no_generic_fallback`: no silent generic suburb, skyline, landscape, or stock substitute. Generic fallback is `BLOCK`.
- [ ] `location_local_recognition`: named review confirms ordinary resident-recognizable place truth and lived behavior.
- [ ] `location_stereotype_audit`: avoid lists, state diversity, tourism/landmark dominance, tokenism, and season/weather pass.
- [ ] `location_repetition_audit`: skyline, water, lived behavior, architecture, creator, subject, crop, and composition counts/contact sheet pass.
- [ ] `location_manual_audit`: signed manual editorial result passes. Numeric success cannot override manual failure.

If `manual_editorial_result: failed`, the set and every member remain `BLOCK`; no selection or authorization is permitted.

## Family-set gate

- [ ] `family_cliche_audit`: key handoff, cash, handshake, generic laptop/boardroom/house, staged celebration, certainty keys, and moving-box-only storytelling are audited.
- [ ] `family_repetition_audit`: URL, creator, people/casting, action, property, paperwork, crop, color, and composition are compared together.
- [ ] `family_actual_loan_officer`: actual current approved named portrait; stock/generated substitutes fail.
- [ ] `family_actual_branch`: actual verified current branch/immediate operating context; stock/generated substitutes fail.
- [ ] `family_company_internal_first`: actual Snap people/operations or a signed exception after internal commissioning is exhausted.
- [ ] `family_nonphoto_search`: accessible structured search/planning composition with truthful data and no decorative stock.
- [ ] `family_rights_disputes`: every component is clear; disputed marks/data/license/public-domain assertions are `BLOCK`.
- [ ] `family_manual_audit`: signed full-set audit passes. Zero cliches/duplicates cannot override a failed audit.

## Protected-route regression gate

The system must leave unchanged:

- Homepage (`/`).
- Locations directory (`/locations`).
- Calculator directory (`/calculators`).
- Individual calculators (`/calculators/*`).
- Rates (`/rates`).

- [ ] `protected_route_inventory`: all exact protected routes, including every calculator, are inventoried.
- [ ] `protected_route_visual_baselines`: before/after desktop/tablet/mobile screenshots match, with accepted noise recorded.
- [ ] `protected_route_dom_style_assets`: hero DOM, content, styles, interactions, and asset/build hashes remain unchanged.
- [ ] `protected_route_accessibility_requests`: accessibility tree/behavior and network/preload requests remain unchanged.
- [ ] `protected_route_no_governed_hero`: no protected route imports, resolves, preloads, or publishes governed hero configuration/assets.

Unexplained change is `FAIL`; missing route or baseline evidence is `BLOCK`.

## Retest and reopen rules

1. `FAIL` returns to the owning production step; retest the failed check and every dependent page/set/regression check on a new build.
2. `BLOCK` remains publish-prohibited until resolved; the resolver cannot self-approve a role requiring independence.
3. New checksum, replacement, export/crop/focal change, text/CTA/layout/contrast change, loader/format change, motion/poster change, or composition change reopens affected and downstream checks.
4. Rights complaint/dispute, source/terms change, new use, mistaken location/identity, expired permission, or withdrawn release immediately reopens rights/compliance and requires unpublish/retirement.
5. Set membership changes reopen the member and full set. Protected implementation changes reopen all protected checks.
6. Retest records retain prior ID, reason, changed asset/build/checksum, IDs rerun, reviewer, timestamp, decision, and superseding record. Never overwrite evidence.

## Publish gate

- [ ] `release_asset_records`: every referenced asset record exists, is acquired/rights-complete/checksum-matched/current, and all required checks pass.
- [ ] `release_page_records`: every final-build route record exists and all required checks pass.
- [ ] `release_set_records`: applicable location/family records exist, every check passes, and manual results are `passed`.
- [ ] `release_protected_regression`: same-build protected record exists and every check passes.
- [ ] `release_required_signoffs`: named editorial, rights, design, accessibility, compliance, assigning editor, image producer, and publisher decisions are present.
- [ ] `release_cms_state`: CMS is `approved` with `reviewed_at`/`reviewed_by`; referenced IDs/evidence agree.
- [ ] `release_preview_match`: final preview/build asset IDs, checksums, crops, attribution, and delivery match approved records.

Any non-`PASS` required result makes `overall_status` `FAIL` or `BLOCK` and keeps `publishing_status: prohibited`. Direct-to-production delivery is forbidden.

## Copyable QA records

Each `<check_result>` below means a complete copy of the universal shape, with `check_id` equal to its map key.

### Per-asset record

```yaml hero-asset-record
record_type: hero_asset_qa
asset_id: <immutable ID>
asset_origin: <stock | commissioned | internal | generated>
overall_status: <PASS | FAIL | BLOCK>
required_check_results:
  asset_provenance_identity: <check_result>
  asset_acquisition_actor: <check_result>
  asset_entitlement: <check_result>
  asset_allowed_use: <check_result>
  asset_modification_rights: <check_result>
  asset_geography_rights: <check_result>
  asset_advertising_rights: <check_result>
  asset_sharealike_change_notice: <check_result>
  asset_reverification: <check_result>
  asset_attribution_placement: <check_result>
  asset_people_minor_privacy: <check_result>
  asset_ownership_releases: <check_result>
  asset_endorsement_sensitive_use: <check_result>
  asset_third_party_trademark: <check_result>
  asset_alt_decorative: <check_result>
  asset_generated_job_timestamp: <check_result>
  asset_generated_input_rights: <check_result>
  asset_generated_untouched_output: <check_result>
  asset_generated_iteration_edits: <check_result>
  asset_generated_disclosure_reviewer: <check_result>
  asset_archive_source_integrity: <check_result>
  asset_derivative_integrity: <check_result>
  asset_no_upscale: <check_result>
signoffs:
  - { role: image_producer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: rights_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Per-page record

```yaml hero-page-record
record_type: hero_page_qa
route: <exact route>
build_id: <immutable build>
asset_ids_and_checksums: [<ID:sha256>]
overall_status: <PASS | FAIL | BLOCK>
required_check_results:
  page_responsive_crops_focal: <check_result>
  page_rendered_contrast: <check_result>
  page_zoom_reflow: <check_result>
  page_keyboard_focus: <check_result>
  page_screen_reader_alt: <check_result>
  page_cta_visibility_clearance: <check_result>
  page_motion_muted_nonessential: <check_result>
  page_reduced_motion_poster: <check_result>
  page_data_saving_failure_poster: <check_result>
  page_derivative_integrity: <check_result>
  page_no_upscale: <check_result>
  page_hero_cls: <check_result>
  page_route_cls: <check_result>
  page_viewport_preload_winner: <check_result>
  page_nonwinner_preload: <check_result>
  page_lcp: <check_result>
  page_subject_relevance: <check_result>
  page_attribution_placement: <check_result>
  page_composition: <check_result>
  page_regulated_claims: <check_result>
signoffs:
  - { role: assigning_editor, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: editorial_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: accessibility_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: compliance_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Location-set record

```yaml location-set-record
record_type: hero_location_set_qa
release_set_id: <immutable ID>
member_routes_and_assets: [<route:asset ID:sha256>]
overall_status: <PASS | FAIL | BLOCK>
required_check_results:
  location_signal_thresholds: <check_result>
  location_truth_to_source: <check_result>
  location_exact_place_ladder: <check_result>
  location_no_generic_fallback: <check_result>
  location_local_recognition: <check_result>
  location_stereotype_audit: <check_result>
  location_repetition_audit: <check_result>
  location_manual_audit: <check_result>
signoff: { role: editorial_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Family-set record

```yaml family-set-record
record_type: hero_family_set_qa
release_set_id: <immutable ID>
member_routes_and_assets: [<route:asset ID:sha256>]
overall_status: <PASS | FAIL | BLOCK>
required_check_results:
  family_cliche_audit: <check_result>
  family_repetition_audit: <check_result>
  family_actual_loan_officer: <check_result>
  family_actual_branch: <check_result>
  family_company_internal_first: <check_result>
  family_nonphoto_search: <check_result>
  family_rights_disputes: <check_result>
  family_manual_audit: <check_result>
signoffs:
  - { role: editorial_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Protected-route regression record

```yaml protected-route-record
record_type: protected_route_regression
build_id: <immutable build>
routes: [/, /locations, /calculators, /calculators/*, /rates]
overall_status: <PASS | FAIL | BLOCK>
required_check_results:
  protected_route_inventory: <check_result>
  protected_route_visual_baselines: <check_result>
  protected_route_dom_style_assets: <check_result>
  protected_route_accessibility_requests: <check_result>
  protected_route_no_governed_hero: <check_result>
signoff: { role: design_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

### Release signoff record

```yaml release-record
record_type: hero_release_signoff
release_id: <immutable ID>
build_id: <immutable build>
referenced_record_ids: [<asset/page/set/protected IDs>]
overall_status: <PASS | FAIL | BLOCK>
publishing_status: <authorized | prohibited>
required_check_results:
  release_asset_records: <check_result>
  release_page_records: <check_result>
  release_set_records: <check_result>
  release_protected_regression: <check_result>
  release_required_signoffs: <check_result>
  release_cms_state: <check_result>
  release_preview_match: <check_result>
signoffs:
  - { role: assigning_editor, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: image_producer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: editorial_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: rights_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: design_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: accessibility_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: compliance_reviewer, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
  - { role: publisher, identity: <user ID/name>, decision: <approved | rejected>, timestamp: <ISO 8601>, notes: <notes> }
```

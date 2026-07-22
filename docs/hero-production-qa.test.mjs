import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const qa = await readFile(new URL("./23-hero-production-qa.md", import.meta.url), "utf8");

function fencedBlock(label) {
  const match = qa.match(new RegExp("```" + label + "\\n([\\s\\S]*?)\\n```"));
  assert.ok(match, `missing fenced block: ${label}`);
  return match[1];
}

const expected = {
  asset: ["asset_provenance_identity", "asset_acquisition_actor", "asset_entitlement", "asset_allowed_use", "asset_modification_rights", "asset_geography_rights", "asset_advertising_rights", "asset_sharealike_change_notice", "asset_reverification", "asset_attribution_placement", "asset_people_minor_privacy", "asset_ownership_releases", "asset_endorsement_sensitive_use", "asset_third_party_trademark", "asset_alt_decorative", "asset_generated_job_timestamp", "asset_generated_input_rights", "asset_generated_untouched_output", "asset_generated_iteration_edits", "asset_generated_disclosure_reviewer", "asset_archive_source_integrity", "asset_derivative_integrity", "asset_no_upscale"],
  page: ["page_responsive_crops_focal", "page_rendered_contrast", "page_zoom_reflow", "page_keyboard_focus", "page_screen_reader_alt", "page_cta_visibility_clearance", "page_motion_muted_nonessential", "page_reduced_motion_poster", "page_data_saving_failure_poster", "page_derivative_integrity", "page_no_upscale", "page_hero_cls", "page_route_cls", "page_viewport_preload_winner", "page_nonwinner_preload", "page_lcp", "page_subject_relevance", "page_attribution_placement", "page_composition", "page_regulated_claims"],
  location_set: ["location_signal_thresholds", "location_truth_to_source", "location_exact_place_ladder", "location_no_generic_fallback", "location_local_recognition", "location_stereotype_audit", "location_repetition_audit", "location_manual_audit"],
  family_set: ["family_cliche_audit", "family_repetition_audit", "family_actual_loan_officer", "family_actual_branch", "family_company_internal_first", "family_nonphoto_search", "family_rights_disputes", "family_manual_audit"],
  protected_route: ["protected_route_inventory", "protected_route_visual_baselines", "protected_route_dom_style_assets", "protected_route_accessibility_requests", "protected_route_no_governed_hero"],
  release: ["release_asset_records", "release_page_records", "release_set_records", "release_protected_regression", "release_required_signoffs", "release_cms_state", "release_preview_match"],
};

test("publishes a machine-readable universal check contract", () => {
  const catalog = JSON.parse(fencedBlock("json qa-check-catalog"));
  assert.deepEqual(catalog.check_result.required_fields, ["check_id", "status", "evidence_uris", "reviewer", "checked_at", "notes"]);
  assert.deepEqual(catalog.check_result.status_enum, ["PASS", "FAIL", "BLOCK"]);
  assert.equal(catalog.check_result.block_reason_required_when, "status=BLOCK");
  assert.equal(catalog.check_result.evidence_nonempty_when, "status=PASS|FAIL");
  assert.equal(catalog.rules.missing_or_disputed_evidence_status, "BLOCK");
  assert.equal(catalog.rules.overall_pass_requires_every_required_check_pass, true);
  assert.equal(catalog.rules.authorize_requires_every_required_check_pass, true);
  for (const [record, ids] of Object.entries(expected)) {
    assert.deepEqual(catalog.records[record].required_check_ids, ids, record);
  }
});

test("makes the copyable check_result shape complete", () => {
  const block = fencedBlock("yaml check-result-template");
  for (const field of ["check_id:", "status: <PASS | FAIL | BLOCK>", "evidence_uris:", "reviewer:", "user_id:", "display_name:", "checked_at:", "notes:", "block_reason:"]) {
    assert.ok(block.includes(field), field);
  }
  assert.match(block, /checked_at: <ISO 8601 timestamp>/);
});

test("every copyable record keys every mandatory check ID", () => {
  const labels = { asset: "hero-asset-record", page: "hero-page-record", location_set: "location-set-record", family_set: "family-set-record", protected_route: "protected-route-record", release: "release-record" };
  for (const [record, label] of Object.entries(labels)) {
    const block = fencedBlock(`yaml ${label}`);
    const section = block.match(/required_check_results:\n([\s\S]*?)(?:\n\S|$)/)?.[1] ?? "";
    const ids = [...section.matchAll(/^  ([a-z0-9_]+): <check_result>$/gm)].map((match) => match[1]);
    assert.deepEqual(ids, expected[record], record);
  }
});

test("defines BLOCK and publish dependency semantics", () => {
  assert.match(qa, /Missing or disputed evidence resolves to `BLOCK`/);
  assert.match(qa, /`PASS` requires a nonempty `evidence_uris`/);
  assert.match(qa, /`FAIL` requires a nonempty `evidence_uris`/);
  assert.match(qa, /`BLOCK` requires a nonempty `block_reason`/);
  assert.match(qa, /overall status cannot be `PASS` unless every key in `required_check_results` is `PASS`/i);
  assert.match(qa, /publication cannot be authorized unless every key in `required_check_results` is `PASS`/i);
});

test("preserves the protected list and honest blocked state", () => {
  ["Homepage (`/`)", "Locations directory (`/locations`)", "Calculator directory (`/calculators`)", "Individual calculators (`/calculators/*`)", "Rates (`/rates`)"].forEach((route) => assert.ok(qa.includes(route), route));
  [/16 locality pools/i, /32 researched locality candidates/i, /10 nominations/i, /13 page-family pools/i, /19 nominated external candidates/i, /0 acquired/i, /0 selected/i, /0 approved/i, /0 authorized/i].forEach((pattern) => assert.match(qa, pattern));
  assert.match(qa, /Current release decision: `BLOCK`/);
});

test("retains WCAG, motion, performance, audit, and signoff gates", () => {
  ["WCAG 2.2 AA", "prefers-reduced-motion: reduce", "poster_asset", "AVIF", "WebP", "JPEG", "CLS", "LCP", "maximum_skyline_count: 4", "maximum_water_count: 3", "minimum_lived_behavior_count: 4", "assigning_editor", "image_producer", "editorial_reviewer", "rights_reviewer", "design_reviewer", "accessibility_reviewer", "compliance_reviewer", "publisher"].forEach((term) => assert.ok(qa.includes(term), term));
});

test("ships without unfinished placeholders", () => {
  assert.doesNotMatch(qa, /\b(?:TODO|TBD)\b/i);
});

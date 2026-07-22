import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const qa = await readFile(new URL("./23-hero-production-qa.md", import.meta.url), "utf8").catch(() => "");

test("contains every executable gate and copyable record", () => {
  ["# Hero Production QA Gate", "## Current release state", "## Status contract", "## Evidence artifacts", "## Asset-level gate", "## Page-level gate", "## Location-set gate", "## Family-set gate", "## Protected-route regression gate", "## Retest and reopen rules", "## Publish gate", "## Copyable QA records", "### Per-asset record", "### Per-page record", "### Location-set record", "### Family-set record", "### Protected-route regression record", "### Release signoff record"].forEach((section) => assert.ok(qa.includes(section), section));
  assert.match(qa, /- \[ \]/);
});

test("defines exact statuses and hard publication blocks", () => {
  ["`PASS`", "`FAIL`", "`BLOCK`"].forEach((status) => assert.ok(qa.includes(status), status));
  assert.match(qa, /overall_status.*BLOCK/i);
  assert.match(qa, /publishing_status.*prohibited/i);
  assert.match(qa, /missing required signoff.*BLOCK/i);
  assert.match(qa, /disputed rights.*BLOCK/i);
  assert.match(qa, /failed (?:manual )?(?:set )?audit.*BLOCK/i);
  assert.match(qa, /only `PASS` permits publication/i);
});

test("requires complete asset and generated-media evidence", () => {
  ["asset_id", "asset_origin", "source_url", "creator_or_agency", "rights_basis_type", "rights_basis_name", "license_url", "source_snapshot", "terms_snapshot", "acquired_at", "attribution_text", "release_status", "model_release_evidence", "property_release_evidence", "third_party_risk_review", "trademark_review", "decorative", "alt_text", "original_sha256", "source_dimensions", "upscale_check", "generated_disclosure", "generation_prompt", "negative_instructions", "generation_model", "generation_terms_snapshot", "original_output_sha256", "generation_reviewer"].forEach((field) => assert.ok(qa.includes(field), field));
  assert.match(qa, /exact.*rights basis/i);
  assert.match(qa, /no upscale/i);
});

test("covers responsive, accessibility, motion, and performance evidence", () => {
  ["desktop_preview", "tablet_preview", "mobile_preview", "focal_point_desktop", "focal_point_mobile", "text_cta_clearance", "WCAG 2.2 AA", "prefers-reduced-motion: reduce", "poster_asset", "reserved_aspect_ratio", "CLS", "AVIF", "WebP", "JPEG", "srcset", "sizes", "preload", "LCP", "regulated_claim_review", "variant_exception"].forEach((term) => assert.ok(qa.includes(term), term));
});

test("makes locality and family audit failures release-blocking", () => {
  ["maximum_skyline_count: 4", "maximum_water_count: 3", "minimum_lived_behavior_count: 4", "city_signal_minimum: 3", "state_signal_minimum: 2", "truth_to_source_evidence", "exact_place_ladder_log", "generic_fallback_check", "local_recognition_review", "stereotype_review", "repetition_review", "actual_loan_officer_asset_check", "actual_branch_asset_check", "company_internal_first_check", "non_photo_search_check"].forEach((term) => assert.ok(qa.includes(term), term));
  assert.match(qa, /generic fallback.*BLOCK/i);
  assert.match(qa, /manual_editorial_result.*failed.*BLOCK/is);
});

test("lists every protected route", () => {
  ["Homepage (`/`)", "Locations directory (`/locations`)", "Calculator directory (`/calculators`)", "Individual calculators (`/calculators/*`)", "Rates (`/rates`)"].forEach((route) => assert.ok(qa.includes(route), route));
  assert.match(qa, /unchanged baseline evidence/i);
});

test("requires exact named roles and auditable signoffs", () => {
  ["assigning_editor", "image_producer", "editorial_reviewer", "rights_reviewer", "design_reviewer", "accessibility_reviewer", "compliance_reviewer", "publisher"].forEach((role) => assert.ok(qa.includes(`role: ${role}`), role));
  ["identity:", "decision:", "timestamp:", "notes:"].forEach((field) => assert.ok(qa.includes(field), field));
  assert.match(qa, /approval by silence is not approval/i);
});

test("defines reopen and retest triggers", () => {
  assert.match(qa, /new checksum/i);
  assert.match(qa, /crop.*change/i);
  assert.match(qa, /rights complaint|rights dispute/i);
  assert.match(qa, /expired|withdrawn release/i);
  assert.match(qa, /reopen/i);
  assert.match(qa, /retest/i);
});

test("states the unresolved candidate truth", () => {
  [/16 locality pools/i, /32 researched locality candidates/i, /10 nominations/i, /13 page-family pools/i, /19 nominated external candidates/i, /0 acquired/i, /0 selected/i, /0 approved/i, /0 authorized/i].forEach((pattern) => assert.match(qa, pattern));
});

test("ships without unfinished placeholders", () => {
  assert.doesNotMatch(qa, /\b(?:TODO|TBD)\b/i);
});

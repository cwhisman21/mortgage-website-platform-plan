import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const playbook = await readFile(
  new URL("./22-hero-sourcing-playbook.md", import.meta.url),
  "utf8",
);

const requiredSections = [
  "# Hero Sourcing Playbook",
  "## Scope and publication gate",
  "## Roles and required signoffs",
  "## The executable workflow",
  "## Source-specific rights notes",
  "## Operator templates",
  "## Rejection criteria",
  "## Worked example: hypothetical city candidate",
  "## Worked example: hypothetical generated fallback",
];

test("contains every operational section", () => {
  requiredSections.forEach((section) => assert.ok(playbook.includes(section), section));
});

test("makes the assigning-editor and producer signoffs copyable and auditable", () => {
  assert.match(
    playbook,
    /intake_accepted_signoff:\s+role: assigning_editor\s+identity: <user reference>\s+decision: intake_accepted\s+timestamp: <ISO 8601 timestamp>\s+notes: <decision notes>/,
  );
  assert.match(
    playbook,
    /production_package_complete_signoff:\s+role: image_producer\s+identity: <user reference>\s+decision: production_package_complete\s+timestamp: <ISO 8601 timestamp>\s+notes: <decision notes>/,
  );
});

test("puts the locality decision ladder in the approved order", () => {
  const ladder = [
    "Exact geography",
    "Verified metro, county, or subregion",
    "Commissioned or generated locality-specific original",
    "Approved non-photographic local data treatment or hold publication",
  ];
  const offsets = ladder.map((item) => playbook.indexOf(item));
  offsets.forEach((offset, index) => assert.ok(offset >= 0, ladder[index]));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  assert.match(playbook, /stop at the first acceptable tier/i);
});

test("preserves protected route exclusions", () => {
  [
    "Homepage (`/`)",
    "Locations directory (`/locations`)",
    "Calculator directory (`/calculators`)",
    "Individual calculator pages (`/calculators/*`)",
    "Rates page (`/rates`)",
  ].forEach((route) => assert.ok(playbook.includes(route), route));
  assert.match(playbook, /must not be redesigned or replaced/i);
});

test("requires per-asset provenance, licensing, and release fields", () => {
  [
    "asset_id",
    "asset_origin",
    "source_url",
    "creator_or_agency",
    "license_name",
    "license_url",
    "acquired_at",
    "attribution_text",
    "usage_notes",
    "release_status",
    "reverify_at",
  ].forEach((field) => assert.ok(playbook.includes(`\`${field}\``), field));
  assert.match(playbook, /each individual asset.*verification at acquisition/i);
  assert.match(playbook, /not all government media/i);
});

test("states the documentary and generation safeguards", () => {
  [
    "identifiable landmarks",
    "business signage",
    "public events",
    "disasters",
    "documentary claims",
    "generation_prompt",
    "generation_model",
    "generation_reviewer",
  ].forEach((term) => assert.ok(playbook.includes(term), term));
  assert.match(playbook, /must not generate.*loan officer/i);
  assert.match(playbook, /generated.*must not be presented as documentary/i);
});

test("covers crop, delivery, motion, and CMS safeguards", () => {
  ["AVIF", "WebP", "JPEG fallback", "Do not upscale", "focal_point_desktop", "focal_point_mobile", "poster_asset", "prefers-reduced-motion: reduce"].forEach(
    (term) => assert.ok(playbook.includes(term), term),
  );
  const states = ["draft", "editorial_review", "rights_review", "approved", "retired"];
  const stateOffsets = states.map((state) => playbook.indexOf(`\`${state}\``));
  assert.deepEqual(stateOffsets, [...stateOffsets].sort((a, b) => a - b));
  assert.match(playbook, /publication remains prohibited/i);
});

test("ships without unfinished placeholders", () => {
  assert.doesNotMatch(playbook, /\b(?:TBD|TODO)\b/i);
});

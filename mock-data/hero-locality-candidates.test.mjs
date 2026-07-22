import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("./hero-asset-manifest.json", import.meta.url), "utf8"),
);
const manifestSchema = JSON.parse(
  await readFile(
    new URL("../schemas/hero-asset-manifest.schema.json", import.meta.url),
    "utf8",
  ),
);
const heroSchema = JSON.parse(
  await readFile(new URL("../schemas/hero-image.schema.json", import.meta.url), "utf8"),
);
const review = await readFile(
  new URL("../docs/24-hero-locality-candidate-review.md", import.meta.url),
  "utf8",
);

const protectedRoutes = new Set(["/", "/locations", "/calculators", "/rates"]);
const localityEntries = manifest.entries.filter(
  ({ coverage_kind, hero }) =>
    coverage_kind === "prototype_route" && ["city", "state"].includes(hero.page_type),
);
const candidatePools = manifest.locality_candidate_pools ?? [];
const poolByRoute = new Map(candidatePools.map((pool) => [pool.route, pool]));
const allCandidates = candidatePools.flatMap(({ route, candidates }) =>
  candidates.map((candidate) => ({
    route,
    pageType: localityEntries.find((entry) => entry.route === route)?.hero.page_type,
    ...candidate,
  })),
);
const candidatesById = new Map(allCandidates.map((candidate) => [candidate.candidate_id, candidate]));

const requiredEditoriallyIneligibleIds = [
  "boulder-chautauqua-flatirons-scudder",
  "california-big-sur-coast-norton",
  "california-desert-landscape-brovell",
  "colorado-rmnp-longs-peak-mcleod",
  "colorado-rmnp-trail-ridge-sbmeaper1",
  "florida-everglades-dronepicr",
  "irvine-great-park-downtowngal",
  "irvine-william-mason-park-salatas",
  "texas-big-bend-rio-grande-adbar",
  "texas-hill-country-rutledge",
];

function assertPoolLifecycle(pool) {
  const selected = pool.candidates.filter(
    ({ candidate_disposition }) => candidate_disposition === "selected",
  );
  if (selected.length === 0) {
    assert.equal(pool.selection_outcome, "unresolved", pool.route);
    assert.equal("selected_candidate_id" in pool, false, pool.route);
    return;
  }
  assert.equal(selected.length, 1, pool.route);
  assert.equal(pool.selection_outcome, "candidate_selected", pool.route);
  assert.equal(pool.selected_candidate_id, selected[0].candidate_id, pool.route);
}

test("covers every prototype locality with two researched candidates", () => {
  assert.equal(localityEntries.length, 16);
  assert.equal(candidatePools.length, 16);
  localityEntries.forEach(({ route }) => {
    const pool = poolByRoute.get(route);
    assert.ok(pool, `${route}: candidate pool`);
    assert.ok(pool.candidates.length >= 2, `${route}: candidates`);
  });
  assert.equal(allCandidates.length, 32);
});

test("keeps source identity and attribution labels without pretending a complete derivative recipe", () => {
  const assetPageUrls = allCandidates.map(({ asset_page_url }) => asset_page_url);
  assert.equal(new Set(assetPageUrls).size, assetPageUrls.length);
  allCandidates.forEach((candidate) => {
    [
      "candidate_id",
      "repository_asset_id",
      "asset_page_url",
      "source_repository",
      "creator_or_agency",
      "license_name",
      "license_url",
      "attribution_label",
      "source_accessed_at",
      "source_dimensions",
    ].forEach((field) => assert.ok(candidate[field], `${candidate.route}:${field}`));
    assert.equal("required_attribution" in candidate, false, candidate.candidate_id);
    assert.match(candidate.asset_page_url, /^https:\/\//);
    assert.match(candidate.license_url, /^https:\/\//);
    assert.match(candidate.source_accessed_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.doesNotMatch(
      candidate.asset_page_url,
      /Special:MediaSearch|\/wiki\/(?:Main_Page|Category:)/,
    );
  });
});

test("separates rights eligibility from editorial locality eligibility", () => {
  allCandidates.forEach((candidate) => {
    assert.ok(
      ["eligible_for_rights_review", "blocked_pending_clearance"].includes(
        candidate.rights_eligibility,
      ),
      `${candidate.candidate_id}: rights_eligibility`,
    );
    assert.ok(
      ["eligible_for_nomination", "ineligible"].includes(
        candidate.editorial_locality_eligibility,
      ),
      `${candidate.candidate_id}: editorial_locality_eligibility`,
    );
    if (["not_verified", "required"].includes(candidate.release_status)) {
      assert.equal(candidate.rights_eligibility, "blocked_pending_clearance");
      assert.equal(candidate.candidate_disposition, "blocked");
    }
    if (candidate.editorial_locality_eligibility === "ineligible") {
      assert.ok(candidate.editorial_locality_ineligibility_reasons?.length);
      assert.notEqual(candidate.candidate_disposition, "nominated");
      assert.notEqual(candidate.candidate_disposition, "selected");
    } else {
      assert.equal("editorial_locality_ineligibility_reasons" in candidate, false);
    }
  });
  const actualIneligible = allCandidates
    .filter(({ editorial_locality_eligibility }) => editorial_locality_eligibility === "ineligible")
    .map(({ candidate_id }) => candidate_id)
    .sort();
  assert.deepEqual(actualIneligible, requiredEditoriallyIneligibleIds);
});

test("enforces signal counts and eligible city/state thresholds structurally", () => {
  allCandidates.forEach((candidate) => {
    const signals = candidate.locality_evidence?.visible_signals ?? [];
    assert.equal(candidate.locality_evidence.signal_count, signals.length);
    assert.equal(new Set(signals.map(({ signal_type }) => signal_type)).size, signals.length);
    assert.ok(candidate.visual_motifs.length, `${candidate.candidate_id}: visual_motifs`);
    if (candidate.editorial_locality_eligibility === "eligible_for_nomination") {
      const threshold = candidate.pageType === "city" ? 3 : 2;
      assert.ok(signals.length >= threshold, `${candidate.candidate_id}: ${threshold} signals`);
    }
  });
});

test("keeps all pools unresolved and nominations before acquisition or selection", () => {
  candidatePools.forEach((pool) => {
    assert.equal(pool.selection_outcome, "unresolved", pool.route);
    assert.equal(pool.publishing_status, "prohibited", pool.route);
    assert.equal(
      pool.next_sourcing_step,
      "commission_lived_behavior_or_approved_tier_3_generation",
      pool.route,
    );
    assertPoolLifecycle(pool);
    if (pool.nominated_candidate_id) {
      const nominee = candidatesById.get(pool.nominated_candidate_id);
      assert.ok(nominee, pool.route);
      assert.equal(nominee.route, pool.route);
      assert.equal(nominee.candidate_disposition, "nominated");
      assert.equal(nominee.lifecycle_stage, "nominated");
      assert.equal(nominee.acquisition_status, "not_acquired");
      assert.equal(nominee.rights_review_status, "not_started");
      assert.equal(nominee.editorial_review_status, "not_started");
    }
  });
  assert.equal(
    allCandidates.filter(({ candidate_disposition }) => candidate_disposition === "nominated")
      .length,
    10,
  );
  assert.equal(
    allCandidates.filter(({ candidate_disposition }) => candidate_disposition === "selected").length,
    0,
  );
});

test("makes the failed manual set audit a hard selection gate", () => {
  const audit = manifest.locality_set_audit;
  const nominated = allCandidates.filter(
    ({ candidate_disposition }) => candidate_disposition === "nominated",
  );
  const countMotif = (motif) =>
    nominated.filter(({ visual_motifs }) => visual_motifs.includes(motif)).length;
  assert.equal(audit.review_method, "manual_editorial_audit");
  assert.equal(audit.manual_editorial_result, "failed");
  assert.equal(audit.observed_nominated_skyline_count, countMotif("skyline"));
  assert.equal(audit.observed_nominated_water_count, countMotif("water"));
  assert.equal(audit.observed_nominated_lived_behavior_count, countMotif("lived_behavior"));
  assert.ok(
    audit.observed_nominated_skyline_count > audit.selection_thresholds.maximum_skyline_count,
  );
  assert.ok(
    audit.observed_nominated_water_count > audit.selection_thresholds.maximum_water_count,
  );
  assert.ok(
    audit.observed_nominated_lived_behavior_count <
      audit.selection_thresholds.minimum_lived_behavior_count,
  );
  assert.ok(audit.failure_reasons.length >= 3);
  assert.equal(
    allCandidates.some(({ candidate_disposition }) => candidate_disposition === "selected"),
    false,
  );
  const selected = allCandidates.filter(
    ({ candidate_disposition }) => candidate_disposition === "selected",
  );
  if (selected.length) {
    const selectedMotifCount = (motif) =>
      selected.filter(({ visual_motifs }) => visual_motifs.includes(motif)).length;
    assert.equal(audit.manual_editorial_result, "passed");
    assert.ok(
      selectedMotifCount("skyline") <= audit.selection_thresholds.maximum_skyline_count,
    );
    assert.ok(
      selectedMotifCount("water") <= audit.selection_thresholds.maximum_water_count,
    );
    assert.ok(
      selectedMotifCount("lived_behavior") >=
        audit.selection_thresholds.minimum_lived_behavior_count,
    );
  }
});

test("models the playbook lifecycle in order and blocks premature selection", () => {
  const lifecycleOrder = [
    "research_candidate",
    "nominated",
    "acquired_rights_complete",
    "selected",
    "reviewed_approved",
  ];
  assert.deepEqual(
    manifestSchema.$defs.locality_asset_candidate.properties.lifecycle_stage.enum,
    lifecycleOrder,
  );
  assert.deepEqual(
    manifestSchema.$defs.locality_asset_candidate["x-lifecycle-order"],
    lifecycleOrder,
  );
  allCandidates.forEach((candidate) => {
    assert.ok(lifecycleOrder.includes(candidate.lifecycle_stage));
    assert.equal(candidate.acquisition_status, "not_acquired");
    assert.equal(candidate.rights_review_status, "not_started");
    assert.equal(candidate.editorial_review_status, "not_started");
    assert.equal(candidate.publishing_status, "prohibited");
    assert.ok(!["selected", "reviewed_approved"].includes(candidate.candidate_disposition));
    assert.equal(
      candidate.lifecycle_stage,
      candidate.candidate_disposition === "nominated" ? "nominated" : "research_candidate",
    );
  });
});

test("uses structural source tiers and excludes protected page families", () => {
  allCandidates.forEach((candidate) => {
    assert.equal(candidate.asset_type, "photograph");
    assert.ok(["exact_geography", "verified_subregion"].includes(candidate.source_tier));
    assert.ok(candidate.claimed_geography.trim());
  });
  candidatePools.forEach(({ route }) => {
    assert.equal(protectedRoutes.has(route), false, route);
    assert.equal(route.startsWith("/calculators/"), false, route);
    assert.equal(
      manifest.entries.find((entry) => entry.route === route)?.coverage_kind,
      "prototype_route",
      route,
    );
  });
});

test("preserves nonpublication facts and unchanged CMS hero slots", () => {
  const forbiddenCandidateFields = [
    "acquired_at",
    "checksum",
    "reviewed_at",
    "reviewed_by",
    "rights_approved_at",
    "release_evidence_url",
  ];
  allCandidates.forEach((candidate) => {
    forbiddenCandidateFields.forEach((field) => {
      assert.equal(field in candidate, false, `${candidate.candidate_id}:${field}`);
    });
  });
  localityEntries.forEach(({ asset_selection_status, hero, route }) => {
    assert.equal(asset_selection_status, "unselected", route);
    assert.equal(hero.review_status, "draft", route);
    assert.deepEqual(hero.desktop_asset, {
      selection_status: "unselected",
      rights_review_status: "not_started",
      publishing_status: "prohibited",
    });
    assert.equal(hero.local_evidence_brief.asset_selection_status, "unselected", route);
  });
});

test("records Austin's unproven 4:5 crop and the failed-stock-pass next step", () => {
  const austin = candidatesById.get("austin-west-campus-spheroidite");
  assert.equal(austin.candidate_disposition, "nominated");
  assert.ok(austin.risk_notes.some((note) => /4:5/i.test(note) && /unproven/i.test(note)));
  assert.match(review, /all 16 routes remain unresolved/i);
  assert.match(review, /audited failed free-stock pass/i);
  assert.doesNotMatch(review, /Research selection:/i);
});

test("schema models audit and nomination gates without weakening hero publication gates", () => {
  assert.equal(manifest.schema_version, "1.3.0");
  assert.ok(manifestSchema.properties.locality_set_audit);
  assert.ok(manifestSchema.$defs.locality_candidate_pool);
  assert.ok(manifestSchema.$defs.locality_asset_candidate);
  assert.deepEqual(
    heroSchema.allOf.find((rule) => rule.if?.properties?.review_status)?.then.required,
    ["reviewed_at", "reviewed_by"],
  );
  assert.ok(
    heroSchema.$defs.selected_asset_reference.allOf.some(
      (rule) => rule.if?.properties?.asset_origin,
    ),
  );
});

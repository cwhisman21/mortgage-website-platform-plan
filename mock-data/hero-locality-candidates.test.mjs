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

const protectedRoutes = new Set([
  "/",
  "/locations",
  "/calculators",
  "/rates",
]);
const localityEntries = manifest.entries.filter(
  ({ coverage_kind, hero }) =>
    coverage_kind === "prototype_route" &&
    ["city", "state"].includes(hero.page_type),
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

test("covers all four prototype states and twelve prototype cities with two candidates each", () => {
  assert.equal(localityEntries.length, 16);
  assert.equal(localityEntries.filter(({ hero }) => hero.page_type === "state").length, 4);
  assert.equal(localityEntries.filter(({ hero }) => hero.page_type === "city").length, 12);
  assert.equal(candidatePools.length, 16);
  localityEntries.forEach(({ route }) => {
    const pool = poolByRoute.get(route);
    assert.ok(pool, `${route}: candidate pool`);
    assert.ok(pool.candidates.length >= 2, `${route}: candidates`);
  });
});

test("uses unique individual asset pages with source, creator, license, attribution, and access date", () => {
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
      "required_attribution",
      "source_accessed_at",
      "source_dimensions",
    ].forEach((field) => assert.ok(candidate[field], `${candidate.route}:${field}`));
    assert.match(candidate.asset_page_url, /^https:\/\//);
    assert.match(candidate.license_url, /^https:\/\//);
    assert.match(candidate.source_accessed_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(candidate.source_dimensions.width > 0, `${candidate.candidate_id}: width`);
    assert.ok(candidate.source_dimensions.height > 0, `${candidate.candidate_id}: height`);
    assert.ok(Number.isInteger(candidate.source_dimensions.width), `${candidate.candidate_id}: integer width`);
    assert.ok(Number.isInteger(candidate.source_dimensions.height), `${candidate.candidate_id}: integer height`);
    assert.doesNotMatch(candidate.asset_page_url, /Special:MediaSearch|\/wiki\/(?:Main_Page|Category:)/);
  });
});

test("records release status, caveats, and blocks unresolved people or property risk", () => {
  allCandidates.forEach((candidate) => {
    assert.ok(
      ["not_applicable", "verified", "not_verified", "required"].includes(
        candidate.release_status,
      ),
      `${candidate.candidate_id}: release_status`,
    );
    assert.ok(candidate.risk_notes.length, `${candidate.candidate_id}: risk_notes`);
    assert.ok(
      ["eligible_for_candidate_selection", "blocked_pending_clearance"].includes(
        candidate.selection_eligibility,
      ),
      `${candidate.candidate_id}: selection_eligibility`,
    );
    if (["not_verified", "required"].includes(candidate.release_status)) {
      assert.equal(candidate.selection_eligibility, "blocked_pending_clearance");
      assert.notEqual(candidate.candidate_disposition, "selected");
    }
  });
});

test("records visible locality evidence and enforces state and city signal thresholds", () => {
  allCandidates.forEach((candidate) => {
    const signals = candidate.locality_evidence?.visible_signals ?? [];
    assert.equal(candidate.locality_evidence.signal_count, signals.length);
    assert.equal(new Set(signals.map(({ signal_type }) => signal_type)).size, signals.length);
    signals.forEach(({ signal_type, evidence }) => {
      assert.ok(signal_type);
      assert.ok(evidence);
    });
    if (candidate.candidate_disposition === "selected") {
      const threshold = candidate.pageType === "city" ? 3 : 2;
      assert.ok(signals.length >= threshold, `${candidate.candidate_id}: ${threshold} signals`);
      assert.equal(candidate.selection_eligibility, "eligible_for_candidate_selection");
      assert.ok(candidate.source_dimensions.width >= 2560, `${candidate.candidate_id}: width`);
      assert.ok(candidate.source_dimensions.height >= 1440, `${candidate.candidate_id}: height`);
    }
  });
});

test("has exactly one selected candidate or one explicit unresolved outcome per geography", () => {
  localityEntries.forEach(({ route }) => {
    const pool = poolByRoute.get(route);
    assert.ok(["candidate_selected", "unresolved"].includes(pool.selection_outcome));
    const selected = pool.candidates.filter(
      ({ candidate_disposition }) => candidate_disposition === "selected",
    );
    if (pool.selection_outcome === "candidate_selected") {
      assert.equal(selected.length, 1, route);
      assert.equal(pool.selected_candidate_id, selected[0].candidate_id, route);
      assert.equal("unresolved_reason" in pool, false, route);
    } else {
      assert.equal(selected.length, 0, route);
      assert.ok(pool.unresolved_reason?.trim(), route);
      assert.equal("selected_candidate_id" in pool, false, route);
    }
  });
});

test("uses only exact-geography or verified-subregion photography and never generic fallback", () => {
  allCandidates.forEach((candidate) => {
    assert.equal(candidate.asset_type, "photograph");
    assert.ok(["exact_geography", "verified_subregion"].includes(candidate.source_tier));
    assert.notEqual(candidate.claimed_geography.toLowerCase(), "generic");
    assert.doesNotMatch(candidate.selection_rationale, /generic (?:fallback|stock|suburb|skyline|landscape)/i);
  });
});

test("keeps protected routes and page families out of locality candidate sourcing", () => {
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

test("does not fabricate acquisition, checksum, review, release evidence, or publication approval", () => {
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
    assert.equal(candidate.acquisition_status, "not_acquired");
    assert.equal(candidate.rights_review_status, "not_started");
    assert.equal(candidate.publishing_status, "prohibited");
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

test("schema models the candidate pool without weakening hero publication gates", () => {
  assert.equal(manifest.schema_version, "1.1.0");
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

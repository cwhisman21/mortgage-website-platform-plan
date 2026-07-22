import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [manifest, schema, review] = await Promise.all([
  load("./hero-asset-manifest.json"),
  load("../schemas/hero-asset-manifest.schema.json"),
  readFile(new URL("../docs/25-hero-page-family-candidate-review.md", import.meta.url), "utf8")
    .catch(() => ""),
]);

const familySpecs = {
  buy: ["/buy", "tall_diagonal_image_slab", "external_stock_candidates"],
  refinance: ["/refinance", "wide_panoramic_band", "external_stock_candidates"],
  home_equity: ["/home-equity", "rotated_architectural_window", "external_stock_candidates"],
  loan_product: ["/loan-options/fha-loans", "circular_criteria_or_brand_field", "external_stock_candidates"],
  learning_center: ["/learning-center", "layered_editorial_collage", "external_stock_candidates"],
  topic_hub: ["/learning-center/buying-a-home", "media_left_editorial_panel", "external_stock_candidates"],
  article: ["/learning-center/austin-mortgage-market-update", "evidence_or_report_strip", "external_stock_candidates"],
  loan_officer: ["/loan-officers/ava-martinez", "vertical_human_portrait", "internal_only"],
  branch: ["/branches/austin-central", "wide_panoramic_band", "internal_only"],
  company: ["/company", "circular_criteria_or_brand_field", "internal_preferred"],
  search_directory: ["/loan-officers", "structured_search_or_planning_interface", "non_photographic"],
  prequalification: ["/prequalification", "horizon_composition", "external_stock_candidates"],
  seller_move_up: ["/seller-move-up", "stacked_planning_panels", "external_stock_candidates"],
};
const externalFamilies = new Set(
  Object.entries(familySpecs)
    .filter(([, [, , strategy]]) => strategy === "external_stock_candidates")
    .map(([pageType]) => pageType),
);
const protectedRoutes = new Set(["/", "/locations", "/calculators", "/rates"]);
const prohibitedCliches = [
  "key_handoff",
  "cash_pile",
  "handshake",
  "generic_laptop",
  "anonymous_boardroom",
];

function assertDirectAssetUrl(value, candidateId) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:", candidateId);
  assert.ok(url.hostname.includes("."), candidateId);
  assert.doesNotMatch(url.hostname, /(?:example|localhost)/i, candidateId);
  const knownDirectPage =
    (url.hostname === "www.pexels.com" && /^\/photo\/[^/]+-\d+\/?$/.test(url.pathname)) ||
    (url.hostname === "unsplash.com" && /^\/photos\/[^/]+\/?$/.test(url.pathname)) ||
    (url.hostname === "commons.wikimedia.org" && /^\/wiki\/File:[^/]+$/.test(url.pathname));
  assert.ok(knownDirectPage, `${candidateId}: expected an individual asset page`);
  assert.equal(url.search, "", `${candidateId}: search URLs are not asset records`);
}

test("models a separate pool for all 13 non-location families without changing locality pools", () => {
  assert.equal(manifest.schema_version, "1.3.0");
  assert.equal(manifest.locality_candidate_pools.length, 16);
  assert.equal(manifest.page_family_candidate_pools.length, 13);
  assert.ok(schema.required.includes("page_family_candidate_pools"));
  assert.ok(schema.required.includes("page_family_set_audit"));
  assert.ok(schema.$defs.page_family_candidate_pool);
  assert.ok(schema.$defs.page_family_asset_candidate);
  assert.deepEqual(
    manifest.page_family_candidate_pools.map(({ page_type }) => page_type).sort(),
    Object.keys(familySpecs).sort(),
  );
});

test("keeps protected experiences and calculator descendants out of every family pool", () => {
  manifest.page_family_candidate_pools.forEach(({ route }) => {
    assert.equal(protectedRoutes.has(route), false, route);
    assert.equal(route.startsWith("/calculators/"), false, route);
    assert.equal(route.startsWith("/locations/"), false, route);
  });
});

test("matches each representative family to the approved composition", () => {
  const entriesByRoute = new Map(manifest.entries.map((entry) => [entry.route, entry]));
  manifest.page_family_candidate_pools.forEach((pool) => {
    const [route, variant, strategy] = familySpecs[pool.page_type];
    assert.equal(pool.route, route);
    assert.equal(pool.hero_variant, variant);
    assert.equal(pool.source_strategy, strategy);
    assert.equal(entriesByRoute.get(route)?.hero.page_type, pool.page_type);
    assert.equal(entriesByRoute.get(route)?.hero.hero_variant, variant);
    for (const candidate of pool.candidates ?? []) {
      assert.equal(candidate.assigned_hero_variant, variant, candidate.candidate_id);
      assert.ok(
        ["supports_assigned_variant", "component_for_assigned_composition"].includes(
          candidate.composition_fit,
        ),
        candidate.candidate_id,
      );
      assert.ok(candidate.composition_fit_notes.trim(), candidate.candidate_id);
    }
  });
});

test("records at least two real rights-verifiable external candidates where stock is appropriate", () => {
  for (const pool of manifest.page_family_candidate_pools) {
    if (!externalFamilies.has(pool.page_type)) continue;
    assert.ok(pool.candidates.length >= 2, pool.page_type);
    for (const candidate of pool.candidates) {
      assert.equal(candidate.asset_origin, "stock", candidate.candidate_id);
      assertDirectAssetUrl(candidate.asset_page_url, candidate.candidate_id);
      if (candidate.rights_basis_type === "disputed") {
        new URL(candidate.rights_basis_url);
      } else {
        new URL(candidate.license_url);
      }
      assert.ok(candidate.source_repository.trim(), candidate.candidate_id);
      assert.ok(candidate.creator_or_agency.trim(), candidate.candidate_id);
      assert.ok(candidate.displayed_caption.trim(), candidate.candidate_id);
      if (candidate.rights_basis_type !== "disputed") {
        assert.ok(candidate.license_name.trim(), candidate.candidate_id);
      }
      assert.match(candidate.source_accessed_at, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(candidate.attribution_label.trim(), candidate.candidate_id);
      assert.equal(candidate.release_assessment, "pending_acquisition_review");
      assert.ok(candidate.release_property_trademark_risks.length, candidate.candidate_id);
      assert.ok(candidate.page_relevance.trim(), candidate.candidate_id);
      assert.ok(candidate.crop_risks.length, candidate.candidate_id);
    }
  }
});

test("preserves the exact live source caption for the refinance kitchen nominee", () => {
  const candidate = manifest.page_family_candidate_pools
    .flatMap(({ candidates }) => candidates)
    .find(({ candidate_id }) => candidate_id === "refi-kitchen-finance-review-rankin");
  assert.equal(candidate.displayed_caption, "A Man in a Kitchen");
});

test("covers the current home, sell-and-buy transition, and future-home tradeoffs as separate seller panels", () => {
  const seller = manifest.page_family_candidate_pools.find(
    ({ page_type }) => page_type === "seller_move_up",
  );
  assert.ok(seller.candidates.length >= 3);
  assert.deepEqual(
    new Set(seller.candidates.map(({ seller_journey_phase }) => seller_journey_phase)),
    new Set(["current_home", "sell_and_buy_transition", "future_home_tradeoffs"]),
  );
  seller.candidates.forEach((candidate) => {
    assert.equal(candidate.composition_fit, "component_for_assigned_composition");
    assert.match(candidate.page_relevance, /current home|sell-and-buy|future home|tradeoff/i);
  });
});

test("uses current domain-specific housing evidence in the Learning Center newsroom collage", () => {
  const learning = manifest.page_family_candidate_pools.find(
    ({ page_type }) => page_type === "learning_center",
  );
  const evidence = learning.candidates.filter(
    ({ editorial_evidence_role }) => editorial_evidence_role === "current_housing_market_evidence",
  );
  assert.ok(evidence.length >= 1);
  evidence.forEach((candidate) => {
    assert.equal(candidate.source_repository, "Wikimedia Commons");
    assert.match(candidate.displayed_caption, /housing price|home price|housing market/i);
    assert.match(candidate.page_relevance, /mortgage|housing|market|newsroom/i);
    assert.equal(candidate.composition_fit, "component_for_assigned_composition");
  });
  assert.equal(
    learning.candidates.some(({ candidate_id }) => candidate_id === "learning-printed-charts-blazek"),
    false,
  );
});

test("blocks the NY Fed heatmap under disputed terms instead of treating a public-domain mark as a license", () => {
  const candidate = manifest.page_family_candidate_pools
    .flatMap(({ candidates }) => candidates)
    .find(({ candidate_id }) => candidate_id === "learning-september-2025-house-price-heatmap");
  assert.equal(candidate.rights_basis_type, "disputed");
  assert.match(candidate.rights_basis_name, /(New York|NY) Fed/i);
  assert.match(candidate.rights_basis_name, /(Wikimedia Commons|Commons)/i);
  assert.equal(candidate.rights_basis_url, "https://www.newyorkfed.org/privacy/termsofuse.html");
  assert.equal(candidate.original_source_url, "https://www.newyorkfed.org/research/home-price-index");
  assert.equal(candidate.controlling_terms_url, "https://www.newyorkfed.org/privacy/termsofuse.html");
  assert.equal(candidate.commons_public_domain_assertion_status, "disputed");
  assert.equal(
    candidate.commons_public_domain_mark_url,
    "https://creativecommons.org/publicdomain/mark/1.0/",
  );
  assert.equal(candidate.rights_eligibility, "blocked_pending_clearance");
  assert.equal(candidate.rights_review_status, "not_started");
  assert.equal(candidate.publishing_status, "prohibited");
  assert.equal("license_name" in candidate, false);
  assert.equal("license_url" in candidate, false);
  assert.ok(candidate.conditional_attribution_and_use_restrictions.length >= 5);
  assert.match(candidate.attribution_label, /subject to the Terms of Use/i);
  assert.ok(schema.$defs.page_family_asset_candidate.allOf?.length);
});

test("keeps every candidate before acquisition, selection, review, and publication", () => {
  const forbiddenFields = [
    "asset_id",
    "acquired_at",
    "checksum",
    "selected_at",
    "selected_by",
    "reviewed_at",
    "reviewed_by",
    "approved_at",
    "approved_by",
    "rights_snapshot",
  ];
  manifest.page_family_candidate_pools.forEach((pool) => {
    assert.equal(pool.selection_outcome, "unresolved", pool.page_type);
    assert.equal(pool.publishing_status, "prohibited", pool.page_type);
    assert.ok(pool.unresolved_reason.trim(), pool.page_type);
    assert.equal("selected_candidate_id" in pool, false, pool.page_type);
    for (const candidate of pool.candidates ?? []) {
      assert.equal(candidate.candidate_disposition, "nominated", candidate.candidate_id);
      assert.equal(candidate.lifecycle_stage, "nominated", candidate.candidate_id);
      assert.equal(candidate.acquisition_status, "not_acquired", candidate.candidate_id);
      assert.equal(candidate.rights_review_status, "not_started", candidate.candidate_id);
      assert.equal(candidate.editorial_review_status, "not_started", candidate.candidate_id);
      assert.equal(candidate.crop_review_status, "not_started", candidate.candidate_id);
      assert.equal(candidate.publishing_status, "prohibited", candidate.candidate_id);
      forbiddenFields.forEach((field) => assert.equal(field in candidate, false, `${candidate.candidate_id}:${field}`));
    }
  });
  const familyEntries = manifest.entries.filter(
    ({ coverage_kind }) => coverage_kind === "representative_page_family",
  );
  familyEntries.forEach(({ asset_selection_status, hero, route }) => {
    assert.equal(asset_selection_status, "unselected", route);
    assert.equal(hero.review_status, "draft", route);
    assert.deepEqual(hero.desktop_asset, {
      selection_status: "unselected",
      rights_review_status: "not_started",
      publishing_status: "prohibited",
    });
  });
});

test("requires actual internal portrait and branch photography and never offers substitutes", () => {
  for (const pageType of ["loan_officer", "branch"]) {
    const pool = manifest.page_family_candidate_pools.find((item) => item.page_type === pageType);
    assert.equal(pool.source_strategy, "internal_only");
    assert.deepEqual(pool.candidates, []);
    assert.equal(pool.internal_asset_requirement.asset_origin_requirement, "internal");
    assert.match(pool.internal_asset_requirement.required_subject, /actual|named|verified/i);
    assert.match(pool.internal_asset_requirement.substitute_prohibition, /stock/i);
    assert.match(pool.internal_asset_requirement.substitute_prohibition, /generated/i);
  }
});

test("keeps company internal-first and search/directory non-photographic", () => {
  const company = manifest.page_family_candidate_pools.find(({ page_type }) => page_type === "company");
  assert.equal(company.source_strategy, "internal_preferred");
  assert.deepEqual(company.candidates, []);
  assert.equal(company.internal_asset_requirement.asset_origin_requirement, "internal");
  assert.match(company.next_sourcing_step, /commission/i);

  const directory = manifest.page_family_candidate_pools.find(
    ({ page_type }) => page_type === "search_directory",
  );
  assert.equal(directory.source_strategy, "non_photographic");
  assert.deepEqual(directory.candidates, []);
  assert.equal(directory.structured_composition_requirement.photo_required, false);
  assert.match(directory.structured_composition_requirement.treatment, /search|filter|result/i);
});

test("audits the complete candidate set for prohibited clichés and repeated assets", () => {
  const candidates = manifest.page_family_candidate_pools.flatMap(({ candidates }) => candidates);
  const audit = manifest.page_family_set_audit;
  assert.equal(candidates.length, 19);
  assert.equal(audit.scope, "non_location_page_family_candidate_set");
  assert.equal(audit.review_method, "manual_editorial_audit");
  assert.deepEqual(audit.prohibited_cliches, prohibitedCliches);
  assert.equal(audit.audited_candidate_count, candidates.length);
  assert.equal(audit.observed_prohibited_cliche_count, 0);
  assert.equal(audit.observed_duplicate_asset_url_count, 0);
  assert.deepEqual(audit.candidate_ids_with_prohibited_cliches, []);
  assert.deepEqual(audit.duplicate_asset_urls, []);
  assert.equal(new Set(candidates.map(({ asset_page_url }) => asset_page_url)).size, candidates.length);
  candidates.forEach((candidate) => {
    assert.deepEqual(candidate.prohibited_cliches_detected, [], candidate.candidate_id);
  });
});

test("derives the complete repeated-creator set and matches the manifest audit", () => {
  const candidates = manifest.page_family_candidate_pools.flatMap(({ candidates }) => candidates);
  const creatorCounts = new Map();
  candidates.forEach(({ creator_or_agency }) => {
    creatorCounts.set(creator_or_agency, (creatorCounts.get(creator_or_agency) ?? 0) + 1);
  });
  const repeatedCreators = [...creatorCounts]
    .filter(([, count]) => count > 1)
    .map(([creator]) => creator)
    .sort();
  assert.deepEqual(repeatedCreators, ["Pavel Danilyuk", "RDNE Stock project"]);
  assert.deepEqual(manifest.page_family_set_audit.repeated_creators, repeatedCreators);
});

test("documents 13 family rationales and the full-set lifecycle and cliché audit", () => {
  assert.match(review, /13 page families/i);
  assert.match(review, /nomination is not acquisition, selection, or approval/i);
  assert.match(review, /## Full-set cliché and repetition audit/i);
  [
    "Buy",
    "Refinance",
    "Home Equity",
    "Canonical loan product",
    "Learning Center",
    "Topic hub",
    "Article",
    "Loan officer profile",
    "Branch profile",
    "Company",
    "Search/directory",
    "Prequalification",
    "Seller/move-up",
  ].forEach((label) => assert.match(review, new RegExp(`\\| ${label.replace("/", "\\/")} \\|`, "i")));
  ["key handoff", "cash pile", "handshake", "generic laptop", "anonymous boardroom"].forEach(
    (phrase) => assert.match(review, new RegExp(phrase, "i")),
  );
  ["current home", "sell-and-buy transition", "future home", "housing-market evidence"].forEach(
    (phrase) => assert.match(review, new RegExp(phrase, "i")),
  );
  ["Pavel Danilyuk", "RDNE Stock project", "public-domain assertion is disputed"].forEach(
    (phrase) => assert.match(review, new RegExp(phrase, "i")),
  );
});

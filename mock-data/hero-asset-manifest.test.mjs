import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const localRoutes = [
  "/locations/texas", "/locations/california", "/locations/colorado", "/locations/florida",
  "/locations/texas/austin", "/locations/texas/dallas", "/locations/texas/houston",
  "/locations/california/irvine", "/locations/california/san-diego", "/locations/california/sacramento",
  "/locations/colorado/denver", "/locations/colorado/colorado-springs", "/locations/colorado/boulder",
  "/locations/florida/tampa", "/locations/florida/orlando", "/locations/florida/miami",
];
const protectedRoutes = ["/", "/locations", "/calculators", "/rates"];
const variants = {
  city: "full_bleed_environmental_portrait",
  state: "full_bleed_environmental_portrait",
  buy: "tall_diagonal_image_slab",
  refinance: "wide_panoramic_band",
  home_equity: "rotated_architectural_window",
  loan_product: "circular_criteria_or_brand_field",
  learning_center: "layered_editorial_collage",
  topic_hub: "media_left_editorial_panel",
  article: "evidence_or_report_strip",
  loan_officer: "vertical_human_portrait",
  branch: "wide_panoramic_band",
  company: "circular_criteria_or_brand_field",
  search_directory: "structured_search_or_planning_interface",
  prequalification: "horizon_composition",
  seller_move_up: "stacked_planning_panels",
};

function publicUrl(value, label) {
  const parsed = new URL(value);
  assert.ok(["http:", "https:"].includes(parsed.protocol), `${label} must use http(s)`);
  assert.ok(parsed.hostname.includes("."), `${label} must have a public hostname`);
}

test("wrapper references the framework-neutral HeroImageRecord", async () => {
  const schema = await load("../schemas/hero-asset-manifest.schema.json");
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.properties.entries.items.$ref, "#/$defs/manifest_entry");
  assert.equal(schema.$defs.manifest_entry.properties.hero.$ref, "hero-image.schema.json");
});

test("covers every prototype city/state route exactly once and excludes protected routes", async () => {
  const { entries } = await load("./hero-asset-manifest.json");
  const actual = entries.filter(({ hero }) => ["city", "state"].includes(hero.page_type)).map(({ route }) => route);
  assert.deepEqual(actual.sort(), [...localRoutes].sort());
  assert.equal(new Set(actual).size, localRoutes.length);
  const routes = new Set(entries.map(({ route }) => route));
  protectedRoutes.forEach((route) => assert.ok(!routes.has(route), `${route} must stay protected`));
  assert.ok(![...routes].some((route) => route.startsWith("/calculators/")));
});

test("has one representative for every other family with its approved composition", async () => {
  const { entries } = await load("./hero-asset-manifest.json");
  for (const [pageType, variant] of Object.entries(variants)) {
    const matches = entries.filter(({ hero }) => hero.page_type === pageType);
    assert.equal(matches.length, ["city", "state"].includes(pageType) ? (pageType === "city" ? 12 : 4) : 1);
    matches.forEach(({ route, hero }) => {
      assert.equal(hero.hero_variant, variant, route);
      assert.ok(!Object.hasOwn(hero, "variant_exception"));
    });
  }
});

test("local briefs contain verified planning signals", async () => {
  const { entries } = await load("./hero-asset-manifest.json");
  for (const { route, hero } of entries.filter(({ hero }) => ["city", "state"].includes(hero.page_type))) {
    const brief = hero.local_evidence_brief;
    assert.ok(brief.visual_truths.length >= 3 && brief.visual_truths.length <= 5, route);
    assert.equal(brief.misleading_stereotypes_to_avoid.length, 2, route);
    assert.ok(brief.desired_lived_behavior.length > 0);
    assert.ok(brief.crop_safe_focal_subject.length > 0);
    assert.ok(brief.source_links.length > 0 && brief.geography_evidence.length > 0);
    [...brief.source_links, ...brief.geography_evidence].forEach((url, i) => publicUrl(url, `${route} evidence ${i}`));
  }
});

test("all entries are schema-compatible, explicitly unselected drafts", async () => {
  const [{ status, entries }, schema] = await Promise.all([
    load("./hero-asset-manifest.json"),
    load("../schemas/hero-image.schema.json"),
  ]);
  assert.equal(status, "draft");
  assert.equal(entries.length, 29);
  assert.equal(new Set(entries.map(({ route }) => route)).size, entries.length);
  const allowedHeroKeys = new Set(Object.keys(schema.properties));
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry).sort(), ["asset_selection_status", "coverage_kind", "hero", "route"]);
    assert.match(entry.route, /^\/[a-z0-9/-]+$/);
    assert.ok(["prototype_route", "representative_page_family"].includes(entry.coverage_kind));
    assert.equal(entry.asset_selection_status, "unselected");
    const { hero } = entry;
    Object.keys(hero).forEach((key) => assert.ok(allowedHeroKeys.has(key), `${entry.route}: ${key}`));
    schema.required.forEach((key) => assert.ok(Object.hasOwn(hero, key), `${entry.route} missing ${key}`));
    assert.ok(schema.properties.page_type.enum.includes(hero.page_type));
    assert.ok(schema.properties.hero_variant.enum.includes(hero.hero_variant));
    assert.ok(schema.properties.contrast_mode.enum.includes(hero.contrast_mode));
    assert.equal(hero.review_status, "draft");
    assert.equal(hero.has_motion, false);
    assert.ok(!Object.hasOwn(hero, "reviewed_at") && !Object.hasOwn(hero, "reviewed_by"));
    for (const point of [hero.focal_point_desktop, hero.focal_point_mobile]) {
      assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
    }
    const asset = hero.desktop_asset;
    assert.ok(asset.asset_id.startsWith("pending-hero-"));
    assert.equal(asset.asset_origin, "internal");
    assert.ok(!Object.hasOwn(asset, "source_url"));
    assert.ok(!Object.hasOwn(asset.rights_record, "license_url"));
    assert.equal(asset.rights_record.release_status, "not_verified");
    assert.match(asset.rights_record.acquired_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(asset.rights_record.usage_notes, /no asset has been selected or acquired/i);
  }
});

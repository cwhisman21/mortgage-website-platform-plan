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

function resolvePointer(root, fragment) {
  return fragment.replace(/^#\/?/, "").split("/").filter(Boolean).reduce(
    (value, token) => value[token.replaceAll("~1", "/").replaceAll("~0", "~")],
    root,
  );
}

function schemaErrors(value, node, context, path = "$") {
  if (node.$ref) {
    const [file = "", fragment = ""] = node.$ref.split("#");
    const root = file ? context[file] : context.root;
    return schemaErrors(value, fragment ? resolvePointer(root, `#${fragment}`) : root, { ...context, root }, path);
  }
  const errors = [];
  const push = (message) => errors.push(`${path}: ${message}`);
  const actualType = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  const matchesType = node.type === "integer" ? Number.isInteger(value) : actualType === node.type;
  if (node.type && !matchesType) push(`expected ${node.type}, got ${actualType}`);
  if (Object.hasOwn(node, "const") && value !== node.const) push(`expected const ${JSON.stringify(node.const)}`);
  if (node.enum && !node.enum.some((item) => Object.is(item, value))) push("not in enum");
  if (typeof value === "string") {
    if (node.minLength !== undefined && value.length < node.minLength) push("shorter than minLength");
    if (node.maxLength !== undefined && value.length > node.maxLength) push("longer than maxLength");
    if (node.pattern && !new RegExp(node.pattern).test(value)) push("does not match pattern");
    if (node.format === "uri") {
      try { new URL(value); } catch { push("invalid uri"); }
    }
    if (node.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) push("invalid date");
    if (node.format === "date-time" && Number.isNaN(Date.parse(value))) push("invalid date-time");
  }
  if (typeof value === "number") {
    if (node.minimum !== undefined && value < node.minimum) push("below minimum");
    if (node.maximum !== undefined && value > node.maximum) push("above maximum");
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) push("fewer than minItems");
    if (node.maxItems !== undefined && value.length > node.maxItems) push("more than maxItems");
    if (node.items) value.forEach((item, index) => errors.push(...schemaErrors(item, node.items, context, `${path}[${index}]`)));
    if (node.contains) {
      const matches = value.filter((item, index) =>
        schemaErrors(item, node.contains, context, `${path}[${index}]`).length === 0
      ).length;
      const minimum = node.minContains ?? 1;
      const maximum = node.maxContains ?? Number.POSITIVE_INFINITY;
      if (matches < minimum) push("fewer than minContains");
      if (matches > maximum) push("more than maxContains");
    }
  }
  if (actualType === "object") {
    for (const key of node.required ?? []) if (!Object.hasOwn(value, key)) push(`missing ${key}`);
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      if (Object.hasOwn(value, key)) errors.push(...schemaErrors(value[key], child, context, `${path}.${key}`));
    }
    if (node.additionalProperties === false) {
      const allowed = new Set(Object.keys(node.properties ?? {}));
      for (const key of Object.keys(value)) if (!allowed.has(key)) push(`additional property ${key}`);
    }
  }
  for (const child of node.allOf ?? []) errors.push(...schemaErrors(value, child, context, path));
  if (node.anyOf && !node.anyOf.some((child) => schemaErrors(value, child, context, path).length === 0)) push("does not match anyOf");
  if (node.oneOf && node.oneOf.filter((child) => schemaErrors(value, child, context, path).length === 0).length !== 1) push("does not match exactly one oneOf branch");
  if (node.if) {
    const conditionMatches = schemaErrors(value, node.if, context, path).length === 0;
    if (conditionMatches && node.then) errors.push(...schemaErrors(value, node.then, context, path));
    if (!conditionMatches && node.else) errors.push(...schemaErrors(value, node.else, context, path));
  }
  if (node.not && schemaErrors(value, node.not, context, path).length === 0) push("matches forbidden schema");
  return errors;
}

async function validateManifest(manifest) {
  const [wrapper, hero] = await Promise.all([
    load("../schemas/hero-asset-manifest.schema.json"),
    load("../schemas/hero-image.schema.json"),
  ]);
  return schemaErrors(manifest, wrapper, { root: wrapper, "hero-image.schema.json": hero });
}

test("the complete artifact validates against its wrapper and HeroImageRecord", async () => {
  const [manifest, wrapper] = await Promise.all([
    load("./hero-asset-manifest.json"),
    load("../schemas/hero-asset-manifest.schema.json"),
  ]);
  assert.ok(Object.hasOwn(wrapper.properties, "$schema"));
  assert.ok(wrapper.required.includes("$schema"));
  assert.equal(wrapper.$defs.manifest_entry.properties.hero.$ref, "hero-image.schema.json");
  assert.deepEqual(await validateManifest(manifest), []);
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
    assert.deepEqual(hero.desktop_asset, {
      selection_status: "unselected",
      rights_review_status: "not_started",
      publishing_status: "prohibited",
    });
    if (hero.local_evidence_brief) {
      assert.equal(hero.local_evidence_brief.asset_selection_status, "unselected");
      assert.ok(!Object.hasOwn(hero.local_evidence_brief, "asset_selection_tier"));
      assert.ok(!Object.hasOwn(hero.local_evidence_brief, "selected_asset_geography"));
    }
  }
});

test("unselected planning records reject acquisition facts and selected locality tiers", async () => {
  const manifest = await load("./hero-asset-manifest.json");
  const withAcquisition = structuredClone(manifest);
  withAcquisition.entries[0].hero.desktop_asset.acquired_at = "2026-07-21";
  assert.ok((await validateManifest(withAcquisition)).length > 0);
  const withSelectedTier = structuredClone(manifest);
  withSelectedTier.entries[0].hero.local_evidence_brief.asset_selection_tier = "exact_geography";
  assert.ok((await validateManifest(withSelectedTier)).length > 0);
  const approvedWithPlaceholder = structuredClone(manifest);
  Object.assign(approvedWithPlaceholder.entries[0].hero, {
    review_status: "approved",
    reviewed_at: "2026-07-21T12:00:00Z",
    reviewed_by: { user_id: "reviewer-1" },
  });
  assert.ok((await validateManifest(approvedWithPlaceholder)).length > 0);
});

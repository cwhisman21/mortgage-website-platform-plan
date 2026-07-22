import assert from "node:assert/strict";
import test from "node:test";
import manifest from "../mock-data/hero-asset-manifest.json" with { type: "json" };
import {
  createHeroManifestIndex,
  heroPublishBlockReason,
  isProtectedHeroRoute,
  renderGovernedHero,
  renderGovernedHeroOrFallback,
  resolvePublishableHero,
} from "./hero-image-renderer.mjs";

const selectedAsset = {
  selection_status: "selected",
  asset_id: "synthetic-austin-hero",
  asset_origin: "internal",
  src: "/site/assets/test/austin-hero.webp",
};

const variants = [
  "full_bleed_environmental_portrait",
  "tall_diagonal_image_slab",
  "wide_panoramic_band",
  "rotated_architectural_window",
  "circular_criteria_or_brand_field",
  "layered_editorial_collage",
  "media_left_editorial_panel",
  "evidence_or_report_strip",
  "vertical_human_portrait",
  "structured_search_or_planning_interface",
  "horizon_composition",
  "stacked_planning_panels",
];

function approvedManifest(route = "/locations/texas/austin", overrides = {}) {
  return {
    status: "approved",
    entries: [
      {
        route,
        asset_selection_status: "selected",
        publishing_status: "published",
        hero: {
          page_type: "city",
          hero_variant: "full_bleed_environmental_portrait",
          eyebrow: "City market guide",
          headline: "Austin mortgage planning with local evidence",
          dek: "Compare neighborhood-scale cost signals before reviewing a specific property.",
          primary_cta: { cta_id: "start", label_override: "Review Austin options" },
          desktop_asset: selectedAsset,
          mobile_asset: { ...selectedAsset, asset_id: "synthetic-austin-mobile", src: "/site/assets/test/austin-hero-mobile.webp" },
          decorative: false,
          alt_text: "A documented Austin neighborhood scene with local housing context",
          focal_point_desktop: { x: 0.62, y: 0.45 },
          focal_point_mobile: { x: 0.48, y: 0.4 },
          contrast_mode: "left_scrim",
          review_status: "approved",
          reviewed_at: "2026-07-22T12:00:00Z",
          reviewed_by: { user_id: "qa" },
          ...overrides,
        },
      },
    ],
  };
}

test("indexes manifest entries by normalized route", () => {
  const index = createHeroManifestIndex(manifest);
  assert.ok(index.has("/buy"));
  assert.ok(index.has("/locations/texas/austin"));
});

test("current draft manifest never resolves a publishable hero", () => {
  assert.equal(resolvePublishableHero("/buy", manifest), null);
  assert.equal(heroPublishBlockReason(createHeroManifestIndex(manifest).get("/buy"), manifest), "manifest_not_approved");
  const html = renderGovernedHeroOrFallback("/buy", manifest, "<section>fallback</section>");
  assert.equal(html, "<section>fallback</section>");
});

test("protected routes never resolve governed heroes", () => {
  for (const route of ["/", "/locations", "/rates", "/calculators", "/calculators/mortgage-payment"]) {
    assert.equal(isProtectedHeroRoute(route), true, route);
    assert.equal(resolvePublishableHero(route, approvedManifest(route)), null, route);
  }
});

test("approved synthetic fixture renders responsive governed hero markup", () => {
  const hero = resolvePublishableHero("/locations/texas/austin", approvedManifest());
  const html = renderGovernedHero(hero);
  assert.match(html, /data-governed-hero/);
  assert.match(html, /data-hero-variant="full_bleed_environmental_portrait"/);
  assert.match(html, /<source media="\(max-width: 760px\)" srcset="\/site\/assets\/test\/austin-hero-mobile\.webp"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /alt="A documented Austin neighborhood scene/);
  assert.match(html, /--focal-x:62%/);
  assert.match(html, /--mobile-focal-x:48%/);
});

test("decorative approved heroes render empty alt and escape copy", () => {
  const hero = resolvePublishableHero("/buy", approvedManifest("/buy", {
    page_type: "buy",
    hero_variant: "tall_diagonal_image_slab",
    decorative: true,
    alt_text: "",
    headline: "Compare <options>",
  }));
  const html = renderGovernedHero(hero);
  assert.match(html, /alt=""/);
  assert.match(html, /Compare &lt;options&gt;/);
});

test("motion requires publishable motion and poster assets", () => {
  const blocked = approvedManifest("/refinance", {
    page_type: "refinance",
    hero_variant: "wide_panoramic_band",
    has_motion: true,
    reduced_motion_behavior: "show_poster",
    motion_asset: { selection_status: "unselected", publishing_status: "prohibited" },
    poster_asset: { ...selectedAsset, asset_id: "poster", src: "/site/assets/test/poster.webp" },
  });
  const entry = createHeroManifestIndex(blocked).get("/refinance");
  assert.equal(heroPublishBlockReason(entry, blocked), "motion_asset_not_publishable");

  const approved = approvedManifest("/refinance", {
    page_type: "refinance",
    hero_variant: "wide_panoramic_band",
    has_motion: true,
    reduced_motion_behavior: "show_poster",
    motion_asset: { ...selectedAsset, asset_id: "motion", src: "/site/assets/test/motion.mp4" },
    poster_asset: { ...selectedAsset, asset_id: "poster", src: "/site/assets/test/poster.webp" },
  });
  const html = renderGovernedHero(resolvePublishableHero("/refinance", approved));
  assert.match(html, /<video class="governed-hero-motion" muted playsinline loop preload="none" poster="\/site\/assets\/test\/poster\.webp"/);
});

test("every approved composition variant renders an explicit governed variant marker", () => {
  for (const hero_variant of variants) {
    const route = `/test-${hero_variant}`;
    const hero = resolvePublishableHero(route, approvedManifest(route, {
      page_type: "buy",
      hero_variant,
    }));
    const html = renderGovernedHero(hero);
    assert.match(html, new RegExp(`data-hero-variant="${hero_variant}"`));
    assert.match(html, /class="governed-hero governed-hero--[a-z-]+ governed-hero--left_scrim"/);
  }
});

test("draft manifest candidate URLs never render through the governed hero API", () => {
  const candidateUrls = JSON.stringify(manifest).match(/https:\/\/[^"]+/g) || [];
  const html = renderGovernedHeroOrFallback("/locations/texas/austin", manifest, "<section>fallback</section>");
  assert.equal(html, "<section>fallback</section>");
  for (const url of candidateUrls.slice(0, 50)) {
    assert.doesNotMatch(html, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("provenance source_url is not treated as a deliverable image URL", () => {
  const route = "/loan-options/fha-loans";
  const sourceOnlyManifest = approvedManifest(route, {
    page_type: "loan_product",
    hero_variant: "circular_criteria_or_brand_field",
    desktop_asset: {
      selection_status: "selected",
      asset_id: "approved-stock-without-derivative",
      asset_origin: "stock",
      source_url: "https://www.pexels.com/photo/not-an-image-file/",
      rights_record: {
        creator_or_agency: "Example",
        license_name: "Example license",
        license_url: "https://example.com/license",
        acquired_at: "2026-07-22",
        usage_notes: "Approved for test only",
      },
    },
  });
  const entry = createHeroManifestIndex(sourceOnlyManifest).get(route);

  assert.equal(heroPublishBlockReason(entry, sourceOnlyManifest), "desktop_asset_missing_delivery_url");
  assert.equal(resolvePublishableHero(route, sourceOnlyManifest), null);
  const html = renderGovernedHeroOrFallback(route, sourceOnlyManifest, "<section>fallback</section>");
  assert.equal(html, "<section>fallback</section>");
  assert.doesNotMatch(html, /pexels\.com\/photo\/not-an-image-file/);
});

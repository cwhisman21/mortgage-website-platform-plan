const PROTECTED_ROUTES = Object.freeze([
  "/",
  "/locations",
  "/rates",
  "/calculators",
]);

const VARIANT_CLASS_BY_NAME = Object.freeze({
  full_bleed_environmental_portrait: "environmental",
  tall_diagonal_image_slab: "diagonal-slab",
  wide_panoramic_band: "panoramic-band",
  rotated_architectural_window: "rotated-window",
  circular_criteria_or_brand_field: "circular-field",
  layered_editorial_collage: "editorial-collage",
  media_left_editorial_panel: "media-panel",
  evidence_or_report_strip: "report-strip",
  vertical_human_portrait: "human-portrait",
  structured_search_or_planning_interface: "structured-search",
  horizon_composition: "horizon",
  stacked_planning_panels: "planning-panels",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeRoute(value) {
  const route = String(value || "/").trim() || "/";
  return route.length > 1 && route.endsWith("/") ? route.slice(0, -1) : route;
}

export function isProtectedHeroRoute(route) {
  const normalized = normalizeRoute(route);
  return PROTECTED_ROUTES.includes(normalized) || normalized.startsWith("/calculators/");
}

function entriesForManifest(manifest) {
  return Array.isArray(manifest?.entries) ? manifest.entries : [];
}

export function createHeroManifestIndex(manifest) {
  return new Map(
    entriesForManifest(manifest)
      .filter((entry) => entry?.route && entry?.hero)
      .map((entry) => [normalizeRoute(entry.route), entry]),
  );
}

function assetIsPublishable(asset) {
  return asset?.selection_status === "selected" && asset?.publishing_status !== "prohibited";
}

export function heroPublishBlockReason(entry, manifest) {
  if (!entry?.hero) return "missing_hero_entry";
  if (isProtectedHeroRoute(entry.route)) return "protected_route";
  if (manifest?.status !== "approved") return "manifest_not_approved";
  if (entry.asset_selection_status !== "selected") return "entry_asset_not_selected";
  if (entry.publishing_status === "prohibited") return "entry_publish_prohibited";
  if (entry.hero.review_status !== "approved") return "hero_not_approved";
  if (!assetIsPublishable(entry.hero.desktop_asset)) return "desktop_asset_not_publishable";
  if (!assetUrl(entry.hero.desktop_asset)) return "desktop_asset_missing_delivery_url";
  if (entry.hero.mobile_asset && !assetIsPublishable(entry.hero.mobile_asset)) return "mobile_asset_not_publishable";
  if (entry.hero.mobile_asset && !assetUrl(entry.hero.mobile_asset)) return "mobile_asset_missing_delivery_url";
  if (entry.hero.has_motion) {
    if (!assetIsPublishable(entry.hero.motion_asset)) return "motion_asset_not_publishable";
    if (!assetIsPublishable(entry.hero.poster_asset)) return "poster_asset_not_publishable";
    if (!assetUrl(entry.hero.motion_asset)) return "motion_asset_missing_delivery_url";
    if (!assetUrl(entry.hero.poster_asset)) return "poster_asset_missing_delivery_url";
    if (entry.hero.reduced_motion_behavior !== "show_poster") return "reduced_motion_missing_poster";
  }
  return "";
}

export function resolvePublishableHero(route, manifest) {
  if (!manifest || isProtectedHeroRoute(route)) return null;
  const entry = createHeroManifestIndex(manifest).get(normalizeRoute(route));
  return heroPublishBlockReason(entry, manifest) ? null : entry.hero;
}

function assetUrl(asset) {
  return asset?.src || asset?.url || asset?.path || asset?.localPath || "";
}

function sourceMarkup(hero) {
  const desktop = assetUrl(hero.desktop_asset);
  const mobile = assetUrl(hero.mobile_asset);
  if (!desktop) return "";
  const focalDesktop = hero.focal_point_desktop || { x: 0.5, y: 0.5 };
  const focalMobile = hero.focal_point_mobile || focalDesktop;
  const alt = hero.decorative ? "" : hero.alt_text;
  return `
    <picture class="governed-hero-media" style="--focal-x:${Number(focalDesktop.x) * 100}%;--focal-y:${Number(focalDesktop.y) * 100}%;--mobile-focal-x:${Number(focalMobile.x) * 100}%;--mobile-focal-y:${Number(focalMobile.y) * 100}%">
      ${mobile ? `<source media="(max-width: 760px)" srcset="${escapeHtml(mobile)}" />` : ""}
      <img src="${escapeHtml(desktop)}" alt="${escapeHtml(alt)}" loading="eager" decoding="async" fetchpriority="high" />
    </picture>`;
}

function motionMarkup(hero) {
  if (!hero.has_motion) return "";
  const motion = assetUrl(hero.motion_asset);
  const poster = assetUrl(hero.poster_asset);
  if (!motion || !poster) return "";
  return `
    <video class="governed-hero-motion" muted playsinline loop preload="none" poster="${escapeHtml(poster)}" aria-hidden="true">
      <source src="${escapeHtml(motion)}" />
    </video>`;
}

function ctaMarkup(cta) {
  const label = cta?.label_override || "Get started";
  return `<a class="button" href="#main">${escapeHtml(label)}</a>`;
}

export function renderGovernedHero(hero) {
  if (!hero) return "";
  const variantClass = VARIANT_CLASS_BY_NAME[hero.hero_variant] || "standard";
  return `
    <section class="governed-hero governed-hero--${escapeHtml(variantClass)} governed-hero--${escapeHtml(hero.contrast_mode || "none")}" data-governed-hero data-hero-variant="${escapeHtml(hero.hero_variant)}">
      ${sourceMarkup(hero)}
      ${motionMarkup(hero)}
      <div class="governed-hero-copy">
        <p class="eyebrow">${escapeHtml(hero.eyebrow)}</p>
        <h1>${escapeHtml(hero.headline)}</h1>
        <p class="lead">${escapeHtml(hero.dek)}</p>
        <div class="hero-actions">${ctaMarkup(hero.primary_cta)}</div>
      </div>
    </section>`;
}

export function renderGovernedHeroOrFallback(route, manifest, fallbackMarkup) {
  const hero = resolvePublishableHero(route, manifest);
  return hero ? renderGovernedHero(hero) : fallbackMarkup;
}

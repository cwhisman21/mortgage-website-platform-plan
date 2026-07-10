import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { fetchToCache } from "./core.mjs";

export const PEXELS_LICENSE_URL = "https://www.pexels.com/license/";
export const MEDIA_QUERIES = {
  home_values: ["American home exterior real estate", "residential houses neighborhood exterior"],
  housing_supply: ["new home construction", "apartment building exterior housing"],
  local_economy: ["American city business district", "people walking downtown business district"],
  loan_limits: ["mortgage paperwork calculator house", "home finance documents desk"],
};

const VERIFIED_MEDIA = [
  {
    providerAssetId: "29300161",
    photographer: "Aakash Makwana",
    photoPageUrl: "https://www.pexels.com/photo/aerial-view-of-suburban-homes-and-lush-trees-29300161/",
    baseImageUrl: "https://images.pexels.com/photos/29300161/pexels-photo-29300161.jpeg",
    theme: "home_values",
    alt: "Aerial view of suburban homes among mature trees",
  },
  {
    providerAssetId: "7937283",
    photographer: "Pavel Danilyuk",
    photoPageUrl: "https://www.pexels.com/photo/aerial-view-of-a-residential-housing-development-7937283/",
    baseImageUrl: "https://images.pexels.com/photos/7937283/pexels-photo-7937283.jpeg",
    theme: "housing_supply",
    alt: "Aerial view of a residential housing development",
  },
  {
    providerAssetId: "20473548",
    photographer: "Amanat Ali Warraich",
    photoPageUrl: "https://www.pexels.com/photo/apartment-buildings-under-construction-20473548/",
    baseImageUrl: "https://images.pexels.com/photos/20473548/pexels-photo-20473548.jpeg",
    theme: "housing_supply",
    alt: "Apartment buildings under construction",
  },
  {
    providerAssetId: "9672814",
    photographer: "angello",
    photoPageUrl: "https://www.pexels.com/photo/people-walking-on-the-street-9672814/",
    baseImageUrl: "https://images.pexels.com/photos/9672814/pexels-photo-9672814.jpeg",
    theme: "local_economy",
    alt: "People walking along a city street",
  },
  {
    providerAssetId: "8293750",
    photographer: "RDNE Stock project",
    photoPageUrl: "https://www.pexels.com/photo/gray-and-black-calculator-on-the-table-8293750/",
    baseImageUrl: "https://images.pexels.com/photos/8293750/pexels-photo-8293750.jpeg",
    theme: "loan_limits",
    alt: "Calculator on a table beside planning materials",
  },
  {
    providerAssetId: "8293779",
    photographer: "RDNE Stock project",
    photoPageUrl: "https://www.pexels.com/photo/gold-keys-on-the-calculator-8293779/",
    baseImageUrl: "https://images.pexels.com/photos/8293779/pexels-photo-8293779.jpeg",
    theme: "loan_limits",
    alt: "House keys resting on a calculator",
  },
  {
    providerAssetId: "32045958",
    photographer: "Jakub Zerdzicki",
    photoPageUrl: "https://www.pexels.com/photo/real-estate-keys-and-documents-with-house-models-34135038/",
    baseImageUrl: "https://images.pexels.com/photos/32045958/pexels-photo-32045958.jpeg",
    theme: "home_values",
    alt: "House models, keys, and documents arranged for real estate planning",
  },
];

export function createVerifiedMediaManifest(retrievedAt = "2026-07-10") {
  const assets = VERIFIED_MEDIA.map((asset, index) => ({
    id: `${asset.theme}-${String(index + 1).padStart(2, "0")}`,
    provider: "Pexels",
    providerAssetId: asset.providerAssetId,
    photographer: asset.photographer,
    photographerUrl: null,
    photoPageUrl: asset.photoPageUrl,
    imageUrl: `${asset.baseImageUrl}?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop`,
    localPath: `/site/assets/news/pexels-${asset.providerAssetId}.jpeg`,
    usageUrl: PEXELS_LICENSE_URL,
    retrievedAt,
    theme: asset.theme,
    articleTheme: asset.theme,
    locationScope: "non_local_theme",
    localityClaimAllowed: false,
    alt: asset.alt,
    focalPoint: "50% 50%",
    crop: { aspectRatio: "16:9", width: 1280, height: 720, fit: "crop" },
    width: 1280,
    height: 720,
    averageColor: null,
    approvalStatus: "approved",
  }));
  return {
    version: "location-news-media-v1",
    generatedAt: retrievedAt,
    providerCredit: {
      label: "Photos provided by Pexels",
      url: "https://www.pexels.com/",
      licenseUrl: PEXELS_LICENSE_URL,
      attributionRequired: false,
      creditIncluded: true,
    },
    themePools: Object.fromEntries(
      Object.keys(MEDIA_QUERIES).map((theme) => [theme, assets.filter((asset) => asset.theme === theme).map((asset) => asset.id)]),
    ),
    assets,
    refreshPolicy: "API candidates require human provenance and suitability approval before entering this manifest.",
  };
}

export function validateMediaAsset(asset) {
  const required = ["id", "provider", "providerAssetId", "photographer", "photoPageUrl", "imageUrl", "localPath", "usageUrl", "alt", "theme", "approvalStatus"];
  for (const field of required) {
    if (!asset[field]) throw new Error(`Media asset ${asset.id || "unknown"} missing ${field}`);
  }
  if (asset.provider !== "Pexels" || asset.usageUrl !== PEXELS_LICENSE_URL) throw new Error(`Media asset ${asset.id} has invalid Pexels provenance`);
  if (!/^\/site\/assets\/news\/pexels-\d+\.jpeg$/.test(asset.localPath)) throw new Error(`Media asset ${asset.id} has invalid local image path`);
  if (asset.approvalStatus !== "approved") throw new Error(`Media asset ${asset.id} is not approved`);
  if (asset.locationScope !== "non_local_theme" || asset.localityClaimAllowed !== false) throw new Error(`Media asset ${asset.id} may imply unsupported locality`);
  if (Math.abs(asset.width / asset.height - 16 / 9) > 0.01) throw new Error(`Media asset ${asset.id} is not 16:9`);
  return true;
}

export async function materializeMediaAssets({ assets, repoRoot, refresh = false } = {}) {
  const assetRoot = path.resolve(repoRoot, "site", "assets", "news");
  for (const asset of assets || []) {
    validateMediaAsset(asset);
    const destination = path.resolve(repoRoot, asset.localPath.replace(/^\//, ""));
    if (!destination.startsWith(assetRoot)) throw new Error(`Media asset ${asset.id} resolves outside the local asset directory`);
    await fetchToCache(asset.imageUrl, destination, { refresh });
  }
}

export function assignMedia(articleId, theme, assets, used = new Set()) {
  const pool = assets.filter((asset) => asset.theme === theme && !used.has(asset.id));
  const candidates = pool.length ? pool : assets.filter((asset) => asset.theme === theme);
  if (!candidates.length) throw new Error(`No approved media for theme ${theme}`);
  for (const asset of candidates) validateMediaAsset(asset);
  const hash = createHash("sha256").update(`${articleId}|${theme}`).digest();
  return candidates[hash.readUInt32BE(0) % candidates.length];
}

export async function loadMediaLibrary({ manifestPath, refresh = false, apiKey = process.env.PEXELS_API_KEY } = {}) {
  if (refresh && !apiKey) throw new Error("PEXELS_API_KEY is required with --refresh-media");
  let manifest;
  if (manifestPath) {
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  manifest ||= createVerifiedMediaManifest();
  for (const asset of manifest.assets) validateMediaAsset(asset);
  return {
    assetsById: Object.fromEntries(manifest.assets.map((asset) => [asset.id, asset])),
    themePools: manifest.themePools,
    providerCredit: manifest.providerCredit,
    manifest,
  };
}

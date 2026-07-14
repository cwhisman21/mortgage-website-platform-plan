import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicRouteManifest } from "./public-route-manifest.mjs";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const seed = readJson("mock-data/production-seed.json");
const editorialContent = readJson("mock-data/editorial-content.json");
const manifest = createPublicRouteManifest({ seed, editorialContent });

function matchRewrite(source, route) {
  if (source === route) return {};
  if (source.endsWith("/:path*")) {
    const prefix = source.slice(0, -"/:path*".length);
    if (!route.startsWith(`${prefix}/`)) return null;
    return { path: route.slice(prefix.length + 1) };
  }
  if (source.endsWith("/:slug")) {
    const prefix = source.slice(0, -"/:slug".length);
    const slug = route.startsWith(`${prefix}/`) ? route.slice(prefix.length + 1) : "";
    return slug && !slug.includes("/") ? { slug } : null;
  }
  return null;
}

function resolveRewrite(rewrites, route) {
  for (const rewrite of rewrites) {
    const params = matchRewrite(rewrite.source, route);
    if (!params) continue;
    let destination = rewrite.destination;
    for (const [key, value] of Object.entries(params)) destination = destination.replace(`:${key}*`, value).replace(`:${key}`, value);
    return { ...rewrite, destination };
  }
  return null;
}

test("Vercel rewrite ownership serves generated HTML at every clean non-news route", () => {
  const config = readJson("vercel.json");
  const rewrites = config.rewrites || [];

  assert.deepEqual(rewrites[0], {
    source: "/learning-center/market-news/:slug",
    destination: "/site/generated/learning-center/market-news/:slug.html",
  });
  assert.deepEqual(rewrites.find((rewrite) => rewrite.source === "/prequal/start"), {
    source: "/prequal/start",
    destination: "/site/generated/routes/prequal/start/index.html",
  });
  assert.equal(rewrites.some((rewrite) => rewrite.source === "/prequal/:path*"), false);

  for (const entry of manifest) {
    const resolved = resolveRewrite(rewrites, entry.route);
    assert.ok(resolved, `${entry.route} must have a Vercel rewrite owner`);
    const expected = entry.route === "/"
      ? "/site/index.html"
      : `/site/generated/routes${entry.route}/index.html`;
    assert.equal(resolved.destination, expected, `${entry.route} must preserve its clean URL while serving the owned document`);
  }

  const news = resolveRewrite(rewrites, "/learning-center/market-news/example-story");
  assert.equal(news.destination, "/site/generated/learning-center/market-news/example-story.html");
  assert.equal(
    rewrites.some((rewrite) => rewrite.source !== "/" && rewrite.destination === "/site/index.html"),
    false,
    "non-root public routes must not serve the homepage shell",
  );
});

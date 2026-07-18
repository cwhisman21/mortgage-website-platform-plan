import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const staticRouteSource = fs.readFileSync(new URL("./static-route-document.mjs", import.meta.url), "utf8");
const newsRouteSource = fs.readFileSync(new URL("./location-news-static.mjs", import.meta.url), "utf8");
const heroStyles = fs.readFileSync(new URL("./campaign-hero.css", import.meta.url), "utf8");

test("public headers use the supplied Snap Mortgage logo", () => {
  for (const source of [appSource, staticRouteSource, newsRouteSource]) {
    assert.match(source, /\/site\/assets\/images\/snap-mortgage\.png/);
    assert.match(source, /alt="Snap Mortgage"/);
  }
  assert.equal(fs.existsSync(new URL("./assets/images/snap-mortgage.png", import.meta.url)), true);
});

test("the supplied logo is displayed at readable desktop and mobile heights", () => {
  const headerSource = appSource.slice(appSource.indexOf("function header()"), appSource.indexOf("function footer()"));
  assert.doesNotMatch(headerSource, /Mortgage intelligence|brand-sub/i);
  assert.match(heroStyles, /\.brand-logo\s*\{[^}]*height:\s*72px;[^}]*width:\s*auto;[^}]*max-width:\s*100%;/s);
  assert.match(heroStyles, /@media \(max-width:\s*760px\)[\s\S]*?\.brand-logo\s*\{[^}]*height:\s*56px;[^}]*width:\s*auto;/s);
});

test("the deployed logo matches the supplied artwork", () => {
  const logo = fs.readFileSync(new URL("./assets/images/snap-mortgage.png", import.meta.url));
  const digest = createHash("sha256").update(logo).digest("hex");
  assert.equal(digest, "68f3ecd267b30579013721d57b1f30833d12b1c1231d32a5a703889f684706fe");
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const staticRouteSource = fs.readFileSync(new URL("./static-route-document.mjs", import.meta.url), "utf8");
const newsRouteSource = fs.readFileSync(new URL("./location-news-static.mjs", import.meta.url), "utf8");
const baseStyles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function generatedHtmlFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) generatedHtmlFiles(entryUrl, files);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryUrl);
  }
  return files;
}

test("public headers use the supplied Snap Mortgage logo", () => {
  for (const source of [appSource, staticRouteSource, newsRouteSource]) {
    assert.match(source, /\/site\/assets\/images\/snap-mortgage\.png/);
    assert.match(source, /alt="Snap Mortgage"/);
  }
  assert.match(appSource, /logo: "\/site\/assets\/images\/snap-mortgage\.png\?v=20260718-12"/);
  assert.equal(fs.existsSync(new URL("./assets/images/snap-mortgage.png", import.meta.url)), true);
});

test("the supplied logo is displayed at readable desktop and mobile heights", () => {
  const headerSource = appSource.slice(appSource.indexOf("function header()"), appSource.indexOf("function footer()"));
  assert.doesNotMatch(headerSource, /Mortgage intelligence|brand-sub/i);
  assert.match(baseStyles, /\.brand-logo\s*\{[^}]*height:\s*72px;[^}]*width:\s*auto;[^}]*max-width:\s*100%;/s);
  assert.match(baseStyles, /@media \(max-width:\s*760px\)[\s\S]*?\.brand-logo\s*\{[^}]*height:\s*56px;[^}]*width:\s*auto;/s);
});

test("every generated public document uses the supplied logo", () => {
  const files = generatedHtmlFiles(new URL("./generated/", import.meta.url));
  assert.equal(files.length, 4858);

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, /snap-loans\.svg|alt="Snap Loans"/, file.pathname);
    assert.match(html, /\/site\/assets\/images\/snap-mortgage\.png/, file.pathname);
    assert.match(html, /alt="Snap Mortgage"/, file.pathname);
  }
});

test("the deployed logo matches the supplied artwork", () => {
  const logo = fs.readFileSync(new URL("./assets/images/snap-mortgage.png", import.meta.url));
  const digest = createHash("sha256").update(logo).digest("hex");
  assert.equal(digest, "39d7dfbd5b41d87b0d8f85f29235580bec2e1322c17e53d01303c431dacb964e");
});

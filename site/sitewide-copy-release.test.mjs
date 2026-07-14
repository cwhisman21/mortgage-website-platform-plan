import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("./editorial-renderer.mjs", import.meta.url), "utf8");

const forbiddenPublicPhrases = [
  /\bdummy\b/i,
  /a useful mortgage article/i,
  /this article connects/i,
  /the reader can/i,
  /read this with the market/i,
  /a product page educates/i,
  /products route into calculators/i,
  /articles link back/i,
  />\s*topic hub\s*</i,
  /the next step stays clear/i,
  /the article stays readable/i,
  /source notes stay close/i,
  /content moves readers/i,
  /browse this topic/i,
  /current (?:dummy|mock|placeholder) inputs/i,
];

test("public renderers contain no forbidden placeholder or meta-editorial copy", () => {
  const publicRendererSource = `${appSource}\n${rendererSource}`;
  const failures = forbiddenPublicPhrases
    .filter((pattern) => pattern.test(publicRendererSource))
    .map((pattern) => pattern.source);
  assert.deepEqual(failures, [], `Forbidden public-copy patterns remain:\n${failures.join("\n")}`);
});


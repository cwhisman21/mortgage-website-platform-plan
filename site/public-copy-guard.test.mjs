import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("public templates do not expose internal planning or review labels", () => {
  const forbiddenVisiblePhrases = [
    "Internal system",
    "Compliance review required",
    "Editorial draft",
    "Editorial trust",
    "Review status",
    "Article orientation",
    "Article sections",
    "Compliance-aware CTA",
    "Available sections",
    "How to use locations",
    "How to use this page",
    "Content graph",
    "Editorial graph",
    "City dashboard",
    "Answer unlock",
    "Trust layer",
    "CMS object",
    "In the live experience",
    "static page",
    "simulated in this build",
    "would open next",
  ];

  for (const phrase of forbiddenVisiblePhrases) {
    assert.equal(appSource.includes(phrase), false, `public template contains ${phrase}`);
  }
});

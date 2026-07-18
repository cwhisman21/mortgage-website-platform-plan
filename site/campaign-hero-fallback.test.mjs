import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { renderCampaignHeroCardLayer } from "./campaign-hero-card-layer.mjs";

const heroSource = fs.readFileSync(new URL("./campaign-hero.mjs", import.meta.url), "utf8");

test("campaign comparison remains usable before enhancement", () => {
  const html = renderCampaignHeroCardLayer();
  const stagedOpenings = [...html.matchAll(/<(?:article|a|p)\b[^>]*(?:data-reveal-frame|data-post-reveal-(?:cta|disclosure))[^>]*>/g)]
    .map(([opening]) => opening);

  assert.equal(stagedOpenings.length, 5);
  for (const opening of stagedOpenings) {
    assert.doesNotMatch(opening, /aria-hidden="true"/);
    assert.doesNotMatch(opening, /\sinert(?:\s|>)/);
    assert.doesNotMatch(opening, /tabindex="-1"/);
  }
  assert.match(html, /href="\/prequal\/start"/);
});

test("campaign enhancement has an explicit reversible lifecycle", () => {
  assert.match(heroSource, /track\.classList\.add\("is-enhanced"\)/);
  assert.match(heroSource, /track\.classList\.remove\("is-enhanced"\)/);
});

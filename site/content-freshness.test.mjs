import test from "node:test";
import assert from "node:assert/strict";

import {
  FACTUAL_AUDIT_DATE,
  renderContentFreshness,
  resolveContentFreshness,
} from "./content-freshness.mjs";

test("articles and news resolve their own updated or published dates", () => {
  const articleFreshness = resolveContentFreshness({
    type: "article",
    item: { publishedAt: "2026-07-09", updatedAt: "2026-07-12" },
  });
  const newsFreshness = resolveContentFreshness({
    type: "newsArticle",
    item: { publishedAt: "2026-07-10" },
  });

  assert.equal(articleFreshness.date, "2026-07-12");
  assert.equal(articleFreshness.basis, "article-updated-at");
  assert.equal(newsFreshness.date, "2026-07-10");
  assert.equal(newsFreshness.basis, "article-published-at");
});

test("public topic hubs resolve the canonical hub lastUpdated", () => {
  const freshness = resolveContentFreshness(
    { type: "blog", item: { lastUpdated: "2026-07-01" } },
    { canonicalTopicHub: { public: true, lastUpdated: "2026-07-13" } },
  );

  assert.equal(freshness.date, "2026-07-13");
  assert.equal(freshness.basis, "topic-hub-last-updated");
});

test("state and city routes prefer the governing evidence date and otherwise use the snapshot date", () => {
  const stateFreshness = resolveContentFreshness({
    type: "state",
    item: { marketSnapshot: { lastUpdated: "2026-07-10" } },
  });
  const cityFreshness = resolveContentFreshness(
    { type: "city", item: { marketSnapshot: { lastUpdated: "2026-07-08" } } },
    { governingEvidence: { reviewedAt: "2026-07-11" } },
  );

  assert.equal(stateFreshness.date, "2026-07-10");
  assert.equal(stateFreshness.basis, "market-snapshot-last-updated");
  assert.equal(cityFreshness.date, "2026-07-11");
  assert.equal(cityFreshness.basis, "governing-evidence-date");
});

test("a location without dated market evidence may show only the factual audit date", () => {
  const freshness = resolveContentFreshness(
    { type: "city", item: { marketSnapshot: {} } },
    { evergreen: true },
  );

  assert.equal(freshness.date, FACTUAL_AUDIT_DATE);
  assert.equal(freshness.basis, "factual-audit-date");
});

test("product routes resolve the product copy version instead of an unrelated page date", () => {
  const freshness = resolveContentFreshness(
    { type: "product", item: { lastUpdated: "2026-07-01" } },
    { productCopyBundle: { version: "2026-07-13" } },
  );

  assert.equal(freshness.date, "2026-07-13");
  assert.equal(freshness.basis, "product-copy-version");
});

test("the seller workspace resolves its own reviewed date", () => {
  const freshness = resolveContentFreshness({
    type: "seller",
    item: { updatedAt: "2026-07-16" },
  });

  assert.equal(freshness.date, "2026-07-16");
  assert.equal(freshness.basis, "seller-page-updated-at");
});

test("only explicitly evergreen routes may use the factual audit date", () => {
  assert.equal(FACTUAL_AUDIT_DATE, "2026-07-13");
  assert.equal(resolveContentFreshness({ type: "directory", item: {} }), null);

  const freshness = resolveContentFreshness(
    { type: "directory", item: {} },
    { evergreen: true },
  );

  assert.equal(freshness.date, FACTUAL_AUDIT_DATE);
  assert.equal(freshness.basis, "factual-audit-date");
});

test("the shared renderer resolves a route and limits what Last updated means", () => {
  const html = renderContentFreshness(
    { type: "product", item: {} },
    { productCopyBundle: { version: "2026-07-13" } },
  );

  assert.match(html, /Last updated/);
  assert.match(html, /datetime="2026-07-13"/);
  assert.match(html, /July 13, 2026/);
  assert.match(html, /Product guidance reviewed through this date/);
  assert.match(html, /Time-sensitive figures show their own as-of dates/i);
  assert.doesNotMatch(html, /all figures|current rates|validated figures/i);
});

test("missing or malformed evidence renders no fabricated freshness date", () => {
  assert.equal(renderContentFreshness(), "");
  assert.equal(renderContentFreshness({ type: "article", item: { updatedAt: "not-a-date" } }), "");
  assert.equal(renderContentFreshness({ type: "article", item: { updatedAt: "2026-07-13Tgarbage" } }), "");
  assert.equal(resolveContentFreshness({ type: "product", item: {} }, { productCopyBundle: { version: "v2" } }), null);
  assert.equal(renderContentFreshness({ date: "2026-07-13", basis: 'unsafe" onclick="alert(1)' }), "");
});

test("the evergreen fallback explains the scope in borrower-facing language", () => {
  const html = renderContentFreshness(
    { type: "directory", item: {} },
    { evergreen: true },
  );

  assert.match(html, /Page guidance reviewed through this date/);
  assert.match(html, /Time-sensitive figures show their own as-of dates/i);
});

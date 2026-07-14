import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  applyArticleAuthorIds,
  mergeEditorialArticles,
  normalizeEditorialContent,
  renderContributorArchiveMarkup,
  renderContributorBylineMarkup,
} from "./editorial-content.mjs";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const contributorsRaw = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/contributors.json", import.meta.url), "utf8"),
);
const topicHubsRaw = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/topic-hubs.json", import.meta.url), "utf8"),
);
const compiledRaw = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial-content.json", import.meta.url), "utf8"),
);
const productionSeed = JSON.parse(
  fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"),
);

const editorialContent = normalizeEditorialContent({
  contributors: contributorsRaw,
  topicHubs: topicHubsRaw,
});

function count(markup, fragment) {
  return markup.split(fragment).length - 1;
}

test("boot fetches the compiled bundle and merges it before fallback ownership", () => {
  const bootStart = source.indexOf("async function boot(");
  const bootEnd = source.indexOf("async function fetchOptionalJson(", bootStart);
  const bootSource = source.slice(bootStart, bootEnd);

  assert.ok(bootStart >= 0 && bootEnd > bootStart, "boot function is missing");
  assert.ok(bootSource.includes("fetchOptionalJson(EDITORIAL_CONTENT_URL)"));
  assert.ok(bootSource.includes("mergeEditorialArticles("));
  assert.ok(
    bootSource.indexOf("mergeEditorialArticles(") < bootSource.indexOf("applyArticleAuthorIds("),
    "canonical overlays must merge before structural author fallbacks",
  );

  const merged = mergeEditorialArticles(productionSeed.articles, compiledRaw);
  const enriched = applyArticleAuthorIds(editorialContent, merged);
  const dallas = enriched.find(({ id }) => id === "article-dallas-market-update");
  const texasTax = enriched.find(({ id }) => id === "article-texas-tax-guide");

  assert.equal(dallas.authorId, "contributor-jordan-avery");
  assert.equal(dallas.publishedAt, "2026-07-13");
  assert.ok(dallas.sections.length >= 3);
  assert.equal(texasTax.authorId, "contributor-priya-bennett");
});

test("contributor archives render every authorId-assigned article", () => {
  const contributor = editorialContent.contributors.find(
    ({ id }) => id === "contributor-marcus-lane",
  );
  const assigned = Array.from({ length: 9 }, (_, index) => ({
    id: `article-${index + 1}`,
    authorId: contributor.id,
    title: `Article ${index + 1}`,
  }));
  const articles = [
    ...assigned,
    { id: "article-other", authorId: "contributor-maya-brooks", title: "Other" },
  ];

  const markup = renderContributorArchiveMarkup(
    editorialContent,
    articles,
    contributor,
    (article) => `<article data-article-id="${article.id}">${article.title}</article>`,
  );

  assert.equal(count(markup, "data-article-id="), assigned.length);
  for (const article of assigned) assert.ok(markup.includes(article.id));
  assert.doesNotMatch(markup, /article-other/);
});

test("linked contributor bylines use one profile link for portrait, name, and real date", () => {
  const article = {
    id: "article-rates",
    type: "guide",
    authorId: "contributor-rowan-hale",
    updatedAt: "2026-07-13",
  };

  for (const compact of [true, false]) {
    const markup = renderContributorBylineMarkup(article, editorialContent.contributors, {
      compact,
      routeHref: (href) => `#${href}`,
    });

    assert.equal(count(markup, "<a "), 1);
    assert.equal(count(markup, "</a>"), 1);
    assert.match(markup, /href="#\/learning-center\/authors\/rowan-hale"/);
    assert.match(markup, /<a [^>]*>[\s\S]*<img [^>]*rowan-hale\.jpg[\s\S]*Rowan Hale[\s\S]*<time>Last updated Jul 13, 2026<\/time>[\s\S]*<\/a>/);
  }
});

test("date-only contributor bylines stay on the same calendar day east of UTC", () => {
  const moduleUrl = new URL("./editorial-content.mjs", import.meta.url).href;
  const script = `
    import { renderContributorBylineMarkup } from ${JSON.stringify(moduleUrl)};
    const article = { authorId: "contributor-test", publishedAt: "2026-07-10" };
    const contributors = [{ id: "contributor-test", name: "Test Author", title: "Contributor", route: "/learning-center/authors/test-author", portrait: { src: "/site/assets/contributors/test-author.jpg", alt: "Test Author" } }];
    process.stdout.write(renderContributorBylineMarkup(article, contributors));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { ...process.env, TZ: "Asia/Tokyo" },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Published Jul 10, 2026/);
  assert.doesNotMatch(result.stdout, /Jul 9, 2026/);
});

test("contributor bylines reject unsafe profile and portrait URLs", () => {
  const markup = renderContributorBylineMarkup(
    { authorId: "contributor-hostile", publishedAt: "2026-07-10" },
    [{
      id: "contributor-hostile",
      name: "Hostile Author",
      title: "Contributor",
      route: "javascript:alert(1)",
      portrait: { src: "javascript:alert(2)", alt: "Hostile Author" },
    }],
  );

  assert.doesNotMatch(markup, /javascript:/i);
  assert.doesNotMatch(markup, /<a\b/i);
  assert.match(markup, /data:image\/svg\+xml/);
});

test("Snap Mortgage fallback markup stays fully unlinked and never invents a date", () => {
  const markup = renderContributorBylineMarkup(
    { id: "article-unassigned" },
    editorialContent.contributors,
  );

  assert.equal(count(markup, "<a "), 0);
  assert.equal(count(markup, "<time>"), 0);
  assert.match(markup, /Snap Mortgage/);
  assert.match(markup, /Published by Snap Mortgage/);
  assert.doesNotMatch(markup, /Updated July 2026/);
});

test("market bylines expose a trusted as-of date and omit it when absent", () => {
  const dated = renderContributorBylineMarkup(
    {
      id: "article-market",
      type: "local_market_update",
      authorId: "contributor-maya-brooks",
      asOf: "2026-07-09",
      publishedAt: "2026-07-13",
    },
    editorialContent.contributors,
  );
  const undated = renderContributorBylineMarkup(
    {
      id: "article-market-undated",
      type: "local_market_update",
      authorId: "contributor-maya-brooks",
    },
    editorialContent.contributors,
  );

  assert.match(dated, /<time>As of Jul 9, 2026<\/time>/);
  assert.equal(count(undated, "<time>"), 0);
});

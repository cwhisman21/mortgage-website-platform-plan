import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTRIBUTOR_DISCLOSURE,
  articlesForContributor,
  buildContributorArticleIndex,
  contributorById,
  mergeEditorialArticles,
  normalizeEditorialContent,
  normalizeEditorialContentWithFallback,
  renderContributorArchiveMarkup,
  renderContributorBylineMarkup,
  renderBylineModel,
  resolveArticleAuthor,
  applyArticleAuthorIds,
} from "./editorial-content.mjs";

const contributorsRaw = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/contributors.json", import.meta.url), "utf8"),
);
const topicHubsRaw = JSON.parse(
  fs.readFileSync(new URL("../mock-data/editorial/topic-hubs.json", import.meta.url), "utf8"),
);
const productionSeed = JSON.parse(
  fs.readFileSync(new URL("../mock-data/production-seed.json", import.meta.url), "utf8"),
);
const locationNewsIndex = JSON.parse(
  fs.readFileSync(new URL("../mock-data/location-news-index.json", import.meta.url), "utf8"),
);

const expectedRoster = [
  ["contributor-rowan-hale", "rowan-hale", "Rowan Hale", "Rates and economy"],
  ["contributor-maya-brooks", "maya-brooks", "Maya Brooks", "Local markets"],
  ["contributor-jordan-avery", "jordan-avery", "Jordan Avery", "Home buying"],
  ["contributor-elena-park", "elena-park", "Elena Park", "Refinancing and equity"],
  ["contributor-marcus-lane", "marcus-lane", "Marcus Lane", "Loan programs"],
  ["contributor-priya-bennett", "priya-bennett", "Priya Bennett", "Mortgage data"],
];

const forbiddenKeys = [
  "nmls",
  "license",
  "licenses",
  "email",
  "phone",
  "contact",
  "social",
  "socials",
  "linkedin",
  "twitter",
  "x",
  "credentials",
  "education",
  "awards",
  "testimonials",
];

test("normalizes the approved six-contributor registry", () => {
  const content = normalizeEditorialContent({
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  });

  assert.deepEqual(
    content.contributors.map(({ id, slug, name, beat }) => [id, slug, name, beat]),
    expectedRoster,
  );
  assert.equal(new Set(content.contributors.map(({ id }) => id)).size, 6);
  assert.equal(new Set(content.contributors.map(({ slug }) => slug)).size, 6);
  assert.equal(new Set(content.contributors.map(({ route }) => route)).size, 6);

  for (const contributor of content.contributors) {
    assert.equal(contributor.title, "Snap Mortgage Editorial Contributor");
    assert.equal(contributor.route, `/learning-center/authors/${contributor.slug}`);
    assert.equal(contributor.portrait.src, `/site/assets/contributors/${contributor.slug}.jpg`);
    assert.match(contributor.portrait.alt, new RegExp(contributor.name));
    assert.ok(contributor.shortBio.length > 40);
    assert.ok(contributor.bio.length > contributor.shortBio.length);
    assert.ok(contributor.topics.length >= 3);
    assert.ok(contributor.beat.length > 4);
    for (const key of forbiddenKeys) {
      assert.equal(Object.hasOwn(contributor, key), false, `${contributor.name} exposes forbidden ${key}`);
    }
  }
});

test("creates profile route records for every contributor", () => {
  const content = normalizeEditorialContent(contributorsRaw);

  assert.deepEqual(
    content.authorRoutes.map(({ route, type, item }) => [route, type, item.id]),
    expectedRoster.map(([id, slug]) => [`/learning-center/authors/${slug}`, "contributor", id]),
  );
});

test("normalizes structural contributor hubs and public Learning Center hubs", () => {
  const content = normalizeEditorialContent({
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  });

  assert.deepEqual(
    content.topicHubs.map(({ id }) => id),
    [
      "topic-hub-rates-economy",
      "topic-hub-local-markets",
      "topic-hub-home-buying",
      "topic-hub-refinancing-equity",
      "topic-hub-loan-programs",
      "topic-hub-mortgage-data",
      "blog-local-market-updates",
      "blog-buying-a-home",
      "blog-refinance",
      "blog-fha-loans",
      "blog-va-loans",
      "blog-jumbo-loans",
      "blog-home-equity",
      "blog-taxes-insurance",
      "blog-editorial-team",
    ],
  );
  for (const hub of content.topicHubs.slice(0, 6)) {
    assert.equal(hub.public, false);
    assert.equal(Object.hasOwn(hub, "body"), false);
    assert.equal(Object.hasOwn(hub, "heroCopy"), false);
  }
  for (const hub of content.topicHubs.slice(6)) {
    assert.equal(hub.public, true);
    assert.equal(Object.hasOwn(hub, "body"), false);
    assert.equal(Object.hasOwn(hub, "heroCopy"), false);
  }
});

test("derives related articles from authorId only", () => {
  const content = normalizeEditorialContent(contributorsRaw);
  const articles = [
    { id: "a", authorId: "contributor-rowan-hale", title: "Rates", route: "/a" },
    { id: "b", authorId: "contributor-maya-brooks", title: "Local", route: "/b" },
    { id: "c", authorId: "contributor-rowan-hale", title: "Economy", route: "/c" },
    { id: "d", title: "No author", route: "/d" },
  ];

  assert.deepEqual(
    articlesForContributor(content, articles, "contributor-rowan-hale").map(({ id }) => id),
    ["a", "c"],
  );
});

test("indexes editorial and location-news articles once for performant contributor archives", () => {
  const content = normalizeEditorialContent({
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  });
  const editorialArticles = applyArticleAuthorIds(content, productionSeed.articles);
  const index = buildContributorArticleIndex(editorialArticles, locationNewsIndex.articles);

  for (const contributor of content.contributors) {
    const expected = [...editorialArticles, ...locationNewsIndex.articles]
      .filter(({ authorId }) => authorId === contributor.id);
    const indexed = articlesForContributor(content, index, contributor.id);

    assert.equal(indexed.length, expected.length, contributor.name);
    if (locationNewsIndex.articles.some(({ authorId }) => authorId === contributor.id)) {
      assert.ok(indexed.some(({ route }) => route.startsWith("/learning-center/market-news/")), contributor.name);
    }
  }

  const rowan = contributorById(content, "contributor-rowan-hale");
  const rowanArticles = articlesForContributor(content, index, rowan.id);
  const markup = renderContributorArchiveMarkup(
    content,
    index,
    rowan,
    (article) => `<a data-archive-article href="${article.route}">${article.title}</a>`,
    { limit: 12, showCount: true },
  );

  assert.equal((markup.match(/data-archive-article/g) || []).length, 12);
  assert.match(markup, new RegExp(`data-contributor-article-count="${rowanArticles.length}"`));
  assert.match(markup, new RegExp(`Showing 12 of ${rowanArticles.length}`));
  assert.match(markup, /href="\/learning-center\/market-news\//);
});

test("applies structural article ownership without editing base article records", () => {
  const content = normalizeEditorialContent({
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  });
  const baseArticles = [
    { id: "article-austin-market-update", title: "Austin", route: "/a" },
    { id: "article-fha-basics", title: "FHA", route: "/fha", authorId: "contributor-marcus-lane" },
    { id: "article-not-in-overlay", title: "Unassigned", route: "/none" },
  ];

  const enriched = applyArticleAuthorIds(content, baseArticles);

  assert.equal(enriched[0].authorId, "contributor-maya-brooks");
  assert.equal(enriched[1].authorId, "contributor-marcus-lane");
  assert.equal(enriched[2].authorId, "");
  assert.equal(Object.hasOwn(baseArticles[0], "authorId"), false);
});

test("merges canonical article overlays before applying fallback ownership", () => {
  const content = normalizeEditorialContent({
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  });
  const baseArticles = [
    {
      id: "article-dallas-market-update",
      title: "Base Dallas title",
      route: "/learning-center/dallas-market-update",
      cityIds: ["city-dallas-tx"],
    },
    {
      id: "article-texas-tax-guide",
      title: "Base tax title",
      route: "/learning-center/texas-tax-guide",
    },
  ];
  const overlay = {
    articles: [
      {
        id: "article-dallas-market-update",
        title: "Canonical Dallas title",
        authorId: "contributor-jordan-avery",
        publishedAt: "2026-07-13",
        summary: "Canonical borrower-facing summary.",
        sections: [{ heading: "Payment context", body: "Canonical article body." }],
      },
    ],
  };

  const merged = mergeEditorialArticles(baseArticles, overlay);
  const enriched = applyArticleAuthorIds(content, merged);

  assert.deepEqual(enriched[0], {
    ...baseArticles[0],
    ...overlay.articles[0],
  });
  assert.equal(enriched[0].authorId, "contributor-jordan-avery");
  assert.equal(enriched[0].publishedAt, "2026-07-13");
  assert.equal(enriched[0].summary, "Canonical borrower-facing summary.");
  assert.deepEqual(enriched[0].sections, overlay.articles[0].sections);
  assert.equal(enriched[1].authorId, "contributor-maya-brooks");
  assert.equal(baseArticles[0].title, "Base Dallas title");
  assert.equal(Object.hasOwn(baseArticles[0], "authorId"), false);
});

test("ignores missing or malformed article overlays", () => {
  const baseArticles = [{ id: "article-a", title: "Base title" }];

  assert.deepEqual(mergeEditorialArticles(baseArticles, null), baseArticles);
  assert.deepEqual(mergeEditorialArticles(baseArticles, { articles: "invalid" }), baseArticles);
  assert.notEqual(mergeEditorialArticles(baseArticles, null)[0], baseArticles[0]);
});

test("falls back to standalone registries when the compiled bundle is missing or invalid", () => {
  const fallbackRaw = {
    contributors: contributorsRaw,
    topicHubs: topicHubsRaw,
  };

  const missing = normalizeEditorialContentWithFallback(null, fallbackRaw);
  const invalid = normalizeEditorialContentWithFallback(
    {
      contributors: [contributorsRaw.contributors[0], contributorsRaw.contributors[0]],
      topicHubs: topicHubsRaw,
    },
    fallbackRaw,
  );

  assert.deepEqual(missing.contributors.map(({ id }) => id), expectedRoster.map(([id]) => id));
  assert.deepEqual(invalid.contributors.map(({ id }) => id), expectedRoster.map(([id]) => id));
  assert.equal(invalid.topicHubs.length, topicHubsRaw.topicHubs.length);
});

test("resolves bylines with linked contributors and safe Snap fallback", () => {
  const content = normalizeEditorialContent(contributorsRaw);
  const article = {
    id: "article-rates",
    authorId: "contributor-rowan-hale",
    title: "Rate guide",
    route: "/learning-center/rates",
    updatedAt: "2026-07-13",
  };

  assert.equal(contributorById(content, "contributor-rowan-hale").name, "Rowan Hale");
  assert.equal(resolveArticleAuthor(article, content.contributors).name, "Rowan Hale");
  assert.deepEqual(renderBylineModel(article, content.contributors), {
    name: "Rowan Hale",
    title: "Snap Mortgage Editorial Contributor",
    href: "/learning-center/authors/rowan-hale",
    portraitSrc: "/site/assets/contributors/rowan-hale.jpg",
    portraitAlt: "Rowan Hale, Snap Mortgage editorial contributor",
    dateLabel: "Updated Jul 13, 2026",
    isFallback: false,
  });

  const fallback = renderBylineModel({ id: "missing", publishedAt: "2026-07-10" }, content.contributors);
  assert.equal(fallback.name, "Snap Mortgage");
  assert.equal(fallback.title, "Published by Snap Mortgage");
  assert.equal(fallback.href, "");
  assert.match(fallback.portraitSrc, /^data:image\/svg\+xml/);
  assert.equal(fallback.portraitAlt, "Snap Mortgage editorial attribution");
  assert.equal(fallback.dateLabel, "Published Jul 10, 2026");
  assert.equal(fallback.isFallback, true);
});

test("full named bylines disclose the Snap editorial voice without a licensing claim", () => {
  const content = normalizeEditorialContent(contributorsRaw);
  const article = {
    authorId: "contributor-maya-brooks",
    publishedAt: "2026-07-10",
  };

  const full = renderContributorBylineMarkup(article, content.contributors);
  const compact = renderContributorBylineMarkup(article, content.contributors, { compact: true });

  assert.equal(CONTRIBUTOR_DISCLOSURE, "Snap editorial voice, not a loan officer or licensed mortgage professional.");
  assert.match(full, /Snap editorial voice, not a loan officer or licensed mortgage professional\./);
  assert.doesNotMatch(full, /human|avatar/i);
  assert.doesNotMatch(compact, /licensed mortgage professional/i);
});

test("keeps missing and invalid article dates undisclosed", () => {
  const content = normalizeEditorialContent(contributorsRaw);

  assert.equal(renderBylineModel({ id: "undated" }, content.contributors).dateLabel, "");
  assert.equal(
    renderBylineModel({ id: "invalid", updatedAt: "not-a-date" }, content.contributors).dateLabel,
    "",
  );
});

test("uses explicit market asOf dates without relabeling publication dates", () => {
  const content = normalizeEditorialContent(contributorsRaw);
  const marketArticle = {
    id: "market-update",
    type: "local_market_update",
    authorId: "contributor-maya-brooks",
    asOf: "2026-07-09",
    publishedAt: "2026-07-13",
  };

  assert.equal(
    renderBylineModel(marketArticle, content.contributors).dateLabel,
    "As of Jul 9, 2026",
  );
  assert.equal(
    renderBylineModel(
      { ...marketArticle, asOf: undefined },
      content.contributors,
    ).dateLabel,
    "Published Jul 13, 2026",
  );
});

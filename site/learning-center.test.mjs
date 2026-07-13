import test from "node:test";
import assert from "node:assert/strict";
import { buildLearningCenterModel } from "./learning-center.mjs";

const seed = {
  blogPages: [
    {
      id: "blog-learning-center-home",
      route: "/learning-center",
      featuredArticleIds: ["article-featured", "article-missing"],
    },
    {
      id: "blog-buying-a-home",
      name: "Buying a Home",
      route: "/learning-center/buying-a-home",
    },
    {
      id: "blog-editorial-team",
      name: "Editorial Team",
      route: "/learning-center/editorial-team",
    },
  ],
  articles: [
    {
      id: "article-featured",
      title: "Featured",
      route: "/learning-center/featured",
    },
    {
      id: "article-next",
      title: "Next",
      route: "/learning-center/next",
    },
  ],
  calculators: [
    {
      id: "calc-payment",
      name: "Mortgage Payment Calculator",
      route: "/calculators/mortgage-payment",
    },
  ],
  products: [
    {
      id: "product-va",
      name: "VA Loans",
      route: "/loan-options/va-loans",
    },
    {
      id: "product-purchase",
      name: "Home Purchase Loans",
      route: "/buy",
    },
    {
      id: "product-fha",
      name: "FHA Loans",
      route: "/loan-options/fha-loans",
    },
    {
      id: "product-refinance",
      name: "Refinance",
      route: "/refinance",
    },
    {
      id: "product-jumbo",
      name: "Jumbo Loans",
      route: "/loan-options/jumbo-loans",
    },
  ],
};

test("builds navigation tags from every canonical topic", () => {
  const model = buildLearningCenterModel(seed);

  assert.deepEqual(model.tags.map(({ id }) => id), [
    "blog-buying-a-home",
    "blog-editorial-team",
  ]);
});

test("limits Learning Center search to canonical topics and articles", () => {
  const model = buildLearningCenterModel({
    ...seed,
    states: [{ id: "state-al", name: "Alabama" }],
  });

  assert.deepEqual(model.searchItems.map(({ id }) => id), [
    "blog-buying-a-home",
    "blog-editorial-team",
    "article-featured",
    "article-next",
  ]);
});

test("keeps Editorial Team out of the borrower topic-card grid", () => {
  const model = buildLearningCenterModel(seed);

  assert.deepEqual(model.topicCards.map(({ id }) => id), [
    "blog-buying-a-home",
  ]);
});

test("resolves featured IDs, skips missing IDs, and de-duplicates additional articles", () => {
  const model = buildLearningCenterModel(seed);

  assert.deepEqual(model.featuredArticles.map(({ id }) => id), [
    "article-featured",
  ]);
  assert.deepEqual(model.additionalArticles.map(({ id }) => id), [
    "article-next",
  ]);
});

test("preserves calculators and selects the four approved loan paths in approved order", () => {
  const model = buildLearningCenterModel(seed);

  assert.deepEqual(model.calculators, seed.calculators);
  assert.deepEqual(model.loanPaths.map(({ id }) => id), [
    "product-purchase",
    "product-refinance",
    "product-fha",
    "product-va",
  ]);
});

test("includes contributor directory data and author routes without adding topic cards", () => {
  const editorialContent = {
    contributors: [
      {
        id: "contributor-rowan-hale",
        name: "Rowan Hale",
        route: "/learning-center/authors/rowan-hale",
      },
    ],
    authorRoutes: [
      {
        route: "/learning-center/authors/rowan-hale",
        type: "contributor",
        item: { id: "contributor-rowan-hale" },
      },
    ],
  };

  const model = buildLearningCenterModel(seed, editorialContent);

  assert.deepEqual(model.contributors.map(({ id }) => id), ["contributor-rowan-hale"]);
  assert.deepEqual(model.authorRoutes.map(({ route }) => route), ["/learning-center/authors/rowan-hale"]);
  assert.deepEqual(model.topicCards.map(({ id }) => id), ["blog-buying-a-home"]);
});

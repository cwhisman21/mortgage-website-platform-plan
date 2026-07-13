const LEARNING_HOME_ROUTE = "/learning-center";
const EDITORIAL_TEAM_ID = "blog-editorial-team";
const LOAN_PATH_IDS = [
  "product-purchase",
  "product-refinance",
  "product-fha",
  "product-va",
];

const byId = (items = []) => new Map(items.map((item) => [item.id, item]));

export function buildLearningCenterModel(seed) {
  const blogPages = seed.blogPages || [];
  const articles = seed.articles || [];
  const products = seed.products || [];
  const home =
    blogPages.find((page) => page.route === LEARNING_HOME_ROUTE) || null;
  const tags = blogPages.filter((page) => page.route !== LEARNING_HOME_ROUTE);
  const articleMap = byId(articles);
  const featuredArticles = (home?.featuredArticleIds || [])
    .map((id) => articleMap.get(id))
    .filter(Boolean);
  const featuredIds = new Set(featuredArticles.map(({ id }) => id));
  const productMap = byId(products);

  return {
    home,
    tags,
    searchItems: [...tags, ...articles],
    topicCards: tags.filter((page) => page.id !== EDITORIAL_TEAM_ID),
    featuredArticles,
    additionalArticles: articles
      .filter((article) => !featuredIds.has(article.id))
      .slice(0, 3),
    calculators: seed.calculators || [],
    loanPaths: LOAN_PATH_IDS.map((id) => productMap.get(id)).filter(Boolean),
  };
}

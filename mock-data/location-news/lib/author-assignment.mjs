const EXACT_AUTHOR_BY_ARTICLE_TYPE = new Map([
  ["affordability_home_values", "contributor-maya-brooks"],
  ["housing_supply_tenure", "contributor-maya-brooks"],
  ["state_home_price_movement", "contributor-maya-brooks"],
  ["state_housing_costs", "contributor-maya-brooks"],
  ["local_labor_market", "contributor-rowan-hale"],
  ["state_labor_market", "contributor-rowan-hale"],
  ["county_loan_limits", "contributor-marcus-lane"],
  ["state_loan_limit_landscape", "contributor-marcus-lane"],
]);

const TOPIC_AUTHOR_RULES = [
  {
    authorId: "contributor-priya-bennett",
    topics: new Set(["tax", "insurance", "methodology", "data", "source", "chart"]),
  },
  {
    authorId: "contributor-elena-park",
    topics: new Set(["refinance", "equity", "cash-out", "breakeven"]),
  },
  {
    authorId: "contributor-jordan-avery",
    topics: new Set(["buying", "first-time", "down-payment", "purchase-readiness", "offers"]),
  },
];

export function authorIdForLocationNews({ articleType, topicIds } = {}) {
  const exactAuthorId = EXACT_AUTHOR_BY_ARTICLE_TYPE.get(String(articleType || ""));
  if (exactAuthorId) return exactAuthorId;

  const topics = new Set(Array.isArray(topicIds) ? topicIds.map((topicId) => String(topicId)) : []);
  for (const rule of TOPIC_AUTHOR_RULES) {
    if ([...rule.topics].some((topicId) => topics.has(topicId))) return rule.authorId;
  }

  return "contributor-maya-brooks";
}

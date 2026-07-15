import { tagForId } from "./tag-registry.mjs";

const CONTENT_FAMILIES = new Set([
  "articles",
  "topic-guides",
  "local-market-news",
  "product-guides",
  "calculators",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedOperator(value) {
  return value === "OR" ? "OR" : "AND";
}

function supportedSorts(value) {
  const sorts = {};
  if (!value || typeof value !== "object") return sorts;
  for (const [family, sort] of Object.entries(value)) {
    if (CONTENT_FAMILIES.has(family) && sort === "newest") sorts[family] = sort;
  }
  return sorts;
}

function supportedPositions(value) {
  const positions = {};
  if (!value || typeof value !== "object") return positions;
  for (const [family, position] of Object.entries(value)) {
    if (CONTENT_FAMILIES.has(family) && Number.isInteger(position) && position > 0) {
      positions[family] = position;
    }
  }
  return positions;
}

export function sanitizeTagSearchState(state = {}, registry) {
  const inputTagIds = asArray(state.tagIds);
  const inputOperators = asArray(state.operators);
  const validEntries = [];
  const ignoredTagIds = [];

  inputTagIds.forEach((id, index) => {
    if (typeof id === "string" && tagForId(registry, id)) validEntries.push({ id, index });
    else if (typeof id === "string" && id) ignoredTagIds.push(id);
  });

  const tagIds = validEntries.map(({ id }) => id);
  const operators = validEntries.slice(1).map(({ index }, validIndex) => {
    const previousIndex = validEntries[validIndex].index;
    return index === previousIndex + 1
      ? normalizedOperator(inputOperators[previousIndex])
      : "AND";
  });

  return {
    tagIds,
    operators,
    query: typeof state.query === "string" ? state.query.trim() : "",
    sortBySection: supportedSorts(state.sortBySection),
    carouselPositions: supportedPositions(state.carouselPositions),
    ignoredTagIds,
  };
}

export function parseTagSearchState(search = "", registry) {
  const params = new URLSearchParams(String(search).replace(/^\?/, ""));
  const sortBySection = {};
  const carouselPositions = {};

  for (const [key, value] of params) {
    if (key.startsWith("sort.")) sortBySection[key.slice(5)] = value;
    if (key.startsWith("pos.")) carouselPositions[key.slice(4)] = Number(value);
  }

  return sanitizeTagSearchState({
    tagIds: params.getAll("tag"),
    operators: params.getAll("op"),
    query: params.get("q") ?? "",
    sortBySection,
    carouselPositions,
  }, registry);
}

export function serializeTagSearchState(state = {}) {
  const params = new URLSearchParams();
  const tagIds = asArray(state.tagIds).filter((id) => typeof id === "string" && id);
  const operators = asArray(state.operators);

  tagIds.forEach((id, index) => {
    params.append("tag", id);
    if (index < tagIds.length - 1) params.append("op", normalizedOperator(operators[index]));
  });

  if (typeof state.query === "string" && state.query.trim()) params.set("q", state.query.trim());
  for (const [family, sort] of Object.entries(supportedSorts(state.sortBySection))) {
    params.set(`sort.${family}`, sort);
  }
  for (const [family, position] of Object.entries(supportedPositions(state.carouselPositions))) {
    params.set(`pos.${family}`, String(position));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

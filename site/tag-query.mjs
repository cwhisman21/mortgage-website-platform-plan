import { tagForId } from "./tag-registry.mjs";

export const CONTENT_FAMILY_ORDER = Object.freeze([
  "articles",
  "topic-guides",
  "local-market-news",
  "product-guides",
  "calculators",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function queryTokens(value) {
  return normalizedText(value).match(/[a-z0-9]+/g) ?? [];
}

function matchingTokenCount(value, tokens) {
  const text = normalizedText(value);
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0);
}

function relationshipText(record) {
  return [...asArray(record.locationIds), ...asArray(record.productIds)].join(" ");
}

function scoreRecord(record, tokens, registry) {
  if (!tokens.length) return 0;

  const tagNames = asArray(record.tagIds)
    .map((id) => tagForId(registry, id)?.displayName)
    .filter(Boolean)
    .join(" ");

  return matchingTokenCount(record.title, tokens) * 8
    + matchingTokenCount(record.preview, tokens) * 3
    + matchingTokenCount(tagNames, tokens) * 4
    + matchingTokenCount(relationshipText(record), tokens) * 2;
}

function canonicalOrder(record) {
  return Number.isFinite(record?.canonicalOrder) ? record.canonicalOrder : Number.MAX_SAFE_INTEGER;
}

function compareCanonicalOrder(left, right) {
  return canonicalOrder(left) - canonicalOrder(right)
    || String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
}

function sortableDate(record) {
  const dates = [record?.publishedAt, record?.updatedAt]
    .filter((value) => typeof value === "string" && value)
    .map((value) => Date.parse(value))
    .filter((timestamp) => !Number.isNaN(timestamp));
  return dates.length ? Math.max(...dates) : Number.NEGATIVE_INFINITY;
}

export function suggestTags(tags, input, selectedIds = []) {
  const prefix = normalizedText(input).trim();
  if (!prefix) return [];

  const selected = selectedIds instanceof Set ? selectedIds : new Set(asArray(selectedIds));
  return asArray(tags)
    .filter((tag) => tag && typeof tag.displayName === "string" && !selected.has(tag.id))
    .filter((tag) => normalizedText(tag.displayName).startsWith(prefix))
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id));
}

function boundedInputIndex(value, index, fallback) {
  const candidate = Number.isInteger(index) ? index : fallback;
  return Math.min(Math.max(candidate, 0), value.length);
}

function trimmedRange(value, start, end) {
  let rangeStart = start;
  let rangeEnd = end;
  while (rangeStart < rangeEnd && /\s/.test(value[rangeStart])) rangeStart += 1;
  while (rangeEnd > rangeStart && /\s/.test(value[rangeEnd - 1])) rangeEnd -= 1;
  return { start: rangeStart, end: rangeEnd };
}

export function activeTagSuggestion(tags, input, selectedIds = [], selectionStart, selectionEnd) {
  const value = typeof input === "string" ? input : "";
  const start = boundedInputIndex(value, selectionStart, value.length);
  const end = boundedInputIndex(value, selectionEnd, start);
  const selectedRange = trimmedRange(value, Math.min(start, end), Math.max(start, end));
  const ranges = [];

  if (selectedRange.start < selectedRange.end) {
    ranges.push(selectedRange);
  } else {
    const cursor = start;
    const starts = [0];
    for (const match of value.slice(0, cursor).matchAll(/\s+/g)) starts.push(match.index + match[0].length);
    for (const rangeStart of starts) {
      const range = trimmedRange(value, rangeStart, cursor);
      if (range.start < range.end) ranges.push(range);
    }
  }

  for (const range of ranges) {
    const prefix = value.slice(range.start, range.end);
    const suggestions = suggestTags(tags, prefix, selectedIds);
    if (suggestions.length) return { ...range, prefix, suggestions };
  }

  return { start, end: start, prefix: "", suggestions: [] };
}

export function queryWithoutTagSuggestion(input, range) {
  const value = typeof input === "string" ? input : "";
  const start = boundedInputIndex(value, range?.start, value.length);
  const end = boundedInputIndex(value, range?.end, start);
  return `${value.slice(0, Math.min(start, end))} ${value.slice(Math.max(start, end))}`
    .replace(/\s+/g, " ")
    .trim();
}

export function compileTagExpression(tagIds = [], operators = []) {
  const ids = asArray(tagIds).filter((id) => typeof id === "string" && id);
  if (!ids.length) return [];

  const groups = [[ids[0]]];
  ids.slice(1).forEach((id, index) => {
    const operator = asArray(operators)[index] === "OR" ? "OR" : "AND";
    if (operator === "OR") groups.push([id]);
    else groups.at(-1).push(id);
  });
  return groups;
}

export function recordMatchesExpression(record, groups) {
  const tagIds = asArray(record?.tagIds);
  return !asArray(groups).length || groups.some((group) => asArray(group).every((id) => tagIds.includes(id)));
}

export function sortSearchResults(records, sort = "relevance") {
  return [...asArray(records)].sort((left, right) => {
    if (sort === "newest") {
      const dateDifference = sortableDate(right) - sortableDate(left);
      if (dateDifference) return dateDifference;
      return compareCanonicalOrder(left, right);
    }

    const relevanceDifference = (Number(right?.relevance) || 0) - (Number(left?.relevance) || 0);
    if (relevanceDifference) return relevanceDifference;
    return compareCanonicalOrder(left, right);
  });
}

export function searchRecords(records, state = {}, registry) {
  const expression = compileTagExpression(state.tagIds, state.operators);
  const tokens = queryTokens(state.query);
  const matches = asArray(records)
    .filter((record) => recordMatchesExpression(record, expression))
    .map((record) => ({ ...record, relevance: scoreRecord(record, tokens, registry) }));

  return sortSearchResults(matches, "relevance");
}

export function groupSearchResults(records) {
  const byFamily = new Map();
  for (const record of asArray(records)) {
    if (!CONTENT_FAMILY_ORDER.includes(record?.family)) continue;
    if (!byFamily.has(record.family)) byFamily.set(record.family, []);
    byFamily.get(record.family).push(record);
  }

  return CONTENT_FAMILY_ORDER
    .filter((family) => byFamily.has(family))
    .map((family) => ({ family, records: byFamily.get(family) }));
}

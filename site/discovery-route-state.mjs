import { tagForSlug, tagRoute } from "./tag-registry.mjs";
import { parseTagSearchState, serializeTagSearchState } from "./tag-state.mjs";

const TAG_ROUTE_PREFIX = "/learning-center/tags/";
const SEARCH_ROUTE = "/learning-center/search";

function normalizePathname(value) {
  const path = String(value || "/").split(/[?#]/, 1)[0] || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function normalizeSearch(value) {
  const search = String(value || "");
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function normalizeHash(value) {
  const hash = String(value || "");
  if (!hash) return "";
  return hash.startsWith("#") ? hash : `#${hash}`;
}

function locationSearchText(item) {
  return [
    item?.name,
    item?.title,
    item?.abbr,
    item?.stateNarrative,
    item?.marketPositioning,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function resolveLocationSearchRoute(query, items = []) {
  const value = String(query || "").trim();
  if (!value) return "/locations";

  const normalized = value.toLowerCase();
  const locationItems = items.filter((item) => (
    typeof item?.route === "string" && item.route.startsWith("/locations/")
  ));
  const exact = locationItems.find((item) => String(item.name || "").trim().toLowerCase() === normalized);
  const match = exact || locationItems.find((item) => locationSearchText(item).includes(normalized));
  if (match) return match.route;

  return `/locations?${new URLSearchParams({ query: value })}`;
}

function addRouteTag(state, tag) {
  if (state.tagIds.includes(tag.id)) return state;
  return {
    ...state,
    tagIds: [tag.id, ...state.tagIds],
    operators: state.tagIds.length ? ["AND", ...state.operators] : [],
  };
}

function hasDiscoveryState(state) {
  return Boolean(
    state.query ||
    state.tagIds.length ||
    state.ignoredTagIds.length ||
    Object.keys(state.sortBySection).length ||
    Object.keys(state.carouselPositions).length
  );
}

function serializeRouteSearchState(state) {
  const serialized = serializeTagSearchState(state);
  if (!state.ignoredTagIds.length) return serialized;

  const params = new URLSearchParams(serialized.replace(/^\?/, ""));
  state.ignoredTagIds.forEach((id) => params.append("tag", id));
  return `?${params}`;
}

export function resolveTagRouteRequest({
  pathname,
  search = "",
  hash = "",
  registry,
} = {}) {
  const path = normalizePathname(pathname);
  const normalizedSearch = normalizeSearch(search);
  const normalizedHash = normalizeHash(hash);
  if (!path.startsWith(TAG_ROUTE_PREFIX)) {
    return {
      matched: false,
      historical: false,
      usesBaseSearch: false,
      targetPath: path,
      targetUrl: `${path}${normalizedSearch}${normalizedHash}`,
    };
  }

  const slug = path.slice(TAG_ROUTE_PREFIX.length).split("/", 1)[0];
  const tag = tagForSlug(registry, slug);
  const canonicalPath = normalizePathname(tagRoute(tag));
  if (!tag || !canonicalPath) {
    return {
      matched: false,
      historical: false,
      usesBaseSearch: false,
      targetPath: path,
      targetUrl: `${path}${normalizedSearch}${normalizedHash}`,
    };
  }

  const parsedState = parseTagSearchState(normalizedSearch, registry);
  const usesBaseSearch = hasDiscoveryState(parsedState);
  const state = addRouteTag(parsedState, tag);
  const canonicalUrl = `${canonicalPath}${normalizedSearch}${normalizedHash}`;
  const targetPath = usesBaseSearch ? SEARCH_ROUTE : canonicalPath;
  const targetUrl = usesBaseSearch
    ? `${SEARCH_ROUTE}${serializeRouteSearchState(state)}${normalizedHash}`
    : canonicalUrl;

  return {
    matched: true,
    tag,
    state,
    canonicalPath,
    canonicalUrl,
    historical: path !== canonicalPath,
    usesBaseSearch,
    targetPath,
    targetUrl,
  };
}

export function shouldPreserveStaticTagPage({ registry, hasStaticTagPage } = {}) {
  return Boolean(hasStaticTagPage && !registry?.tags?.length);
}

export function shouldUseNativeTagFallbackNavigation({ loadError, withinStaticResults, pathname } = {}) {
  return Boolean(
    loadError
    && withinStaticResults
    && normalizePathname(pathname).startsWith(TAG_ROUTE_PREFIX)
  );
}

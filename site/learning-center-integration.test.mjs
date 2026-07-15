import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveDocumentMetadata } from "./document-metadata.mjs";
import { normalizeTagRegistry } from "./tag-registry.mjs";
import {
  resolveLocationSearchRoute,
  resolveTagRouteRequest,
  shouldUseNativeTagFallbackNavigation,
  shouldPreserveStaticTagPage,
} from "./discovery-route-state.mjs";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function topLevelFunctionSource(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = new RegExp(`^(?:async\\s+)?function\\s+${escapedName}\\s*\\(`, "m").exec(source);
  assert.ok(start, `${name} function is missing`);
  const remainderStart = start.index + start[0].length;
  const remainder = source.slice(remainderStart);
  const next = /^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/m.exec(remainder);
  const end = next ? remainderStart + next.index : source.length;
  return source.slice(start.index, end);
}

const homeStart = source.indexOf("function learningHome(");
const helpersStart = source.indexOf("function learningDiscovery(");
const topicStart = source.indexOf("function blogTopicPage(");
const articleStart = source.indexOf("function articlePage(");
const learningDiscoverySource = topLevelFunctionSource("learningDiscovery");
const learningHomeSource = topLevelFunctionSource("learningHome");

test("Learning Center preserves one search form before canonical topic links", () => {
  assert.ok(homeStart >= 0, "learningHome renderer is missing");
  assert.ok(helpersStart >= 0, "learningDiscovery helper is missing");
  assert.equal((learningDiscoverySource.match(/data-search-form/g) || []).length, 1);
  assert.ok(
    learningDiscoverySource.indexOf("data-search-form") <
      learningDiscoverySource.indexOf("learning-topic-tags"),
  );
  assert.match(learningDiscoverySource, /data-search-scope="learning"/);
});

test("Learning Center uses the canonical model and shared CTA helpers", () => {
  assert.match(
    learningHomeSource,
    /buildLearningCenterModel\(\s*data,\s*editorialContent,\s*\{\s*tagRegistry:\s*publicTagRegistry\s*\}\s*\)/,
  );
  assert.match(learningHomeSource, /ctaButton\("prequal"/);
  assert.match(learningHomeSource, /contextualCta\(/);
  assert.doesNotMatch(
    learningHomeSource,
    /popular|trending|credit score|no obligation/i,
  );
});

test("Learning Center keeps the shared shell", () => {
  assert.match(learningHomeSource, /return pageShell\(`/);
  assert.doesNotMatch(learningHomeSource, /<header|<footer/);
});

test("Learning Center helpers remain top-level before article renderers", () => {
  assert.ok(
    helpersStart < topicStart,
    "Learning Center helpers must not be embedded in an article template",
  );
  assert.ok(topicStart < articleStart, "topic renderer must precede article renderer");
});

test("Learning Center renders the guidance CTA copy once", () => {
  assert.equal(
    (learningHomeSource.match(/CTA_TYPES\.leadForm\.title/g) || []).length,
    1,
  );
  assert.equal(
    (learningHomeSource.match(/CTA_TYPES\.leadForm\.text/g) || []).length,
    1,
  );
});

test("Learning Center styles are scoped and responsive", () => {
  for (const selector of [
    ".learning-center-page",
    ".learning-discovery",
    ".learning-search",
    ".learning-topic-tags",
  ]) {
    assert.ok(styles.includes(selector), `missing ${selector}`);
  }
  assert.match(
    styles,
    /@media \(max-width: 760px\)[\s\S]*\.learning-center-page/,
  );
});

test("Learning Center serializes only its scoped form into tagged-search state", () => {
  const interactionSource = topLevelFunctionSource("wireInteractions");

  assert.match(learningDiscoverySource, /model\.topicLinks\.map\(/);
  assert.doesNotMatch(learningDiscoverySource, /model\.(?:tags|searchItems)/);
  assert.match(
    interactionSource,
    /document\.querySelectorAll\("\[data-search-form\]\[data-search-scope=\\"learning\\"\]"\)[\s\S]*new FormData\(form\)\.get\("q"\)[\s\S]*navigate\(serializeLearningCenterSearch\(query\)\)/,
  );
  assert.doesNotMatch(interactionSource, /querySelectorAll\("\[data-search-form\]"\)/);
});

test("Locations search stays in the location flow and preserves unmatched queries", () => {
  const interactionSource = topLevelFunctionSource("wireInteractions");
  const locationItems = [
    { name: "Colorado", route: "/locations/colorado" },
    { name: "Denver", route: "/locations/colorado/denver" },
  ];

  assert.equal(
    resolveLocationSearchRoute(" Denver ", locationItems),
    "/locations/colorado/denver",
  );
  assert.equal(
    resolveLocationSearchRoute("Pine Ridge", locationItems),
    "/locations?query=Pine+Ridge",
  );
  assert.match(
    interactionSource,
    /querySelector\("\.locations-hero-search\[data-search-form\]"\)[\s\S]*new FormData\(locationSearchForm\)\.get\("query"\)[\s\S]*resolveLocationSearchRoute\(query,[\s\S]*navigate\(route\(destination\)\)/,
  );
});

test("the public registry loads globally while the search index loads only on search and tag routes", () => {
  const bootSource = topLevelFunctionSource("boot");
  const discoveryRouteSource = topLevelFunctionSource("isTagSearchPath");
  const indexLoaderSource = topLevelFunctionSource("loadSearchIndexForDiscoveryRoute");
  const renderSource = topLevelFunctionSource("render");

  assert.match(bootSource, /fetchOptionalJson\(PUBLIC_TAG_REGISTRY_URL\)/);
  assert.match(bootSource, /publicTagRegistry\s*=\s*normalizeTagRegistry\(optionalPublicTagRegistry\s*\|\|\s*\{\}\)/);
  assert.doesNotMatch(bootSource, /SEARCH_INDEX_URL/);
  assert.match(indexLoaderSource, /fetch\(SEARCH_INDEX_URL\)/);
  assert.match(
    discoveryRouteSource,
    /path\s*===\s*"\/learning-center\/search"\s*\|\|\s*path\.startsWith\("\/learning-center\/tags\/"\)/,
  );
  assert.match(
    renderSource,
    /if\s*\(isTagSearchPath\(path\)\)\s*\{[\s\S]*loadSearchIndexForDiscoveryRoute\(\)/,
  );
  assert.equal((source.match(/fetch\(SEARCH_INDEX_URL\)/g) || []).length, 1);
  assert.doesNotMatch(source, /["'`]\/mock-data\/tag-registry\.json["'`]/);
});

test("canonical and historical tag routes share parsed state, rendering, and interaction wiring", () => {
  const mapSource = topLevelFunctionSource("buildMaps");
  const stateSource = topLevelFunctionSource("tagSearchStateFor");
  const pageSource = topLevelFunctionSource("tagSearchPage");
  const wireSource = topLevelFunctionSource("wireCurrentTagSearch");
  const renderSource = topLevelFunctionSource("render");

  assert.match(mapSource, /normalizedTagRegistry\.tags\.forEach\(/);
  assert.match(mapSource, /built\.routes\.set\(canonicalRoute,\s*\{\s*type:\s*"tag",\s*item:\s*tag\s*\}\)/);
  assert.match(
    mapSource,
    /\(tag\.redirectSlugs\s*\|\|\s*\[\]\)\.forEach\([\s\S]*built\.routes\.set\(historicalRoute,[\s\S]*type:\s*"tag"/,
  );
  assert.match(stateSource, /parseTagSearchState\(window\.location\.search,\s*publicTagRegistry\)/);
  assert.match(stateSource, /tagIds:\s*\[routeTag\.id,\s*\.\.\.state\.tagIds\]/);
  assert.match(pageSource, /renderTagSearchPage\(tagSearchRenderOptions\(found\)\)/);
  assert.match(wireSource, /wireTagSearch\(root,\s*\{/);
  assert.match(
    renderSource,
    /resolveTagRouteRequest\([\s\S]*window\.history\.replaceState\([\s\S]*\$\{canonicalTagRoute\}\$\{window\.location\.search\}\$\{window\.location\.hash\}[\s\S]*tagRouteRequest\.usesBaseSearch[\s\S]*found\.type\s*===\s*"tag"\)\s*html\s*=\s*tagSearchPage\(found\)/,
  );
});

const routeRegistry = normalizeTagRegistry({
  tags: [
    {
      id: "tag-fha",
      slug: "fha-loans",
      canonicalRoute: "/learning-center/tags/fha-loans",
      redirectSlugs: ["fha-mortgages"],
      displayName: "FHA Loans",
      description: "Explore FHA loan guidance, requirements, insurance, and mortgage planning resources.",
    },
    {
      id: "tag-insurance",
      slug: "homeowners-insurance",
      canonicalRoute: "/learning-center/tags/homeowners-insurance",
      displayName: "Homeowners Insurance",
      description: "Explore homeowners insurance costs and their role in mortgage payment planning.",
    },
  ],
  assignments: [],
});

test("plain canonical tag routes remain self-canonical and indexable", () => {
  const request = resolveTagRouteRequest({
    pathname: "/learning-center/tags/fha-loans",
    registry: routeRegistry,
  });
  const metadata = resolveDocumentMetadata(
    { type: "tag", item: request.tag },
    { path: request.targetUrl, siteOrigin: "https://example.test", tagRegistry: routeRegistry },
  );

  assert.equal(request.matched, true);
  assert.equal(request.historical, false);
  assert.equal(request.usesBaseSearch, false);
  assert.equal(request.targetUrl, "/learning-center/tags/fha-loans");
  assert.equal(metadata.canonical, "https://example.test/learning-center/tags/fha-loans");
  assert.equal(metadata.robots, "index,follow");
});

test("query-bearing and multi-tag canonical routes normalize to base search metadata", () => {
  const withQuery = resolveTagRouteRequest({
    pathname: "/learning-center/tags/fha-loans",
    search: "?q=insurance",
    hash: "#costs",
    registry: routeRegistry,
  });
  const withAnotherTag = resolveTagRouteRequest({
    pathname: "/learning-center/tags/fha-loans",
    search: "?tag=tag-insurance",
    registry: routeRegistry,
  });
  const metadata = resolveDocumentMetadata(
    { type: "directory", item: { route: "/learning-center/search", name: "Search" } },
    { path: withQuery.targetUrl, siteOrigin: "https://example.test" },
  );

  assert.equal(withQuery.usesBaseSearch, true);
  assert.equal(
    withQuery.targetUrl,
    "/learning-center/search?tag=tag-fha&q=insurance#costs",
  );
  assert.equal(
    withAnotherTag.targetUrl,
    "/learning-center/search?tag=tag-fha&op=AND&tag=tag-insurance",
  );
  assert.equal(metadata.canonical, "https://example.test/learning-center/search");
  assert.equal(metadata.robots, "noindex,follow");
});

test("historical tag resolution executes canonical path, query, and anchor preservation", () => {
  const request = resolveTagRouteRequest({
    pathname: "/learning-center/tags/fha-mortgages",
    search: "?campaign=legacy",
    hash: "#requirements",
    registry: routeRegistry,
  });

  assert.equal(request.matched, true);
  assert.equal(request.historical, true);
  assert.equal(request.canonicalPath, "/learning-center/tags/fha-loans");
  assert.equal(
    request.canonicalUrl,
    "/learning-center/tags/fha-loans?campaign=legacy#requirements",
  );
  assert.equal(request.targetUrl, request.canonicalUrl);
});

test("public registry failure preserves a captured generated tag page", () => {
  const emptyRegistry = normalizeTagRegistry();
  const bootSource = topLevelFunctionSource("boot");

  assert.equal(
    shouldPreserveStaticTagPage({ registry: emptyRegistry, hasStaticTagPage: true }),
    true,
  );
  assert.equal(
    shouldPreserveStaticTagPage({ registry: routeRegistry, hasStaticTagPage: true }),
    false,
  );
  assert.equal(
    shouldPreserveStaticTagPage({ registry: emptyRegistry, hasStaticTagPage: false }),
    false,
  );
  assert.match(
    bootSource,
    /shouldPreserveStaticTagPage\(\{[\s\S]*registry:\s*publicTagRegistry,[\s\S]*hasStaticTagPage,[\s\S]*\}\)[\s\S]*return;[\s\S]*render\(\)/,
  );
});

test("failed-index tag links use native navigation to load the destination static page", () => {
  assert.equal(shouldUseNativeTagFallbackNavigation({
    loadError: new Error("offline"),
    withinStaticResults: true,
    pathname: "/learning-center/tags/va-loans",
  }), true);
  assert.equal(shouldUseNativeTagFallbackNavigation({
    loadError: null,
    withinStaticResults: true,
    pathname: "/learning-center/tags/va-loans",
  }), false);
  assert.equal(shouldUseNativeTagFallbackNavigation({
    loadError: new Error("offline"),
    withinStaticResults: false,
    pathname: "/learning-center/tags/va-loans",
  }), false);
});

test("every indexed SPA family receives Task 3 tag context and safe search-card resolvers", () => {
  const expectedRenderers = [
    ["product", "productPage", /tagContextForRoute\(product\.route\)[\s\S]*renderProductContent\([\s\S]*tagContext/],
    ["topic guide", "blogTopicPage", /tagContextForRoute\(productionTopic\.route\)[\s\S]*renderProductionTopicHub\([\s\S]*tagContext/],
    ["editorial team topic guide", "editorialTeamPage", /renderProductionTopicHub\([\s\S]*tagContext:\s*tagContextForRoute\(topic\.route\)/],
    ["article", "articlePage", /renderProductionArticle\([\s\S]*tagContext:\s*tagContextForRoute\(article\.route\)/],
    ["calculator", "calculatorPage", /tagContextForRoute\(calc\.route\)[\s\S]*renderPrimaryTagLinks\([\s\S]*renderAdditionalTagLinks\(/],
    ["direct local news", "hydrateDirectArticle", /renderArticleContent\([\s\S]*tagContext:\s*tagContextForRoute\(indexItem\.route\)/],
    ["modal local news", "openArticleModal", /renderArticleContent\([\s\S]*tagContext:\s*tagContextForRoute\(indexItem\.route\)/],
  ];

  for (const [label, functionName, pattern] of expectedRenderers) {
    assert.match(topLevelFunctionSource(functionName), pattern, `${label} renderer must receive tag context`);
  }

  const searchOptionsSource = topLevelFunctionSource("tagSearchRenderOptions");
  assert.match(searchOptionsSource, /resolveAuthor:\s*resolveSearchAuthor/);
  assert.match(searchOptionsSource, /resolveLocation:\s*resolveSearchLocation/);
});

test("transactional and directory surfaces do not receive content tags", () => {
  for (const [name, functionName] of [
    ["rates", "ratesPage"],
    ["loan officer", "loanOfficerPage"],
    ["branch", "branchPage"],
    ["directory", "directoryPage"],
    ["account", "openActionModal"],
    ["auth", "openAuthModal"],
    ["prequal", "prequalHandoffPage"],
  ]) {
    assert.doesNotMatch(
      topLevelFunctionSource(functionName),
      /tagContext|renderPrimaryTagLinks|renderAdditionalTagLinks/,
      `${name} must remain untagged`,
    );
  }
});

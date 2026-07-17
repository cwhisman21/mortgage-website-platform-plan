import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const sellerPublicSourceFiles = [
  "site/app.js",
  "site/seller-workspace-ui.mjs",
  "site/static-route-document.mjs",
  "mock-data/production-seed.json",
  "site/generated/routes/sell/index.html",
];

const rejectedSellerPhrases = [
  "Enter my own value",
  "No account is required to see the estimate",
  "The complete estimate remains visible",
  "Save this home and estimate in Snap Homes",
];

const publicSourceFiles = [
  "site/app.js",
  "site/index.html",
  "site/rates-marketplace-ui.mjs",
  "site/prequal-handoff.mjs",
  "site/editorial-content.mjs",
  "site/editorial-renderer.mjs",
  "site/news-renderer.mjs",
  "site/market-charts.mjs",
  "site/locations-hero.mjs",
  "site/learning-center.mjs",
  "site/content-freshness.mjs",
  "site/document-metadata.mjs",
  "site/location-news-static.mjs",
  "site/static-route-document.mjs",
].filter((relativePath) => fs.existsSync(path.join(repoRoot, relativePath)));

const forbiddenPatterns = [
  ["dummy", /\bdummy\b/i],
  ["mock", /\bmock\b/i],
  ["prototype", /\bprototype\b/i],
  ["placeholder", /\bplaceholder\b/i],
  ["wireframe", /\bwireframe\b/i],
  ["scaffold", /\bscaffold(?:ing)?\b/i],
  ["simulated", /\bsimulated\b/i],
  ["demo", /\bdemo\b/i],
  ["review status", /\breview status\b/i],
  ["editorial draft", /\beditorial draft\b/i],
  ["compliance review", /\bcompliance review(?: required)?\b/i],
  ["available sections", /\bavailable sections\b/i],
  ["content graph", /\bcontent graph\b/i],
  ["editorial graph", /\beditorial graph\b/i],
  ["trust layer", /\btrust layer\b/i],
  ["answer unlock", /\banswer unlock\b/i],
  ["CMS object", /\bCMS object\b/i],
  ["static page", /\bstatic page\b/i],
  ["in the live experience", /\bin the live experience\b/i],
  ["would open next", /\bwould open next\b/i],
  ["a useful mortgage article", /\ba useful mortgage article\b/i],
  ["this article connects", /\bthis article connects\b/i],
  ["the reader can understand", /\bthe reader can understand\b/i],
  ["read this with the market", /\bread this with the market\b/i],
  ["a product page educates", /\ba product page educates\b/i],
  ["products route into calculators", /\bproducts route into calculators\b/i],
  ["articles link back", /\barticles link back\b/i],
  ["the next step stays clear", /\bthe next step stays clear\b/i],
  ["the article stays readable", /\bthe article stays readable\b/i],
  ["open a city or state page", /\bopen a city or state page\b/i],
  ["source notes stay close", /\bsource notes stay close\b/i],
  ["use the related cards below", /\buse the related cards below\b/i],
  ["the reader/user can", /\bthe (?:reader|user) can\b/i],
  ["in this section/page/module", /\bin this (?:section|page|module)\b/i],
  ["content moves readers", /\bcontent moves readers\b/i],
  ["browse this topic", /\bbrowse this topic\b/i],
  ["topic hubs", /\btopic hubs\b/i],
  ["expert handoff", /\bexpert handoff\b/i],
  ["state guide translates", /\ba state guide translates\b/i],
  ["created by this generator", /\bcreated by this generator\b/i],
  ["placement", /\bplacement\b(?!\s+claim\b)/i],
  ["branch page", /\bbranch page\b/i],
  ["convert without overclaiming", /\bconvert without overclaiming\b/i],
  ["high-intent users", /\bhigh-intent users\b/i],
  ["page relationships", /\bpage relationships\b/i],
  ["editorial analysis", /\beditorial analysis\b/i],
  ["state page", /\b(?:the |a )?state page\b/i],
  ["city market page", /\bcity market page\b/i],
  ["public market page", /\bpublic market page\b/i],
  ["matching page", /\bmatching page\b/i],
  ["related pages", /\brelated pages\b/i],
  ["no route matched", /\bno route matched\b/i],
  ["site data", /\bsite data\b/i],
  ["directory next steps", /\bdirectory next steps\b/i],
  ["move from any directory", /\bmove from any directory\b/i],
  ["seed assumption", /\bseed(?:ed)? (?:assumption|value|snapshot|content|market data)\b/i],
  ["connected market data", /\bconnected market[- ]data\b/i],
  ["future integration", /\bfuture (?:connected )?integration\b/i],
  ["public release or reliance", /\bpublic (?:release|reliance)\b/i],
  ["source provenance", /\b(?:source|as-of) provenance\b/i],
  ["layout assumptions", /\blayout assumptions?\b/i],
  ["illustrative planning assumption", /\billustrative planning assumptions?\b/i],
  ["source or as-of dates", /\bsource or as-of dates?\b/i],
  ["what each control does", /\bwhat each control does\b/i],
  ["interaction sequence", /\binteraction sequence\b/i],
  ["visible control states", /\bvisible control states\b/i],
  ["purpose switch", /\bpurpose switch\b/i],
  ["numeric and currency input", /\bnumeric and currency input\b/i],
  ["linked down payment", /\blinked down payment\b/i],
  ["advanced accordion", /\badvanced accordion\b/i],
  ["validation and correction", /\bvalidation and correction\b/i],
  ["illustrative qualifier", /\billustrative\b/i],
  ["sample offer qualifier", /\bsample offers?\b/i],
  ["sample mortgage qualifier", /\bsample mortgage\b/i],
];

const appCopyPatterns = [
  ["this page", /\bthis page\b/i],
  ["borrower-facing hub", /\b(?:article|buyer education|calculator|content|learning|loan|local branch|locations|mortgage|topic) hub\b/i],
  ["borrower-facing path", /\b(?:borrower|comparison|contact|guidance|loan|mortgage|prequalification|product|purchase|refinance|review|service) path\b/i],
  ["next click", /\bnext[- ]click\b/i],
  ["profile includes", /\bprofile includes\b/i],
  ["show what happens", /\bshow what happens\b/i],
  ["open first result", /\bopen first result\b/i],
  ["latest sourced update", /\blatest sourced update\b/i],
  ["product-aware estimate", /\bproduct-aware estimate\b/i],
  ["where to find us", /\bwhere to find us\b/i],
  ["consent-aware contact form", /\bconsent-aware contact form\b/i],
];

const canonicalTaxonomyPatterns = [
  ["hub", /\bhub\b/i],
  ["index", /\bindex\b/i],
  ["page", /\bpage\b/i],
  ["path", /\bpath\b/i],
  ["placement", /\bplacement\b/i],
  ["structured", /\bstructured\b/i],
  ["generator", /\bgenerator\b/i],
  ["next click", /\bnext[- ]click\b/i],
  ["template", /\btemplate\b/i],
];

const publicTextKeys = new Set([
  "alt",
  "answer",
  "attributes",
  "bio",
  "body",
  "borrowerGoal",
  "caption",
  "closingCopy",
  "conclusion",
  "coverageNote",
  "dek",
  "description",
  "disclosure",
  "eyebrow",
  "heading",
  "heroSummary",
  "intro",
  "introduction",
  "label",
  "lead",
  "marketPositioning",
  "metaDescription",
  "name",
  "note",
  "notes",
  "overviewParagraphs",
  "paragraphs",
  "purpose",
  "question",
  "sampleOfferDisclosure",
  "shortBio",
  "stateNarrative",
  "summary",
  "takeaways",
  "text",
  "title",
]);

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function compact(value, limit = 150) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized;
}

function decodeHtmlText(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripJsComments(source) {
  let state = "code";
  let output = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
        output += character;
      } else {
        output += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else {
        output += character === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (state === "single" || state === "double" || state === "template") {
      output += character;
      if (character === "\\") {
        output += next || "";
        index += 1;
        continue;
      }
      if (
        (state === "single" && character === "'") ||
        (state === "double" && character === '"') ||
        (state === "template" && character === "`")
      ) {
        state = "code";
      }
      continue;
    }
    if (character === "/" && next === "/") {
      output += "  ";
      index += 1;
      state = "line-comment";
    } else if (character === "/" && next === "*") {
      output += "  ";
      index += 1;
      state = "block-comment";
    } else {
      output += character;
      if (character === "'") state = "single";
      else if (character === '"') state = "double";
      else if (character === "`") state = "template";
    }
  }
  return output;
}

function sourceVisibleLines(relativePath, source) {
  const uncommented = relativePath.endsWith(".html") ? source : stripJsComments(source);
  return uncommented.split(/\r?\n/).map((line, index) => {
    const visibleAttributes = [...line.matchAll(/\b(?:alt|aria-label|placeholder|title)\s*=\s*(["'])(.*?)\1/gi)]
      .map((match) => match[2])
      .join(" ");
    const withoutTags = line.replace(/<[^>]*>/g, " ");
    const withoutTechnicalPaths = withoutTags
      .replace(/(["'`])(?:https?:\/\/|\/(?:site|mock-data|assets)\/|\.\.?\/)[^"'`\s]*\1/g, " ")
      .replace(/^\s*import\b.*$/g, " ");
    return {
      line: index + 1,
      text: `${withoutTechnicalPaths} ${visibleAttributes}`,
      sourceLine: line,
    };
  });
}

function scanText(text, evidence, patterns = forbiddenPatterns) {
  const findings = [];
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) findings.push(`${evidence} [${label}] "${compact(text)}"`);
  }
  return findings;
}

function scanSource(relativePath) {
  const source = read(relativePath);
  return sourceVisibleLines(relativePath, source).flatMap(({ line, text, sourceLine }) =>
    scanText(text, `${relativePath}:${line}`, relativePath === "site/app.js" ? [...forbiddenPatterns, ...appCopyPatterns] : forbiddenPatterns)
      .map((finding) => `${finding} | ${compact(sourceLine)}`),
  );
}

function collectPublicDataStrings(value, file, pathParts = [], inheritedRoute = "", visibleContext = false, findings = [], patterns = forbiddenPatterns) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPublicDataStrings(item, file, [...pathParts, index], inheritedRoute, visibleContext, findings, patterns));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;

  const route = typeof value.route === "string" ? value.route : inheritedRoute;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    const isPublic = publicTextKeys.has(key) || visibleContext;
    if (typeof child === "string" && isPublic && (route || !file.endsWith("production-seed.json"))) {
      const evidence = route ? `${file} route ${route} (${childPath.join(".")})` : `${file} (${childPath.join(".")})`;
      findings.push(...scanText(child, evidence, patterns));
    } else if (child && typeof child === "object") {
      collectPublicDataStrings(child, file, childPath, route, isPublic, findings, patterns);
    }
  }
  return findings;
}

function assertNoFindings(message, findings) {
  assert.equal(findings.length, 0, `${message}\n${findings.map((finding) => `- ${finding}`).join("\n")}`);
}

test("borrower-visible templates and public content contain no scaffolding language", () => {
  const findings = publicSourceFiles.flatMap(scanSource);
  for (const relativePath of [
    "mock-data/production-seed.json",
    "mock-data/editorial-content.json",
    "mock-data/rates-marketplace-fixtures.json",
  ]) {
    findings.push(...collectPublicDataStrings(JSON.parse(read(relativePath)), relativePath));
  }
  assertNoFindings("Borrower-visible scaffolding language remains:", [...new Set(findings)]);
});

test("seller public copy rejects superseded public-result promises", () => {
  const findings = sellerPublicSourceFiles.flatMap((relativePath) => {
    const source = read(relativePath).toLowerCase();
    return rejectedSellerPhrases
      .filter((phrase) => source.includes(phrase.toLowerCase()))
      .map((phrase) => `${relativePath}: ${phrase}`);
  });

  assertNoFindings("Superseded seller copy remains:", findings);
});

test("public tag display names and descriptions contain no scaffolding language", () => {
  const relativePath = "mock-data/public-tag-registry.json";
  const registry = JSON.parse(read(relativePath));
  const findings = registry.tags.flatMap((tag, index) => ["displayName", "description"].flatMap((field) =>
    scanText(tag[field], `${relativePath} tag ${tag.id || index} (${field})`),
  ));
  assertNoFindings("Public tag copy contains scaffolding language:", [...new Set(findings)]);
});

test("public tag descriptions are complete, distinct, and borrower-readable", () => {
  const relativePath = "mock-data/public-tag-registry.json";
  const registry = JSON.parse(read(relativePath));
  const descriptions = new Map();
  const findings = [];

  for (const tag of registry.tags) {
    const description = String(tag.description || "").trim();
    const words = description.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
    if (words.length < 8 || words.length > 40) findings.push(`${tag.id} has ${words.length} description words`);
    if (!/[.!?]$/.test(description)) findings.push(`${tag.id} description lacks terminal punctuation`);
    if (/support borrowers planning to/i.test(description)) findings.push(`${tag.id} uses generic planning copy: "${description}"`);
    const normalized = description.toLowerCase();
    if (descriptions.has(normalized)) findings.push(`${tag.id} duplicates ${descriptions.get(normalized)}`);
    else descriptions.set(normalized, tag.id);
  }

  assertNoFindings("Public tag descriptions are not borrower-ready:", findings);
});

test("public search records contain no undefined or null sentinel copy", () => {
  const relativePath = "mock-data/search-index.json";
  const searchIndex = JSON.parse(read(relativePath));
  const findings = searchIndex.records.flatMap((record) => ["title", "preview"].flatMap((field) => {
    const value = String(record[field] || "");
    return /\b(?:undefined|null)\b/i.test(value)
      ? [`${relativePath} record ${record.id} (${field}) "${compact(value)}"`]
      : [];
  }));

  assertNoFindings("Public search copy contains serialization sentinels:", findings);
});

test("generated tag titles, headings, and structured names are grammatical and coherent", () => {
  const registry = JSON.parse(read("mock-data/public-tag-registry.json"));
  const findings = [];

  for (const tag of registry.tags) {
    const relativePath = `site/generated/routes${tag.canonicalRoute}/index.html`;
    const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
    if (!fs.existsSync(absolutePath)) {
      findings.push(`${tag.id} is missing ${relativePath}`);
      continue;
    }
    const html = fs.readFileSync(absolutePath, "utf8");
    const title = decodeHtmlText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]).trim();
    const heading = decodeHtmlText(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const titleHeading = title.replace(/\s+\|\s+Snap Mortgage$/, "");
    const jsonSource = html.match(/<script type="application\/ld\+json" data-document-jsonld>([\s\S]*?)<\/script>/i)?.[1];
    let resourceNames = [];
    try {
      const structuredData = JSON.parse(jsonSource || "null");
      resourceNames = (Array.isArray(structuredData) ? structuredData : [structuredData])
        .filter((item) => ["CollectionPage", "ItemList"].includes(item?.["@type"]))
        .map((item) => item.name);
    } catch {
      findings.push(`${tag.id} has invalid tag JSON-LD`);
    }

    if (!heading || titleHeading !== heading) findings.push(`${tag.id} title/H1 mismatch: "${titleHeading}" vs "${heading}"`);
    if (resourceNames.length !== 2 || resourceNames.some((name) => name !== heading)) {
      findings.push(`${tag.id} JSON-LD names do not match its H1`);
    }
    if ([title, heading, ...resourceNames].some((value) => /\bmortgage\s+mortgage\b/i.test(value))) {
      findings.push(`${tag.id} repeats "mortgage mortgage" in generated resource copy`);
    }
    if (tag.slug === "refinance-a-mortgage" && heading !== "Mortgage refinance resources") {
      findings.push(`${tag.id} has awkward resource heading "${heading}"`);
    }
  }

  assert.equal(
    findings.length,
    0,
    `Generated tag resource copy is not borrower-ready (${findings.length}):\n${findings.slice(0, 30).map((finding) => `- ${finding}`).join("\n")}${findings.length > 30 ? `\n- ...and ${findings.length - 30} more` : ""}`,
  );
});

test("canonical seed copy contains no public content-model vocabulary", () => {
  const relativePath = "mock-data/production-seed.json";
  const findings = collectPublicDataStrings(
    JSON.parse(read(relativePath)),
    relativePath,
    [],
    "",
    false,
    [],
    canonicalTaxonomyPatterns,
  );
  assertNoFindings("Canonical borrower copy still exposes content-model vocabulary:", [...new Set(findings)]);
});

test("production-facing rates copy never labels results as samples or illustrations", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await import("./rates-marketplace.mjs");
  const { renderRatesMarketplace } = await import("./rates-marketplace-ui.mjs");
  const fixture = normalizeMarketplaceFixture(JSON.parse(read("mock-data/rates-marketplace-fixtures.json")));
  const company = fixture.offers.find((offer) => offer.resultType === "company");
  const loanOfficer = fixture.offers.find((offer) => offer.resultType === "loanOfficer");
  const html = [
    renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS }),
    renderRatesMarketplace({
      fixture,
      state: {
        ...MARKETPLACE_DEFAULTS,
        expandedOfferIds: [company.id],
        expandedTabsByOffer: { [company.id]: "payment" },
      },
    }),
    renderRatesMarketplace({
      fixture,
      state: {
        ...MARKETPLACE_DEFAULTS,
        resultType: "loanOfficer",
        expandedOfferIds: [loanOfficer.id],
        expandedTabsByOffer: { [loanOfficer.id]: "details" },
      },
    }),
  ].join("\n");
  const visibleText = decodeHtmlText(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  assert.doesNotMatch(visibleText, /\b(?:illustrative|sample)\b/i);
});

test("article cards never turn internal reviewStatus values into borrower copy", () => {
  const relativePath = "site/app.js";
  const source = read(relativePath);
  const findings = [...source.matchAll(/humanStatus\s*\(\s*article\.reviewStatus\s*\)/g)].map((match) => {
    const line = lineNumber(source, match.index);
    return `${relativePath}:${line} ${compact(source.split(/\r?\n/)[line - 1])}`;
  });
  assertNoFindings("Article-card renderers still expose internal review status:", findings);
});

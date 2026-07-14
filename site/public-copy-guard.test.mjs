import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

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

function scanText(text, evidence) {
  const findings = [];
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(text)) findings.push(`${evidence} [${label}] "${compact(text)}"`);
  }
  return findings;
}

function scanSource(relativePath) {
  const source = read(relativePath);
  return sourceVisibleLines(relativePath, source).flatMap(({ line, text, sourceLine }) =>
    scanText(text, `${relativePath}:${line}`).map((finding) => `${finding} | ${compact(sourceLine)}`),
  );
}

function collectPublicDataStrings(value, file, pathParts = [], inheritedRoute = "", visibleContext = false, findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPublicDataStrings(item, file, [...pathParts, index], inheritedRoute, visibleContext, findings));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;

  const route = typeof value.route === "string" ? value.route : inheritedRoute;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    const isPublic = publicTextKeys.has(key) || visibleContext;
    if (typeof child === "string" && isPublic && (route || !file.endsWith("production-seed.json"))) {
      const evidence = route ? `${file} route ${route} (${childPath.join(".")})` : `${file} (${childPath.join(".")})`;
      findings.push(...scanText(child, evidence));
    } else if (child && typeof child === "object") {
      collectPublicDataStrings(child, file, childPath, route, isPublic, findings);
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

test("sample-offer wording appears only inside the marketplace disclosure", () => {
  const findings = [];
  const files = [
    ...publicSourceFiles,
    "mock-data/production-seed.json",
    "mock-data/editorial-content.json",
    "mock-data/rates-marketplace-fixtures.json",
  ];

  for (const relativePath of files) {
    const source = read(relativePath);
    const disclosureStart = relativePath === "site/rates-marketplace-ui.mjs" ? source.indexOf("function disclosure(") : -1;
    const disclosureEnd = disclosureStart >= 0 ? source.indexOf("\nfunction ", disclosureStart + 1) : -1;
    for (const match of source.matchAll(/\bsample offers?\b/gi)) {
      const line = lineNumber(source, match.index);
      const lineText = source.split(/\r?\n/)[line - 1] || "";
      const inRendererDisclosure = relativePath === "site/rates-marketplace-ui.mjs" && match.index >= disclosureStart && match.index < disclosureEnd;
      const inFixtureDisclosure = relativePath === "mock-data/rates-marketplace-fixtures.json" && /"(?:sampleOfferDisclosure|disclosure)"\s*:/.test(lineText);
      if (!inRendererDisclosure && !inFixtureDisclosure) {
        findings.push(`${relativePath}:${line} "${compact(lineText)}"`);
      }
    }
  }

  assertNoFindings("'Sample offer' wording is allowed only in the marketplace disclosure:", findings);
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

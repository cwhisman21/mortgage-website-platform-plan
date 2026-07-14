import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../mock-data/editorial/topic-hubs.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));

const PUBLIC_COPY_FIELDS = ["name", "heroSummary", "whyItMatters"];
const MEANINGFUL_BODY_FIELDS = ["heroSummary", "whyItMatters"];
const BANNED_PUBLIC_COPY = [
  /\btopic hub\b/i,
  /\bcontent graph\b/i,
  /\btrust layer\b/i,
  /\barticle links? back\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /\bdummy (?:copy|content|text)\b/i,
  /\bwrite (?:copy|content|text) here\b/i,
  /\badd (?:copy|content|text) here\b/i,
];

function visibleHubCopy(hub) {
  return [
    ...PUBLIC_COPY_FIELDS.map((field) => hub[field]),
    ...(hub.overviewParagraphs || []),
    ...(hub.startHere || []).flatMap((item) => [item.title, item.text]),
    ...(hub.comparisonPoints || []).flatMap((item) => [item.title, item.text]),
    hub.closingCta?.eyebrow,
    hub.closingCta?.title,
    hub.closingCta?.text,
    hub.closingCta?.label,
  ]
    .filter(Boolean)
    .join(" ");
}

function meaningfulHubBodyCopy(hub) {
  return [
    ...MEANINGFUL_BODY_FIELDS.map((field) => hub[field]),
    ...(hub.overviewParagraphs || []),
    ...(hub.startHere || []).map((item) => item.text),
    ...(hub.comparisonPoints || []).map((item) => item.text),
  ]
    .filter(Boolean)
    .join(" ");
}

function meaningfulWordCount(text) {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length || 0;
}

test("every borrower-facing topic guide contains at least 500 meaningful body words", () => {
  const borrowerHubs = source.topicHubs.filter(
    (hub) => hub.public === true && hub.slug !== "editorial-team",
  );

  assert.equal(borrowerHubs.length, 8, "expected the eight borrower topic guides");

  for (const hub of borrowerHubs) {
    const count = meaningfulWordCount(meaningfulHubBodyCopy(hub));
    assert.ok(count >= 500, `${hub.route} contains ${count} meaningful body words; expected at least 500`);
  }
});

test("borrower-facing topic guides do not expose editorial instructions or placeholders", () => {
  const borrowerHubs = source.topicHubs.filter(
    (hub) => hub.public === true && hub.slug !== "editorial-team",
  );

  for (const hub of borrowerHubs) {
    const copy = visibleHubCopy(hub);
    for (const pattern of BANNED_PUBLIC_COPY) {
      assert.doesNotMatch(copy, pattern, `${hub.route} contains banned public copy: ${pattern}`);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../mock-data/editorial/topic-hubs.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const sourceLedgerUrl = new URL("../mock-data/editorial/source-ledger.json", import.meta.url);
const sourceLedger = JSON.parse(await readFile(sourceLedgerUrl, "utf8"));

const EXPECTED_CLAIM_SOURCE_IDS = {
  "blog-local-market-updates": [
    "fhfa-hpi-2026q1",
    "freddie-mac-pmms-2026-07-09",
    "cfpb-loan-estimate",
  ],
  "blog-buying-a-home": [
    "cfpb-homebuying-budget-2026",
    "cfpb-find-right-home-2024",
    "freddie-mac-homebuying-budget-2025",
    "cfpb-compare-loan-estimates",
  ],
  "blog-refinance": [
    "cfpb-mortgage-key-terms",
    "cfpb-should-i-refinance-2020",
    "freddie-mac-refinance-costs",
    "cfpb-loan-estimate",
  ],
  "blog-fha-loans": [
    "cfpb-fha-loans",
    "hud-fha-handbook-4000-1",
    "hud-fha-loan-limits-2026",
    "cfpb-loan-estimate",
  ],
  "blog-va-loans": [
    "va-home-loans",
    "va-purchase-loan-2026",
    "va-home-loan-eligibility-2025",
    "va-home-loan-entitlement-limits-2025",
    "va-funding-fee-closing-costs-2026",
    "va-home-buying-process-2026",
    "cfpb-loan-estimate",
  ],
  "blog-jumbo-loans": [
    "fhfa-conforming-loan-limits-2026",
    "cfpb-jumbo-loan",
    "cfpb-conventional-loans-2024",
    "cfpb-loan-estimate",
  ],
  "blog-home-equity": [
    "cfpb-home-equity-loan-vs-heloc-2025",
    "cfpb-heloc-overview-2024",
    "cfpb-home-equity-loan-2024",
    "cfpb-heloc-brochure",
    "cfpb-heloc-first-mortgage-refinance-2024",
    "cfpb-cashout-research-2025",
  ],
  "blog-taxes-insurance": [
    "cfpb-escrow-account-2024",
    "cfpb-total-monthly-mortgage-payment-2023",
    "fema-floodsmart",
    "naic-homeowners-insurance",
  ],
  "blog-editorial-team": [
    "cfpb-owning-a-home",
    "cfpb-loan-estimate",
  ],
};

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

test("public topic hubs carry a factual date and only their claim-level source inheritance", () => {
  const publicHubs = source.topicHubs.filter((hub) => hub.public === true);
  const knownSourceIds = new Set(sourceLedger.sources.map((item) => item.id));

  assert.equal(publicHubs.length, 9, "expected the nine public topic hubs");

  for (const hub of publicHubs) {
    assert.equal(hub.lastUpdated, "2026-07-13", `${hub.route} needs a factual Last updated date`);
    assert.deepEqual(
      hub.sourceIds,
      EXPECTED_CLAIM_SOURCE_IDS[hub.id],
      `${hub.route} must cite only sources tied to claims rendered on the hub`,
    );
    assert.equal(new Set(hub.sourceIds).size, hub.sourceIds.length, `${hub.route} repeats a source ID`);
    for (const sourceId of hub.sourceIds) {
      assert.ok(knownSourceIds.has(sourceId), `${hub.route} cites missing source ${sourceId}`);
    }
  }
});

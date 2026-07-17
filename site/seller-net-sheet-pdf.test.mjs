import test from "node:test";
import assert from "node:assert/strict";

import { PDFDocument } from "./vendor/pdf-lib.esm.min.js";
import {
  buildSellerNetSheetPdfModel,
  createSellerNetSheetPdf,
  downloadSellerNetSheetPdf,
  planSellerNetSheetPdfLayout,
} from "./seller-net-sheet-pdf.mjs";

const unlockedInput = {
  address: "1842 Harbor View Drive, San Diego, CA 92109",
  generatedDate: "2026-07-16",
  expectedClosingDate: "2026-08-15",
  valueRange: {
    lowCents: 69_500_000,
    selectedCents: 72_500_000,
    highCents: 75_500_000,
  },
  netSheet: {
    groups: {
      sellingExpenses: [
        { id: "listingCompensation", label: "Listing-side compensation", amountCents: 1_812_500 },
        { id: "sellerTitleEscrowSettlement", label: "Seller title, escrow, and settlement services", amountCents: 725_000 },
      ],
      obligations: [
        { id: "firstMortgage", label: "First mortgage payoff", amountCents: 41_800_000 },
        { id: "secondMortgageHeloc", label: "Second mortgage or HELOC payoff", amountCents: 2_000_000 },
        { id: "otherLiens", label: "Other liens", amountCents: 500_000 },
      ],
    },
    totalSellingExpensesCents: 2_537_500,
    netBeforeObligationsCents: 69_962_500,
    totalObligationsCents: 44_300_000,
    projected: { kind: "proceeds", amountCents: 25_662_500 },
    scenarios: {
      low: { salePriceCents: 69_500_000, kind: "proceeds", amountCents: 22_737_500 },
      selected: { salePriceCents: 72_500_000, kind: "proceeds", amountCents: 25_662_500 },
      high: { salePriceCents: 75_500_000, kind: "proceeds", amountCents: 28_587_500 },
    },
  },
};

test("PDF model follows the unlocked web statement order", () => {
  const model = buildSellerNetSheetPdfModel(unlockedInput);
  assert.equal(model.title, "Seller Net Sheet");
  assert.equal(model.address, "1842 Harbor View Drive, San Diego, CA 92109");
  assert.deepEqual(model.values.map((value) => value.label), ["Low", "Selected", "High"]);
  assert.deepEqual(model.sections.map((section) => section.title), ["Selling expenses", "Existing obligations", "Summary"]);
  assert.deepEqual(model.sections[0].rows.map((row) => row.label), [
    "Listing-side compensation",
    "Seller title, escrow, and settlement services",
  ]);
  assert.deepEqual(model.sections[2].rows.map((row) => row.label), [
    "Total selling expenses",
    "Net before obligations",
    "Total obligations",
    "Projected net proceeds",
  ]);
  assert.deepEqual(model.comparison.map((value) => value.label), ["Low-value proceeds", "High-value proceeds"]);
  assert.match(model.disclaimer, /^This seller net sheet is a planning estimate/);
});

test("PDF model uses shortfall labels without negative proceeds wording", () => {
  const input = structuredClone(unlockedInput);
  input.netSheet.projected = { kind: "shortfall", amountCents: 1_000_000 };
  input.netSheet.scenarios.low = { ...input.netSheet.scenarios.low, kind: "shortfall", amountCents: 2_000_000 };

  const model = buildSellerNetSheetPdfModel(input);

  assert.equal(model.sections[2].rows.at(-1).label, "Projected shortfall");
  assert.deepEqual(model.comparison.map((value) => value.label), ["Low-value shortfall", "High-value proceeds"]);
});

test("PDF generation returns a loadable branded US Letter document and safe filename", async () => {
  const { bytes, filename } = await createSellerNetSheetPdf(unlockedInput);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.equal(filename, "snap-seller-net-sheet-1842-harbor-view-drive-san-diego-ca-92109.pdf");
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getTitle(), "Seller Net Sheet - 1842 Harbor View Drive, San Diego, CA 92109");
  assert.equal(pdf.getSubject(), "Seller net sheet planning estimate");
  assert.equal(pdf.getCreator(), "Snap Mortgage");
  assert.equal(pdf.getProducer(), "Snap Mortgage");
  assert.deepEqual(pdf.getPages()[0].getSize(), { width: 612, height: 792 });
  assert.ok(pdf.getPageCount() >= 1);
});

test("PDF generation paginates long normalized statements", async () => {
  const input = structuredClone(unlockedInput);
  input.netSheet.groups.sellingExpenses = Array.from({ length: 48 }, (_, index) => ({
    id: `cost-${index}`,
    label: `Seller cost ${index + 1}`,
    amountCents: 10_000 + index,
  }));

  const { bytes } = await createSellerNetSheetPdf(input);
  const pdf = await PDFDocument.load(bytes);

  assert.ok(pdf.getPageCount() >= 2);
  for (const page of pdf.getPages()) assert.deepEqual(page.getSize(), { width: 612, height: 792 });
});

function textOperations(layout) {
  return layout.operations.filter((operation) => operation.type === "text");
}

function assertOperationsInsideLetterMargins(layout) {
  for (const operation of textOperations(layout)) {
    assert.ok(operation.x >= 44, `${operation.role} starts before the left margin`);
    assert.ok(operation.y >= 44, `${operation.role} starts below the bottom margin`);
    assert.ok(operation.x + operation.width <= 568.001, `${operation.role} crosses the right margin`);
    assert.ok(operation.y + operation.height <= 748.001, `${operation.role} crosses the top margin`);
  }
}

test("production layout trace contains the complete statement once inside Letter margins", async () => {
  const layout = await planSellerNetSheetPdfLayout(unlockedInput);
  const operations = textOperations(layout);
  const texts = operations.map((operation) => operation.text);

  assertOperationsInsideLetterMargins(layout);
  for (const requiredText of [
    "Seller Net Sheet",
    unlockedInput.address,
    "Selling expenses",
    "Existing obligations",
    "Summary",
    "Total selling expenses",
    "Net before obligations",
    "Total obligations",
    "Projected net proceeds",
    "Final value comparison",
    "Low-value proceeds",
    "High-value proceeds",
  ]) {
    assert.ok(texts.includes(requiredText), `missing ${requiredText}`);
  }
  assert.equal(operations.filter((operation) => operation.role === "disclaimer").length, 1);
});

test("every continuation page repeats the brand and complete address context", async () => {
  const input = structuredClone(unlockedInput);
  input.address = "1842 " + "HarborViewDrive".repeat(70) + ", San Diego, CA 92109";
  input.netSheet.groups.sellingExpenses = Array.from({ length: 48 }, (_, index) => ({
    id: `cost-${index}`,
    label: `Seller cost ${index + 1}`,
    amountCents: 10_000 + index,
  }));

  const layout = await planSellerNetSheetPdfLayout(input);
  assert.ok(layout.pageCount > 1);
  assertOperationsInsideLetterMargins(layout);
  for (let page = 2; page <= layout.pageCount; page += 1) {
    const pageOperations = textOperations(layout).filter((operation) => operation.page === page);
    assert.ok(pageOperations.some((operation) => operation.role === "brand" && operation.text === "SNAP MORTGAGE"));
    const address = pageOperations
      .filter((operation) => operation.role === "continuation-address")
      .map((operation) => operation.text)
      .join("")
      .replaceAll(/\s/g, "");
    assert.equal(address, input.address.replaceAll(/\s/g, ""), `page ${page} has incomplete address context`);
  }
});

test("a section that fits on a fresh page starts there instead of splitting", async () => {
  const input = structuredClone(unlockedInput);
  input.netSheet.groups.sellingExpenses = Array.from({ length: 21 }, (_, index) => ({
    id: `fresh-page-cost-${index}`,
    label: `Fresh-page seller cost ${index + 1}`,
    amountCents: 10_000 + index,
  }));

  const layout = await planSellerNetSheetPdfLayout(input);
  const operations = textOperations(layout);
  const sectionTitle = operations.find((operation) => operation.role === "section-title" && operation.text === "Selling expenses");

  assert.equal(sectionTitle.page, 2);
  assert.equal(operations.some((operation) => operation.page === 1 && operation.section === "Selling expenses" && operation.role === "row-label"), false);
});

test("oversized unbroken row labels split across bounded pages with repeated value context", async () => {
  const input = structuredClone(unlockedInput);
  input.address = "A".repeat(900);
  const oversizedLabel = "B".repeat(9_000);
  input.netSheet.groups.sellingExpenses = [{ id: "oversized", label: oversizedLabel, amountCents: 123_456 }];

  const layout = await planSellerNetSheetPdfLayout(input);
  const rowLabels = textOperations(layout).filter((operation) => operation.role === "row-label" && operation.rowId === "oversized");
  const rowPages = [...new Set(rowLabels.map((operation) => operation.page))];

  assertOperationsInsideLetterMargins(layout);
  assert.ok(rowPages.length > 1);
  assert.equal(rowLabels.map((operation) => operation.text).join(""), oversizedLabel);
  for (const page of rowPages) {
    assert.ok(textOperations(layout).some((operation) => operation.page === page && operation.role === "row-value" && operation.rowId === "oversized"));
  }
});

test("PDF filename removes unsafe address characters", async () => {
  const input = structuredClone(unlockedInput);
  input.address = "  12 O'Neil / Harbor #5, San Diego, CA  ";

  const { filename } = await createSellerNetSheetPdf(input);

  assert.equal(filename, "snap-seller-net-sheet-12-o-neil-harbor-5-san-diego-ca.pdf");
});

test("direct download clicks a temporary anchor and revokes its object URL", async () => {
  const calls = [];
  const link = {
    click() { calls.push("click"); },
    remove() { calls.push("remove"); },
  };
  const browser = {
    URL: {
      createObjectURL(blob) {
        calls.push(["create", blob.type, blob.size]);
        return "blob:seller-net-sheet";
      },
      revokeObjectURL(url) { calls.push(["revoke", url]); },
    },
    document: {
      createElement(tagName) {
        calls.push(["element", tagName]);
        return link;
      },
      body: { append(element) { calls.push(["append", element]); } },
    },
    setTimeout(callback, delay) {
      calls.push(["timeout", delay]);
      callback();
    },
  };

  const result = await downloadSellerNetSheetPdf(unlockedInput, browser);

  assert.equal(result.filename, "snap-seller-net-sheet-1842-harbor-view-drive-san-diego-ca-92109.pdf");
  assert.equal(link.href, "blob:seller-net-sheet");
  assert.equal(link.download, result.filename);
  assert.equal(link.hidden, true);
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "create", "element", "append", "click", "remove", "timeout", "revoke",
  ]);
  assert.equal(calls[0][1], "application/pdf");
  assert.ok(calls[0][2] > 0);
});

test("direct download removes the anchor and revokes the URL when click throws", async () => {
  const calls = [];
  const browser = {
    URL: {
      createObjectURL() { calls.push("create"); return "blob:throwing-click"; },
      revokeObjectURL(url) { calls.push(`revoke:${url}`); },
    },
    document: {
      createElement() {
        return {
          click() { calls.push("click"); throw new Error("blocked download"); },
          remove() { calls.push("remove"); },
        };
      },
      body: { append() { calls.push("append"); } },
    },
    setTimeout(callback) { calls.push("timeout"); callback(); },
  };

  await assert.rejects(downloadSellerNetSheetPdf(unlockedInput, browser), /blocked download/);
  assert.deepEqual(calls, ["create", "append", "click", "remove", "timeout", "revoke:blob:throwing-click"]);
});

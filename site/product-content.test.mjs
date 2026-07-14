import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { meaningfulWordCount, productContentById, renderProductContent } from "./product-content.mjs";

const bundle = JSON.parse(await readFile(new URL("../mock-data/product-copy.json", import.meta.url), "utf8"));
const ledger = JSON.parse(await readFile(new URL("../mock-data/editorial/source-ledger.json", import.meta.url), "utf8"));

test("all canonical product pages have at least 500 meaningful borrower-facing words", () => {
  const ids = ["product-purchase", "product-refinance", "product-fha", "product-va", "product-conventional", "product-jumbo", "product-home-equity", "product-cash-out-refinance"];
  assert.deepEqual(bundle.products.map((item) => item.id).sort(), ids.sort());
  for (const product of bundle.products) assert.ok(meaningfulWordCount(product) >= 500, `${product.id} has ${meaningfulWordCount(product)} words`);
});

test("meaningful product word counts exclude headings, labels, and FAQ questions", () => {
  const product = {
    title: "Excluded product title",
    summary: "Useful body.",
    sections: [{
      heading: "Excluded section heading",
      navLabel: "Excluded navigation label",
      eyebrow: "Excluded eyebrow label",
      paragraphs: ["More body copy."],
    }],
    questions: [{ question: "Excluded FAQ question?", answer: "Answer body." }],
    closingCta: { title: "Excluded CTA title", text: "Excluded CTA text" },
  };

  assert.equal(meaningfulWordCount(product), 7);
});

test("all canonical product pages have unique, useful meta descriptions", () => {
  const descriptions = bundle.products.map(({ id }) => {
    const description = productContentById(bundle, id)?.metaDescription;
    assert.equal(typeof description, "string", `${id} needs a meta description`);
    assert.ok(
      description.length >= 120 && description.length <= 160,
      `${id} meta description has ${description.length} characters; expected 120-160`,
    );
    assert.ok(
      (description.match(/[A-Za-z0-9]+(?:['\u2019-][A-Za-z0-9]+)*/g) || []).length >= 16,
      `${id} meta description should provide substantive borrower context`,
    );
    assert.doesNotMatch(description, /guaranteed|lowest rate|everyone qualifies|placeholder|prototype/i);
    return description;
  });

  assert.equal(new Set(descriptions).size, descriptions.length, "product meta descriptions must be unique");
});

test("product copy excludes placeholders, editorial instructions, and risky promises", () => {
  const text = JSON.stringify(bundle);
  for (const pattern of [/placeholder/i, /dummy/i, /lorem ipsum/i, /a product page/i, /this page (?:should|needs to)/i, /guaranteed approval/i, /lowest rate/i, /everyone qualifies/i, /no[- ]cost loan/i]) assert.doesNotMatch(text, pattern);
});

test("every product guide cites authoritative source records", () => {
  const sources = new Map(ledger.sources.map((source) => [source.id, source]));
  for (const product of bundle.products) {
    assert.ok(product.sourceIds?.length >= 2, `${product.id} needs at least two source IDs`);
    for (const sourceId of product.sourceIds) {
      const source = sources.get(sourceId);
      assert.ok(source, `${product.id} cites missing source ${sourceId}`);
      assert.equal(source.authoritative, true);
      assert.match(source.url, /^https:\/\//);
    }
  }
});

test("product renderer exposes substantive sections and questions", () => {
  const html = renderProductContent(productContentById(bundle, "product-fha"), { sources: ledger.sources });
  assert.match(html, /Build an FHA comparison/);
  assert.match(html, /Questions to settle before you choose/);
  assert.match(html, /Rules and guidance used in this comparison/);
  assert.doesNotMatch(html, /educates without implying/i);
});

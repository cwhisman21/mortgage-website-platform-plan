import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

async function loadUiModule() {
  return import("./rates-marketplace-ui.mjs");
}

async function loadMarketplaceModule() {
  return import("./rates-marketplace.mjs");
}

function loadFixture() {
  const source = fs.readFileSync(
    new URL("../mock-data/rates-marketplace-fixtures.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(source);
}

function textFromHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this._innerHTML = "";
    this.textContent = "";
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this.children = parseHtml(this._innerHTML, this);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute(name, value = "") {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "value") this.value = stringValue;
    if (name === "checked") this.checked = true;
    if (name === "hidden") this.hidden = true;
    if (name === "disabled") this.disabled = true;
    if (name === "class") this.className = stringValue;
    if (name.startsWith("data-")) {
      this.dataset[toDatasetKey(name.slice(5))] = stringValue;
    }
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "hidden") this.hidden = false;
    if (name === "disabled") this.disabled = false;
  }

  addEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target ||= this;
    event.currentTarget = this;
    for (const listener of this.eventListeners.get(event.type) || []) {
      listener.call(this, event);
    }
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent(new TestEvent("click", { bubbles: true }));
  }

  focus() {
    globalThis.document.activeElement = this;
    this.dispatchEvent(new TestEvent("focus"));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);
    const descendants = allDescendants(this);
    return descendants.filter((element) => selectors.some((part) => matchesSelector(element, part)));
  }
}

class TestEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.key = options.key;
    this.defaultPrevented = false;
    this.target = options.target || null;
    this.currentTarget = null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class TestKeyboardEvent extends TestEvent {}
class TestCustomEvent extends TestEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
}

function toDatasetKey(name) {
  return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseAttributes(raw) {
  const attributes = [];
  const pattern = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(raw))) {
    attributes.push([match[1], match[2] ?? match[3] ?? match[4] ?? ""]);
  }
  return attributes;
}

function parseHtml(html, root) {
  const stack = [root];
  const nodes = [];
  const pattern = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
  let match;
  while ((match = pattern.exec(html))) {
    const [source, tagName, rawAttributes] = match;
    if (source.startsWith("</")) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const element = new TestElement(tagName);
    for (const [name, value] of parseAttributes(rawAttributes)) {
      element.setAttribute(name, value);
    }
    const parent = stack[stack.length - 1];
    element.parentNode = parent;
    parent.children.push(element);
    nodes.push(element);
    if (!source.endsWith("/>") && !["input", "br", "hr", "img", "meta", "link"].includes(tagName.toLowerCase())) {
      stack.push(element);
    }
  }
  return nodes.filter((node) => node.parentNode === root);
}

function allDescendants(root) {
  const output = [];
  const visit = (node) => {
    for (const child of node.children) {
      output.push(child);
      visit(child);
    }
  };
  visit(root);
  return output;
}

function matchesSelector(element, selector) {
  const normalized = selector.trim();
  const dataMatch = normalized.match(/^\[([^=\]]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]$/);
  if (dataMatch) {
    const [, name, doubleValue, singleValue, bareValue] = dataMatch;
    const expected = doubleValue ?? singleValue ?? bareValue;
    if (!element.hasAttribute(name)) return false;
    return expected == null || element.getAttribute(name) === expected;
  }
  const tagAttrMatch = normalized.match(/^([a-zA-Z0-9-]+)(\[.+\])$/);
  if (tagAttrMatch) {
    return element.tagName.toLowerCase() === tagAttrMatch[1].toLowerCase() && matchesSelector(element, tagAttrMatch[2]);
  }
  return element.tagName.toLowerCase() === normalized.toLowerCase();
}

function installDom() {
  const listeners = new Map();
  const documentElement = new TestElement("html");
  const document = {
    activeElement: null,
    documentElement,
    createElement(tagName) {
      return new TestElement(tagName);
    },
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];
      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener.call(document, event);
      return !event.defaultPrevented;
    },
  };
  const storage = new Map();
  globalThis.document = document;
  globalThis.CustomEvent = TestCustomEvent;
  globalThis.KeyboardEvent = TestKeyboardEvent;
  globalThis.localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  globalThis.window = {
    dispatchEvent(event) {
      return document.dispatchEvent(event);
    },
  };
  return { document, storage };
}

test("renders approved scenario controls, results, tabs, links, disclosure, and analytics hooks", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const html = renderRatesMarketplace({
    fixture,
    state: MARKETPLACE_DEFAULTS,
  });
  const text = textFromHtml(html);

  assert.match(html, /data-rates-marketplace/);
  assert.match(text, /Mortgage type/);
  assert.match(text, /Purchase price/);
  assert.match(text, /Down payment/);
  assert.match(text, /Property value/);
  assert.match(text, /Loan balance/);
  assert.match(text, /Cash-out refinance/);
  assert.match(text, /Companies/);
  assert.match(text, /Loan officers/);
  for (const label of [
    "Lowest 8-year cost",
    "Lowest APR",
    "Lowest rate",
    "Lowest monthly payment",
    "Lowest upfront cost",
    "Highest rating",
  ]) {
    assert.match(text, new RegExp(label, "i"));
  }
  assert.match(text, /Purchase \| 92109 \| \$1,060,000 price \| 20% down/);
  assert.match(text, /These sample offers illustrate/);
  assert.equal((html.match(/data-offer-id=/g) || []).length, 8);
  assert.match(text, /Show more offers/);
  assert.match(text, /Details/);
  assert.match(text, /Payment/);
  assert.match(text, /Reviews/);
  assert.match(text, /Read-only review source/);
  assert.equal(html.includes('href="/companies/'), false);
  assert.match(html, /href="\/loan-officers\/ava-martinez"/);
  assert.match(html, /data-chart-segment/);
  assert.match(html, /aria-describedby="[^"]*payment-detail/);
  for (const eventName of [
    "rates_marketplace_update",
    "rates_marketplace_reset",
    "rates_marketplace_result_type",
    "rates_marketplace_sort",
    "rates_marketplace_show_more",
    "rates_marketplace_expand_offer",
    "rates_marketplace_tab",
    "rates_marketplace_payment_assumption",
    "rates_marketplace_chart_detail",
    "rates_marketplace_prequal",
  ]) {
    assert.match(html, new RegExp(`data-analytics-event="${eventName}"`));
  }
});

test("wires result type, sort, show-more, expansion, tabs, payment edits, chart details, persistence, and analytics", async () => {
  installDom();
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace, wireRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const root = new TestElement("main");
  const tracked = [];
  const navigated = [];

  root.innerHTML = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  wireRatesMarketplace(root, {
    fixture,
    accountContext: {},
    navigate(path) {
      navigated.push(path);
    },
    track(name, payload) {
      tracked.push({ name, payload });
    },
  });

  const marketplace = root.querySelector("[data-rates-marketplace]");
  assert.ok(marketplace);
  assert.equal(marketplace.querySelectorAll("[data-offer-id]").length, 8);

  marketplace.querySelector('[data-result-type-option="loanOfficer"]').click();
  assert.match(textFromHtml(marketplace.innerHTML), /Ava Martinez/);
  assert.equal(tracked.at(-1).name, "rates_marketplace_result_type");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["resultType"]);

  const sort = marketplace.querySelector("[data-marketplace-sort]");
  sort.value = "highestRating";
  sort.dispatchEvent(new TestEvent("change", { bubbles: true }));
  assert.equal(tracked.at(-1).name, "rates_marketplace_sort");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["sort"]);

  marketplace.querySelector("[data-show-more-offers]").click();
  assert.equal(marketplace.querySelectorAll("[data-offer-id]").length, 10);
  assert.equal(tracked.at(-1).name, "rates_marketplace_show_more");

  const firstDetails = marketplace.querySelector("[data-offer-details]");
  firstDetails.click();
  assert.equal(marketplace.querySelectorAll("[data-expanded-offer]").length, 1);
  assert.equal(tracked.at(-1).name, "rates_marketplace_expand_offer");

  marketplace.querySelector('[data-offer-tab="payment"]').click();
  assert.match(textFromHtml(marketplace.innerHTML), /Total monthly payment/);
  assert.equal(tracked.at(-1).name, "rates_marketplace_tab");

  const totalBefore = marketplace.querySelector("[data-payment-total]").textContent;
  const insurance = marketplace.querySelector('[data-payment-assumption="homeownersInsurance"]');
  insurance.value = "245";
  insurance.dispatchEvent(new TestEvent("input", { bubbles: true }));
  const totalAfter = marketplace.querySelector("[data-payment-total]").textContent;
  assert.notEqual(totalBefore, totalAfter);
  assert.equal(tracked.at(-1).name, "rates_marketplace_payment_assumption");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["field", "offerId"]);

  const chartControl = marketplace.querySelector("[data-chart-segment]");
  chartControl.dispatchEvent(new TestKeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(chartControl.getAttribute("aria-pressed"), "true");
  assert.equal(tracked.at(-1).name, "rates_marketplace_chart_detail");

  marketplace.querySelector("[data-prequal-offer]").click();
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["offerId", "resultType"]);
  assert.equal(navigated.length, 1);

  const cached = JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState"));
  assert.equal(cached.resultType, "loanOfficer");
  assert.equal(cached.sort, "highestRating");
  assert.equal("email" in cached, false);
});

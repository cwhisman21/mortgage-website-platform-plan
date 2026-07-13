import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

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

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) return "";
  let depth = 0;
  let started = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
      started = true;
    } else if (char === "}") {
      depth -= 1;
      if (started && depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return "";
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
  const classMatch = normalized.match(/^\.([a-zA-Z0-9_-]+)$/);
  if (classMatch) {
    return (element.getAttribute("class") || "").split(/\s+/).includes(classMatch[1]);
  }
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
}

test("registers a dedicated prequal handoff route with borrower-ready content and recovery copy", () => {
  const handoffSource = extractFunctionSource(appSource, "prequalHandoffPage");
  const returnSource = extractFunctionSource(appSource, "returnToRatesUrl");

  assert.match(appSource, /\/prequal\/start/);
  assert.ok(handoffSource, "prequalHandoffPage should exist");
  assert.ok(returnSource, "returnToRatesUrl should exist");
  assert.match(handoffSource, /Your selected option is ready to continue/);
  assert.match(handoffSource, /Return to rate results/);
  assert.match(handoffSource, /We could not reopen that selected option/);
  assert.match(handoffSource, /No name, email, or phone number has been requested on this comparison page\./);
  assert.match(handoffSource, /NMLS/i);
  assert.doesNotMatch(handoffSource, /<form|<input|upload|eligib|approv|underwrit|lock/i);
});

test("marketplace next emits the approved event and navigates to a restorable prequal handoff URL", async () => {
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
    navigate(path, options) {
      navigated.push({ path, options });
    },
    track(name, payload) {
      tracked.push({ name, payload });
    },
  });

  root.querySelector('[data-result-type-option="loanOfficer"]').click();
  const sort = root.querySelector("[data-marketplace-sort]");
  sort.value = "highestRating";
  sort.dispatchEvent(new TestEvent("change", { bubbles: true }));
  root.querySelector("[data-show-more-offers]").click();

  const firstDetails = root.querySelector("[data-offer-details]");
  const expandedOfferId = firstDetails.getAttribute("data-offer-details");
  firstDetails.click();
  root.querySelector('[data-offer-tab="payment"]').click();

  const nextButton = root.querySelector(`[data-prequal-offer="${expandedOfferId}"]`);
  nextButton.click();

  assert.equal(tracked.at(-1).name, "rates_provider_next");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["offerId", "resultType", "sort", "tab", "visibleCount"]);

  assert.equal(navigated.length, 1);
  const [{ path }] = navigated;
  const url = new URL(path, "https://snap.test");
  assert.equal(url.pathname, "/prequal/start");
  assert.equal(url.searchParams.get("offerId"), expandedOfferId);
  assert.equal(url.searchParams.get("resultType"), "loanOfficer");
  assert.equal(url.searchParams.get("sort"), "highestRating");
  assert.equal(url.searchParams.get("visibleCount"), "16");
  assert.equal(url.searchParams.get("expandedOfferId"), expandedOfferId);
  assert.equal(url.searchParams.get("expandedTab"), "payment");
  assert.equal(url.searchParams.get("zip"), "92109");
  assert.equal(url.searchParams.get("email"), null);
  assert.equal(url.searchParams.get("token"), null);
  assert.equal(url.searchParams.get("annualIncome"), null);

  const cached = JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState"));
  assert.equal(cached.resultType, "loanOfficer");
  assert.equal(cached.sort, "highestRating");
  assert.equal(cached.visibleCount, 16);
  assert.equal(cached.expandedOfferId, expandedOfferId);
  assert.equal(cached.expandedTab, "payment");
});

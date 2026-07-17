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

const ratesStylesheet = fs.readFileSync(new URL("./rates-marketplace.css", import.meta.url), "utf8");

test("the currency shell owns the only visible input border", () => {
  assert.match(ratesStylesheet, /\.rates-input-shell\s*>\s*input\s*\{[\s\S]*?border:\s*0;[\s\S]*?outline:\s*0;[\s\S]*?box-shadow:\s*none;[\s\S]*?-webkit-appearance:\s*none;/);
  assert.match(ratesStylesheet, /\.rates-input-shell:focus-within\s*\{[\s\S]*?border-color:\s*var\(--snap-blue\);[\s\S]*?box-shadow:/);
  assert.match(ratesStylesheet, /input\[type="number"\]::-webkit-inner-spin-button[\s\S]*?-webkit-appearance:\s*none;[\s\S]*?display:\s*none/);
});

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

test("renders the approved filter rail, utility bar, comparison rows, and bottom disclosure", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const loanOfficerOffer = fixture.offers.find((offer) => offer.resultType === "loanOfficer" && offer.mortgageType === "purchase");
  const companyOffer = fixture.offers.find((offer) => offer.resultType === "company" && offer.mortgageType === "purchase");
  const html = renderRatesMarketplace({
    fixture,
    state: MARKETPLACE_DEFAULTS,
  });
  const paymentHtml = renderRatesMarketplace({
    fixture,
    state: {
      ...MARKETPLACE_DEFAULTS,
      expandedOfferIds: [companyOffer.id],
      expandedTabsByOffer: { [companyOffer.id]: "payment" },
    },
  });
  const loanOfficerHtml = renderRatesMarketplace({
    fixture,
    state: {
      ...MARKETPLACE_DEFAULTS,
      resultType: "loanOfficer",
      expandedOfferIds: [loanOfficerOffer.id],
      expandedTabsByOffer: { [loanOfficerOffer.id]: "details" },
    },
  });
  const combinedHtml = `${html}\n${paymentHtml}\n${loanOfficerHtml}`;
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
    "Lowest simplified APR",
    "Lowest rate",
    "Lowest monthly payment",
    "Lowest points",
    "Lowest upfront cost",
  ]) {
    assert.match(text, new RegExp(label, "i"));
  }
  assert.doesNotMatch(text, /Highest rating/i);
  assert.doesNotMatch(text, /Your comparison filters/i);
  assert.doesNotMatch(html, /<h2[^>]*>\s*Your scenario\s*<\/h2>/i);
  assert.doesNotMatch(text, /Changes are applied together/i);
  assert.doesNotMatch(html, /rates-mobile-scenario/);
  assert.equal((html.match(/data-marketplace-sort/g) || []).length, 1);
  assert.match(text, /mortgage options/i);
  assert.match(textFromHtml(loanOfficerHtml), /mortgage options/i);
  assert.match(text, /Rate and cost details/i);
  assert.doesNotMatch(textFromHtml(combinedHtml), /\billustrative\b|\bsample mortgage\b|\bsample offers?\b/i);
  assert.ok(html.indexOf("data-rates-disclosure") > html.lastIndexOf("data-offer-id="));
  assert.match(text, /Rate/i);
  assert.match(text, /APR/i);
  assert.match(text, /Payment/i);
  assert.match(text, /Points/i);
  assert.match(text, /Upfront/i);
  assert.match(text, /8-year cost/i);
  assert.match(html, /data-prequal-offer="[^"]+"[^>]*>Continue</i);
  assert.doesNotMatch(text, /without a live provider feed/i);
  assert.match(textFromHtml(combinedHtml), /interest paid through the first 96 payments/i);
  assert.doesNotMatch(text, /fixture data|UI development|fictional/i);
  assert.equal((html.match(/data-offer-id=/g) || []).length, 8);
  assert.match(text, /Show more offers/);
  assert.doesNotMatch(html, /<div hidden aria-hidden="true">/);
  assert.match(textFromHtml(loanOfficerHtml), /Details/);
  assert.match(textFromHtml(loanOfficerHtml), /Payment/);
  assert.doesNotMatch(textFromHtml(loanOfficerHtml), /Customer reviews/);
  assert.doesNotMatch(combinedHtml, /data-offer-tab="reviews"/);
  assert.match(textFromHtml(loanOfficerHtml), /Scenario and pricing details/i);
  assert.match(textFromHtml(loanOfficerHtml), /Loan amount and LTV/i);
  assert.match(textFromHtml(loanOfficerHtml), /Credit assumption/i);
  assert.match(textFromHtml(loanOfficerHtml), /Geography assumption/i);
  assert.match(textFromHtml(loanOfficerHtml), /Lock assumption/i);
  assert.match(textFromHtml(loanOfficerHtml), /Points and credits/i);
  assert.match(textFromHtml(loanOfficerHtml), /Included costs/i);
  assert.match(textFromHtml(loanOfficerHtml), /Excluded costs/i);
  assert.match(textFromHtml(loanOfficerHtml), /Source and date/i);
  assert.doesNotMatch(combinedHtml, /NMLS\s*\d|Rating|\/ 5|Taylor B\.|Jordan M\.|Morgan S\.|Avery L\./i);
  assert.equal(html.includes('href="/companies/'), false);
  assert.equal(loanOfficerHtml.includes('href="/loan-officers/'), false);
  assert.match(html, /class="rates-form-actions"[\s\S]*data-reset-marketplace[\s\S]*data-update-marketplace/);
  assert.match(paymentHtml, /data-chart-segment/);
  assert.match(paymentHtml, /aria-describedby="[^"]*payment-detail/);
  assert.match(combinedHtml, /role="tabpanel"/);
  assert.match(combinedHtml, /aria-controls="rates-panel-/);
  for (const eventName of [
    "rates_marketplace_update",
    "rates_marketplace_reset",
    "rates_marketplace_result_type",
    "rates_marketplace_sort",
    "rates_marketplace_show_more",
    "rates_marketplace_expand_offer",
    "rates_marketplace_expand_all",
    "rates_marketplace_tab",
    "rates_marketplace_payment_assumption",
    "rates_marketplace_chart_detail",
    "rates_provider_next",
  ]) {
    assert.match(combinedHtml, new RegExp(`data-analytics-event="${eventName}"`));
  }
});

test("renders multiple expanded offers with independent tabs", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const [first, second] = fixture.offers.filter(
    (offer) => offer.resultType === "company" && offer.mortgageType === "purchase",
  );

  const html = renderRatesMarketplace({
    fixture,
    state: {
      ...MARKETPLACE_DEFAULTS,
      expandedOfferIds: [first.id, second.id],
      expandedTabsByOffer: {
        [first.id]: "payment",
        [second.id]: "details",
      },
    },
  });

  assert.equal((html.match(/data-expanded-offer=/g) || []).length, 2);
  assert.match(html, new RegExp(`data-expanded-offer="${first.id}"[\\s\\S]*data-payment-panel="${first.id}"`));
  assert.match(html, new RegExp(`data-expanded-offer="${second.id}"[\\s\\S]*Listed upfront cost`));
  assert.match(html, /data-expand-all/);
  assert.match(textFromHtml(html), /Expand all/i);
});

test("uses a fixed provider media slot for company logos and loan-officer photos", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const company = fixture.offers.find((offer) => offer.resultType === "company" && offer.mortgageType === "purchase");
  const officer = fixture.offers.find((offer) => offer.resultType === "loanOfficer" && offer.mortgageType === "purchase");
  company.logoUrl = "/assets/rates/company-mark.png";
  company.profileRoute = "/companies/company-mark";
  officer.headshotUrl = "/assets/rates/loan-officer.jpg";
  officer.profileRoute = "/loan-officers/loan-officer";
  officer.companyName = "Harbor Ridge Mortgage";

  const companyHtml = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  const officerHtml = renderRatesMarketplace({
    fixture,
    state: { ...MARKETPLACE_DEFAULTS, resultType: "loanOfficer" },
  });

  assert.match(companyHtml, /class="rates-provider-media company"/);
  assert.match(companyHtml, /src="\/assets\/rates\/company-mark\.png"/);
  assert.match(companyHtml, /href="\/companies\/company-mark"/);
  assert.match(officerHtml, /class="rates-provider-media loan-officer"/);
  assert.match(officerHtml, /src="\/assets\/rates\/loan-officer\.jpg"/);
  assert.match(officerHtml, /href="\/loan-officers\/loan-officer"/);
  assert.match(textFromHtml(officerHtml), /Harbor Ridge Mortgage/);
});

test("keeps edited down-payment dollars authoritative and synchronizes the percent", async () => {
  installDom();
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace, wireRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const root = new TestElement("main");

  root.innerHTML = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  wireRatesMarketplace(root, { fixture });

  const marketplace = root.querySelector("[data-rates-marketplace]");
  const amount = marketplace.querySelector('[name="downPaymentAmount"]');
  amount.value = "106000";
  amount.dispatchEvent(new TestEvent("input", { bubbles: true }));

  assert.equal(marketplace.querySelector('[name="downPaymentPercent"]').value, "10");
  marketplace.querySelector("[data-rates-form]").dispatchEvent(
    new TestEvent("submit", { bubbles: true }),
  );

  const cached = JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState"));
  assert.equal(cached.downPaymentAmount, 106000);
  assert.equal(cached.downPaymentPercent, 10);
});

test("shows validation errors instead of replacing blank values with defaults", async () => {
  installDom();
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace, wireRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const root = new TestElement("main");

  root.innerHTML = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  wireRatesMarketplace(root, { fixture });

  const marketplace = root.querySelector("[data-rates-marketplace]");
  const price = marketplace.querySelector('[name="purchasePrice"]');
  price.value = "";
  marketplace.querySelector("[data-rates-form]").dispatchEvent(
    new TestEvent("submit", { bubbles: true }),
  );

  const error = marketplace.querySelector("[data-rates-form-error]");
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /purchase price greater than zero/i);
  assert.equal(price.getAttribute("aria-invalid"), "true");
  assert.equal(marketplace.querySelector('[name="purchasePrice"]').value, "");
});

test("applies URL, account, cache, and default state in the approved order", async () => {
  installDom();
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace, wireRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const root = new TestElement("main");
  globalThis.localStorage.setItem(
    "snapRatesMarketplaceState",
    JSON.stringify({ zip: "33602", creditRange: "680-719", occupancy: "secondary" }),
  );
  globalThis.window.location = { search: "?zip=02108" };

  root.innerHTML = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  wireRatesMarketplace(root, {
    fixture,
    accountContext: { zip: "78701", creditRange: "740-779" },
  });

  const marketplace = root.querySelector("[data-rates-marketplace]");
  assert.equal(marketplace.querySelector('[name="zip"]').value, "02108");
  assert.equal(marketplace.querySelector('[name="creditRange"]').value, "740-779");
  assert.equal(marketplace.querySelector('[name="occupancy"]').value, "secondary");
});

test("keeps marketplace stylesheet selectors aligned with rendered offer markup", async () => {
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const offer = fixture.offers.find((item) => item.resultType === "company" && item.mortgageType === "purchase");
  const html = renderRatesMarketplace({
    fixture,
    state: {
      ...MARKETPLACE_DEFAULTS,
      expandedOfferIds: [offer.id],
      expandedTabsByOffer: { [offer.id]: "payment" },
    },
  });
  const styles = ["./styles.css", "./rates-marketplace.css"]
    .map((file) => fs.readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");

  for (const className of [
    "rates-form-grid",
    "rates-segmented",
    "rates-results-utility",
    "rates-results-columns",
    "rates-offer",
    "rates-offer-row",
    "rates-offer-metrics",
    "rates-offer-profile",
    "rates-provider-media",
    "rates-offer-actions",
    "rates-expanded-panel",
    "rates-tabs",
    "rates-payment-panel",
    "rates-donut",
    "rates-chart-legend",
  ]) {
    assert.match(html, new RegExp(`class="[^"]*${className}`), `${className} is rendered`);
    assert.match(styles, new RegExp(`\\.${className}(?:[\\s.#:[,{>]|$)`), `${className} is styled`);
  }

  assert.doesNotMatch(styles, /\.rates-offer-card|\.rates-offer-main|\.rates-payment-chart|\.rates-scenario-summary/);
  assert.doesNotMatch(html, /class="rates-offer-actions"\s+style=/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*?\.rates-offer-actions \.button,[\s\S]*?white-space: normal/);
});

test("stages scenario controls until Update offers while result type and sort remain immediate", async () => {
  installDom();
  const { MARKETPLACE_DEFAULTS, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const { renderRatesMarketplace, wireRatesMarketplace } = await loadUiModule();
  const fixture = normalizeMarketplaceFixture(loadFixture());
  const root = new TestElement("main");
  const tracked = [];

  root.innerHTML = renderRatesMarketplace({ fixture, state: MARKETPLACE_DEFAULTS });
  wireRatesMarketplace(root, { fixture, track: (name, payload) => tracked.push({ name, payload }) });

  const marketplace = root.querySelector("[data-rates-marketplace]");
  marketplace.querySelector("[data-toggle-advanced-filters]").click();
  marketplace.querySelector('[data-show-fha-option="false"]').click();
  marketplace.querySelector('[data-mortgage-type-option="refinance"]').click();

  assert.equal(marketplace.querySelector('[name="showFha"]').value, "false");
  assert.equal(marketplace.querySelector('[name="mortgageType"]').value, "refinance");
  assert.equal(marketplace.querySelector("[data-purchase-fields]").hidden, true);
  assert.equal(marketplace.querySelector("[data-refinance-fields]").hidden, false);
  assert.equal(JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState")).mortgageType, "purchase");
  assert.equal(tracked.some((event) => event.name === "rates_marketplace_update"), false);

  marketplace.querySelector("[data-rates-form]").dispatchEvent(new TestEvent("submit", { bubbles: true }));
  const cached = JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState"));
  assert.equal(cached.mortgageType, "refinance");
  assert.equal(cached.showFha, false);
  assert.equal(tracked.at(-1).name, "rates_marketplace_update");

  marketplace.querySelector('[data-result-type-option="loanOfficer"]').click();
  assert.equal(tracked.at(-1).name, "rates_marketplace_result_type");
  const sort = marketplace.querySelector("[data-marketplace-sort]");
  sort.value = "lowestPoints";
  sort.dispatchEvent(new TestEvent("change", { bubbles: true }));
  assert.equal(tracked.at(-1).name, "rates_marketplace_sort");
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

  const advancedToggle = marketplace.querySelector("[data-toggle-advanced-filters]");
  const advancedPanel = marketplace.querySelector("[data-advanced-marketplace]");
  assert.ok(advancedToggle);
  assert.ok(advancedPanel);
  assert.equal(advancedToggle.getAttribute("aria-expanded"), "false");
  assert.equal(advancedPanel.hidden, true);
  advancedToggle.click();
  assert.equal(advancedToggle.getAttribute("aria-expanded"), "true");
  assert.equal(advancedPanel.hidden, false);
  const dti = marketplace.querySelector('[name="dti"]');
  dti.value = "40plus";
  assert.equal(marketplace.querySelector('[name="dti"]').value, "40plus");
  assert.equal(marketplace.querySelector("[data-toggle-advanced-filters]").getAttribute("aria-expanded"), "true");
  marketplace.querySelector("[data-rates-form]").dispatchEvent(new TestEvent("submit", { bubbles: true }));

  marketplace.querySelector('[data-result-type-option="loanOfficer"]').click();
  assert.match(textFromHtml(marketplace.innerHTML), /Ava Martinez/);
  assert.equal(tracked.at(-1).name, "rates_marketplace_result_type");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["resultType"]);

  const sort = marketplace.querySelector("[data-marketplace-sort]");
  sort.value = "lowestApr";
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

  marketplace.querySelectorAll("[data-offer-details]")[1].click();
  assert.equal(marketplace.querySelectorAll("[data-expanded-offer]").length, 2);
  marketplace.querySelector("[data-expand-all]").click();
  assert.equal(marketplace.querySelectorAll("[data-expanded-offer]").length, 10);
  assert.equal(tracked.at(-1).name, "rates_marketplace_expand_all");
  marketplace.querySelector("[data-expand-all]").click();
  assert.equal(marketplace.querySelectorAll("[data-expanded-offer]").length, 0);

  marketplace.querySelector("[data-offer-details]").click();

  marketplace.querySelector('[data-offer-tab="payment"]').click();
  assert.match(textFromHtml(marketplace.innerHTML), /Total monthly payment/);
  assert.equal(tracked.at(-1).name, "rates_marketplace_tab");

  const totalBefore = marketplace.querySelector("[data-payment-total]").textContent;
  const insurance = marketplace.querySelector('[data-payment-assumption="homeownersInsurance"]');
  insurance.value = "245";
  insurance.dispatchEvent(new TestEvent("input", { bubbles: true }));
  const tax = marketplace.querySelector('[data-payment-assumption="propertyTax"]');
  tax.value = "555";
  tax.dispatchEvent(new TestEvent("input", { bubbles: true }));
  const hoa = marketplace.querySelector('[data-payment-assumption="hoaDues"]');
  hoa.value = "88";
  hoa.dispatchEvent(new TestEvent("input", { bubbles: true }));
  const mortgageInsurance = marketplace.querySelector('[data-payment-assumption="mortgageInsurance"]');
  mortgageInsurance.value = "77";
  mortgageInsurance.dispatchEvent(new TestEvent("input", { bubbles: true }));
  const totalAfter = marketplace.querySelector("[data-payment-total]").textContent;
  assert.notEqual(totalBefore, totalAfter);
  assert.equal(tracked.at(-1).name, "rates_marketplace_payment_assumption");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["field", "offerId"]);

  for (const [field, value] of [
    ["homeownersInsurance", "$245"],
    ["propertyTax", "$555"],
    ["hoaDues", "$88"],
    ["mortgageInsurance", "$77"],
  ]) {
    const legend = marketplace.querySelector(`[data-chart-segment="${field}"]`);
    const visual = marketplace.querySelector(`[data-donut-segment="${field}"]`);
    assert.equal(legend.getAttribute("data-chart-value"), value);
    assert.equal(legend.querySelector("strong").textContent, value);
    assert.match(visual.getAttribute("style"), /--segment-share:[1-9]/);
  }

  const taxControl = marketplace.querySelector('[data-chart-segment="propertyTax"]');
  taxControl.click();
  assert.equal(taxControl.getAttribute("aria-pressed"), "true");
  assert.match(marketplace.querySelector("[data-chart-detail-text]").textContent, /Property tax: \$555/);
  const miControl = marketplace.querySelector('[data-chart-segment="mortgageInsurance"]');
  miControl.dispatchEvent(new TestKeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(miControl.getAttribute("aria-pressed"), "true");
  assert.match(marketplace.querySelector("[data-chart-detail-text]").textContent, /PMI \/ MI: \$77/);
  assert.equal(tracked.at(-1).name, "rates_marketplace_chart_detail");

  marketplace.querySelector("[data-prequal-offer]").click();
  assert.equal(tracked.at(-1).name, "rates_provider_next");
  assert.deepEqual(Object.keys(tracked.at(-1).payload).sort(), ["offerId", "resultType", "sort", "tab", "visibleCount"]);
  assert.equal(navigated.length, 1);
  assert.match(navigated[0], /^\/prequal\/start\?/);

  const cached = JSON.parse(globalThis.localStorage.getItem("snapRatesMarketplaceState"));
  assert.equal(cached.resultType, "loanOfficer");
  assert.equal(cached.sort, "lowestApr");
  assert.equal("email" in cached, false);
});

test("mounts the approved marketplace before crawlable rate education on the public rates page", () => {
  const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const ratesPageSource = appSource.match(/function ratesPage\(\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction statePage/);

  assert.ok(ratesPageSource, "ratesPage should remain a discrete public-page renderer");
  const body = ratesPageSource[1];
  const marketplaceIndex = body.indexOf("renderRatesMarketplace({ fixture: ratesMarketplaceFixture })");
  const educationIndex = body.indexOf('label: "Before you compare"');

  assert.ok(marketplaceIndex >= 0, "the rates page should mount the marketplace component");
  assert.ok(educationIndex > marketplaceIndex, "crawlable rate education should follow the comparison workspace");
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

function topLevelFunctionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} must exist in app.js`);
  assert.ok(end > start, `${name} must appear before ${nextName}`);
  return appSource.slice(start, end);
}

function sellerOpenAccountCallbackSource() {
  const start = appSource.indexOf('if (found?.type === "seller") {');
  const end = appSource.indexOf("if (isTagSearchPath(path))", start + 1);
  assert.ok(start >= 0 && end > start, "seller workspace wiring must remain inside render");

  const integrationSource = appSource.slice(start, end);
  const match = integrationSource.match(
    /openAccount:\s*(\(\{ mode \}\) => \{[\s\S]*?\r?\n\s*\}),\r?\n\s*track:/,
  );
  assert.ok(match, "seller workspace must provide an openAccount callback");
  return match[1];
}

function createAuthHarness() {
  let modalConfig = null;
  let persistCalls = 0;
  let closeCalls = 0;
  let renderCalls = 0;
  let accountRefreshCalls = 0;
  const sessionState = { isLoggedIn: false };
  const sellerWorkspace = { innerHTML: "" };
  const headerAccount = { view: "logged-out", wiredActions: [] };
  const openModal = (config) => { modalConfig = config; };
  const persistSessionState = () => { persistCalls += 1; };
  const closeModal = () => { closeCalls += 1; };
  const refreshAccountMenu = () => {
    accountRefreshCalls += 1;
    headerAccount.view = "logged-in";
    headerAccount.wiredActions = ["toggle", "account", "cta"];
  };
  const render = () => {
    renderCalls += 1;
    sellerWorkspace.innerHTML = '<section data-seller-entry>Reset seller workspace</section>';
  };
  const openAuthModal = Function(
    "openModal",
    "sessionState",
    "persistSessionState",
    "closeModal",
    "render",
    "refreshAccountMenu",
    `"use strict";\n${topLevelFunctionSource("openAuthModal", "showToast")}\nreturn openAuthModal;`,
  )(openModal, sessionState, persistSessionState, closeModal, render, refreshAccountMenu);

  return {
    accountRefreshCalls: () => accountRefreshCalls,
    closeCalls: () => closeCalls,
    headerAccount,
    modalConfig: () => modalConfig,
    openAuthModal,
    persistCalls: () => persistCalls,
    renderCalls: () => renderCalls,
    sellerWorkspace,
    sessionState,
  };
}

test("seller auth confirmation preserves the unlocked workspace while completing session login", async () => {
  const harness = createAuthHarness();
  const openAccount = Function(
    "sessionState",
    "openActionModal",
    "openAuthModal",
    `"use strict"; return (${sellerOpenAccountCallbackSource()});`,
  )(
    harness.sessionState,
    () => { throw new Error("logged-out seller handoff must use the auth modal"); },
    harness.openAuthModal,
  );

  const completion = await openAccount({ mode: "create" });
  const unlockedMarkup = [
    '<section data-seller-net-sheet>',
    '<p data-seller-address>1842 Harbor View Drive, San Diego, CA 92109</p>',
    '<p data-seller-obligations>First mortgage payoff: $418,000</p>',
    '<p data-seller-projected-result>Projected net proceeds</p>',
    "</section>",
  ].join("");
  harness.sellerWorkspace.innerHTML = unlockedMarkup;

  assert.deepEqual(completion, { status: "completed" });
  assert.ok(harness.modalConfig(), "seller handoff must open the confirmation modal");
  harness.modalConfig().actions[0].onClick();

  assert.equal(harness.sessionState.isLoggedIn, true);
  assert.equal(harness.persistCalls(), 1);
  assert.equal(harness.closeCalls(), 1);
  assert.equal(harness.renderCalls(), 0);
  assert.equal(harness.accountRefreshCalls(), 1);
  assert.equal(harness.headerAccount.view, "logged-in");
  assert.deepEqual(harness.headerAccount.wiredActions, ["toggle", "account", "cta"]);
  assert.equal(harness.sellerWorkspace.innerHTML, unlockedMarkup);
});

test("account menu refresh replaces and wires only the new account root", () => {
  const listeners = (attributes = {}) => {
    const clickListeners = [];
    return {
      attributes,
      addEventListener(type, listener) {
        if (type === "click") clickListeners.push(listener);
      },
      click() {
        clickListeners.forEach((listener) => listener());
      },
      getAttribute(name) {
        return attributes[name] ?? null;
      },
      listenerCount() {
        return clickListeners.length;
      },
      setAttribute(name, value) {
        attributes[name] = String(value);
      },
    };
  };
  const toggle = listeners({ "aria-expanded": "false" });
  const menu = { hidden: true };
  const accountAction = listeners({ "data-account-action": "open" });
  const ctaAction = listeners({ "data-cta-action": "compareOffer" });
  const replacementRoot = {
    querySelector(selector) {
      if (selector === "[data-account-toggle]") return toggle;
      if (selector === "[data-account-menu]") return menu;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-auth-action]") return [];
      if (selector === "[data-account-action]") return [accountAction];
      if (selector === "[data-cta-action]") return [ctaAction];
      return [];
    },
  };
  const openedActions = [];
  let closeAccountCalls = 0;
  const wireAccountInteractions = Function(
    "document",
    "closeAccountMenu",
    "openAuthModal",
    "sessionState",
    "openActionModal",
    "resetSessionStateForSignOut",
    "render",
    "showToast",
    `"use strict";\n${topLevelFunctionSource("wireAccountInteractions", "refreshAccountMenu")}\nreturn wireAccountInteractions;`,
  )(
    {},
    () => { closeAccountCalls += 1; },
    () => { throw new Error("logged-in account action must not open auth"); },
    { isLoggedIn: true },
    (action) => { openedActions.push(action); },
    () => {},
    () => {},
    () => {},
  );
  let replacedWith = null;
  const currentRoot = {
    replaceWith(node) {
      replacedWith = node;
    },
  };
  const template = {
    content: { firstElementChild: replacementRoot },
    innerHTML: "",
  };
  const fakeDocument = {
    createElement(name) {
      assert.equal(name, "template");
      return template;
    },
    querySelector(selector) {
      assert.equal(selector, "[data-account-root]");
      return currentRoot;
    },
  };
  const wiredRoots = [];
  const renderAccountMenu = Function(
    "sessionState",
    "SNAP_CUSTOMER",
    "icon",
    "esc",
    "mobilePublicMenu",
    `"use strict";\n${topLevelFunctionSource("accountMenu", "header")}\nreturn accountMenu;`,
  )(
    { isLoggedIn: true, savedCount: 0 },
    { name: "Caleb" },
    () => '<span class="account-icon"></span>',
    (value) => String(value),
    () => '<div data-mobile-public-menu></div>',
  );
  const refreshAccountMenu = Function(
    "document",
    "accountMenu",
    "wireAccountInteractions",
    `"use strict";\n${topLevelFunctionSource("refreshAccountMenu", "openAuthModal")}\nreturn refreshAccountMenu;`,
  )(
    fakeDocument,
    renderAccountMenu,
    (root) => {
      wiredRoots.push(root);
      wireAccountInteractions(root);
    },
  );

  refreshAccountMenu();
  toggle.click();
  accountAction.click();
  ctaAction.click();

  assert.equal(replacedWith, replacementRoot);
  assert.deepEqual(wiredRoots, [replacementRoot]);
  assert.match(template.innerHTML, /account-trigger logged-in/);
  assert.match(template.innerHTML, /Open My Account/);
  assert.match(template.innerHTML, /Sign out/);
  assert.doesNotMatch(template.innerHTML, /data-auth-action/);
  assert.equal(toggle.listenerCount(), 1);
  assert.equal(accountAction.listenerCount(), 1);
  assert.equal(ctaAction.listenerCount(), 1);
  assert.equal(menu.hidden, false);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(closeAccountCalls, 2);
  assert.deepEqual(openedActions, ["account", "compareOffer"]);
});

test("general auth confirmation retains the default account rerender", () => {
  const harness = createAuthHarness();
  harness.sellerWorkspace.innerHTML = "General page content";

  harness.openAuthModal();
  harness.modalConfig().actions[0].onClick();

  assert.equal(harness.sessionState.isLoggedIn, true);
  assert.equal(harness.persistCalls(), 1);
  assert.equal(harness.closeCalls(), 1);
  assert.equal(harness.renderCalls(), 1);
  assert.equal(harness.accountRefreshCalls(), 0);
  assert.match(harness.sellerWorkspace.innerHTML, /data-seller-entry/);
});

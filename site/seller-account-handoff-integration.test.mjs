import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const siteStyles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const sellerStyles = fs.readFileSync(new URL("./seller-workspace.css", import.meta.url), "utf8");

function topLevelFunctionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} must exist in app.js`);
  assert.ok(end > start, `${name} must appear before ${nextName}`);
  return appSource.slice(start, end);
}

function zIndexFor(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)`));
  assert.ok(match, `${selector} must define a numeric z-index`);
  return Number(match[1]);
}

test("account verification modal stacks above the seller net sheet", () => {
  assert.ok(
    zIndexFor(siteStyles, ".modal-backdrop") > zIndexFor(sellerStyles, ".seller-dialog-backdrop"),
    "the account verification modal must receive pointer input above the seller net-sheet modal",
  );
});

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
  const listenersFor = () => {
    const listeners = new Map();
    return {
      attributes: {},
      disabled: false,
      focused: false,
      hidden: true,
      textContent: "",
      value: "",
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      dispatch(type) {
        return listeners.get(type)?.({ preventDefault() {} });
      },
      focus() {
        this.focused = true;
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
    };
  };

  let modalConfig = null;
  let persistCalls = 0;
  let closeCalls = 0;
  let renderCalls = 0;
  let accountRefreshCalls = 0;
  const timers = [];
  const sessionState = { isLoggedIn: false };
  const sellerWorkspace = { innerHTML: "" };
  const headerAccount = { view: "logged-out", wiredActions: [] };
  const emailInput = listenersFor();
  const passwordInput = listenersFor();
  const submitButton = listenersFor();
  const cancelButton = listenersFor();
  const emailError = listenersFor();
  const passwordError = listenersFor();
  const status = listenersFor();
  const form = {
    attributes: {},
    addEventListener(type, listener) {
      this[type] = listener;
    },
    dispatch(type) {
      return this[type]?.({ preventDefault() {} });
    },
    querySelector(selector) {
      return {
        "input[name='email']": emailInput,
        "input[name='password']": passwordInput,
        "[data-account-login-submit]": submitButton,
        "[data-account-login-cancel]": cancelButton,
        "[data-account-login-error='email']": emailError,
        "[data-account-login-error='password']": passwordError,
        "[data-account-login-status]": status,
      }[selector] || null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
  const bodyNode = {
    querySelector(selector) {
      return selector === "[data-account-login-form]" ? form : null;
    },
  };
  const openModal = (config) => {
    modalConfig = config;
    return { bodyNode, actionsNode: {} };
  };
  const persistSessionState = () => { persistCalls += 1; };
  const closeModal = (options = {}) => {
    closeCalls += 1;
    if (options?.notifyDismiss !== false) modalConfig?.onDismiss?.();
  };
  const refreshAccountMenu = () => {
    accountRefreshCalls += 1;
    headerAccount.view = "logged-in";
    headerAccount.wiredActions = ["toggle", "account", "cta"];
  };
  const render = () => {
    renderCalls += 1;
    sellerWorkspace.innerHTML = '<section data-seller-entry>Reset seller workspace</section>';
  };
  const fakeWindow = {
    clearTimeout() {},
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
  };
  const openAuthModal = Function(
    "openModal",
    "sessionState",
    "persistSessionState",
    "closeModal",
    "render",
    "refreshAccountMenu",
    "esc",
    "window",
    "modalDismissHandler",
    `"use strict";\n${topLevelFunctionSource("openAuthModal", "showToast")}\nreturn openAuthModal;`,
  )(
    openModal,
    sessionState,
    persistSessionState,
    closeModal,
    render,
    refreshAccountMenu,
    (value) => String(value),
    fakeWindow,
    null,
  );

  return {
    accountRefreshCalls: () => accountRefreshCalls,
    cancelButton,
    closeCalls: () => closeCalls,
    emailError,
    emailInput,
    flushNextTimer() {
      timers.shift()?.();
    },
    form,
    headerAccount,
    modalConfig: () => modalConfig,
    openAuthModal,
    passwordError,
    passwordInput,
    pendingTimers: () => timers.length,
    persistCalls: () => persistCalls,
    renderCalls: () => renderCalls,
    sellerWorkspace,
    sessionState,
    status,
    submitButton,
  };
}
test("account verification modal exposes sign-in fields and a live verification state", () => {
  assert.match(appSource, /data-account-login-form/);
  assert.match(appSource, /type="email"[^>]*autocomplete="email"/);
  assert.match(appSource, /type="password"[^>]*autocomplete="current-password"/);
  assert.match(appSource, /data-account-login-submit/);
  assert.match(appSource, /data-account-login-cancel/);
  assert.match(appSource, /data-account-login-error="email"/);
  assert.match(appSource, /data-account-login-error="password"/);
  assert.match(appSource, /data-account-login-status[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(appSource, /Verifying your account/);
  assert.match(appSource, /Account verified/);
});

test("seller account unlock waits for completed account verification", async () => {
  let resolveVerification;
  let verificationRequest = null;
  const openAccount = Function(
    "sessionState",
    "openActionModal",
    "openAuthModal",
    `"use strict"; return (${sellerOpenAccountCallbackSource()});`,
  )(
    { isLoggedIn: false },
    () => { throw new Error("seller unlock must use account verification"); },
    (reason, options) => {
      verificationRequest = { reason, options };
      return new Promise((resolve) => { resolveVerification = resolve; });
    },
  );

  let settled = false;
  const completionPromise = openAccount({ mode: "create" }).then((result) => {
    settled = true;
    return result;
  });
  await Promise.resolve();

  assert.equal(settled, false);
  assert.match(verificationRequest.reason, /seller analysis/i);
  assert.equal(verificationRequest.options.rerender, false);

  resolveVerification({ status: "completed" });
  assert.deepEqual(await completionPromise, { status: "completed" });
});

test("seller verification preserves the unlocked workspace while completing session login", async () => {
  const harness = createAuthHarness();
  const openAccount = Function(
    "sessionState",
    "openActionModal",
    "openAuthModal",
    `"use strict"; return (${sellerOpenAccountCallbackSource()});`,
  )(
    harness.sessionState,
    () => { throw new Error("seller handoff must use the verification modal"); },
    harness.openAuthModal,
  );

  const completionPromise = openAccount({ mode: "create" });
  const unlockedMarkup = [
    '<section data-seller-net-sheet>',
    '<p data-seller-address>1842 Harbor View Drive, San Diego, CA 92109</p>',
    '<p data-seller-obligations>First mortgage payoff: $418,000</p>',
    '<p data-seller-projected-result>Projected net proceeds</p>',
    "</section>",
  ].join("");
  harness.sellerWorkspace.innerHTML = unlockedMarkup;

  assert.ok(harness.modalConfig(), "seller handoff must open the verification modal");
  harness.emailInput.value = "michael@example.com";
  harness.passwordInput.value = "mortgage1";
  harness.form.dispatch("submit");

  assert.equal(harness.status.textContent, "Verifying your account...");
  assert.equal(harness.sessionState.isLoggedIn, false);
  harness.flushNextTimer();
  assert.equal(harness.status.textContent, "Account verified. Opening your seller analysis...");
  harness.flushNextTimer();

  assert.deepEqual(await completionPromise, { status: "completed" });
  assert.equal(harness.sessionState.isLoggedIn, true);
  assert.equal(harness.emailInput.value, "");
  assert.equal(harness.passwordInput.value, "");
  assert.equal(harness.persistCalls(), 1);
  assert.equal(harness.closeCalls(), 1);
  assert.equal(harness.renderCalls(), 0);
  assert.equal(harness.accountRefreshCalls(), 1);
  assert.equal(harness.headerAccount.view, "logged-in");
  assert.deepEqual(harness.headerAccount.wiredActions, ["toggle", "account", "cta"]);
  assert.equal(harness.sellerWorkspace.innerHTML, unlockedMarkup);
});

test("invalid sign-in stays locked and cancellation resolves without a session", async () => {
  const harness = createAuthHarness();
  const completionPromise = harness.openAuthModal("Open your seller analysis.", { rerender: false });

  harness.emailInput.value = "not-an-email";
  harness.passwordInput.value = "short";
  harness.form.dispatch("submit");

  assert.equal(harness.emailError.hidden, false);
  assert.equal(harness.passwordError.hidden, false);
  assert.equal(harness.emailInput.attributes["aria-invalid"], "true");
  assert.equal(harness.passwordInput.attributes["aria-invalid"], "true");
  assert.equal(harness.pendingTimers(), 0);
  assert.equal(harness.sessionState.isLoggedIn, false);

  harness.cancelButton.dispatch("click");
  assert.deepEqual(await completionPromise, { status: "cancelled" });
  assert.equal(harness.sessionState.isLoggedIn, false);
  assert.equal(harness.persistCalls(), 0);
  assert.equal(harness.accountRefreshCalls(), 0);
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
  const accountAction = listeners({ "data-account-action": "open" });
  const ctaAction = listeners({ "data-cta-action": "compareOffer" });
  const replacementRoot = {
    querySelectorAll(selector) {
      if (selector === "[data-auth-action]") return [];
      if (selector === "[data-account-action]") return [accountAction];
      if (selector === "[data-cta-action]") return [ctaAction];
      return [];
    },
  };
  const openedActions = [];
  let closeNavigationCalls = 0;
  const wireAccountInteractions = Function(
    "document",
    "closeNavigation",
    "openAuthModal",
    "sessionState",
    "openActionModal",
    "resetSessionStateForSignOut",
    "render",
    "showToast",
    `"use strict";\n${topLevelFunctionSource("wireAccountInteractions", "refreshAccountMenu")}\nreturn wireAccountInteractions;`,
  )(
    {},
    () => { closeNavigationCalls += 1; },
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
      assert.equal(selector, ".site-nav-account-actions");
      return currentRoot;
    },
  };
  const wiredRoots = [];
  const renderAccountNavigation = Function(
    "sessionState",
    `"use strict";\n${topLevelFunctionSource("accountNavigation", "header")}\nreturn accountNavigation;`,
  )(
    { isLoggedIn: true, savedCount: 0 },
  );
  const refreshAccountMenu = Function(
    "document",
    "accountNavigation",
    "wireAccountInteractions",
    `"use strict";\n${topLevelFunctionSource("refreshAccountMenu", "openAuthModal")}\nreturn refreshAccountMenu;`,
  )(
    fakeDocument,
    renderAccountNavigation,
    (root) => {
      wiredRoots.push(root);
      wireAccountInteractions(root);
    },
  );

  refreshAccountMenu();
  accountAction.click();
  ctaAction.click();

  assert.equal(replacedWith, replacementRoot);
  assert.deepEqual(wiredRoots, [replacementRoot]);
  assert.match(template.innerHTML, /site-nav-account-actions/);
  assert.match(template.innerHTML, /My Account/);
  assert.match(template.innerHTML, /Sign out/);
  assert.doesNotMatch(template.innerHTML, /data-auth-action/);
  assert.equal(accountAction.listenerCount(), 1);
  assert.equal(ctaAction.listenerCount(), 1);
  assert.equal(closeNavigationCalls, 2);
  assert.deepEqual(openedActions, ["account", "compareOffer"]);
});

test("general account verification retains the default account rerender", async () => {
  const harness = createAuthHarness();
  harness.sellerWorkspace.innerHTML = "General page content";

  const completionPromise = harness.openAuthModal();
  harness.emailInput.value = "michael@example.com";
  harness.passwordInput.value = "mortgage1";
  harness.form.dispatch("submit");
  harness.flushNextTimer();
  harness.flushNextTimer();

  assert.deepEqual(await completionPromise, { status: "completed" });
  assert.equal(harness.sessionState.isLoggedIn, true);
  assert.equal(harness.persistCalls(), 1);
  assert.equal(harness.closeCalls(), 1);
  assert.equal(harness.renderCalls(), 1);
  assert.equal(harness.accountRefreshCalls(), 0);
  assert.match(harness.sellerWorkspace.innerHTML, /data-seller-entry/);
});

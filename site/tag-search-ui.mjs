import {
  activeTagSuggestion,
  CONTENT_FAMILY_ORDER,
  groupSearchResults,
  queryWithoutTagSuggestion,
  searchRecords,
  sortSearchResults,
} from "./tag-query.mjs";
import { tagForId } from "./tag-registry.mjs";
import { renderSearchResultCard } from "./tag-presentation.mjs";
import { serializeTagSearchState } from "./tag-state.mjs";

const FAMILY_LABELS = Object.freeze({
  articles: "Articles and education",
  "topic-guides": "Topic guides",
  "local-market-news": "Local market news",
  "product-guides": "Mortgage product guides",
  calculators: "Calculators and tools",
});

const INVALID_TOPIC_NOTICE = "One search topic was unavailable, so we kept the rest of your search.";
const INDEX_ERROR_NOTICE = "Search tools are temporarily unavailable. You can still open the resources below.";
const ROOT_CONTROLLERS = new WeakMap();

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

function stateWithDefaults(state = {}) {
  return {
    tagIds: [...asArray(state.tagIds)],
    operators: [...asArray(state.operators)],
    query: typeof state.query === "string" ? state.query : "",
    sortBySection: { ...(state.sortBySection || {}) },
    carouselPositions: { ...(state.carouselPositions || {}) },
    ignoredTagIds: [...asArray(state.ignoredTagIds)],
  };
}

function familyLabel(family) {
  return FAMILY_LABELS[family] || "Resources";
}

function resultCountLabel(count) {
  return `${count} ${count === 1 ? "result" : "results"}`;
}

function selectedTags(registry, state) {
  return asArray(state?.tagIds)
    .map((id) => tagForId(registry, id))
    .filter(Boolean);
}

function renderOperator(leftTag, rightTag, operator, index) {
  const label = `Change the connector between ${leftTag.displayName} and ${rightTag.displayName}`;
  return `
    <label class="tag-search-operator">
      <span class="sr-only">${escapeHtml(label)}</span>
      <select name="op" data-tag-operator-index="${index}" aria-label="${escapeHtml(label)}">
        <option value="AND"${operator === "OR" ? "" : " selected"}>AND</option>
        <option value="OR"${operator === "OR" ? " selected" : ""}>OR</option>
      </select>
    </label>
  `;
}

function renderTokenControls(registry, state) {
  const tags = selectedTags(registry, state);
  if (!tags.length) return "";

  return `
    <div class="tag-search-tokens" aria-label="Selected topics" data-tag-search-tokens>
      ${tags.map((tag, index) => `
        ${index > 0 ? renderOperator(tags[index - 1], tag, state.operators[index - 1], index - 1) : ""}
        <span class="tag-search-token">
          <input type="hidden" name="tag" value="${escapeHtml(tag.id)}" />
          <span>${escapeHtml(tag.displayName)}</span>
          <button type="button" data-tag-token-remove="${escapeHtml(tag.id)}" aria-label="Remove ${escapeHtml(tag.displayName)}">
            <span aria-hidden="true">&times;</span>
          </button>
        </span>
      `).join("")}
    </div>
  `;
}

function cardContext(context, matchedTagIds) {
  return {
    registry: context.registry,
    matchedTagIds,
    routeHref: context.routeHref || ((href) => href),
    fallbackImage: context.fallbackImages?.[context.family] || context.fallbackImage || "",
    resolveAuthor: context.resolveAuthor,
    resolveLocation: context.resolveLocation,
  };
}

function renderCards(records, context, wrapperClass) {
  const matchedTagIds = asArray(context.matchedTagIds).length
    ? context.matchedTagIds
    : asArray(context.state?.tagIds);
  return asArray(records).map((record) => {
    const html = renderSearchResultCard(record, cardContext(context, matchedTagIds));
    return html ? `<div class="${wrapperClass}" role="listitem">${html}</div>` : "";
  }).join("");
}

function orderedGroups(groups) {
  const byFamily = new Map(asArray(groups).map((group) => [group?.family, group]));
  return CONTENT_FAMILY_ORDER.map((family) => byFamily.get(family)).filter((group) => group?.records?.length);
}

export function renderResultSections(groups, context = {}) {
  const state = stateWithDefaults(context.state);

  return orderedGroups(groups).map(({ family, records }) => {
    const label = familyLabel(family);
    const visibleRecords = asArray(records).slice(0, 20);
    const maximumPosition = Math.max(0, visibleRecords.length - 1);
    const position = clamp(state.carouselPositions[family], 0, maximumPosition);
    const sectionContext = { ...context, family, state };

    return `
      <section class="tag-result-section" data-tag-result-family="${escapeHtml(family)}" aria-labelledby="tag-results-${escapeHtml(family)}">
        <div class="tag-result-section-header">
          <div>
            <h2 id="tag-results-${escapeHtml(family)}">${escapeHtml(label)}</h2>
            <p>${escapeHtml(resultCountLabel(records.length))}</p>
          </div>
          <button class="tag-result-show-more" type="button" data-tag-show-more="${escapeHtml(family)}">
            Show more
          </button>
        </div>
        <div class="tag-result-carousel-shell">
          <button class="tag-carousel-control tag-carousel-control-previous" type="button" data-tag-carousel-step="-1" aria-label="Previous ${escapeHtml(label)} results"${position === 0 ? " disabled" : ""}>
            <span aria-hidden="true">&larr;</span>
          </button>
          <div class="tag-result-carousel" role="list" tabindex="0" data-tag-result-track data-family="${escapeHtml(family)}" data-carousel-position="${position}" aria-label="${escapeHtml(label)} results">
            ${renderCards(visibleRecords, sectionContext, "tag-result-card")}
          </div>
          <button class="tag-carousel-control tag-carousel-control-next" type="button" data-tag-carousel-step="1" aria-label="Next ${escapeHtml(label)} results"${position >= maximumPosition ? " disabled" : ""}>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>
    `;
  }).join("");
}

function renderSearchNotices(state, loadError) {
  return `
    ${state.ignoredTagIds.length ? `<p class="tag-search-notice" role="status">${INVALID_TOPIC_NOTICE}</p>` : ""}
    ${loadError ? `<p class="tag-search-notice tag-search-notice-error" role="status">${INDEX_ERROR_NOTICE}</p>` : ""}
  `;
}

function renderEmptyState(state) {
  const hasTags = state.tagIds.length > 0;
  const hasQuery = Boolean(state.query.trim());

  return `
    <section class="tag-search-empty" aria-labelledby="tag-search-empty-title">
      <h2 id="tag-search-empty-title">No resources matched this search</h2>
      <p>Try removing a topic${hasTags && state.operators.includes("AND") ? ", changing AND to OR" : ""}${hasQuery ? ", or clearing the search text" : ""}.</p>
      <div class="tag-search-empty-actions">
        ${hasQuery ? '<button type="button" data-tag-clear-query>Clear search text</button>' : ""}
        ${hasTags ? '<button type="button" data-tag-clear-all>Clear selected topics</button>' : ""}
      </div>
    </section>
  `;
}

function pageHeading(registry, state) {
  const tags = selectedTags(registry, state);
  if (tags.length === 1 && !state.query.trim()) {
    return {
      title: `${tags[0].displayName} resources`,
      intro: tags[0].description || "Explore related mortgage education, local context, loan guides, and planning tools.",
    };
  }
  return {
    title: "Search the Learning Center",
    intro: "Combine mortgage topics and search text to find education, local market context, loan guides, and planning tools.",
  };
}

export function staticFallbackForState(html, capturedTagId, rawState = {}) {
  const state = stateWithDefaults(rawState);
  return capturedTagId && state.tagIds.length === 1 && state.tagIds[0] === capturedTagId
    ? String(html || "")
    : "";
}

function renderPageContent({
  registry,
  records = [],
  state: rawState = {},
  staticFallbackHtml = "",
  staticFallbackTagId = "",
  loadError = null,
  loading = false,
  ...context
} = {}) {
  const state = stateWithDefaults(rawState);
  const heading = pageHeading(registry, state);
  const matches = loadError ? [] : searchRecords(records, state, registry);
  const groups = groupSearchResults(matches);
  const applicableStaticFallback = staticFallbackForState(staticFallbackHtml, staticFallbackTagId, state);
  const resultHtml = loading
    ? '<p class="tag-search-loading" role="status" data-tag-search-loading>Loading mortgage resources...</p>'
    : loadError
      ? applicableStaticFallback
      : groups.length
        ? renderResultSections(groups, { ...context, registry, state, matchedTagIds: state.tagIds })
        : renderEmptyState(state);

  return `
    <header class="tag-search-heading">
      <p class="eyebrow">Learning Center</p>
      <h1>${escapeHtml(heading.title)}</h1>
      <p>${escapeHtml(heading.intro)}</p>
    </header>
    <section class="tag-search-composer" aria-labelledby="tag-search-composer-title">
      <h2 id="tag-search-composer-title">Find mortgage resources</h2>
      ${renderSearchNotices(state, loadError)}
      <form class="tag-search-form" action="/learning-center/search" method="get" data-tag-search-form>
        ${renderTokenControls(registry, state)}
        <div class="tag-search-combobox">
          <label for="tag-search-input">Search by topic or words</label>
          <div class="tag-search-input-row">
            <input
              id="tag-search-input"
              name="q"
              type="search"
              value="${escapeHtml(state.query)}"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="tag-search-suggestions"
              aria-expanded="false"
              autocomplete="off"
              data-tag-search-input
            />
            <button class="button primary" type="submit">Search</button>
          </div>
          <ul id="tag-search-suggestions" class="tag-search-suggestions" role="listbox" aria-label="Topic suggestions" hidden data-tag-search-suggestions></ul>
        </div>
      </form>
    </section>
    <div class="tag-search-results" aria-live="polite" data-tag-search-results>
      ${resultHtml}
    </div>
  `;
}

export function renderTagSearchPage(options = {}) {
  return `<section class="tag-search-page" data-tag-search-page>${renderPageContent(options)}</section>`;
}

function recordsForFamily(family, groups) {
  return orderedGroups(groups).find((group) => group.family === family)?.records || [];
}

function modalCards(family, records, context) {
  return renderCards(records, { ...context, family }, "tag-modal-result");
}

function renderModalMarkup(family, context) {
  const label = familyLabel(family);
  const state = stateWithDefaults(context.state);
  const sort = state.sortBySection[family] === "newest" ? "newest" : "relevance";
  const records = sortSearchResults(recordsForFamily(family, context.groups), sort);
  const titleId = `tag-results-modal-title-${family}`;

  return `
    <div class="tag-results-modal-backdrop" data-tag-results-modal="${escapeHtml(family)}">
      <section class="tag-results-modal" role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(titleId)}" tabindex="-1">
        <div class="tag-results-modal-header">
          <div>
            <p class="eyebrow">All results</p>
            <h2 id="${escapeHtml(titleId)}">${escapeHtml(label)}</h2>
            <p>${escapeHtml(resultCountLabel(records.length))}</p>
          </div>
          <button class="tag-results-modal-close" type="button" data-tag-results-modal-close aria-label="Close ${escapeHtml(label)} results">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="tag-results-modal-toolbar">
          <label>
            <span>Sort results</span>
            <select data-tag-results-sort aria-label="Sort ${escapeHtml(label)} results">
              <option value="relevance"${sort === "relevance" ? " selected" : ""}>Relevance</option>
              <option value="newest"${sort === "newest" ? " selected" : ""}>Newest</option>
            </select>
          </label>
        </div>
        <div class="tag-results-modal-list" role="list" data-tag-results-modal-list>
          ${modalCards(family, records, { ...context, state })}
        </div>
      </section>
    </div>
  `;
}

function focusableElements(element) {
  return [...element.querySelectorAll(
    'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((item) => !item.hidden && item.getAttribute("aria-hidden") !== "true");
}

function publishState(state, context, { replace = true } = {}) {
  const url = `/learning-center/search${serializeTagSearchState(state)}`;
  if (typeof context.navigate === "function") {
    context.navigate(url, { replace, state: { tagSearch: state } });
    return;
  }

  const history = context.window?.history || globalThis.window?.history;
  if (history) {
    const method = replace ? "replaceState" : "pushState";
    history[method]({ ...(history.state || {}), tagSearch: state }, "", url);
  }
}

export function setTagResultsScrollLock(doc, locked) {
  const method = locked ? "add" : "remove";
  doc?.documentElement?.classList?.[method]("tag-results-modal-open");
  doc?.body?.classList?.[method]("tag-results-modal-open");
}

export function openTagResultsModal(family, context = {}) {
  if (!FAMILY_LABELS[family] || !recordsForFamily(family, context.groups).length) return null;
  const html = renderModalMarkup(family, context);
  const doc = Object.prototype.hasOwnProperty.call(context, "document")
    ? context.document
    : globalThis.document;
  if (!doc?.body || typeof doc.createElement !== "function") return html;

  doc.querySelector?.("[data-tag-results-modal]")?.remove();
  const template = doc.createElement("template");
  template.innerHTML = html.trim();
  const backdrop = template.content.firstElementChild;
  if (!backdrop) return null;

  doc.body.append(backdrop);
  setTagResultsScrollLock(doc, true);
  const dialog = backdrop.querySelector('[role="dialog"]');
  const closeButton = backdrop.querySelector("[data-tag-results-modal-close]");
  const sortSelect = backdrop.querySelector("[data-tag-results-sort]");
  const list = backdrop.querySelector("[data-tag-results-modal-list]");
  const trigger = context.trigger || doc.activeElement;
  let activeState = stateWithDefaults(context.state);
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    doc.removeEventListener("keydown", onKeyDown);
    backdrop.remove();
    setTagResultsScrollLock(doc, false);
    if (trigger && typeof trigger.focus === "function") trigger.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  closeButton?.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  sortSelect?.addEventListener("change", () => {
    const sort = sortSelect.value === "newest" ? "newest" : "relevance";
    activeState = {
      ...activeState,
      sortBySection: {
        ...activeState.sortBySection,
        ...(sort === "newest" ? { [family]: "newest" } : {}),
      },
    };
    if (sort === "relevance") delete activeState.sortBySection[family];
    const records = sortSearchResults(recordsForFamily(family, context.groups), sort);
    if (list) list.innerHTML = modalCards(family, records, { ...context, state: activeState });
    context.state = activeState;
    context.onStateChange?.(activeState);
    context.track?.("tag_search_sort_changed", { family, sort });
    publishState(activeState, context);
  });
  doc.addEventListener("keydown", onKeyDown);
  backdrop.closeTagResultsModal = close;
  (closeButton || dialog)?.focus();
  context.track?.("tag_search_modal_opened", { family });
  return backdrop;
}

function removeToken(state, id) {
  const index = state.tagIds.indexOf(id);
  if (index < 0) return state;
  const tagIds = [...state.tagIds];
  const operators = [...state.operators];
  tagIds.splice(index, 1);

  if (index === 0) operators.splice(0, 1);
  else operators.splice(index - 1, 1);

  return { ...state, tagIds, operators: operators.slice(0, Math.max(0, tagIds.length - 1)) };
}

function addToken(state, id, query = "") {
  if (!id || state.tagIds.includes(id)) return state;
  return {
    ...state,
    tagIds: [...state.tagIds, id],
    operators: state.tagIds.length ? [...state.operators, "AND"] : [],
    query,
  };
}

function carouselPosition(track) {
  const cards = [...track.querySelectorAll(":scope > .tag-result-card")];
  if (!cards.length) return 0;
  const left = Number(track.scrollLeft) || 0;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  cards.forEach((card, index) => {
    const distance = Math.abs((Number(card.offsetLeft) || 0) - left);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function scrollTrackToPosition(track, position, behavior = "auto") {
  const cards = [...track.querySelectorAll(":scope > .tag-result-card")];
  if (!cards.length) return 0;
  const nextPosition = clamp(position, 0, cards.length - 1);
  const left = Number(cards[nextPosition]?.offsetLeft) || 0;
  if (typeof track.scrollTo === "function") track.scrollTo({ left, behavior });
  else track.scrollLeft = left;
  track.dataset.carouselPosition = String(nextPosition);
  return nextPosition;
}

function reducedMotion(windowObject) {
  return Boolean(windowObject?.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function wireTagSearch(root, context = {}) {
  if (!root || typeof root.addEventListener !== "function") return null;
  ROOT_CONTROLLERS.get(root)?.destroy();

  let state = stateWithDefaults(context.state);
  let activeSuggestionIndex = -1;
  let activeSuggestionRange = null;
  let activeModal = null;
  let destroyed = false;
  const scrollTimers = new Map();
  const windowObject = context.window || root.ownerDocument?.defaultView || globalThis.window;

  const currentRecords = () => searchRecords(context.records, state, context.registry);
  const currentGroups = () => groupSearchResults(currentRecords());

  const notifyState = (nextState, options = {}) => {
    state = stateWithDefaults(nextState);
    context.state = state;
    context.onStateChange?.(state);
    publishState(state, context, options);
    if (options.eventName) context.track?.(options.eventName, options.payload || {});
  };

  const restoreCarousels = () => {
    root.querySelectorAll("[data-tag-result-track]").forEach((track) => {
      const family = track.dataset.family;
      const position = state.carouselPositions[family] || 0;
      scrollTrackToPosition(track, position, "auto");
      const section = track.closest("[data-tag-result-family]");
      const cards = track.querySelectorAll(":scope > .tag-result-card");
      const previous = section?.querySelector('[data-tag-carousel-step="-1"]');
      const next = section?.querySelector('[data-tag-carousel-step="1"]');
      if (previous) previous.disabled = position <= 0;
      if (next) next.disabled = position >= cards.length - 1;
    });
  };

  const refresh = ({ focusInput = false } = {}) => {
    if (destroyed) return;
    root.innerHTML = renderPageContent({
      registry: context.registry,
      records: context.records,
      state,
      staticFallbackHtml: context.staticFallbackHtml,
      staticFallbackTagId: context.staticFallbackTagId,
      loadError: context.loadError,
      loading: context.loading,
      routeHref: context.routeHref,
      fallbackImages: context.fallbackImages,
      fallbackImage: context.fallbackImage,
      resolveAuthor: context.resolveAuthor,
      resolveLocation: context.resolveLocation,
    });
    restoreCarousels();
    if (focusInput) root.querySelector("[data-tag-search-input]")?.focus();
  };

  const commitState = (nextState, options = {}) => {
    notifyState(nextState, { replace: true, ...options });
    refresh({ focusInput: options.focusInput });
  };

  const dismissSuggestions = () => {
    const input = root.querySelector("[data-tag-search-input]");
    const list = root.querySelector("[data-tag-search-suggestions]");
    if (!input || !list) return;
    activeSuggestionIndex = -1;
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const updateSuggestions = (input) => {
    const list = root.querySelector("[data-tag-search-suggestions]");
    if (!list) return [];
    const suggestion = activeTagSuggestion(
      context.registry?.tags,
      input.value,
      state.tagIds,
      input.selectionStart,
      input.selectionEnd,
    );
    const suggestions = suggestion.suggestions;
    activeSuggestionRange = suggestions.length ? { start: suggestion.start, end: suggestion.end } : null;
    activeSuggestionIndex = suggestions.length ? clamp(activeSuggestionIndex, 0, suggestions.length - 1) : -1;
    list.innerHTML = suggestions.map((tag, index) => `
      <li id="tag-search-suggestion-${index}" role="option" aria-selected="${index === activeSuggestionIndex ? "true" : "false"}" data-tag-suggestion="${escapeHtml(tag.id)}">
        ${escapeHtml(tag.displayName)}
      </li>
    `).join("");
    list.hidden = !suggestions.length;
    input.setAttribute("aria-expanded", suggestions.length ? "true" : "false");
    if (activeSuggestionIndex >= 0) input.setAttribute("aria-activedescendant", `tag-search-suggestion-${activeSuggestionIndex}`);
    else input.removeAttribute("aria-activedescendant");
    return suggestions;
  };

  const chooseSuggestion = (id) => {
    const tag = tagForId(context.registry, id);
    if (!tag) return;
    const input = root.querySelector("[data-tag-search-input]");
    const suggestion = activeSuggestionRange || activeTagSuggestion(
      context.registry?.tags,
      input?.value || "",
      state.tagIds,
      input?.selectionStart,
      input?.selectionEnd,
    );
    const query = queryWithoutTagSuggestion(input?.value || "", suggestion);
    activeSuggestionRange = null;
    commitState(addToken(state, id, query), {
      focusInput: true,
      eventName: "tag_search_topic_selected",
      payload: { tagId: id },
    });
  };

  const moveCarousel = (track, step) => {
    const family = track.dataset.family;
    const cards = track.querySelectorAll(":scope > .tag-result-card");
    if (!family || !cards.length) return;
    const current = Number(track.dataset.carouselPosition) || carouselPosition(track);
    const position = scrollTrackToPosition(
      track,
      current + step,
      reducedMotion(windowObject) ? "auto" : "smooth",
    );
    state = {
      ...state,
      carouselPositions: { ...state.carouselPositions, ...(position ? { [family]: position } : {}) },
    };
    if (!position) delete state.carouselPositions[family];
    notifyState(state, {
      replace: true,
      eventName: "tag_search_carousel_moved",
      payload: { family, position },
    });
    const section = track.closest("[data-tag-result-family]");
    const previous = section?.querySelector('[data-tag-carousel-step="-1"]');
    const next = section?.querySelector('[data-tag-carousel-step="1"]');
    if (previous) previous.disabled = position <= 0;
    if (next) next.disabled = position >= cards.length - 1;
  };

  const onInput = (event) => {
    if (event.target.matches?.("[data-tag-search-input]")) updateSuggestions(event.target);
  };

  const onKeyDown = (event) => {
    const input = event.target.closest?.("[data-tag-search-input]");
    if (input) {
      const suggestion = activeTagSuggestion(
        context.registry?.tags,
        input.value,
        state.tagIds,
        input.selectionStart,
        input.selectionEnd,
      );
      const suggestions = suggestion.suggestions;
      activeSuggestionRange = suggestions.length ? { start: suggestion.start, end: suggestion.end } : null;
      if (event.key === "ArrowDown" && suggestions.length) {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1 + suggestions.length) % suggestions.length;
        updateSuggestions(input);
      } else if (event.key === "ArrowUp" && suggestions.length) {
        event.preventDefault();
        activeSuggestionIndex = activeSuggestionIndex < 0
          ? suggestions.length - 1
          : (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
        updateSuggestions(input);
      } else if (event.key === "Enter" && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        event.preventDefault();
        chooseSuggestion(suggestions[activeSuggestionIndex].id);
      } else if (event.key === "Escape") {
        event.preventDefault();
        dismissSuggestions();
      } else if (event.key === "Backspace" && !input.value && state.tagIds.length) {
        event.preventDefault();
        commitState(removeToken(state, state.tagIds.at(-1)), {
          focusInput: true,
          eventName: "tag_search_topic_removed",
        });
      }
      return;
    }

    const track = event.target.closest?.("[data-tag-result-track]");
    if (track && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      moveCarousel(track, event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const onClick = (event) => {
    const suggestion = event.target.closest?.("[data-tag-suggestion]");
    if (suggestion) {
      event.preventDefault();
      chooseSuggestion(suggestion.dataset.tagSuggestion);
      return;
    }

    const remove = event.target.closest?.("[data-tag-token-remove]");
    if (remove) {
      commitState(removeToken(state, remove.dataset.tagTokenRemove), {
        focusInput: true,
        eventName: "tag_search_topic_removed",
      });
      return;
    }

    const carouselButton = event.target.closest?.("[data-tag-carousel-step]");
    if (carouselButton) {
      const track = carouselButton.closest("[data-tag-result-family]")?.querySelector("[data-tag-result-track]");
      if (track) moveCarousel(track, Number(carouselButton.dataset.tagCarouselStep));
      return;
    }

    const showMore = event.target.closest?.("[data-tag-show-more]");
    if (showMore) {
      activeModal = openTagResultsModal(showMore.dataset.tagShowMore, {
        ...context,
        state,
        groups: currentGroups(),
        trigger: showMore,
        document: root.ownerDocument,
        window: windowObject,
        onStateChange: (nextState) => {
          state = stateWithDefaults(nextState);
          context.state = state;
          context.onStateChange?.(state);
        },
      });
      return;
    }

    if (event.target.closest?.("[data-tag-clear-query]")) {
      commitState({ ...state, query: "" }, { focusInput: true, eventName: "tag_search_text_cleared" });
      return;
    }

    if (event.target.closest?.("[data-tag-clear-all]")) {
      commitState({ ...state, tagIds: [], operators: [] }, { focusInput: true, eventName: "tag_search_topics_cleared" });
    }
  };

  const onChange = (event) => {
    const operator = event.target.closest?.("[data-tag-operator-index]");
    if (!operator) return;
    const index = Number(operator.dataset.tagOperatorIndex);
    const operators = [...state.operators];
    operators[index] = operator.value === "OR" ? "OR" : "AND";
    commitState({ ...state, operators }, {
      eventName: "tag_search_connector_changed",
      payload: { index, operator: operators[index] },
    });
  };

  const onSubmit = (event) => {
    if (!event.target.matches?.("[data-tag-search-form]")) return;
    event.preventDefault();
    const query = event.target.querySelector("[data-tag-search-input]")?.value.trim() || "";
    commitState({ ...state, query }, {
      focusInput: true,
      eventName: "tag_search_submitted",
      payload: { hasQuery: Boolean(query), tagCount: state.tagIds.length },
    });
  };

  const onScroll = (event) => {
    const track = event.target.closest?.("[data-tag-result-track]");
    if (!track) return;
    const prior = scrollTimers.get(track);
    if (prior) windowObject?.clearTimeout?.(prior);
    const timer = windowObject?.setTimeout?.(() => {
      const family = track.dataset.family;
      const position = carouselPosition(track);
      track.dataset.carouselPosition = String(position);
      const storedPosition = Number(state.carouselPositions[family]) || 0;
      if (position === storedPosition) {
        scrollTimers.delete(track);
        return;
      }
      state = {
        ...state,
        carouselPositions: { ...state.carouselPositions, ...(position ? { [family]: position } : {}) },
      };
      if (!position) delete state.carouselPositions[family];
      notifyState(state, { replace: true });
      scrollTimers.delete(track);
    }, 120);
    if (timer) scrollTimers.set(track, timer);
  };

  root.addEventListener("input", onInput);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("scroll", onScroll, true);
  restoreCarousels();

  const controller = {
    getState: () => stateWithDefaults(state),
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.removeEventListener("input", onInput);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
      root.removeEventListener("submit", onSubmit);
      root.removeEventListener("scroll", onScroll, true);
      scrollTimers.forEach((timer) => windowObject?.clearTimeout?.(timer));
      activeModal?.closeTagResultsModal?.();
      ROOT_CONTROLLERS.delete(root);
    },
  };
  ROOT_CONTROLLERS.set(root, controller);
  return controller;
}

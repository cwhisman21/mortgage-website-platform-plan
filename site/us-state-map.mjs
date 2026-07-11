import { DC_STAR, US_STATE_PATHS } from "./assets/us-state-map-paths.mjs";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const hasStateHubRoute = (route) => /^\/locations\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route || "");

function stateAnchor(state, path, className = "us-state-map-link") {
  if (!state || !hasStateHubRoute(state.route)) return "";

  const name = escapeHtml(state.name);
  return `<a class="${className}" data-state-id="${escapeHtml(state.id)}" href="${escapeHtml(state.route)}" aria-label="Open ${name} mortgage market"><path d="${path}"><title>${name}</title></path></a>`;
}

export function renderUsStateMap(states) {
  const byAbbr = new Map((Array.isArray(states) ? states : []).map((state) => [state?.abbr, state]));
  const stateAnchors = Object.entries(US_STATE_PATHS)
    .map(([abbr, path]) => stateAnchor(byAbbr.get(abbr), path))
    .join("");
  const dcStar = stateAnchor(byAbbr.get("DC"), DC_STAR, "us-state-map-dc-star");

  return `<nav class="us-state-map" aria-label="Browse mortgage markets by state"><svg viewBox="0 0 975 610" aria-label="United States mortgage market map">${stateAnchors}${dcStar}</svg></nav>`;
}

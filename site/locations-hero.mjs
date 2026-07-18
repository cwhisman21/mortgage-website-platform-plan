import { renderUsStateMap } from "./us-state-map.mjs";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function renderLocationsHero(states) {
  return `
    <section class="hero-band locations-hero">
      <div class="locations-hero-inner">
        <div class="locations-hero-copy">
          <p class="eyebrow">Explore mortgage markets</p>
          <h1>Where are you looking?</h1>
          <p class="lead">Choose a state or search for a city to explore local prices, payments, loan options, and market updates.</p>
          <form class="search-form locations-hero-search" data-search-form>
            <input name="query" aria-label="Search city or state" placeholder="Search city or state" />
            <button class="button" type="submit">Search</button>
          </form>
        </div>
        ${renderUsStateMap(states)}
      </div>
    </section>
  `;
}

export function renderHomeStateExplorer(states) {
  const stateLinks = [...(Array.isArray(states) ? states : [])]
    .filter((state) => state?.name && state?.route)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((state) => `<a class="home-state-list-link" href="${escapeHtml(state.route)}">${escapeHtml(state.name)}</a>`)
    .join("");

  return `
    <section class="section home-state-explorer" aria-labelledby="home-state-explorer-title">
      <div class="home-state-explorer-heading">
        <p class="eyebrow">Explore by state</p>
        <h2 id="home-state-explorer-title">Where are you looking?</h2>
        <p>Choose a state to review local mortgage markets, housing costs, city guides, and current reporting.</p>
      </div>
      ${renderUsStateMap(states)}
      <details class="home-state-list">
        <summary>See state list</summary>
        <nav class="home-state-list-grid" aria-label="State mortgage guides">${stateLinks}</nav>
      </details>
    </section>`;
}

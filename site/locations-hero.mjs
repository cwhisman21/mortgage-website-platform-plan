import { renderUsStateMap } from "./us-state-map.mjs";

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

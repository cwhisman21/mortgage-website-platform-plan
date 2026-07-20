const MIN_FRAME = 1;
const MAX_FRAME = 45;
const BEST_PRICING_FIELDS = Object.freeze(["rate", "apr", "points"]);

/**
 * @typedef {Object} CampaignPricingExample
 * @property {string} key
 * @property {string} lender
 * @property {string} rate
 * @property {string} apr
 * @property {string} downPayment
 * @property {string} points
 * @property {string} accent
 * @property {number} revealFrame
 * @property {boolean} featured
 * @property {string=} asOf
 */

export const CAMPAIGN_HERO_PRICING_EXAMPLES = Object.freeze([
  Object.freeze({
    key: "good",
    lender: "Lender 1",
    rate: "6.125%",
    apr: "6.284%",
    downPayment: "5%",
    points: "1.000",
    accent: "var(--campaign-reel-blue)",
    revealFrame: 17,
    featured: false,
  }),
  Object.freeze({
    key: "better",
    lender: "Lender 2",
    rate: "6.000%",
    apr: "6.221%",
    downPayment: "10%",
    points: "0.500",
    accent: "var(--campaign-reel-blue)",
    revealFrame: 22,
    featured: false,
  }),
  Object.freeze({
    key: "best",
    lender: "Lender 3",
    rate: "5.875%",
    apr: "6.164%",
    downPayment: "20%",
    points: "0.000",
    accent: "var(--campaign-reel-green)",
    revealFrame: 25,
    featured: true,
  }),
]);

function normalizeFrame(frame) {
  const numericFrame = Number(frame);
  if (!Number.isFinite(numericFrame)) return MIN_FRAME;
  return Math.min(Math.max(Math.round(numericFrame), MIN_FRAME), MAX_FRAME);
}

export function campaignPricingExampleIsBest(example, examples = CAMPAIGN_HERO_PRICING_EXAMPLES) {
  if (!example?.featured || !Array.isArray(examples) || examples.length === 0) return false;
  return BEST_PRICING_FIELDS.every((field) => {
    const displayedValues = examples.map((entry) => Number.parseFloat(entry[field]));
    const candidate = Number.parseFloat(example[field]);
    return Number.isFinite(candidate)
      && displayedValues.every(Number.isFinite)
      && candidate === Math.min(...displayedValues);
  });
}

function optionCard(example) {
  const isBest = campaignPricingExampleIsBest(example);
  return `
    <article
      class="campaign-loan-card${example.featured ? " campaign-loan-card--featured" : ""}"
      data-reel-card="${example.key}"
      data-reveal-frame="${example.revealFrame}"
      style="--campaign-card-accent: ${example.accent}"
    >
      <header class="campaign-loan-card__header">
        <h2>${example.lender}</h2>
        ${isBest ? '<span class="campaign-best-badge">Best</span>' : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7h10m-3-3 3 3-3 3M17 17H7m3 3-3-3 3-3" /></svg>'}
      </header>
      <div class="campaign-loan-card__body">
        <p class="campaign-option-status">Daily pricing example</p>
        <dl class="campaign-terms-list">
          <div><dt>Rate</dt><dd>${example.rate}</dd></div>
          <div><dt>APR</dt><dd>${example.apr}</dd></div>
          <div><dt>Down payment</dt><dd>${example.downPayment}</dd></div>
          <div><dt>Points</dt><dd>${example.points}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

export function renderCampaignHeroCardLayer() {
  return `
    <section class="campaign-hero-copy-layer" aria-label="Mortgage comparison options">
      <h1 class="campaign-hero-title">There is a better way than hoping for the best</h1>
      <p class="campaign-hero-lede">See lender choices side by side without guessing which path is strongest.</p>
      <div class="campaign-loan-card-stack" data-card-stack aria-label="Daily pricing examples from three lenders">
        ${CAMPAIGN_HERO_PRICING_EXAMPLES.map(optionCard).join("")}
      </div>
      <a class="campaign-primary-cta" href="/prequal/start" data-post-reveal-cta>
        Start My Comparison <span aria-hidden="true">&rarr;</span>
      </a>
      <p class="campaign-hero-disclosure" data-post-reveal-disclosure>Daily pricing values shown are examples, not personalized pricing or an overall loan ranking, and are not a quote, approval, offer, rate lock, or commitment to lend. Rate, APR, points, fees, down payment, availability, and terms vary by borrower, property, market, and lender review. Displayed down payments are examples, not universal minimum requirements. &ldquo;Best&rdquo; identifies the lowest displayed example rate, APR, and points only; it does not establish the best loan for a viewer.</p>
    </section>
  `;
}

function setAccessibleVisibility(element, visible, focusable = false) {
  element.setAttribute("aria-hidden", visible ? "false" : "true");
  element.inert = !visible;
  if (focusable) {
    if (visible) element.removeAttribute("tabindex");
    else element.setAttribute("tabindex", "-1");
  }
}

export function syncCampaignHeroCardLayer(frame, root = document) {
  const currentFrame = normalizeFrame(frame);
  const cards = [...(root?.querySelectorAll?.("[data-reveal-frame]") || [])];
  let highestThreshold = MIN_FRAME;

  cards.forEach((card) => {
    const threshold = Number(card.dataset.revealFrame);
    if (!Number.isFinite(threshold)) return;
    highestThreshold = Math.max(highestThreshold, threshold);
    const revealed = currentFrame >= threshold;
    card.classList.toggle("is-revealed", revealed);
    setAccessibleVisibility(card, revealed);
  });

  const cta = root?.querySelector?.("[data-post-reveal-cta]");
  if (cta) {
    const ready = currentFrame >= highestThreshold;
    cta.classList.toggle("is-ready", ready);
    setAccessibleVisibility(cta, ready, true);
    const disclosure = root?.querySelector?.("[data-post-reveal-disclosure]");
    if (disclosure) {
      disclosure.classList.toggle("is-ready", ready);
      setAccessibleVisibility(disclosure, ready);
    }
  }
  return currentFrame;
}

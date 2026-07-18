const MIN_FRAME = 1;
const MAX_FRAME = 45;

function normalizeFrame(frame) {
  const numericFrame = Number(frame);
  if (!Number.isFinite(numericFrame)) return MIN_FRAME;
  return Math.min(Math.max(Math.round(numericFrame), MIN_FRAME), MAX_FRAME);
}

function optionCard({ key, frame, lender, loanType, accent, featured = false }) {
  return `
    <article
      class="campaign-loan-card${featured ? " campaign-loan-card--featured" : ""}"
      data-reel-card="${key}"
      data-reveal-frame="${frame}"
      aria-hidden="true"
      inert
      style="--campaign-card-accent: ${accent}"
    >
      <header class="campaign-loan-card__header">
        <h2>${lender}</h2>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7h10m-3-3 3 3-3 3M17 17H7m3 3-3-3 3-3" /></svg>
      </header>
      <div class="campaign-loan-card__body">
        <div class="campaign-option-status">
          <strong>${loanType}</strong>
          <span class="campaign-example-badge">Example</span>
        </div>
        <dl class="campaign-terms-list">
          <div><dt>Rate and payment view</dt><dd>Compare</dd></div>
          <div><dt>Fees and credits</dt><dd>Compare</dd></div>
          <div><dt>Next-step clarity</dt><dd>Review</dd></div>
        </dl>
        <p class="campaign-verified-row"><span>Side-by-side view</span><span>Details</span></p>
      </div>
    </article>
  `;
}

export function renderCampaignHeroCardLayer() {
  return `
    <section class="campaign-hero-copy-layer" aria-label="Mortgage comparison options">
      <p class="campaign-hero-eyebrow">Compare lender options</p>
      <h1 class="campaign-hero-title">There is a better way than hoping for the best</h1>
      <p class="campaign-hero-lede">Compare lender options side by side without guessing which path is strongest.</p>
      <div class="campaign-loan-card-stack" data-card-stack aria-label="Illustrative lender comparisons">
        ${optionCard({ key: "good", frame: 17, lender: "Lender 1", loanType: "30-Year Conventional", accent: "var(--campaign-reel-blue)" })}
        ${optionCard({ key: "better", frame: 22, lender: "Lender 2", loanType: "FHA Loan", accent: "var(--campaign-reel-blue)" })}
        ${optionCard({ key: "best", frame: 25, lender: "Lender 3", loanType: "VA Loan", accent: "var(--campaign-reel-green)", featured: true })}
      </div>
      <a
        class="campaign-primary-cta"
        href="/prequal/start"
        data-post-reveal-cta
        aria-hidden="true"
        inert
        tabindex="-1"
      >Start My Comparison <span aria-hidden="true">&rarr;</span></a>
      <p class="campaign-hero-disclosure" data-post-reveal-disclosure aria-hidden="true" inert>Illustrative comparison only. Loan types shown are examples, not an offer or commitment to lend. Availability, eligibility, pricing, costs, and terms vary by lender and borrower.</p>
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

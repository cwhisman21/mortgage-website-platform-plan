export function renderCampaignHero() {
  const optionCard = (tone) => `
    <div class="campaign-option ${tone}">
      <span class="campaign-option-band"></span>
      <span class="campaign-option-line wide"></span>
      <span class="campaign-option-line medium"></span>
      <span class="campaign-option-line short"></span>
      <span class="campaign-option-line shortest"></span>
    </div>
  `;

  return `
    <section class="campaign-hero">
      <div class="campaign-hero-inner">
        <div class="campaign-hero-copy">
          <p class="eyebrow">Snap Mortgage</p>
          <h1>There is a better way than hoping for the best.</h1>
          <p class="lead">Compare mortgage paths with clearer market context, visible assumptions, and a next step that fits your situation.</p>
          <div class="hero-actions">
            <button class="button" type="button" data-cta-action="compareOffer">Start My Comparison <span aria-hidden="true">&rarr;</span></button>
            <a class="button secondary" href="/locations">Explore local markets <span aria-hidden="true">&rarr;</span></a>
          </div>
        </div>
        <div class="campaign-visual" aria-hidden="true">
          <img src="/site/assets/campaign-mortgage-machine.webp" alt="" />
          <span class="campaign-copy-mask"></span>
          <div class="campaign-card-stack">
            ${optionCard("blue")}
            ${optionCard("teal")}
            ${optionCard("navy")}
          </div>
        </div>
      </div>
    </section>
  `;
}

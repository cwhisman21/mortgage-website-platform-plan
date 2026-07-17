const CAMPAIGN_HERO_FRAME_COUNT = 30;

export const CAMPAIGN_HERO_FRAMES = Object.freeze(
  Array.from(
    { length: CAMPAIGN_HERO_FRAME_COUNT },
    (_, index) => `/site/assets/campaign-hero-frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.png`,
  ),
);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function campaignHeroFrameIndex(progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  return Math.round(safeProgress * (CAMPAIGN_HERO_FRAMES.length - 1));
}

export function renderCampaignHero() {
  return `
    <section class="campaign-hero campaign-hero-sequence" data-campaign-sequence>
      <div class="campaign-hero-stage">
        <div class="campaign-hero-inner">
          <h1 class="visually-hidden">A better way to compare mortgage options</h1>
          <img
            class="campaign-hero-image"
            data-campaign-frame
            src="${CAMPAIGN_HERO_FRAMES[0]}"
            alt="Compare mortgage options with Snap Mortgage's guided loan comparison."
            width="1855"
            height="1751"
            fetchpriority="high"
          />
          <button class="campaign-image-cta" type="button" data-cta-action="compareOffer"><span class="visually-hidden">Start My Comparison</span></button>
        </div>
      </div>
    </section>
  `;
}

export function initCampaignHero(root = document, environment = window) {
  const track = root?.querySelector?.("[data-campaign-sequence]");
  const frame = track?.querySelector?.("[data-campaign-frame]");

  if (!track || !frame || track.dataset.campaignInitialized === "true") return null;

  track.dataset.campaignInitialized = "true";

  const ImageConstructor = environment.Image;
  const requestFrame = environment.requestAnimationFrame.bind(environment);
  const cancelFrame = environment.cancelAnimationFrame?.bind(environment) || (() => {});
  const requestIdle = environment.requestIdleCallback?.bind(environment);
  const cancelIdle = environment.cancelIdleCallback?.bind(environment) || environment.clearTimeout.bind(environment);
  const reducedMotion = environment.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const loadedFrames = new Set([0]);
  const loadingFrames = new Map();
  let currentFrameIndex = 0;
  let animationFrameId = 0;
  let idleId = 0;
  let destroyed = false;

  function preload(index, showWhenReady = false) {
    if (destroyed || index < 0 || index >= CAMPAIGN_HERO_FRAMES.length) return;

    if (loadedFrames.has(index)) {
      if (showWhenReady && index !== currentFrameIndex) {
        frame.src = CAMPAIGN_HERO_FRAMES[index];
        currentFrameIndex = index;
      }
      return;
    }

    if (loadingFrames.has(index)) return;

    const image = new ImageConstructor();
    loadingFrames.set(index, image);
    image.onload = () => {
      loadingFrames.delete(index);
      loadedFrames.add(index);
      if (!destroyed && showWhenReady) {
        frame.src = CAMPAIGN_HERO_FRAMES[index];
        currentFrameIndex = index;
      }
    };
    image.onerror = () => loadingFrames.delete(index);
    image.src = CAMPAIGN_HERO_FRAMES[index];
  }

  function scrollProgress() {
    const rect = track.getBoundingClientRect();
    const distance = Math.max(track.offsetHeight - environment.innerHeight, 1);
    return clamp(-rect.top / distance, 0, 1);
  }

  function update() {
    animationFrameId = 0;
    if (destroyed || !environment.document.documentElement.contains(track)) {
      destroy();
      return;
    }

    const nextFrameIndex = campaignHeroFrameIndex(scrollProgress());
    if (nextFrameIndex !== currentFrameIndex) preload(nextFrameIndex, true);
  }

  function scheduleUpdate() {
    if (!animationFrameId) animationFrameId = requestFrame(update);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    environment.removeEventListener("scroll", scheduleUpdate);
    environment.removeEventListener("resize", scheduleUpdate);
    if (animationFrameId) cancelFrame(animationFrameId);
    if (idleId) cancelIdle(idleId);
    loadingFrames.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
    loadingFrames.clear();
    delete track.dataset.campaignInitialized;
  }

  if (reducedMotion) return { destroy };

  CAMPAIGN_HERO_FRAMES.slice(1, 5).forEach((_, offset) => preload(offset + 1));
  const preloadRemaining = () => {
    idleId = 0;
    CAMPAIGN_HERO_FRAMES.slice(5).forEach((_, offset) => preload(offset + 5));
  };
  idleId = requestIdle
    ? requestIdle(preloadRemaining, { timeout: 1200 })
    : environment.setTimeout(preloadRemaining, 0);

  environment.addEventListener("scroll", scheduleUpdate, { passive: true });
  environment.addEventListener("resize", scheduleUpdate);
  scheduleUpdate();

  return { destroy };
}

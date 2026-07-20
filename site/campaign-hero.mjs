import { renderCampaignHeroCardLayer, syncCampaignHeroCardLayer } from "./campaign-hero-card-layer.mjs?v=20260719-1";

const sourceFrames = Array.from(
  { length: 30 },
  (_, index) => `/site/assets/campaign-hero-frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.png`,
);

export const CAMPAIGN_HERO_FRAMES = Object.freeze([
  ...sourceFrames,
  ...Array(15).fill(sourceFrames.at(-1)),
]);

const PRELOAD_RADIUS = 2;
const COPY_EXIT_COMPLETE_FRAME = 10;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function campaignHeroCopyExitProgress(progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const framePosition = safeProgress * (CAMPAIGN_HERO_FRAMES.length - 1);
  return clamp(framePosition / (COPY_EXIT_COMPLETE_FRAME - 1), 0, 1);
}

function syncCampaignHeroCopyExit(track, progress) {
  const exitProgress = campaignHeroCopyExitProgress(progress);
  const percent = Number((-140 * exitProgress).toFixed(3));
  const pixels = Number((-160 * exitProgress).toFixed(3));
  track.style.setProperty(
    "--campaign-copy-exit-transform",
    `translateY(calc(${percent}% - ${Math.abs(pixels)}px))`,
  );
  track.style.setProperty(
    "--campaign-copy-exit-opacity",
    (1 - exitProgress).toFixed(4),
  );
}

export function campaignHeroClampedScrollDelta(delta, maxDelta) {
  if (!Number.isFinite(delta) || delta === 0) return 0;
  if (!Number.isFinite(maxDelta) || maxDelta <= 0) return delta;
  return Math.sign(delta) * Math.min(Math.abs(delta), maxDelta);
}

export function campaignHeroQueuedWheelDelta(pendingDelta, nextDelta, maxDelta) {
  const safePendingDelta = Number.isFinite(pendingDelta) ? pendingDelta : 0;
  const safeNextDelta = Number.isFinite(nextDelta) ? nextDelta : 0;
  return campaignHeroClampedScrollDelta(safePendingDelta + safeNextDelta, maxDelta);
}

export function campaignHeroFrameIndex(progress) {
  const safeProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  return Math.round(safeProgress * (CAMPAIGN_HERO_FRAMES.length - 1));
}

export function campaignHeroScrollProgress({
  trackTop,
  trackDocumentTop,
  trackHeight,
  stageHeight,
}) {
  const distance = Math.max(trackHeight - stageHeight, 1);
  return clamp((trackDocumentTop - trackTop) / distance, 0, 1);
}

export function renderCampaignHero() {
  return `
    <section class="campaign-hero campaign-hero-sequence" data-campaign-sequence>
      <div class="campaign-hero-stage">
        <div class="campaign-hero-inner">
          ${renderCampaignHeroCardLayer()}
          <div class="campaign-hero-visual">
            <img
              class="campaign-hero-image"
              data-campaign-frame
              src="${CAMPAIGN_HERO_FRAMES[0]}"
              alt="Compare mortgage options with Snap Mortgage's guided loan comparison."
              width="1855"
              height="1751"
              fetchpriority="high"
            />
          </div>
        </div>
      </div>
    </section>
  `;
}

export function initCampaignHero(root = document, environment = window) {
  const track = root?.querySelector?.("[data-campaign-sequence]");
  const stage = track?.querySelector?.(".campaign-hero-stage");
  const frame = track?.querySelector?.("[data-campaign-frame]");
  const header = root?.querySelector?.(".site-header") || environment.document?.querySelector?.(".site-header");

  if (!track || !stage || !frame || track.dataset.campaignInitialized === "true") return null;

  track.dataset.campaignInitialized = "true";
  track.classList.add("is-enhanced");

  const ImageConstructor = environment.Image;
  const requestFrame = environment.requestAnimationFrame.bind(environment);
  const cancelFrame = environment.cancelAnimationFrame?.bind(environment) || (() => {});
  const reducedMotion = environment.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const loadedFrameUrls = new Set([CAMPAIGN_HERO_FRAMES[0]]);
  const loadingFrames = new Map();
  let currentFrameIndex = 0;
  let requestedFrameIndex = 0;
  let animationFrameId = 0;
  let wheelFrameId = 0;
  let pendingWheelDelta = 0;
  let destroyed = false;

  function preload(index, showWhenReady = false) {
    if (destroyed || index < 0 || index >= CAMPAIGN_HERO_FRAMES.length) return;
    const frameUrl = CAMPAIGN_HERO_FRAMES[index];
    if (showWhenReady) requestedFrameIndex = index;

    if (loadedFrameUrls.has(frameUrl)) {
      if (showWhenReady && index !== currentFrameIndex) {
        frame.src = frameUrl;
        currentFrameIndex = index;
      }
      return;
    }

    if (loadingFrames.has(frameUrl)) return;

    const image = new ImageConstructor();
    loadingFrames.set(frameUrl, image);
    image.onload = () => {
      loadingFrames.delete(frameUrl);
      loadedFrameUrls.add(frameUrl);
      if (!destroyed && CAMPAIGN_HERO_FRAMES[requestedFrameIndex] === frameUrl) {
        frame.src = frameUrl;
        currentFrameIndex = requestedFrameIndex;
      }
    };
    image.onerror = () => loadingFrames.delete(frameUrl);
    image.src = frameUrl;
  }

  function preloadAdjacentFrames(index) {
    preload(index, true);
    for (let offset = 1; offset <= PRELOAD_RADIUS; offset += 1) {
      preload(index - offset);
      preload(index + offset);
    }
  }

  function scrollProgress() {
    const rect = track.getBoundingClientRect();
    const pageScrollY = environment.scrollY ?? environment.pageYOffset ?? 0;
    return campaignHeroScrollProgress({
      trackTop: rect.top,
      trackDocumentTop: rect.top + pageScrollY,
      trackHeight: track.offsetHeight,
      stageHeight: stage.offsetHeight,
    });
  }

  function scrollStepPx() {
    const styleValue = environment.getComputedStyle?.(track)?.getPropertyValue("--campaign-scroll-step") || "";
    const parsedValue = Number.parseFloat(styleValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  function normalizedWheelDelta(event) {
    const viewportHeight = environment.innerHeight || stage.offsetHeight || 1;
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * viewportHeight;
    return event.deltaY;
  }

  function isStickySequenceActive(delta) {
    const progress = scrollProgress();
    if (delta > 0 && progress >= 1) return false;
    if (delta < 0 && progress <= 0) return false;
    const rect = track.getBoundingClientRect();
    const stickyTop = Number.parseFloat(track.style.getPropertyValue("--campaign-sticky-top")) || 0;
    const stickyBottom = stickyTop + stage.offsetHeight;
    return rect.top <= stickyTop + 1 && rect.bottom >= stickyBottom - 1;
  }

  function flushWheelStep() {
    wheelFrameId = 0;
    const nextDelta = pendingWheelDelta;
    pendingWheelDelta = 0;
    if (!nextDelta || destroyed) return;

    if (typeof environment.scrollBy === "function") {
      environment.scrollBy({ top: nextDelta, left: 0, behavior: "instant" });
    } else {
      environment.scrollTo?.(0, (environment.scrollY || environment.pageYOffset || 0) + nextDelta);
    }
    scheduleUpdate();
  }

  function handleWheel(event) {
    const step = scrollStepPx();
    const delta = normalizedWheelDelta(event);
    if (!step || !delta || !isStickySequenceActive(delta)) return;

    event.preventDefault();
    pendingWheelDelta = campaignHeroQueuedWheelDelta(pendingWheelDelta, delta, step);
    if (!wheelFrameId) wheelFrameId = requestFrame(flushWheelStep);
  }

  function syncStickyOffset() {
    const headerHeight = Math.max(header?.getBoundingClientRect?.().height || 0, 0);
    track.style.setProperty("--campaign-sticky-top", `${headerHeight}px`);
  }

  function update() {
    animationFrameId = 0;
    if (destroyed || !environment.document.documentElement.contains(track)) {
      destroy();
      return;
    }

    const progress = scrollProgress();
    const nextFrameIndex = campaignHeroFrameIndex(progress);
    const logicalFrame = nextFrameIndex + 1;
    syncCampaignHeroCopyExit(track, progress);
    track.dataset.currentFrame = String(syncCampaignHeroCardLayer(logicalFrame, track));
    if (nextFrameIndex !== requestedFrameIndex) preloadAdjacentFrames(nextFrameIndex);
  }

  function scheduleUpdate() {
    if (!animationFrameId) animationFrameId = requestFrame(update);
  }

  function handleResize() {
    syncStickyOffset();
    scheduleUpdate();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    environment.removeEventListener("scroll", scheduleUpdate);
    environment.removeEventListener("wheel", handleWheel);
    environment.removeEventListener("resize", handleResize);
    if (animationFrameId) cancelFrame(animationFrameId);
    if (wheelFrameId) cancelFrame(wheelFrameId);
    pendingWheelDelta = 0;
    loadingFrames.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
    loadingFrames.clear();
    syncCampaignHeroCopyExit(track, 0);
    syncCampaignHeroCardLayer(CAMPAIGN_HERO_FRAMES.length, track);
    track.classList.remove("is-enhanced");
    delete track.dataset.campaignInitialized;
  }

  if (reducedMotion) {
    syncCampaignHeroCopyExit(track, 0);
    const finalFrameIndex = CAMPAIGN_HERO_FRAMES.length - 1;
    frame.src = CAMPAIGN_HERO_FRAMES.at(-1);
    currentFrameIndex = finalFrameIndex;
    requestedFrameIndex = finalFrameIndex;
    track.dataset.currentFrame = String(syncCampaignHeroCardLayer(CAMPAIGN_HERO_FRAMES.length, track));
    return { destroy };
  }

  preloadAdjacentFrames(0);

  environment.addEventListener("scroll", scheduleUpdate, { passive: true });
  environment.addEventListener("wheel", handleWheel, { passive: false });
  environment.addEventListener("resize", handleResize);
  syncStickyOffset();
  scheduleUpdate();

  return { destroy };
}

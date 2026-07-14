(function () {
  function initSnapSlotHero(root = document) {
    const scrollSection = root.querySelector("[data-snap-slot-hero]");
    const mechanicalScene = scrollSection?.querySelector("[data-mechanical-scene]");
    const cards = Array.from(scrollSection?.querySelectorAll(".loan-card") || []);
    const frameData = window.SNAP_SLOT_HERO_FRAMES;

    if (!scrollSection || !mechanicalScene || !frameData || scrollSection.dataset.slotHeroInitialized === "true") {
      return;
    }

    scrollSection.dataset.slotHeroInitialized = "true";

    const frames = frameData.mechanical || frameData.cycle;
    const params = new URLSearchParams(window.location.search);
    const requestedFrame = Number(params.get("frame"));
    const assetBase = new URL(window.SNAP_SLOT_HERO_ASSET_BASE || "/site/assets/slot-hero/", window.location.origin);
    let currentFrameIndex = -1;
    let ticking = false;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function revealCards(index) {
      const frameNumber = index + 1;

      cards.forEach((card) => {
        const cardIndex = Number(card.dataset.cardIndex);
        const threshold = frameData.cardRevealFrames[`loanType${cardIndex}`];
        card.classList.toggle("is-revealed", frameNumber >= threshold);
      });
    }

    function setFrame(index) {
      const safeIndex = clamp(index, 0, frames.length - 1);

      if (safeIndex === currentFrameIndex) {
        return;
      }

      const frame = frames[safeIndex];
      currentFrameIndex = safeIndex;
      mechanicalScene.src = new URL(frame.file, assetBase).href;
      mechanicalScene.alt = `Customer pulling a slot-machine lever, scroll frame ${safeIndex + 1}`;
      scrollSection.dataset.currentFrame = String(safeIndex + 1);
      revealCards(safeIndex);
    }

    function scrollProgress() {
      const rect = scrollSection.getBoundingClientRect();
      const scrollDistance = Math.max(scrollSection.offsetHeight - window.innerHeight, 1);
      return clamp(-rect.top / scrollDistance, 0, 1);
    }

    function teardownIfRemoved() {
      if (document.documentElement.contains(scrollSection)) {
        return false;
      }

      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      return true;
    }

    function updateFromScroll() {
      ticking = false;
      if (teardownIfRemoved()) return;

      const progress = scrollProgress();
      const frameIndex = Math.round(progress * (frames.length - 1));
      scrollSection.style.setProperty("--scroll-progress", progress.toFixed(4));
      setFrame(frameIndex);
    }

    function requestScrollUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateFromScroll);
    }

    if (Number.isFinite(requestedFrame) && requestedFrame >= 1) {
      const debugFrameIndex = Math.min(requestedFrame, frames.length) - 1;
      scrollSection.style.setProperty("--scroll-progress", (debugFrameIndex / (frames.length - 1)).toFixed(4));
      setFrame(debugFrameIndex);
      return;
    }

    frames.slice(1).forEach((frame) => {
      const image = new Image();
      image.src = new URL(frame.file, assetBase).href;
    });

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate);
    requestScrollUpdate();
  }

  window.initSnapSlotHero = initSnapSlotHero;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initSnapSlotHero());
  } else {
    initSnapSlotHero();
  }
})();

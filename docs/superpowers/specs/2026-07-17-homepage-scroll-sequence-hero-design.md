# Homepage Scroll-Sequence Hero Design

## Goal

Replace only the homepage's current composite campaign hero with the 30 ordered PNG frames supplied in `C:\Users\caleb\Downloads\Trimmed`. Preserve the existing homepage navigation, campaign message, CTA behavior, and every section below the hero.

## Approved Interaction

The hero is a sticky image-sequence scrubber. While the user scrolls through the hero's track, the displayed image advances from `ezgif-frame-001.png` through `ezgif-frame-030.png` in filename order. The image stays pinned for the sequence and the document resumes normal flow after the last frame.

- Desktop pacing: 55 CSS pixels of scroll travel per frame transition, for 1,595 pixels across 29 transitions.
- Mobile pacing: 35 CSS pixels per frame transition, for 1,015 pixels across 29 transitions.
- Frame selection: map clamped hero scroll progress from 0–1 to frames 1–30 and round to the nearest frame.
- Rendering: use a normal `<img>` element and update its `src` inside a `requestAnimationFrame`-throttled scroll handler.

## Structure and Presentation

`renderCampaignHero()` remains the homepage-only entry point. It will render:

- A scroll track whose height equals one viewport plus the approved frame-transition travel.
- A sticky, viewport-height visual stage.
- The sequence image, sized with the same responsive composition and focal treatment as the current campaign artwork.
- The existing accessible homepage heading.
- The existing comparison CTA hotspot and action wiring, positioned over the CTA drawn into the supplied artwork.

The sequence must not be attached to shared city, state, product, learning-center, or profile heroes.

## Asset Loading

Copy the 30 source frames into a deployable homepage-specific asset directory with their ordered filenames intact. Frame 1 is present in initial markup so the hero is useful before JavaScript runs. The client script preloads the next few frames first, then schedules the remaining frames without blocking page interaction. A frame is displayed only after its image has loaded; if the requested frame is not ready, the last successfully displayed frame remains visible.

## Responsive and Accessibility Behavior

- Desktop and mobile use the same 30-frame sequence with different scroll density.
- The image has meaningful alt text describing the overall campaign scene, not changing frame counts.
- The visually hidden heading remains available to assistive technology.
- The CTA remains a native button with its existing accessible label and action.
- Under `prefers-reduced-motion: reduce`, the extended scroll track is removed, the stage is not sticky, and a single representative frame is shown.
- If JavaScript fails, frame 1 and the CTA remain visible and usable.

## Performance and Lifecycle

- Scroll listeners are passive and visual updates are limited to one per animation frame.
- The current frame is not assigned again when the computed frame index has not changed.
- Resize recalculates the active responsive pacing through layout/CSS rather than duplicating the sequence.
- The listener is removed if client-side routing removes the homepage hero.
- The implementation must not preload duplicate URLs or start multiple listeners when the homepage is revisited.

## Verification

Automated tests will verify:

- The homepage hero renders the sequence hooks and frame-1 fallback.
- Exactly 30 ordered frame paths are declared.
- Desktop and mobile scroll-travel values match 55 and 35 pixels per transition.
- The existing CTA action and accessible heading remain present.
- Reduced-motion styling disables the sticky extended sequence.
- Other page hero renderers are unchanged.

Browser verification will confirm the first, middle, and last frames at corresponding scroll positions on desktop and mobile, CTA clickability, clean release into the next homepage section, and the reduced-motion fallback.

## Scope Boundaries

This change does not alter homepage copy, navigation, downstream sections, shared hero components, routing, lead flows, or the source artwork. It does not introduce canvas rendering, interpolation, cross-fades, autoplay, or additional parallax layers.

# Global Snap Mortgage Logo Replacement Design

## Goal

Replace the shared public-site header logo with the user-supplied transparent PNG at `C:\Users\caleb\Downloads\Asset 16@25x-8.png`. The replacement applies globally to dynamic pages, generated routes, and generated market-news pages.

## Asset Contract

- Deploy the supplied PNG unchanged at `site/assets/images/snap-mortgage.png`.
- Preserve its intrinsic 1175 × 520 dimensions, transparent background, black `snap` wordmark, and purple icon and `mortgage` wordmark.
- Keep the existing `/site/assets/images/snap-mortgage.png` public URL so every current header reference updates without rewriting generated HTML.
- Do not crop, recolor, trace, optimize, or otherwise modify the artwork.

## Header Presentation

- Size `.brand-logo` by height and allow width to derive automatically from the source aspect ratio.
- Desktop rendered height: 72 CSS pixels.
- Mobile rendered height at the existing 760-pixel breakpoint: 56 CSS pixels.
- Preserve `display: block`, `width: auto`, and `max-width: 100%` so the artwork remains proportional and cannot overflow its header area.
- Update the header brand column only as needed to fit the approximately 163-pixel desktop logo width without crowding navigation or account controls.
- Preserve the existing white header background and do not add a container, border, shadow, or background behind the transparent logo.

## Scope and Accessibility

- Keep the existing home link around the logo.
- Keep the accessible image text and link label as `Snap Mortgage` and `Snap Mortgage home` where they already exist.
- Change no navigation labels, routes, responsive menu behavior, header actions, or generated page content.
- Do not rewrite generated pages solely for this replacement because all of them already reference the shared asset URL.

## Verification

Automated checks will confirm:

- `site/assets/images/snap-mortgage.png` exists and has the exact 1175 × 520 dimensions of the supplied file.
- The deployed asset is byte-for-byte identical to the supplied PNG.
- Desktop CSS renders `.brand-logo` at 72 pixels high with automatic width.
- Mobile CSS renders `.brand-logo` at 56 pixels high.
- Dynamic and generated header renderers still reference `/site/assets/images/snap-mortgage.png` with `Snap Mortgage` accessible text.
- Shared-navigation tests and the static route smoke test pass.

## Failure Safety

If the image cannot load, the existing alternative text remains available. No JavaScript, runtime migration, content regeneration, or network dependency is required for the replacement.

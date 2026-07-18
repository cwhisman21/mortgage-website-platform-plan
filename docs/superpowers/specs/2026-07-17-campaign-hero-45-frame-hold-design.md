# Campaign Hero 45-Frame Hold Design

## Goal

Keep the homepage hero pinned longer after its animation completes and establish a stable 45-frame timeline for future calls to action.

## Approved behavior

- Preserve the existing 30 source images in their current order.
- Expose 45 logical frames.
- Logical frames 1 through 30 map to source images 1 through 30.
- Logical frames 31 through 45 reuse source image 30; no duplicate image files are created.
- Use 35 CSS pixels of scroll travel per logical frame interval on desktop and mobile.
- With 45 frames, total scroll travel is `(45 - 1) * 35 = 1540px`.
- Cap an intercepted desktop wheel movement at 35px so a single handled movement cannot advance more than one logical frame interval.
- Keep reduced-motion behavior unchanged.

## Future CTA contract

Frame numbers are one-based for product requirements. A CTA assigned to frame 20 will therefore activate at logical array index 19. Extending the final hold must not shift frames 1 through 30.

## Implementation boundaries

Update only the campaign hero frame list, scroll-travel variables, wheel-step variable, and their regression tests. Do not add CTA UI or alter the supplied frame artwork in this change.

## Verification

Tests must prove that the timeline contains 45 entries, exactly 30 unique image URLs, logical frames 30 through 45 all resolve to source image 30, frame 20 still resolves to source image 20, and responsive travel is 1540px with a 35px wheel cap.

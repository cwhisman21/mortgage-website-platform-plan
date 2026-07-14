# Calculator result and slider UI handoff

## Economic intent

Audience: consumer mortgage shoppers comparing rough payment, affordability, refinance, rent-vs-buy, and down-payment scenarios.

The circular result visual should make the estimate feel tangible without implying approval, qualification, rate lock, or a personalized credit offer. The center value is a scenario estimate. Supporting legend rows explain visible components or comparisons.

## Supported claims

- Payment calculators can show estimated monthly amount based on visible inputs.
- Additive scenarios can show composition: principal and interest, taxes, insurance, HOA, mortgage insurance, funding fee, or cash components.
- Comparison scenarios can use a circular visual family, but should not imply the compared values add to one total.
- Product program selection changes assumptions and guardrails.

## Unsupported claims

- Do not imply the ring is an approval meter.
- Do not imply the user qualifies for the selected program.
- Do not imply real pricing, real underwriting, or live agency data until integration replaces dummy data.

## Figma component anatomy

- `Calculator/Input Row`
  - Label
  - Value box with optional prefix/suffix
  - Range slider with blue filled track and circular grip thumb
  - States: default, focused, dragging, disabled

- `Calculator/Product Toggle`
  - Program abbreviation
  - Program status
  - States: active, default, disabled, review, eligible

- `Calculator/Result Donut`
  - Accessibility checkbox row
  - Circular graph using Snap blue, green, yellow, teal, red
  - Center label and large currency value
  - Legend rows with swatch, label, value
  - CTA block with yellow “Get Your Loan Estimate” action

## Responsive behavior

- Desktop: form left, result right.
- Tablet/mobile: form stacks above result.
- Input rows remain one-column; the label/value pair may stack on narrow screens.
- Donut scales down with viewport but preserves center value legibility.

## Review gates

- Economic accuracy: additive vs comparison semantics are not blurred.
- Accessibility: values remain readable without color alone; checkbox placeholder retained for color-pattern mode.
- Component reuse: slider row and result donut are reusable across calculator pages.
- Compliance: calculator disclosure remains visible near the result.

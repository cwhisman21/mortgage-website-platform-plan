# Seller Net Sheet And Snap Homes Account Gate

**Date:** July 16, 2026

**Status:** Approved design contract; implementation pending

**Surface:** Public `/sell` page

**Design language:** Snap Mortgage Decision Flow

**Supersedes:** The value-confirmation, public-results, pro forma, account-continuation, and error-state sections of `docs/superpowers/specs/2026-07-16-seller-workspace-design.md`

## Objective

Turn the existing seller workspace into an address-first acquisition experience that gives a homeowner a visible property-value range, lets them choose a value within that range, collects the obligations they already know, and then uses a Snap Homes account handoff to unlock the detailed selling-cost analysis and projected proceeds.

The public page remains useful and crawlable. Property value is not gated. The detailed cost calculation, projected proceeds, and downloadable seller net sheet are the account benefit. This repository stops at a simulated account handoff: it does not implement real authentication, account creation, persistence, document storage, lead routing, or Snap Homes portal behavior.

## Approved Experience

1. The homeowner opens the address flow from the `/sell` hero.
2. They select a supported address and receive a low, central, and high property-value estimate.
3. They use a bounded slider to choose a value between the returned low and high values.
4. They enter known obligations and an expected closing date.
5. The page transforms into a property summary with the selected value visible and the detailed analysis locked.
6. The account action reads `Open My Account` when the browsing session is logged in and `Create My Account` when it is logged out.
7. Selecting the account action opens the existing Snap Homes handoff/confirmation modal and completes the frontend-only handoff in the same interaction.
8. The page then reveals the itemized selling costs, projected proceeds, low/high proceeds comparison, inline editing controls, and PDF download.

No additional account fields, second confirmation button, or embedded Snap Homes portal is introduced.

## Superseded Decisions

| Earlier seller-workspace decision | Replacement in this contract |
| --- | --- |
| `Enter my own value` and freeform value input | Bounded range slider only |
| Manual value fallback when no valuation is found | Ask the homeowner to try another supported address |
| Mortgage payoff as the only pre-result obligation | First mortgage, second mortgage/HELOC, other liens, and expected closing date |
| Complete cost and proceeds result available without an account | Value remains visible; costs and proceeds unlock after Snap Homes handoff |
| Five broad selling-cost rows | Grouped seller net sheet with required and optional rows |
| Low/base/high full pro forma paths | One selected-value net sheet plus low/high final proceeds comparison |
| Snap Homes CTA only offers future continuation | Account action immediately unlocks the current frontend analysis after the handoff modal opens |
| Account CTA label `Save this home and estimate in Snap Homes` | `Open My Account` or `Create My Account` |
| No download | Downloadable, print-ready Snap-branded PDF after unlock |

All portions of the earlier seller spec not contradicted here remain in force, including the canonical `/sell` route, crawlable seller education, address suggestions, statement-reader adapter boundary, memory-only private state, combined mobile navigation/account menu, and responsive/accessibility requirements.

## State Flow

### 1. Public Entry

The existing `/sell` entry page remains crawlable and borrower-facing. It includes:

- Seller-focused H1 and address CTA.
- Useful education about property value, payoff, selling costs, offer comparison, and closing.
- Internal links, FAQs, sources, updated date, and tags.
- No user-specific address or financial values in generated HTML.

The primary CTA opens one accessible progressive dialog.

### 2. Address Selection

- Field label: `Home address`.
- Address suggestions use the existing adapter and keyboard-accessible combobox/listbox behavior.
- The user must choose a suggestion; arbitrary unverified text cannot proceed.
- A selected record supplies the normalized display address, state, jurisdiction data when available, and property ID.
- If no supported property/valuation is returned, preserve the typed query and ask the homeowner to try another address.
- Do not offer manual property-value entry as a fallback.

### 3. Value Selection

The valuation adapter returns:

```js
{
  propertyId,
  lowCents,
  baseCents,
  highCents,
  asOf,
  sourceLabel,
  methodologyKey
}
```

The interface shows:

- Central estimate as the largest and boldest figure.
- Low and high estimates as fixed range endpoints.
- Native `<input type="range">` from `lowCents` to `highCents`.
- Step size of `$1,000` (`100000` integer cents).
- Initial slider value equal to `baseCents`, clamped to the nearest valid step.
- A live selected-value output above the control.
- Primary action: `Use this value`.

There is no currency input for the property value. The same slider is used when the selected sale price is edited after unlock.

### 4. Obligations And Closing Date

Before the account gate, collect:

- First mortgage payoff.
- Second mortgage or HELOC payoff.
- Other liens.
- Expected closing date.

The closing date defaults at runtime to 30 calendar days after the current local date. The user may change it before continuing and edit it after unlock.

The existing mortgage-statement selection remains available as an optional way to suggest the first-mortgage payoff. The current frontend adapter may return a suggested amount; the homeowner must confirm or correct it. No file contents are rendered or persisted. Second-mortgage/HELOC and other-lien amounts are entered directly.

Zero is valid for second mortgage/HELOC and other liens. A first-mortgage payoff may also be zero for a property owned free and clear, but the homeowner must make an explicit selection or entry rather than receiving a silent default.

### 5. Locked Property Summary

After the obligations step, close the dialog and transform the top of `/sell` into a property summary.

The locked summary may show:

- Selected address.
- Low, selected, and high property values.
- The obligations and closing date entered by the homeowner.
- The selling-cost category names that the full analysis will contain.
- Account CTA and concise explanation of the account benefit.

It must not show, calculate for rendering, serialize, or place in the DOM:

- Any calculated selling-cost amount.
- Total selling costs.
- Net before obligations.
- Projected proceeds or shortfall.
- Low/high proceeds amounts.
- A chart whose geometry exposes those amounts.

The locked net-sheet preview uses semantic placeholders and a lock state, not CSS blur over real values. Assistive technology must not encounter hidden calculated values.

### 6. Simulated Snap Homes Handoff

The injected account callback has this frontend contract:

```js
openAccount({
  mode: "open" | "create",
  intent: "seller-net-sheet"
}) => Promise<{ status: "completed" }>
```

- Logged-in session: CTA label `Open My Account`, mode `open`.
- Logged-out session: CTA label `Create My Account`, mode `create`.
- Selecting the CTA opens the existing no-field account/handoff modal.
- The callback resolves as completed in this frontend build.
- The seller workspace unlocks immediately after the callback resolves; no second account action is required.
- The page does not navigate into or recreate the Snap Homes portal.
- The current build does not persist or transmit the seller inputs.

The handoff architecture must allow a future authenticated Snap Homes integration to replace the callback without changing the seller calculator or net-sheet renderer.

### 7. Unlocked Analysis

After the handoff completes, calculate and render:

- Selected property value.
- Grouped selling expenses.
- Grouped existing obligations.
- Total selling expenses.
- Net before obligations.
- Total obligations.
- Projected net proceeds or projected shortfall.
- Low/high final proceeds comparison.
- Direct PDF download.

The selected-value result is dominant. Low and high appear only as compact final comparison figures using the same calculation rules.

## Net Sheet Information Architecture

### Selling Expenses

Required rows shown when applicable:

1. Seller title, escrow, and settlement services.
2. State and county transfer tax.
3. Municipal transfer tax.
4. Listing-side compensation.
5. Buyer-agent compensation.
6. Buyer closing-cost credit.
7. Inspection and negotiated repairs.
8. Other seller costs.

Optional rows are hidden until selected through `Add another cost`:

- HOA resale or closing package.
- Survey.
- Termite or pest inspection and repairs.
- FHA/VA-required seller costs.
- Home warranty.
- Attorney or legal fees.
- Radon retest or mitigation.
- Well and septic inspection.

An added optional row appears in the appropriate group and may be removed. Removing it clears its local override and returns it to the hidden selection list. Optional rows are not rendered as visible `$0` lines.

### Existing Obligations

Required rows:

1. First mortgage payoff.
2. Second mortgage or HELOC payoff.
3. Other liens.
4. Property-tax proration.

Optional rows under `Add another cost`:

- Past-due mortgage or equity-loan payments.
- HOA past-due assessments.
- Other obligations.

### Summary

The statement ends with:

1. Total selling expenses.
2. Net before obligations.
3. Total obligations.
4. Projected net proceeds, or projected shortfall when deductions exceed value.
5. Compact low/high final proceeds comparison.

The interface does not repeat `Estimated`, source badges, or formula labels on every line. The page context and bottom note establish that the document is an estimate. Formula, source, and as-of metadata remain available in the controlled data registry and methodology/source area.

## Cost Registry

Move seller-cost rules out of the broad workspace fixture into `mock-data/seller-cost-registry.json`. Each record uses this normalized shape:

```js
{
  id: "listingCompensation",
  group: "selling-expense",
  label: "Listing-side compensation",
  mode: "percent_of_sale_price",
  value: 0.025,
  optional: false,
  jurisdiction: "US",
  asOf: "2026-07-16",
  sourceType: "configured_assumption",
  sourceLabel: "Editable planning assumption",
  sourceUrl: ""
}
```

Supported calculation modes:

- `percent_of_sale_price`: sale price multiplied by an editable decimal rate.
- `fixed_amount`: configured or user-entered integer cents.
- `statutory_transfer_tax`: ceiling-based tax formula configured by jurisdiction.
- `prorated_annual`: annual amount multiplied by the fraction of the configured tax period through the expected closing date.
- `customer_entered`: obligation or negotiated amount supplied by the homeowner.

The selected address resolves the most specific available registry record in this order:

1. Municipality/county.
2. State.
3. National configured assumption.

No statutory formula may silently fall back to an unrelated jurisdiction. Missing statutory data produces an editable configured amount rather than a false location-specific claim.

Compensation is modeled as editable negotiated assumptions. The public copy and PDF must not describe a percentage as standard, required, fixed by law, or universally customary.

## Calculation Contract

All money uses integer cents. Percentage rates use decimal numbers and are multiplied only against integer-cent sale prices. Round each calculated row once to the nearest cent before summing it.

```text
selling expenses = sum(active selling-expense rows)

net before obligations = sale price - selling expenses

total obligations = first mortgage payoff
                  + second mortgage / HELOC payoff
                  + other liens
                  + property-tax proration
                  + active optional obligation rows

projected net = sale price - selling expenses - total obligations
```

For each `scenarioSalePrice` in low, selected, and high:

```text
scenario net = scenarioSalePrice
             - percent costs calculated from scenarioSalePrice
             - statutory costs calculated from scenarioSalePrice
             - fixed costs
             - obligations
```

The same rates, fixed values, expected closing date, and obligations apply to all three scenarios. Low/high do not add a separate uncertainty multiplier to costs. Only the sale price changes.

If the result is negative, show `Projected shortfall` with the absolute amount. Do not display a negative number as proceeds.

### Statutory Example

The controlled San Diego County fixture uses the official documentary transfer-tax structure of `$0.55` per `$500` or fraction of taxable consideration:

```js
Math.ceil(taxableCents / 50000) * 55
```

The registry must retain the jurisdiction, taxable-base rule, as-of date, and official source URL. The calculator consumes the registry rule; rendering code must not contain a hard-coded tax rate.

## Editing Contract

- Every visible amount has a subtle `Edit` action.
- Only one row is in edit mode at a time.
- Fixed and customer-entered rows use currency inputs.
- Percentage rows use a percentage input and show the recalculated dollar amount live.
- Statutory rows use a currency override input; applying it changes that row to a local fixed override until reset.
- Property-tax proration exposes the expected closing date and annual tax basis used by the fixture; both remain editable.
- Sale-price Edit reopens the bounded low-to-high slider, never a freeform currency field.
- Apply commits the edit; Cancel restores the prior value.
- Enter applies and Escape cancels.
- `Reset assumptions` restores registry-derived rows, removes optional rows and overrides, and preserves the selected address, selected property value, expected closing date, and confirmed obligations.
- Moving the sale-price slider recalculates all percentage and statutory rows immediately.

## PDF Contract

After unlock, `Download net sheet` creates a real PDF in the browser and downloads it directly.

The PDF includes:

- Snap Mortgage wordmark treatment and Snap-blue rule.
- `Seller Net Sheet` title.
- Property address.
- Generated date and expected closing date.
- Low, selected, and high property values.
- Grouped selling-expense and obligation rows.
- Totals and dominant projected net proceeds or shortfall.
- Low/high final proceeds comparison.
- Concise bottom disclaimer.

The PDF uses the same normalized unlocked calculation model as the webpage. It must not duplicate calculation logic. Generate bytes only after unlock, create a temporary object URL, click a download link, and revoke the URL.

Filename:

```text
snap-seller-net-sheet-<normalized-address-slug>.pdf
```

The print layout must fit on US Letter pages with readable type, no clipped rows, and repeated brand/header context when a second page is required.

## Disclaimer

Show one concise disclaimer at the bottom of the unlocked web net sheet and the PDF:

> This seller net sheet is a planning estimate based on the property value, obligations, closing date, and editable cost assumptions shown. Actual charges, payoff amounts, taxes, credits, compensation, and proceeds can change through closing. Compensation is negotiable and is not set by law.

Do not repeat disclaimer-style copy beside each row.

## Privacy And Data Boundary

- Keep address, values, obligations, dates, costs, overrides, and unlock state in page memory only.
- Do not place them in URLs, generated HTML, localStorage, sessionStorage, cookies, or analytics payloads.
- Do not embed real cost/proceeds values in the locked DOM.
- Clear selected file references after extraction, cancellation, completion, or page unload.
- Analytics may record stage names and completion states only.
- PDF generation occurs locally in the browser after unlock.
- Refresh returns the page to its public entry state.
- Lead-sale storage and real account handoff are future integration work and are not implemented here.

## SEO And Public Content

The account gate must not reduce crawlable seller education. Static `/sell` output continues to explain:

- How property-value ranges should be used.
- Why payoff can differ from a displayed loan balance.
- Which selling-cost categories affect proceeds.
- How offer terms, credits, contingencies, and timing affect a sale.
- What a seller should confirm before closing.

Generated HTML may name net-sheet categories but must not include user-specific financial figures. Existing title, description, canonical, source, updated-date, internal-link, FAQ, and tag systems remain intact.

## Accessibility

- Use a native range input with visible low/high endpoints and a live selected-value output.
- Support Arrow keys, Page Up/Down, Home, and End through native range behavior.
- Associate each field with a visible label and inline error.
- Keep dialog focus trapping, Escape behavior, and focus restoration.
- Move focus to the locked-summary heading after obligations are submitted.
- Announce unlock and recalculation through polite live regions.
- Use semantic locked content; do not depend on blur, color, or `aria-hidden` over real values.
- Touch targets are at least 44 pixels high.
- Maintain visible focus and no horizontal overflow at 320 pixels and wider.
- The web net sheet uses semantic headings and row groups; the PDF follows the same reading order.

## Responsive Behavior

### Desktop

- Entry and modal retain the approved Decision Flow hierarchy.
- Locked summary pairs visible property value with a clearly integrated account panel.
- Unlocked analysis places the selected-value summary beside the grouped net sheet when space permits.
- Optional-cost selector and edit controls remain attached to their owning section.

### Mobile

- Slider, endpoints, and selected value fit without horizontal scrolling.
- Locked account panel follows the visible value summary.
- Net-sheet rows stack label, amount, and Edit controls without clipping.
- Low/high comparison remains compact beneath the dominant selected result.
- Download CTA spans the available width.
- Only the existing combined mobile navigation/account menu is present.

## Error States

- Address not selected: preserve the query and request a suggestion selection.
- No property/valuation: preserve the query and ask the homeowner to try another address.
- Invalid range: stop the flow and show a value-service error; do not create a manual-value escape hatch.
- Statement reader unavailable: preserve direct first-mortgage entry.
- Invalid obligation: preserve all fields and focus the first invalid amount.
- Invalid close date: require a real date before continuing.
- Account callback rejection: keep the analysis locked, preserve the property inputs, and allow retry.
- PDF generation failure: keep the unlocked analysis visible and offer the download action again.
- Negative projected net: show projected shortfall.

## Research And Source Ledger

The cost registry and methodology section retain these primary sources:

- San Diego County Recorder, documentary transfer tax: https://www.sdarcc.gov/content/arcc/home/divisions/recorder-clerk/recording.html
- CFPB Regulation Z, Closing Disclosure seller/payoff structure: https://www.consumerfinance.gov/rules-policy/regulations/1026/38/
- CFPB mortgage payoff statements: https://www.consumerfinance.gov/rules-policy/regulations/1026/2020-12-28/36/
- California Board of Equalization, contractual property-tax proration: https://www.boe.ca.gov/lawguides/property/current/ptlg/annt/170-0087.html
- National Association of Realtors, compensation is negotiable and not set by law: https://www.nar.realtor/the-facts/what-the-nar-settlement-means-for-home-buyers-and-sellers

Provider-priced title, escrow, settlement, inspection, warranty, repair, attorney, and similar rows remain editable configured assumptions until a real provider or transaction integration supplies them.

## Acceptance Criteria

1. The homeowner can select a supported address and receive a low/base/high valuation.
2. Value selection uses a `$1,000`-step slider bounded by low and high; no freeform value input exists.
3. Missing valuation asks for another address rather than manual value entry.
4. First mortgage, second mortgage/HELOC, other liens, and expected closing date are collected before the account gate.
5. The selected property value remains visible before account continuation.
6. No selling-cost or proceeds value exists in the locked DOM.
7. Logged-in users see `Open My Account`; logged-out users see `Create My Account`.
8. One account click opens the existing handoff modal and unlocks the analysis after callback completion.
9. The unlocked net sheet contains all required expense, obligation, total, and projected-net sections.
10. Optional rows are hidden until `Add another cost` is used.
11. Every visible figure is editable through the correct field type.
12. Percentage and statutory rows recalculate when the selected property value changes.
13. Low/high are shown as final comparison figures only and use the same rules as the selected scenario.
14. The bottom disclaimer appears once on the web net sheet and once in the PDF.
15. `Download net sheet` produces a readable Snap-branded PDF from the unlocked model.
16. Seller inputs remain in page memory and out of storage, URLs, analytics, and generated HTML.
17. Crawlable seller education, metadata, sources, tags, and internal links remain available without completing the tool.
18. Existing route, accessibility, static-smoke, and mobile-overflow checks pass.

## Future Integration Candidates

- Production address/property resolution and valuation service.
- Jurisdiction-complete tax and transfer-cost data.
- Provider-priced title, escrow, settlement, inspection, warranty, and legal costs.
- Secure statement upload and document extraction.
- Authenticated Snap Homes property, estimate, and expected-close-date handoff.
- Saved seller scenarios and account history.
- Lead-sale storage and routing.
- Current payoff requests and transaction-document comparison.

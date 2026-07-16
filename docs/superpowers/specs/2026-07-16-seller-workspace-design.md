# Seller Workspace And Estimated Proceeds Tool

**Date:** July 16, 2026

**Status:** Approved for implementation

**Surface:** Public `/sell` page

**Design language:** Snap Mortgage Decision Flow

**Figma file:** [Snap Mortgage - Component System & Core Templates](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8)

## Objective

Create a borrower-facing seller intelligence page that helps a homeowner understand a potential sale before choosing a next step. The page begins as crawlable seller education with a prominent address CTA. The CTA opens a guided modal that collects the property address, confirms an estimated value, and accepts a mortgage payoff through manual entry or a mortgage-statement selection. Completing the flow transforms the top of the page into an editable estimated-proceeds workspace.

The experience must remain useful without an account. After the result appears, the page offers a clear path to create or access a Snap Homes account so the homeowner can continue with the property and estimate in the existing Snap ecosystem.

## Approved Decisions

- Use `/sell` as the canonical route, parallel to `/buy` and `/refinance`.
- Make the address action the primary hero CTA.
- Open address entry in a modal rather than placing a large form directly in the hero.
- Keep the initial public page crawlable and useful before the tool is opened.
- Use one progressive modal flow: address, estimated value, mortgage payoff, then results.
- Transform the page into the approved proceeds workspace after the modal is completed.
- Show a low, base, and high estimated-proceeds range.
- Make the base estimate substantially larger and bolder than the low and high estimates.
- Present a pro forma-style estimated proceeds statement.
- Put a small `Edit` link beside every editable figure. Selecting it changes only that figure into an inline input.
- Include Apply and Cancel behavior for inline edits.
- Include a `Reset assumptions` action.
- Let the homeowner upload/select a mortgage statement or enter the payoff manually.
- Treat any document-extracted payoff as a suggestion that the homeowner must confirm or correct.
- Do not display or retain the selected statement in the public result.
- Use address-aware state assumptions when available and a controlled national fallback otherwise.
- Keep the complete result visible without requiring account creation.
- After results, offer `Save this home and estimate in Snap Homes`, with account creation and login actions using the existing account modal.
- Keep seller education, FAQs, sources, and tags beneath the tool.
- Use the existing combined mobile account/navigation menu direction.

## Figma Source

- [Desktop entry page](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=143-2)
- [Desktop address modal](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=145-96)
- [Mobile entry page](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=143-3)
- [Mobile address modal](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=146-77)
- [Desktop transformed results page](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=135-3)
- [Mobile transformed results page](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=135-4)
- [Four-step tool-state reference](https://www.figma.com/design/0ISr9MuEIGMXIA1zgD9kL8?node-id=135-5)

The frontend should match the information hierarchy and responsive behavior in these frames while using the repository's shared header, modal, button, input, card, CTA, chart, FAQ, source, and footer patterns.

## Scope

### In Scope

- New canonical `/sell` public route.
- SEO metadata, static route generation, sitemap ownership, and route smoke coverage.
- Seller-focused entry hero and borrower-ready educational content.
- Address CTA and progressive modal.
- Address suggestion UI backed by an adapter.
- Estimated value low/base/high confirmation state.
- Mortgage statement file-selection UI.
- Manual mortgage payoff entry.
- Editable payoff confirmation.
- Client-side proceeds calculation.
- Low/base/high proceeds results.
- Editable pro forma cost rows.
- Sale-price allocation visualization.
- State-aware mock cost assumptions with a national fallback.
- Snap Homes account/login continuation using the existing modal pattern.
- Seller preparation, valuation, payoff, selling-cost, offer-comparison, closing, FAQ, source, and tag content.
- Homepage `I want to sell my home` link to `/sell`.
- Desktop and mobile responsive behavior.
- Automated route, calculation, interaction, accessibility, and overflow tests.

### Out Of Scope

- A live automated valuation model integration.
- Live property-record retrieval.
- A production address-autocomplete provider.
- Real document upload, storage, OCR, or AI extraction.
- Backend persistence of the address, statement, payoff, or estimate.
- Real Snap Homes account creation or authentication inside this repository.
- CRM or opportunity routing.
- Listing creation, agent matching, comparative market analysis, or brokerage services.
- A binding appraisal, payoff statement, settlement statement, or guaranteed proceeds amount.

## Page States

### 1. Entry State

The initial `/sell` page contains:

- Shared four-link public header.
- Seller-focused eyebrow, headline, and supporting copy.
- Primary CTA: `Estimate my sale proceeds`.
- Short note that an account is not required to see the estimate.
- A compact three-step outcome preview: confirm value, add payoff, see proceeds.
- Crawlable `How it works` content.
- Crawlable seller guidance cards.
- A second address CTA near the end of the page.
- Shared footer, methodology links, sources, and tags.

The initial hero contains no financial fields. Both address CTAs open the same guided modal.

### 2. Modal State

The modal is one accessible dialog with three progressive steps. Moving forward changes the modal content without closing it. Back returns to the prior step without losing entered values. Closing returns focus to the CTA that opened the modal.

#### Step 1: Address

- Field: `Home address`.
- Address suggestion list appears as the homeowner types.
- A selected suggestion supplies a normalized display address, state, and property identifier when available.
- Primary action: `Find my home`.
- Invalid or unresolved addresses receive an inline correction message while preserving the typed value.

For the frontend-only build, the address adapter returns controlled canonical fixtures. The interface must allow the adapter to be replaced without changing modal rendering or calculation logic.

#### Step 2: Confirm Value

- Show estimated home value with low, base, and high figures.
- Make the base value the dominant number.
- Actions: `Use this estimate` and `Enter my own value`.
- `Edit value` replaces the base value with a numeric input.
- The homeowner must confirm the value before continuing.

The value adapter returns all three values. A manual base-value edit preserves the adapter's documented range relationship for the current session. The implementation must keep that relationship in fixture/config data rather than burying an unexplained percentage in rendering code.

#### Step 3: Mortgage Payoff

- Offer `Upload mortgage statement` and manual payoff entry.
- The file control accepts the document formats supported by the future reader contract.
- Selecting a file in the frontend-only build invokes a mock extraction adapter and returns an editable suggested payoff amount.
- Show the selected filename only while the modal is open.
- Do not render document contents.
- Require the homeowner to confirm or correct the suggested amount.
- Primary action: `Calculate proceeds`.

If statement reading is unavailable or fails, manual payoff entry remains fully usable. The entered amount is never silently replaced.

### 3. Transformed Results State

After `Calculate proceeds`:

1. Close the modal.
2. Replace the entry hero and outcome preview with the approved proceeds workspace.
3. Keep the seller guidance, FAQs, sources, and tags available below.
4. Move keyboard focus to the results heading.
5. Announce the completed calculation through a polite live region.

The result state includes:

- Confirmed property address with an `Edit address` action.
- Low, base, and high estimated proceeds.
- Pro forma estimated proceeds statement.
- Sale-price allocation visualization.
- `Reset assumptions`.
- Snap Homes account continuation.
- Seller preparation and guidance content.

Use a restrained fade/vertical transition. Respect `prefers-reduced-motion` by changing states without movement.

## Pro Forma Contract

The default statement contains these rows in this order:

1. Estimated sale price.
2. Mortgage payoff.
3. Agent compensation.
4. Title, escrow, and transfer costs.
5. Repairs and seller concessions.
6. Other seller costs.
7. Estimated proceeds.

The calculation is:

```text
estimated proceeds = estimated sale price
                   - mortgage payoff
                   - agent compensation
                   - title, escrow, and transfer costs
                   - repairs and seller concessions
                   - other seller costs
```

The low, base, and high result paths use their corresponding value inputs. Configured percentage-based assumptions calculate from the applicable value before display. When a homeowner replaces a displayed cost with a fixed amount, that fixed override applies to all three paths until reset.

The calculator must use integer cents internally and round only for display. It must not derive subsequent calculations from formatted strings.

If deductions exceed the estimated sale price, show an estimated shortfall rather than presenting a negative amount as proceeds.

## Inline Editing

- `Edit` appears as a subtle text link beside each editable amount.
- Selecting `Edit` swaps that row's amount for one focused currency input.
- Show Apply and Cancel next to the input.
- Enter applies the value; Escape cancels and restores the prior amount.
- Applying a value recalculates all result figures and the allocation visualization immediately.
- Invalid values preserve the input and show an inline correction message.
- Only one row may be in edit mode at a time.
- `Reset assumptions` restores the address-aware defaults and clears every homeowner override except the confirmed mortgage payoff and confirmed home value.

## Assumption Registry

Create a controlled seller-cost fixture/registry with:

- State code.
- Effective/as-of date.
- Source or methodology reference.
- Agent compensation starting assumption.
- Title/escrow starting assumption.
- Transfer-cost starting assumption.
- Repairs/concessions starting assumption.
- Other seller-cost starting assumption.
- National fallback values.

The UI must not describe these values as required, fixed, customary, guaranteed, or universally standard. They are editable starting assumptions selected from the entered address when available.

Keep the registry separate from rendering and calculation code so a later market-data integration can replace it.

## Adapter Boundaries

Use narrow frontend interfaces for integrations:

### Address Adapter

Input: typed address query.

Output: suggestions with display address, state code, and stable fixture/property ID.

### Valuation Adapter

Input: normalized address/property ID.

Output: low, base, high, as-of date, source label, and confidence/methodology key.

### Statement Reader Adapter

Input: locally selected file reference.

Output: suggested payoff, statement date when available, source field label, and extraction status.

The current implementation uses mock adapters and canonical fixtures. Page components consume adapter results and do not know whether the provider is mocked or live.

## Data And Privacy Behavior

- Keep address, payoff, file reference, and calculation values in page memory only.
- Do not place the address or financial values in the URL.
- Do not write them to localStorage, sessionStorage, cookies, analytics payloads, or generated HTML.
- Clear the selected file reference after modal completion, cancellation, or page unload.
- Refreshing `/sell` returns to the public entry state.
- Snap Homes continuation opens the existing account/login modal. This build does not transmit the seller data to Snap Homes.
- Analytics events may record the interaction stage and completion state, but not the address, filename, value, payoff, or proceeds amounts.

## Snap Homes Continuation

The result CTA reads `Save this home and estimate in Snap Homes`.

- Logged-out visitors receive `Create account` and `Log in` actions through the existing account modal.
- Logged-in visitors receive `Open My Account` through the existing account confirmation behavior.
- The public site does not recreate the Snap Homes portal.
- The current build does not persist or hand off property/financial values.
- The future integration point should accept the normalized property ID and confirmed scenario only after an authenticated handoff is implemented elsewhere.

## Content And SEO

Core seller education must remain visible and crawlable without completing the modal. The page should cover:

- How online value estimates should be used.
- Why mortgage payoff can differ from a displayed loan balance.
- Selling-cost categories that can change expected proceeds.
- Preparing a home for sale.
- Comparing offers by financing, contingencies, credits, timing, and expected proceeds.
- Closing and final payoff preparation.
- Frequently asked seller questions.

The canonical title, description, H1, structured headings, internal links, sources, updated date, and tags must be generated through existing site systems. Add controlled tags for home values, selling costs, mortgage payoff, home equity, seller preparation, and offer comparison where the registry supports them.

The homepage `I want to sell my home` action links to `/sell`. Related seller content should link back to `/sell`, relevant calculators, home-equity guidance, rates, Learning Center content, and loan-officer profiles when useful.

## Navigation Integration

The approved public header remains limited to:

1. Rates.
2. Learning.
3. Loan Options.
4. Compare Your Offer.

`Compare Your Offer` opens the existing offer-comparison modal. `/sell` is reached through the homepage goal selector, seller content, internal links, and search rather than adding a fifth header item.

On mobile, public navigation and account actions use one combined hamburger/account menu. The seller page must not introduce a second mobile menu.

## Accessibility

- Use a real dialog with `aria-modal`, labelled title, and descriptive copy.
- Trap focus while the modal is open.
- Escape closes the modal unless an inline edit is active, in which case it cancels the edit first.
- Restore focus to the opening CTA.
- Make address suggestions keyboard navigable with combobox/listbox semantics.
- Associate every field with a visible label and inline error.
- Announce step changes, extraction status, and completed recalculations appropriately.
- Keep all touch targets at least 44 pixels high.
- Do not rely on color alone for the low/base/high hierarchy or chart legend.
- Provide a textual equivalent for the allocation visualization.
- Maintain visible focus and no horizontal overflow at 320 pixels and wider.

## Error And Empty States

- Address not found: preserve the typed address and offer correction/manual retry.
- No valuation fixture: allow manual home-value entry.
- Statement reader unavailable: keep manual payoff fully available.
- Unsupported file: identify accepted formats without clearing other modal values.
- Invalid or zero payoff: preserve entry and explain the required correction.
- Calculation shortfall: show `Estimated shortfall` and the amount needed rather than negative proceeds.
- Missing state assumptions: use the national fallback and retain its methodology/as-of record.
- Adapter failure must never remove the crawlable seller content or prevent manual completion.

## Responsive Behavior

### Desktop

- Entry hero uses a two-column layout: CTA copy and concise outcome preview.
- Results place the large proceeds summary beside the pro forma.
- Selling-step and guidance cards may use multi-column rows.
- Modal width is approximately 620 pixels and remains within the viewport.

### Mobile

- Hero CTA spans the content width.
- Outcome preview stacks below hero copy.
- Modal uses the available viewport width with safe side margins.
- Results stack proceeds summary, pro forma, visualization, and Snap Homes CTA.
- Every pro forma label and value remains readable without horizontal scrolling.
- Only the combined mobile hamburger/account control appears in the header.

## Testing Requirements

### Unit Tests

- Low/base/high proceeds calculations.
- Percentage assumptions and fixed homeowner overrides.
- Integer-cent rounding.
- Reset behavior.
- Shortfall behavior.
- State lookup with national fallback.
- Adapter result normalization.

### Integration Tests

- `/sell` appears in the canonical route manifest and sitemap.
- Both hero CTAs open the address modal.
- Modal progresses through all three steps.
- Back and close preserve or clear state as specified.
- Manual value and payoff paths work without adapters.
- Mock statement extraction remains editable.
- Completing the modal transforms the page.
- Inline Edit, Apply, Cancel, Enter, and Escape work.
- Snap Homes actions open the existing account modal.
- Homepage seller action routes to `/sell`.
- No private seller input enters analytics or browser storage.

### Browser QA

- Desktop and mobile screenshots match the approved Figma hierarchy.
- Keyboard-only modal and combobox flow.
- Focus restoration and result announcement.
- Reduced-motion behavior.
- No mobile overflow at 320, 390, and 430 pixels.
- No not-found links from seller content.
- Static route smoke passes with `/sell` included.

## Acceptance Criteria

1. `/sell` is a crawlable public seller page with production-ready seller content.
2. The hero clearly invites the homeowner to estimate sale proceeds.
3. The CTA opens an address modal on desktop and mobile.
4. The modal progresses through address, value confirmation, and mortgage payoff.
5. The flow supports statement selection and manual payoff entry.
6. Any extracted payoff is editable and requires confirmation.
7. Completing the flow transforms the page into the approved proceeds workspace.
8. Base proceeds are visually dominant, with low and high figures nearby.
9. The pro forma shows all approved deduction categories and estimated proceeds.
10. Every cost row supports focused inline editing and recalculation.
11. Address-aware assumptions use a controlled registry with a national fallback.
12. The complete result is available without an account.
13. Snap Homes continuation uses the existing account/login modal.
14. No real valuation, document storage, account, backend, or CRM behavior is implied by the implementation architecture.
15. Seller inputs remain in page memory and do not enter URLs, storage, generated pages, or analytics.
16. Existing static route, content, accessibility, and mobile-overflow checks pass.

## Future Integration Candidates

- Production address autocomplete and property resolution.
- Automated valuation model with source and confidence metadata.
- Secure mortgage-statement upload and document extraction.
- Authenticated Snap Homes property and scenario handoff.
- Saved seller estimates and assumption history.
- Current payoff-request integration.
- Property-specific tax, title, escrow, transfer, and selling-cost data.
- Offer comparison using real transaction documents.
- Listing, agent, and transaction workflows owned by the appropriate Snap ecosystem products.

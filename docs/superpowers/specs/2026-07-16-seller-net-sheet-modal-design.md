# Seller Net Sheet Modal And Account Reveal

**Date:** July 16, 2026

**Status:** Approved interaction design; implementation pending

**Surface:** Public `/sell` page

**Design language:** Snap Mortgage Decision Flow

**Supersedes:** The locked-summary placement, dialog-closing behavior, and unlocked-result placement in `2026-07-16-seller-net-sheet-account-gate-design.md`. All account, calculation, source, privacy, and PDF boundaries in that document remain in force unless this addendum explicitly changes them.

## Objective

Keep the seller workflow inside one continuous modal. After the homeowner confirms known obligations, advance the dialog into a digital seller net sheet instead of closing it. The sheet shows the confirmed property value and obligations, identifies the selling-cost and proceeds sections that are ready, and uses concealed placeholders for calculated amounts until the simulated Snap Homes account handoff completes.

The modal must feel like a useful digital statement rather than a marketing teaser. Its hierarchy follows a seller net sheet: property, sale estimate, selling expenses, existing obligations, totals, and projected proceeds.

## Approved Experience

1. Address selection, value selection, and obligation entry continue as the first three modal steps.
2. Second-mortgage/HELOC and other-lien inputs are optional. Blank values normalize to zero for calculation without displaying or requiring a typed `0`.
3. Confirming obligations keeps the modal open and advances to the locked net-sheet step.
4. The selected property value, low/high range, address, expected closing date, and homeowner-entered obligations remain readable.
5. Selling-expense labels, summary labels, and the document structure remain readable.
6. Calculated selling-cost amounts, totals, and proceeds are represented by inaccessible visual placeholders. Real calculated values are not rendered, serialized, or placed in the DOM while locked.
7. The account action is integrated into the projected-proceeds area rather than presented as a separate page section.
8. The action reads `Open My Account` for a logged-in session and `Create My Account` for a logged-out session.
9. Completing the existing frontend-only account handoff reveals the calculated figures in the same modal.
10. The unlocked modal provides the existing edit, reset, and PDF-download capabilities.
11. Closing the modal preserves the current seller-flow state in memory. Reopening returns to the locked or unlocked sheet rather than restarting the address flow.

## Modal State Model

The seller dialog supports five content states:

1. `address`
2. `value`
3. `obligations`
4. `locked-sheet`
5. `unlocked-sheet`

The first three states retain the current progressive-flow behavior. `locked-sheet` and `unlocked-sheet` use a wider statement layout and internal scrolling.

### Obligation Transition

The obligation transition accepts:

- A required first-mortgage payoff field. An explicit zero remains valid for a property owned free and clear.
- An optional second-mortgage or HELOC payoff field.
- An optional other-liens field.
- A valid expected closing date.

Blank optional fields become integer zero cents only at the normalization boundary. Invalid nonblank amounts still receive an inline correction message. When the transition succeeds:

- `phase` becomes `locked`.
- `dialogStep` becomes `locked-sheet`.
- `modalOpen` remains `true`.
- No net sheet is calculated for rendering.
- Focus moves to the locked sheet heading.

### Account Transition

The locked sheet uses the existing injected account callback. While the callback is pending, the account button is disabled and uses its existing pending label. A failed or unavailable handoff leaves the modal open, preserves all seller inputs, and places the existing retry message beside the account action.

When the callback resolves with `status: "completed"`:

- The existing seller calculator produces the net sheet.
- `phase` becomes `unlocked`.
- `dialogStep` becomes `unlocked-sheet`.
- `modalOpen` remains `true`.
- The same statement structure is redrawn with actual values.
- Focus moves to the projected-proceeds heading.

No real account, authentication, persistence, CRM routing, or Snap Homes portal is implemented in this repository.

## Digital Net Sheet Structure

### Document Header

The modal begins with:

- `Seller's estimate of net proceeds`
- Property address
- Expected closing date
- Selected property value
- Compact low/high value range

The selected value is the dominant figure. Low and high remain supporting context.

### Estimated Selling Expenses

Show the active required row labels from the controlled seller-cost registry in registry order. Optional rows remain absent until the analysis is unlocked and the homeowner selects them through the existing `Add another cost` control.

While locked, each active row has a visual concealed-value placeholder in the amount column. The placeholder does not contain a real amount or an assistive-text equivalent of a real amount.

### Existing Obligations

Show confirmed homeowner-entered values for:

- First mortgage payoff
- Second mortgage or HELOC payoff
- Other liens
- Expected closing date

These values are not gated because the homeowner supplied them. Blank optional obligations may display as `None entered` in the locked sheet instead of `$0`.

Address-aware obligation rows that require calculation, including property-tax proration, remain concealed until account completion.

### Summary And Proceeds

Show the following labels in statement order:

1. Total selling expenses
2. Net before obligations
3. Total obligations
4. Projected net proceeds or projected shortfall

All calculated values remain concealed while locked. The projected-proceeds row contains the primary account gate:

- Eyebrow: `Your seller analysis is ready`
- Heading: `Reveal your estimated costs and proceeds.`
- Supporting sentence: `Create or open your Snap Homes account to view the full breakdown and download your seller net sheet.`
- Primary action: `Create My Account` or `Open My Account`

The locked sheet may name the capabilities available after reveal, but it must not repeat a separate promotional benefit grid below the document.

### Unlocked Sheet

After account completion, the same sections reveal:

- Itemized selling expenses
- Existing obligations and calculated obligation rows
- Total selling expenses
- Net before obligations
- Total obligations
- Projected net proceeds or shortfall
- Compact low/high final proceeds comparison
- Existing inline edit actions
- Existing optional-row controls
- Existing reset action
- Existing PDF download action
- The single approved net-sheet disclaimer at the bottom of the document

The unlocked view does not navigate away from `/sell` or reproduce the Snap Homes portal.

## Concealed-Value Boundary

The visual effect may use blur, muted bars, or both, but the implementation must conceal placeholders rather than blur actual financial values.

While locked:

- Do not call the calculation solely to populate the locked view.
- Do not include calculated amounts in HTML attributes, text nodes, CSS custom properties, chart geometry, accessible names, or analytics payloads.
- Mark decorative placeholders `aria-hidden="true"`.
- Provide one concise accessible message for each concealed section: `Amounts available after account access.`
- Do not render charts whose geometry could disclose the calculation.

## Dialog Behavior

- The sheet modal uses a maximum desktop width of approximately 1040 to 1120 pixels.
- Its maximum height fits inside the viewport, with the statement body scrolling internally.
- The header and account action may remain visible within the scrolling sheet when that improves usability, but neither may cover statement rows.
- The close button remains available in every state.
- Escape closes the dialog and restores focus to the originating CTA or the control used to reopen the sheet.
- The focus trap includes all currently visible controls and excludes concealed placeholders.
- Back navigation remains available through the obligation step. The locked and unlocked sheets do not show a Back action that could silently discard the account/result state.
- Closing does not erase the address, selected value, obligations, date, account state, edits, or unlocked net sheet.
- The locked page state provides a concise `View my seller analysis` action that reopens `locked-sheet`; the unlocked page state provides `View my net sheet` and retains the existing download access.

## Responsive Behavior

### Desktop

- Use a two-column document header when space permits: value summary and property details.
- Statement rows use a flexible label column and a stable right-aligned amount column.
- The account gate spans the summary width and remains visually integrated with the projected-proceeds section.

### Mobile

- Use one column throughout the sheet.
- Keep row labels and amount placeholders on one line when they fit; otherwise place the amount beneath the label without horizontal scrolling.
- Keep all buttons at least 44 pixels high.
- Keep the account action full width.
- The modal uses at least 12 pixels of viewport clearance on each side.
- The sheet must not create document-level horizontal overflow at 320, 375, 390, or 430 pixel widths.

## Error And Recovery States

- Invalid nonblank optional obligations identify and focus the actual invalid field.
- Blank optional obligations do not produce an error.
- Account handoff failure preserves the locked sheet and presents the existing retry message beside the CTA.
- Missing seller-cost registry data blocks the account reveal without exposing partial or invented results.
- PDF failure preserves the unlocked sheet and exposes the existing retry message near the download control.
- Closing and reopening the modal after any recoverable error preserves valid entered data.

## Analytics Hooks

Retain the existing analytics callback and event boundary. Approved events are:

- `seller_flow_advanced` with `step: "locked-sheet"`
- `seller_account_handoff_started`
- `seller_analysis_unlocked` with `step: "account"`
- `seller_net_sheet_downloaded`
- Existing failure statuses without private seller values

Do not place address, payoff, lien, cost, or proceeds values in analytics payloads.

## Testing Contract

Automated coverage must verify:

1. Blank optional obligations normalize to zero and preserve blank display state.
2. Invalid nonblank optional obligations still fail and receive focus.
3. Confirming obligations leaves the dialog open on `locked-sheet`.
4. Locked HTML contains section and row labels but no calculated cost or proceeds amounts.
5. Locked placeholders are decorative and accessible section messages describe the gate.
6. The correct account label renders for logged-in and logged-out sessions.
7. Account success reveals the same modal as `unlocked-sheet` without requiring a second action.
8. Account failure preserves the locked modal and inputs.
9. Closing and reopening restores the correct sheet state.
10. Unlocked editing, reset, optional rows, and PDF download continue to work.
11. Keyboard focus, Escape, focus restoration, and focus trapping work in both sheet states.
12. Desktop and mobile screenshots show no overlap, clipped labels, or horizontal overflow.
13. Existing static route, content, state/city, and production-copy checks remain green.

## Acceptance Criteria

- The seller modal remains open after obligations are confirmed.
- The locked modal reads visually as a digital seller net sheet.
- Property value and homeowner-entered obligations remain visible.
- Selling expenses and proceeds are organized into statement sections with concealed values.
- No real calculated cost or proceeds amount exists in the locked DOM.
- The account CTA is integrated into the statement summary.
- Account completion reveals the actual net sheet in the same modal.
- Blank second-mortgage/HELOC and other-lien fields are accepted without requiring zero.
- Download remains available only after account completion.
- The experience remains keyboard accessible and responsive without mobile overflow.
- No real authentication, persistence, upload processing, CRM routing, or Snap Homes portal is introduced.

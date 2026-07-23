# Repo Split Completion

Date: 2026-07-22

## Repositories

- Public website: `Think-Whale/mortgage-website`
- Snap Homes: `Think-Whale/snap-homes`
- CRM/admin: `Think-Whale/mortgage-platform-admin`
- Planning/docs: `Think-Whale/mortgage-website-platform-plan`

## Verification

- Public website local smoke passed.
- Public website focused tests passed.
- Snap Homes boundary repo created and contains no mortgage public site or CRM/admin runtime.
- CRM/admin build passed.
- Planning cleanup branch contains no runtime app folders.

## Shared Asset Boundary

Shared ecosystem assets are tracked as platform assets, not just visual files. The split documents calculators, global contacts, locations, rate/pricing contracts, lead/opportunity handoffs, disclosure blocks, and brand/design assets in the repo-split plan and the runtime repo manifests.

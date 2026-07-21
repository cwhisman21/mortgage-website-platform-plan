# Hero Sourcing Playbook

Date: 2026-07-21

Status: Operator-ready companion to `docs/21-hero-image-system-spec.md`

Applies to: every in-scope hero asset, including stills, motion, posters, alternates, crops, and generated media

## Scope and publication gate

This playbook turns the hero image specification and the two hero schemas into one auditable acquisition workflow. It is an operating procedure, not legal advice. Escalate ambiguous ownership, publicity, privacy, trademark, property, or license questions to counsel; do not resolve ambiguity by publishing.

The following protected experiences must not be redesigned or replaced through this workflow:

- Homepage (`/`).
- Locations directory (`/locations`).
- Calculator directory (`/calculators`).
- Individual calculator pages (`/calculators/*`).
- Rates page (`/rates`).

The hard gate is simple: publication remains prohibited until the exact asset, exact intended mortgage-site use, releases, local truth, desktop and mobile crops, accessibility, and all required signoffs have passed. A provider-level license summary, search result, filename, upload tag, or government-domain URL is never enough by itself. Each individual asset needs verification at acquisition, even when the source usually offers commercially usable media.

Planning records stay honest:

```json
{
  "selection_status": "unselected",
  "rights_review_status": "not_started",
  "publishing_status": "prohibited"
}
```

Do not attach an asset ID, origin, source URL, license, acquisition date, selection tier, or approval to that planning slot. Those are acquisition facts, not aspirations.

## Roles and required signoffs

| Role | Owns | Required signoff |
| --- | --- | --- |
| Assigning editor | Route, page family, composition, message, protected-route check | Intake accepted |
| Local evidence researcher | Evidence brief, geography claims, local-signal count, ladder tier | Local truth verified |
| Image producer | Candidate search, source files, generation session, crop and export package | Production package complete |
| Rights reviewer | Asset-specific license, ownership trail, releases, trademarks, attribution, permitted use | Rights approved |
| Editorial/compliance reviewer | Documentary integrity, regulated claims, stereotyping, fair-housing and endorsement risk | Editorial/compliance approved |
| Accessibility and visual QA reviewer | Alt text, focal points, contrast, breakpoints, formats, motion fallback | Delivery approved |
| CMS publisher | State transitions, immutable evidence links, final route preview | Publish authorized |

The producer may research and prepare a rights record but may not provide the rights signoff for an external or generated asset they sourced. Every signoff records a user ID, display name, decision, timestamp, and notes. Approval by silence is not approval.

## The executable workflow

Run the steps in order for one asset and one route. A candidate rejected at any gate returns to candidate sourcing; a systemic or unresolved rights issue holds publication.

### 1. Open the job and protect excluded routes

Operator checklist:

- [ ] Record route, `page_type`, assigned `hero_variant`, headline, dek, CTA, target launch, and assigning editor.
- [ ] Compare the route against every protected experience above. Close the job if it is protected.
- [ ] Record whether the hero is meaningful or decorative. Meaningful media requires non-repetitive alt text; decorative media requires `alt_text: ""`.
- [ ] Confirm static media is the default. Record a written editorial reason before considering motion.
- [ ] Keep the CMS hero in `draft` with an unselected, publish-prohibited asset slot.

Exit: the assigning editor records the structured `intake_accepted_signoff` shown in the intake template. The record is incomplete without the editor's identity, explicit decision, timestamp, and notes.

### 2. Research the place or subject before searching for imagery

For city and state work, complete the local evidence brief from the template below using authoritative municipal, county, state, federal, university-extension, historic-preservation, parks, planning, climate, or geographic sources. Evidence URLs establish the visual brief; they do not grant rights to an image.

Operator checklist:

- [ ] Record the target geography and three to five resident-recognizable visual truths.
- [ ] Record at least two misleading stereotypes to avoid.
- [ ] Define the desired lived behavior and any material season or weather.
- [ ] Define one crop-safe focal subject.
- [ ] Cite at least one authoritative source for each material visual truth.
- [ ] For a city, require at least three local signals. For a state, require at least two and avoid representing the state as one narrow neighborhood type.
- [ ] Have the local evidence researcher sign “Local truth verified.”

### 3. Apply the asset-selection ladder

Search in this exact order and stop at the first acceptable tier. “Acceptable” means that local truth, resolution, rights, release, editorial, and crop gates can all pass—not merely that the image looks attractive.

1. **Exact geography** — an exact city or state asset with independently supported location and sufficient native resolution.
2. **Verified metro, county, or subregion** — a nearby asset whose visible cues truthfully represent the target. Record `selected_asset_geography` and a signed `locality_exception_approval`.
3. **Commissioned or generated locality-specific original** — a commissioned shoot or a generated original based on the approved local evidence brief. Generation is governed by Step 6.
4. **Approved non-photographic local data treatment or hold publication** — use the approved structured treatment with a signed fallback rationale, or publish no hero/page until a valid treatment exists.

For every unsuccessful tier, log search phrases, repositories checked, dates, rejection reasons, and operator. Never silently substitute a generic American suburb, skyline, landscape, office, or model.

### 4. Source and log candidates

Use the candidate log before downloading. Search official libraries, commissioned/internal archives, and reputable repositories. Do not scrape, bulk-download, or assume that a search engine preview carries the source license.

Operator checklist:

- [ ] Open the original individual asset page, not an aggregator, social post, search preview, or hotlink.
- [ ] Record candidate ID, direct page URL, creator/agency, displayed caption, claimed location, pixel dimensions, upload/publication date, and repository.
- [ ] Verify geography using two independent signals where practical: creator caption or agency catalog; embedded metadata; recognizably matching street, terrain, or architecture; or a second authoritative record.
- [ ] Inspect full resolution at 100 percent for artifacts, logos, signage, people, minors, artwork, private interiors, distinctive private property, and misleading details.
- [ ] Confirm native dimensions support the largest planned rendition and crop. Do not upscale.
- [ ] Record why each rejected candidate failed. Retain no downloaded file whose terms prohibit retention.

Exit: the producer nominates one candidate and identifies its ladder tier; nomination is not selection or approval.

### 5. Verify the exact asset, license, source, and releases

Perform this check on the day of acquisition against the individual asset page and the controlling full terms. Store a timestamped PDF, screenshot, web archive, or signed license receipt in the rights case file, plus a checksum for the acquired original. A pasted provider summary alone does not pass.

Operator checklist:

- [ ] Confirm the source is the rights holder, authorized licensor, or traceable agency repository; follow reposts back to the original.
- [ ] Record `asset_id`, `asset_origin`, `source_url`, `creator_or_agency`, exact `license_name`, direct `license_url`, `acquired_at`, `attribution_text`, `usage_notes`, `release_status`, and `reverify_at` when time-limited or uncertain.
- [ ] State the intended use: commercial mortgage website hero; routes; responsive crops; text overlay; color/compression edits; CDN delivery; and any advertising reuse.
- [ ] Confirm that commercial use, modification, cropping, web distribution, and the planned geography are allowed. Record attribution, link, change notice, ShareAlike, or other conditions exactly.
- [ ] Distinguish the asset’s actual license product and account entitlement, such as free collection versus paid collection. Store the purchase receipt or subscription entitlement when relevant.
- [ ] Verify every recognizable person’s model/publicity status for this use, including parent/guardian authority for a minor. “No recognizable person” is a documented result, not an assumption.
- [ ] Verify property permission when a private location, protected artwork/architecture, interior, ticketed place, distinctive home, trademark, or logo may require it.
- [ ] Check that the use does not imply that a depicted person, business, government body, or brand endorses Snap Mortgage or qualifies for a mortgage product.
- [ ] Check caption and context for sensitive-use restrictions. Mortgage borrowing and financial circumstances must never be attributed to a depicted person without an applicable release and truthful context.
- [ ] Save the original filename, checksum, dimensions, source evidence, release evidence, terms snapshot, rights decision, reviewer, and review timestamp together.
- [ ] If any required permission cannot be verified, set `release_status: "not_verified"`, reject the candidate, and keep publishing prohibited.

Only after the record is complete may the candidate become a selected asset reference. External stock and commissioned assets require `source_url` and a complete `rights_record`; internal assets still require an ownership and release trail in the case file.

### 6. Use generation only as a controlled third-tier fallback

Generation begins only after the exact-geography and verified-subregion searches are logged as unsuccessful and the approved local evidence brief is attached. A generated image is an illustration, not evidence that a depicted street, home, person, event, or condition exists.

Documentary prohibitions:

- Generated assets must not invent identifiable landmarks, business signage, public events, disasters, or documentary claims.
- Generated media must not be presented as documentary photography, a real branch, a listed property, a verified neighborhood condition, or an image of an actual resident.
- The producer must not generate an actual loan officer, employee, customer, public figure, or other identifiable real person. A loan officer hero requires the actual approved portrait.
- Do not prompt for logos, branded products, protected artwork, recognizable private property, exact addresses, rate displays, approval notices, keys-as-certainty, wealth promises, or disaster damage.
- Do not imply approval, eligibility, savings, rate availability, protected-class targeting, or a borrower outcome.
- Do not use a third-party reference image unless its license and the generation provider’s terms permit that input and derivative use.

Generation checklist:

- [ ] Copy the approved visual truths, stereotypes to avoid, lived behavior, weather, focal subject, and crop plan into the prompt brief.
- [ ] Capture the complete `generation_prompt`, negative instructions, `generation_model` provider/name/version, generation date/time, account/license terms URL and snapshot, seed or job ID if available, and every input asset with its rights record.
- [ ] Preserve the original output, checksum, output ID, iteration history, and a list of retouching or compositing changes.
- [ ] Record `generation_reviewer` as a user reference distinct from the producer.
- [ ] Review at 100 percent for invented text, malformed architecture, implausible infrastructure, duplicated people, anatomy errors, stereotypes, and cues inconsistent with the evidence brief.
- [ ] Label the asset as generated in the CMS and in the internal provenance record. Use alt text or a visible editorial label when needed to prevent a reasonable user from reading it as documentary evidence.
- [ ] Run the same editorial, compliance, accessibility, crop, and rights reviews as photography.

The current schema stores `generation_prompt` and `generation_reviewer` in `rights_record`. Until a dedicated schema property exists, store `generation_model`, terms snapshot location, job/seed ID, and output checksum in the immutable generation case file and summarize them in `usage_notes`; never omit them.

### 7. Produce and review crops and exports

Keep the highest-quality acquired or generated original unchanged in archival storage. Derivatives are reproducible outputs, not the master.

Crop and delivery checklist:

- [ ] Record original width, height, format, color profile, checksum, and archive location.
- [ ] Set and preview `focal_point_desktop` and `focal_point_mobile` as normalized x/y coordinates.
- [ ] Review desktop at 1440 px wide with a 560–720 px hero height, tablet at the implementation breakpoints, and mobile at 4:5 or the approved portrait-friendly ratio.
- [ ] Preserve the primary subject, required local signals, and separation from headline, dek, and CTAs. Text must not cover a face or essential cue.
- [ ] Verify meaningful alt text describes only visible, verifiable content and does not repeat the headline. Decorative imagery has empty alt text.
- [ ] Verify WCAG 2.2 AA text contrast at every crop and breakpoint using the chosen `contrast_mode`; use a local scrim or solid panel rather than globally crushing the image.
- [ ] Export responsive AVIF and WebP derivatives, plus a JPEG fallback when required by the implementation stack. Record exact pixel dimensions and compression settings.
- [ ] Do not upscale. If a source is smaller than the largest required derivative at its crop, reject it or reduce the design requirement through an approved design exception.
- [ ] Inspect each delivered derivative at actual rendered size and high-density display scale for banding, ringing, face damage, text-like artifacts, and lost local cues.
- [ ] Reserve intrinsic width/height or aspect ratio, provide viewport-appropriate `srcset`/`sizes`, and preload only the above-the-fold candidate for the active viewport.

Motion is an exception for a small number of flagship surfaces. When approved:

- [ ] Treat `motion_asset` and `poster_asset` as separate assets, each with its own source and rights evidence.
- [ ] Use muted, non-essential motion; do not rely on audio or a moving frame to communicate meaning.
- [ ] Supply a composition-matched static `poster_asset` that remains readable and truthful by itself.
- [ ] Set `reduced_motion_behavior: "show_poster"`; when `prefers-reduced-motion: reduce` is active, do not start animation and show the poster.
- [ ] Test poster display before load, on failure, on data-saving paths, and after motion is disabled. Motion may not delay the usable hero or destabilize layout.

Exit: after every required still, motion, poster, crop, export, checksum, and case-file item is complete, the image producer records the structured `production_package_complete_signoff` shown in the crop/export template. Accessibility and visual QA then signs “Delivery approved.”

### 8. Move the CMS record through review states

State transitions are one-way for approval, with explicit rejection returns:

1. `draft` — intake, evidence brief, unselected slot, candidates, and production work. Publication remains prohibited.
2. `editorial_review` — a complete nominated/selected record, local truth, subject relevance, composition, claims, alt text, and crops are reviewed. Rejection returns to `draft` with reasons.
3. `rights_review` — the rights reviewer checks the immutable acquisition case, exact intended use, license, releases, attribution, and restrictions. Rejection returns to `draft`; do not preserve a misleading “selected” claim when the asset has been rejected.
4. `approved` — only after all role signoffs pass. Set `reviewed_at` and `reviewed_by`; confirm selected asset references, required rights fields, poster/reduced-motion fields, and any locality or variant exception approvals are complete.
5. `retired` — remove an expired, superseded, disputed, inaccurate, or no-longer-released asset from new delivery while retaining the audit trail. Replacement starts in `draft`.

The publisher opens the final route preview at desktop, tablet, and mobile, compares the rendered asset ID and checksum to the approved record, confirms attribution placement when required, and signs “Publish authorized.” Never bypass a state by editing production delivery directly.

### 9. Monitor, reverify, and retire

- [ ] Reverify on `reverify_at`, before materially new use, when the source or license changes, when a takedown or rights complaint arrives, or when local evidence becomes inaccurate.
- [ ] Preserve the acquisition-time license snapshot; later source changes do not erase the evidence of what was granted, but they may still require counsel review.
- [ ] Immediately unpublish or replace an asset under credible dispute, expired permission, withdrawn release, mistaken identity/location, or misleading-context report.
- [ ] Record retirement reason, actor, time, affected routes/CDN objects, takedown confirmation, and replacement record.

## Source-specific rights notes

These notes were checked against official primary sources on 2026-07-21. They are routing guidance, not blanket clearance. Terms can change; each individual asset still needs verification at acquisition and against the intended use.

### Unsplash

The [Unsplash License](https://unsplash.com/license) currently describes broad free commercial and non-commercial use and modification, while prohibiting sale without significant modification and compilation into a competing service. That copyright license does not settle all depicted rights. Unsplash’s official [Releases and Trademarks guidance](https://help.unsplash.com/en/articles/2612329-releases-and-trademarks) says privacy, publicity, access, trademark, and depicted-property rights may require further approval and that Unsplash cannot guarantee the scope of permitted uses. Ask the contributor about releases when people, private property, logos, or protected work are recognizable, and record the answer. Unsplash+ has separate terms; the asset page and entitlement must identify which license applies.

### Pexels

The [Pexels License](https://www.pexels.com/license/) currently allows free use and modification and does not require attribution, but bars uses including unaltered resale, implied endorsement, stock-platform redistribution, and use as a trademark. The controlling [Pexels Terms of Service](https://www.pexels.com/terms-of-service/) distinguish Pexels License and marked CC0 content, identify sensitive and misleading uses, and state that third-party intellectual-property, property, privacy, or similar permissions may still be necessary and remain the user’s responsibility. Record the license shown on the individual page, releases, and the no-endorsement/context analysis.

### Wikimedia Commons

The official [Commons reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en) instructs reusers to inspect the individual file-description page for author, copyright status, and license conditions. Files can carry different licenses; attribution, license links, change notices, and ShareAlike obligations vary. Wikimedia provides no warranty that the uploaded copyright information is correct, and non-copyright restrictions such as personality, trademark, privacy, and moral rights may still apply. Verify the original source and rights chain for each file, not merely the Commons category or repository-wide eligibility policy.

### United States government media

Not all government media is public domain. [USAGov’s federal-material guidance](https://www.usa.gov/government-copyright) explains that not everything on a federal website is a U.S. government work: third-party material may be licensed to an agency; publicity, privacy, endorsement, trademark, logo, attribution, and international-use restrictions can remain; and the federal rule does not apply to state or local government works. [17 U.S.C. §§ 101 and 105](https://www.copyright.gov/title17/92chap1.html#105) concern works prepared by federal officers or employees as part of official duties, not every file hosted on a `.gov` domain.

The [National Archives permissions guidance](https://www.archives.gov/research/still-pictures/permissions) likewise says some holdings may contain copyrighted, contract-restricted, donated, or publicity-rights material and places clearance responsibility on the user. For a government candidate, inspect the item-level catalog restrictions and the source agency’s media/brand rules; record the creator’s official-duty basis or other license, third-party credits, use restrictions, and no-endorsement analysis. Never infer blanket public-domain status from a government host, archive, department, or domain.

## Operator templates

Copy these blocks into the asset case. Replace every instructional value with verified evidence before review; values shown in angle brackets describe the required evidence and are not CMS data.

### Intake and local evidence brief

```yaml
route: <exact public route>
page_type: <schema enum>
hero_variant: <assigned schema enum>
protected_route_check: passed
intake_accepted_signoff:
  role: assigning_editor
  identity: <user reference>
  decision: intake_accepted
  timestamp: <ISO 8601 timestamp>
  notes: <decision notes>
target_geography: <city, state, or subject>
geography_evidence:
  - <authoritative direct URL>
visual_truths:
  - <resident-recognizable truth with supporting source>
  - <resident-recognizable truth with supporting source>
  - <resident-recognizable truth with supporting source>
misleading_stereotypes_to_avoid:
  - <specific stereotype>
  - <specific stereotype>
desired_lived_behavior: <ordinary, locally plausible behavior>
required_season_or_weather: <condition or not material>
crop_safe_focal_subject: <one focal subject>
source_links:
  - <authoritative direct URL>
local_researcher_signoff: <user, decision, timestamp, notes>
```

### Candidate and ladder log

```yaml
candidate_id: <case-local ID>
ladder_tier: <exact_geography | verified_subregion | commissioned_or_generated | non_photographic_fallback>
repository: <source name>
individual_asset_page: <direct URL>
creator_or_agency_displayed: <name>
claimed_location: <captioned location>
independent_location_evidence:
  - <direct URL or catalog/metadata reference>
native_dimensions: <width x height>
people_property_marks_review: <findings>
crop_feasibility: <desktop/mobile findings>
status: <nominated | rejected>
rejection_reason: <completed when rejected>
operator: <user reference>
checked_at: <ISO 8601 timestamp>
```

### Selected asset and rights record

```yaml
selection_status: selected
asset_id: <immutable CMS asset ID>
asset_origin: <stock | commissioned | internal | generated>
source_url: <original individual asset URL when external>
rights_record:
  creator_or_agency: <verified rights holder or agency>
  license_name: <exact license/version or internal ownership basis>
  license_url: <direct controlling terms URL when applicable>
  acquired_at: <YYYY-MM-DD>
  attribution_text: <exact credit or empty only when verified unnecessary>
  usage_notes: <intended commercial use, modifications, restrictions, evidence locations>
  release_status: <not_applicable | verified | not_verified | required>
  reverify_at: <YYYY-MM-DD when time-limited or uncertain>
case_file:
  original_filename: <source filename>
  original_sha256: <checksum>
  source_snapshot: <immutable evidence location and timestamp>
  license_snapshot: <immutable evidence location and timestamp>
  receipt_or_entitlement: <evidence location or not applicable>
  model_release_evidence: <evidence location or not applicable with reason>
  property_release_evidence: <evidence location or not applicable with reason>
  trademark_endorsement_review: <result>
  intended_uses: <routes, crops, overlays, edits, delivery, promotions>
rights_signoff: <user, decision, timestamp, notes>
```

### Generated asset production record

```yaml
asset_origin: generated
generation_prompt: <complete final prompt>
negative_instructions: <complete prohibitions>
generation_model: <provider, product, version>
generation_terms_url: <direct controlling terms URL>
generation_terms_snapshot: <immutable evidence location and timestamp>
generated_at: <ISO 8601 timestamp>
job_or_seed_id: <provider job identifier when available>
input_assets: <asset IDs and rights records, or none>
original_output_sha256: <checksum>
iteration_history: <output IDs and selection reasons>
post_generation_edits: <complete edit list>
generation_reviewer: <user reference distinct from producer>
documentary_review: <pass/fail and notes>
local_truth_review: <pass/fail and notes>
```

### Crop, export, and signoff sheet

```yaml
focal_point_desktop: { x: <0..1>, y: <0..1> }
focal_point_mobile: { x: <0..1>, y: <0..1> }
desktop_preview: <evidence location>
tablet_preview: <evidence location>
mobile_preview: <evidence location>
contrast_mode: <left_scrim | right_scrim | bottom_scrim | solid_panel | none>
contrast_results: <measured result by breakpoint>
alt_text: <verified description or empty when decorative>
derivatives:
  - <AVIF dimensions, bytes, checksum>
  - <WebP dimensions, bytes, checksum>
  - <JPEG fallback dimensions, bytes, checksum when required>
upscale_check: passed
motion_asset: <asset ID or not used>
poster_asset: <asset ID or not used>
reduced_motion_behavior: <show_poster or not used>
production_package_complete_signoff:
  role: image_producer
  identity: <user reference>
  decision: production_package_complete
  timestamp: <ISO 8601 timestamp>
  notes: <decision notes>
editorial_compliance_signoff: <user, decision, timestamp, notes>
accessibility_visual_qa_signoff: <user, decision, timestamp, notes>
publisher_signoff: <user, decision, timestamp, notes>
```

## Rejection criteria

Reject the candidate, generated output, crop, or review package when any one of these is true:

- The route is protected or the composition changes a protected experience.
- The candidate skips a feasible earlier locality tier or its exact/subregion location is not supported.
- A city has fewer than three local signals; a state has fewer than two or collapses the state into one narrow stereotype.
- The image is a tourist postcard, landmark-only view, generic suburb/skyline/office, or misleading geographic substitute.
- The individual asset page, creator/agency, license, acquisition date, intended use, source snapshot, or required attribution is missing or contradictory.
- Model, property, publicity, privacy, trademark, artwork, logo, or endorsement risk is unresolved; `release_status` is `not_verified` or `required` without evidence.
- A government host is treated as blanket public-domain proof, or a state/local work is treated as a federal work.
- A generated output invents or implies documentary facts, shows a real-person likeness, contains unapproved inputs, or lacks prompt/model/terms/output/reviewer provenance.
- The image implies mortgage approval, rate, savings, eligibility, protected-class targeting, wealth, endorsement, or a borrower outcome.
- Native resolution cannot support the approved crop without upscaling.
- Desktop or mobile crop loses the focal subject/local cues, places text over a face, fails contrast, or creates unverifiable alt text.
- Motion lacks independent rights clearance, a truthful poster, `show_poster` behavior, or a successful reduced-motion/failure-path test.
- The case contains incomplete signoffs, mismatched asset IDs/checksums, expired permission, an unresolved complaint, or a direct-to-production bypass.

## Worked example: hypothetical city candidate

This training example is fictional. It does not identify or license a real image, remains unselected, and is non-publishable.

**Job:** `/locations/texas/austin`, city, full-bleed environmental portrait.

1. The researcher uses the approved Austin evidence brief to require limestone or regionally plausible home texture, oak/cedar vegetation, a daily walking/cycling behavior, and three total local signals. Tourist-only skyline and music-festival shorthand are excluded.
2. Exact-place search produces fictional Candidate A, captioned “Austin neighborhood ride,” at 4200 × 2800 pixels. The caption, creator statement, and matching municipal trail context support Austin as the claimed location. Its full-resolution crop keeps a cyclist, neighborhood housing, and vegetation at desktop and mobile.
3. The candidate is logged as tier `exact_geography`, but it is not selected. The fictional source page says “standard commercial license” without a versioned license URL and shows a recognizable child with no release evidence.
4. Rights review sets `release_status: "not_verified"` and rejects Candidate A. The record returns to `draft`; the CMS asset slot stays `selection_status: "unselected"`, `rights_review_status: "not_started"`, and `publishing_status: "prohibited"`.
5. The producer continues searching exact-place candidates. The operator does not downgrade silently to a generic Texas or metro image.

Result: the workflow correctly prefers local truth but refuses to convert attractive, plausible imagery into an invented rights claim. No URL, license, creator, acquisition date, or approval is written into the manifest because none was verified.

## Worked example: hypothetical generated fallback

This training example is also fictional. No output has been generated or selected, and the example is non-publishable.

**Job:** a future Orlando city hero using the approved local evidence brief.

1. The producer logs unsuccessful exact-Orlando and verified metro/county searches, including sources, phrases, dates, and rejection reasons. The assigning editor authorizes evaluation of tier `commissioned_or_generated` without approving an asset.
2. The fictional production record captures `generation_model: "Illustrative Image System 3.1 (fictional)"`, a fictional provider terms snapshot, a job ID, no input images, and this prompt:

   > Editorial illustration, not documentary photography: an ordinary resident walking a dog beside a shaded, lake-connected Orlando neighborhood street; regionally plausible bungalow and Mediterranean Revival details, mature subtropical canopy, warm humid filtered light; one crop-safe resident-scale focal action with home and lake cues surviving a 4:5 crop.

3. Negative instructions prohibit identifiable landmarks, theme-park elements, business signage, logos, exact addresses, public events, disasters, documentary claims, real people, branch imagery, mortgage approval cues, malformed architecture, and text.
4. The fictional output review finds a fabricated street sign and an impossible shoreline/road relationship. The producer rejects the output, preserves the prompt/output ID/checksum in the case file, and records the reason.
5. No asset reference is selected, no reviewer signs approval, and the CMS record remains `draft` with publication prohibited. The next action is another controlled iteration or the approved non-photographic local data treatment/hold-publication tier.

Result: generation does not manufacture evidence or create a publishable-looking placeholder. The audit preserves what happened while the public record remains truthful.

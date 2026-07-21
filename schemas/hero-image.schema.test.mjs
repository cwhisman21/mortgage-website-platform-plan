import assert from 'node:assert/strict';
import test from 'node:test';
import schema from './hero-image.schema.json' with { type: 'json' };

const variantByPageType = {
  city: 'full_bleed_environmental_portrait', state: 'full_bleed_environmental_portrait',
  buy: 'tall_diagonal_image_slab', refinance: 'wide_panoramic_band',
  home_equity: 'rotated_architectural_window', loan_product: 'circular_criteria_or_brand_field',
  learning_center: 'layered_editorial_collage', topic_hub: 'media_left_editorial_panel',
  article: 'evidence_or_report_strip', loan_officer: 'vertical_human_portrait',
  branch: 'wide_panoramic_band', company: 'circular_criteria_or_brand_field',
  search_directory: 'structured_search_or_planning_interface', prequalification: 'horizon_composition',
  seller_move_up: 'stacked_planning_panels',
};

function contractErrors(record) {
  const errors = [];
  for (const field of schema.required) if (record[field] === undefined) errors.push(`missing:${field}`);
  if (!record.decorative && !record.alt_text?.trim()) errors.push('alt_text:required');
  if (record.decorative && record.alt_text !== '') errors.push('alt_text:decorative-empty');
  const expected = variantByPageType[record.page_type];
  if (expected && record.hero_variant !== expected && !record.variant_exception) errors.push('hero_variant:mismatch');
  if (record.variant_exception && !['rationale', 'approved_at', 'approved_by'].every((field) => record.variant_exception[field])) errors.push('variant_exception:incomplete');
  if (record.has_motion && (!record.motion_asset || !record.poster_asset || record.reduced_motion_behavior !== 'show_poster')) errors.push('motion:fallback');
  if (['city', 'state'].includes(record.page_type)) {
    const brief = record.local_evidence_brief;
    if (!brief) errors.push('local_evidence_brief:required');
    else {
      if (!brief.asset_selection_status || !brief.geography_evidence?.length) errors.push('locality:audit');
      if (brief.asset_selection_status === 'selected' && (!brief.asset_selection_tier || !brief.selected_asset_geography)) errors.push('locality:selected-incomplete');
      if (brief.asset_selection_status === 'unselected' && (brief.asset_selection_tier || brief.selected_asset_geography)) errors.push('locality:unselected-has-selection');
      if (brief.asset_selection_tier === 'verified_subregion' && !brief.locality_exception_approval) errors.push('locality:exception');
      if (brief.asset_selection_tier === 'non_photographic_fallback' && !brief.non_photographic_fallback) errors.push('locality:fallback');
    }
  }
  for (const key of ['desktop_asset', 'mobile_asset', 'motion_asset', 'poster_asset']) {
    const asset = record[key];
    if (!asset) continue;
    if (asset.selection_status === 'unselected') {
      const allowed = ['selection_status', 'rights_review_status', 'publishing_status'];
      if (Object.keys(asset).some((field) => !allowed.includes(field))) errors.push(`${key}:unselected-has-acquisition`);
      continue;
    }
    if (asset.selection_status !== 'selected') errors.push(`${key}:selection-status`);
    if (['stock', 'commissioned'].includes(asset.asset_origin) && (!asset.source_url || !asset.rights_record?.license_url)) errors.push(`${key}:external-rights`);
    if (asset.asset_origin === 'generated' && (!asset.rights_record?.generation_prompt || !asset.rights_record?.generation_reviewer)) errors.push(`${key}:generated-provenance`);
  }
  if (record.review_status === 'approved' && (!record.reviewed_at || !record.reviewed_by)) errors.push('review:incomplete');
  return errors;
}

const rights = {
  creator_or_agency: 'Example creator', license_name: 'Commercial license',
  license_url: 'https://example.com/license', acquired_at: '2026-07-20', usage_notes: 'Web hero use permitted',
};
const internalAsset = { selection_status: 'selected', asset_id: 'asset-internal', asset_origin: 'internal' };
const base = {
  page_type: 'buy', hero_variant: 'tall_diagonal_image_slab', eyebrow: 'Buying a home',
  headline: 'Plan your next home purchase', dek: 'Compare practical paths with a local expert.',
  primary_cta: { cta_id: 'start' }, desktop_asset: internalAsset, decorative: false,
  alt_text: 'A buyer evaluates the exterior of a home', focal_point_desktop: { x: 0.5, y: 0.5 },
  focal_point_mobile: { x: 0.5, y: 0.4 }, contrast_mode: 'left_scrim', review_status: 'draft',
};

test('declares the approved enum contract', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id, 'https://snapmortgage.com/schemas/hero-image.schema.json');
  assert.equal(schema.title, 'HeroImageRecord');
  assert.deepEqual(schema.properties.contrast_mode.enum, ['left_scrim', 'right_scrim', 'bottom_scrim', 'solid_panel', 'none']);
  assert.deepEqual(schema.properties.review_status.enum, ['draft', 'editorial_review', 'rights_review', 'approved', 'retired']);
  assert.deepEqual(schema.$defs.selected_asset_reference.properties.asset_origin.enum, ['stock', 'commissioned', 'internal', 'generated']);
  assert.deepEqual(schema.properties.hero_variant.enum, [...new Set(Object.values(variantByPageType))]);
});

test('accepts a representative valid hero', () => assert.deepEqual(contractErrors(base), []));

test('asset origin determines external and generated provenance requirements', () => {
  const stock = { ...base, desktop_asset: { selection_status: 'selected', asset_id: 'stock', asset_origin: 'stock' } };
  assert.ok(contractErrors(stock).includes('desktop_asset:external-rights'));
  const generated = { ...base, desktop_asset: { selection_status: 'selected', asset_id: 'gen', asset_origin: 'generated', rights_record: rights } };
  assert.ok(contractErrors(generated).includes('desktop_asset:generated-provenance'));
  assert.equal('is_external' in schema.$defs.selected_asset_reference.properties, false);
  assert.ok(schema.$defs.selected_asset_reference.allOf.some((rule) => rule.if?.properties?.asset_origin));
});

test('city and state heroes carry auditable locality ladder evidence or fallback approval', () => {
  const city = { ...base, page_type: 'city', hero_variant: 'full_bleed_environmental_portrait' };
  assert.ok(contractErrors(city).includes('local_evidence_brief:required'));
  const subregion = { ...city, local_evidence_brief: { asset_selection_status: 'selected', asset_selection_tier: 'verified_subregion', selected_asset_geography: 'Travis County', geography_evidence: ['https://example.com/map'] } };
  assert.ok(contractErrors(subregion).includes('locality:exception'));
  const fallback = { ...city, local_evidence_brief: { asset_selection_status: 'selected', asset_selection_tier: 'non_photographic_fallback', selected_asset_geography: 'Austin, TX', geography_evidence: ['https://example.com/place'] } };
  assert.ok(contractErrors(fallback).includes('locality:fallback'));
  assert.ok(schema.$defs.local_evidence_brief.allOf.length >= 2);
});

test('page type enforces its composition unless an approval exception is complete', () => {
  const mismatch = { ...base, hero_variant: 'wide_panoramic_band' };
  assert.ok(contractErrors(mismatch).includes('hero_variant:mismatch'));
  const excepted = { ...mismatch, variant_exception: { rationale: 'Approved campaign hierarchy', approved_at: '2026-07-20T12:00:00Z', approved_by: { user_id: 'editor-1' } } };
  assert.equal(contractErrors(excepted).includes('hero_variant:mismatch'), false);
  assert.ok(schema.allOf.filter((rule) => rule.if?.properties?.page_type?.const).length >= Object.keys(variantByPageType).length);
});

test('motion requires its source, poster, and explicit reduced-motion poster behavior', () => {
  const invalid = { ...base, has_motion: true, poster_asset: internalAsset };
  assert.ok(contractErrors(invalid).includes('motion:fallback'));
  const valid = { ...invalid, motion_asset: { selection_status: 'selected', asset_id: 'motion', asset_origin: 'internal' }, reduced_motion_behavior: 'show_poster' };
  assert.equal(contractErrors(valid).includes('motion:fallback'), false);
  const rule = schema.allOf.find((entry) => entry.if?.properties?.has_motion);
  assert.deepEqual(rule.then.required, ['motion_asset', 'poster_asset', 'reduced_motion_behavior']);
});

test('decorative status controls alt text and eyebrow is required', () => {
  assert.ok(contractErrors({ ...base, alt_text: '' }).includes('alt_text:required'));
  assert.deepEqual(contractErrors({ ...base, decorative: true, alt_text: '' }), []);
  assert.ok(contractErrors({ ...base, eyebrow: undefined }).includes('missing:eyebrow'));
  assert.ok(schema.allOf.some((rule) => rule.if?.properties?.decorative));
});

test('approved records require review metadata', () => {
  assert.ok(contractErrors({ ...base, review_status: 'approved' }).includes('review:incomplete'));
  const rule = schema.allOf.find((entry) => entry.if?.properties?.review_status);
  assert.deepEqual(rule.then.required, ['reviewed_at', 'reviewed_by']);
});

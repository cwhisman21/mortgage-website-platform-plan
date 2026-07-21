import assert from 'node:assert/strict';
import test from 'node:test';
import schema from './hero-image.schema.json' with { type: 'json' };

test('declares approved enums and contract identity', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id, 'https://snapmortgage.com/schemas/hero-image.schema.json');
  assert.equal(schema.title, 'HeroImageRecord');
  assert.deepEqual(schema.properties.contrast_mode.enum, ['left_scrim', 'right_scrim', 'bottom_scrim', 'solid_panel', 'none']);
  assert.deepEqual(schema.properties.review_status.enum, ['draft', 'editorial_review', 'rights_review', 'approved', 'retired']);
  assert.deepEqual(schema.$defs.asset_reference.properties.asset_origin.enum, ['stock', 'commissioned', 'internal', 'generated']);
  assert.deepEqual(schema.properties.hero_variant.enum, [
    'full_bleed_environmental_portrait',
    'tall_diagonal_image_slab',
    'wide_panoramic_band',
    'rotated_architectural_window',
    'circular_criteria_or_brand_field',
    'layered_editorial_collage',
    'evidence_or_report_strip',
    'vertical_human_portrait',
    'structured_search_or_planning_interface',
    'media_left_editorial_panel',
    'horizon_composition',
    'stacked_planning_panels',
  ]);
});
test('requires a local evidence brief for city and state pages', () => {
  const rule = schema.allOf.find((entry) => entry.if?.properties?.page_type);
  assert.deepEqual(rule.if.properties.page_type.enum, ['city', 'state']);
  assert.deepEqual(rule.then.required, ['local_evidence_brief']);
});
test('requires a poster for motion and review metadata for approval', () => {
  const motion = schema.allOf.find((entry) => entry.if?.properties?.has_motion);
  const approved = schema.allOf.find((entry) => entry.if?.properties?.review_status);
  assert.deepEqual(motion.then.required, ['poster_asset']);
  assert.deepEqual(approved.then.required, ['reviewed_at', 'reviewed_by']);
});
test('requires individual source and license URLs for external assets', () => {
  const rule = schema.$defs.asset_reference.allOf[0];
  assert.equal(rule.if.properties.is_external.const, true);
  assert.deepEqual(rule.then.required, ['source_url', 'rights_record']);
  assert.deepEqual(rule.then.properties.rights_record.allOf[1].required, ['license_url']);
});

import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const collectionBySlug = (collections: CollectionConfig[], slug: string) => {
  const collection = collections.find((candidate) => candidate.slug === slug)
  expect(collection, `missing ${slug} collection`).toBeDefined()
  return collection as CollectionConfig
}

const fieldByName = (collection: CollectionConfig, name: string) => {
  const field = collection.fields.find((candidate): candidate is Field & { name: string } =>
    'name' in candidate && candidate.name === name,
  )
  expect(field, `missing ${collection.slug}.${name} field`).toBeDefined()
  return field as Field & { name: string }
}

describe('core mortgage collections', () => {
  it('registers the six first-class collections alongside users', async () => {
    const resolved = await config
    const slugs = resolved.collections?.map(({ slug }) => slug)
    expect(slugs).toEqual(expect.arrayContaining([
      'users', 'locations', 'products', 'loan-officers', 'branches', 'calculators', 'disclosures',
    ]))
  })

  it('defines the approved relationships and unique indexed identifiers', async () => {
    const resolved = await config
    const collections = resolved.collections ?? []
    const locations = collectionBySlug(collections, 'locations')
    expect(fieldByName(locations, 'parentLocation')).toMatchObject({ type: 'relationship', relationTo: 'locations' })

    for (const slug of ['loan-officers', 'branches']) {
      expect(fieldByName(collectionBySlug(collections, slug), 'locations')).toMatchObject({
        type: 'relationship', relationTo: 'locations', hasMany: true,
      })
    }

    for (const slug of ['locations', 'products', 'loan-officers', 'branches', 'calculators']) {
      expect(fieldByName(collectionBySlug(collections, slug), 'slug')).toMatchObject({
        type: 'text', unique: true, index: true,
      })
    }

    expect(fieldByName(collectionBySlug(collections, 'disclosures'), 'key')).toMatchObject({
      type: 'text', unique: true, index: true,
    })
  })
})

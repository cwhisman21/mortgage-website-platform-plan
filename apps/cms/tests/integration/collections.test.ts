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

const fieldNames = (collection: CollectionConfig) =>
  collection.fields.flatMap((field) => (
    'name' in field && !['createdAt', 'updatedAt'].includes(field.name) ? [field.name] : []
  ))

const optionValues = (field: Field) => {
  if (!('options' in field) || !Array.isArray(field.options)) return []
  return field.options.map((option) => typeof option === 'string' ? option : option.value)
}

const expectAdmin = (
  collection: CollectionConfig,
  defaultColumns: string[],
) => {
  expect(collection.admin).toMatchObject({ useAsTitle: 'name', defaultColumns })
}

const expectRequiredText = (collection: CollectionConfig, name: string) => {
  expect(fieldByName(collection, name)).toMatchObject({ type: 'text', required: true })
}

const expectIdentifier = (collection: CollectionConfig, name: string) => {
  expect(fieldByName(collection, name)).toMatchObject({
    type: 'text', required: true, unique: true, index: true,
  })
}

describe('core mortgage collections', () => {
  it('registers exactly the six supporting collections alongside users', async () => {
    const resolved = await config
    const slugs = resolved.collections
      ?.map(({ slug }) => slug)
      .filter((slug) => !slug.startsWith('payload-'))
    expect(slugs).toEqual([
      'users', 'locations', 'products', 'loan-officers', 'branches', 'calculators', 'disclosures',
    ])
  })

  it('defines the exact approved supporting collection schemas', async () => {
    const resolved = await config
    const collections = resolved.collections ?? []
    const locations = collectionBySlug(collections, 'locations')

    expect(fieldNames(locations)).toEqual(['name', 'slug', 'geographyType', 'stateCode', 'parentLocation'])
    expectAdmin(locations, ['name', 'geographyType', 'stateCode', 'slug'])
    expectRequiredText(locations, 'name')
    expectIdentifier(locations, 'slug')
    const geographyType = fieldByName(locations, 'geographyType')
    expect(geographyType).toMatchObject({ type: 'select', required: true })
    expect(optionValues(geographyType)).toEqual(['state', 'city'])
    expectRequiredText(locations, 'stateCode')
    expect(fieldByName(locations, 'stateCode')).not.toHaveProperty('index')
    expect(fieldByName(locations, 'parentLocation')).toMatchObject({
      type: 'relationship', relationTo: 'locations',
    })
    expect(fieldByName(locations, 'parentLocation')).not.toHaveProperty('required')

    const products = collectionBySlug(collections, 'products')
    expect(fieldNames(products)).toEqual(['name', 'slug', 'status'])
    expectAdmin(products, ['name', 'status', 'slug'])
    expectRequiredText(products, 'name')
    expectIdentifier(products, 'slug')
    const status = fieldByName(products, 'status')
    expect(status).toMatchObject({ type: 'select', required: true })
    expect(optionValues(status)).toEqual(['draft', 'active', 'archived'])
    expect(status).not.toHaveProperty('defaultValue')
    expect(status).not.toHaveProperty('index')

    for (const slug of ['loan-officers', 'branches']) {
      const collection = collectionBySlug(collections, slug)
      expect(fieldNames(collection)).toEqual(['name', 'slug', 'nmlsId', 'locations'])
      expectAdmin(collection, ['name', 'nmlsId', 'slug'])
      expectRequiredText(collection, 'name')
      expectIdentifier(collection, 'slug')
      expect(fieldByName(collection, 'nmlsId')).toMatchObject({ type: 'text' })
      expect(fieldByName(collection, 'nmlsId')).not.toHaveProperty('required')
      expect(fieldByName(collection, 'locations')).toMatchObject({
        type: 'relationship', relationTo: 'locations', hasMany: true,
      })
      expect(fieldByName(collection, 'locations')).not.toHaveProperty('required')
    }

    const calculators = collectionBySlug(collections, 'calculators')
    expect(fieldNames(calculators)).toEqual(['name', 'slug', 'route'])
    expectAdmin(calculators, ['name', 'route', 'slug'])
    expectRequiredText(calculators, 'name')
    expectIdentifier(calculators, 'slug')
    expectRequiredText(calculators, 'route')

    const disclosures = collectionBySlug(collections, 'disclosures')
    expect(fieldNames(disclosures)).toEqual(['name', 'key', 'body', 'jurisdiction'])
    expectAdmin(disclosures, ['name', 'key', 'jurisdiction'])
    expectRequiredText(disclosures, 'name')
    expectIdentifier(disclosures, 'key')
    expect(fieldByName(disclosures, 'body')).toMatchObject({ type: 'textarea', required: true })
    expect(fieldByName(disclosures, 'jurisdiction')).toMatchObject({ type: 'text' })
    expect(fieldByName(disclosures, 'jurisdiction')).not.toHaveProperty('required')
  })
})

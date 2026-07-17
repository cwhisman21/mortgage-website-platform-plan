import type { CollectionConfig } from 'payload'

export const Locations: CollectionConfig = {
  slug: 'locations',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'geographyType', 'stateCode', 'slug'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'geographyType', type: 'select', required: true, options: ['state', 'city'] },
    { name: 'stateCode', type: 'text', required: true },
    { name: 'parentLocation', type: 'relationship', relationTo: 'locations' },
  ],
}

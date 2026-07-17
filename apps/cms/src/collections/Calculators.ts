import type { CollectionConfig } from 'payload'

export const Calculators: CollectionConfig = {
  slug: 'calculators',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'route', 'slug'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'route', type: 'text', required: true },
  ],
}

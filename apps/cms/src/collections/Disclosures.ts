import type { CollectionConfig } from 'payload'

export const Disclosures: CollectionConfig = {
  slug: 'disclosures',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'jurisdiction'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'body', type: 'textarea', required: true },
    { name: 'jurisdiction', type: 'text' },
  ],
}

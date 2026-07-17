import type { CollectionConfig } from 'payload'

export const Branches: CollectionConfig = {
  slug: 'branches',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'nmlsId', 'slug'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'nmlsId', type: 'text' },
    { name: 'locations', type: 'relationship', relationTo: 'locations', hasMany: true },
  ],
}

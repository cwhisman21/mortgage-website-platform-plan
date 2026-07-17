import type { CollectionConfig } from 'payload'
export const Products: CollectionConfig = { slug: 'products', admin: { useAsTitle: 'name', defaultColumns: ['name', 'status', 'slug'] }, fields: [
  { name: 'name', type: 'text', required: true }, { name: 'slug', type: 'text', required: true, unique: true, index: true },
  { name: 'status', type: 'select', required: true, defaultValue: 'draft', options: ['draft', 'active', 'archived'], index: true },
] }

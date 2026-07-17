import type { CollectionConfig } from 'payload'

import type { Role } from '../access/roles'

const roleOptions: Array<{ label: string; value: Role }> = [
  { label: 'Automation', value: 'automation' },
  { label: 'Editor', value: 'editor' },
  { label: 'Compliance reviewer', value: 'compliance-reviewer' },
  { label: 'Publisher', value: 'publisher' },
  { label: 'Admin', value: 'admin' },
]

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: roleOptions,
      required: true,
    },
  ],
  versions: { drafts: true },
}

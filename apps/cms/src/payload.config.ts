import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig, type CollectionConfig } from 'payload'

const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [],
  versions: { drafts: true },
}

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users],
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI || '' } }),
  jobs: { tasks: [] },
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
})

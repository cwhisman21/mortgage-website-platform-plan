import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import { Users } from './collections/Users'

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users],
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI || '' } }),
  jobs: { tasks: [] },
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
})

import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import { Branches } from './collections/Branches'
import { Calculators } from './collections/Calculators'
import { Disclosures } from './collections/Disclosures'
import { LoanOfficers } from './collections/LoanOfficers'
import { Locations } from './collections/Locations'
import { Products } from './collections/Products'
import { Users } from './collections/Users'

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users, Locations, Products, LoanOfficers, Branches, Calculators, Disclosures],
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI || '' } }),
  jobs: { tasks: [] },
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
})

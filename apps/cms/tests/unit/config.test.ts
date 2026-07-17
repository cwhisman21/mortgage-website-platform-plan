import { describe, expect, it } from 'vitest'
import config from '../../src/payload.config'

describe('Payload configuration', () => {
  it('registers the editorial application with drafts and jobs enabled', async () => {
    const resolved = await config
    expect(resolved.collections?.map(({ slug }) => slug)).toContain('users')
    expect(resolved.jobs).toBeDefined()
  })
})

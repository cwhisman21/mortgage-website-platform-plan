import { describe, expect, it } from 'vitest'

import { canApprove, canPublish } from '../../src/access/editorial'

describe('editorial access', () => {
  it('prevents automation from approving or publishing', () => {
    const automation = { roles: ['automation'] as const }

    expect(canApprove(automation)).toBe(false)
    expect(canPublish(automation)).toBe(false)
  })

  it('denies approval and publishing when automation has a human capability', () => {
    const automationAdmin = { roles: ['automation', 'admin'] as const }

    expect(canApprove(automationAdmin)).toBe(false)
    expect(canPublish(automationAdmin)).toBe(false)
  })

  it('allows only publishers to publish approved work', () => {
    expect(canPublish({ roles: ['editor'] })).toBe(false)
    expect(canPublish({ roles: ['publisher'] })).toBe(true)
  })
})

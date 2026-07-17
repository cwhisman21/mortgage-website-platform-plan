import { describe, expect, it } from 'vitest'

import { assertTransition } from '../../src/editorial/domain/state-machine'
import type { EditorialStatus, Stage } from '../../src/editorial/domain/types'

const automation = { roles: ['automation'] as const }
const orderedStages = [
  'commissioned', 'mortgage-contract', 'researching', 'drafting', 'developmental-review',
  'fact-and-copy-review', 'mortgage-audit', 'compliance-review', 'packaging', 'awaiting-approval',
] as const satisfies readonly Stage[]

describe('editorial state machine', () => {
  it.each(orderedStages.slice(0, -1).map((from, index) => [from, orderedStages[index + 1]] as const))(
    'allows the ordered automated transition from %s to %s',
    (from, to) => {
      const transition = assertTransition as (from: EditorialStatus, to: EditorialStatus, actor: typeof automation) => void
      expect(() => transition(from, to, automation)).not.toThrow()
    },
  )

  it('rejects skipped, reverse, and terminal-state transitions', () => {
    expect(() => assertTransition('commissioned', 'drafting', automation)).toThrow('Invalid transition')
    expect(() => assertTransition('researching', 'mortgage-contract', automation)).toThrow('Invalid transition')
    expect(() => assertTransition('published', 'commissioned', { roles: ['admin'] })).toThrow('Invalid transition')
  })

  it('allows at most two developmental revision cycles', () => {
    expect(() => assertTransition('developmental-review', 'revision', automation, { developmentalRevisionCount: 0 })).not.toThrow()
    expect(() => assertTransition('revision', 'drafting', automation)).not.toThrow()
    expect(() => assertTransition('developmental-review', 'revision', automation, { developmentalRevisionCount: 1 })).not.toThrow()
    expect(() => assertTransition('developmental-review', 'revision', automation, { developmentalRevisionCount: 2 })).toThrow('Developmental revision limit reached')
  })

  it.each([
    ['missing', undefined],
    ['negative', { developmentalRevisionCount: -1 }],
    ['fractional', { developmentalRevisionCount: 1.5 }],
    ['non-finite', { developmentalRevisionCount: Number.NaN }],
  ])('rejects %s persisted developmental revision counts', (_label, context) => {
    const transition = assertTransition as (...args: unknown[]) => void
    expect(() => transition('developmental-review', 'revision', automation, context)).toThrow(
      'Valid persisted developmental revision count required',
    )
  })

  it('allows work to enter blocked state but not leave it through this state machine', () => {
    const activeStatus: EditorialStatus = 'researching'
    expect(() => assertTransition(activeStatus, 'blocked', automation)).not.toThrow()
    expect(() => assertTransition('blocked', 'researching', { roles: ['admin'] })).toThrow('Invalid transition')
  })

  it('requires a human editor or admin to approve', () => {
    expect(() => assertTransition('awaiting-approval', 'approved', automation)).toThrow('Human approval required')
    expect(() => assertTransition('awaiting-approval', 'approved', { roles: ['automation', 'editor'] })).toThrow('Human approval required')
    expect(() => assertTransition('awaiting-approval', 'approved', { roles: ['editor'] })).not.toThrow()
    expect(() => assertTransition('awaiting-approval', 'approved', { roles: ['admin'] })).not.toThrow()
  })

  it('requires a human publisher or admin to publish an approved article', () => {
    expect(() => assertTransition('approved', 'published', automation)).toThrow('Human publishing required')
    expect(() => assertTransition('approved', 'published', { roles: ['automation', 'publisher'] })).toThrow('Human publishing required')
    expect(() => assertTransition('approved', 'published', { roles: ['publisher'] })).not.toThrow()
    expect(() => assertTransition('approved', 'published', { roles: ['admin'] })).not.toThrow()
  })
})

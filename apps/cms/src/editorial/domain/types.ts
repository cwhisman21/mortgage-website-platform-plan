import type { Role } from '../../access/roles'

export const stages = [
  'commissioned',
  'mortgage-contract',
  'researching',
  'drafting',
  'developmental-review',
  'revision',
  'fact-and-copy-review',
  'mortgage-audit',
  'compliance-review',
  'packaging',
  'awaiting-approval',
] as const

export type Stage = (typeof stages)[number]
export type EditorialStatus = Stage | 'blocked' | 'approved' | 'published'
export type EditorialMode = 'reported' | 'opinion' | 'analysis'
export type EditorialActor = { roles?: readonly Role[] } | null | undefined
export type TransitionActor = EditorialActor | Role

export interface TransitionContext {
  developmentalRevisionCount?: number
}

export interface PersistedRevisionContext {
  developmentalRevisionCount: number
}

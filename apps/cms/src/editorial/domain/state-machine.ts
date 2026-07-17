import { canApprove, canPublish } from '../../access/editorial'
import type {
  EditorialActor,
  EditorialStatus,
  TransitionActor,
  TransitionContext,
} from './types'

const MAX_DEVELOPMENTAL_REVISIONS = 2

const orderedTransitions = {
  commissioned: ['mortgage-contract'],
  'mortgage-contract': ['researching'],
  researching: ['drafting'],
  drafting: ['developmental-review'],
  'developmental-review': ['revision', 'fact-and-copy-review'],
  revision: ['drafting'],
  'fact-and-copy-review': ['mortgage-audit'],
  'mortgage-audit': ['compliance-review'],
  'compliance-review': ['packaging'],
  packaging: ['awaiting-approval'],
  'awaiting-approval': ['approved'],
  approved: ['published'],
  blocked: [],
  published: [],
} as const satisfies Record<EditorialStatus, readonly EditorialStatus[]>

const normalizeActor = (actor: TransitionActor): EditorialActor =>
  typeof actor === 'string' ? { roles: [actor] } : actor

export function assertTransition(
  from: EditorialStatus,
  to: EditorialStatus,
  actor: TransitionActor,
  context: TransitionContext = {},
): void {
  if (to === 'approved' && from === 'awaiting-approval') {
    if (!canApprove(normalizeActor(actor))) throw new Error('Human approval required')
    return
  }

  if (to === 'published' && from === 'approved') {
    if (!canPublish(normalizeActor(actor))) throw new Error('Human publishing required')
    return
  }

  if (to === 'blocked' && from !== 'blocked' && from !== 'published') return

  if (!orderedTransitions[from].some((status) => status === to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`)
  }

  if (
    from === 'developmental-review' &&
    to === 'revision' &&
    (context.developmentalRevisionCount ?? 0) >= MAX_DEVELOPMENTAL_REVISIONS
  ) {
    throw new Error('Developmental revision limit reached')
  }
}

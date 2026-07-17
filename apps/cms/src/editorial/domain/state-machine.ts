import { canApprove, canPublish } from '../../access/editorial'
import type {
  EditorialActor,
  EditorialStatus,
  PersistedRevisionContext,
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

type TransitionArguments =
  | [from: 'developmental-review', to: 'revision', actor: TransitionActor, context: PersistedRevisionContext]
  | [from: 'developmental-review', to: Exclude<EditorialStatus, 'revision'>, actor: TransitionActor, context?: TransitionContext]
  | [from: Exclude<EditorialStatus, 'developmental-review'>, to: EditorialStatus, actor: TransitionActor, context?: TransitionContext]

export function assertTransition(...args: TransitionArguments): void {
  const [from, to, actor, context = {}] = args
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

  if (from === 'developmental-review' && to === 'revision') {
    const count = context.developmentalRevisionCount
    if (count === undefined || !Number.isInteger(count) || count < 0) {
      throw new Error('Valid persisted developmental revision count required')
    }
    if (count >= MAX_DEVELOPMENTAL_REVISIONS) {
      throw new Error('Developmental revision limit reached')
    }
  }
}

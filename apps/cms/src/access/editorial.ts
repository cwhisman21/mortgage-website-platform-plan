import { hasRole, type Role } from './roles'

type Actor = { roles?: readonly Role[] } | null | undefined

export const isAutomation = (actor: Actor) => hasRole(actor, ['automation'])
export const canApprove = (actor: Actor) =>
  !isAutomation(actor) && hasRole(actor, ['editor', 'admin'])
export const canPublish = (actor: Actor) =>
  !isAutomation(actor) && hasRole(actor, ['publisher', 'admin'])

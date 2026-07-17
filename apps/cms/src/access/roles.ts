export type Role = 'automation' | 'editor' | 'compliance-reviewer' | 'publisher' | 'admin'

type Actor = { roles?: readonly Role[] } | null | undefined

export const hasRole = (actor: Actor, roles: readonly Role[]) =>
  Boolean(actor?.roles?.some((role) => roles.includes(role)))

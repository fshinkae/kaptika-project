import { apiFetch } from '../../lib/apiClient'

/**
 * Progresso rumo à meta de uma medalha cumulativa (espelha
 * `BadgeDtos.Progress`). Para conquistadas, `current === target`.
 */
export interface BadgeProgress {
  current: number
  target: number
}

/**
 * Uma medalha da coleção (espelha `BadgeDtos.BadgeView`): conquistada
 * (`achieved` + `awardedAt`) ou bloqueada (objetivo em `description` +
 * `progress` X/Y das cumulativas). `awardedAt` é `null` quando bloqueada;
 * `progress` é `null` para medalhas não cumulativas.
 */
export interface BadgeView {
  slug: string
  name: string
  description: string
  achieved: boolean
  awardedAt: string | null
  progress: BadgeProgress | null
}

/** Coleção completa (espelha `BadgeDtos.BadgeCollectionResponse`). */
export interface BadgeCollection {
  badges: BadgeView[]
  achievedCount: number
  totalCount: number
}

/** GET /me/badges — coleção do estudante autenticado (somente leitura). */
export function getBadges(): Promise<BadgeCollection> {
  return apiFetch<BadgeCollection>('/me/badges')
}

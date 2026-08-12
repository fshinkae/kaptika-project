import { apiFetch } from '../../lib/apiClient'

/**
 * Resumo de XP servido pelo backend (GET /me/xp, somente leitura).
 * Espelha `XpDtos.XpSummaryResponse`: total, nível, XP restante para o próximo
 * nível e XP acumulado na semana vigente. O frontend nunca calcula esses
 * valores — apenas os reflete (backend é a fonte de verdade).
 */
export interface XpSummary {
  xpTotal: number
  level: number
  xpToNextLevel: number
  xpInPeriod: number
}

/** Busca o resumo de XP do estudante autenticado (FR-004/FR-006). */
export function getXpSummary(): Promise<XpSummary> {
  return apiFetch<XpSummary>('/me/xp')
}

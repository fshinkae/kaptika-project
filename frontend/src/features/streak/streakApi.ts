import { apiFetch } from '../../lib/apiClient'

/**
 * Estado da ofensiva do estudante (GET /me/streak), somente leitura.
 * Reflete `StreakResponse` do backend (feature 004). O frontend nunca
 * calcula manter/quebrar — apenas espelha estes campos (FR-003).
 *
 * `brokenAt` acompanha somente `brokenSinceLastAccess === true`; a quebra
 * é reportada uma única vez. Serializado como ISO string (Java Instant).
 */
export interface StreakState {
  /** Dias seguidos na ofensiva atual. */
  current: number
  /** Maior ofensiva já alcançada. */
  record: number
  /** Congelamentos disponíveis. */
  freezes: number
  /** Meta do dia já cumprida (reforço "ofensiva mantida"). */
  metToday: boolean
  /** Ofensiva foi quebrada desde o último acesso (comunicar no retorno). */
  brokenSinceLastAccess: boolean
  /** Instante da quebra (ISO) quando houve quebra; caso contrário, null. */
  brokenAt: string | null
}

/** Busca o estado atual da ofensiva do próprio estudante. */
export function getStreak(): Promise<StreakState> {
  return apiFetch<StreakState>('/me/streak')
}

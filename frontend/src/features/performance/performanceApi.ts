import { apiFetch } from '../../lib/apiClient'
import type { AreaSlug } from '../session/sessionApi'

/** Janelas aceitas pelo backend (backend/007 FR-009). */
export const WINDOWS = [7, 30, 90] as const
export type WindowDays = (typeof WINDOWS)[number]
export const DEFAULT_WINDOW: WindowDays = 30

export type Reason = 'NOT_PRACTICED' | 'LOWEST_ACCURACY' | 'INSUFFICIENT_DATA'

/** `accuracy` (0–1) é nulo sem respostas: "não praticada", não "0%". */
export interface AreaPerformance {
  area: AreaSlug
  answered: number
  correct: number
  wrong: number
  accuracy: number | null
}

export interface Totals {
  answered: number
  correct: number
  wrong: number
  accuracy: number | null
}

/** `area` é nula quando o motivo é INSUFFICIENT_DATA. */
export interface Recommendation {
  area: AreaSlug | null
  reason: Reason
}

/** `date` é data local do servidor (AAAA-MM-DD). */
export interface DailyPoint {
  date: string
  xp: number
  answered: number
  correct: number
  activeDay: boolean
}

export interface PerformanceResponse {
  windowDays: number
  from: string
  to: string
  totals: Totals
  areas: AreaPerformance[]
  recommendation: Recommendation
  daily: DailyPoint[]
}

/** GET /me/performance — retrato de desempenho do próprio estudante (somente leitura). */
export function getPerformance(days: WindowDays): Promise<PerformanceResponse> {
  return apiFetch<PerformanceResponse>(`/me/performance?days=${days}`)
}

import { apiFetch } from '../../lib/apiClient'

/** Recorte do placar. União + as const (erasableSyntaxOnly proíbe enum TS). */
export const SCOPES = ['global', 'weekly'] as const
export type Scope = (typeof SCOPES)[number]

/** Item do ranking; `profileId` desambigua nomes repetidos (FR-007). */
export interface LeaderboardEntry {
  rank: number
  profileId: string
  displayName: string
  xp: number
}

/** Posição do próprio estudante, sempre presente no contrato (FR-002). */
export interface MyPosition {
  rank: number
  xp: number
}

/** Página do ranking + metadados e posição própria (contrato do backend). */
export interface LeaderboardResponse {
  scope: string
  periodStart: string
  page: number
  size: number
  totalStudents: number
  entries: LeaderboardEntry[]
  me: MyPosition
}

export interface GetLeaderboardParams {
  scope: Scope
  page: number
  size: number
}

/** GET /leaderboard — ranking paginado + posição própria (somente leitura). */
export function getLeaderboard({
  scope,
  page,
  size,
}: GetLeaderboardParams): Promise<LeaderboardResponse> {
  const query = new URLSearchParams({
    scope,
    page: String(page),
    size: String(size),
  })
  return apiFetch<LeaderboardResponse>(`/leaderboard?${query.toString()}`)
}

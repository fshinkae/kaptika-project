import { apiFetch } from './apiClient'

/** Agregados de progresso servidos pelo backend (somente leitura). */
export interface ProgressSummary {
  xpTotal: number
  level: number
  xpToNextLevel: number
  streakCurrent: number
  badgesCount: number
}

/** Perfil do estudante autenticado (GET /me). */
export interface Profile {
  id: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  progress: ProgressSummary
}

export interface UpdateProfileInput {
  displayName?: string
  avatarUrl?: string | null
}

export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>('/me')
}

export function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return apiFetch<Profile>('/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

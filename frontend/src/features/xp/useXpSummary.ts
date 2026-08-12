import { useQuery } from '@tanstack/react-query'
import { getXpSummary } from './xpApi'

/** Chave de cache do resumo de XP — invalidável de forma independente. */
export const xpQueryKey = ['xp'] as const

/**
 * Hook de leitura do resumo de XP (GET /me/xp). A UI reflete e reconcilia
 * com este estado; nunca mantém um total próprio (FR-006/FR-007).
 */
export function useXpSummary() {
  return useQuery({ queryKey: xpQueryKey, queryFn: getXpSummary })
}

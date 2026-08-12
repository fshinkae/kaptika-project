import { useInfiniteQuery } from '@tanstack/react-query'
import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type MyPosition,
  type Scope,
} from './leaderboardApi'

const PAGE_SIZE = 20

/** Achata as páginas e remove duplicatas por `profileId` (FR-004, FR-007). */
function dedupeEntries(pages: LeaderboardResponse[]): LeaderboardEntry[] {
  const seen = new Set<string>()
  const result: LeaderboardEntry[] = []
  for (const page of pages) {
    for (const entry of page.entries) {
      if (seen.has(entry.profileId)) continue
      seen.add(entry.profileId)
      result.push(entry)
    }
  }
  return result
}

/**
 * Ranking paginado por recorte. Cada `scope` tem sua própria `queryKey`, então
 * alternar recorte refaz a busca (FR-003). O carregamento incremental concatena
 * páginas sem duplicatas nem reordenação pela UI (FR-004, FR-006).
 */
export function useLeaderboard(scope: Scope) {
  const query = useInfiniteQuery({
    queryKey: ['leaderboard', scope],
    queryFn: ({ pageParam }) =>
      getLeaderboard({ scope, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.size + lastPage.entries.length
      return loaded < lastPage.totalStudents ? lastPage.page + 1 : undefined
    },
  })

  const pages = query.data?.pages ?? []
  const first: LeaderboardResponse | undefined = pages[0]
  const me: MyPosition | undefined = first?.me

  return {
    entries: dedupeEntries(pages),
    me,
    totalStudents: first?.totalStudents ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
  }
}

import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { getBadges } from './badgesApi'

/**
 * Destaque das medalhas conquistadas no perfil (FR-005). Mostra até `limit`
 * conquistadas ou um estado vazio incentivador quando não houver nenhuma.
 * Export de topo para o coordenador plugar no `ProfilePage`. Reusa a mesma
 * `queryKey: ['badges']` — compartilha cache com a galeria.
 */
export function ProfileBadgesHighlight({ limit = 3 }: { limit?: number }) {
  const query = useQuery({ queryKey: ['badges'], queryFn: getBadges })

  if (query.isPending) return <LoadingState label="Carregando medalhas…" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const achieved = query.data.badges.filter((b) => b.achieved)

  return (
    <section aria-labelledby="profile-badges-heading" className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="profile-badges-heading" className="text-base font-semibold text-slate-800">
          Medalhas
        </h2>
        <span className="text-sm text-slate-500">
          {query.data.achievedCount} de {query.data.totalCount}
        </span>
      </div>

      {achieved.length === 0 ? (
        <EmptyState>
          Você ainda não tem medalhas. Conclua sessões de estudo para conquistar a primeira!
        </EmptyState>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {achieved.slice(0, limit).map((badge) => (
            <li
              key={badge.slug}
              title={badge.name}
              className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100"
            >
              <span aria-hidden>🏅</span>
              <span>{badge.name}</span>
            </li>
          ))}
          {achieved.length > limit && (
            <li className="flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500">
              +{achieved.length - limit}
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

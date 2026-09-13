import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { getBadges } from './badgesApi'
import { BadgesGallery } from './BadgesGallery'

/**
 * Página da galeria de medalhas (FR-003/004/007/008): trata carregando, erro
 * (com repetir) e vazio. A celebração de novas conquistas vive no AppShell.
 * Export de topo para o coordenador plugar em uma rota.
 */
export function BadgesGalleryPage() {
  const query = useQuery({ queryKey: ['badges'], queryFn: getBadges })

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Medalhas</h1>

      {query.isPending ? (
        <LoadingState label="Carregando medalhas…" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data.totalCount === 0 ? (
        <EmptyState>
          Ainda não há medalhas disponíveis. Volte em breve para novas conquistas!
        </EmptyState>
      ) : (
        <BadgesGallery collection={query.data} />
      )}
    </main>
  )
}

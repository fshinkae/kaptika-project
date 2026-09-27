import { useState } from 'react'
import { Button } from '../../components/Button'
import { EmptyState, START_SESSION_ACTION } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PageHeader } from '../../components/PageHeader'
import type { Scope } from './leaderboardApi'
import { LeaderboardRow } from './LeaderboardRow'
import { MyPositionCard } from './MyPositionCard'
import { ScopeTabs } from './ScopeTabs'
import { useLeaderboard } from './useLeaderboard'

/**
 * Placar de líderes: ranking ordenado pela API (FR-001, FR-006), posição
 * própria destacada (FR-002), alternância geral/semanal (FR-003) e
 * carregamento incremental sem duplicatas (FR-004). Trata carregando, erro
 * (com repetir) e vazio (FR-005). Mobile-first (FR-009).
 */
export function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('global')
  const {
    entries,
    me,
    totalStudents,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useLeaderboard(scope)
  // O cartão "Sua posição" só existe para quem está fora da página carregada;
  // dentro dela, a própria linha já tem realce (DUP-1). Sem XP, o cartão
  // aparece sempre: é ele que convida a entrar no placar (PLC-1). Com o placar
  // vazio, quem convida é o estado vazio.
  const meInPage = me != null && entries.some((entry) => entry.rank === me.rank)
  const showMyPosition = me != null && entries.length > 0 && (!meInPage || me.xp === 0)

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-8">
      <PageHeader title="Placar de líderes" />

      <ScopeTabs scope={scope} onChange={setScope} />

      {isPending ? (
        <LoadingState label="Carregando placar…" />
      ) : isError && entries.length === 0 ? (
        // Erro só toma a tela quando não há nada carregado; falha do
        // "carregar mais" é tratada inline, preservando a lista (FR-005).
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {me && showMyPosition && (
            <MyPositionCard me={me} scope={scope} totalStudents={totalStudents} />
          )}

          {entries.length === 0 ? (
            <EmptyState action={START_SESSION_ACTION}>
              Ainda não há estudantes no placar. Conclua uma sessão para aparecer aqui.
            </EmptyState>
          ) : (
            <>
              <ol className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.profileId}
                    entry={entry}
                    isMe={me != null && entry.rank === me.rank}
                  />
                ))}
              </ol>

              {isFetchNextPageError && (
                <p role="alert" className="text-center text-sm text-danger">
                  Não foi possível carregar mais itens.
                </p>
              )}

              {hasNextPage && (
                <Button
                  variant="secondary"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage
                    ? 'Carregando…'
                    : isFetchNextPageError
                      ? 'Tentar novamente'
                      : 'Carregar mais'}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}

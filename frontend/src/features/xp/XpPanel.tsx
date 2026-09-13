import { ErrorState } from '../../components/ErrorState'
import { Skeleton } from '../../components/Skeleton'
import { formatInt } from '../../lib/format'
import { LevelMeter } from './LevelMeter'
import { useXpSummary } from './useXpSummary'
import type { XpSummary } from './xpApi'

/**
 * Painel de XP: reflete GET /me/xp com XP total, XP da semana e barra de
 * progresso ao próximo nível. Trata carregando, erro (com repetir) e vazio
 * (FR-004/FR-007/FR-009) no tamanho do próprio card.
 */
export function XpPanel() {
  const query = useXpSummary()

  if (query.isPending) return <Skeleton label="Carregando seu XP…" className="h-[148px]" />
  if (query.isError) {
    return (
      <ErrorState
        compact
        message="Não foi possível carregar seu XP. Tente novamente."
        onRetry={() => query.refetch()}
      />
    )
  }
  if (query.data.xpTotal === 0) {
    return (
      <section aria-label="Seu XP e nível" className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
        <p className="text-base font-semibold text-slate-800">Você ainda não ganhou XP.</p>
        <p className="mt-1 text-sm text-slate-600">
          Cada acerto numa sessão soma XP e faz você subir de nível.
        </p>
      </section>
    )
  }

  return <XpPanelView summary={query.data} />
}

function XpPanelView({ summary }: { summary: XpSummary }) {
  const { xpTotal, level, xpToNextLevel, xpInPeriod } = summary
  return (
    <section aria-label="Seu XP e nível" className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-600">XP total</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{formatInt(xpTotal)}</p>
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-800">{formatInt(xpInPeriod)}</span>{' '}
          nesta semana
        </p>
      </div>
      <div className="mt-5">
        <LevelMeter level={level} xpToNextLevel={xpToNextLevel} />
      </div>
    </section>
  )
}

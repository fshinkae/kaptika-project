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
      <section aria-label="Seu XP e nível" className="rounded-card bg-surface p-5 ring-1 ring-line">
        <p className="text-base font-semibold text-ink">Você ainda não ganhou XP.</p>
        <p className="mt-1 text-sm text-ink-muted">
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
    <section aria-label="Seu XP e nível" className="rounded-card bg-surface p-5 ring-1 ring-line">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-muted">XP total</p>
          <p className="mt-1 font-display text-4xl leading-tight font-extrabold tabular-nums text-ink">
            <span className="highlight-mark">{formatInt(xpTotal)}</span>
          </p>
        </div>
        <p className="text-sm text-ink-muted">
          <span className="font-semibold tabular-nums text-ink">{formatInt(xpInPeriod)}</span>{' '}
          nesta semana
        </p>
      </div>
      <div className="mt-5">
        <LevelMeter level={level} xpToNextLevel={xpToNextLevel} />
      </div>
    </section>
  )
}

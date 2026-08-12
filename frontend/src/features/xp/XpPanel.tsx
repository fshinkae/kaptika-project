import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { LevelMeter } from './LevelMeter'
import { useXpSummary } from './useXpSummary'
import type { XpSummary } from './xpApi'

/** Formata inteiros com separador de milhar pt-BR (ex.: 1.250). */
const nf = new Intl.NumberFormat('pt-BR')

/**
 * Painel de XP: reflete GET /me/xp com XP total, nível, barra de progresso ao
 * próximo nível e XP da semana. Trata carregando, erro (com repetir) e vazio
 * (FR-004/FR-007/FR-009). Widget de topo — o coordenador o pluga numa rota.
 */
export function XpPanel() {
  const query = useXpSummary()

  if (query.isPending) return <LoadingState label="Carregando seu XP…" />
  if (query.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar seu XP. Tente novamente."
        onRetry={() => query.refetch()}
      />
    )
  }
  if (query.data.xpTotal === 0) {
    return (
      <EmptyState>
        Você ainda não ganhou XP. Complete uma sessão de estudo para começar a subir de nível!
      </EmptyState>
    )
  }

  return <XpPanelView summary={query.data} />
}

function XpPanelView({ summary }: { summary: XpSummary }) {
  const { xpTotal, level, xpToNextLevel, xpInPeriod } = summary
  return (
    <section aria-label="Seu XP e nível" className="flex w-full flex-col gap-5">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">XP total</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{nf.format(xpTotal)}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            Nível {level}
          </span>
        </div>
        <div className="mt-5">
          <LevelMeter level={level} xpToNextLevel={xpToNextLevel} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="XP nesta semana" value={nf.format(xpInPeriod)} />
        <Stat label="Faltam p/ nível " value={`${nf.format(xpToNextLevel)} XP`} />
      </dl>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-100">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

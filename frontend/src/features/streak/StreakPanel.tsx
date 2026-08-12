import { useQuery } from '@tanstack/react-query'
import { LoadingState } from '../../components/LoadingState'
import { ErrorState } from '../../components/ErrorState'
import { getStreak, type StreakState } from './streakApi'

/**
 * Painel de ofensiva: reflete GET /me/streak de forma motivadora e empática.
 * Trata carregando/erro(repetir) e um estado inicial simpático quando a
 * ofensiva ainda é zero. Nunca decide manter/quebrar — só espelha a API.
 */
export function StreakPanel() {
  const query = useQuery({ queryKey: ['streak'], queryFn: getStreak })

  if (query.isPending) return <LoadingState label="Carregando sua ofensiva…" />
  if (query.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar sua ofensiva. Tente novamente."
        onRetry={() => query.refetch()}
      />
    )
  }

  return <StreakView streak={query.data} />
}

function StreakView({ streak }: { streak: StreakState }) {
  const { current, record, freezes, metToday, brokenSinceLastAccess, brokenAt } = streak
  // A quebra tem prioridade sobre o convite inicial: mesmo com current 0,
  // se houve quebra desde o último acesso, comunicamos e incentivamos.
  const showInitialInvite = current === 0 && !brokenSinceLastAccess

  return (
    <section aria-labelledby="streak-heading" className="flex flex-col gap-5">
      <h2 id="streak-heading" className="text-lg font-semibold text-slate-800">
        Ofensiva diária
      </h2>

      {brokenSinceLastAccess && <BreakBanner brokenAt={brokenAt} />}

      {showInitialInvite ? <InitialInvite /> : <StreakHero current={current} metToday={metToday} />}

      {metToday && current > 0 && <MetTodayBadge />}

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Recorde" value={`${record} dias`} />
        <Stat label="Congelamentos" value={freezes} />
      </dl>
    </section>
  )
}

/** Destaque do contador de dias seguidos (FR-001). */
function StreakHero({ current, metToday }: { current: number; metToday: boolean }) {
  const label = current === 1 ? 'dia seguido' : 'dias seguidos'
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-amber-50 to-white p-6 text-center ring-1 ring-amber-100">
      <span aria-hidden className="text-4xl">
        🔥
      </span>
      <span className="text-5xl font-bold tabular-nums text-amber-600">{current}</span>
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {metToday && current > 0 && (
        <span className="mt-1 text-xs text-slate-500">Ofensiva mantida hoje!</span>
      )}
    </div>
  )
}

/** Reforço visual de meta cumprida no dia (FR-002). */
function MetTodayBadge() {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100"
    >
      <span aria-hidden>✅</span>
      Meta cumprida hoje
    </p>
  )
}

/** Estado inicial simpático quando ainda não há ofensiva (não é erro). */
function InitialInvite() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-indigo-50 p-6 text-center ring-1 ring-indigo-100">
      <span aria-hidden className="text-4xl">
        🌱
      </span>
      <p className="text-base font-semibold text-slate-800">Comece sua ofensiva hoje!</p>
      <p className="text-sm text-slate-600">
        Estude um pouco todos os dias e veja sua sequência crescer.
      </p>
    </div>
  )
}

/**
 * Aviso empático de quebra (FR-004/009): comunica a perda sem culpabilizar e
 * incentiva recomeçar. Exibe a data da quebra reportada pelo servidor.
 */
function BreakBanner({ brokenAt }: { brokenAt: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-1 rounded-xl bg-sky-50 p-4 text-center ring-1 ring-sky-100"
    >
      <p className="text-sm font-semibold text-slate-800">Sua ofensiva foi reiniciada</p>
      <p className="text-sm text-slate-600">
        Tudo bem — recomeços fazem parte. Que tal retomar hoje?
      </p>
      {brokenAt && <p className="text-xs text-slate-500">Última sequência até {formatDate(brokenAt)}.</p>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-100">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

/** Formata o instante do servidor (ISO) sem recalcular fuso próprio. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

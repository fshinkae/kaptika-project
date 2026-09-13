import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '../../components/ErrorState'
import { FlameIcon } from '../../components/Icons'
import { Skeleton } from '../../components/Skeleton'
import { formatDays } from '../../lib/format'
import { getStreak, type StreakState } from './streakApi'

/**
 * Painel de ofensiva: reflete GET /me/streak de forma motivadora e empática.
 * Trata carregando/erro(repetir) e um estado inicial simpático quando a
 * ofensiva ainda é zero. Nunca decide manter/quebrar — só espelha a API.
 */
export function StreakPanel() {
  const query = useQuery({ queryKey: ['streak'], queryFn: getStreak })

  if (query.isPending) return <Skeleton label="Carregando sua ofensiva…" className="h-40" />
  if (query.isError) {
    return (
      <ErrorState
        compact
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
  // Quem nunca manteve ofensiva não precisa de recorde 0 nem de proteções ainda.
  const showStats = !(showInitialInvite && record === 0)

  return (
    <section aria-labelledby="streak-heading" className="flex flex-col gap-5">
      <h2 id="streak-heading" className="text-lg font-semibold text-slate-800">
        Ofensiva diária
      </h2>

      {brokenSinceLastAccess && <BreakBanner brokenAt={brokenAt} />}

      {showInitialInvite ? <InitialInvite /> : <StreakHero current={current} metToday={metToday} />}

      {metToday && current > 0 && <MetTodayBadge />}

      {showStats && (
        <div className="flex flex-col gap-2">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Recorde" value={formatDays(record)} />
            <Stat label="Proteções" value={freezes} />
          </dl>
          <p className="text-sm text-slate-600">
            Se você passar um dia sem estudar, uma proteção é usada automaticamente.
          </p>
        </div>
      )}
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
        <span className="mt-1 text-xs text-slate-600">Ofensiva mantida hoje!</span>
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

/** Estado inicial quando ainda não há ofensiva (não é erro): uma linha, sem ocupar a tela. */
function InitialInvite() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-slate-100">
      <FlameIcon className="h-6 w-6 shrink-0 text-amber-600" />
      <div>
        <p className="text-base font-semibold text-slate-800">Comece sua ofensiva hoje!</p>
        <p className="mt-1 text-sm text-slate-600">
          Conclua uma sessão por dia para a sequência crescer.
        </p>
      </div>
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
      {brokenAt && <p className="text-xs text-slate-600">Última sequência até {formatDate(brokenAt)}.</p>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-100">
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
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

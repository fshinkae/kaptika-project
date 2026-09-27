import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { buttonClassName } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { CheckIcon, FlameIcon } from '../../components/Icons'
import { Skeleton } from '../../components/Skeleton'
import { formatDays } from '../../lib/format'
import { getStreak, type StreakState } from './streakApi'

/**
 * Painel de ofensiva: reflete GET /me/streak de forma motivadora e empática.
 * Trata carregando/erro(repetir) e um estado inicial simpático quando a
 * ofensiva ainda é zero. Nunca decide manter/quebrar — só espelha a API.
 *
 * `showAction`: oferece o botão de estudar. Na tela inicial o botão principal
 * já existe acima do painel; na tela da ofensiva, é o painel que o oferece.
 */
export function StreakPanel({ showAction = false }: { showAction?: boolean }) {
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

  return <StreakView streak={query.data} showAction={showAction} />
}

function StreakView({ streak, showAction }: { streak: StreakState; showAction: boolean }) {
  const { current, record, freezes, metToday, brokenSinceLastAccess, brokenAt } = streak
  // A quebra tem prioridade sobre o convite inicial: mesmo com current 0,
  // se houve quebra desde o último acesso, comunicamos e incentivamos.
  const showInitialInvite = current === 0 && !brokenSinceLastAccess
  // Quem nunca manteve ofensiva não precisa de recorde 0 nem de proteções ainda.
  const showStats = !(showInitialInvite && record === 0)
  // Ofensiva em curso sem a sessão de hoje: é o motivo para estudar agora (STK-1).
  const pendingToday = current > 0 && !metToday

  return (
    <section aria-labelledby="streak-heading" className="flex flex-col gap-5">
      <h2 id="streak-heading" className="font-display text-lg font-bold text-ink">
        Ofensiva diária
      </h2>

      {brokenSinceLastAccess && <BreakBanner brokenAt={brokenAt} />}

      {showInitialInvite ? <InitialInvite /> : <StreakHero current={current} metToday={metToday} />}

      {metToday && current > 0 && <MetTodayBadge />}
      {pendingToday && <PendingTodayNotice current={current} />}

      {showAction && !metToday && (
        <Link to="/estudar" className={buttonClassName('primary')}>
          {pendingToday ? 'Fazer a sessão de hoje' : 'Começar uma sessão'}
        </Link>
      )}

      {showStats && (
        <div className="flex flex-col gap-2">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Recorde" value={formatDays(record)} />
            <Stat label="Proteções" value={freezes} />
          </dl>
          <p className="text-sm text-ink-muted">
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
    <div className="flex items-center gap-4 rounded-card bg-surface p-5 ring-1 ring-line">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-highlight">
        <FlameIcon className="h-7 w-7 text-ink" />
      </span>
      <div className="flex flex-col">
        <span className="font-display text-4xl leading-none font-extrabold tabular-nums text-ink">
          {current}
        </span>
        <span className="mt-1 text-sm font-medium text-ink-muted">{label}</span>
      </div>
      {metToday && current > 0 && <span className="sr-only">Ofensiva mantida hoje.</span>}
    </div>
  )
}

/** Reforço visual de meta cumprida no dia (FR-002). */
function MetTodayBadge() {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 rounded-control bg-success-soft px-4 py-2.5 text-sm font-semibold text-success"
    >
      <CheckIcon className="h-4 w-4" />
      Feito hoje. Volte amanhã para manter.
    </p>
  )
}

/** A ofensiva continua só se houver sessão hoje: dito com o número em jogo. */
function PendingTodayNotice({ current }: { current: number }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2.5 rounded-control bg-highlight-soft px-4 py-3 text-sm text-ink ring-1 ring-highlight"
    >
      <FlameIcon className="h-5 w-5 shrink-0" />
      <span>
        Falta a sessão de hoje para manter seus{' '}
        <strong className="font-semibold">{formatDays(current)}</strong>.
      </span>
    </p>
  )
}

/** Estado inicial quando ainda não há ofensiva (não é erro): uma linha, sem ocupar a tela. */
function InitialInvite() {
  return (
    <div className="flex items-start gap-3 rounded-card bg-surface p-5 ring-1 ring-line">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight-soft">
        <FlameIcon className="h-5 w-5 text-ink" />
      </span>
      <div>
        <p className="text-base font-semibold text-ink">Comece sua ofensiva hoje!</p>
        <p className="mt-1 text-sm text-ink-muted">
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
      className="flex flex-col gap-1 rounded-control bg-pen-50 p-4 text-center ring-1 ring-pen-100"
    >
      <p className="text-sm font-semibold text-ink">Sua ofensiva foi reiniciada</p>
      <p className="text-sm text-ink-muted">
        Tudo bem — recomeços fazem parte. Que tal retomar hoje?
      </p>
      {brokenAt && <p className="text-xs text-ink-muted">Última sequência até {formatDate(brokenAt)}.</p>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-control bg-surface p-4 text-center ring-1 ring-line">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  )
}

/** Formata o instante do servidor (ISO) sem recalcular fuso próprio. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

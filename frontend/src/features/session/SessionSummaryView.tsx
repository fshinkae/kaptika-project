import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, buttonClassName } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { FlameIcon } from '../../components/Icons'
import { Skeleton } from '../../components/Skeleton'
import { formatDays, formatInt } from '../../lib/format'
import { LevelMeter, useXpSummary } from '../xp'
import { getStreak } from '../streak'
import { AiFeedbackCard } from './AiFeedbackCard'
import { AREAS, type SessionSummary } from './sessionApi'

/**
 * Resumo final/parcial da sessão (FR-007). Além de acertos e erros, mostra o
 * progresso que a sessão gerou (RES-1) — XP, nível e ofensiva, sempre lidos da
 * API depois do encerramento — e o motivo para voltar amanhã.
 */
export function SessionSummaryView({
  summary,
  onRestart,
}: {
  summary: SessionSummary
  onRestart: () => void
}) {
  const areaLabel = AREAS.find((a) => a.slug === summary.area)?.label ?? summary.area
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
      <header className="text-center">
        <p className="text-sm font-medium text-ink-muted">{areaLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Sessão concluída</h1>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Acertos" value={summary.correctCount} tone="text-success" />
        <Stat label="Erros" value={summary.wrongCount} tone="text-danger" />
        <Stat label="Feitas" value={`${summary.answeredCount}/${summary.totalQuestions}`} />
      </dl>

      <SessionProgressReport />

      <AiFeedbackCard sessionId={summary.sessionId} />

      <div className="flex flex-col gap-3">
        <Link to="/" className={buttonClassName('primary')}>
          Voltar ao início
        </Link>
        <Button variant="secondary" onClick={onRestart}>
          Outra sessão
        </Button>
      </div>
    </main>
  )
}

/** XP, nível e ofensiva depois da sessão. O pai invalida os caches ao encerrar. */
function SessionProgressReport() {
  const xp = useXpSummary()
  const streak = useQuery({ queryKey: ['streak'], queryFn: getStreak })

  if (xp.isPending || streak.isPending) {
    return <Skeleton label="Carregando seu progresso…" className="h-[148px]" />
  }
  if (xp.isError || streak.isError) {
    return (
      <ErrorState
        compact
        message="Não foi possível carregar seu progresso."
        onRetry={() => {
          if (xp.isError) void xp.refetch()
          if (streak.isError) void streak.refetch()
        }}
      />
    )
  }

  const { xpTotal, level, xpToNextLevel } = xp.data
  const { current, metToday } = streak.data
  return (
    <section
      aria-labelledby="session-progress-heading"
      className="flex flex-col gap-4 rounded-card bg-surface p-5 ring-1 ring-line"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="session-progress-heading" className="font-display text-base font-bold text-ink">
          Seu progresso
        </h2>
        <p className="text-sm text-ink-muted">
          {xpTotal > 0 ? `${formatInt(xpTotal)} XP no total` : 'Cada acerto soma XP'}
        </p>
      </div>
      <LevelMeter level={level} xpToNextLevel={xpToNextLevel} />
      <p className="flex items-center gap-2.5 text-sm text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-highlight">
          <FlameIcon className="h-4 w-4 text-ink" />
        </span>
        <span>
          <strong className="font-semibold text-ink">Ofensiva: {formatDays(current)}.</strong>{' '}
          {metToday ? 'Volte amanhã para manter.' : ''}
        </span>
      </p>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'text-ink',
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className="rounded-control bg-surface p-4 text-center ring-1 ring-line">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, buttonClassName } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { FlameIcon } from '../../components/Icons'
import { Skeleton } from '../../components/Skeleton'
import { formatDays, formatInt } from '../../lib/format'
import { LevelMeter, useXpSummary } from '../xp'
import { getStreak } from '../streak'
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
        <p className="text-sm font-medium text-slate-600">{areaLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Sessão concluída</h1>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Acertos" value={summary.correctCount} tone="text-green-700" />
        <Stat label="Erros" value={summary.wrongCount} tone="text-red-700" />
        <Stat label="Feitas" value={`${summary.answeredCount}/${summary.totalQuestions}`} />
      </dl>

      <SessionProgressReport />

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
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="session-progress-heading" className="text-base font-semibold text-slate-800">
          Seu progresso
        </h2>
        <p className="text-sm text-slate-600">
          {xpTotal > 0 ? `${formatInt(xpTotal)} XP no total` : 'Cada acerto soma XP'}
        </p>
      </div>
      <LevelMeter level={level} xpToNextLevel={xpToNextLevel} />
      <p className="flex items-start gap-2 text-sm text-slate-700">
        <FlameIcon className="h-5 w-5 shrink-0 text-amber-600" />
        <span>
          <strong className="font-semibold text-slate-900">Ofensiva: {formatDays(current)}.</strong>{' '}
          {metToday ? 'Volte amanhã para manter.' : ''}
        </span>
      </p>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'text-slate-800',
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-200">
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

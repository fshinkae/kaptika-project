import { Button } from '../../components/Button'
import { AREAS, type SessionSummary } from './sessionApi'

/** Resumo final/parcial da sessão: acertos, erros e total (FR-007). */
export function SessionSummaryView({
  summary,
  onRestart,
}: {
  summary: SessionSummary
  onRestart: () => void
}) {
  const areaLabel = AREAS.find((a) => a.slug === summary.area)?.label ?? summary.area
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-5 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Sessão concluída</h1>
        <p className="text-slate-600">{areaLabel}</p>
      </header>

      <dl className="grid w-full grid-cols-3 gap-3">
        <Stat label="Acertos" value={summary.correctCount} tone="text-green-700" />
        <Stat label="Erros" value={summary.wrongCount} tone="text-red-700" />
        <Stat label="Respondidas" value={`${summary.answeredCount}/${summary.totalQuestions}`} />
      </dl>

      <Button onClick={onRestart}>Nova sessão</Button>
    </main>
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
    <div className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-100">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${tone}`}>{value}</dd>
    </div>
  )
}

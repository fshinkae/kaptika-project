/**
 * Indicador de progresso da sessão (FR-005). Reflete o total real de
 * questões vindo da API (FR-010), mesmo que menor que o alvo.
 */
export function SessionProgress({ current, total }: { current: number; total: number }) {
  const clamped = Math.min(current, total)
  const pct = total > 0 ? (clamped / total) * 100 : 0
  return (
    <div className="flex flex-1 items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={clamped}
        aria-label={`Questão ${clamped} de ${total}`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span aria-hidden className="shrink-0 text-sm font-semibold tabular-nums text-slate-600">
        {clamped}/{total}
      </span>
    </div>
  )
}

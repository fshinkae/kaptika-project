import { formatInt } from '../../lib/format'
import { formatPercent } from './format'
import type { Totals } from './performanceApi'

/** Resumo da janela: respondidas, acertos e taxa geral (FR-002). */
export function TotalsSummary({ totals }: { totals: Totals }) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      <Stat label="Respondidas" value={formatInt(totals.answered)} />
      <Stat label="Acertos" value={formatInt(totals.correct)} />
      <Stat
        label="Taxa de acerto"
        value={totals.accuracy == null ? '–' : formatPercent(totals.accuracy)}
        highlight
      />
    </dl>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-control bg-surface p-3 text-center ring-1 ring-line">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums text-ink">
        <span className={highlight ? 'highlight-mark' : undefined}>{value}</span>
      </dd>
    </div>
  )
}

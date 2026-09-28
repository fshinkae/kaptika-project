import { formatInt } from '../../lib/format'
import { formatShortDate } from './format'
import type { DailyPoint } from './performanceApi'

/**
 * XP ganho por dia (US3). Colunas proporcionais ao maior dia da janela, só
 * visuais: os valores de cada dia estão na tabela acessível (FR-007).
 */
export function DailyXpChart({ daily }: { daily: DailyPoint[] }) {
  const max = Math.max(0, ...daily.map((point) => point.xp))
  const first = daily[0]
  const last = daily[daily.length - 1]

  return (
    <section aria-labelledby="xp-heading" className="flex flex-col gap-3">
      <h2 id="xp-heading" className="font-display text-lg font-bold text-ink">
        XP por dia
      </h2>
      <div className="flex flex-col gap-2 rounded-card bg-surface p-4 ring-1 ring-line">
        <p className="text-xs text-ink-muted">
          {max > 0 ? `Melhor dia: ${formatInt(max)} XP` : 'Nenhum XP neste período.'}
        </p>
        <div aria-hidden data-testid="xp-columns" className="flex h-28 items-end gap-px">
          {daily.map((point) => (
            <div
              key={point.date}
              className={`flex-1 rounded-t-sm ${point.xp > 0 ? 'bg-pen-600' : 'bg-line'}`}
              style={{ height: point.xp > 0 ? `${Math.max(4, (point.xp / max) * 100)}%` : '2px' }}
            />
          ))}
        </div>
        {first && last && (
          <div aria-hidden className="flex justify-between text-xs tabular-nums text-ink-muted">
            <span>{formatShortDate(first.date)}</span>
            <span>{formatShortDate(last.date)}</span>
          </div>
        )}
      </div>
    </section>
  )
}

import { weekdayOf } from './format'
import type { DailyPoint } from './performanceApi'

/**
 * Calendário de dias com meta cumprida (US3): colunas = semanas, linhas =
 * dias da semana. A primeira coluna começa vazia até o dia da semana do
 * primeiro dia da janela. O resumo em texto dá o mesmo dado sem depender da cor.
 */
export function ActivityCalendar({ daily }: { daily: DailyPoint[] }) {
  const leading = daily.length > 0 ? weekdayOf(daily[0].date) : 0
  const activeCount = daily.filter((point) => point.activeDay).length

  return (
    <section aria-labelledby="calendar-heading" className="flex flex-col gap-3">
      <h2 id="calendar-heading" className="font-display text-lg font-bold text-ink">
        Dias com meta cumprida
      </h2>
      <div className="flex flex-col gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
        <p className="text-sm text-ink-muted">
          Meta cumprida em <strong className="text-ink">{activeCount}</strong> de {daily.length}{' '}
          dias
        </p>
        <div
          aria-hidden
          data-testid="calendar-grid"
          className="grid grid-flow-col grid-rows-7 auto-cols-[minmax(0,1.25rem)] gap-1"
        >
          {Array.from({ length: leading }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {daily.map((point) => (
            <div
              key={point.date}
              data-active={point.activeDay}
              className={`aspect-square rounded-sm ${point.activeDay ? 'bg-pen-600' : 'bg-line'}`}
            />
          ))}
        </div>
        <div aria-hidden className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-pen-600" /> Meta cumprida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-line" /> Sem meta
          </span>
        </div>
      </div>
    </section>
  )
}

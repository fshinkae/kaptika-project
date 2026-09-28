import { formatInt } from '../../lib/format'
import { areaLabel, formatPercent } from './format'
import type { AreaPerformance } from './performanceApi'

/**
 * Taxa de acerto por área (US1). O texto de cada linha carrega o valor
 * completo; a barra só o repete visualmente (FR-007).
 */
export function AreaAccuracyChart({ areas }: { areas: AreaPerformance[] }) {
  return (
    <section aria-labelledby="areas-heading" className="flex flex-col gap-3">
      <h2 id="areas-heading" className="font-display text-lg font-bold text-ink">
        Acerto por área
      </h2>
      <ul className="flex flex-col gap-4 rounded-card bg-surface p-4 ring-1 ring-line">
        {areas.map((area) => (
          <li key={area.area} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{areaLabel(area.area)}</span>
              {area.accuracy == null ? (
                <span className="text-ink-muted">Ainda não praticada</span>
              ) : (
                <span className="tabular-nums text-ink-muted">
                  <span className="font-semibold text-ink">{formatPercent(area.accuracy)}</span>
                  {' · '}
                  {formatInt(area.correct)} de {formatInt(area.answered)}
                </span>
              )}
            </div>
            <div aria-hidden className="h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-pen-600"
                style={{ width: `${Math.round((area.accuracy ?? 0) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

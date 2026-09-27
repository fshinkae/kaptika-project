import { formatInt } from '../../lib/format'
import type { BadgeProgress } from './badgesApi'

/**
 * Barra de progresso acessível X/Y para medalhas cumulativas bloqueadas
 * (FR-004). Expõe o progresso via ARIA e como rótulo textual visível.
 */
export function BadgeProgressBar({ progress, label }: { progress: BadgeProgress; label: string }) {
  const target = Math.max(progress.target, 1)
  const current = Math.min(Math.max(progress.current, 0), target)
  const percent = Math.round((current / target) * 100)

  return (
    <div className="mt-3 w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
        <span>Progresso</span>
        <span className="font-medium tabular-nums text-ink">
          {formatInt(current)} de {formatInt(target)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${label}: ${formatInt(current)} de ${formatInt(target)}`}
        className="h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-pen-600 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

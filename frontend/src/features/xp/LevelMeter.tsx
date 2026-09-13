import { levelProgress } from './levelProgress'

interface LevelMeterProps {
  /** Nível atual confirmado pela API. */
  level: number
  /** XP restante para o próximo nível (GET /me/xp). */
  xpToNextLevel: number
  /** Oculta o rótulo textual acima da barra (para composições compactas). */
  hideLabel?: boolean
}

/**
 * Medidor de nível reutilizável: exibe o nível atual e uma barra de progresso
 * até o próximo nível. Acessível (`role="progressbar"` com valores ARIA) e
 * mobile-first. A posição é derivada só para apresentação — os números vêm
 * da API (FR-004/FR-009).
 */
export function LevelMeter({ level, xpToNextLevel, hideLabel = false }: LevelMeterProps) {
  const { percent } = levelProgress(level, xpToNextLevel)
  const valueText = `Nível ${level}, ${percent}% até o nível ${level + 1}`

  return (
    <div className="w-full">
      {!hideLabel && (
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink">Nível {level}</span>
          <span className="text-ink-muted">
            faltam <span className="font-medium text-ink">{xpToNextLevel}</span> XP
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
        aria-label={`Progresso do nível ${level}`}
        className="h-3 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-pen-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

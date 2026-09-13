import { SCOPES, type Scope } from './leaderboardApi'

const LABELS: Record<Scope, string> = {
  global: 'Geral',
  weekly: 'Semanal',
}

/**
 * Seletor de recorte geral/semanal (FR-003). Acessível como tablist,
 * navegável por teclado, com alvos de toque adequados (FR-009).
 */
export function ScopeTabs({
  scope,
  onChange,
}: {
  scope: Scope
  onChange: (next: Scope) => void
}) {
  return (
    <div role="tablist" aria-label="Recorte do placar" className="flex gap-2">
      {SCOPES.map((value) => {
        const selected = value === scope
        return (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={`min-h-[44px] flex-1 rounded-control px-4 text-sm font-medium transition
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600
              ${
                selected
                  ? 'bg-pen-600 text-white'
                  : 'bg-surface text-pen-700 ring-1 ring-pen-200 hover:bg-pen-50'
              }`}
          >
            {LABELS[value]}
          </button>
        )
      })}
    </div>
  )
}

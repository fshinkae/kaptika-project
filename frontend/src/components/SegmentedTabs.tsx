/**
 * Seletor de opções exclusivas (recorte do placar, janela do desempenho).
 * Acessível como tablist, navegável por teclado, alvos de toque de 44px.
 */
export function SegmentedTabs<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] flex-1 rounded-control px-4 text-sm font-medium transition
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600
              ${
                selected
                  ? 'bg-pen-600 text-white'
                  : 'bg-surface text-pen-700 ring-1 ring-pen-200 hover:bg-pen-50'
              }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

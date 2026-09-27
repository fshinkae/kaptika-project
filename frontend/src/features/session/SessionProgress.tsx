/** Acima disso as bolinhas não cabem na largura do celular: vira barra. */
const MAX_BUBBLES = 10

/**
 * Indicador de progresso da sessão (FR-005), no desenho do cartão-resposta:
 * uma bolinha por questão — marcada a atual, e as respondidas em verde (acerto)
 * ou vermelho (erro), conforme a correção devolvida pela API (SES-10).
 * Reflete o total real de questões vindo da API (FR-010).
 *
 * `results[i]`: resultado da questão de posição i+1, ou null se não respondida.
 */
export function SessionProgress({
  current,
  total,
  results = [],
}: {
  current: number
  total: number
  results?: (boolean | null)[]
}) {
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
        className="flex flex-1 items-center gap-1.5"
      >
        {total <= MAX_BUBBLES ? (
          Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-4 w-7 rounded-[50%] border-2 transition ${bubbleStyle(i, clamped, results[i] ?? null)}`}
            />
          ))
        ) : (
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-pen-600 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <span aria-hidden className="shrink-0 text-sm font-semibold tabular-nums text-ink-muted">
        {clamped}/{total}
      </span>
    </div>
  )
}

function bubbleStyle(index: number, current: number, result: boolean | null): string {
  if (result === true) return 'border-success bg-success'
  if (result === false) return 'border-danger bg-danger'
  if (index < current - 1) return 'border-pen-600 bg-pen-600'
  if (index === current - 1) return 'border-pen-600 bg-highlight'
  return 'border-line-strong bg-surface'
}

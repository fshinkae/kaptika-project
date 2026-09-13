import { Button } from './Button'

/** Estado de erro com ação de repetir (FR-010: erro sempre oferece retry). */
export function ErrorState({
  message = 'Não foi possível carregar. Tente novamente.',
  onRetry,
  compact = false,
}: {
  message?: string
  onRetry?: () => void
  /** Dentro de um card/painel: sem ocupar meia tela. */
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={
        compact
          ? 'flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200'
          : 'flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center'
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

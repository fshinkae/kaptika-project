import { Button } from './Button'

/** Estado de erro com ação de repetir (FR-010: erro sempre oferece retry). */
export function ErrorState({
  message = 'Não foi possível carregar. Tente novamente.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center"
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

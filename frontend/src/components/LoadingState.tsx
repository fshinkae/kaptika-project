/** Estado de carregamento acessível, centralizado e mobile-first (FR-010). */
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-muted"
    >
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-pen-600"
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}

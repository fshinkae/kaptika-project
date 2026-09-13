/**
 * Espaço reservado com a altura do conteúdo final: sem spinner de meia tela
 * nem salto de layout quando os dados chegam. O rótulo é anunciado.
 */
export function Skeleton({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl bg-slate-200/60 motion-safe:animate-pulse ${className}`}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}

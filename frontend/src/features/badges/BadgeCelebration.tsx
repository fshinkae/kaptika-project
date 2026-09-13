import { useEffect, useRef } from 'react'
import type { BadgeView } from './badgesApi'
import { Button } from '../../components/Button'

/**
 * Overlay de celebração de uma medalha recém-conquistada (FR-001). Acessível
 * (`role="dialog"`, foco movido para o diálogo, `Esc`/botão dispensam) e não
 * bloqueia a navegação — apenas confirma a conquista e avança a fila (FR-006).
 */
export function BadgeCelebration({ badge, onDismiss }: { badge: BadgeView; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement
    dialogRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
      // Diálogo modal com um único controle: Tab não vaza para a página por trás.
      if (e.key === 'Tab') {
        e.preventDefault()
        dialogRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [onDismiss, badge.slug])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6"
      onClick={onDismiss}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-celebration-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <p aria-live="assertive" className="text-sm font-medium uppercase tracking-wide text-indigo-600">
          Nova medalha!
        </p>
        <div
          aria-hidden
          className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl"
        >
          🏅
        </div>
        <h2 id="badge-celebration-title" className="mt-4 text-lg font-semibold text-slate-800">
          {badge.name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{badge.description}</p>
        <div className="mt-6">
          <Button onClick={onDismiss}>Continuar</Button>
        </div>
      </div>
    </div>
  )
}

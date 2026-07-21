import type { ReactNode } from 'react'

/** Estado vazio genérico (FR-010). */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

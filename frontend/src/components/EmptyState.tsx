import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassName } from './Button'

export interface EmptyStateAction {
  to: string
  label: string
}

/** O próximo passo de quase todo vazio do app: responder a primeira sessão. */
export const START_SESSION_ACTION: EmptyStateAction = { to: '/estudar', label: 'Começar uma sessão' }

/** Estado vazio genérico (FR-010). Com `action`, o vazio aponta o próximo passo (VAZ-1). */
export function EmptyState({
  children,
  action,
}: {
  children: ReactNode
  action?: EmptyStateAction
}) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 px-6 text-center text-sm text-ink-muted">
      <div>{children}</div>
      {action && (
        <div className="w-full max-w-xs">
          <Link to={action.to} className={buttonClassName('primary')}>
            {action.label}
          </Link>
        </div>
      )}
    </div>
  )
}

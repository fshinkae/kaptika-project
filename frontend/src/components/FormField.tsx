import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  /** Regra do campo visível antes do erro (some quando há erro, que a repete). */
  hint?: string
  /** Ação dentro do campo, à direita (ex.: mostrar senha). */
  action?: ReactNode
}

/**
 * Campo de formulário acessível: label associada, erro anunciado por
 * aria-describedby, alvo de toque confortável (FR-002, FR-011).
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, action, id, ...props }, ref) => {
    const fieldId = id ?? props.name
    const errorId = error ? `${fieldId}-error` : undefined
    const hintId = hint && !error ? `${fieldId}-hint` : undefined
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="relative">
          <input
            id={fieldId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId ?? hintId}
            className={`min-h-[44px] w-full rounded-control border border-line-strong bg-surface px-3 text-base
              focus-visible:border-pen-600 focus-visible:outline-2 focus-visible:outline-pen-600
              aria-[invalid=true]:border-danger ${action ? 'pr-24' : ''}`}
            {...props}
          />
          {action && <div className="absolute inset-y-0 right-0 flex items-center">{action}</div>}
        </div>
        {hintId && (
          <p id={hintId} className="text-sm text-ink-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    )
  },
)

FormField.displayName = 'FormField'

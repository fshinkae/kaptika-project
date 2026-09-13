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
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="relative">
          <input
            id={fieldId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId ?? hintId}
            className={`min-h-[44px] w-full rounded-xl border border-slate-500/80 bg-white px-3 text-base
              focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500
              aria-[invalid=true]:border-red-500 ${action ? 'pr-24' : ''}`}
            {...props}
          />
          {action && <div className="absolute inset-y-0 right-0 flex items-center">{action}</div>}
        </div>
        {hintId && (
          <p id={hintId} className="text-sm text-slate-600">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    )
  },
)

FormField.displayName = 'FormField'

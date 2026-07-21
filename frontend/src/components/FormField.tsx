import { forwardRef, type InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

/**
 * Campo de formulário acessível: label associada, erro anunciado por
 * aria-describedby, alvo de toque confortável (FR-002, FR-011).
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId = id ?? props.name
    const errorId = error ? `${fieldId}-error` : undefined
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base
            focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500
            aria-[invalid=true]:border-red-500"
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)

FormField.displayName = 'FormField'

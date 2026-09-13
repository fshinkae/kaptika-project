import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const styles: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:shadow-none',
  secondary: 'bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** Classes do botão, para links que precisam parecer botão (ex.: navegação). */
export function buttonClassName(variant: Variant = 'primary', className = ''): string {
  return `inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 text-base font-semibold
    transition duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
    disabled:cursor-not-allowed disabled:hover:translate-y-0 ${styles[variant]} ${className}`
}

/** Botão mobile-first: alvo de toque ≥44px, foco visível (FR-011). */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />
}

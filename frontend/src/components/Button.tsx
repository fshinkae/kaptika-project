import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const styles: Record<Variant, string> = {
  // Primário "carimbado": borda inferior sólida que afunda ao tocar.
  primary:
    'bg-pen-600 text-white shadow-stamp hover:bg-pen-700 active:translate-y-[2px] active:shadow-none disabled:bg-pen-300 disabled:shadow-none disabled:active:translate-y-0',
  secondary: 'bg-surface text-pen-700 ring-1 ring-line hover:bg-pen-50 hover:ring-pen-200',
}

type Size = 'md' | 'lg'

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] rounded-control text-base',
  lg: 'min-h-14 rounded-card text-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** Classes do botão, para links que precisam parecer botão (ex.: navegação). */
export function buttonClassName(
  variant: Variant = 'primary',
  className = '',
  size: Size = 'md',
): string {
  return `inline-flex w-full items-center justify-center px-4 font-semibold transition duration-150
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600
    disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`
}

/** Botão mobile-first: alvo de toque ≥44px, foco visível (FR-011). */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />
}

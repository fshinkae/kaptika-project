import { Link, type LinkProps } from 'react-router-dom'

/** Link de texto das telas de acesso: visual inline, alvo de toque de 44px. */
export function TextLink({ className = '', ...props }: LinkProps) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-indigo-600
        underline-offset-2 hover:underline
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${className}`}
      {...props}
    />
  )
}

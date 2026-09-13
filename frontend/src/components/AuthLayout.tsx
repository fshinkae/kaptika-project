import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

/** Moldura mobile-first das telas de autenticação. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <Link
          to="/"
          aria-label="Kaptika"
          className="inline-flex rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pen-600"
        >
          <Logo />
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-ink-muted">{subtitle}</p>}
      </header>
      {children}
      {footer && <div className="text-center text-sm text-ink-muted">{footer}</div>}
    </main>
  )
}

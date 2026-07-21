import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Moldura mobile-first das telas de autenticação. */
export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          Kaptika
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-slate-800">{title}</h1>
      </header>
      {children}
      {footer && <div className="text-center text-sm text-slate-600">{footer}</div>}
    </main>
  )
}

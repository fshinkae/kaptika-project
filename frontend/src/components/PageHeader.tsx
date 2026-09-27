import type { ReactNode } from 'react'

/**
 * Cabeçalho de página único (DS-3): o mesmo tamanho de título em todas as
 * telas, e sempre um h1 para o leitor de tela. `above` fica acima do título
 * (ex.: a marca na tela inicial).
 */
export function PageHeader({
  title,
  subtitle,
  above,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  above?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex flex-col gap-1.5 ${className}`}>
      {above && <div className="mb-3.5">{above}</div>}
      <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-base text-ink-muted">{subtitle}</p>}
    </header>
  )
}

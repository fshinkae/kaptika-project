import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/apiClient'
import { Button } from '../../components/Button'
import { AREAS, type AreaSlug } from './sessionApi'

/** Depois disso a espera deixa de ser "normal" e o estudante merece saber por quê. */
const SLOW_START_MS = 4000

/**
 * Escolha da área do ENEM e início da sessão (FR-001). Mostra estados de
 * carregando/erro; 503 (fonte de questões indisponível) vira mensagem clara.
 */
export function AreaSelect({
  onStart,
  isStarting,
  startingArea,
  error,
}: {
  onStart: (area: AreaSlug) => void
  isStarting: boolean
  startingArea: AreaSlug | null
  error: unknown
}) {
  if (isStarting && startingArea) {
    return <SessionStarting areaLabel={areaLabel(startingArea)} />
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Escolha uma área</h1>
        <p className="text-slate-600">Responda uma sessão curta e ganhe XP.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {AREAS.map((area) => (
          <li key={area.slug}>
            <Button variant="secondary" onClick={() => onStart(area.slug)}>
              {area.label}
            </Button>
          </li>
        ))}
      </ul>

      {error != null && (
        <p role="alert" className="text-sm text-red-700">
          {startErrorMessage(error)}
        </p>
      )}
    </main>
  )
}

/**
 * Criação da sessão (SES-1): a API busca as questões ao vivo na enem.dev e pode
 * levar alguns segundos. Em vez de um "Iniciando…" perdido num botão, a tela
 * antecipa a questão e explica a espera quando ela passa do normal.
 */
function SessionStarting({ areaLabel }: { areaLabel: string }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_START_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-slate-800">Separando questões de {areaLabel}…</p>
        <p className="min-h-5 text-sm text-slate-600">
          {slow ? 'Buscando na base do ENEM. Leva alguns segundos.' : ''}
        </p>
      </div>

      <div aria-hidden className="flex flex-col gap-3 motion-safe:animate-pulse">
        <div className="h-2 w-full rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-11/12 rounded bg-slate-200" />
        <div className="h-4 w-4/5 rounded bg-slate-200" />
        <div className="mt-2 h-5 w-3/4 rounded bg-slate-300/70" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white ring-1 ring-slate-200" />
        ))}
      </div>
    </main>
  )
}

function areaLabel(slug: AreaSlug): string {
  return AREAS.find((a) => a.slug === slug)?.label ?? slug
}

/** Mensagem amigável por status: 503 indisponibilidade da fonte de questões. */
function startErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return 'A fonte de questões está indisponível no momento. Tente novamente em instantes.'
    }
    if (error.status === 422) {
      return error.message
    }
  }
  return 'Não foi possível iniciar a sessão. Tente novamente.'
}

import { ApiError } from '../../lib/apiClient'
import { Button } from '../../components/Button'
import { AREAS, type AreaSlug } from './sessionApi'

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
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Escolha uma área</h1>
        <p className="text-slate-600">Responda uma sessão curta e ganhe XP.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {AREAS.map((area) => {
          const loadingThis = isStarting && startingArea === area.slug
          return (
            <li key={area.slug}>
              <Button
                variant="secondary"
                onClick={() => onStart(area.slug)}
                disabled={isStarting}
                aria-busy={loadingThis}
              >
                {loadingThis ? 'Iniciando…' : area.label}
              </Button>
            </li>
          )
        })}
      </ul>

      {error != null && (
        <p role="alert" className="text-sm text-red-600">
          {startErrorMessage(error)}
        </p>
      )}
    </main>
  )
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

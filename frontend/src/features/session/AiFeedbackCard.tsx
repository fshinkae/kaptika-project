import { useMutation } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Skeleton } from '../../components/Skeleton'
import { ApiError } from '../../lib/apiClient'
import { getSessionFeedback } from './sessionApi'

/**
 * Análise de IA da sessão (008). Só é pedida quando o estudante toca no botão,
 * para não gastar IA à toa. O texto vive só em memória: sair do resumo o descarta.
 */
export function AiFeedbackCard({ sessionId }: { sessionId: string }) {
  const feedback = useMutation({ mutationFn: () => getSessionFeedback(sessionId) })

  if (feedback.isPending) {
    return <Skeleton label="Analisando sua sessão…" className="h-[120px]" />
  }
  if (feedback.isError) {
    const limited = feedback.error instanceof ApiError && feedback.error.code === 'rate_limited'
    return (
      <ErrorState
        compact
        message={
          limited
            ? feedback.error.message
            : 'Não foi possível gerar a análise agora.'
        }
        onRetry={limited ? undefined : () => feedback.mutate()}
      />
    )
  }

  return (
    <section
      aria-labelledby="session-feedback-heading"
      className="flex flex-col gap-3 rounded-card bg-surface p-5 ring-1 ring-line"
    >
      <h2 id="session-feedback-heading" className="font-display text-base font-bold text-ink">
        Análise da sessão
      </h2>
      {feedback.isSuccess ? (
        <p aria-live="polite" className="text-sm leading-relaxed text-ink">
          {feedback.data.text}
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Veja o que foi bem e o que melhorar, em poucas linhas.
          </p>
          <Button variant="secondary" onClick={() => feedback.mutate()}>
            Ver análise
          </Button>
        </>
      )}
    </section>
  )
}

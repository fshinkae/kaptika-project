import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { AreaSelect } from './AreaSelect'
import { QuestionCard } from './QuestionCard'
import { SessionProgress } from './SessionProgress'
import { SessionSummaryView } from './SessionSummaryView'
import {
  answerQuestion,
  createSession,
  finishSession,
  getSession,
  type AnswerResult,
  type AreaSlug,
  type SessionResponse,
  type SessionSummary,
} from './sessionApi'

/**
 * Página de topo do fluxo de sessões (feature 002). Máquina de estados
 * autocontida: escolha de área → responder uma questão por vez → resumo.
 * O frontend reflete o estado da API; nada de correção/progresso local.
 */
export function SessionFlowPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [startingArea, setStartingArea] = useState<AreaSlug | null>(null)

  const createMutation = useMutation({
    mutationFn: (area: AreaSlug) => createSession(area),
    // A resposta de criação traz o id; o GET da sessão é a fonte de verdade
    // do estado (questões, nextQuestionId), refletido em <ActiveSession>.
    onSuccess: (session) => setSessionId(session.id),
  })

  function reset() {
    setSessionId(null)
    setSummary(null)
    setStartingArea(null)
    createMutation.reset()
  }

  if (summary) {
    return <SessionSummaryView summary={summary} onRestart={reset} />
  }

  if (sessionId) {
    return (
      <ActiveSession
        sessionId={sessionId}
        onFinished={(result) => {
          setSummary(result)
          setSessionId(null)
        }}
      />
    )
  }

  return (
    <AreaSelect
      onStart={(area) => {
        setStartingArea(area)
        createMutation.mutate(area)
      }}
      isStarting={createMutation.isPending}
      startingArea={startingArea}
      error={createMutation.error}
    />
  )
}

/** Condução da sessão ativa: uma questão por vez, feedback e encerramento. */
function ActiveSession({
  sessionId,
  onFinished,
}: {
  sessionId: string
  onFinished: (summary: SessionSummary) => void
}) {
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  const query = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
  })

  const answerMutation = useMutation({
    mutationFn: (input: { questionId: string; alternative: string }) =>
      answerQuestion(sessionId, input),
    onSuccess: (result) => setFeedback(result),
  })

  const finishMutation = useMutation({
    mutationFn: () => finishSession(sessionId),
    onSuccess: onFinished,
  })

  if (query.isPending) return <LoadingState label="Carregando sessão…" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const session = query.data
  const current = session.questions.find((q) => q.questionId === session.nextQuestionId)

  async function advance() {
    // Última questão respondida encerra a sessão no backend (sessionStatus).
    if (feedback && feedback.sessionStatus !== 'ACTIVE') {
      finishMutation.mutate()
      return
    }
    // Reflete o novo estado antes de limpar o feedback, evitando reexibir a
    // questão anterior (já respondida) durante o refetch.
    await query.refetch()
    setFeedback(null)
    answerMutation.reset()
  }

  const total = session.totalQuestions

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <SessionProgress current={current?.position ?? session.answeredCount} total={total} />

      {current ? (
        <>
          <QuestionCard
            key={current.questionId}
            question={current}
            feedback={feedback}
            onConfirm={(alternative) =>
              answerMutation.mutate({ questionId: current.questionId, alternative })
            }
            isSubmitting={answerMutation.isPending}
            onNext={advance}
            nextLabel={
              feedback && feedback.sessionStatus !== 'ACTIVE' ? 'Ver resumo' : 'Próxima questão'
            }
          />
          {answerMutation.isError && !feedback && (
            <p role="alert" className="text-sm text-red-600">
              {answerErrorMessage(answerMutation.error)}
            </p>
          )}
        </>
      ) : (
        // Sem próxima questão pendente: sessão já concluída — oferece o resumo.
        <EmptyState>
          <p>Você respondeu todas as questões desta sessão.</p>
          <div className="mt-4 w-full">
            <Button onClick={() => finishMutation.mutate()} disabled={finishMutation.isPending}>
              {finishMutation.isPending ? 'Carregando…' : 'Ver resumo'}
            </Button>
          </div>
        </EmptyState>
      )}

      <FinishControls
        confirming={confirmingFinish}
        isFinishing={finishMutation.isPending}
        onAsk={() => setConfirmingFinish(true)}
        onCancel={() => setConfirmingFinish(false)}
        onConfirm={() => finishMutation.mutate()}
      />

      {finishMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Não foi possível encerrar a sessão. Tente novamente.
        </p>
      )}
    </main>
  )
}

/** Encerrar antecipadamente (FR-008) com passo de confirmação. */
function FinishControls({
  confirming,
  isFinishing,
  onAsk,
  onCancel,
  onConfirm,
}: {
  confirming: boolean
  isFinishing: boolean
  onAsk: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onAsk}
        className="min-h-[44px] text-sm font-medium text-slate-500 underline-offset-2 hover:underline
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Encerrar sessão
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm text-slate-700">
        Encerrar agora? Você verá o resumo do que já respondeu.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isFinishing}>
          Continuar
        </Button>
        <Button onClick={onConfirm} disabled={isFinishing}>
          {isFinishing ? 'Encerrando…' : 'Encerrar'}
        </Button>
      </div>
    </div>
  )
}

function answerErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return error.message
  }
  return 'Não foi possível registrar a resposta. Tente novamente.'
}

/** Reexport de tipo para conveniência de quem consome a página. */
export type { SessionResponse }

export default SessionFlowPage

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { AreaSelect } from './AreaSelect'
import { QuestionCard } from './QuestionCard'
import {
  FinishControls,
  PausedPanel,
  SessionControls,
  useStudyStopwatch,
} from './SessionControls'
import { SessionProgress } from './SessionProgress'
import { SessionSummaryView } from './SessionSummaryView'
import {
  answerQuestion,
  createSession,
  finishSession,
  getActiveSession,
  getSession,
  AREAS,
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
  // Só existe uma sessão ativa por estudante (FR-011): se ela for de outra
  // área, o POST devolve a ativa em vez de criar. Guardamos esse caso para
  // perguntar ao estudante em vez de levá-lo silenciosamente à área errada.
  const [conflict, setConflict] = useState<SessionResponse | null>(null)
  const queryClient = useQueryClient()

  // Retomada direta (FR-008): quem já tem sessão ativa não passa pela escolha
  // de área. Falha nessa consulta não bloqueia — cai na escolha de área, e o
  // POST de criação ainda devolve a ativa.
  const activeQuery = useQuery({
    queryKey: ['session', 'active'],
    queryFn: getActiveSession,
    retry: false,
    gcTime: 0,
  })

  const createMutation = useMutation({
    mutationFn: (area: AreaSlug) => createSession(area),
    // A resposta de criação traz o id; o GET da sessão é a fonte de verdade
    // do estado (questões, nextQuestionId), refletido em <ActiveSession>.
    onSuccess: (session, area) => {
      if (session.area !== area) {
        setConflict(session)
        return
      }
      setSessionId(session.id)
    },
  })

  // Descartar a sessão ativa de outra área: encerra (FR-009) e cria a pedida.
  const switchAreaMutation = useMutation({
    mutationFn: async (input: { activeId: string; area: AreaSlug }) => {
      await finishSession(input.activeId)
      return createSession(input.area)
    },
    onSuccess: (session) => {
      setConflict(null)
      setSessionId(session.id)
    },
  })

  function reset() {
    setSessionId(null)
    setSummary(null)
    setStartingArea(null)
    setConflict(null)
    createMutation.reset()
    switchAreaMutation.reset()
    // A ativa mudou (encerrada/criada): reconsulta antes de decidir a tela.
    queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
  }

  if (summary) {
    return <SessionSummaryView summary={summary} onRestart={reset} />
  }

  if (conflict && startingArea) {
    return (
      <AreaConflict
        active={conflict}
        requestedArea={startingArea}
        isSwitching={switchAreaMutation.isPending}
        error={switchAreaMutation.error}
        onResume={() => {
          setConflict(null)
          setSessionId(conflict.id)
        }}
        onSwitch={() =>
          switchAreaMutation.mutate({ activeId: conflict.id, area: startingArea })
        }
      />
    )
  }

  if (sessionId) {
    return (
      <ActiveSession
        sessionId={sessionId}
        onFinished={(result) => {
          setSummary(result)
          setSessionId(null)
          queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
        }}
      />
    )
  }

  if (activeQuery.isPending) {
    return <LoadingState label="Carregando sua sessão…" />
  }

  if (activeQuery.data) {
    return (
      <ActiveSession
        sessionId={activeQuery.data.id}
        onFinished={(result) => {
          setSummary(result)
          setSessionId(null)
          queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
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

/**
 * Sessão ativa de outra área bloqueando a escolha (FR-011): o estudante decide
 * entre retomar o que já começou ou encerrá-la e iniciar na área pedida.
 */
function AreaConflict({
  active,
  requestedArea,
  isSwitching,
  error,
  onResume,
  onSwitch,
}: {
  active: SessionResponse
  requestedArea: AreaSlug
  isSwitching: boolean
  error: unknown
  onResume: () => void
  onSwitch: () => void
}) {
  const activeLabel = AREAS.find((a) => a.slug === active.area)?.label ?? active.area
  const requestedLabel = AREAS.find((a) => a.slug === requestedArea)?.label ?? requestedArea

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Você tem uma sessão em andamento</h1>
        <p className="text-slate-600">
          Ela é de <strong>{activeLabel}</strong> ({active.answeredCount} de {active.totalQuestions}{' '}
          respondidas). Só é possível ter uma sessão por vez.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button onClick={onResume} disabled={isSwitching}>
          Continuar em {activeLabel}
        </Button>
        <Button variant="secondary" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? 'Encerrando…' : `Encerrar e começar em ${requestedLabel}`}
        </Button>
      </div>

      {error != null && (
        <p role="alert" className="text-sm text-red-600">
          Não foi possível trocar de área. Tente novamente.
        </p>
      )}
    </main>
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

  // O cronômetro conta desde o início real da sessão (createdAt da API);
  // enquanto ela carrega, usa "agora" e se ajusta no primeiro render com dados.
  const stopwatch = useStudyStopwatch(query.data?.createdAt ?? new Date().toISOString())

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
      <SessionControls
        elapsed={stopwatch.elapsed}
        paused={stopwatch.paused}
        onPause={stopwatch.pause}
        onResume={stopwatch.resume}
        disabled={answerMutation.isPending || finishMutation.isPending}
      />

      <SessionProgress current={current?.position ?? session.answeredCount} total={total} />

      {stopwatch.paused ? (
        <PausedPanel onResume={stopwatch.resume} />
      ) : current ? (
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

function answerErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return error.message
  }
  return 'Não foi possível registrar a resposta. Tente novamente.'
}

/** Reexport de tipo para conveniência de quem consome a página. */
export type { SessionResponse }

export default SessionFlowPage

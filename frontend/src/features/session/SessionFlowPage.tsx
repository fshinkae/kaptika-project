import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/apiClient'
import { useFocusMode } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { CloseIcon } from '../../components/Icons'
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

/** Caches derivados de sessões concluídas: XP, ofensiva, medalhas e placar mudam no backend. */
const PROGRESS_QUERY_KEYS = [['xp'], ['streak'], ['badges'], ['profile'], ['leaderboard']]

/**
 * Página de topo do fluxo de sessões (feature 002). Máquina de estados
 * autocontida: escolha de área → responder uma questão por vez → resumo.
 * O frontend reflete o estado da API; nada de correção/progresso local.
 */
export function SessionFlowPage() {
  const [session, setSession] = useState<SessionResponse | null>(null)
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

  function refreshProgress() {
    queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
    for (const queryKey of PROGRESS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey })
    }
  }

  const createMutation = useMutation({
    mutationFn: (area: AreaSlug) => createSession(area),
    // A resposta de criação já é o estado completo da sessão (SES-4): a
    // condução parte dela, sem um GET extra antes da 1ª questão.
    onSuccess: (created, area) => {
      if (created.area !== area) {
        setConflict(created)
        return
      }
      setSession(created)
    },
  })

  // Descartar a sessão ativa de outra área: encerra (FR-009) e cria a pedida.
  const switchAreaMutation = useMutation({
    mutationFn: async (input: { activeId: string; area: AreaSlug }) => {
      await finishSession(input.activeId)
      return createSession(input.area)
    },
    onSuccess: (created) => {
      setConflict(null)
      setSession(created)
      refreshProgress()
    },
  })

  function reset() {
    setSession(null)
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
          setSession(conflict)
        }}
        onSwitch={() =>
          switchAreaMutation.mutate({ activeId: conflict.id, area: startingArea })
        }
      />
    )
  }

  const current = session ?? activeQuery.data
  if (current) {
    return (
      <ActiveSession
        key={current.id}
        initial={current}
        onFinished={(result) => {
          setSummary(result)
          setSession(null)
          // Encerrar gera XP, ofensiva e medalhas no backend: a UI reconsulta
          // em vez de supor os novos valores (RES-1).
          refreshProgress()
        }}
      />
    )
  }

  if (activeQuery.isPending) {
    return <LoadingState label="Carregando sua sessão…" />
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
        <h1 className="text-2xl font-bold text-ink">Você tem uma sessão em andamento</h1>
        <p className="text-ink-muted">
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
        <p role="alert" className="text-sm text-danger">
          Não foi possível trocar de área. Tente novamente.
        </p>
      )}
    </main>
  )
}

/**
 * Condução da sessão ativa: uma questão por vez, feedback e encerramento. Parte
 * do estado já recebido da API e só volta a ela para avançar.
 */
function ActiveSession({
  initial,
  onFinished,
}: {
  initial: SessionResponse
  onFinished: (summary: SessionSummary) => void
}) {
  const [session, setSession] = useState(initial)
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const navigate = useNavigate()
  // O cronômetro conta desde o início real da sessão (createdAt da API).
  const stopwatch = useStudyStopwatch(session.createdAt)
  useFocusMode()

  const answerMutation = useMutation({
    mutationFn: (input: { questionId: string; alternative: string }) =>
      answerQuestion(session.id, input),
    onSuccess: (result) => setFeedback(result),
  })

  // Depois de responder, o GET da sessão é a fonte do novo nextQuestionId. O
  // feedback só é limpo com o novo estado em mãos, para não reexibir a questão
  // já respondida.
  const reloadMutation = useMutation({
    mutationFn: () => getSession(session.id),
    onSuccess: (next) => {
      setSession(next)
      setFeedback(null)
      answerMutation.reset()
    },
  })

  const finishMutation = useMutation({
    mutationFn: () => finishSession(session.id),
    onSuccess: onFinished,
  })

  if (reloadMutation.isError) return <ErrorState onRetry={() => reloadMutation.mutate()} />

  const current = session.questions.find((q) => q.questionId === session.nextQuestionId)

  function advance() {
    // Última questão respondida encerra a sessão no backend (sessionStatus).
    if (feedback && feedback.sessionStatus !== 'ACTIVE') {
      finishMutation.mutate()
      return
    }
    reloadMutation.mutate()
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-3 pb-8">
      <header className="flex items-center gap-2">
        {/* A navegação some durante a sessão (modo foco); sair não perde nada,
            porque o progresso fica salvo e a sessão é retomada em Estudar. */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Sair da sessão"
          title="Sair (o progresso fica salvo)"
          className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted
            transition hover:bg-paper
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600"
        >
          <CloseIcon className="h-6 w-6" />
        </button>
        <SessionProgress
          current={current?.position ?? session.answeredCount}
          total={session.totalQuestions}
          results={answerResults(session, feedback)}
        />
      </header>

      <SessionControls
        elapsed={stopwatch.elapsed}
        paused={stopwatch.paused}
        onPause={stopwatch.pause}
        onResume={stopwatch.resume}
        disabled={answerMutation.isPending || finishMutation.isPending}
      />

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
            <p role="alert" className="text-sm text-danger">
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
        <p role="alert" className="text-sm text-danger">
          Não foi possível encerrar a sessão. Tente novamente.
        </p>
      )}
    </main>
  )
}

/**
 * Acerto/erro por posição, na ordem das bolinhas (SES-10): as respostas já
 * registradas vêm da sessão; a que acabou de ser corrigida, do feedback.
 */
function answerResults(session: SessionResponse, feedback: AnswerResult | null): (boolean | null)[] {
  const byQuestion = new Map(session.answers.map((a) => [a.questionId, a.correct]))
  if (feedback) byQuestion.set(feedback.questionId, feedback.correct)
  return [...session.questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => byQuestion.get(q.questionId) ?? null)
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

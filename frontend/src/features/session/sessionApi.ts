import { apiFetch } from '../../lib/apiClient'

/** Áreas do ENEM (slug aceito pela API). Ordem = ordem de exibição. */
export const AREAS = [
  { slug: 'linguagens', label: 'Linguagens' },
  { slug: 'ciencias-humanas', label: 'Ciências Humanas' },
  { slug: 'ciencias-natureza', label: 'Ciências da Natureza' },
  { slug: 'matematica', label: 'Matemática' },
] as const

export type AreaSlug = (typeof AREAS)[number]['slug']

/** Status possíveis de uma sessão, refletindo o enum do backend. */
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED'

/** Uma alternativa de questão (sem indicação de correta). */
export interface AlternativeView {
  letter: string
  text: string
}

/**
 * Questão servida ao cliente — SEM gabarito (a alternativa correta só
 * aparece no resultado de uma resposta). Reflete QuestionView do backend.
 */
export interface QuestionView {
  questionId: string
  position: number
  statement: string
  context: string | null
  alternatives: AlternativeView[]
}

/** Resposta já registrada nesta sessão (sem a alternativa correta). */
export interface AnswerView {
  questionId: string
  chosen: string
  correct: boolean
}

/** Estado completo da sessão para condução/retomada (GET /sessions/{id}). */
export interface SessionResponse {
  id: string
  area: string
  status: SessionStatus
  totalQuestions: number
  answeredCount: number
  correctCount: number
  wrongCount: number
  createdAt: string
  questions: QuestionView[]
  answers: AnswerView[]
  nextQuestionId: string | null
}

/** Resultado da correção server-side de uma resposta (POST /answers). */
export interface AnswerResult {
  questionId: string
  chosen: string
  correct: boolean
  correctAlternative: string
  answeredCount: number
  totalQuestions: number
  sessionStatus: SessionStatus
}

/** Resumo final/parcial da sessão (POST /finish). */
export interface SessionSummary {
  sessionId: string
  area: string
  status: SessionStatus
  correctCount: number
  wrongCount: number
  totalQuestions: number
  answeredCount: number
  startedAt: string
  finishedAt: string | null
}

/** Cria a sessão da área ou devolve a ativa existente (idempotente). */
export function createSession(area: AreaSlug): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ area }),
  })
}

/** Estado atual da sessão para condução/retomada. */
export function getSession(id: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>(`/sessions/${id}`)
}

/** Registra a resposta e recebe a correção do backend. */
export function answerQuestion(
  id: string,
  input: { questionId: string; alternative: string },
): Promise<AnswerResult> {
  return apiFetch<AnswerResult>(`/sessions/${id}/answers`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Encerra a sessão (idempotente) e recebe o resumo. */
export function finishSession(id: string): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(`/sessions/${id}/finish`, {
    method: 'POST',
  })
}

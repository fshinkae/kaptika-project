import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { SessionFlowPage } from './SessionFlowPage'
import type { AnswerResult, SessionResponse } from './sessionApi'

const API = 'http://api.test'

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

function question(id: string, position: number) {
  return {
    questionId: id,
    position,
    statement: `Enunciado ${position}`,
    context: `Contexto ${position}`,
    alternatives: [
      { letter: 'A', text: `Alt A ${position}` },
      { letter: 'B', text: `Alt B ${position}` },
      { letter: 'C', text: `Alt C ${position}` },
    ],
  }
}

/** Estado base: sessão de 2 questões, nenhuma respondida. */
function baseSession(overrides: Partial<SessionResponse> = {}): SessionResponse {
  return {
    id: 's1',
    area: 'matematica',
    status: 'ACTIVE',
    totalQuestions: 2,
    answeredCount: 0,
    correctCount: 0,
    wrongCount: 0,
    createdAt: '2026-07-20T00:00:00Z',
    questions: [question('q1', 1), question('q2', 2)],
    answers: [],
    nextQuestionId: 'q1',
    ...overrides,
  }
}

function answerResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    questionId: 'q1',
    chosen: 'A',
    correct: true,
    correctAlternative: 'A',
    answeredCount: 1,
    totalQuestions: 2,
    sessionStatus: 'ACTIVE',
    ...overrides,
  }
}

describe('SessionFlowPage', () => {
  it('inicia a sessão e mostra a 1ª questão SEM gabarito (FR-001, FR-003, SC-006)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))

    // Primeira questão visível
    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
    // Botão de confirmar presente (exige seleção+confirmação antes de revelar)
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    // Nenhum feedback de correção antes de responder
    expect(screen.queryByText(/você acertou/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/resposta incorreta/i)).not.toBeInTheDocument()
  })

  it('confirmar mostra a correção e a alternativa correta vinda da API (FR-004)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
      http.post(`${API}/sessions/s1/answers`, () =>
        HttpResponse.json(answerResult({ chosen: 'B', correct: false, correctAlternative: 'A' })),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('radio', { name: /Alt B 1/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(/resposta incorreta/i)).toBeInTheDocument()
    expect(screen.getByText(/alternativa A/i)).toBeInTheDocument()
  })

  it('nunca renderiza a alternativa correta antes de responder', async () => {
    authenticate()
    // Handler que falharia o teste se a UI tentasse deduzir gabarito: o GET/POST
    // de criação não trazem correctAlternative, então basta garantir ausência.
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await screen.findByRole('heading', { name: 'Enunciado 1' })

    // Nenhuma marca de correto/errado deve existir enquanto não há resposta
    expect(screen.queryByText(/alternativa [A-E]/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/acertou|incorreta/i)).not.toBeInTheDocument()
  })

  it('não envia resposta duplicada em toques repetidos (FR-006, SC-003)', async () => {
    authenticate()
    let answerCalls = 0
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
      http.post(`${API}/sessions/s1/answers`, async () => {
        answerCalls += 1
        // Mantém a mutação pendente para que o 2º clique caia no botão desabilitado
        await delay(40)
        return HttpResponse.json(answerResult())
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('radio', { name: /Alt A 1/ }))
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    // Dois cliques rápidos: o segundo não deve gerar novo POST
    await user.click(confirm)
    await user.click(confirm)

    expect(await screen.findByText(/você acertou/i)).toBeInTheDocument()
    expect(answerCalls).toBe(1)
  })

  it('avança para a próxima questão e reflete o progresso (FR-005)', async () => {
    authenticate()
    let getCalls = 0
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => {
        getCalls += 1
        // 1ª chamada: q1 pendente; após responder e avançar: q2 pendente
        return HttpResponse.json(
          getCalls <= 1
            ? baseSession()
            : baseSession({ answeredCount: 1, nextQuestionId: 'q2' }),
        )
      }),
      http.post(`${API}/sessions/s1/answers`, () => HttpResponse.json(answerResult())),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('radio', { name: /Alt A 1/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(await screen.findByRole('button', { name: 'Próxima questão' }))

    expect(await screen.findByRole('heading', { name: 'Enunciado 2' })).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('encerra a sessão e mostra o resumo (FR-007, FR-008)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
      http.post(`${API}/sessions/s1/finish`, () =>
        HttpResponse.json({
          sessionId: 's1',
          area: 'matematica',
          status: 'COMPLETED',
          correctCount: 1,
          wrongCount: 0,
          totalQuestions: 2,
          answeredCount: 1,
          startedAt: '2026-07-20T00:00:00Z',
          finishedAt: '2026-07-20T00:05:00Z',
        }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('button', { name: 'Encerrar sessão' }))
    await user.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(await screen.findByRole('heading', { name: 'Sessão concluída' })).toBeInTheDocument()
    expect(screen.getByText('Acertos')).toBeInTheDocument()
  })

  it('responder a última questão leva ao resumo (fim de sessão)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, () =>
        // Sessão de 1 questão só
        HttpResponse.json(
          baseSession({ totalQuestions: 1, questions: [question('q1', 1)], nextQuestionId: 'q1' }),
          { status: 201 },
        ),
      ),
      http.get(`${API}/sessions/s1`, () =>
        HttpResponse.json(
          baseSession({ totalQuestions: 1, questions: [question('q1', 1)], nextQuestionId: 'q1' }),
        ),
      ),
      http.post(`${API}/sessions/s1/answers`, () =>
        HttpResponse.json(
          answerResult({ answeredCount: 1, totalQuestions: 1, sessionStatus: 'COMPLETED' }),
        ),
      ),
      http.post(`${API}/sessions/s1/finish`, () =>
        HttpResponse.json({
          sessionId: 's1',
          area: 'matematica',
          status: 'COMPLETED',
          correctCount: 1,
          wrongCount: 0,
          totalQuestions: 1,
          answeredCount: 1,
          startedAt: '2026-07-20T00:00:00Z',
          finishedAt: '2026-07-20T00:05:00Z',
        }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('radio', { name: /Alt A 1/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(await screen.findByRole('button', { name: 'Ver resumo' }))

    expect(await screen.findByRole('heading', { name: 'Sessão concluída' })).toBeInTheDocument()
  })

  it('503 ao iniciar mostra mensagem clara de fonte indisponível (FR-009, SC-004)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, () =>
        HttpResponse.json(
          { code: 'source_unavailable', message: 'fonte indisponível', correlationId: 'c' },
          { status: 503 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))

    expect(await screen.findByText(/fonte de questões está indisponível/i)).toBeInTheDocument()
    // A área continua clicável para tentar novamente
    expect(screen.getByRole('button', { name: 'Matemática' })).toBeEnabled()
  })

  it('erro ao carregar a sessão oferece tentar novamente (FR-009)', async () => {
    authenticate()
    let getCalls = 0
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => {
        getCalls += 1
        // 1ª carga falha; retry funciona
        return getCalls <= 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(baseSession())
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    // A criação semeia o cache, então forço um refetch: primeiro invalido via retry.
    // O erro aparece quando o refetch falha; garantimos o caminho de retry.
    const retry = await screen.findByRole('button', { name: 'Tentar novamente' })
    await user.click(retry)

    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
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
      { letter: 'A', text: `Alt A ${position}`, file: null },
      { letter: 'B', text: `Alt B ${position}`, file: null },
      { letter: 'C', text: `Alt C ${position}`, file: null },
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
  // Sem sessão ativa por padrão: a tela abre na escolha de área.
  beforeEach(() => {
    server.use(
      http.get(`${API}/sessions/active`, () => new HttpResponse(null, { status: 204 })),
      // Resumo lê o progresso da API depois de encerrar (RES-1)
      http.get(`${API}/me/xp`, () =>
        HttpResponse.json({ xpTotal: 10, level: 1, xpToNextLevel: 90, xpInPeriod: 10 }),
      ),
      http.get(`${API}/me/streak`, () =>
        HttpResponse.json({
          current: 1,
          record: 1,
          freezes: 2,
          metToday: true,
          brokenSinceLastAccess: false,
          brokenAt: null,
        }),
      ),
    )
  })

  it('retoma direto a sessão ativa, sem passar pela escolha de área (FR-008)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/sessions/active`, () => HttpResponse.json(baseSession())),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
    )
    renderWithProviders(<SessionFlowPage />)

    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Matemática' })).not.toBeInTheDocument()
  })

  it('pausar para o cronômetro e esconde a questão; retomar devolve', async () => {
    authenticate()
    server.use(
      http.get(`${API}/sessions/active`, () => HttpResponse.json(baseSession())),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession())),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await screen.findByRole('heading', { name: 'Enunciado 1' })
    expect(screen.getByRole('timer', { name: 'Tempo de estudo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('heading', { name: /sessão pausada/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Enunciado 1' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retomar sessão' }))
    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
  })

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

  it('sessão ativa de outra área não vira sessão da área clicada (FR-011)', async () => {
    authenticate()
    // Backend devolve a ativa existente (200) em vez de criar na área pedida.
    server.use(
      http.post(`${API}/sessions`, () =>
        HttpResponse.json(baseSession({ area: 'linguagens', answeredCount: 1 })),
      ),
      http.get(`${API}/sessions/s1`, () => HttpResponse.json(baseSession({ area: 'linguagens' }))),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))

    // Não entra direto na sessão de outra área: pergunta o que fazer.
    expect(
      await screen.findByRole('heading', { name: /sessão em andamento/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar em Linguagens/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Enunciado 1' })).not.toBeInTheDocument()
  })

  it('encerrar a sessão ativa inicia a área escolhida (FR-011)', async () => {
    authenticate()
    let created = 0
    server.use(
      http.post(`${API}/sessions`, () => {
        created += 1
        return created === 1
          ? HttpResponse.json(baseSession({ area: 'linguagens' }))
          : HttpResponse.json(baseSession({ id: 's2', area: 'matematica' }), { status: 201 })
      }),
      http.post(`${API}/sessions/s1/finish`, () =>
        HttpResponse.json({
          sessionId: 's1',
          area: 'linguagens',
          status: 'COMPLETED',
          correctCount: 0,
          wrongCount: 0,
          totalQuestions: 2,
          answeredCount: 0,
          startedAt: '2026-07-20T00:00:00Z',
          finishedAt: '2026-07-20T00:05:00Z',
        }),
      ),
      http.get(`${API}/sessions/s2`, () =>
        HttpResponse.json(baseSession({ id: 's2', area: 'matematica' })),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('button', { name: /Encerrar e começar em Matemática/ }))

    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
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
        // Só é consultado depois de responder: q2 passa a ser a pendente
        return HttpResponse.json(baseSession({ answeredCount: 1, nextQuestionId: 'q2' }))
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
    expect(getCalls).toBe(1)
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
    await user.click(await screen.findByRole('button', { name: 'Encerrar e ver resumo' }))
    await user.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(await screen.findByRole('heading', { name: 'Sessão concluída' })).toBeInTheDocument()
    expect(screen.getByText('Acertos')).toBeInTheDocument()
    // Progresso e motivo para voltar, lidos da API (RES-1)
    expect(await screen.findByText('Ofensiva: 1 dia.')).toBeInTheDocument()
    expect(screen.getByText('Volte amanhã para manter.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
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
    const toSummary = await screen.findByRole('button', { name: 'Ver resumo' })
    // SES-8: com a sessão concluída, "encerrar" seria uma segunda saída para o resumo
    expect(screen.queryByRole('button', { name: 'Encerrar e ver resumo' })).not.toBeInTheDocument()
    await user.click(toSummary)

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

  it('erro ao buscar a próxima questão oferece tentar novamente (FR-009)', async () => {
    authenticate()
    let getCalls = 0
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.post(`${API}/sessions/s1/answers`, () => HttpResponse.json(answerResult())),
      http.get(`${API}/sessions/s1`, () => {
        getCalls += 1
        // 1ª consulta falha; repetir traz a próxima questão
        return getCalls <= 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(baseSession({ answeredCount: 1, nextQuestionId: 'q2' }))
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))
    await user.click(await screen.findByRole('radio', { name: /Alt A 1/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(await screen.findByRole('button', { name: 'Próxima questão' }))
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { name: 'Enunciado 2' })).toBeInTheDocument()
  })

  it('conduz a partir da sessão devolvida na criação, sem GET extra (SES-4)', async () => {
    authenticate()
    let getCalls = 0
    server.use(
      http.post(`${API}/sessions`, () => HttpResponse.json(baseSession(), { status: 201 })),
      http.get(`${API}/sessions/s1`, () => {
        getCalls += 1
        return HttpResponse.json(baseSession())
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))

    expect(await screen.findByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument()
    expect(getCalls).toBe(0)
  })

  it('explica a espera enquanto a sessão é criada (SES-1)', async () => {
    authenticate()
    server.use(
      http.post(`${API}/sessions`, async () => {
        await delay('infinite')
        return HttpResponse.json(baseSession(), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<SessionFlowPage />)

    await user.click(await screen.findByRole('button', { name: 'Matemática' }))

    expect(await screen.findByText('Separando questões de Matemática…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Linguagens' })).not.toBeInTheDocument()
  })
})

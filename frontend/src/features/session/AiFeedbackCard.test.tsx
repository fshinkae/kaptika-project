import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { AiFeedbackCard } from './AiFeedbackCard'

const API = 'http://api.test'
const URL = `${API}/sessions/s1/feedback`

function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message, correlationId: 'c1' }, { status })
}

describe('AiFeedbackCard', () => {
  beforeEach(() => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
  })

  it('só pede a análise ao tocar e mostra o texto da API', async () => {
    let calls = 0
    server.use(
      http.post(URL, () => {
        calls += 1
        return HttpResponse.json({ text: 'Bom começo. Revise frações.' })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<AiFeedbackCard sessionId="s1" />)

    expect(calls).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Ver análise' }))

    expect(await screen.findByText('Bom começo. Revise frações.')).toBeInTheDocument()
    expect(calls).toBe(1)
  })

  it('falha da IA mostra erro com repetir', async () => {
    let fail = true
    server.use(
      http.post(URL, () =>
        fail
          ? apiError(503, 'ai_unavailable', 'Análise indisponível no momento.')
          : HttpResponse.json({ text: 'Agora foi.' }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<AiFeedbackCard sessionId="s1" />)

    await user.click(screen.getByRole('button', { name: 'Ver análise' }))
    expect(await screen.findByText('Não foi possível gerar a análise agora.')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Agora foi.')).toBeInTheDocument()
  })

  it('limite diário mostra a mensagem da API, sem repetir', async () => {
    server.use(
      http.post(URL, () =>
        apiError(429, 'rate_limited', 'Limite diário de análises atingido. Tente amanhã.'),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<AiFeedbackCard sessionId="s1" />)

    await user.click(screen.getByRole('button', { name: 'Ver análise' }))

    expect(
      await screen.findByText('Limite diário de análises atingido. Tente amanhã.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })
})

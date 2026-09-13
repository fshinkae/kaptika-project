import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { XpPanel } from './XpPanel'

const API = 'http://api.test'

// Consistente com a curva do backend: nível 2 → faixa 200, faltando 50 = 75%.
const SUMMARY = { xpTotal: 250, level: 2, xpToNextLevel: 50, xpInPeriod: 120 }

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

describe('XpPanel', () => {
  it('exibe XP total, nível e XP da semana vindos da API (FR-004)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/xp`, () => HttpResponse.json(SUMMARY)))
    renderWithProviders(<XpPanel />)

    expect(await screen.findByText('250')).toBeInTheDocument() // XP total
    expect(screen.getByText('Nível 2')).toBeInTheDocument() // nível, uma vez só (DUP-1)
    expect(screen.getByText('120')).toBeInTheDocument() // XP da semana
    expect(screen.queryByText(/Faltam p\/ nível/)).not.toBeInTheDocument()
  })

  it('barra de progresso reflete a porcentagem derivada de xpToNextLevel (FR-004/FR-009)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/xp`, () => HttpResponse.json(SUMMARY)))
    renderWithProviders(<XpPanel />)

    const bar = await screen.findByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '75')
    expect(bar).toHaveAttribute('aria-valuetext', 'Nível 2, 75% até o nível 3')
  })

  it('mostra o estado de carregando enquanto busca (FR-009)', () => {
    authenticate()
    server.use(http.get(`${API}/me/xp`, () => HttpResponse.json(SUMMARY)))
    renderWithProviders(<XpPanel />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('erro com repetir reconcilia com a API ao tentar novamente (FR-007)', async () => {
    authenticate()
    let calls = 0
    server.use(
      http.get(`${API}/me/xp`, () => {
        calls += 1
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(SUMMARY)
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<XpPanel />)

    const retry = await screen.findByRole('button', { name: 'Tentar novamente' })
    await user.click(retry)

    expect(await screen.findByText('250')).toBeInTheDocument()
  })

  it('estado vazio quando o estudante ainda não tem XP (edge case)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me/xp`, () =>
        HttpResponse.json({ xpTotal: 0, level: 1, xpToNextLevel: 100, xpInPeriod: 0 }),
      ),
    )
    renderWithProviders(<XpPanel />)

    expect(await screen.findByText(/ainda não ganhou XP/i)).toBeInTheDocument()
  })
})

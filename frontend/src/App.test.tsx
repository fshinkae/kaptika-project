import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { authMock, setSession } from './test/supabaseMock'
import { renderWithProviders } from './test/renderApp'
import { App } from './App'

const API = 'http://api.test'

const PROFILE = {
  id: 'p1',
  displayName: 'Estudante',
  avatarUrl: null,
  createdAt: '2026-07-20T00:00:00Z',
  progress: { xpTotal: 0, level: 1, xpToNextLevel: 100, streakCurrent: 0, badgesCount: 0 },
}

describe('App routing', () => {
  it('rota privada sem sessão redireciona ao login (FR-004, SC-002)', async () => {
    renderWithProviders(<App />, { route: '/perfil' })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('com sessão, a rota privada renderiza e o logout limpa o estado (US2)', async () => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
    server.use(http.get(`${API}/me`, () => HttpResponse.json(PROFILE)))

    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/perfil' })

    // perfil carrega (rota privada acessível)
    expect(await screen.findByRole('heading', { name: 'Estudante' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(authMock.signOut).toHaveBeenCalled())
    // sem sessão, a UI volta para o login
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('usuário já autenticado em /login é levado à tela inicial', async () => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
    renderWithProviders(<App />, { route: '/login' })
    expect(await screen.findByRole('heading', { name: 'Bora estudar?' })).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { ProfileBadgesHighlight } from './ProfileBadgesHighlight'

const API = 'http://api.test'

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

describe('ProfileBadgesHighlight', () => {
  it('destaca as medalhas conquistadas no perfil (FR-005)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me/badges`, () =>
        HttpResponse.json({
          badges: [
            {
              slug: 'primeira-sessao',
              name: 'Primeira Sessão',
              description: 'x',
              achieved: true,
              awardedAt: '2026-07-20T00:00:00Z',
              progress: null,
            },
            {
              slug: 'maratonista',
              name: 'Maratonista',
              description: 'x',
              achieved: false,
              awardedAt: null,
              progress: { current: 3, target: 10 },
            },
          ],
          achievedCount: 1,
          totalCount: 2,
        }),
      ),
    )
    renderWithProviders(<ProfileBadgesHighlight />)

    expect(await screen.findByText('Primeira Sessão')).toBeInTheDocument()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
    expect(screen.queryByText('Maratonista')).not.toBeInTheDocument() // só conquistadas
  })

  it('mostra estado vazio incentivador quando não há conquistas (FR-005)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me/badges`, () =>
        HttpResponse.json({ badges: [], achievedCount: 0, totalCount: 5 }),
      ),
    )
    renderWithProviders(<ProfileBadgesHighlight />)

    expect(await screen.findByText(/A primeira vem ao concluir uma sessão/)).toBeInTheDocument()
    // VAZ-1: o vazio aponta o próximo passo
    expect(screen.getByRole('link', { name: 'Começar uma sessão' })).toHaveAttribute('href', '/estudar')
  })
})

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { setSession } from '../test/supabaseMock'
import { renderWithProviders } from '../test/renderApp'
import { HomePage } from './HomePage'

const API = 'http://api.test'

function mockProgress({ xpTotal, record }: { xpTotal: number; record: number }) {
  server.use(
    http.get(`${API}/me/xp`, () =>
      HttpResponse.json({ xpTotal, level: 1, xpToNextLevel: 100 - xpTotal, xpInPeriod: xpTotal }),
    ),
    http.get(`${API}/me/streak`, () =>
      HttpResponse.json({
        current: record,
        record,
        freezes: 2,
        metToday: false,
        brokenSinceLastAccess: false,
        brokenAt: null,
      }),
    ),
  )
}

describe('HomePage', () => {
  it('aluno novo vê o convite da primeira sessão, sem blocos vazios (HOME-1)', async () => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
    mockProgress({ xpTotal: 0, record: 0 })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('link', { name: 'Começar primeira sessão' })).toHaveAttribute(
      'href',
      '/estudar',
    )
    expect(await screen.findByText('Você ainda não ganhou XP.')).toBeInTheDocument()
    expect(screen.getByText('Comece sua ofensiva hoje!')).toBeInTheDocument()
    expect(screen.queryByText('Proteções')).not.toBeInTheDocument()
  })

  it('quem já concluiu sessão vê o atalho de sempre', async () => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
    mockProgress({ xpTotal: 40, record: 3 })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('link', { name: 'Iniciar sessão de estudo' })).toBeInTheDocument()
  })
})

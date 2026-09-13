import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { BadgeCelebrationHost } from './BadgeCelebrationHost'

const API = 'http://api.test'
const CELEBRATED_KEY = 'kaptika:badges:celebrated:u'

const COLLECTION = {
  badges: [
    {
      slug: 'first-session',
      name: 'Primeira Sessão',
      description: 'Conclua sua primeira sessão de estudo',
      achieved: true,
      awardedAt: '2026-07-20T13:00:00Z',
      progress: null,
    },
  ],
  achievedCount: 1,
  totalCount: 1,
}

function renderHost() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
  server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
  renderWithProviders(<BadgeCelebrationHost />)
}

describe('BadgeCelebrationHost', () => {
  beforeEach(() => localStorage.clear())

  it('não celebra medalhas já conquistadas no primeiro carregamento (FR-002)', async () => {
    renderHost()

    await waitFor(() => expect(localStorage.getItem(CELEBRATED_KEY)).not.toBeNull())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('celebra a medalha concedida depois do primeiro acesso, fora da galeria (MED-1)', async () => {
    // Aluno novo: "já visto" semeado vazio antes da 1ª sessão.
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([]))
    renderHost()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Primeira Sessão')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Tab não sai do diálogo de celebração (A11Y-3)', async () => {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([]))
    renderHost()
    const user = userEvent.setup()

    const dialog = await screen.findByRole('dialog')
    const button = within(dialog).getByRole('button', { name: 'Continuar' })

    await user.tab()
    expect(button).toHaveFocus()
    await user.tab()
    expect(button).toHaveFocus()
  })
})

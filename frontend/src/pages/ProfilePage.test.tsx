import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { setSession } from '../test/supabaseMock'
import { renderWithProviders } from '../test/renderApp'
import { ProfilePage } from './ProfilePage'

const API = 'http://api.test'

const PROFILE = {
  id: 'p1',
  displayName: 'João Silva',
  avatarUrl: null,
  createdAt: '2026-07-20T00:00:00Z',
  progress: { xpTotal: 250, level: 3, xpToNextLevel: 50, streakCurrent: 7, badgesCount: 2 },
}

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

describe('ProfilePage', () => {
  it('exibe os agregados de progresso vindos da API (FR-008)', async () => {
    authenticate()
    server.use(http.get(`${API}/me`, () => HttpResponse.json(PROFILE)))
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByRole('heading', { name: 'João Silva' })).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument() // XP
    expect(screen.getByText('3')).toBeInTheDocument() // nível
    expect(screen.getByText('7 dias')).toBeInTheDocument() // ofensiva
    expect(screen.getByText('2')).toBeInTheDocument() // medalhas
  })

  it('mostra erro com repetir quando a API falha (FR-010)', async () => {
    authenticate()
    server.use(http.get(`${API}/me`, () => new HttpResponse(null, { status: 500 })))
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('editar o nome reflete imediatamente na tela (FR-009, SC-004)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me`, () => HttpResponse.json(PROFILE)),
      http.patch(`${API}/me`, async ({ request }) => {
        const body = (await request.json()) as { displayName: string }
        return HttpResponse.json({ ...PROFILE, displayName: body.displayName })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    const nameInput = screen.getByLabelText('Nome de exibição')
    await user.clear(nameInput)
    await user.type(nameInput, 'João Pedro')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('heading', { name: 'João Pedro' })).toBeInTheDocument()
  })

  it('422 do backend vira erro no campo de nome (FR-009)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me`, () => HttpResponse.json(PROFILE)),
      http.patch(`${API}/me`, () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'displayName: nome inválido', correlationId: 'c' },
          { status: 422 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    await user.clear(screen.getByLabelText('Nome de exibição'))
    await user.type(screen.getByLabelText('Nome de exibição'), 'valido')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('displayName: nome inválido')).toBeInTheDocument()
  })

  it('avatar com URL quebrada cai no fallback de iniciais (edge case)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me`, () =>
        HttpResponse.json({ ...PROFILE, avatarUrl: 'https://cdn.invalido/x.png' }),
      ),
    )
    renderWithProviders(<ProfilePage />)

    const img = (await screen.findByAltText('João Silva')) as HTMLImageElement
    img.dispatchEvent(new Event('error'))
    await waitFor(() => expect(screen.getByText('JO')).toBeInTheDocument())
  })
})

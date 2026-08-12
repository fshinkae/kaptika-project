import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { BadgesGalleryPage } from './BadgesGalleryPage'
import { formatAwardedDate } from './badgeFormat'

const API = 'http://api.test'
const CELEBRATED_KEY = 'kaptika:badges:celebrated:u'

const COLLECTION = {
  badges: [
    {
      slug: 'primeira-sessao',
      name: 'Primeira Sessão',
      description: 'Complete sua primeira sessão de estudo.',
      achieved: true,
      awardedAt: '2026-07-20T13:00:00Z',
      progress: { current: 1, target: 1 },
    },
    {
      slug: 'maratonista',
      name: 'Maratonista',
      description: 'Complete 10 sessões de estudo.',
      achieved: false,
      awardedAt: null,
      progress: { current: 3, target: 10 },
    },
    {
      slug: 'explorador',
      name: 'Explorador',
      description: 'Responda 50 questões.',
      achieved: false,
      awardedAt: null,
      progress: null,
    },
  ],
  achievedCount: 1,
  totalCount: 3,
}

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

describe('BadgesGalleryPage', () => {
  beforeEach(() => localStorage.clear())

  it('mostra o estado de carregando enquanto busca (FR-007)', () => {
    authenticate()
    server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
    renderWithProviders(<BadgesGalleryPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('separa conquistadas (com data) de bloqueadas (com objetivo) (FR-003)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
    renderWithProviders(<BadgesGalleryPage />)

    expect(await screen.findByRole('heading', { name: 'Conquistadas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A conquistar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Primeira Sessão' })).toBeInTheDocument()
    // data de conquista formatada em pt-BR
    expect(screen.getByText(formatAwardedDate('2026-07-20T13:00:00Z'))).toBeInTheDocument()
    // objetivo (description) das bloqueadas
    expect(screen.getByText('Complete 10 sessões de estudo.')).toBeInTheDocument()
  })

  it('mostra progresso X/Y das cumulativas bloqueadas (FR-004)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
    renderWithProviders(<BadgesGalleryPage />)

    const bar = await screen.findByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
    expect(screen.getByText('3 de 10')).toBeInTheDocument()
    // 'Explorador' (não cumulativa) não expõe barra: só uma progressbar no total
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
  })

  it('mostra erro com repetir quando a API falha (FR-007)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/badges`, () => new HttpResponse(null, { status: 500 })))
    renderWithProviders(<BadgesGalleryPage />)
    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há medalhas no catálogo (FR-007)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me/badges`, () =>
        HttpResponse.json({ badges: [], achievedCount: 0, totalCount: 0 }),
      ),
    )
    renderWithProviders(<BadgesGalleryPage />)
    expect(await screen.findByText(/Ainda não há medalhas disponíveis/)).toBeInTheDocument()
  })

  it('não celebra medalhas já conquistadas ao carregar (FR-002)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
    renderWithProviders(<BadgesGalleryPage />)

    await screen.findByRole('heading', { name: 'Conquistadas' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('celebra uma medalha nova concedida pela API (FR-001) e a dispensa', async () => {
    authenticate()
    // usuário já viu tudo, exceto a recém-concedida 'primeira-sessao'
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([]))
    server.use(http.get(`${API}/me/badges`, () => HttpResponse.json(COLLECTION)))
    renderWithProviders(<BadgesGalleryPage />)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Primeira Sessão')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

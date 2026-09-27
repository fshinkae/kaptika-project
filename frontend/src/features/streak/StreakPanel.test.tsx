import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { StreakPanel } from './StreakPanel'
import type { StreakState } from './streakApi'

const API = 'http://api.test'

const STREAK: StreakState = {
  current: 7,
  record: 12,
  freezes: 2,
  metToday: false,
  brokenSinceLastAccess: false,
  brokenAt: null,
}

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

function mockStreak(overrides: Partial<StreakState> = {}) {
  server.use(http.get(`${API}/me/streak`, () => HttpResponse.json({ ...STREAK, ...overrides })))
}

describe('StreakPanel', () => {
  it('exibe ofensiva atual, recorde e congelamentos vindos da API (FR-001/005/006)', async () => {
    authenticate()
    mockStreak()
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('7')).toBeInTheDocument() // ofensiva atual em destaque
    expect(screen.getByText('dias seguidos')).toBeInTheDocument()
    expect(screen.getByText('12 dias')).toBeInTheDocument() // recorde
    expect(screen.getByText('2')).toBeInTheDocument() // freezes
    expect(screen.getByText('Proteções')).toBeInTheDocument() // COPY-1
  })

  it('usa singular para 1 dia (COPY-1)', async () => {
    authenticate()
    mockStreak({ current: 1, record: 1, metToday: true })
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('1 dia')).toBeInTheDocument()
  })

  it('mostra o badge de meta cumprida quando metToday (FR-002)', async () => {
    authenticate()
    mockStreak({ metToday: true })
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('Feito hoje. Volte amanhã para manter.')).toBeInTheDocument()
  })

  it('não mostra o badge de meta quando metToday é false (FR-002)', async () => {
    authenticate()
    mockStreak({ metToday: false })
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.queryByText('Feito hoje. Volte amanhã para manter.')).not.toBeInTheDocument()
  })

  it('avisa o que está em jogo quando falta a sessão de hoje (STK-1)', async () => {
    authenticate()
    mockStreak({ current: 7, metToday: false })
    renderWithProviders(<StreakPanel showAction />)

    expect(await screen.findByText(/Falta a sessão de hoje para manter seus/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fazer a sessão de hoje' })).toHaveAttribute(
      'href',
      '/estudar',
    )
  })

  it('não oferece estudar quando a sessão de hoje já foi feita (STK-1)', async () => {
    authenticate()
    mockStreak({ metToday: true })
    renderWithProviders(<StreakPanel showAction />)

    expect(await screen.findByText('Feito hoje. Volte amanhã para manter.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/Falta a sessão de hoje/)).not.toBeInTheDocument()
  })

  it('comunica a quebra de forma empática com a data reportada (FR-004/009)', async () => {
    authenticate()
    mockStreak({
      current: 0,
      brokenSinceLastAccess: true,
      brokenAt: '2026-07-18T10:00:00Z',
    })
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('Sua ofensiva foi reiniciada')).toBeInTheDocument()
    expect(screen.getByText(/18\/07\/2026/)).toBeInTheDocument()
    // Sem quebra + current 0 seria o convite inicial; a quebra tem prioridade.
    expect(screen.queryByText('Comece sua ofensiva hoje!')).not.toBeInTheDocument()
  })

  it('estado inicial simpático quando a ofensiva é zero e não houve quebra (FR-007)', async () => {
    authenticate()
    mockStreak({ current: 0, record: 0, freezes: 0 })
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('Comece sua ofensiva hoje!')).toBeInTheDocument()
    expect(screen.queryByText('Sua ofensiva foi reiniciada')).not.toBeInTheDocument()
    // Sem recorde 0 nem proteções para quem está começando (HOME-1)
    expect(screen.queryByText('Recorde')).not.toBeInTheDocument()
  })

  it('mostra estado de carregando enquanto busca (FR-007)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/me/streak`, async () => {
        await delay('infinite')
        return HttpResponse.json(STREAK)
      }),
    )
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByText('Carregando sua ofensiva…')).toBeInTheDocument()
  })

  it('mostra erro com repetir quando a API falha (FR-007)', async () => {
    authenticate()
    server.use(http.get(`${API}/me/streak`, () => new HttpResponse(null, { status: 500 })))
    renderWithProviders(<StreakPanel />)

    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { LeaderboardPage } from './LeaderboardPage'
import type { LeaderboardEntry, LeaderboardResponse } from './leaderboardApi'

const API = 'http://api.test'

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

function entry(rank: number, name: string, xp: number, id = `p${rank}`): LeaderboardEntry {
  return { rank, profileId: id, displayName: name, xp }
}

function page(overrides: Partial<LeaderboardResponse>): LeaderboardResponse {
  return {
    scope: 'global',
    periodStart: '2026-07-13T00:00:00Z',
    page: 0,
    size: 20,
    totalStudents: 0,
    entries: [],
    me: { rank: 1, xp: 0 },
    ...overrides,
  }
}

describe('LeaderboardPage', () => {
  it('exibe o ranking na ordem servida pela API, sem reordenar (FR-001, FR-006, SC-001)', async () => {
    authenticate()
    // Ordem intencionalmente já decrescente vinda da API; a UI não deve mexer.
    server.use(
      http.get(`${API}/leaderboard`, () =>
        HttpResponse.json(
          page({
            totalStudents: 3,
            entries: [entry(1, 'Ana', 900), entry(2, 'Bruno', 500), entry(3, 'Carla', 100)],
            me: { rank: 2, xp: 500 },
          }),
        ),
      ),
    )
    renderWithProviders(<LeaderboardPage />)

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Ana')
    expect(items[1]).toHaveTextContent('Bruno')
    expect(items[2]).toHaveTextContent('Carla')
    // XP e ranque renderizados
    expect(within(items[0]).getByText('900 XP')).toBeInTheDocument()
    expect(within(items[0]).getByLabelText('Posição 1')).toBeInTheDocument()
  })

  it('destaca a posição própria mesmo fora da página carregada (FR-002)', async () => {
    authenticate()
    // O próprio estudante (rank 87) não está entre as entries visíveis.
    server.use(
      http.get(`${API}/leaderboard`, () =>
        HttpResponse.json(
          page({
            totalStudents: 100,
            entries: [entry(1, 'Ana', 900), entry(2, 'Bruno', 500)],
            me: { rank: 87, xp: 42 },
          }),
        ),
      ),
    )
    renderWithProviders(<LeaderboardPage />)

    const card = await screen.findByRole('region', { name: 'Sua posição' })
    expect(within(card).getByText('#87')).toBeInTheDocument()
    expect(within(card).getByText('42 XP')).toBeInTheDocument()
  })

  it('não repete a posição própria quando ela já está na lista (DUP-1)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, () =>
        HttpResponse.json(
          page({ totalStudents: 2, entries: [entry(1, 'Ana', 900), entry(2, 'Bruno', 500)], me: { rank: 2, xp: 500 } }),
        ),
      ),
    )
    renderWithProviders(<LeaderboardPage />)

    await screen.findByText('Bruno')
    expect(screen.queryByRole('region', { name: 'Sua posição' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'true')
  })

  it('diferencia nomes repetidos por profileId (FR-007)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, () =>
        HttpResponse.json(
          page({
            totalStudents: 2,
            entries: [
              entry(1, 'João Silva', 300, 'aaa'),
              entry(2, 'João Silva', 200, 'bbb'),
            ],
            me: { rank: 1, xp: 300 },
          }),
        ),
      ),
    )
    renderWithProviders(<LeaderboardPage />)

    // Ambos renderizam (keys distintas por profileId); XP distinto os separa.
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('300 XP')).toBeInTheDocument()
    expect(within(items[1]).getByText('200 XP')).toBeInTheDocument()
  })

  it('alternar geral↔semanal refaz a busca e reflete cada recorte (FR-003, SC-004)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, ({ request }) => {
        const scope = new URL(request.url).searchParams.get('scope')
        if (scope === 'weekly') {
          return HttpResponse.json(
            page({
              scope: 'weekly',
              totalStudents: 1,
              entries: [entry(1, 'Semanal Sam', 50)],
              me: { rank: 1, xp: 50 },
            }),
          )
        }
        return HttpResponse.json(
          page({
            totalStudents: 1,
            entries: [entry(1, 'Geral Gal', 999)],
            me: { rank: 1, xp: 999 },
          }),
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LeaderboardPage />)

    expect(await screen.findByText('Geral Gal')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Semanal' }))

    expect(await screen.findByText('Semanal Sam')).toBeInTheDocument()
    expect(screen.queryByText('Geral Gal')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Semanal' })).toHaveAttribute('aria-selected', 'true')
  })

  it('"carregar mais" concatena páginas sem duplicatas nem lacunas (FR-004, SC-005)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'))
        const total = 25
        const start = p * 20
        const count = Math.max(0, Math.min(20, total - start))
        const entries = Array.from({ length: count }, (_, i) =>
          entry(start + i + 1, `Aluno ${start + i + 1}`, 1000 - (start + i), `id-${start + i + 1}`),
        )
        return HttpResponse.json(
          page({ page: p, totalStudents: total, entries, me: { rank: 1, xp: 1000 } }),
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LeaderboardPage />)

    expect(await screen.findAllByRole('listitem')).toHaveLength(20)

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(25))
    // Sem duplicatas: cada aluno aparece uma única vez.
    expect(screen.getAllByText('Aluno 1')).toHaveLength(1)
    expect(screen.getByText('Aluno 25')).toBeInTheDocument()
    // Chegou ao fim: botão some.
    expect(screen.queryByRole('button', { name: /Carregar mais/ })).not.toBeInTheDocument()
  })

  it('deduplica itens repetidos entre páginas quando o ranking muda (edge case)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'))
        if (p === 0) {
          return HttpResponse.json(
            page({
              page: 0,
              totalStudents: 3,
              entries: [entry(1, 'Ana', 900, 'a'), entry(2, 'Bruno', 500, 'b')],
              me: { rank: 1, xp: 900 },
            }),
          )
        }
        // Página 1 repete 'Bruno' (ranking mudou) + traz 'Carla'.
        return HttpResponse.json(
          page({
            page: 1,
            totalStudents: 3,
            entries: [entry(2, 'Bruno', 500, 'b'), entry(3, 'Carla', 100, 'c')],
            me: { rank: 1, xp: 900 },
          }),
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LeaderboardPage />)

    await screen.findByText('Ana')
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    await waitFor(() => expect(screen.getByText('Carla')).toBeInTheDocument())
    expect(screen.getAllByText('Bruno')).toHaveLength(1)
  })

  it('mostra estado vazio quando não há estudantes (FR-005)', async () => {
    authenticate()
    server.use(
      http.get(`${API}/leaderboard`, () =>
        HttpResponse.json(page({ totalStudents: 0, entries: [], me: { rank: 0, xp: 0 } })),
      ),
    )
    renderWithProviders(<LeaderboardPage />)

    expect(await screen.findByText(/Ainda não há estudantes/)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('mostra erro com repetir quando a primeira página falha (FR-005)', async () => {
    authenticate()
    let calls = 0
    server.use(
      http.get(`${API}/leaderboard`, () => {
        calls += 1
        if (calls === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(
          page({ totalStudents: 1, entries: [entry(1, 'Recuperada', 10)], me: { rank: 1, xp: 10 } }),
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LeaderboardPage />)

    const retry = await screen.findByRole('button', { name: 'Tentar novamente' })
    await user.click(retry)

    expect(await screen.findByText('Recuperada')).toBeInTheDocument()
  })

  it('erro ao carregar mais mostra aviso e permite repetir (edge case)', async () => {
    authenticate()
    let pageOneCalls = 0
    server.use(
      http.get(`${API}/leaderboard`, ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'))
        if (p === 0) {
          const entries = Array.from({ length: 20 }, (_, i) =>
            entry(i + 1, `Aluno ${i + 1}`, 1000 - i, `id-${i + 1}`),
          )
          return HttpResponse.json(
            page({ page: 0, totalStudents: 40, entries, me: { rank: 1, xp: 1000 } }),
          )
        }
        pageOneCalls += 1
        if (pageOneCalls === 1) return new HttpResponse(null, { status: 500 })
        const entries = Array.from({ length: 20 }, (_, i) =>
          entry(21 + i, `Aluno ${21 + i}`, 980 - i, `id-${21 + i}`),
        )
        return HttpResponse.json(
          page({ page: 1, totalStudents: 40, entries, me: { rank: 1, xp: 1000 } }),
        )
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LeaderboardPage />)

    await user.click(await screen.findByRole('button', { name: 'Carregar mais' }))

    // Falhou: aviso aparece e a lista original permanece intacta.
    expect(await screen.findByText('Não foi possível carregar mais itens.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(20)

    // Repetir com sucesso concatena a próxima página.
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByText('Aluno 40')).toBeInTheDocument())
  })
})

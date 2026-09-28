import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setSession } from '../../test/supabaseMock'
import { renderWithProviders } from '../../test/renderApp'
import { PerformancePage } from './PerformancePage'
import type { DailyPoint, PerformanceResponse, Recommendation } from './performanceApi'

const API = 'http://api.test'

function authenticate() {
  setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
}

/** `days` pontos terminando em 2026-03-10; dias específicos sobrescritos. */
function series(days: number, overrides: Record<string, Partial<DailyPoint>> = {}): DailyPoint[] {
  const end = Date.UTC(2026, 2, 10)
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10)
    return { date, xp: 0, answered: 0, correct: 0, activeDay: false, ...overrides[date] }
  })
}

function performance(overrides: Partial<PerformanceResponse> = {}): PerformanceResponse {
  const daily = overrides.daily ?? series(30, {
    '2026-03-08': { xp: 40, answered: 2, correct: 2, activeDay: true },
    '2026-03-10': { xp: 30, answered: 10, correct: 4, activeDay: true },
  })
  return {
    windowDays: daily.length,
    from: daily[0].date,
    to: daily[daily.length - 1].date,
    totals: { answered: 25, correct: 16, wrong: 9, accuracy: 0.64 },
    areas: [
      { area: 'linguagens', answered: 12, correct: 9, wrong: 3, accuracy: 0.75 },
      { area: 'ciencias-humanas', answered: 3, correct: 3, wrong: 0, accuracy: 1 },
      { area: 'ciencias-natureza', answered: 0, correct: 0, wrong: 0, accuracy: null },
      { area: 'matematica', answered: 15, correct: 7, wrong: 8, accuracy: 0.4667 },
    ],
    recommendation: { area: 'ciencias-natureza', reason: 'NOT_PRACTICED' },
    daily,
    ...overrides,
  }
}

function serve(body: PerformanceResponse | ((days: string | null) => PerformanceResponse)) {
  const requestedDays: (string | null)[] = []
  server.use(
    http.get(`${API}/me/performance`, ({ request }) => {
      const days = new URL(request.url).searchParams.get('days')
      requestedDays.push(days)
      return HttpResponse.json(typeof body === 'function' ? body(days) : body)
    }),
  )
  return requestedDays
}

describe('PerformancePage', () => {
  it('mostra as 4 áreas com percentual e "x de y"; área sem respostas não vira 0% (US1, SC-001)', async () => {
    authenticate()
    serve(performance())
    renderWithProviders(<PerformancePage />)

    const section = await screen.findByRole('region', { name: 'Acerto por área' })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('Linguagens')
    expect(items[0]).toHaveTextContent('75% · 9 de 12')
    expect(items[1]).toHaveTextContent('100% · 3 de 3')
    expect(items[2]).toHaveTextContent('Ciências da Natureza')
    expect(items[2]).toHaveTextContent('Ainda não praticada')
    expect(items[2]).not.toHaveTextContent('0%')
    expect(items[3]).toHaveTextContent('47% · 7 de 15')
  })

  it('mostra os totais da janela vindos da API (FR-002)', async () => {
    authenticate()
    serve(performance())
    renderWithProviders(<PerformancePage />)

    await screen.findByRole('region', { name: 'Acerto por área' })
    // A tabela acessível também tem "Respondidas"/"Acertos": o resumo é a lista de definição.
    const summary = within(document.querySelector('dl')!)
    expect(summary.getByText('Respondidas').closest('div')).toHaveTextContent('25')
    expect(summary.getByText('Acertos').closest('div')).toHaveTextContent('16')
    expect(summary.getByText('Taxa de acerto').closest('div')).toHaveTextContent('64%')
  })

  describe('cartão "Onde focar" (US2, SC-004)', () => {
    const cases: {
      recommendation: Recommendation
      title: string
      action: string
      href: string
    }[] = [
      {
        recommendation: { area: 'matematica', reason: 'LOWEST_ACCURACY' },
        title: 'Matemática é sua área com menor acerto (47%).',
        action: 'Estudar Matemática',
        href: '/estudar?area=matematica',
      },
      {
        recommendation: { area: 'ciencias-natureza', reason: 'NOT_PRACTICED' },
        title: 'Você ainda não praticou Ciências da Natureza.',
        action: 'Estudar Ciências da Natureza',
        href: '/estudar?area=ciencias-natureza',
      },
      {
        recommendation: { area: null, reason: 'INSUFFICIENT_DATA' },
        title: 'Responda mais questões para ver onde focar.',
        action: 'Começar uma sessão',
        href: '/estudar',
      },
    ]

    it.each(cases)('$recommendation.reason', async ({ recommendation, title, action, href }) => {
      authenticate()
      serve(performance({ recommendation }))
      renderWithProviders(<PerformancePage />)

      const card = await screen.findByRole('region', { name: 'Onde focar' })
      expect(within(card).getByText(title)).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: action })).toHaveAttribute('href', href)
    })
  })

  it('troca de janela consulta days=7 e mantém o conteúdo anterior até a resposta (US3, SC-003)', async () => {
    authenticate()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const requestedDays: (string | null)[] = []
    server.use(
      http.get(`${API}/me/performance`, async ({ request }) => {
        const days = new URL(request.url).searchParams.get('days')
        requestedDays.push(days)
        if (days === '7') await gate
        return HttpResponse.json(performance({ daily: series(Number(days)) }))
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PerformancePage />)

    await screen.findByRole('region', { name: 'Acerto por área' })
    expect(screen.getByRole('tab', { name: '30 dias' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('xp-columns').children).toHaveLength(30)

    await user.click(screen.getByRole('tab', { name: '7 dias' }))

    // Enquanto a nova janela carrega, o conteúdo anterior fica, marcado como ocupado.
    expect(screen.getByRole('region', { name: 'Acerto por área' })).toBeInTheDocument()
    expect(screen.getByTestId('xp-columns').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    )

    release()
    expect(await screen.findByText((_, el) => el?.textContent === 'Meta cumprida em 0 de 7 dias'))
      .toBeInTheDocument()
    expect(screen.getByTestId('xp-columns').children).toHaveLength(7)
    expect(requestedDays).toEqual(['30', '7'])
  })

  it('90 dias: uma coluna de XP e uma célula de calendário por dia', async () => {
    authenticate()
    serve((days) => performance({ daily: series(Number(days)) }))
    const user = userEvent.setup()
    renderWithProviders(<PerformancePage />)

    await user.click(await screen.findByRole('tab', { name: '90 dias' }))

    expect(await screen.findByText((_, el) => el?.textContent === 'Meta cumprida em 0 de 90 dias'))
      .toBeInTheDocument()
    expect(screen.getByTestId('xp-columns').children).toHaveLength(90)
    const cells = screen.getByTestId('calendar-grid').querySelectorAll('[data-active]')
    expect(cells).toHaveLength(90)
  })

  it('tabela acessível traz os valores de cada dia, com a data sem deslocar fuso (FR-007)', async () => {
    authenticate()
    serve(performance())
    renderWithProviders(<PerformancePage />)

    const table = await screen.findByRole('table', { name: 'Detalhe por dia' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(31) // cabeçalho + 30 dias

    const march8 = within(table).getByRole('rowheader', { name: /8 de mar/ }).closest('tr')!
    expect(within(march8).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '40',
      '2',
      '2',
      'cumprida',
    ])
    expect(screen.getByText((_, el) => el?.textContent === 'Meta cumprida em 2 de 30 dias'))
      .toBeInTheDocument()
  })

  it('sem respostas na janela: estado vazio com ação e seletor ainda visível (FR-006)', async () => {
    authenticate()
    serve(
      performance({
        totals: { answered: 0, correct: 0, wrong: 0, accuracy: null },
        recommendation: { area: null, reason: 'INSUFFICIENT_DATA' },
        daily: series(30),
      }),
    )
    renderWithProviders(<PerformancePage />)

    expect(
      await screen.findByText('Nenhuma questão respondida nos últimos 30 dias.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Começar uma sessão' })).toHaveAttribute('href', '/estudar')
    expect(screen.getByRole('tablist', { name: 'Período' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Acerto por área' })).not.toBeInTheDocument()
  })

  it('erro da API oferece tentar novamente e recupera (FR-006)', async () => {
    authenticate()
    let calls = 0
    server.use(
      http.get(`${API}/me/performance`, () => {
        calls++
        return calls === 1
          ? HttpResponse.json(
              { code: 'internal_error', message: 'x', correlationId: 'c' },
              { status: 500 },
            )
          : HttpResponse.json(performance())
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PerformancePage />)

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('region', { name: 'Acerto por área' })).toBeInTheDocument()
  })
})

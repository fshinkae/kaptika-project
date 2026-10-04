import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderApp'
import { App } from '../App'

describe('LandingPage', () => {
  it('visitante em "/" vê a apresentação com caminhos para cadastro e login', async () => {
    renderWithProviders(<App />, { route: '/' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'O ENEM em doses de 5 questões.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar minha conta' })).toHaveAttribute('href', '/cadastro')
    expect(screen.getByRole('link', { name: 'Já tenho conta' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('outras rotas privadas sem sessão seguem indo ao login', async () => {
    renderWithProviders(<App />, { route: '/placar' })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})

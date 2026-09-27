import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authMock } from '../test/supabaseMock'
import { renderWithProviders } from '../test/renderApp'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('bloqueia envio e mostra erros de validação (FR-002)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(authMock.signInWithPassword).not.toHaveBeenCalled()
  })

  it('credenciais válidas chamam o Supabase', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('E-mail'), 'estudante@enem.br')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'estudante@enem.br',
        password: 'senha123',
      }),
    )
  })

  it('erro de credenciais mostra mensagem genérica (FR-007, SC-005)', async () => {
    const user = userEvent.setup()
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('E-mail'), 'naoexiste@enem.br')
    await user.type(screen.getByLabelText('Senha'), 'errada12')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const alert = await screen.findByText('E-mail ou senha incorretos.')
    expect(alert).toBeInTheDocument()
    // não vaza se o e-mail existe
    expect(screen.queryByText(/Invalid login/i)).not.toBeInTheDocument()
  })

  it('e-mail não confirmado explica o motivo e deixa reenviar o link (CONF-1)', async () => {
    const user = userEvent.setup()
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
    })
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('E-mail'), 'nova@enem.br')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Falta confirmar seu e-mail.')).toBeInTheDocument()
    expect(screen.queryByText('E-mail ou senha incorretos.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    expect(await screen.findByText('E-mail reenviado.')).toBeInTheDocument()
    expect(authMock.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'nova@enem.br' }),
    )
  })
})

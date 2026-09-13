import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authMock } from '../test/supabaseMock'
import { renderWithProviders } from '../test/renderApp'
import { SignupPage } from './SignupPage'

async function fillAndSubmit(email = 'maria@enem.br', password = 'senha1234') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))
  return user
}

describe('SignupPage', () => {
  it('valida e-mail e força de senha antes de enviar (FR-002)', async () => {
    renderWithProviders(<SignupPage />)

    await fillAndSubmit('invalido', 'fraca')

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter ao menos 8 caracteres.')).toBeInTheDocument()
    expect(authMock.signUp).not.toHaveBeenCalled()
  })

  it('pede só e-mail e senha, com a regra de senha visível antes do erro (CAD-2)', () => {
    renderWithProviders(<SignupPage />)

    expect(screen.queryByLabelText('Nome de exibição')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Mínimo de 8 caracteres, com letras e números.',
    )
  })

  it('mostrar senha alterna a visibilidade do campo (CAD-2)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)

    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })
    await user.click(toggle)

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('dados válidos criam a conta com e-mail e senha (CAD-2)', async () => {
    renderWithProviders(<SignupPage />)

    await fillAndSubmit()

    await waitFor(() =>
      expect(authMock.signUp).toHaveBeenCalledWith({ email: 'maria@enem.br', password: 'senha1234' }),
    )
  })

  it('conta sem sessão pede para confirmar o e-mail e permite reenviar (CAD-1)', async () => {
    authMock.signUp.mockResolvedValueOnce({ data: { session: null }, error: null })
    renderWithProviders(<SignupPage />)

    const user = await fillAndSubmit()

    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText('maria@enem.br')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(authMock.resend).toHaveBeenCalledWith({ type: 'signup', email: 'maria@enem.br' })
    expect(await screen.findByText('E-mail reenviado.')).toBeInTheDocument()
  })
})

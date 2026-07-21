import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authMock } from '../test/supabaseMock'
import { renderWithProviders } from '../test/renderApp'
import { SignupPage } from './SignupPage'

describe('SignupPage', () => {
  it('valida nome, e-mail e força de senha antes de enviar (FR-002)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)

    await user.type(screen.getByLabelText('Nome de exibição'), 'A')
    await user.type(screen.getByLabelText('E-mail'), 'invalido')
    await user.type(screen.getByLabelText('Senha'), 'fraca')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('O nome deve ter ao menos 2 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter ao menos 8 caracteres.')).toBeInTheDocument()
    expect(authMock.signUp).not.toHaveBeenCalled()
  })

  it('dados válidos criam a conta com o nome de exibição', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)

    await user.type(screen.getByLabelText('Nome de exibição'), 'Maria Clara')
    await user.type(screen.getByLabelText('E-mail'), 'maria@enem.br')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: 'maria@enem.br',
        password: 'senha1234',
        options: { data: { name: 'Maria Clara' } },
      }),
    )
  })
})

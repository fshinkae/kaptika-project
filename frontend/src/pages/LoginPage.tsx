import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { loginSchema, type LoginForm } from '../auth/schemas'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { PasswordField } from '../components/PasswordField'
import { TextLink } from '../components/TextLink'

/** Mensagem sempre genérica: nunca revela se o e-mail existe (FR-007, SC-005). */
const GENERIC_LOGIN_ERROR = 'E-mail ou senha incorretos.'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(data: LoginForm) {
    setFormError(null)
    try {
      await signIn(data.email, data.password)
      navigate(from, { replace: true })
    } catch {
      setFormError(GENERIC_LOGIN_ERROR)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      footer={
        <>
          Não tem conta?{' '}
          <TextLink to="/cadastro">Cadastre-se</TextLink>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
        <TextLink to="/recuperar-senha" className="self-center text-sm">
          Esqueci minha senha
        </TextLink>
      </form>
    </AuthLayout>
  )
}

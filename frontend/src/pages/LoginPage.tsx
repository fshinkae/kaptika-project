import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { loginSchema, type LoginForm } from '../auth/schemas'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'

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
          <Link to="/cadastro" className="font-medium text-indigo-600">
            Cadastre-se
          </Link>
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
        <FormField
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link to="/recuperar-senha" className="text-center text-sm text-indigo-600">
          Esqueci minha senha
        </Link>
      </form>
    </AuthLayout>
  )
}

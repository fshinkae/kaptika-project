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

/**
 * O Supabase só diz "e-mail não confirmado" para quem acertou a senha, então
 * tratar esse caso não revela cadastro a terceiros (CONF-1).
 */
function isEmailNotConfirmed(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'email_not_confirmed'
  )
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(data: LoginForm) {
    setFormError(null)
    setUnconfirmedEmail(null)
    try {
      await signIn(data.email, data.password)
      navigate(from, { replace: true })
    } catch (error) {
      if (isEmailNotConfirmed(error)) {
        setUnconfirmedEmail(data.email)
        return
      }
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
        {unconfirmedEmail && <UnconfirmedEmailNotice email={unconfirmedEmail} />}
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

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'

/** Conta existe, mas o e-mail não foi confirmado: diz isso e deixa reenviar o link. */
function UnconfirmedEmailNotice({ email }: { email: string }) {
  const { resendConfirmation } = useAuth()
  const [status, setStatus] = useState<ResendStatus>('idle')

  async function resend() {
    setStatus('sending')
    try {
      await resendConfirmation(email)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-control bg-highlight-soft p-4 text-sm text-ink ring-1 ring-highlight"
    >
      <div>
        <p className="font-semibold">Falta confirmar seu e-mail.</p>
        <p className="mt-1">
          Toque no link que enviamos para <strong className="break-all">{email}</strong>. Não
          achou? Olhe o spam e a aba Promoções.
        </p>
      </div>
      <Button variant="secondary" type="button" onClick={resend} disabled={status === 'sending'}>
        {status === 'sending' ? 'Reenviando…' : 'Reenviar e-mail'}
      </Button>
      <p aria-live="polite" className="min-h-5">
        {status === 'sent' && 'E-mail reenviado.'}
        {status === 'error' && 'Não foi possível reenviar agora. Tente de novo em 1 minuto.'}
      </p>
    </div>
  )
}

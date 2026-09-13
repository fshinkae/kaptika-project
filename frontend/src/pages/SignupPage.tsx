import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { signupSchema, type SignupForm } from '../auth/schemas'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { PasswordField } from '../components/PasswordField'
import { TextLink } from '../components/TextLink'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  // E-mail aguardando confirmação: sem isso, a conta sem sessão caía no login
  // sem explicação e o estudante achava que o cadastro tinha falhado.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  async function onSubmit(data: SignupForm) {
    setFormError(null)
    try {
      const { needsConfirmation } = await signUp(data)
      if (needsConfirmation) {
        setPendingEmail(data.email)
        return
      }
      navigate('/', { replace: true })
    } catch {
      setFormError('Não foi possível criar a conta. Tente novamente.')
    }
  }

  if (pendingEmail) {
    return <ConfirmEmail email={pendingEmail} onChangeEmail={() => setPendingEmail(null)} />
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Questões do ENEM em sessões curtas, com o gabarito na hora."
      footer={
        <>
          Já tem conta? <TextLink to="/login">Entrar</TextLink>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Senha"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  )
}

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'

/** Conta criada, falta confirmar o e-mail (projeto com confirmação ligada). */
function ConfirmEmail({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
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
    <AuthLayout
      title="Confira seu e-mail"
      footer={<TextLink to="/login">Já confirmei, quero entrar</TextLink>}
    >
      <div className="flex flex-col gap-4 text-center">
        <p className="text-base text-ink">
          Enviamos um link para <strong className="break-all text-ink">{email}</strong>. Toque
          nele para ativar a conta e começar a primeira sessão.
        </p>
        <p className="text-sm text-ink-muted">Não chegou? Olhe também o spam e a aba Promoções.</p>
        <Button variant="secondary" onClick={resend} disabled={status === 'sending'}>
          {status === 'sending' ? 'Reenviando…' : 'Reenviar e-mail'}
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {status === 'sent' ? 'E-mail reenviado.' : ''}
        </p>
        {status === 'error' && (
          <p role="alert" className="text-sm text-danger">
            Não foi possível reenviar agora. Tente de novo em 1 minuto.
          </p>
        )}
        <button
          type="button"
          onClick={onChangeEmail}
          className="mx-auto inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-pen-600
            underline-offset-2 hover:underline
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600"
        >
          Usei o e-mail errado
        </button>
      </div>
    </AuthLayout>
  )
}

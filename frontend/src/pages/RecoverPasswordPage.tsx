import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../auth/AuthContext'
import { recoverSchema, type RecoverForm } from '../auth/schemas'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { TextLink } from '../components/TextLink'

export function RecoverPasswordPage() {
  const { recoverPassword } = useAuth()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverForm>({ resolver: zodResolver(recoverSchema) })

  async function onSubmit(data: RecoverForm) {
    // Resposta sempre igual (enviado), mesmo se o e-mail não existir — não
    // revela cadastro (coerente com o erro genérico de login).
    try {
      await recoverPassword(data.email)
    } finally {
      setSent(true)
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      footer={
        <TextLink to="/login">Voltar ao login</TextLink>
      }
    >
      {sent ? (
        <p role="status" className="text-center text-sm text-ink-muted">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
        </p>
      ) : (
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

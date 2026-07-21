import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { signupSchema, type SignupForm } from '../auth/schemas'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  async function onSubmit(data: SignupForm) {
    setFormError(null)
    try {
      await signUp(data)
      navigate('/', { replace: true })
    } catch {
      setFormError('Não foi possível criar a conta. Tente novamente.')
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-indigo-600">
            Entrar
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          label="Nome de exibição"
          autoComplete="nickname"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && (
          <p role="alert" className="text-sm text-red-600">
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

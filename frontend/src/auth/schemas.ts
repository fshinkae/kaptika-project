import { z } from 'zod'

/** Regras de validação client-side dos formulários de auth (FR-002). */

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

export const signupSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha deve ter ao menos 8 caracteres.')
    .regex(/[a-zA-Z]/, 'A senha deve conter letras.')
    .regex(/[0-9]/, 'A senha deve conter números.'),
})

export const recoverSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
})

export type LoginForm = z.infer<typeof loginSchema>
export type SignupForm = z.infer<typeof signupSchema>
export type RecoverForm = z.infer<typeof recoverSchema>

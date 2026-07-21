import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Cliente único do Supabase Auth. Fonte de identidade do app: cadastro,
 * login, logout, recuperação de senha e persistência da sessão. O backend
 * apenas valida o JWT emitido aqui.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

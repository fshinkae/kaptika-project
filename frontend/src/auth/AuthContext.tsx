import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface SignUpParams {
  email: string
  password: string
  displayName: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true enquanto a sessão persistida ainda não foi restaurada. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signOut: () => Promise<void>
  recoverPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Fonte única de sessão do app (FR-003). Restaura a sessão persistida do
 * Supabase ao iniciar e reage a login/logout via onAuthStateChange.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp({ email, password, displayName }) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: displayName } },
      })
      if (error) throw error
    },
    async signOut() {
      await supabase.auth.signOut()
    },
    async recoverPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    },
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}

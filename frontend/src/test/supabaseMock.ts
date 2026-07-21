import { vi } from 'vitest'

/**
 * Estado do Supabase Auth mockado, compartilhado entre o cliente (via
 * vi.mock em setup.ts) e os testes, que dirigem sessão e inspecionam chamadas.
 */
export interface FakeSession {
  access_token: string
  user: { id: string; email: string }
}

type Listener = (event: string, session: FakeSession | null) => void

let session: FakeSession | null = null
const listeners = new Set<Listener>()

function emit(event: string) {
  for (const l of listeners) l(event, session)
}

// Retorno propositalmente frouxo: os testes sobrescrevem alguns casos com
// { session: null } e objetos de erro do Supabase.
type AuthResult = Promise<{ data: { session?: FakeSession | null } & Record<string, unknown>; error: unknown }>

export const authMock = {
  getSession: vi.fn((): AuthResult => Promise.resolve({ data: { session }, error: null })),
  onAuthStateChange: vi.fn((cb: Listener) => {
    listeners.add(cb)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  }),
  signInWithPassword: vi.fn(({ email }: { email: string; password: string }): AuthResult => {
    session = { access_token: 'token-fake', user: { id: 'user-1', email } }
    emit('SIGNED_IN')
    return Promise.resolve({ data: { session }, error: null })
  }),
  signUp: vi.fn(({ email }: { email: string; password: string }): AuthResult => {
    session = { access_token: 'token-fake', user: { id: 'user-1', email } }
    emit('SIGNED_IN')
    return Promise.resolve({ data: { session }, error: null })
  }),
  signOut: vi.fn((): Promise<{ error: unknown }> => {
    session = null
    emit('SIGNED_OUT')
    return Promise.resolve({ error: null })
  }),
  refreshSession: vi.fn((): AuthResult => Promise.resolve({ data: { session }, error: null })),
  resetPasswordForEmail: vi.fn(
    (): Promise<{ data: unknown; error: unknown }> => Promise.resolve({ data: {}, error: null }),
  ),
}

/** Define a sessão inicial (ex.: usuário já autenticado). */
export function setSession(next: FakeSession | null) {
  session = next
}

export function currentSession() {
  return session
}

/** Reseta estado e espiões entre testes. */
export function resetSupabaseMock() {
  session = null
  listeners.clear()
  for (const fn of Object.values(authMock)) {
    ;(fn as ReturnType<typeof vi.fn>).mockClear()
  }
}

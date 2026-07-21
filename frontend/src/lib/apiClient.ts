import { supabase } from './supabase'
import { env } from './env'

/** Erro normalizado da API do backend ({ code, message, correlationId }). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string

  constructor(status: number, code: string, message: string, correlationId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.correlationId = correlationId
  }
}

/** Sinaliza que a sessão expirou e não pôde ser renovada (FR-006). */
export class SessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada.')
    this.name = 'SessionExpiredError'
  }
}

// Serializa refreshes concorrentes: várias chamadas em 401 simultâneo
// compartilham uma única tentativa de renovação.
let refreshInFlight: Promise<string | null> | null = null

async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = supabase.auth
      .refreshSession()
      .then(({ data }) => data.session?.access_token ?? null)
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

async function parseError(response: Response): Promise<ApiError> {
  let code = 'error'
  let message = 'Ocorreu um erro inesperado.'
  let correlationId: string | undefined
  try {
    const body = await response.json()
    code = body.code ?? code
    message = body.message ?? message
    correlationId = body.correlationId
  } catch {
    // resposta sem corpo JSON — mantém os defaults
  }
  return new ApiError(response.status, code, message, correlationId)
}

/**
 * Chamada autenticada à API do backend. Injeta o access_token do Supabase
 * (FR-005) e, em 401, tenta renovar a sessão uma vez e repetir; se a
 * renovação falhar, desloga e lança SessionExpiredError (FR-006).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await currentAccessToken()
  const response = await doFetch(path, init, token)

  if (response.status !== 401) {
    return handle<T>(response)
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    await supabase.auth.signOut()
    throw new SessionExpiredError()
  }
  const retry = await doFetch(path, init, refreshed)
  if (retry.status === 401) {
    await supabase.auth.signOut()
    throw new SessionExpiredError()
  }
  return handle<T>(retry)
}

function doFetch(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${env.apiUrl}${path}`, { ...init, headers })
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

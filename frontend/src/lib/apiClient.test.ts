import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { authMock, setSession } from '../test/supabaseMock'
import { apiFetch, ApiError, SessionExpiredError } from './apiClient'

const API = 'http://api.test'

describe('apiClient', () => {
  it('anexa o token do Supabase no cabeçalho Authorization (FR-005)', async () => {
    setSession({ access_token: 'abc123', user: { id: 'u', email: 'a@b.c' } })
    let received: string | null = null
    server.use(
      http.get(`${API}/me`, ({ request }) => {
        received = request.headers.get('Authorization')
        return HttpResponse.json({ id: 'p1' })
      }),
    )

    await apiFetch('/me')
    expect(received).toBe('Bearer abc123')
  })

  it('normaliza o corpo de erro em ApiError (FR-012 do backend)', async () => {
    setSession({ access_token: 't', user: { id: 'u', email: 'a@b.c' } })
    server.use(
      http.patch(`${API}/me`, () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'nome inválido', correlationId: 'cid-1' },
          { status: 422 },
        ),
      ),
    )

    const error = (await apiFetch('/me', { method: 'PATCH', body: '{}' }).catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.code).toBe('validation_error')
    expect(error.correlationId).toBe('cid-1')
  })

  it('em 401 tenta renovar a sessão uma vez e repete (FR-006)', async () => {
    setSession({ access_token: 'stale', user: { id: 'u', email: 'a@b.c' } })
    authMock.refreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'fresh', user: { id: 'u', email: 'a@b.c' } } },
      error: null,
    })
    let calls = 0
    server.use(
      http.get(`${API}/me`, ({ request }) => {
        calls += 1
        if (request.headers.get('Authorization') === 'Bearer fresh') {
          return HttpResponse.json({ id: 'p1' })
        }
        return new HttpResponse(null, { status: 401 })
      }),
    )

    const result = await apiFetch<{ id: string }>('/me')
    expect(result.id).toBe('p1')
    expect(calls).toBe(2)
    expect(authMock.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('se a renovação falhar, desloga e lança SessionExpiredError (FR-006)', async () => {
    setSession({ access_token: 'stale', user: { id: 'u', email: 'a@b.c' } })
    authMock.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    server.use(http.get(`${API}/me`, () => new HttpResponse(null, { status: 401 })))

    const error = (await apiFetch('/me').catch((e) => e)) as Error
    expect(error).toBeInstanceOf(SessionExpiredError)
    expect(authMock.signOut).toHaveBeenCalled()
  })
})

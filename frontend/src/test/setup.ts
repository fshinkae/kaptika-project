import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'
import { resetSupabaseMock } from './supabaseMock'

// O cliente Supabase real é substituído pelo mock stateful em todos os testes.
vi.mock('@supabase/supabase-js', async () => {
  const { authMock } = await import('./supabaseMock')
  return { createClient: () => ({ auth: authMock }) }
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetSupabaseMock()
})

afterAll(() => server.close())

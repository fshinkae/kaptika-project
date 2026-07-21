import { setupServer } from 'msw/node'

/** Servidor MSW compartilhado; cada teste registra seus handlers. */
export const server = setupServer()

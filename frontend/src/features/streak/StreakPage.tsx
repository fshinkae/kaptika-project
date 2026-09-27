import { StreakPanel } from './StreakPanel'

/**
 * Página de ofensiva pronta para montar em rota (ex.: /ofensiva). Envolve o
 * `StreakPanel` no container mobile-first padrão. O coordenador pluga esta
 * página no roteador — esta feature não edita App.tsx.
 */
export function StreakPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <StreakPanel showAction />
    </main>
  )
}

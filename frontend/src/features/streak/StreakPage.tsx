import { PageHeader } from '../../components/PageHeader'
import { StreakPanel } from './StreakPanel'

/**
 * Página de ofensiva pronta para montar em rota (ex.: /ofensiva). Envolve o
 * `StreakPanel` no container mobile-first padrão. O coordenador pluga esta
 * página no roteador — esta feature não edita App.tsx.
 */
export function StreakPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <PageHeader
        title="Ofensiva diária"
        subtitle="Uma sessão por dia faz a sequência crescer."
      />
      <StreakPanel showAction showHeading={false} />
    </main>
  )
}

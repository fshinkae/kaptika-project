import type { MyPosition } from './leaderboardApi'

/**
 * Cartão destacado com a posição do próprio estudante (bloco `me`), sempre
 * exibido mesmo que ele esteja fora da página carregada do ranking (FR-002).
 */
export function MyPositionCard({ me }: { me: MyPosition }) {
  return (
    <section
      aria-label="Sua posição"
      className="flex items-center justify-between rounded-control bg-pen-600 px-4 py-3 text-white"
    >
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-pen-100">Sua posição</span>
        <span className="text-lg font-semibold tabular-nums">#{me.rank}</span>
      </div>
      <span className="text-base font-semibold tabular-nums">
        {me.xp.toLocaleString('pt-BR')} XP
      </span>
    </section>
  )
}

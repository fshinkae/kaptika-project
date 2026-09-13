import type { BadgeCollection } from './badgesApi'
import { BadgeCard } from './BadgeCard'

/**
 * Galeria: separa conquistadas de bloqueadas (FR-003) em grids mobile-first
 * (1→2→3 colunas). Recebe a coleção já carregada pela página.
 */
export function BadgesGallery({ collection }: { collection: BadgeCollection }) {
  const achieved = collection.badges.filter((b) => b.achieved)
  const locked = collection.badges.filter((b) => !b.achieved)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="badges-achieved-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="badges-achieved-heading" className="text-base font-semibold text-slate-800">
            Conquistadas
          </h2>
          <span className="text-sm text-slate-600">
            {collection.achievedCount} de {collection.totalCount}
          </span>
        </div>
        {achieved.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achieved.map((badge) => (
              <BadgeCard key={badge.slug} badge={badge} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
            Você ainda não conquistou medalhas. Continue estudando para desbloquear a primeira!
          </p>
        )}
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="badges-locked-heading">
          <h2 id="badges-locked-heading" className="mb-3 text-base font-semibold text-slate-800">
            A conquistar
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((badge) => (
              <BadgeCard key={badge.slug} badge={badge} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

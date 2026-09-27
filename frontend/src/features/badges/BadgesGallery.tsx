import { Link } from 'react-router-dom'
import { buttonClassName } from '../../components/Button'
import { START_SESSION_ACTION } from '../../components/EmptyState'
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
          <h2 id="badges-achieved-heading" className="font-display text-base font-bold text-ink">
            Conquistadas
          </h2>
          <span className="text-sm text-ink-muted">
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
          <div className="flex flex-col gap-4 rounded-card bg-surface p-5 ring-1 ring-line">
            <p className="text-sm text-ink-muted">
              Você ainda não conquistou medalhas. A primeira vem ao concluir uma sessão.
            </p>
            <Link to={START_SESSION_ACTION.to} className={buttonClassName('primary')}>
              {START_SESSION_ACTION.label}
            </Link>
          </div>
        )}
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="badges-locked-heading">
          <h2 id="badges-locked-heading" className="mb-3 font-display text-base font-bold text-ink">
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

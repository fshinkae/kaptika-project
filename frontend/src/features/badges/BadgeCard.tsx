import { LockIcon, MedalIcon } from '../../components/Icons'
import type { BadgeView } from './badgesApi'
import { formatAwardedDate } from './badgeFormat'
import { BadgeProgressBar } from './BadgeProgressBar'

/**
 * Cartão de uma medalha (FR-003): conquistada mostra a data; bloqueada mostra
 * o objetivo (description) e, se cumulativa, a barra de progresso X/Y (FR-004).
 */
export function BadgeCard({ badge }: { badge: BadgeView }) {
  const achieved = badge.achieved
  const showProgress = !achieved && badge.progress !== null

  return (
    <li
      aria-label={`${badge.name} — ${achieved ? 'conquistada' : 'bloqueada'}`}
      className={`flex flex-col rounded-card p-4 ring-1 transition ${
        achieved ? 'bg-surface ring-pen-100' : 'bg-paper ring-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            achieved ? 'bg-highlight text-ink' : 'bg-line text-ink-muted'
          }`}
        >
          {achieved ? <MedalIcon className="h-6 w-6" /> : <LockIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <h3 className={`truncate font-semibold ${achieved ? 'text-ink' : 'text-ink-muted'}`}>
            {badge.name}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">{badge.description}</p>
        </div>
      </div>

      {achieved && badge.awardedAt ? (
        <p className="mt-3 text-xs text-ink-muted">
          Conquistada em{' '}
          <time dateTime={badge.awardedAt} className="font-medium text-ink">
            {formatAwardedDate(badge.awardedAt)}
          </time>
        </p>
      ) : null}

      {showProgress && badge.progress ? (
        <BadgeProgressBar progress={badge.progress} label={badge.name} />
      ) : null}
    </li>
  )
}

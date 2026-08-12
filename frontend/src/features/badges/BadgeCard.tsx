import type { BadgeView } from './badgesApi'
import { formatAwardedDate } from './badgeFormat'
import { BadgeProgressBar } from './BadgeProgressBar'

/** Iniciais da medalha como emblema-fallback (arte final fica fora de escopo). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)
  return chars.toUpperCase() || '?'
}

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
      className={`flex flex-col rounded-2xl p-4 ring-1 transition ${
        achieved ? 'bg-white ring-indigo-100' : 'bg-slate-50 ring-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
            achieved ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-400'
          }`}
        >
          {achieved ? initials(badge.name) : '🔒'}
        </span>
        <div className="min-w-0">
          <h3 className={`truncate font-semibold ${achieved ? 'text-slate-800' : 'text-slate-500'}`}>
            {badge.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{badge.description}</p>
        </div>
      </div>

      {achieved && badge.awardedAt ? (
        <p className="mt-3 text-xs text-slate-500">
          Conquistada em{' '}
          <time dateTime={badge.awardedAt} className="font-medium text-slate-700">
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

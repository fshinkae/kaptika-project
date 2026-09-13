import type { LeaderboardEntry } from './leaderboardApi'

/** Formata o XP com separador de milhar (pt-BR). */
function formatXp(xp: number): string {
  return xp.toLocaleString('pt-BR')
}

/**
 * Linha do ranking: ranque, nome e XP na ordem servida pela API (FR-001).
 * A linha do próprio estudante recebe realce (FR-002). Nomes repetidos são
 * distinguidos pela identidade estável de `profileId` (FR-007, key na lista).
 */
export function LeaderboardRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry
  isMe: boolean
}) {
  return (
    <li
      aria-current={isMe ? 'true' : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ${
        isMe
          ? 'bg-indigo-50 ring-indigo-300'
          : 'bg-white ring-slate-100'
      }`}
    >
      <span
        aria-label={`Posição ${entry.rank}`}
        className="w-9 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-600"
      >
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-800">
        {entry.displayName}
        {isMe && <span className="ml-2 text-xs font-semibold text-indigo-600">Você</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
        {formatXp(entry.xp)} XP
      </span>
    </li>
  )
}

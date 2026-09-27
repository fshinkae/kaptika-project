import { Link } from 'react-router-dom'
import { buttonClassName } from '../../components/Button'
import { START_SESSION_ACTION } from '../../components/EmptyState'
import { formatInt } from '../../lib/format'
import type { MyPosition, Scope } from './leaderboardApi'

/**
 * Cartão destacado com a posição do próprio estudante (bloco `me`), sempre
 * exibido mesmo que ele esteja fora da página carregada do ranking (FR-002).
 * Sem XP no recorte, a posição seria o último lugar (ou nenhuma): em vez de
 * um "#37" desanimador, o cartão diz como entrar no placar (PLC-1).
 */
export function MyPositionCard({
  me,
  scope,
  totalStudents,
}: {
  me: MyPosition
  scope: Scope
  totalStudents: number
}) {
  if (me.xp === 0 || me.rank <= 0) {
    return (
      <section
        aria-label="Sua posição"
        className="flex flex-col gap-3 rounded-card bg-surface p-5 ring-1 ring-line"
      >
        <div>
          <p className="font-semibold text-ink">
            {scope === 'weekly'
              ? 'Você ainda não pontuou nesta semana'
              : 'Você ainda não está no placar'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Cada acerto numa sessão vale XP e coloca você na disputa.
          </p>
        </div>
        <Link to={START_SESSION_ACTION.to} className={buttonClassName('primary')}>
          {START_SESSION_ACTION.label}
        </Link>
      </section>
    )
  }

  return (
    <section
      aria-label="Sua posição"
      className="flex items-center justify-between rounded-control bg-pen-600 px-4 py-3 text-white"
    >
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-pen-100">Sua posição</span>
        <span className="text-lg font-semibold tabular-nums">
          #{formatInt(me.rank)}
          {totalStudents > 0 && (
            <span className="text-sm font-medium text-pen-100"> de {formatInt(totalStudents)}</span>
          )}
        </span>
      </div>
      <span className="text-base font-semibold tabular-nums">{formatInt(me.xp)} XP</span>
    </section>
  )
}

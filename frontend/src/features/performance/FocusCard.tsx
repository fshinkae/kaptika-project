import { Link } from 'react-router-dom'
import { buttonClassName } from '../../components/Button'
import { areaLabel, formatPercent } from './format'
import type { AreaPerformance, Recommendation } from './performanceApi'

/**
 * "Onde focar" (US2): traduz a recomendação da API em texto e leva direto a
 * uma sessão na área indicada (FR-004, FR-009). A regra é do backend.
 */
export function FocusCard({
  recommendation,
  areas,
}: {
  recommendation: Recommendation
  areas: AreaPerformance[]
}) {
  const { title, detail, action } = content(recommendation, areas)

  return (
    <section
      aria-labelledby="focus-heading"
      className="flex flex-col gap-3 rounded-card bg-highlight-soft p-5 ring-1 ring-line"
    >
      <h2 id="focus-heading" className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        Onde focar
      </h2>
      <p className="font-display text-lg leading-snug font-bold text-ink">{title}</p>
      <p className="text-sm text-ink-muted">{detail}</p>
      <Link to={action.to} className={buttonClassName('primary')}>
        {action.label}
      </Link>
    </section>
  )
}

function content(recommendation: Recommendation, areas: AreaPerformance[]) {
  const { area, reason } = recommendation
  if (area == null || reason === 'INSUFFICIENT_DATA') {
    return {
      title: 'Responda mais questões para ver onde focar.',
      detail: 'Com mais algumas sessões, mostramos a área que merece mais atenção.',
      action: { to: '/estudar', label: 'Começar uma sessão' },
    }
  }

  const label = areaLabel(area)
  const action = { to: `/estudar?area=${area}`, label: `Estudar ${label}` }
  if (reason === 'NOT_PRACTICED') {
    return {
      title: `Você ainda não praticou ${label}.`,
      detail: 'Uma sessão curta já mostra como você está nessa área.',
      action,
    }
  }

  const accuracy = areas.find((a) => a.area === area)?.accuracy
  return {
    title:
      accuracy == null
        ? `${label} é sua área com menor acerto.`
        : `${label} é sua área com menor acerto (${formatPercent(accuracy)}).`,
    detail: 'Treinar aqui é o jeito mais rápido de subir sua nota.',
    action,
  }
}

import { AREAS, type AreaSlug } from '../session/sessionApi'

/** "47%" — só formatação do valor da API (FR-003). */
export function formatPercent(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`
}

export function areaLabel(slug: AreaSlug): string {
  return AREAS.find((area) => area.slug === slug)?.label ?? slug
}

/**
 * A API manda datas de calendário já no fuso do servidor: a string vira um
 * instante UTC e é formatada em UTC, para nenhum fuso do aparelho deslocar o dia.
 */
function calendarDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** "08/03" */
export function formatShortDate(isoDate: string): string {
  return shortDate.format(calendarDate(isoDate))
}

/** "dom., 8 de mar." */
export function formatLongDate(isoDate: string): string {
  return longDate.format(calendarDate(isoDate))
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(isoDate: string): number {
  return calendarDate(isoDate).getUTCDay()
}

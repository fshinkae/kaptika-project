const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

/**
 * Formata a data de conquista (ISO/Instant do backend) em pt-BR. O instante
 * já vem no fuso do servidor; a UI apenas reflete (invariante de datas).
 */
export function formatAwardedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date)
}

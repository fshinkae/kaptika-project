/** Formatação de números para exibição (pt-BR). Nenhum valor é calculado aqui. */

const integer = new Intl.NumberFormat('pt-BR')

/** Inteiro com separador de milhar (ex.: 1.250). */
export function formatInt(n: number): string {
  return integer.format(n)
}

/** "1 dia", "2 dias". */
export function formatDays(n: number): string {
  return `${formatInt(n)} ${n === 1 ? 'dia' : 'dias'}`
}

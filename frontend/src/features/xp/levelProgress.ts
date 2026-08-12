/**
 * Derivação de apresentação da barra de progresso do nível.
 *
 * A API entrega apenas `xpToNextLevel` (o que falta), não o tamanho da faixa
 * do nível. Para desenhar a barra precisamos do denominador — a faixa do nível
 * atual. Ela é conhecida pela curva documentada no backend (`LevelCurve`):
 * subir do nível N para N+1 custa `100 × N` XP. Este é o ÚNICO ponto do
 * frontend que replica a curva, e o faz só para posição visual — nenhum XP é
 * calculado, inventado ou persistido; o total/nível vêm sempre da API.
 */

/** Tamanho da faixa (XP total) para avançar do nível informado ao próximo. */
export function levelSpan(level: number): number {
  return 100 * Math.max(1, level)
}

export interface LevelProgress {
  /** XP já conquistado dentro do nível atual. */
  xpIntoLevel: number
  /** Tamanho da faixa do nível atual. */
  span: number
  /** Percentual preenchido (0–100, inteiro, limitado). */
  percent: number
}

/**
 * Progresso dentro do nível atual a partir do nível e do XP restante,
 * ambos confirmados pela API. Robusto a valores fora de faixa.
 */
export function levelProgress(level: number, xpToNextLevel: number): LevelProgress {
  const span = levelSpan(level)
  const remaining = Math.min(Math.max(xpToNextLevel, 0), span)
  const xpIntoLevel = span - remaining
  const percent = Math.round((xpIntoLevel / span) * 100)
  return { xpIntoLevel, span, percent }
}

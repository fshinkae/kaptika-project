/**
 * Superfície pública da feature 003 (XP e níveis) para o coordenador plugar.
 * Widgets de topo + peças reutilizáveis; nada aqui edita rotas ou fundação.
 */
export { XpPanel } from './XpPanel'
export { LevelMeter } from './LevelMeter'
export { useXpSummary, xpQueryKey } from './useXpSummary'
export { getXpSummary } from './xpApi'
export type { XpSummary } from './xpApi'
export { levelProgress, levelSpan } from './levelProgress'
export type { LevelProgress } from './levelProgress'

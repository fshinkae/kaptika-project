import { describe, expect, it } from 'vitest'
import { levelProgress, levelSpan } from './levelProgress'

describe('levelProgress', () => {
  it('faixa do nível segue a curva do backend (100 × N)', () => {
    expect(levelSpan(1)).toBe(100)
    expect(levelSpan(2)).toBe(200)
    expect(levelSpan(5)).toBe(500)
  })

  it('percentual é derivado de xpToNextLevel dentro da faixa', () => {
    // Nível 2 (faixa 200), faltando 50 → 150 conquistados → 75%.
    expect(levelProgress(2, 50)).toEqual({ xpIntoLevel: 150, span: 200, percent: 75 })
  })

  it('início do nível → 0% e nível quase completo → ~100%', () => {
    expect(levelProgress(3, 300).percent).toBe(0) // faltando a faixa inteira
    expect(levelProgress(3, 3).percent).toBe(99)
  })

  it('limita valores fora de faixa (robustez)', () => {
    expect(levelProgress(1, -10).percent).toBe(100) // restante negativo
    expect(levelProgress(1, 999).percent).toBe(0) // restante maior que a faixa
  })
})

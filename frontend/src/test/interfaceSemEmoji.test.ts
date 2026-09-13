import { describe, expect, it } from 'vitest'

// Faixas de emoji e pictogramas coloridos; setas e sinais tipográficos ficam de fora.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u

// Código-fonte das telas e componentes, lido pelo próprio Vite (sem APIs de Node).
const sources = import.meta.glob<string>(['../**/*.tsx', '!../**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('identidade visual', () => {
  it('a interface usa ícones próprios, sem emoji (ICON-1)', () => {
    const offenders = Object.entries(sources).flatMap(([file, code]) =>
      code
        .split('\n')
        .flatMap((text, i) => (EMOJI.test(text) ? [`${file}:${i + 1}`] : [])),
    )

    expect(Object.keys(sources).length).toBeGreaterThan(20)
    expect(offenders).toEqual([])
  })
})

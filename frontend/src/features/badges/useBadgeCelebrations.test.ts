import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBadgeCelebrations } from './useBadgeCelebrations'
import type { BadgeView } from './badgesApi'

function badge(slug: string, achieved: boolean): BadgeView {
  return {
    slug,
    name: slug,
    description: 'obj',
    achieved,
    awardedAt: achieved ? '2026-07-20T00:00:00Z' : null,
    progress: null,
  }
}

describe('useBadgeCelebrations', () => {
  beforeEach(() => localStorage.clear())

  it('semeia as conquistadas iniciais sem celebrar (FR-002)', () => {
    const initial = [badge('a', true), badge('b', false)]
    const { result } = renderHook(() => useBadgeCelebrations(initial, 'u'))
    expect(result.current.current).toBeNull()
  })

  it('celebra uma medalha concedida após o carregamento inicial (FR-001)', () => {
    const { result, rerender } = renderHook(
      ({ badges }: { badges: BadgeView[] }) => useBadgeCelebrations(badges, 'u'),
      { initialProps: { badges: [badge('a', true), badge('b', false)] } },
    )
    expect(result.current.current).toBeNull() // semeadura

    act(() => rerender({ badges: [badge('a', true), badge('b', true)] }))
    expect(result.current.current?.slug).toBe('b')
  })

  it('não recelebra a mesma medalha em recarregamentos (FR-002)', () => {
    const seen = [badge('a', true)]
    const { result, rerender } = renderHook(
      ({ badges }: { badges: BadgeView[] }) => useBadgeCelebrations(badges, 'u'),
      { initialProps: { badges: seen } },
    )
    act(() => rerender({ badges: [badge('a', true)] })) // mesma coleção recarregada
    expect(result.current.current).toBeNull()
  })

  it('enfileira múltiplas concessões e as dispensa uma a uma (FR-006)', () => {
    const { result, rerender } = renderHook(
      ({ badges }: { badges: BadgeView[] }) => useBadgeCelebrations(badges, 'u'),
      { initialProps: { badges: [badge('a', false), badge('b', false)] } },
    )
    act(() => rerender({ badges: [badge('a', true), badge('b', true)] }))

    expect(result.current.current?.slug).toBe('a')
    act(() => result.current.dismiss())
    expect(result.current.current?.slug).toBe('b')
    act(() => result.current.dismiss())
    expect(result.current.current).toBeNull()
  })
})

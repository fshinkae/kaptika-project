import { useCallback, useEffect, useRef, useState } from 'react'
import type { BadgeView } from './badgesApi'

const STORAGE_PREFIX = 'kaptika:badges:celebrated:'

function storageKeyFor(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readStored(key: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed as string[]) : null
  } catch {
    return null
  }
}

function writeStored(key: string, seen: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...seen]))
  } catch {
    // localStorage indisponível — celebração é preferência de UI, ignora.
  }
}

/** Uma celebração ativa e a ação de dispensá-la (avança a fila). */
export interface BadgeCelebrationsState {
  current: BadgeView | null
  dismiss: () => void
}

/**
 * Detecta medalhas recém-concedidas pela API e as enfileira para celebração
 * (FR-001/006), sem recelebrar as já obtidas (FR-002). No primeiro carregamento
 * de cada usuário, o conjunto atual de conquistadas é **semeado** como "já
 * visto" (sem celebrar) e persistido; conquistas que surgirem depois entram
 * numa fila exibida uma a uma. Persistência apenas de preferência de UI — o
 * estado de domínio continua sendo o da API.
 */
export function useBadgeCelebrations(
  badges: BadgeView[] | undefined,
  userId: string | null | undefined,
): BadgeCelebrationsState {
  const [queue, setQueue] = useState<BadgeView[]>([])
  const seenRef = useRef<Set<string> | null>(null)
  const keyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || !badges) return
    const key = storageKeyFor(userId)

    // Troca de usuário → recomeça a semeadura e limpa a fila pendente.
    if (keyRef.current !== key) {
      keyRef.current = key
      seenRef.current = null
      setQueue([])
    }

    // Primeira vez para este usuário: carrega o "já visto" ou semeia com as
    // conquistadas atuais, sem celebrá-las (FR-002).
    if (seenRef.current === null) {
      const stored = readStored(key)
      if (stored) {
        seenRef.current = stored
      } else {
        const seeded = new Set(badges.filter((b) => b.achieved).map((b) => b.slug))
        seenRef.current = seeded
        writeStored(key, seeded)
        return
      }
    }

    const seen = seenRef.current
    const fresh = badges.filter((b) => b.achieved && !seen.has(b.slug))
    if (fresh.length === 0) return

    for (const b of fresh) seen.add(b.slug)
    writeStored(key, seen)
    setQueue((q) => [...q, ...fresh])
  }, [badges, userId])

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])

  return { current: queue[0] ?? null, dismiss }
}

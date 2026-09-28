import { SegmentedTabs } from '../../components/SegmentedTabs'
import type { Scope } from './leaderboardApi'

const OPTIONS: readonly { value: Scope; label: string }[] = [
  { value: 'global', label: 'Geral' },
  { value: 'weekly', label: 'Semanal' },
]

/** Seletor de recorte geral/semanal (FR-003, FR-009). */
export function ScopeTabs({
  scope,
  onChange,
}: {
  scope: Scope
  onChange: (next: Scope) => void
}) {
  return <SegmentedTabs options={OPTIONS} value={scope} onChange={onChange} label="Recorte do placar" />
}

import { useState } from 'react'
import { EmptyState, START_SESSION_ACTION } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PageHeader } from '../../components/PageHeader'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { ActivityCalendar } from './ActivityCalendar'
import { AreaAccuracyChart } from './AreaAccuracyChart'
import { DailyTable } from './DailyTable'
import { DailyXpChart } from './DailyXpChart'
import { FocusCard } from './FocusCard'
import { DEFAULT_WINDOW, WINDOWS, type WindowDays } from './performanceApi'
import { TotalsSummary } from './TotalsSummary'
import { usePerformance } from './usePerformance'

const WINDOW_OPTIONS = WINDOWS.map((days) => ({ value: days, label: `${days} dias` }))

/**
 * Painel de desempenho (feature 007): onde focar, acerto por área e evolução
 * na janela escolhida. Números e recomendação vêm prontos da API (FR-003);
 * trata carregando, erro com repetir e vazio (FR-006).
 */
export function PerformancePage() {
  const [days, setDays] = useState<WindowDays>(DEFAULT_WINDOW)
  const query = usePerformance(days)

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-8 pb-12">
      <PageHeader
        title="Seu desempenho"
        subtitle="Onde você vai bem e o que merece mais treino."
      />

      <SegmentedTabs options={WINDOW_OPTIONS} value={days} onChange={setDays} label="Período" />

      {query.isPending ? (
        <LoadingState label="Carregando seu desempenho…" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data.totals.answered === 0 ? (
        <EmptyState action={START_SESSION_ACTION}>
          Nenhuma questão respondida nos últimos {query.data.windowDays} dias.
        </EmptyState>
      ) : (
        <div
          aria-busy={query.isPlaceholderData}
          className={`flex flex-col gap-6 transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <FocusCard recommendation={query.data.recommendation} areas={query.data.areas} />
          <TotalsSummary totals={query.data.totals} />
          <AreaAccuracyChart areas={query.data.areas} />
          <DailyXpChart daily={query.data.daily} />
          <ActivityCalendar daily={query.data.daily} />
          <DailyTable daily={query.data.daily} />
        </div>
      )}
    </main>
  )
}

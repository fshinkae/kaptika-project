import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getPerformance, type WindowDays } from './performanceApi'

/**
 * Desempenho por janela. Trocar a janela mantém os dados anteriores na tela
 * (esmaecidos pela página) até a nova resposta chegar, sem voltar ao carregando.
 */
export function usePerformance(days: WindowDays) {
  return useQuery({
    queryKey: ['performance', days],
    queryFn: () => getPerformance(days),
    placeholderData: keepPreviousData,
  })
}

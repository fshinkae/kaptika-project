import { formatInt } from '../../lib/format'
import { formatLongDate } from './format'
import type { DailyPoint } from './performanceApi'

/**
 * Os dados dos gráficos de evolução, dia a dia, para leitor de tela (FR-007).
 * O `sr-only` fica num div: tabela ignora a largura de 1px e estouraria a tela.
 */
export function DailyTable({ daily }: { daily: DailyPoint[] }) {
  return (
    <div className="sr-only">
      <table>
        <caption>Detalhe por dia</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">XP</th>
            <th scope="col">Respondidas</th>
            <th scope="col">Acertos</th>
            <th scope="col">Meta</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatLongDate(point.date)}</th>
              <td>{formatInt(point.xp)}</td>
              <td>{formatInt(point.answered)}</td>
              <td>{formatInt(point.correct)}</td>
              <td>{point.activeDay ? 'cumprida' : 'não cumprida'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

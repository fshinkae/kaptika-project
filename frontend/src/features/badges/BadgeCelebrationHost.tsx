import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { getBadges } from './badgesApi'
import { BadgeCelebration } from './BadgeCelebration'
import { useBadgeCelebrations } from './useBadgeCelebrations'

/**
 * Celebra medalhas novas em qualquer tela privada (MED-1). Montado no AppShell,
 * semeia o "já visto" logo no primeiro acesso — para um aluno novo, antes da 1ª
 * sessão —, e a medalha concedida ao encerrar aparece quando o resumo reconsulta
 * `['badges']`. Antes, só /medalhas celebrava, e já semeando a conquista como vista.
 */
export function BadgeCelebrationHost() {
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['badges'], queryFn: getBadges })
  const celebration = useBadgeCelebrations(query.data?.badges, user?.id)

  return celebration.current ? (
    <BadgeCelebration badge={celebration.current} onDismiss={celebration.dismiss} />
  ) : null
}

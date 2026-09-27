import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { buttonClassName } from '../components/Button'
import { MedalIcon, RankIcon } from '../components/Icons'
import { LogoMark } from '../components/Logo'
import { PageHeader } from '../components/PageHeader'
import { XpPanel } from '../features/xp'
import { StreakPanel, getStreak } from '../features/streak'

const SHORTCUT_CLASS =
  'flex min-h-14 items-center justify-center gap-2 rounded-card bg-surface text-sm font-semibold text-ink ' +
  'ring-1 ring-line transition hover:ring-pen-200 active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600'

/** Tela inicial autenticada: progresso do estudante + atalhos para estudar e explorar. */
export function HomePage() {
  // Recorde 0 = nunca concluiu uma sessão com resposta (meta da ofensiva): o
  // convite fala da primeira sessão. Mesmo cache do painel, sem requisição extra.
  const streak = useQuery({ queryKey: ['streak'], queryFn: getStreak })
  const firstTime = streak.data?.record === 0
  // Ofensiva em curso e sessão de hoje por fazer (STK-1): o botão diz o que está em jogo.
  const pendingToday = streak.data != null && streak.data.current > 0 && !streak.data.metToday

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-8 pb-12">
      <PageHeader
        above={<LogoMark className="h-8 w-8" />}
        title="Bora estudar?"
        subtitle={
          firstTime
            ? 'Escolha uma área, responda e veja o gabarito na hora.'
            : 'Sessões curtas de ENEM, no seu ritmo.'
        }
      />

      <Link to="/estudar" className={buttonClassName('primary', '', 'lg')}>
        {firstTime
          ? 'Começar primeira sessão'
          : pendingToday
            ? 'Fazer a sessão de hoje'
            : 'Iniciar sessão de estudo'}
      </Link>

      <XpPanel />
      <StreakPanel />

      <div className="grid grid-cols-2 gap-3">
        <Link to="/medalhas" className={SHORTCUT_CLASS}>
          <MedalIcon className="h-5 w-5 text-pen-600" />
          Medalhas
        </Link>
        <Link to="/placar" className={SHORTCUT_CLASS}>
          <RankIcon className="h-5 w-5 text-pen-600" />
          Placar
        </Link>
      </div>
    </main>
  )
}

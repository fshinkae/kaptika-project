import { Link } from 'react-router-dom'
import { XpPanel } from '../features/xp'
import { StreakPanel } from '../features/streak'

/** Tela inicial autenticada: progresso do estudante + atalhos para estudar e explorar. */
export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Bora estudar?</h1>
        <p className="mt-1 text-slate-600">Sessões curtas de ENEM, no seu ritmo.</p>
      </header>

      <Link
        to="/estudar"
        className="flex min-h-[56px] items-center justify-center rounded-2xl bg-indigo-600 px-4 text-lg font-semibold text-white transition hover:bg-indigo-700"
      >
        Iniciar sessão de estudo
      </Link>

      <XpPanel />
      <StreakPanel />

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/medalhas"
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-sm font-medium text-slate-700 ring-1 ring-slate-100"
        >
          <span aria-hidden className="text-xl">🏅</span>
          Medalhas
        </Link>
        <Link
          to="/placar"
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-sm font-medium text-slate-700 ring-1 ring-slate-100"
        >
          <span aria-hidden className="text-xl">🏆</span>
          Placar
        </Link>
      </div>
    </main>
  )
}

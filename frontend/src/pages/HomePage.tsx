import { Link } from 'react-router-dom'
import { XpPanel } from '../features/xp'
import { StreakPanel } from '../features/streak'

/** Tela inicial autenticada: progresso do estudante + atalhos para estudar e explorar. */
export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Bora estudar?</h1>
        <p className="mt-1 text-slate-600">Sessões curtas de ENEM, no seu ritmo.</p>
      </header>

      <Link
        to="/estudar"
        className="flex min-h-[56px] items-center justify-center rounded-2xl bg-indigo-600 px-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition duration-200 hover:-translate-y-px hover:bg-indigo-700 active:translate-y-0 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Iniciar sessão de estudo
      </Link>

      <XpPanel />
      <StreakPanel />

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/medalhas"
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-100 transition duration-200 hover:-translate-y-px hover:ring-indigo-200 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden className="text-xl">🏅</span>
          Medalhas
        </Link>
        <Link
          to="/placar"
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-100 transition duration-200 hover:-translate-y-px hover:ring-indigo-200 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden className="text-xl">🏆</span>
          Placar
        </Link>
      </div>
    </main>
  )
}

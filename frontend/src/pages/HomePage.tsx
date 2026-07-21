import { Link } from 'react-router-dom'

/**
 * Tela inicial de estudo (placeholder da fundação). O fluxo de sessões
 * chega na feature 002; por ora, ponto de partida autenticado com acesso
 * ao perfil.
 */
export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Bora estudar?</h1>
      <p className="text-slate-600">
        Suas sessões de microlearning para o ENEM aparecerão aqui.
      </p>
      <Link
        to="/perfil"
        className="min-h-[44px] rounded-xl bg-white px-4 py-3 text-center font-medium text-indigo-700 ring-1 ring-indigo-200"
      >
        Ver meu perfil
      </Link>
    </main>
  )
}

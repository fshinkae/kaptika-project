import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/estudar', label: 'Estudar', icon: '📚', end: false },
  { to: '/placar', label: 'Placar', icon: '🏆', end: false },
  { to: '/perfil', label: 'Perfil', icon: '👤', end: false },
] as const

/** Navegação inferior mobile-first, presente nas telas privadas. */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <span aria-hidden className="text-lg">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

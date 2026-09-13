import { NavLink } from 'react-router-dom'
import { HomeIcon, RankIcon, StudyIcon, UserIcon } from './Icons'

const items = [
  { to: '/', label: 'Início', Icon: HomeIcon, end: true },
  { to: '/estudar', label: 'Estudar', Icon: StudyIcon, end: false },
  { to: '/placar', label: 'Placar', Icon: RankIcon, end: false },
  { to: '/perfil', label: 'Perfil', Icon: UserIcon, end: false },
] as const

/** Navegação inferior mobile-first, presente nas telas privadas. */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs transition
                focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-pen-600 ${
                  isActive ? 'font-semibold text-pen-600' : 'font-medium text-ink-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.3 : 1.9} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

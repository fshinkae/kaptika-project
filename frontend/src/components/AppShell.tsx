import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/** Moldura das telas privadas: conteúdo rolável + navegação inferior fixa. */
export function AppShell() {
  return (
    <div className="min-h-dvh pb-16">
      <Outlet />
      <BottomNav />
    </div>
  )
}

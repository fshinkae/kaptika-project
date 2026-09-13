import { useEffect, useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { BottomNav } from './BottomNav'

interface ShellContext {
  setFocusMode: (on: boolean) => void
}

/** Moldura das telas privadas: conteúdo rolável + navegação inferior fixa. */
export function AppShell() {
  const [focusMode, setFocusMode] = useState(false)
  return (
    <div className={`min-h-dvh ${focusMode ? '' : 'pb-16'}`}>
      <Outlet context={{ setFocusMode } satisfies ShellContext} />
      {!focusMode && <BottomNav />}
    </div>
  )
}

/**
 * Modo foco: enquanto a tela estiver montada, a navegação inferior some (evita
 * sair da questão sem querer). Fora do AppShell (ex.: testes), não faz nada.
 */
export function useFocusMode() {
  const setFocusMode = useOutletContext<ShellContext | undefined>()?.setFocusMode
  useEffect(() => {
    if (!setFocusMode) return
    setFocusMode(true)
    return () => setFocusMode(false)
  }, [setFocusMode])
}

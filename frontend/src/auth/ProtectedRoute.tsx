import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingState } from '../components/LoadingState'

/**
 * Guardião de rotas privadas (FR-004, SC-002): sem sessão ativa, redireciona
 * ao login preservando o destino em `state.from`. Enquanto a sessão persistida
 * é restaurada, mostra carregamento (evita piscar o login em reaberturas).
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Carregando…" />
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

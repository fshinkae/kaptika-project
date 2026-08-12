import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/LoadingState'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecoverPasswordPage } from './pages/RecoverPasswordPage'
import { SignupPage } from './pages/SignupPage'
import { SessionFlowPage } from './features/session/SessionFlowPage'
import { StreakPage } from './features/streak'
import { BadgesGalleryPage } from './features/badges'
import { LeaderboardPage } from './features/leaderboard'

/** Rotas públicas de auth: usuário já logado é levado à tela inicial. */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState />
  return session ? <Navigate to="/" replace /> : <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/cadastro" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
      <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/estudar" element={<SessionFlowPage />} />
          <Route path="/ofensiva" element={<StreakPage />} />
          <Route path="/medalhas" element={<BadgesGalleryPage />} />
          <Route path="/placar" element={<LeaderboardPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

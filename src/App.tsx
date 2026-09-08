import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { ResetScreen } from './auth/ResetScreen'
import { currentRoute } from './lib/router'
import { Screen } from './Screen'

export default function App() {
  const { user, loading } = useAuth()

  if (currentRoute() === 'reset-password') return <ResetScreen />
  /* Before /api/me answers, showing the sign-in form would flash it at
     someone who is already signed in. */
  if (loading) return <div className="auth"><p className="auth-sub">…</p></div>
  if (!user) return <AuthScreen />

  return <Screen />
}

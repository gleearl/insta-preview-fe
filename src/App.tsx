import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { Screen } from './Screen'

export default function App() {
  const { user, loading } = useAuth()

  /* Before /api/me answers, showing the sign-in screen would flash it at
     someone who is already signed in. */
  if (loading) return <div className="auth"><p className="auth-sub">…</p></div>
  if (!user) return <AuthScreen />

  return <Screen />
}

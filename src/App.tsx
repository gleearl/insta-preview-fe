import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { ResetScreen } from './auth/ResetScreen'
import { currentRoute } from './lib/router'

export default function App() {
  const { user, loading } = useAuth()

  if (currentRoute() === 'reset-password') return <ResetScreen />
  /* Before /api/me answers, showing the sign-in form would flash it at
     someone who is already signed in. */
  if (loading) return <div className="auth"><p className="auth-sub">…</p></div>
  if (!user) return <AuthScreen />

  return <div className="screen"><p style={{ padding: 16 }}>Signed in as {user.email}</p></div>
}

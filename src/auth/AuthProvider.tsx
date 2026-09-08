import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setToken } from '../lib/api'
import type { User } from '../types'

type AuthValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<void>
  signOut: () => Promise<void>
  forgot: (email: string) => Promise<string>
  reset: (token: string, email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth used outside AuthProvider')
  return value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /* A stored token proves nothing — it may have been revoked from another
     device. Asking the server once on boot is what makes the app's idea of
     "signed in" true rather than hopeful. */
  useEffect(() => {
    api.get<{ user: User }>('/api/me')
      .then(r => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback((r: { token: string; user: User }) => {
    setToken(r.token)
    setUser(r.user)
  }, [])

  const value: AuthValue = {
    user,
    loading,
    signIn: async (email, password) =>
      accept(await api.post<{ token: string; user: User }>('/api/login', { email, password })),
    register: async (name, email, password) =>
      accept(await api.post<{ token: string; user: User }>('/api/register', { name, email, password })),
    signInWithGoogle: async idToken =>
      accept(await api.post<{ token: string; user: User }>('/api/auth/google', { id_token: idToken })),
    signOut: async () => {
      /* The local session goes regardless. A network failure on the way out
         must not leave someone apparently still signed in. */
      await api.post('/api/logout').catch(() => {})
      setToken(null)
      setUser(null)
    },
    forgot: async email =>
      (await api.post<{ message: string }>('/api/forgot-password', { email })).message,
    reset: async (token, email, password) => {
      await api.post('/api/reset-password', { token, email, password })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

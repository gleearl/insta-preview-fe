import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from './AuthProvider'
import { GoogleButton } from './GoogleButton'

type Mode = 'signin' | 'register' | 'forgot'

export function AuthScreen() {
  const { signIn, register, forgot } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signin') await signIn(email, password)
      else if (mode === 'register') await register(name, email, password)
      else setNotice(await forgot(email))
    } catch (e) {
      /* first() prefers the field-level message, which is the one that says
         what is actually wrong. */
      setError(e instanceof ApiError ? e.first() : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1 className="auth-title">Insta Preview</h1>
      <p className="auth-sub">Plan your grid before you post it.</p>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <input className="field" placeholder="Name" value={name} autoComplete="name"
            onChange={e => setName(e.target.value)} required />
        )}

        <input className="field" type="email" placeholder="Email" value={email}
          autoComplete="email" onChange={e => setEmail(e.target.value)} required />

        {mode !== 'forgot' && (
          <input className="field" type="password" placeholder="Password" value={password}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onChange={e => setPassword(e.target.value)} required minLength={8} />
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Log in' : mode === 'register' ? 'Sign up' : 'Send reset link'}
        </button>
      </form>

      {mode !== 'forgot' && <GoogleButton onError={setError} />}

      <div className="auth-links">
        {mode === 'signin' && (
          <>
            <button className="link" onClick={() => setMode('forgot')}>Forgot password?</button>
            <button className="link" onClick={() => setMode('register')}>Create an account</button>
          </>
        )}
        {mode !== 'signin' && (
          <button className="link" onClick={() => setMode('signin')}>Back to log in</button>
        )}
      </div>
    </div>
  )
}

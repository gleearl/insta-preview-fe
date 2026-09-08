import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { goHome, resetParams } from '../lib/router'
import { useAuth } from './AuthProvider'

export function ResetScreen() {
  const { reset } = useAuth()
  const { token, email } = resetParams()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await reset(token, email, password)
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'That reset link did not work.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth">
        <h1 className="auth-title">Password changed</h1>
        <p className="auth-sub">You can log in with it now.</p>
        <button className="primary" onClick={() => { goHome(); window.location.reload() }}>
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">for {email}</p>

      <form className="auth-form" onSubmit={submit}>
        <input className="field" type="password" placeholder="New password" value={password}
          autoComplete="new-password" minLength={8} required
          onChange={e => setPassword(e.target.value)} />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}

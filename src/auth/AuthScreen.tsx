import { useState } from 'react'
import { GoogleButton } from './GoogleButton'

/**
 * The only way in.
 *
 * There is no form here because there is no password anywhere in this
 * application — see the API's routes/api.php. Google says who someone is, the
 * server checks the signature, and that is the whole of it.
 */
export function AuthScreen() {
  const [error, setError] = useState('')

  return (
    <div className="auth">
      <h1 className="auth-title">Insta Preview</h1>
      <p className="auth-sub">Plan your grid before you post it.</p>

      <GoogleButton onError={setError} />

      {error && <p className="auth-error" role="alert">{error}</p>}

      <p className="auth-foot">
        Your Instagram photos and drafts stay on your own account. Signing in
        with Google tells us nothing but your name, email and picture.
      </p>
    </div>
  )
}

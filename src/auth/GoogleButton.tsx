import { useEffect, useRef } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from './AuthProvider'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/* Google Identity Services attaches itself to window and has no types here.
   Declaring only what is used keeps this to the shape actually relied on. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void
        }
      }
    }
  }
}

export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const holder = useRef<HTMLDivElement>(null)
  const { signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!CLIENT_ID) return

    /* The GSI script is async, so it may not have arrived yet. Polling beats
       an onload handler here: the script tag is in index.html, not ours. */
    let cancelled = false

    const tryRender = (): boolean => {
      if (cancelled || !window.google || !holder.current) return false

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: ({ credential }) => {
          signInWithGoogle(credential).catch(e => {
            onError(e instanceof ApiError ? e.first() : 'Google sign-in failed.')
          })
        },
      })

      window.google.accounts.id.renderButton(holder.current, {
        theme: 'outline', size: 'large', width: 320, text: 'continue_with',
      })

      return true
    }

    if (tryRender()) return

    const timer = window.setInterval(() => { if (tryRender()) window.clearInterval(timer) }, 100)
    /* Give up rather than poll forever — a blocked script should cost nothing. */
    const stop = window.setTimeout(() => window.clearInterval(timer), 10_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [signInWithGoogle, onError])

  /* No client id configured means no button. A Google button that fails when
     pressed is worse than one that was never offered. */
  if (!CLIENT_ID) return null

  return (
    <div className="google-button">
      <div ref={holder} />
    </div>
  )
}

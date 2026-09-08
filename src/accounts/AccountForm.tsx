import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'
import type { AccountDraft } from './useAccounts'
import type { Account } from '../types'

type Props = {
  account: Account | null
  onSubmit: (draft: AccountDraft) => Promise<unknown>
  onCancel: () => void
}

export function AccountForm({ account, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<'online' | 'offline'>(account?.kind ?? 'offline')
  const [username, setUsername] = useState(account?.username ?? '')
  const [token, setToken] = useState('')
  const [displayName, setDisplayName] = useState(account?.display_name ?? '')
  const [bio, setBio] = useState(account?.bio ?? '')
  const [followers, setFollowers] = useState(account?.followers_count?.toString() ?? '')
  const [following, setFollowing] = useState(account?.following_count?.toString() ?? '')
  const [posts, setPosts] = useState(account?.posts_count?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const number = (value: string): number | null => (value.trim() === '' ? null : Number(value))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await onSubmit({
        username: username.trim().replace(/^@/, ''),
        kind,
        /* Only when one was typed: sending an empty string on an edit would
           wipe a token that is working fine. */
        ...(token.trim() ? { access_token: token.trim() } : {}),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        followers_count: number(followers),
        following_count: number(following),
        posts_count: number(posts),
      })
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'Could not save that account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="segmented">
        <button type="button" className="segment" aria-pressed={kind === 'offline'}
          onClick={() => setKind('offline')}>Manual</button>
        <button type="button" className="segment" aria-pressed={kind === 'online'}
          onClick={() => setKind('online')}>Instagram</button>
      </div>

      <input className="field" placeholder="Username" value={username}
        onChange={e => setUsername(e.target.value)} required maxLength={30} />

      {kind === 'online' && (
        <>
          <input className="field"
            placeholder={account?.has_token ? 'Access token (unchanged)' : 'Access token'}
            value={token} onChange={e => setToken(e.target.value)}
            required={!account?.has_token} />
          <p className="hint">
            Instagram → Settings → Account type and tools → switch to a Professional
            account, then generate a token in the Meta developer console.
          </p>
        </>
      )}

      <input className="field" placeholder="Display name" value={displayName}
        onChange={e => setDisplayName(e.target.value)} maxLength={100} />

      <textarea className="field field-area" placeholder="Bio" value={bio}
        onChange={e => setBio(e.target.value)} maxLength={500} rows={3} />

      {/* Synced for an Instagram account, so editing them by hand would only
          be overwritten on the next sync. */}
      {kind === 'offline' && (
        <div className="counts">
          <input className="field" inputMode="numeric" placeholder="Posts" value={posts}
            onChange={e => setPosts(e.target.value)} />
          <input className="field" inputMode="numeric" placeholder="Followers" value={followers}
            onChange={e => setFollowers(e.target.value)} />
          <input className="field" inputMode="numeric" placeholder="Following" value={following}
            onChange={e => setFollowing(e.target.value)} />
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button className="primary" type="submit" disabled={busy}>{busy ? '…' : 'Save'}</button>
      <button className="pill" type="button" onClick={onCancel}>Cancel</button>
    </form>
  )
}

import type { ReactNode } from 'react'
import type { Account } from '../types'
import { StatsRow } from './StatsRow'

type Props = {
  account: Account
  onSwitch: () => void
  /* Instagram's `+` and `☰` live here. In preview mode nothing is passed, and
     the header is bare — which is what a real profile's own header looks like
     to anyone but its owner. */
  actions?: ReactNode
}

export function ProfileHeader({ account, onSwitch, actions }: Props) {
  return (
    <>
      <div className="header">
        <button className="header-username" onClick={onSwitch}>
          {account.username}
          <span aria-hidden="true">⌄</span>
        </button>
        <div className="header-actions">{actions}</div>
      </div>

      <div className="profile-row">
        {account.avatar_url
          ? <img className="avatar" src={account.avatar_url} alt="" />
          : <div className="avatar" />}
        <StatsRow
          posts={account.posts_count}
          followers={account.followers_count}
          following={account.following_count}
        />
      </div>

      <div className="bio">
        {account.display_name && <div className="bio-name">{account.display_name}</div>}
        {account.bio && <p className="bio-text">{account.bio}</p>}
      </div>

      <div className="actions">
        <button className="pill">Edit profile</button>
        <button className="pill">Share profile</button>
      </div>
    </>
  )
}

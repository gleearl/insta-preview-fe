import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileHeader } from './ProfileHeader'
import type { Account } from '../types'

const account: Account = {
  id: 1, username: 'gleearl', kind: 'offline',
  display_name: 'Glee', bio: 'Planning ahead.', avatar_url: null,
  followers_count: 4321, following_count: 210, posts_count: 12,
  position: 0, last_synced_at: null, has_token: false,
}

describe('ProfileHeader', () => {
  it('shows the username, name and bio', () => {
    render(<ProfileHeader account={account} onSwitch={vi.fn()} />)

    expect(screen.getByText('gleearl')).toBeInTheDocument()
    expect(screen.getByText('Glee')).toBeInTheDocument()
    expect(screen.getByText('Planning ahead.')).toBeInTheDocument()
  })

  /* Instagram abbreviates, and a preview showing "4321" where the real profile
     says "4,321" is a preview that lies about the layout. */
  it('formats counts the way Instagram does', () => {
    render(<ProfileHeader account={account} onSwitch={vi.fn()} />)

    expect(screen.getByText('4,321')).toBeInTheDocument()
  })

  /* An offline account has no follower data until someone types it in, and an
     empty header is not a preview — but neither is "null". */
  it('shows a dash rather than nothing when a count is unknown', () => {
    render(<ProfileHeader account={{ ...account, followers_count: null }} onSwitch={vi.fn()} />)

    expect(screen.getByTestId('followers')).toHaveTextContent('—')
  })

  /* Preview mode passes no actions, and the header has to come out bare —
     that slot is the only thing in it that a real profile would not show. */
  it('renders nothing in the actions slot when none is given', () => {
    const { container } = render(<ProfileHeader account={account} onSwitch={vi.fn()} />)

    expect(container.querySelector('.header-actions')).toBeEmptyDOMElement()
  })

  it('renders what it is handed in the actions slot', () => {
    render(
      <ProfileHeader account={account} onSwitch={vi.fn()}
        actions={<button aria-label="Add photos">+</button>} />
    )

    expect(screen.getByLabelText('Add photos')).toBeInTheDocument()
  })
})

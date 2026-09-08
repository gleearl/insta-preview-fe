import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Screen } from './Screen'
import { AuthProvider } from './auth/AuthProvider'
import { api } from './lib/api'
import type { Account, GridItem } from './types'

const account: Account = {
  id: 1, username: 'gleearl', kind: 'offline', display_name: 'Glee',
  bio: null, avatar_url: null, followers_count: 100, following_count: 50,
  posts_count: 2, position: 0, last_synced_at: null, has_token: false,
}

const items: GridItem[] = [
  { id: 1, kind: 'draft', position: 0, caption: null, scheduled_at: null, crop_x: 0.5,
    crop_y: 0.5, url: 'a.jpg', thumb_url: 'a_t.jpg', width: 1080, height: 1350, ig_timestamp: null },
  { id: 2, kind: 'posted', position: 1, caption: null, scheduled_at: null, crop_x: 0.5,
    crop_y: 0.5, url: 'b.jpg', thumb_url: 'b_t.jpg', width: 1080, height: 1350, ig_timestamp: null },
]

function stubApi(accountList: Account[] = [account]) {
  vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path === '/api/accounts') return { data: accountList } as never
    if (path.endsWith('/items')) return { data: items } as never
    return {} as never
  })
}

function renderScreen() {
  return render(<AuthProvider><Screen /></AuthProvider>)
}

afterEach(() => vi.restoreAllMocks())

describe('Screen', () => {
  it('renders the profile and the grid', async () => {
    stubApi()
    renderScreen()

    expect(await screen.findByText('gleearl')).toBeInTheDocument()
    expect(await screen.findAllByRole('button', { name: /Draft|Published post/ })).toHaveLength(2)
  })

  /* The whole point of preview mode: what is left has to be indistinguishable
     from a real profile, so every mark this app adds must go. */
  it('preview mode hides the draft badges and the add button', async () => {
    stubApi()
    renderScreen()

    /* The profile and the grid arrive in two separate requests. Waiting for
       the badge rather than the username is what makes this deterministic —
       waiting for the username and then reading the grid synchronously fails
       roughly one run in six. */
    expect(await screen.findByText('Draft')).toBeInTheDocument()
    expect(screen.getByLabelText('Add photos')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /preview/i }))

    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('switches the grid between 4:5 and square', async () => {
    stubApi()
    const { container } = renderScreen()
    await screen.findByText('Draft')

    expect(container.querySelector('.grid')).toHaveAttribute('data-ratio', '4:5')

    await userEvent.click(screen.getByRole('button', { name: '1:1' }))
    expect(container.querySelector('.grid')).toHaveAttribute('data-ratio', '1:1')
  })

  /* Someone arriving with no accounts must be told what to do, not shown an
     empty screen that looks broken. */
  it('says what to do when there are no accounts yet', async () => {
    stubApi([])
    renderScreen()

    /* By role: the empty state says "Add an account to start planning a grid"
       as well, and a bare text query matches both. */
    expect(await screen.findByRole('button', { name: /add an account/i })).toBeInTheDocument()
    expect(screen.getByText('No accounts yet')).toBeInTheDocument()
  })
})

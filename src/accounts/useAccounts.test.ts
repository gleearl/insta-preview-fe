import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAccounts } from './useAccounts'
import { api } from '../lib/api'
import type { Account } from '../types'

afterEach(() => vi.restoreAllMocks())

const one: Account = {
  id: 1, username: 'one', kind: 'offline', display_name: null, bio: null,
  avatar_url: null, followers_count: null, following_count: null,
  posts_count: null, position: 0, last_synced_at: null, has_token: false,
}

describe('useAccounts', () => {
  it('loads accounts and selects the first', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [one, { ...one, id: 2, username: 'two' }] })

    const { result } = renderHook(() => useAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toHaveLength(2)
    expect(result.current.active?.username).toBe('one')
  })

  it('selects a newly created account, so the grid shown is the one just made', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [one] })
    vi.spyOn(api, 'post').mockResolvedValue({ data: { ...one, id: 9, username: 'new' } })

    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.create({ username: 'new', kind: 'offline' }) })

    expect(result.current.active?.username).toBe('new')
  })

  /* Deleting the account being viewed must land somewhere, not on nothing. */
  it('falls back to another account when the active one is removed', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [one, { ...one, id: 2, username: 'two' }] })
    vi.spyOn(api, 'del').mockResolvedValue(undefined)

    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.remove(1) })

    expect(result.current.active?.id).toBe(2)
  })

  it('surfaces a failed load rather than showing an empty account list', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })
})

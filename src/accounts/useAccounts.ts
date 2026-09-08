import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { Account } from '../types'

export type AccountDraft = {
  username: string
  kind: 'online' | 'offline'
  access_token?: string
  display_name?: string | null
  bio?: string | null
  followers_count?: number | null
  following_count?: number | null
  posts_count?: number | null
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Account[] }>('/api/accounts')
      setAccounts(data)
      setActiveId(current => current ?? data[0]?.id ?? null)
      setError('')
    } catch (e) {
      /* An empty list and a failed request look identical on screen, and one
         of them is a bug the person should be told about. */
      setError(e instanceof ApiError ? e.first() : 'Could not load your accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const create = useCallback(async (draft: AccountDraft) => {
    const { data } = await api.post<{ data: Account }>('/api/accounts', draft)
    setAccounts(prev => [...prev, data])
    /* Straight to the thing just made — anything else is a dead end. */
    setActiveId(data.id)
    return data
  }, [])

  const update = useCallback(async (id: number, draft: AccountDraft) => {
    const { data } = await api.put<{ data: Account }>(`/api/accounts/${id}`, draft)
    setAccounts(prev => prev.map(a => (a.id === id ? data : a)))
    return data
  }, [])

  const remove = useCallback(async (id: number) => {
    await api.del(`/api/accounts/${id}`)
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== id)
      setActiveId(current => (current === id ? (next[0]?.id ?? null) : current))
      return next
    })
  }, [])

  const sync = useCallback(async (id: number) => {
    setSyncing(true)
    try {
      const { account } = await api.post<{ account: Account }>(`/api/accounts/${id}/sync`)
      setAccounts(prev => prev.map(a => (a.id === id ? account : a)))
      return account
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'Could not sync that account.')
      throw e
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    accounts,
    activeId,
    active: accounts.find(a => a.id === activeId) ?? null,
    setActiveId,
    loading,
    syncing,
    error,
    setError,
    create,
    update,
    remove,
    sync,
    reload,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { GridItem } from '../types'

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function useGrid(accountId: number | null) {
  const [items, setItems] = useState<GridItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const saveTimer = useRef<number | null>(null)

  const reload = useCallback(async () => {
    if (accountId === null) { setItems([]); return }
    setLoading(true)

    try {
      const { data } = await api.get<{ data: GridItem[] }>(`/api/accounts/${accountId}/items`)
      setItems(data)
      setError('')
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'Could not load this grid.')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => { void reload() }, [reload])

  /* Optimistic, then debounced: a drag produces a new order every few pixels,
     and posting each one would put the server behind the finger. */
  const reorder = useCallback((next: GridItem[]) => {
    setItems(next)

    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)

    saveTimer.current = window.setTimeout(() => {
      if (accountId === null) return

      api.put(`/api/accounts/${accountId}/items/order`, {
        order: next.map((item, index) => ({ id: item.id, position: index })),
      }).catch((e: unknown) => {
        /* The screen is now showing an order the server rejected. Say so and
           put the truth back, rather than leaving a lie on screen. */
        setError(e instanceof ApiError ? e.first() : 'That order could not be saved.')
        void reload()
      })
    }, 600)
  }, [accountId, reload])

  const upload = useCallback(async (files: File[]) => {
    if (accountId === null || files.length === 0) return
    setUploading(true)
    setError('')

    try {
      const form = new FormData()
      files.forEach(file => form.append('images[]', file))

      await api.upload<{ data: GridItem[] }>(`/api/accounts/${accountId}/items`, form)
      /* New drafts take the low positions and everything below shifts, so the
         server's order is the one to trust — reload rather than splice. */
      await reload()
    } catch (e) {
      if (e instanceof ApiError && e.status === 413) {
        const used = Number(e.body.used_bytes ?? 0)
        const quota = Number(e.body.quota_bytes ?? 0)
        setError(`Out of space — ${mb(used)} of ${mb(quota)} used. Delete some drafts and try again.`)
      } else {
        setError(e instanceof ApiError ? e.first() : 'Those photos could not be uploaded.')
      }
    } finally {
      setUploading(false)
    }
  }, [accountId, reload])

  const patch = useCallback(async (id: number, changes: Partial<GridItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...changes } : i)))

    try {
      await api.put(`/api/items/${id}`, changes)
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'That change could not be saved.')
      void reload()
    }
  }, [reload])

  const remove = useCallback(async (id: number) => {
    let before: GridItem[] = []
    setItems(prev => { before = prev; return prev.filter(i => i.id !== id) })

    try {
      await api.del(`/api/items/${id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'That could not be deleted.')
      setItems(before)
    }
  }, [])

  return { items, loading, uploading, error, setError, reload, reorder, upload, patch, remove }
}

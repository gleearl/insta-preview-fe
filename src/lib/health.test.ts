import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHealth } from './health'

afterEach(() => vi.restoreAllMocks())

describe('fetchHealth', () => {
  it('reports the API version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, version: 'dev' }),
    }))

    await expect(fetchHealth()).resolves.toEqual({ ok: true, version: 'dev' })
  })

  it('turns a failed request into an error, not a silent undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    await expect(fetchHealth()).rejects.toThrow(/503/)
  })
})

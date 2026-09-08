import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, setToken } from './api'

afterEach(() => { vi.restoreAllMocks(); setToken(null) })

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('api', () => {
  it('sends the bearer token once one is set', async () => {
    const fetchMock = respond(200, { data: [] })
    vi.stubGlobal('fetch', fetchMock)
    setToken('abc123')

    await api.get('/api/accounts')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123')
  })

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = respond(200, {})
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/health')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  /* The API reports validation as 422 with a field map. Losing that turns
     "email already registered" into "something went wrong". */
  it('carries validation errors through as words', async () => {
    vi.stubGlobal('fetch', respond(422, {
      message: 'The email has already been taken.',
      errors: { email: ['The email has already been taken.'] },
    }))

    await expect(api.post('/api/register', {})).rejects.toMatchObject({
      status: 422,
      errors: { email: ['The email has already been taken.'] },
    })
  })

  it('first() gives the message to actually show someone', async () => {
    vi.stubGlobal('fetch', respond(422, {
      message: 'fallback',
      errors: { email: ['That address is taken.'] },
    }))

    let caught: ApiError | undefined
    try {
      await api.post('/api/register', {})
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught?.first()).toBe('That address is taken.')
  })

  /* 413 is the quota, and it is the one error where the number matters. */
  it('keeps the body of a 413 so the quota can be explained', async () => {
    vi.stubGlobal('fetch', respond(413, {
      message: 'Past your storage limit.',
      used_bytes: 1000,
      quota_bytes: 1000,
    }))

    let caught: ApiError | undefined
    try {
      await api.post('/api/x', {})
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught?.status).toBe(413)
    expect(caught?.body).toMatchObject({ used_bytes: 1000 })
  })

  it('a 401 clears the stored token, so the app cannot loop on a dead session', async () => {
    vi.stubGlobal('fetch', respond(401, { message: 'Unauthenticated.' }))
    setToken('stale')

    await api.get('/api/me').catch(() => {})

    expect(localStorage.getItem('insta_token')).toBeNull()
  })

  it('never sets Content-Type on an upload, so the browser can add the boundary', async () => {
    const fetchMock = respond(201, { data: [] })
    vi.stubGlobal('fetch', fetchMock)

    await api.upload('/api/accounts/1/items', new FormData())

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
  })

  it('returns nothing for a 204 rather than trying to parse it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 204,
      json: async () => { throw new Error('no body') },
    }))

    await expect(api.del('/api/items/1')).resolves.toBeUndefined()
  })
})

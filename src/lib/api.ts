import { API_URL } from './config'

const TOKEN_KEY = 'insta_token'

export class ApiError extends Error {
  /* Declared and assigned rather than taken as constructor parameter
     properties: the template enables erasableSyntaxOnly, which forbids the
     shorthand because it emits code rather than erasing to nothing. */
  readonly status: number
  readonly errors: Record<string, string[]>
  readonly body: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {},
    body: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.body = body
  }

  /** The message worth putting in front of someone. */
  first(): string {
    const firstField = Object.values(this.errors)[0]
    return firstField?.[0] ?? this.message
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    /* Private browsing and blocked site data both throw here. Signed out is
       the right answer, not a crash on load. */
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY)
    else localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* Nothing to do — the session simply will not survive a reload. */
  }
}

type Options = { method: string; body?: unknown; form?: FormData }

async function request<T>(path: string, options: Options): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()

  if (token) headers.Authorization = `Bearer ${token}`

  /* Never set Content-Type for FormData: the browser has to add the multipart
     boundary itself, and setting it by hand strips that off. */
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method,
    headers,
    body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  })

  if (response.status === 204) return undefined as T

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    /* A dead token would otherwise send every subsequent call out with the
       same doomed header, and the app would look broken rather than signed out. */
    if (response.status === 401) setToken(null)

    throw new ApiError(
      (payload.message as string | undefined) ?? `Request failed (${response.status})`,
      response.status,
      (payload.errors as Record<string, string[]> | undefined) ?? {},
      payload,
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
}

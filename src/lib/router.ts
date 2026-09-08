export type Route = 'reset-password' | 'app'

/* GitHub Pages serves the app from a sub-path, so the route is whatever comes
   after the base. The workflow copies index.html to 404.html, which is what
   makes a deep link like /reset-password reach this code at all. */
export function currentRoute(): Route {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = window.location.pathname.replace(base, '').replace(/^\//, '')

  return path === 'reset-password' ? 'reset-password' : 'app'
}

export function resetParams(): { token: string; email: string } {
  const params = new URLSearchParams(window.location.search)

  return {
    token: params.get('token') ?? '',
    email: params.get('email') ?? '',
  }
}

export function goHome(): void {
  window.history.replaceState({}, '', import.meta.env.BASE_URL)
}

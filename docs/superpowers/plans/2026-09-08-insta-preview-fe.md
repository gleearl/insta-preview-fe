# Insta Preview Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A React SPA that renders a faithful Instagram profile screen, with drafts and published posts in one draggable grid, backed by the live API.

**Architecture:** Vite + React 19 + TypeScript, no UI framework and no state library — the app is one screen with a handful of dialogs. State lives in a small number of hooks; the server is the source of truth and every mutation is optimistic against a debounced write. Deployed to GitHub Pages, talking cross-origin to `insta-api.gleearl.com` with a Sanctum bearer token.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, plain CSS with custom properties, Vitest, GitHub Actions.

**Spec:** [`insta-preview-laravel/docs/superpowers/specs/2026-09-07-insta-preview-design.md`](https://github.com/gleearl/insta-preview-laravel/blob/main/docs/superpowers/specs/2026-09-07-insta-preview-design.md) §9

**API:** live at `https://insta-api.gleearl.com`, 20 routes, described in that spec §6.

## Global Constraints

- **No dependencies beyond React.** The existing `insta-preview-web` ships React and nothing else, and this app has no need of more. Adding one is a decision, not a convenience.
- **Bearer token in `localStorage`**, sent as `Authorization: Bearer`. Never a cookie — the API sets `supports_credentials: false` and means it.
- Every colour, size and font comes from the token table in Task 2. **No hardcoded hex outside `tokens.css`.**
- **Touch is the primary input.** The phone is where a grid gets planned. Anything that only works with a mouse is broken.
- The API answers `422` with `{message, errors: {field: [msg]}}` and `413` with `{message, used_bytes, quota_bytes}`. Both must reach the user as words, never as a silent no-op.
- `npm run build` must typecheck (`tsc -b`) — CI runs it and fails on any error.

---

### Task 1: Skeleton, deployed

Same reasoning as the API: prove the pipeline against a page with nothing on it.

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `.github/workflows/deploy.yml`
- Test: `src/lib/version.test.ts`

**Interfaces:**
- Produces: a deployed page at `https://gleearl.github.io/insta-preview-fe/` showing the API's health response.

- [ ] **Step 1: Scaffold**

```bash
cd /Users/glee/Documents/Code/insta-preview-fe
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Answer "ignore files and continue" if it warns about the existing README.

- [ ] **Step 2: Set the base path**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /* Project Pages serve from /<repo>/, so assets must be requested from there.
     When the custom domain is pointed at this site it serves from the root
     instead — set VITE_BASE=/ in the workflow on the same commit that adds
     public/CNAME, or every asset 404s. */
  base: process.env.VITE_BASE ?? '/insta-preview-fe/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Point at the API**

Create `.env.example` and `.env`:

```
VITE_API_URL=https://insta-api.gleearl.com
```

Create `src/lib/config.ts`:

```ts
/* Vite inlines this at build time, so it is the workflow's job to supply it —
   there is no runtime config to get wrong, and no way to point a built bundle
   at a different API by accident. */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'https://insta-api.gleearl.com'
```

- [ ] **Step 4: Write the failing test**

`src/lib/health.ts` does not exist yet. `src/lib/health.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from 'vitest'
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
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./health`.

- [ ] **Step 6: Implement**

`src/lib/health.ts`:

```ts
import { API_URL } from './config'

export type Health = { ok: boolean; version: string }

export async function fetchHealth(): Promise<Health> {
  const response = await fetch(`${API_URL}/api/health`)

  if (!response.ok) {
    throw new Error(`API answered ${response.status}`)
  }

  return response.json()
}
```

`src/App.tsx` — a placeholder that proves the deploy reaches the API:

```tsx
import { useEffect, useState } from 'react'
import { fetchHealth } from './lib/health'

export default function App() {
  const [status, setStatus] = useState('checking…')

  useEffect(() => {
    fetchHealth()
      .then(h => setStatus(`API ${h.version}`))
      .catch(e => setStatus(`API unreachable: ${e.message}`))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Insta Preview</h1>
      <p>{status}</p>
    </main>
  )
}
```

- [ ] **Step 7: Run the tests and the build**

```bash
npm test
npm run build
```

Expected: 2 passing, build clean.

- [ ] **Step 8: Write the deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Typecheck and unit tests before anything is published. `npm run build`
      # runs tsc -b, so a type error fails here rather than shipping.
      - run: npm test
      - run: npm run build
        env:
          VITE_API_URL: https://insta-api.gleearl.com

      # GitHub Pages serves 404.html for any path it does not have a file for.
      # This app is a single page with client-side routes — /reset-password
      # arrives as a link in an email — so without this every deep link is a
      # 404 instead of the app.
      - run: cp dist/index.html dist/404.html

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    # Never from a pull request: this publishes.
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Commit, push, and enable Pages**

```bash
git add -A
git commit -m "Deploy an empty page before building a full one"
git push origin main
```

Then, once, in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The first run fails without it, with an error naming exactly that.

- [ ] **Step 10: Verify**

```bash
gh run watch
curl -s https://gleearl.github.io/insta-preview-fe/ | head -20
```

Expected: HTML, and the page shows "API dev" when opened in a browser — which also proves CORS works from this origin.

---

### Task 2: Design tokens and the Instagram profile chrome

Everything visual, with no data behind it yet. Built first because every later task renders into it.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Create: `src/components/ProfileHeader.tsx`, `src/components/StatsRow.tsx`, `src/components/TabBar.tsx`, `src/components/Highlights.tsx`
- Create: `src/types.ts`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/components/ProfileHeader.test.tsx`

**Interfaces:**
- Produces:
  - `type Account`, `type GridItem`, `type User` in `src/types.ts`, matching the API's resource shapes exactly
  - `<ProfileHeader account={Account} onSwitch={() => void} actions={ReactNode} />` — `actions` fills the header's right-hand slot, which is where Instagram's `+` lives. Passing nothing there is what makes preview mode's header bare.
  - `<StatsRow posts={number} followers={number|null} following={number|null} />`
  - `<TabBar active="grid" onChange={(t) => void} />`

- [ ] **Step 1: Write the types, mirroring the API**

`src/types.ts`:

```ts
/* These mirror IgAccountResource and GridItemResource on the server. If the
   API changes shape, this file changes with it — there is no adapter layer,
   deliberately: one shape, named the same on both sides. */

export type AccountKind = 'online' | 'offline'

export type Account = {
  id: number
  username: string
  kind: AccountKind
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  followers_count: number | null
  following_count: number | null
  posts_count: number | null
  position: number
  last_synced_at: string | null
  /** Whether an Instagram token is stored. Never the token itself. */
  has_token: boolean
}

export type ItemKind = 'draft' | 'posted'

export type GridItem = {
  id: number
  kind: ItemKind
  position: number
  caption: string | null
  scheduled_at: string | null
  crop_x: number
  crop_y: number
  url: string
  thumb_url: string
  width: number | null
  height: number | null
  ig_timestamp: string | null
}

export type User = {
  id: number
  name: string
  email: string
  avatar_url: string | null
}
```

- [ ] **Step 2: Write the tokens**

`src/styles/tokens.css`. **Every colour in the app comes from here.**

```css
/*
 * Instagram's own palette, light and dark.
 *
 * The point of this app is that the preview looks like the real thing, so
 * these are not "brand-adjacent" choices — they are the values Instagram
 * uses. Nothing outside this file should contain a hex code.
 */
:root {
  --bg: #ffffff;
  --text: #000000;
  --text-secondary: #737373;
  --separator: #dbdbdb;
  --button-fill: #efefef;
  --accent: #0095f6;
  --draft-outline: #0095f6;

  /* Type: the stack Instagram's own web client falls back to. */
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;

  /* Layout. 390 is an iPhone 14's logical width — the app is a phone screen
     wherever it is opened. */
  --column: 390px;
  --avatar: 86px;
  --highlight: 56px;
  --grid-gap: 1.5px;
  --button-height: 32px;
  --radius: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #000000;
    --text: #ffffff;
    --text-secondary: #a8a8a8;
    --separator: #262626;
    --button-fill: #363636;
  }
}

/* An explicit choice wins over the system in both directions. */
:root[data-theme='light'] {
  --bg: #ffffff;
  --text: #000000;
  --text-secondary: #737373;
  --separator: #dbdbdb;
  --button-fill: #efefef;
}

:root[data-theme='dark'] {
  --bg: #000000;
  --text: #ffffff;
  --text-secondary: #a8a8a8;
  --separator: #262626;
  --button-fill: #363636;
}
```

- [ ] **Step 3: Write the app stylesheet**

`src/styles/app.css` — the profile screen's structure. Sizes come from the spec's §9.1 table:

```css
* { box-sizing: border-box; }

html, body, #root { height: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* Centred on desktop, edge to edge on a phone — the grid's gutters are 1.5px
   and any horizontal padding at that width would show. */
.screen {
  width: 100%;
  max-width: var(--column);
  margin: 0 auto;
  min-height: 100%;
  background: var(--bg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  height: 44px;
}

.header-username {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  padding: 0;
  color: var(--text);
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.header-actions { display: flex; gap: 20px; }

.icon-button {
  background: none;
  border: 0;
  padding: 0;
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  /* 44px is the smallest thing a thumb reliably hits. */
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 8px 16px 0;
}

.avatar {
  width: var(--avatar);
  height: var(--avatar);
  border-radius: 50%;
  object-fit: cover;
  background: var(--button-fill);
  flex-shrink: 0;
}

.stats { display: flex; flex: 1; justify-content: space-around; }
.stat { text-align: center; }
.stat-value { display: block; font-size: 16px; font-weight: 600; }
.stat-label { display: block; font-size: 13px; color: var(--text); }

.bio { padding: 12px 16px 0; }
.bio-name { font-size: 14px; font-weight: 600; }
.bio-text { font-size: 14px; white-space: pre-wrap; margin: 2px 0 0; }

.actions { display: flex; gap: 8px; padding: 16px; }

.pill {
  flex: 1;
  height: var(--button-height);
  border: 0;
  border-radius: var(--radius);
  background: var(--button-fill);
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.highlights {
  display: flex;
  gap: 16px;
  padding: 0 16px 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.highlights::-webkit-scrollbar { display: none; }

.highlight {
  width: var(--highlight);
  height: var(--highlight);
  border-radius: 50%;
  background: var(--button-fill);
  border: 1px solid var(--separator);
  flex-shrink: 0;
}

.tabs {
  display: flex;
  border-top: 1px solid var(--separator);
}

.tab {
  flex: 1;
  background: none;
  border: 0;
  border-bottom: 1px solid transparent;
  padding: 12px 0;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
}

.tab[aria-selected='true'] {
  color: var(--text);
  border-bottom-color: var(--text);
}
```

- [ ] **Step 4: Write the failing component test**

`src/components/ProfileHeader.test.tsx`:

```tsx
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
    render(
      <ProfileHeader account={{ ...account, followers_count: null }} onSwitch={vi.fn()} />
    )

    expect(screen.getByTestId('followers')).toHaveTextContent('—')
  })
})
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./ProfileHeader`.

- [ ] **Step 6: Implement the chrome**

`src/components/StatsRow.tsx`:

```tsx
/* Instagram groups thousands and abbreviates above ten thousand. Getting this
   wrong changes the width of the row, which is the whole thing being previewed. */
export function formatCount(value: number | null): string {
  if (value === null) return '—'
  if (value < 10_000) return value.toLocaleString('en-US')
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 100_000 ? 1 : 0)}K`.replace('.0', '')
  return `${(value / 1_000_000).toFixed(1)}M`.replace('.0', '')
}

type Props = {
  posts: number | null
  followers: number | null
  following: number | null
}

export function StatsRow({ posts, followers, following }: Props) {
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-value" data-testid="posts">{formatCount(posts)}</span>
        <span className="stat-label">posts</span>
      </div>
      <div className="stat">
        <span className="stat-value" data-testid="followers">{formatCount(followers)}</span>
        <span className="stat-label">followers</span>
      </div>
      <div className="stat">
        <span className="stat-value" data-testid="following">{formatCount(following)}</span>
        <span className="stat-label">following</span>
      </div>
    </div>
  )
}
```

`src/components/ProfileHeader.tsx`:

```tsx
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
```

`src/components/Highlights.tsx`:

```tsx
/* Empty circles. Instagram's highlights are not something this app manages —
   they are here because their absence changes where the grid starts, and the
   grid's position on screen is part of what is being previewed. */
export function Highlights({ count = 4 }: { count?: number }) {
  return (
    <div className="highlights" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div className="highlight" key={i} />)}
    </div>
  )
}
```

`src/components/TabBar.tsx`:

```tsx
export type Tab = 'grid' | 'reels' | 'tagged'

/* Reels and tagged render but do nothing. They are here because the tab bar is
   a horizontal rule with three icons on it, and removing two of them would
   move the third — see Highlights for the same reasoning. */
export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; glyph: string; label: string }[] = [
    { id: 'grid', glyph: '▦', label: 'Grid' },
    { id: 'reels', glyph: '▷', label: 'Reels' },
    { id: 'tagged', glyph: '👤', label: 'Tagged' },
  ]

  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          className="tab"
          aria-selected={active === t.id}
          aria-label={t.label}
          onClick={() => onChange(t.id)}
        >
          {t.glyph}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 5 tests.

- [ ] **Step 8: Commit**

```bash
npm run build
git add -A
git commit -m "Render Instagram's profile screen, before there is anything in it"
git push origin main
```

---

### Task 3: The API client, and signing in

**Files:**
- Create: `src/lib/api.ts`, `src/lib/api.test.ts`
- Create: `src/auth/AuthProvider.tsx`, `src/auth/AuthScreen.tsx`, `src/auth/ResetScreen.tsx`
- Create: `src/lib/router.ts`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Produces:
  - `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.del(path)`, `api.upload<T>(path, FormData)`
  - `class ApiError extends Error { status: number; errors: Record<string, string[]>; first(): string }`
  - `setToken(t: string | null)`, `getToken(): string | null`
  - `useAuth(): { user: User | null; loading: boolean; signIn, register, signOut, forgot, reset }`
  - `currentRoute(): 'reset-password' | 'app'`

- [ ] **Step 1: Write the failing test**

`src/lib/api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, setToken } from './api'

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

    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer abc123')
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

    const error = await api.post('/api/register', {}).catch(e => e as ApiError)
    expect(error.first()).toBe('That address is taken.')
  })

  /* 413 is the quota, and it is the one error where the number matters. */
  it('keeps the body of a 413 so the quota can be explained', async () => {
    vi.stubGlobal('fetch', respond(413, {
      message: 'Past your storage limit.',
      used_bytes: 1000,
      quota_bytes: 1000,
    }))

    const error = await api.post('/api/x', {}).catch(e => e as ApiError)
    expect(error.status).toBe(413)
    expect(error.body).toMatchObject({ used_bytes: 1000 })
  })

  it('a 401 clears the stored token, so the app cannot loop on a dead session', async () => {
    vi.stubGlobal('fetch', respond(401, { message: 'Unauthenticated.' }))
    setToken('stale')

    await api.get('/api/me').catch(() => {})

    expect(localStorage.getItem('insta_token')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 3: Implement the client**

`src/lib/api.ts`:

```ts
import { API_URL } from './config'

const TOKEN_KEY = 'insta_token'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> = {},
    readonly body: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
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

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    /* A dead token would otherwise send every subsequent call out with the
       same doomed header, and the app would look broken rather than signed out. */
    if (response.status === 401) setToken(null)

    throw new ApiError(
      (payload as { message?: string }).message ?? `Request failed (${response.status})`,
      response.status,
      (payload as { errors?: Record<string, string[]> }).errors ?? {},
      payload as Record<string, unknown>,
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
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 6 api tests.

- [ ] **Step 5: Write the router**

`src/lib/router.ts`. Two routes is not worth a dependency:

```ts
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
```

- [ ] **Step 6: Write the auth provider**

`src/auth/AuthProvider.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setToken } from '../lib/api'
import type { User } from '../types'

type AuthValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<void>
  signOut: () => Promise<void>
  forgot: (email: string) => Promise<string>
  reset: (token: string, email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth used outside AuthProvider')
  return value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /* A stored token proves nothing — it may have been revoked from another
     device. Asking the server once on boot is what makes the app's idea of
     "signed in" true rather than hopeful. */
  useEffect(() => {
    api.get<{ user: User }>('/api/me')
      .then(r => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback((r: { token: string; user: User }) => {
    setToken(r.token)
    setUser(r.user)
  }, [])

  const value: AuthValue = {
    user,
    loading,
    signIn: async (email, password) =>
      accept(await api.post<{ token: string; user: User }>('/api/login', { email, password })),
    register: async (name, email, password) =>
      accept(await api.post<{ token: string; user: User }>('/api/register', { name, email, password })),
    signInWithGoogle: async (idToken) =>
      accept(await api.post<{ token: string; user: User }>('/api/auth/google', { id_token: idToken })),
    signOut: async () => {
      /* The local session goes regardless. A network failure on the way out
         must not leave someone apparently still signed in. */
      await api.post('/api/logout').catch(() => {})
      setToken(null)
      setUser(null)
    },
    forgot: async (email) =>
      (await api.post<{ message: string }>('/api/forgot-password', { email })).message,
    reset: async (token, email, password) => {
      await api.post('/api/reset-password', { token, email, password })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

- [ ] **Step 7: Write the auth screens**

`src/auth/AuthScreen.tsx` — one component, three modes (sign in, register, forgot), because they share every field:

```tsx
import { useState } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from './AuthProvider'
import { GoogleButton } from './GoogleButton'

type Mode = 'signin' | 'register' | 'forgot'

export function AuthScreen() {
  const { signIn, register, forgot } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signin') await signIn(email, password)
      else if (mode === 'register') await register(name, email, password)
      else setNotice(await forgot(email))
    } catch (e) {
      /* first() prefers the field-level message, which is the one that says
         what is actually wrong. */
      setError(e instanceof ApiError ? e.first() : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1 className="auth-title">Insta Preview</h1>
      <p className="auth-sub">Plan your grid before you post it.</p>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <input className="field" placeholder="Name" value={name} autoComplete="name"
            onChange={e => setName(e.target.value)} required />
        )}

        <input className="field" type="email" placeholder="Email" value={email}
          autoComplete="email" onChange={e => setEmail(e.target.value)} required />

        {mode !== 'forgot' && (
          <input className="field" type="password" placeholder="Password" value={password}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onChange={e => setPassword(e.target.value)} required minLength={8} />
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Log in' : mode === 'register' ? 'Sign up' : 'Send reset link'}
        </button>
      </form>

      {mode !== 'forgot' && <GoogleButton onError={setError} />}

      <div className="auth-links">
        {mode === 'signin' && <>
          <button className="link" onClick={() => setMode('forgot')}>Forgot password?</button>
          <button className="link" onClick={() => setMode('register')}>Create an account</button>
        </>}
        {mode !== 'signin' && <button className="link" onClick={() => setMode('signin')}>Back to log in</button>}
      </div>
    </div>
  )
}
```

`src/auth/ResetScreen.tsx`:

```tsx
import { useState } from 'react'
import { ApiError } from '../lib/api'
import { goHome, resetParams } from '../lib/router'
import { useAuth } from './AuthProvider'

export function ResetScreen() {
  const { reset } = useAuth()
  const { token, email } = resetParams()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await reset(token, email, password)
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'That reset link did not work.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth">
        <h1 className="auth-title">Password changed</h1>
        <p className="auth-sub">You can log in with it now.</p>
        <button className="primary" onClick={() => { goHome(); window.location.reload() }}>
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">for {email}</p>

      <form className="auth-form" onSubmit={submit}>
        <input className="field" type="password" placeholder="New password" value={password}
          autoComplete="new-password" minLength={8} required
          onChange={e => setPassword(e.target.value)} />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 8: Add the auth styles**

Append to `src/styles/app.css`:

```css
.auth { max-width: 340px; margin: 0 auto; padding: 64px 24px; text-align: center; }
.auth-title { font-size: 28px; font-weight: 600; margin: 0 0 4px; }
.auth-sub { color: var(--text-secondary); margin: 0 0 32px; }
.auth-form { display: flex; flex-direction: column; gap: 8px; }

.field {
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--separator);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  /* 16px, or iOS zooms the page when the field takes focus. */
  font-size: 16px;
}

.primary {
  height: 44px;
  border: 0;
  border-radius: var(--radius);
  background: var(--accent);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.primary:disabled { opacity: 0.5; }

.auth-error { color: #ed4956; font-size: 14px; margin: 4px 0; }
.auth-notice { color: var(--text-secondary); font-size: 14px; margin: 4px 0; }
.auth-links { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }

.link {
  background: none; border: 0; padding: 0;
  color: var(--accent); font-family: inherit; font-size: 14px;
  cursor: pointer;
}
```

- [ ] **Step 9: Wire it into the app**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
```

`src/App.tsx`:

```tsx
import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { ResetScreen } from './auth/ResetScreen'
import { currentRoute } from './lib/router'

export default function App() {
  const { user, loading } = useAuth()

  /* Before /api/me answers, showing the sign-in form would flash it at
     someone who is already signed in. */
  if (loading) return <div className="auth"><p className="auth-sub">…</p></div>

  if (currentRoute() === 'reset-password') return <ResetScreen />
  if (!user) return <AuthScreen />

  return <div className="screen"><p style={{ padding: 16 }}>Signed in as {user.email}</p></div>
}
```

- [ ] **Step 10: Run, build, commit**

```bash
npm test && npm run build
git add -A
git commit -m "Sign in, and carry the API's own words back to the person reading them"
git push origin main
```

---

### Task 4: The Google button

**Files:**
- Create: `src/auth/GoogleButton.tsx`
- Modify: `index.html`, `.env.example`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `useAuth().signInWithGoogle` from Task 3
- Produces: `<GoogleButton onError={(msg: string) => void} />`

> **Needs `VITE_GOOGLE_CLIENT_ID`.** Without it the button renders nothing at
> all — deliberately, since a Google button that fails on click is worse than
> no button. Email and password keep working meanwhile.

- [ ] **Step 1: Load Google Identity Services**

In `index.html`, before `</head>`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: Write the button**

`src/auth/GoogleButton.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from './AuthProvider'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/* Google Identity Services attaches itself to window and has no types here.
   Declaring only what is used keeps this to the shape actually relied on. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void
        }
      }
    }
  }
}

export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const holder = useRef<HTMLDivElement>(null)
  const { signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!CLIENT_ID || !holder.current) return

    /* The GSI script is async, so it may not have arrived yet. Polling beats
       an onload handler here: the script tag is in index.html, not ours. */
    let cancelled = false

    const tryRender = () => {
      if (cancelled || !window.google || !holder.current) return false

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await signInWithGoogle(credential)
          } catch (e) {
            onError(e instanceof ApiError ? e.first() : 'Google sign-in failed.')
          }
        },
      })

      window.google.accounts.id.renderButton(holder.current, {
        theme: 'outline', size: 'large', width: 340, text: 'continue_with',
      })

      return true
    }

    if (tryRender()) return

    const timer = window.setInterval(() => { if (tryRender()) window.clearInterval(timer) }, 100)
    /* Give up rather than poll forever — a blocked script should cost nothing. */
    const stop = window.setTimeout(() => window.clearInterval(timer), 10_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [signInWithGoogle, onError])

  /* No client id configured means no button. A Google button that fails when
     pressed is worse than one that was never offered. */
  if (!CLIENT_ID) return null

  return (
    <div className="google-button">
      <div className="google-divider"><span>or</span></div>
      <div ref={holder} />
    </div>
  )
}
```

- [ ] **Step 3: Style the divider**

Append to `src/styles/app.css`:

```css
.google-button { margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; }

.google-divider {
  display: flex; align-items: center; gap: 12px;
  width: 100%; color: var(--text-secondary); font-size: 13px;
}
.google-divider::before,
.google-divider::after { content: ''; flex: 1; height: 1px; background: var(--separator); }
```

- [ ] **Step 4: Pass the id through the build**

Add to `.env.example`: `VITE_GOOGLE_CLIENT_ID=`

In `.github/workflows/deploy.yml`, extend the build step's env:

```yaml
      - run: npm run build
        env:
          VITE_API_URL: https://insta-api.gleearl.com
          VITE_GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }}
```

A repository **variable**, not a secret: a Web OAuth client id is public by
design — it is in the page source of every site that uses one.

- [ ] **Step 5: Build and commit**

```bash
npm test && npm run build
git add -A
git commit -m "Offer Google sign-in, and offer nothing when it is not configured"
git push origin main
```

---

### Task 5: Accounts — the switcher, and making one

**Files:**
- Create: `src/accounts/useAccounts.ts`, `src/accounts/AccountSwitcher.tsx`, `src/accounts/AccountForm.tsx`
- Create: `src/components/Sheet.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: `src/accounts/useAccounts.test.ts`

**Interfaces:**
- Consumes: `api` (Task 3), `Account` (Task 2)
- Produces:
  - `useAccounts(): { accounts, active, activeId, setActiveId, loading, error, create, update, remove, sync, syncing, reload }`
  - `<Sheet open title onClose>{children}</Sheet>` — a bottom sheet, the shape Instagram uses for every dialog
  - `<AccountSwitcher accounts active onSelect onAdd onEdit onRemove />`
  - `<AccountForm account={Account | null} onSubmit onCancel />`

- [ ] **Step 1: Write the failing test**

`src/accounts/useAccounts.test.ts`:

```ts
import { renderHook, waitFor, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAccounts } from './useAccounts'
import { api } from '../lib/api'

afterEach(() => vi.restoreAllMocks())

const one = {
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./useAccounts`.

- [ ] **Step 3: Implement the hook**

`src/accounts/useAccounts.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { Account } from '../types'

type Draft = {
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

  const create = useCallback(async (draft: Draft) => {
    const { data } = await api.post<{ data: Account }>('/api/accounts', draft)
    setAccounts(prev => [...prev, data])
    /* Straight to the thing just made — anything else is a dead end. */
    setActiveId(data.id)
    return data
  }, [])

  const update = useCallback(async (id: number, draft: Draft) => {
    const { data } = await api.put<{ data: Account }>(`/api/accounts/${id}`, draft)
    setAccounts(prev => prev.map(a => (a.id === id ? data : a)))
    return data
  }, [])

  const remove = useCallback(async (id: number) => {
    await api.del(`/api/accounts/${id}`)
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== id)
      setActiveId(current => (current === id ? next[0]?.id ?? null : current))
      return next
    })
  }, [])

  const sync = useCallback(async (id: number) => {
    setSyncing(true)
    try {
      const { account } = await api.post<{ account: Account }>(`/api/accounts/${id}/sync`)
      setAccounts(prev => prev.map(a => (a.id === id ? account : a)))
      return account
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
    create,
    update,
    remove,
    sync,
    reload,
  }
}
```

- [ ] **Step 4: Write the sheet**

`src/components/Sheet.tsx` — Instagram puts everything in a bottom sheet, and a
sheet is thumb-reachable in a way a centred modal is not:

```tsx
import { useEffect } from 'react'
import type { ReactNode } from 'react'

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode }

export function Sheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    /* Otherwise the page behind scrolls while the sheet is open, which on a
       phone reads as the sheet itself being broken. */
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write the switcher and the form**

`src/accounts/AccountSwitcher.tsx`:

```tsx
import type { Account } from '../types'

type Props = {
  accounts: Account[]
  active: Account | null
  onSelect: (id: number) => void
  onAdd: () => void
  onEdit: (account: Account) => void
  onRemove: (account: Account) => void
}

export function AccountSwitcher({ accounts, active, onSelect, onAdd, onEdit, onRemove }: Props) {
  return (
    <div className="switcher">
      {accounts.map(account => (
        <div className="switcher-row" key={account.id}>
          <button className="switcher-pick" onClick={() => onSelect(account.id)}>
            {account.avatar_url
              ? <img className="switcher-avatar" src={account.avatar_url} alt="" />
              : <div className="switcher-avatar" />}
            <span className="switcher-name">{account.username}</span>
            {account.kind === 'online' && <span className="switcher-tag">synced</span>}
            {active?.id === account.id && <span aria-label="Selected">✓</span>}
          </button>
          <button className="icon-button" onClick={() => onEdit(account)} aria-label={`Edit ${account.username}`}>✎</button>
          <button className="icon-button" onClick={() => onRemove(account)} aria-label={`Remove ${account.username}`}>🗑</button>
        </div>
      ))}

      <button className="pill" onClick={onAdd}>Add account</button>
    </div>
  )
}
```

`src/accounts/AccountForm.tsx`:

```tsx
import { useState } from 'react'
import { ApiError } from '../lib/api'
import type { Account } from '../types'

type Props = {
  account: Account | null
  onSubmit: (draft: {
    username: string
    kind: 'online' | 'offline'
    access_token?: string
    display_name: string | null
    bio: string | null
    followers_count: number | null
    following_count: number | null
    posts_count: number | null
  }) => Promise<unknown>
  onCancel: () => void
}

export function AccountForm({ account, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<'online' | 'offline'>(account?.kind ?? 'offline')
  const [username, setUsername] = useState(account?.username ?? '')
  const [token, setToken] = useState('')
  const [displayName, setDisplayName] = useState(account?.display_name ?? '')
  const [bio, setBio] = useState(account?.bio ?? '')
  const [followers, setFollowers] = useState(account?.followers_count?.toString() ?? '')
  const [following, setFollowing] = useState(account?.following_count?.toString() ?? '')
  const [posts, setPosts] = useState(account?.posts_count?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const number = (value: string): number | null => (value.trim() === '' ? null : Number(value))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await onSubmit({
        username: username.trim().replace(/^@/, ''),
        kind,
        /* Only when one was typed: sending an empty string on an edit would
           wipe a token that is working fine. */
        ...(token.trim() ? { access_token: token.trim() } : {}),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        followers_count: number(followers),
        following_count: number(following),
        posts_count: number(posts),
      })
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'Could not save that account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="segmented">
        <button type="button" className="segment" aria-pressed={kind === 'offline'}
          onClick={() => setKind('offline')}>Manual</button>
        <button type="button" className="segment" aria-pressed={kind === 'online'}
          onClick={() => setKind('online')}>Instagram</button>
      </div>

      <input className="field" placeholder="Username" value={username}
        onChange={e => setUsername(e.target.value)} required maxLength={30} />

      {kind === 'online' && (
        <>
          <input className="field" placeholder={account?.has_token ? 'Access token (unchanged)' : 'Access token'}
            value={token} onChange={e => setToken(e.target.value)}
            required={!account?.has_token} />
          <p className="hint">
            Instagram → Settings → Account type and tools → switch to a Professional
            account, then generate a token in the Meta developer console.
          </p>
        </>
      )}

      <input className="field" placeholder="Display name" value={displayName}
        onChange={e => setDisplayName(e.target.value)} maxLength={100} />

      <textarea className="field field-area" placeholder="Bio" value={bio}
        onChange={e => setBio(e.target.value)} maxLength={500} rows={3} />

      {/* Synced for an Instagram account, so editing them by hand would only
          be overwritten on the next sync. */}
      {kind === 'offline' && (
        <div className="counts">
          <input className="field" inputMode="numeric" placeholder="Posts" value={posts}
            onChange={e => setPosts(e.target.value)} />
          <input className="field" inputMode="numeric" placeholder="Followers" value={followers}
            onChange={e => setFollowers(e.target.value)} />
          <input className="field" inputMode="numeric" placeholder="Following" value={following}
            onChange={e => setFollowing(e.target.value)} />
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button className="primary" type="submit" disabled={busy}>{busy ? '…' : 'Save'}</button>
      <button className="pill" type="button" onClick={onCancel}>Cancel</button>
    </form>
  )
}
```

- [ ] **Step 6: Style the sheet and switcher**

Append to `src/styles/app.css`:

```css
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 20;
  background: rgb(0 0 0 / 0.5);
  display: flex; align-items: flex-end; justify-content: center;
}

.sheet {
  width: 100%; max-width: var(--column);
  background: var(--bg);
  border-radius: 12px 12px 0 0;
  padding: 8px 16px 24px;
  /* Room for the home indicator, and never taller than the screen. */
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  max-height: 85vh; overflow-y: auto;
}

.sheet-grip {
  width: 36px; height: 4px; border-radius: 2px;
  background: var(--separator); margin: 4px auto 12px;
}

.sheet-title { font-size: 16px; font-weight: 600; text-align: center; margin: 0 0 16px; }

.switcher { display: flex; flex-direction: column; gap: 4px; }
.switcher-row { display: flex; align-items: center; gap: 4px; }

.switcher-pick {
  flex: 1; display: flex; align-items: center; gap: 12px;
  background: none; border: 0; padding: 8px 0;
  color: var(--text); font-family: inherit; font-size: 15px;
  cursor: pointer; text-align: left;
}

.switcher-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--button-fill); object-fit: cover;
}

.switcher-name { flex: 1; font-weight: 600; }
.switcher-tag { color: var(--text-secondary); font-size: 12px; }

.segmented { display: flex; background: var(--button-fill); border-radius: var(--radius); padding: 2px; }

.segment {
  flex: 1; height: 32px; border: 0; border-radius: 6px;
  background: transparent; color: var(--text-secondary);
  font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
}
.segment[aria-pressed='true'] { background: var(--bg); color: var(--text); }

.field-area { height: auto; padding: 10px 12px; resize: vertical; font-family: inherit; }
.counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.hint { color: var(--text-secondary); font-size: 12px; margin: 0; text-align: left; }
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS — 4 account tests.

- [ ] **Step 8: Commit**

```bash
npm run build
git add -A
git commit -m "Keep several Instagram accounts, and switch between them"
git push origin main
```

---

### Task 6: The grid

**Files:**
- Create: `src/grid/useGrid.ts`, `src/grid/Grid.tsx`, `src/grid/GridTile.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: `src/grid/reorder.test.ts`

**Interfaces:**
- Produces:
  - `useGrid(accountId: number | null): { items, loading, uploading, error, setError, reload, reorder, upload, patch, remove }`
  - `moveItem<T>(list: T[], from: number, to: number): T[]` in `src/grid/reorder.ts`
  - `<Grid items ratio editing onOpen onReorder />`
  - `<GridTile item ratio editing dragging />`

- [ ] **Step 1: Write the failing reorder test**

The pure function first — it is the part with edge cases, and the part every
drag depends on. `src/grid/reorder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { moveItem } from './reorder'

describe('moveItem', () => {
  it('moves an item forward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('is a no-op when nothing moves', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the list it was given', () => {
    const original = ['a', 'b', 'c']
    moveItem(original, 0, 2)
    expect(original).toEqual(['a', 'b', 'c'])
  })

  /* An out-of-range index arrives whenever a pointer leaves the grid mid-drag,
     which is often. Returning the list unchanged beats throwing at the user. */
  it('ignores an index outside the list', () => {
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], -1, 1)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./reorder`.

- [ ] **Step 3: Implement it**

`src/grid/reorder.ts`:

```ts
/** Move one item, returning a new list. Out-of-range indices change nothing. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  if (from < 0 || from >= list.length) return list
  if (to < 0 || to >= list.length) return list

  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)

  return next
}
```

- [ ] **Step 4: Write the grid hook**

`src/grid/useGrid.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { GridItem } from '../types'

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
      }).catch(e => {
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

      const { data } = await api.upload<{ data: GridItem[] }>(`/api/accounts/${accountId}/items`, form)
      /* New drafts come back holding the low positions, so the server's order
         is the one to trust — reload rather than splice. */
      setItems(prev => [...data, ...prev].sort((a, b) => a.position - b.position))
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
    const before = items
    setItems(prev => prev.filter(i => i.id !== id))

    try {
      await api.del(`/api/items/${id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.first() : 'That could not be deleted.')
      setItems(before)
    }
  }, [items])

  return { items, loading, uploading, error, setError, reload, reorder, upload, patch, remove }
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
```

- [ ] **Step 5: Write the tile and the grid**

`src/grid/GridTile.tsx`:

```tsx
import type { GridItem } from '../types'

type Props = {
  item: GridItem
  editing: boolean
  dragging: boolean
  onOpen: () => void
}

export function GridTile({ item, editing, dragging, onOpen }: Props) {
  const isDraft = item.kind === 'draft'

  return (
    <button
      className={[
        'tile',
        editing && isDraft ? 'tile-draft' : '',
        dragging ? 'tile-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-item-id={item.id}
      onClick={onOpen}
      aria-label={isDraft ? 'Draft' : 'Published post'}
    >
      <img
        className="tile-image"
        src={item.thumb_url}
        alt=""
        loading="lazy"
        draggable={false}
        /* The crop focal point. A 4:5 tile throws away part of most photos,
           and the middle is not always the part worth keeping. */
        style={{ objectPosition: `${item.crop_x * 100}% ${item.crop_y * 100}%` }}
      />

      {editing && isDraft && <span className="tile-badge">Draft</span>}
      {editing && item.scheduled_at && (
        <span className="tile-date">
          {new Date(item.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}
    </button>
  )
}
```

`src/grid/Grid.tsx`:

```tsx
import { GridTile } from './GridTile'
import { useDragReorder } from './useDragReorder'
import type { GridItem } from '../types'

export type Ratio = '4:5' | '1:1'

type Props = {
  items: GridItem[]
  ratio: Ratio
  editing: boolean
  onOpen: (item: GridItem) => void
  onReorder: (next: GridItem[]) => void
}

export function Grid({ items, ratio, editing, onOpen, onReorder }: Props) {
  const { containerRef, draggingId, handlers } = useDragReorder(items, onReorder, editing)

  return (
    <div
      ref={containerRef}
      className="grid"
      data-ratio={ratio}
      {...handlers}
    >
      {items.map((item, index) => (
        <div className="grid-cell" key={item.id} data-index={index}>
          <GridTile
            item={item}
            editing={editing}
            dragging={draggingId === item.id}
            onOpen={() => onOpen(item)}
          />
          {/* The fold: on a real profile the first nine tiles are what someone
              sees before scrolling, and that is the thing being previewed. */}
          {editing && index === 8 && <span className="fold" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Style the grid**

Append to `src/styles/app.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--grid-gap);
  /* The finger scrolls the page; the drag handler claims the gesture itself
     once it decides one has started. Without this, a drag on iOS scrolls
     instead. */
  touch-action: pan-y;
}

.grid-cell { position: relative; }

/* Instagram's profile grid is 4:5 portrait. Previewing on squares
   misrepresents what gets cropped, which is most of the point. */
.grid[data-ratio='4:5'] .tile { aspect-ratio: 4 / 5; }
.grid[data-ratio='1:1'] .tile { aspect-ratio: 1 / 1; }

.tile {
  display: block; width: 100%; padding: 0;
  border: 0; background: var(--button-fill);
  position: relative; overflow: hidden; cursor: pointer;
}

.tile-image { width: 100%; height: 100%; object-fit: cover; display: block; }

.tile-draft::after {
  content: ''; position: absolute; inset: 0;
  border: 2px dashed var(--draft-outline);
  pointer-events: none;
}

.tile-dragging { opacity: 0.4; }

.tile-badge, .tile-date {
  position: absolute; left: 4px;
  padding: 2px 5px; border-radius: 4px;
  background: rgb(0 0 0 / 0.6); color: #fff;
  font-size: 10px; font-weight: 600; line-height: 1.4;
}
.tile-badge { top: 4px; }
.tile-date { bottom: 4px; }

/* Drawn under the ninth tile, across the whole row. */
.fold {
  position: absolute; left: 0; right: 0; bottom: calc(var(--grid-gap) * -1);
  height: 1px; background: var(--accent);
}

.ratio-toggle { display: flex; justify-content: flex-end; padding: 8px 16px 0; gap: 8px; }
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS — 5 reorder tests. `useDragReorder` does not exist yet, so the
grid does not render until Task 7 supplies it — which is the next task, so the
app is never left broken for longer than one commit.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Draw the grid in 4:5, because that is what Instagram does now"
git push origin main
```

---

### Task 7: Dragging, with a finger

**Files:**
- Create: `src/grid/useDragReorder.ts`
- Test: `src/grid/useDragReorder.test.tsx`

**Interfaces:**
- Consumes: `moveItem` (Task 6)
- Produces: `useDragReorder(items, onReorder, enabled): { containerRef, draggingId, handlers }` where `handlers` spreads onto the grid container

> **Not HTML5 drag-and-drop.** The version being ported from `insta-preview-web`
> uses `dragstart`/`drop`, and **those events do not fire on touch devices at
> all**. A grid planner that cannot be dragged on a phone is missing its
> primary interaction, so this is Pointer Events instead — one code path for
> mouse, touch and pen.

- [ ] **Step 1: Write the failing test**

`src/grid/useDragReorder.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragReorder } from './useDragReorder'

type Item = { id: number }
const items: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }]

function Harness({ onReorder, enabled = true }: { onReorder: (n: Item[]) => void; enabled?: boolean }) {
  const { containerRef, draggingId, handlers } = useDragReorder(items, onReorder, enabled)

  return (
    <div ref={containerRef} data-testid="grid" {...handlers}>
      <span data-testid="dragging">{draggingId ?? 'none'}</span>
      {items.map((item, index) => (
        <div key={item.id} data-index={index} data-item-id={item.id} data-testid={`cell-${item.id}`}>
          {item.id}
        </div>
      ))}
    </div>
  )
}

/* jsdom has no layout, so every getBoundingClientRect is zeroes. Giving each
   cell a rectangle is what lets a pointer position mean something. */
function layOutCells() {
  ;[1, 2, 3].forEach((id, i) => {
    const cell = screen.getByTestId(`cell-${id}`)
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
      left: i * 100, top: 0, right: i * 100 + 100, bottom: 100,
      width: 100, height: 100, x: i * 100, y: 0, toJSON: () => ({}),
    } as DOMRect)
  })
}

function pointer(el: Element, type: string, x: number, y = 50) {
  const event = new Event(type, { bubbles: true }) as PointerEvent & { clientX: number; clientY: number; pointerId: number }
  Object.assign(event, { clientX: x, clientY: y, pointerId: 1, isPrimary: true })
  el.dispatchEvent(event)
}

describe('useDragReorder', () => {
  it('reports nothing dragging at rest', () => {
    render(<Harness onReorder={vi.fn()} />)
    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
  })

  /* A tap must stay a tap. Starting a drag on pointerdown would make every
     attempt to open a tile drag it somewhere instead. */
  it('does not start a drag until the pointer has actually moved', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 13)

    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('reorders when a tile is dragged onto another', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    pointer(screen.getByTestId('grid'), 'pointerup', 250)

    expect(onReorder).toHaveBeenCalledWith([{ id: 2 }, { id: 3 }, { id: 1 }])
  })

  it('does nothing at all when dragging is switched off', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} enabled={false} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    pointer(screen.getByTestId('grid'), 'pointerup', 250)

    expect(onReorder).not.toHaveBeenCalled()
  })

  /* A cancelled pointer — an incoming call, a system gesture — must leave the
     grid as it was rather than dropping the tile wherever the finger died. */
  it('abandons the drag on pointercancel', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    pointer(screen.getByTestId('grid'), 'pointercancel', 250)

    expect(onReorder).not.toHaveBeenCalled()
    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./useDragReorder`.

- [ ] **Step 3: Implement it**

`src/grid/useDragReorder.ts`:

```ts
import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { moveItem } from './reorder'

/* Below this, the gesture is still a tap. Roughly a fingertip's wobble — big
   enough that opening a tile works, small enough that a drag feels immediate. */
const DRAG_THRESHOLD_PX = 8

type Identified = { id: number }

export function useDragReorder<T extends Identified>(
  items: T[],
  onReorder: (next: T[]) => void,
  enabled: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const start = useRef<{ x: number; y: number; index: number } | null>(null)
  const order = useRef<T[]>(items)
  const moved = useRef(false)

  const indexAt = useCallback((x: number, y: number): number => {
    const container = containerRef.current
    if (!container) return -1

    const cells = Array.from(container.querySelectorAll<HTMLElement>('[data-index]'))

    for (const cell of cells) {
      const box = cell.getBoundingClientRect()
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        return Number(cell.dataset.index)
      }
    }

    return -1
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled) return

    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-index]')
    if (!cell) return

    start.current = { x: e.clientX, y: e.clientY, index: Number(cell.dataset.index) }
    order.current = items
    moved.current = false
  }, [enabled, items])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !start.current) return

    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (!moved.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return

      moved.current = true
      setDraggingId(order.current[start.current.index]?.id ?? null)

      /* Keep receiving moves even when the finger leaves the element it
         started on — which it does immediately. */
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    }

    const over = indexAt(e.clientX, e.clientY)
    if (over === -1 || over === start.current.index) return

    /* Reordered live rather than on drop, so the grid shows the arrangement
       being considered instead of a tile floating over a stale one. */
    order.current = moveItem(order.current, start.current.index, over)
    start.current = { ...start.current, index: over }
    onReorder(order.current)
  }, [enabled, indexAt, onReorder])

  const finish = useCallback(() => {
    start.current = null
    moved.current = false
    setDraggingId(null)
  }, [])

  const onPointerUp = useCallback(() => {
    /* The order was already applied on the way; this only ends the gesture.
       A tap — no movement — falls through here having changed nothing, and
       the tile's own click handler opens it. */
    finish()
  }, [finish])

  const onPointerCancel = useCallback(() => {
    /* The system took the gesture. Whatever was applied optimistically has
       already gone to onReorder, so the debounce will save it — but nothing
       further is inferred from a pointer that vanished. */
    finish()
  }, [finish])

  return {
    containerRef,
    draggingId,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 5 drag tests.

- [ ] **Step 5: Commit**

```bash
npm run build
git add -A
git commit -m "Drag tiles with a finger, not just a mouse"
git push origin main
```

---

### Task 8: Adding photos, re-encoded in the browser

**Files:**
- Create: `src/lib/reencode.ts`, `src/lib/reencode.test.ts`
- Create: `src/grid/AddPhotos.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `useGrid().upload` (Task 6)
- Produces:
  - `reencodeToJpeg(file: File, maxEdge?: number, quality?: number): Promise<File>`
  - `pickImages(): Promise<File[]>`
  - `<AddPhotos onFiles={(files: File[]) => void} busy={boolean} />`

> **Why the browser re-encodes.** IONOS has GD but no Imagick, and GD cannot
> decode HEIC — which is what an iPhone shoots by default. iOS Safari usually
> transcodes on upload but not in "High Efficiency" mode, and Chrome never
> does. Drawing to a canvas and exporting JPEG makes the format the server's
> problem go away, and shrinks an 8 MB photo to a few hundred KB on the way.

- [ ] **Step 1: Write the failing test**

`src/lib/reencode.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { reencodeToJpeg } from './reencode'

/* jsdom has neither createImageBitmap nor a canvas that encodes. Both are
   faked to the smallest shape this code actually uses. */
beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    width: 4000, height: 3000, close: vi.fn(),
  }))

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    imageSmoothingQuality: '',
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D)

  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(new Blob(['x'.repeat(500)], { type: 'image/jpeg' }))
  })
})

describe('reencodeToJpeg', () => {
  it('always produces a JPEG, whatever went in', async () => {
    const heic = new File(['...'], 'IMG_0001.HEIC', { type: 'image/heic' })

    const out = await reencodeToJpeg(heic)

    expect(out.type).toBe('image/jpeg')
    expect(out.name).toMatch(/\.jpg$/)
  })

  it('scales the long edge down to the cap', async () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await reencodeToJpeg(new File(['...'], 'big.jpg', { type: 'image/jpeg' }), 1080)

    expect(Math.max(canvas.width, canvas.height)).toBe(1080)
    /* 4000x3000 at a 1080 cap is 1080x810 — the aspect ratio has to survive,
       or every upload arrives subtly stretched. */
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(810)
  })

  it('never enlarges a photo that is already small', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 400, height: 500, close: vi.fn(),
    }))
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await reencodeToJpeg(new File(['...'], 'small.jpg', { type: 'image/jpeg' }), 1080)

    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(500)
  })

  /* A browser that cannot decode the file must say so, not upload something
     the server will reject with a message about mime types. */
  it('reports a file the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('nope')))

    await expect(
      reencodeToJpeg(new File(['...'], 'weird.heic', { type: 'image/heic' }))
    ).rejects.toThrow(/could not be read/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./reencode`.

- [ ] **Step 3: Implement it**

`src/lib/reencode.ts`:

```ts
/* Instagram's largest portrait. Anything above this is bytes nobody sees, and
   the server scales to the same ceiling anyway. */
const MAX_EDGE = 1080
const QUALITY = 0.85

/**
 * Draw whatever the browser can decode, and hand back a JPEG.
 *
 * createImageBitmap honours the EXIF orientation flag on its own, so a photo
 * shot in portrait arrives upright — and drawing to a canvas discards every
 * other tag with it, including where it was taken.
 */
export async function reencodeToJpeg(
  file: File,
  maxEdge: number = MAX_EDGE,
  quality: number = QUALITY,
): Promise<File> {
  let bitmap: ImageBitmap

  try {
    bitmap = await createImageBitmap(file)
  } catch {
    /* Chrome cannot decode HEIC, and this is where that surfaces. Naming the
       file is what makes the message actionable. */
    throw new Error(`“${file.name}” could not be read by this browser. Try a JPEG or PNG.`)
  }

  /* Down only. Enlarging invents detail and costs bytes for a tile shown at
     about 130 pixels wide. */
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare images for upload.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )

  if (!blob) throw new Error(`“${file.name}” could not be converted for upload.`)

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}
```

- [ ] **Step 4: Write the picker**

`src/grid/AddPhotos.tsx`:

```tsx
import { useRef, useState } from 'react'
import { reencodeToJpeg } from '../lib/reencode'

type Props = {
  onFiles: (files: File[]) => void
  onError: (message: string) => void
  busy: boolean
}

/* Matches config('insta.max_files') on the server. Refusing here means an
   explanation instead of a 422 after the bytes have already been sent. */
const MAX_FILES = 30

export function AddPhotos({ onFiles, onError, busy }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [preparing, setPreparing] = useState(false)

  async function handle(list: FileList | null) {
    if (!list || list.length === 0) return

    const chosen = Array.from(list)

    if (chosen.length > MAX_FILES) {
      onError(`That is ${chosen.length} photos — ${MAX_FILES} at a time is the limit.`)
      return
    }

    setPreparing(true)

    try {
      /* One at a time. A phone decoding thirty full-resolution photos at once
         runs out of memory, and the tab dies with no message at all. */
      const prepared: File[] = []
      for (const file of chosen) prepared.push(await reencodeToJpeg(file))

      onFiles(prepared)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Those photos could not be prepared.')
    } finally {
      setPreparing(false)
      /* Cleared, or choosing the same file twice in a row fires no change. */
      if (input.current) input.current.value = ''
    }
  }

  const working = busy || preparing

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => void handle(e.target.files)}
      />
      <button className="icon-button" onClick={() => input.current?.click()}
        disabled={working} aria-label="Add photos">
        {working ? '…' : '+'}
      </button>
    </>
  )
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 4 reencode tests.

- [ ] **Step 6: Commit**

```bash
npm run build
git add -A
git commit -m "Convert photos in the browser, so HEIC is never the server's problem"
git push origin main
```

---

### Task 9: The viewer, and editing a tile

**Files:**
- Create: `src/grid/Viewer.tsx`
- Modify: `src/styles/app.css`
- Test: `src/grid/Viewer.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 5), `useGrid().patch` and `.remove` (Task 6)
- Produces: `<Viewer item onClose onPatch onDelete onStep />`

- [ ] **Step 1: Write the failing test**

`src/grid/Viewer.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Viewer } from './Viewer'
import type { GridItem } from '../types'

const draft: GridItem = {
  id: 1, kind: 'draft', position: 0, caption: null, scheduled_at: null,
  crop_x: 0.5, crop_y: 0.5, url: 'https://example.com/a.jpg',
  thumb_url: 'https://example.com/a_t.jpg', width: 1080, height: 1350,
  ig_timestamp: null,
}

const posted: GridItem = { ...draft, id: 2, kind: 'posted', ig_timestamp: '2026-08-01T10:00:00Z' }

describe('Viewer', () => {
  it('saves a caption on blur rather than on every keystroke', async () => {
    const onPatch = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={onPatch} onDelete={vi.fn()} onStep={vi.fn()} />)

    const box = screen.getByLabelText('Caption')
    await userEvent.type(box, 'Hello')
    expect(onPatch).not.toHaveBeenCalled()

    await userEvent.tab()
    expect(onPatch).toHaveBeenCalledWith(1, { caption: 'Hello' })
  })

  it('does not save a caption that has not changed', async () => {
    const onPatch = vi.fn()
    render(<Viewer item={{ ...draft, caption: 'Same' }} onClose={vi.fn()} onPatch={onPatch}
      onDelete={vi.fn()} onStep={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Caption'))
    await userEvent.tab()

    expect(onPatch).not.toHaveBeenCalled()
  })

  /* A published post is a record of something that already happened. Offering
     to schedule it would be offering to change the past. */
  it('offers a schedule date for a draft and not for a published post', () => {
    const { unmount } = render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()}
      onDelete={vi.fn()} onStep={vi.fn()} />)
    expect(screen.getByLabelText('Scheduled for')).toBeInTheDocument()
    unmount()

    render(<Viewer item={posted} onClose={vi.fn()} onPatch={vi.fn()} onDelete={vi.fn()} onStep={vi.fn()} />)
    expect(screen.queryByLabelText('Scheduled for')).not.toBeInTheDocument()
  })

  /* A 4:5 tile throws away part of most photos. Rendering the focal point
     without offering a way to move it would make the crop something that
     happens to you. */
  it('nudges the crop focal point', async () => {
    const onPatch = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={onPatch} onDelete={vi.fn()} onStep={vi.fn()} />)

    const vertical = screen.getByLabelText('Crop vertical')
    await userEvent.clear(vertical)
    fireEvent.change(vertical, { target: { value: '0.2' } })

    expect(onPatch).toHaveBeenCalledWith(1, { crop_y: 0.2 })
  })

  it('confirms before deleting, because there is no undo', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()} onDelete={onDelete} onStep={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Viewer item={draft} onClose={onClose} onPatch={vi.fn()} onDelete={vi.fn()} onStep={vi.fn()} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('steps between tiles with the arrow keys', async () => {
    const onStep = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()} onDelete={vi.fn()} onStep={onStep} />)

    await userEvent.keyboard('{ArrowRight}')
    expect(onStep).toHaveBeenCalledWith(1)

    await userEvent.keyboard('{ArrowLeft}')
    expect(onStep).toHaveBeenCalledWith(-1)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./Viewer`.

- [ ] **Step 3: Implement it**

`src/grid/Viewer.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { GridItem } from '../types'

type Props = {
  item: GridItem
  onClose: () => void
  onPatch: (id: number, changes: Partial<GridItem>) => void
  onDelete: (id: number) => void
  onStep: (direction: -1 | 1) => void
}

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time; the API sends ISO. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function Viewer({ item, onClose, onPatch, onDelete, onStep }: Props) {
  const [caption, setCaption] = useState(item.caption ?? '')

  /* Stepping to another tile keeps this component mounted, so the draft text
     has to follow the item rather than the mount. */
  useEffect(() => { setCaption(item.caption ?? '') }, [item.id, item.caption])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onStep])

  const isDraft = item.kind === 'draft'

  /* On blur, and only when it differs — typing a caption should not be thirty
     requests, and closing the viewer unchanged should be none. */
  function saveCaption() {
    if (caption === (item.caption ?? '')) return
    onPatch(item.id, { caption: caption || null })
  }

  function confirmDelete() {
    const what = isDraft ? 'this draft' : 'this post from your preview'
    if (!window.confirm(`Delete ${what}? This cannot be undone.`)) return
    onDelete(item.id)
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Photo">
      <div className="viewer-bar">
        <button className="icon-button" onClick={onClose} aria-label="Close">✕</button>
        <span className="viewer-kind">{isDraft ? 'Draft' : 'Published'}</span>
        <button className="icon-button" onClick={confirmDelete} aria-label="Delete">🗑</button>
      </div>

      <div className="viewer-stage">
        <button className="viewer-step" onClick={() => onStep(-1)} aria-label="Previous">‹</button>
        <img className="viewer-image" src={item.url} alt="" />
        <button className="viewer-step" onClick={() => onStep(1)} aria-label="Next">›</button>
      </div>

      <div className="viewer-fields">
        <label className="viewer-label" htmlFor="caption">Caption</label>
        <textarea
          id="caption"
          className="field field-area"
          rows={4}
          maxLength={2200}
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onBlur={saveCaption}
        />
        <span className="viewer-count">{caption.length} / 2200</span>

        {isDraft && (
          <>
            <label className="viewer-label" htmlFor="scheduled">Scheduled for</label>
            <input
              id="scheduled"
              className="field"
              type="datetime-local"
              value={toLocalInput(item.scheduled_at)}
              onChange={e =>
                onPatch(item.id, {
                  scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </>
        )}

        {/* The grid crops to 4:5, so the middle of a photo is a guess. These
            move what survives the crop — the same job as Instagram's own crop
            handle, without the drag surface. */}
        <label className="viewer-label" htmlFor="crop-x">Crop horizontal</label>
        <input
          id="crop-x" className="slider" type="range" min={0} max={1} step={0.05}
          value={item.crop_x}
          onChange={e => onPatch(item.id, { crop_x: Number(e.target.value) })}
        />

        <label className="viewer-label" htmlFor="crop-y">Crop vertical</label>
        <input
          id="crop-y" className="slider" type="range" min={0} max={1} step={0.05}
          value={item.crop_y}
          onChange={e => onPatch(item.id, { crop_y: Number(e.target.value) })}
        />

        {item.ig_timestamp && (
          <p className="hint">Posted {new Date(item.ig_timestamp).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Style it**

Append to `src/styles/app.css`:

```css
.viewer {
  position: fixed; inset: 0; z-index: 30;
  background: var(--bg);
  display: flex; flex-direction: column;
  overflow-y: auto;
}

.viewer-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 8px; border-bottom: 1px solid var(--separator);
  padding-top: calc(4px + env(safe-area-inset-top));
}

.viewer-kind { font-size: 14px; font-weight: 600; }

.viewer-stage {
  display: flex; align-items: center; justify-content: center;
  background: #000; position: relative;
}

.viewer-image { max-width: 100%; max-height: 60vh; object-fit: contain; display: block; }

.viewer-step {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgb(0 0 0 / 0.4); color: #fff;
  border: 0; border-radius: 50%;
  width: 44px; height: 44px; font-size: 24px; cursor: pointer;
}
.viewer-step:first-of-type { left: 8px; }
.viewer-step:last-of-type { right: 8px; }

.viewer-fields {
  display: flex; flex-direction: column; gap: 6px;
  padding: 16px; max-width: var(--column); width: 100%; margin: 0 auto;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.viewer-label { font-size: 13px; font-weight: 600; }
.viewer-count { font-size: 12px; color: var(--text-secondary); text-align: right; }
.slider { width: 100%; accent-color: var(--accent); }
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 7 viewer tests.

- [ ] **Step 6: Commit**

```bash
npm run build
git add -A
git commit -m "Open a tile, caption it, and say when it goes out"
git push origin main
```

---

### Task 10: Preview mode, and putting the screen together

The task that makes the app an app: everything built so far, wired into one
screen, plus the toggle that strips the editing furniture away.

**Files:**
- Modify: `src/App.tsx`, `src/styles/app.css`
- Create: `src/Screen.tsx`
- Test: `src/Screen.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2 and 5 through 9
- Produces: the finished app

- [ ] **Step 1: Write the failing test**

`src/Screen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Screen } from './Screen'
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

function stubApi() {
  vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path === '/api/accounts') return { data: [account] }
    if (path.endsWith('/items')) return { data: items }
    return {}
  })
}

afterEach(() => vi.restoreAllMocks())

describe('Screen', () => {
  it('renders the profile and the grid', async () => {
    stubApi()
    render(<Screen />)

    expect(await screen.findByText('gleearl')).toBeInTheDocument()
    expect(await screen.findAllByRole('button', { name: /Draft|Published post/ })).toHaveLength(2)
  })

  /* The whole point of preview mode: what is left has to be indistinguishable
     from a real profile, so every mark this app adds must go. */
  it('preview mode hides the draft badges and the add button', async () => {
    stubApi()
    render(<Screen />)
    await screen.findByText('gleearl')

    expect(screen.getByLabelText('Add photos')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /preview/i }))

    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('switches the grid between 4:5 and square', async () => {
    stubApi()
    const { container } = render(<Screen />)
    await screen.findByText('gleearl')

    expect(container.querySelector('.grid')).toHaveAttribute('data-ratio', '4:5')

    await userEvent.click(screen.getByRole('button', { name: '1:1' }))
    expect(container.querySelector('.grid')).toHaveAttribute('data-ratio', '1:1')
  })

  /* Someone arriving with no accounts must be told what to do, not shown an
     empty screen that looks broken. */
  it('says what to do when there are no accounts yet', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    render(<Screen />)

    expect(await screen.findByText(/add an account/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./Screen`.

- [ ] **Step 3: Implement the screen**

`src/Screen.tsx`:

```tsx
import { useState } from 'react'
import { AccountForm } from './accounts/AccountForm'
import { AccountSwitcher } from './accounts/AccountSwitcher'
import { useAccounts } from './accounts/useAccounts'
import { useAuth } from './auth/AuthProvider'
import { Highlights } from './components/Highlights'
import { ProfileHeader } from './components/ProfileHeader'
import { Sheet } from './components/Sheet'
import { TabBar } from './components/TabBar'
import type { Tab } from './components/TabBar'
import { AddPhotos } from './grid/AddPhotos'
import { Grid } from './grid/Grid'
import type { Ratio } from './grid/Grid'
import { useGrid } from './grid/useGrid'
import { Viewer } from './grid/Viewer'
import type { Account, GridItem } from './types'

export function Screen() {
  const { signOut } = useAuth()
  const accountsState = useAccounts()
  const { accounts, active, activeId, setActiveId, sync, syncing } = accountsState
  const grid = useGrid(activeId)

  const [preview, setPreview] = useState(false)
  const [ratio, setRatio] = useState<Ratio>('4:5')
  const [tab, setTab] = useState<Tab>('grid')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null | undefined>(undefined)
  const [viewing, setViewing] = useState<GridItem | null>(null)

  const error = accountsState.error || grid.error

  if (accountsState.loading) {
    return <div className="screen"><p className="empty">…</p></div>
  }

  if (accounts.length === 0) {
    return (
      <div className="screen">
        <div className="empty">
          <h2>No accounts yet</h2>
          <p>Add an account to start planning a grid.</p>
          <button className="primary" onClick={() => setEditing(null)}>Add an account</button>
        </div>
        <Sheet open={editing !== undefined} title="New account" onClose={() => setEditing(undefined)}>
          <AccountForm
            account={null}
            onSubmit={async draft => { await accountsState.create(draft); setEditing(undefined) }}
            onCancel={() => setEditing(undefined)}
          />
        </Sheet>
      </div>
    )
  }

  if (!active) return <div className="screen"><p className="empty">…</p></div>

  function step(direction: -1 | 1) {
    if (!viewing) return
    const index = grid.items.findIndex(i => i.id === viewing.id)
    const next = grid.items[index + direction]
    if (next) setViewing(next)
  }

  return (
    <div className="screen">
      {/* In preview mode this is the only control left, and it sits over the
          page rather than in it — anything in the layout would shift the
          thing being previewed. */}
      <button
        className="preview-toggle"
        onClick={() => setPreview(p => !p)}
        aria-label={preview ? 'Leave preview' : 'Preview'}
      >
        {preview ? '✕ Editing' : '👁 Preview'}
      </button>

      <ProfileHeader
        account={active}
        onSwitch={() => setSwitcherOpen(true)}
        actions={
          preview ? null : (
            <AddPhotos
              onFiles={files => void grid.upload(files)}
              onError={grid.setError}
              busy={grid.uploading}
            />
          )
        }
      />

      {!preview && (
        <div className="toolbar">
          {active.kind === 'online' && (
            <button className="pill" disabled={syncing}
              onClick={() => sync(active.id).then(() => grid.reload()).catch(() => {})}>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <div className="ratio-toggle">
            <button className="segment" aria-pressed={ratio === '4:5'} onClick={() => setRatio('4:5')}>4:5</button>
            <button className="segment" aria-pressed={ratio === '1:1'} onClick={() => setRatio('1:1')}>1:1</button>
          </div>
        </div>
      )}

      {error && !preview && <p className="banner" role="alert">{error}</p>}

      <Highlights />
      <TabBar active={tab} onChange={setTab} />

      {tab === 'grid' ? (
        <Grid
          items={grid.items}
          ratio={ratio}
          editing={!preview}
          onOpen={item => !preview && setViewing(item)}
          onReorder={grid.reorder}
        />
      ) : (
        <p className="empty">Nothing here — this app only previews the grid.</p>
      )}

      <Sheet open={switcherOpen} title="Accounts" onClose={() => setSwitcherOpen(false)}>
        <AccountSwitcher
          accounts={accounts}
          active={active}
          onSelect={id => { setActiveId(id); setSwitcherOpen(false) }}
          onAdd={() => { setSwitcherOpen(false); setEditing(null) }}
          onEdit={account => { setSwitcherOpen(false); setEditing(account) }}
          onRemove={account => {
            if (!window.confirm(`Remove ${account.username}? Its drafts go too, and that cannot be undone.`)) return
            void accountsState.remove(account.id)
          }}
        />
        <button className="link" onClick={() => void signOut()}>Sign out</button>
      </Sheet>

      <Sheet
        open={editing !== undefined}
        title={editing ? 'Edit account' : 'New account'}
        onClose={() => setEditing(undefined)}
      >
        <AccountForm
          account={editing ?? null}
          onSubmit={async draft => {
            if (editing) await accountsState.update(editing.id, draft)
            else await accountsState.create(draft)
            setEditing(undefined)
          }}
          onCancel={() => setEditing(undefined)}
        />
      </Sheet>

      {viewing && (
        <Viewer
          item={grid.items.find(i => i.id === viewing.id) ?? viewing}
          onClose={() => setViewing(null)}
          onPatch={grid.patch}
          onDelete={id => { void grid.remove(id); setViewing(null) }}
          onStep={step}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Point App at it**

`src/App.tsx`:

```tsx
import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { ResetScreen } from './auth/ResetScreen'
import { currentRoute } from './lib/router'
import { Screen } from './Screen'

export default function App() {
  const { user, loading } = useAuth()

  if (currentRoute() === 'reset-password') return <ResetScreen />
  /* Before /api/me answers, showing the sign-in form would flash it at
     someone who is already signed in. */
  if (loading) return <div className="auth"><p className="auth-sub">…</p></div>
  if (!user) return <AuthScreen />

  return <Screen />
}
```

- [ ] **Step 5: Style the remainder**

Append to `src/styles/app.css`:

```css
.toolbar { display: flex; align-items: center; gap: 8px; padding: 0 16px 8px; }
.toolbar .pill { flex: 0 0 auto; padding: 0 16px; }
.toolbar .ratio-toggle { margin-left: auto; padding: 0; display: flex; gap: 0; background: var(--button-fill); border-radius: var(--radius); }
.toolbar .segment { padding: 0 12px; height: 28px; }

.preview-toggle {
  position: fixed; z-index: 10;
  right: 16px; bottom: calc(16px + env(safe-area-inset-bottom));
  height: 40px; padding: 0 16px;
  border: 0; border-radius: 20px;
  background: var(--text); color: var(--bg);
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.25);
}

.banner {
  margin: 0 16px 8px; padding: 10px 12px;
  border-radius: var(--radius);
  background: #ed4956; color: #fff; font-size: 13px;
}

.empty { padding: 48px 24px; text-align: center; color: var(--text-secondary); }
.empty h2 { color: var(--text); font-size: 20px; margin: 0 0 8px; }
.empty .primary { margin-top: 16px; }
```

- [ ] **Step 6: Run everything**

```bash
npm test
npm run build
```

Expected: PASS across every file, build clean.

- [ ] **Step 7: Commit and deploy**

```bash
git add -A
git commit -m "Put the screen together, and give it a way to disappear"
git push origin main
gh run watch
```

- [ ] **Step 8: Check it in a real browser**

Open the deployed URL. Register an account, add an offline account with a
display name and follower count, upload three photos, drag one, open it, write
a caption, then press **Preview** and confirm nothing on screen gives the app
away.

---

## Done when

- [ ] The deployed page loads and signs a new account in
- [ ] `npm test` is green
- [ ] `npm run build` typechecks
- [ ] Photos upload from a phone — the iOS case is the one that matters, since
      HEIC is what it will send
- [ ] A tile can be dragged with a finger, and the new order survives a reload
- [ ] Preview mode leaves nothing on screen that Instagram would not show

## Afterwards, not part of this plan

- **The custom domain.** Add `public/CNAME` containing `insta.gleearl.com`,
  point the DNS at GitHub Pages, and set `VITE_BASE=/` in the workflow **on the
  same commit** — the base path and the CNAME have to change together or every
  asset 404s.
- **`VITE_GOOGLE_CLIENT_ID`** as a repository variable, once the Google Cloud
  Web client exists.

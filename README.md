# Insta Preview

Plan an Instagram grid before you post it. Drag drafts into position and see how
they sit alongside what you have already published — in a faithful reproduction
of the Instagram profile screen.

- **Live:** https://gleearl.github.io/insta-preview-fe/ (custom domain `insta.gleearl.com` not pointed yet)
- **API:** [insta-preview-laravel](https://github.com/gleearl/insta-preview-laravel) · https://insta-api.gleearl.com

## Features

- **Accounts that follow you** — sign in with Google; grids sync across devices
- **Online accounts** — connect an Instagram token to pull your real posts
- **Offline accounts** — upload photos by hand, no Instagram account needed
- **Drag to reorder** — drafts *and* published photos
- **Captions and scheduled dates** — plan what goes out and when
- **Preview mode** — strips every editing affordance for a pixel-honest profile

## Signing in

Google only. There is no password anywhere in this app — no registration, no
login form, no reset. Google Identity Services hands the browser an ID token,
the API verifies its signature against Google's published keys, and issues a
bearer token of its own.

`GOOGLE_CLIENT_ID` is a repository **variable** (not a secret — a Web client id
is public by design and ships in the page source). The Google Cloud client needs
`https://gleearl.github.io` and `https://insta.gleearl.com` in **Authorised
JavaScript origins**; it needs no redirect URI, because this flow never
redirects.

## Not wired up yet

- **Custom domain.** Add `public/CNAME` with `insta.gleearl.com`, point the DNS
  at GitHub Pages, and set `VITE_BASE=/` in the workflow **on the same commit** —
  the base path and the CNAME must change together or every asset 404s.
## Local development

```bash
npm install
npm run dev
```

Set `VITE_API_URL` to point at the API. It defaults to production.

## Tech

| | |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build tool | Vite 6 |
| Backend | Laravel 12 + Sanctum |
| Deployment | GitHub Pages via GitHub Actions |

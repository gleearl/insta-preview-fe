# Insta Preview

Plan an Instagram grid before you post it. Drag drafts into position and see how
they sit alongside what you have already published — in a faithful reproduction
of the Instagram profile screen.

- **Live:** https://insta.gleearl.com
- **API:** [insta-preview-laravel](https://github.com/gleearl/insta-preview-laravel) · https://insta-api.gleearl.com

## Features

- **Accounts that follow you** — sign in with email or Google; grids sync across devices
- **Online accounts** — connect an Instagram token to pull your real posts
- **Offline accounts** — upload photos by hand, no Instagram account needed
- **Drag to reorder** — drafts *and* published photos
- **Captions and scheduled dates** — plan what goes out and when
- **Preview mode** — strips every editing affordance for a pixel-honest profile

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

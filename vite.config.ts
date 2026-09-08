import react from '@vitejs/plugin-react'
/* From vitest/config, not vite — it is what types the `test` block below. */
import { defineConfig } from 'vitest/config'

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

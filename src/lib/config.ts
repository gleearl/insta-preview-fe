/* Vite inlines this at build time, so it is the workflow's job to supply it —
   there is no runtime config to get wrong, and no way to point a built bundle
   at a different API by accident. */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'https://insta-api.gleearl.com'

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

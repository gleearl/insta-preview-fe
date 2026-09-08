/* Instagram groups thousands and abbreviates above ten thousand. Getting this
   wrong changes the width of the row, which is the whole thing being previewed. */
export function formatCount(value: number | null): string {
  if (value === null) return '—'
  if (value < 10_000) return value.toLocaleString('en-US')

  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(value < 100_000 ? 1 : 0)}`.replace(/\.0$/, '') + 'K'
  }

  return `${(value / 1_000_000).toFixed(1)}`.replace(/\.0$/, '') + 'M'
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

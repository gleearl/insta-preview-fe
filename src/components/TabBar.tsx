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

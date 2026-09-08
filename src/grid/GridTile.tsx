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
      className={['tile', editing && isDraft ? 'tile-draft' : '', dragging ? 'tile-dragging' : '']
        .filter(Boolean).join(' ')}
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

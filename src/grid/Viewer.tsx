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
        <input id="crop-x" className="slider" type="range" min={0} max={1} step={0.05}
          value={item.crop_x}
          onChange={e => onPatch(item.id, { crop_x: Number(e.target.value) })} />

        <label className="viewer-label" htmlFor="crop-y">Crop vertical</label>
        <input id="crop-y" className="slider" type="range" min={0} max={1} step={0.05}
          value={item.crop_y}
          onChange={e => onPatch(item.id, { crop_y: Number(e.target.value) })} />

        {item.ig_timestamp && (
          <p className="hint">Posted {new Date(item.ig_timestamp).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import type { ReactNode } from 'react'

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode }

/* Instagram puts everything in a bottom sheet, and a sheet is thumb-reachable
   in a way a centred modal is not. */
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

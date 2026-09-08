import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { moveItem } from './reorder'

/* Below this, the gesture is still a tap. Roughly a fingertip's wobble — big
   enough that opening a tile works, small enough that a drag feels immediate. */
const DRAG_THRESHOLD_PX = 8

type Identified = { id: number }

export function useDragReorder<T extends Identified>(
  items: T[],
  onReorder: (next: T[]) => void,
  enabled: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const start = useRef<{ x: number; y: number; index: number } | null>(null)
  const order = useRef<T[]>(items)
  const moved = useRef(false)

  const indexAt = useCallback((x: number, y: number): number => {
    const container = containerRef.current
    if (!container) return -1

    const cells = Array.from(container.querySelectorAll<HTMLElement>('[data-index]'))

    for (const cell of cells) {
      const box = cell.getBoundingClientRect()
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        return Number(cell.dataset.index)
      }
    }

    return -1
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled) return

    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-index]')
    if (!cell) return

    start.current = { x: e.clientX, y: e.clientY, index: Number(cell.dataset.index) }
    order.current = items
    moved.current = false
  }, [enabled, items])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !start.current) return

    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (!moved.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return

      moved.current = true
      setDraggingId(order.current[start.current.index]?.id ?? null)

      /* Keep receiving moves even when the finger leaves the element it
         started on — which it does immediately. */
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture?.(e.pointerId)
    }

    const over = indexAt(e.clientX, e.clientY)
    if (over === -1 || over === start.current.index) return

    /* Reordered live rather than on drop, so the grid shows the arrangement
       being considered instead of a tile floating over a stale one. */
    order.current = moveItem(order.current, start.current.index, over)
    start.current = { ...start.current, index: over }
    onReorder(order.current)
  }, [enabled, indexAt, onReorder])

  const finish = useCallback(() => {
    start.current = null
    moved.current = false
    setDraggingId(null)
  }, [])

  return {
    containerRef,
    draggingId,
    handlers: {
      onPointerDown,
      onPointerMove,
      /* A tap — no movement — falls through here having changed nothing, and
         the tile's own click handler opens it. */
      onPointerUp: finish,
      /* The system took the gesture. Whatever was applied optimistically has
         already gone to onReorder, so the debounce will save it — but nothing
         further is inferred from a pointer that vanished. */
      onPointerCancel: finish,
    },
  }
}

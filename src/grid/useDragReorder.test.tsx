import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragReorder } from './useDragReorder'

type Item = { id: number }
const items: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }]

function Harness({ onReorder, enabled = true }: { onReorder: (n: Item[]) => void; enabled?: boolean }) {
  const { containerRef, draggingId, handlers } = useDragReorder(items, onReorder, enabled)

  return (
    <div ref={containerRef} data-testid="grid" {...handlers}>
      <span data-testid="dragging">{draggingId ?? 'none'}</span>
      {items.map((item, index) => (
        <div key={item.id} data-index={index} data-testid={`cell-${item.id}`}>{item.id}</div>
      ))}
    </div>
  )
}

/* jsdom has no layout, so every getBoundingClientRect is zeroes. Giving each
   cell a rectangle is what lets a pointer position mean something. */
function layOutCells() {
  ;[1, 2, 3].forEach((id, i) => {
    vi.spyOn(screen.getByTestId(`cell-${id}`), 'getBoundingClientRect').mockReturnValue({
      left: i * 100, top: 0, right: i * 100 + 100, bottom: 100,
      width: 100, height: 100, x: i * 100, y: 0, toJSON: () => ({}),
    } as DOMRect)
  })
}

function pointer(el: Element, type: string, x: number, y = 50) {
  const event = new Event(type, { bubbles: true })
  Object.assign(event, { clientX: x, clientY: y, pointerId: 1, isPrimary: true })
  el.dispatchEvent(event)
}

describe('useDragReorder', () => {
  it('reports nothing dragging at rest', () => {
    render(<Harness onReorder={vi.fn()} />)
    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
  })

  /* A tap must stay a tap. Starting a drag on pointerdown would make every
     attempt to open a tile drag it somewhere instead. */
  it('does not start a drag until the pointer has actually moved', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 13)

    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('reorders when a tile is dragged onto another', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    pointer(screen.getByTestId('grid'), 'pointerup', 250)

    expect(onReorder).toHaveBeenCalledWith([{ id: 2 }, { id: 3 }, { id: 1 }])
  })

  it('does nothing at all when dragging is switched off', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} enabled={false} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    pointer(screen.getByTestId('grid'), 'pointerup', 250)

    expect(onReorder).not.toHaveBeenCalled()
  })

  /* A cancelled pointer — an incoming call, a system gesture — must leave the
     grid alone rather than continuing to track a finger that is gone. */
  it('stops tracking on pointercancel', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    layOutCells()

    pointer(screen.getByTestId('cell-1'), 'pointerdown', 10)
    pointer(screen.getByTestId('grid'), 'pointermove', 250)
    onReorder.mockClear()
    pointer(screen.getByTestId('grid'), 'pointercancel', 250)
    pointer(screen.getByTestId('grid'), 'pointermove', 10)

    expect(onReorder).not.toHaveBeenCalled()
    expect(screen.getByTestId('dragging')).toHaveTextContent('none')
  })
})

import { GridTile } from './GridTile'
import { useDragReorder } from './useDragReorder'
import type { GridItem } from '../types'

export type Ratio = '4:5' | '1:1'

type Props = {
  items: GridItem[]
  ratio: Ratio
  editing: boolean
  onOpen: (item: GridItem) => void
  onReorder: (next: GridItem[]) => void
}

export function Grid({ items, ratio, editing, onOpen, onReorder }: Props) {
  const { containerRef, draggingId, handlers } = useDragReorder(items, onReorder, editing)

  return (
    <div ref={containerRef} className="grid" data-ratio={ratio} {...handlers}>
      {items.map((item, index) => (
        <div className="grid-cell" key={item.id} data-index={index}>
          <GridTile
            item={item}
            editing={editing}
            dragging={draggingId === item.id}
            onOpen={() => onOpen(item)}
          />
          {/* The fold: on a real profile the first nine tiles are what someone
              sees before scrolling, and that is the thing being previewed. */}
          {editing && index === 8 && <span className="fold" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}

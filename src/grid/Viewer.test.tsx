import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Viewer } from './Viewer'
import type { GridItem } from '../types'

const draft: GridItem = {
  id: 1, kind: 'draft', position: 0, caption: null, scheduled_at: null,
  crop_x: 0.5, crop_y: 0.5, url: 'https://example.com/a.jpg',
  thumb_url: 'https://example.com/a_t.jpg', width: 1080, height: 1350,
  ig_timestamp: null,
}

const posted: GridItem = { ...draft, id: 2, kind: 'posted', ig_timestamp: '2026-08-01T10:00:00Z' }

describe('Viewer', () => {
  it('saves a caption on blur rather than on every keystroke', async () => {
    const onPatch = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={onPatch} onDelete={vi.fn()} onStep={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Caption'), 'Hello')
    expect(onPatch).not.toHaveBeenCalled()

    await userEvent.tab()
    expect(onPatch).toHaveBeenCalledWith(1, { caption: 'Hello' })
  })

  it('does not save a caption that has not changed', async () => {
    const onPatch = vi.fn()
    render(<Viewer item={{ ...draft, caption: 'Same' }} onClose={vi.fn()} onPatch={onPatch}
      onDelete={vi.fn()} onStep={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Caption'))
    await userEvent.tab()

    expect(onPatch).not.toHaveBeenCalled()
  })

  /* A published post is a record of something that already happened. Offering
     to schedule it would be offering to change the past. */
  it('offers a schedule date for a draft and not for a published post', () => {
    const { unmount } = render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()}
      onDelete={vi.fn()} onStep={vi.fn()} />)
    expect(screen.getByLabelText('Scheduled for')).toBeInTheDocument()
    unmount()

    render(<Viewer item={posted} onClose={vi.fn()} onPatch={vi.fn()} onDelete={vi.fn()} onStep={vi.fn()} />)
    expect(screen.queryByLabelText('Scheduled for')).not.toBeInTheDocument()
  })

  /* A 4:5 tile throws away part of most photos. Rendering the focal point
     without offering a way to move it would make the crop something that
     happens to you. */
  it('nudges the crop focal point', () => {
    const onPatch = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={onPatch} onDelete={vi.fn()} onStep={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Crop vertical'), { target: { value: '0.2' } })

    expect(onPatch).toHaveBeenCalledWith(1, { crop_y: 0.2 })
  })

  it('confirms before deleting, because there is no undo', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()} onDelete={onDelete} onStep={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Viewer item={draft} onClose={onClose} onPatch={vi.fn()} onDelete={vi.fn()} onStep={vi.fn()} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('steps between tiles with the arrow keys', async () => {
    const onStep = vi.fn()
    render(<Viewer item={draft} onClose={vi.fn()} onPatch={vi.fn()} onDelete={vi.fn()} onStep={onStep} />)

    await userEvent.keyboard('{ArrowRight}')
    expect(onStep).toHaveBeenCalledWith(1)

    await userEvent.keyboard('{ArrowLeft}')
    expect(onStep).toHaveBeenCalledWith(-1)
  })
})

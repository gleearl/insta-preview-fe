import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reencodeToJpeg } from './reencode'

/* jsdom has neither createImageBitmap nor a canvas that encodes. Both are
   faked to the smallest shape this code actually uses. */
beforeEach(() => {
  vi.restoreAllMocks()

  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    width: 4000, height: 3000, close: vi.fn(),
  }))

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    imageSmoothingQuality: '',
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D)

  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback: BlobCallback) => callback(new Blob(['x'.repeat(500)], { type: 'image/jpeg' }))
  )
})

describe('reencodeToJpeg', () => {
  it('always produces a JPEG, whatever went in', async () => {
    const heic = new File(['...'], 'IMG_0001.HEIC', { type: 'image/heic' })

    const out = await reencodeToJpeg(heic)

    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('IMG_0001.jpg')
  })

  it('scales the long edge down to the cap, keeping the aspect ratio', async () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await reencodeToJpeg(new File(['...'], 'big.jpg', { type: 'image/jpeg' }), 1080)

    /* 4000x3000 at a 1080 cap is 1080x810 — the ratio has to survive, or every
       upload arrives subtly stretched. */
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(810)
  })

  it('never enlarges a photo that is already small', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 400, height: 500, close: vi.fn(),
    }))
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await reencodeToJpeg(new File(['...'], 'small.jpg', { type: 'image/jpeg' }), 1080)

    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(500)
  })

  /* A browser that cannot decode the file must say so, not upload something
     the server will reject with a message about mime types. */
  it('names the file the browser could not decode', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('nope')))

    await expect(
      reencodeToJpeg(new File(['...'], 'weird.heic', { type: 'image/heic' }))
    ).rejects.toThrow(/weird\.heic.*could not be read/i)
  })
})

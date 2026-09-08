/* Instagram's largest portrait. Anything above this is bytes nobody sees, and
   the server scales to the same ceiling anyway. */
const MAX_EDGE = 1080
const QUALITY = 0.85

/**
 * Draw whatever the browser can decode, and hand back a JPEG.
 *
 * createImageBitmap honours the EXIF orientation flag on its own, so a photo
 * shot in portrait arrives upright — and drawing to a canvas discards every
 * other tag with it, including where it was taken.
 *
 * This exists because IONOS has GD but no Imagick, and GD cannot decode the
 * HEIC an iPhone shoots by default.
 */
export async function reencodeToJpeg(
  file: File,
  maxEdge: number = MAX_EDGE,
  quality: number = QUALITY,
): Promise<File> {
  let bitmap: ImageBitmap

  try {
    bitmap = await createImageBitmap(file)
  } catch {
    /* Chrome cannot decode HEIC, and this is where that surfaces. Naming the
       file is what makes the message actionable. */
    throw new Error(`“${file.name}” could not be read by this browser. Try a JPEG or PNG.`)
  }

  /* Down only. Enlarging invents detail and costs bytes for a tile shown at
     about 130 pixels wide. */
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare images for upload.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )

  if (!blob) throw new Error(`“${file.name}” could not be converted for upload.`)

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

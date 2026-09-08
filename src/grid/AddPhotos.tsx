import { useRef, useState } from 'react'
import { reencodeToJpeg } from '../lib/reencode'

type Props = {
  onFiles: (files: File[]) => void
  onError: (message: string) => void
  busy: boolean
}

/* Matches config('insta.max_files') on the server. Refusing here means an
   explanation instead of a 422 after the bytes have already been sent. */
const MAX_FILES = 30

export function AddPhotos({ onFiles, onError, busy }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [preparing, setPreparing] = useState(false)

  async function handle(list: FileList | null) {
    if (!list || list.length === 0) return

    const chosen = Array.from(list)

    if (chosen.length > MAX_FILES) {
      onError(`That is ${chosen.length} photos — ${MAX_FILES} at a time is the limit.`)
      return
    }

    setPreparing(true)

    try {
      /* One at a time. A phone decoding thirty full-resolution photos at once
         runs out of memory, and the tab dies with no message at all. */
      const prepared: File[] = []
      for (const file of chosen) prepared.push(await reencodeToJpeg(file))

      onFiles(prepared)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Those photos could not be prepared.')
    } finally {
      setPreparing(false)
      /* Cleared, or choosing the same file twice in a row fires no change. */
      if (input.current) input.current.value = ''
    }
  }

  const working = busy || preparing

  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple hidden
        onChange={e => void handle(e.target.files)} />
      <button className="icon-button" onClick={() => input.current?.click()}
        disabled={working} aria-label="Add photos">
        {working ? '…' : '+'}
      </button>
    </>
  )
}

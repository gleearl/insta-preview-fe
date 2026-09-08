import { useEffect, useState } from 'react'
import { fetchHealth } from './lib/health'

export default function App() {
  const [status, setStatus] = useState('checking…')

  useEffect(() => {
    fetchHealth()
      .then(h => setStatus(`API ${h.version}`))
      .catch(e => setStatus(`API unreachable: ${e.message}`))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Insta Preview</h1>
      <p>{status}</p>
    </main>
  )
}

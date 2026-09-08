import { API_URL } from './config'

export type Health = { ok: boolean; version: string }

export async function fetchHealth(): Promise<Health> {
  const response = await fetch(`${API_URL}/api/health`)

  if (!response.ok) {
    throw new Error(`API answered ${response.status}`)
  }

  return response.json()
}

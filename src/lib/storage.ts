import { Counts, LastEdited, normalizeCounts, normalizeLastEdited } from './prayers'

const STORAGE_KEY = 'qaza-tracker-v1'

export interface StoredState {
  counts: Counts
  /** ISO timestamp of the last local change — used for last-write-wins sync. */
  updatedAt: string
  /** Per-prayer ISO timestamp of the last edit. */
  lastEdited: LastEdited
}

export function loadLocal(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      counts: normalizeCounts(parsed?.counts),
      updatedAt:
        typeof parsed?.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date(0).toISOString(),
      lastEdited: normalizeLastEdited(parsed?.lastEdited),
    }
  } catch {
    return null
  }
}

export function saveLocal(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota / private-mode errors — the in-memory state still works.
  }
}

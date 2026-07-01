import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Counts,
  EMPTY_COUNTS,
  LastEdited,
  PrayerKey,
  normalizeCounts,
  normalizeLastEdited,
  totalRemaining,
} from '../lib/prayers'
import { StoredState, loadLocal, saveLocal } from '../lib/storage'
import { TABLE, isSupabaseEnabled, supabase } from '../lib/supabase'

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error'

function freshState(): StoredState {
  return (
    loadLocal() ?? { counts: { ...EMPTY_COUNTS }, updatedAt: new Date(0).toISOString(), lastEdited: {} }
  )
}

export interface QazaStore {
  counts: Counts
  total: number
  lastEdited: LastEdited
  syncStatus: SyncStatus
  increment: (key: PrayerKey) => void
  decrement: (key: PrayerKey) => void
  setCount: (key: PrayerKey, value: number) => void
  resetAll: () => void
}

export function useQaza(session: Session | null): QazaStore {
  const [state, setState] = useState<StoredState>(freshState)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseEnabled ? 'idle' : 'disabled')

  const stateRef = useRef(state)
  stateRef.current = state

  // Skip the cloud push that would otherwise follow when we *adopt* cloud data.
  const suppressPushRef = useRef(false)
  // Guard against overlapping reconciles from rapid focus/visibility events.
  const reconcilingRef = useRef(false)
  const userId = session?.user.id ?? null

  // Persist every change to localStorage immediately (offline-first).
  useEffect(() => {
    saveLocal(state)
  }, [state])

  // Update a prayer's count and stamp it as the most recently edited prayer.
  const touch = useCallback((key: PrayerKey, next: Counts) => {
    const now = new Date().toISOString()
    setState((prev) => ({
      counts: next,
      updatedAt: now,
      lastEdited: { ...prev.lastEdited, [key]: now },
    }))
  }, [])

  const increment = useCallback((key: PrayerKey) => {
    const cur = stateRef.current.counts
    touch(key, { ...cur, [key]: (cur[key] || 0) + 1 })
  }, [touch])

  const decrement = useCallback((key: PrayerKey) => {
    const cur = stateRef.current.counts
    touch(key, { ...cur, [key]: Math.max(0, (cur[key] || 0) - 1) })
  }, [touch])

  const setCount = useCallback((key: PrayerKey, value: number) => {
    const cur = stateRef.current.counts
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    touch(key, { ...cur, [key]: safe })
  }, [touch])

  const resetAll = useCallback(() => {
    setState({ counts: { ...EMPTY_COUNTS }, updatedAt: new Date().toISOString(), lastEdited: {} })
  }, [])

  const pushToCloud = useCallback(async (snapshot: StoredState) => {
    if (!supabase || !userId) return
    setSyncStatus('syncing')
    const { error } = await supabase.from(TABLE).upsert({
      user_id: userId,
      counts: snapshot.counts,
      updated_at: snapshot.updatedAt,
      last_edited: snapshot.lastEdited,
    })
    setSyncStatus(error ? 'error' : 'synced')
  }, [userId])

  // Pull the cloud row and reconcile with local by last-write-wins.
  // Safe to call any time: login, app focus/visibility, or regained network.
  const reconcile = useCallback(async () => {
    if (!supabase || !userId || reconcilingRef.current) return
    reconcilingRef.current = true
    setSyncStatus('syncing')
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('counts, updated_at, last_edited')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        setSyncStatus('error')
        return
      }

      const local = stateRef.current
      if (data) {
        const cloudUpdatedAt: string = data.updated_at ?? new Date(0).toISOString()
        if (new Date(cloudUpdatedAt).getTime() > new Date(local.updatedAt).getTime()) {
          // Cloud is newer — adopt it locally without echoing a push back up.
          suppressPushRef.current = true
          setState({
            counts: normalizeCounts(data.counts),
            updatedAt: cloudUpdatedAt,
            lastEdited: normalizeLastEdited(data.last_edited),
          })
          setSyncStatus('synced')
          return
        }
      }
      // No cloud row yet, or local is newer/equal — local wins, push it up.
      await pushToCloud(local)
    } finally {
      reconcilingRef.current = false
    }
  }, [userId, pushToCloud])

  // Reconcile when the signed-in user changes (initial load / login).
  useEffect(() => {
    if (!supabase || !userId) {
      if (isSupabaseEnabled) setSyncStatus('idle')
      return
    }
    reconcile()
  }, [userId, reconcile])

  // Re-pull fresh data every time the app regains focus/visibility or the
  // network comes back, so switching back to the PWA shows the latest counts
  // without a manual restart.
  useEffect(() => {
    if (!supabase || !userId) return
    const onActive = () => {
      if (document.visibilityState === 'visible') reconcile()
    }
    document.addEventListener('visibilitychange', onActive)
    window.addEventListener('focus', onActive)
    window.addEventListener('pageshow', onActive)
    window.addEventListener('online', onActive)
    return () => {
      document.removeEventListener('visibilitychange', onActive)
      window.removeEventListener('focus', onActive)
      window.removeEventListener('pageshow', onActive)
      window.removeEventListener('online', onActive)
    }
  }, [userId, reconcile])

  // Debounced push of ongoing local edits to the cloud.
  const firstRunRef = useRef(true)
  useEffect(() => {
    if (!supabase || !userId) return
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    if (suppressPushRef.current) {
      suppressPushRef.current = false
      return
    }
    const timer = setTimeout(() => {
      pushToCloud(stateRef.current)
    }, 700)
    return () => clearTimeout(timer)
  }, [state, userId, pushToCloud])

  return {
    counts: state.counts,
    total: totalRemaining(state.counts),
    lastEdited: state.lastEdited,
    syncStatus,
    increment,
    decrement,
    setCount,
    resetAll,
  }
}

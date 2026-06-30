import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Counts, EMPTY_COUNTS, PrayerKey, normalizeCounts, totalRemaining } from '../lib/prayers'
import { StoredState, loadLocal, saveLocal } from '../lib/storage'
import { TABLE, isSupabaseEnabled, supabase } from '../lib/supabase'

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error'

function freshState(): StoredState {
  return loadLocal() ?? { counts: { ...EMPTY_COUNTS }, updatedAt: new Date(0).toISOString() }
}

export interface QazaStore {
  counts: Counts
  total: number
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
  const userId = session?.user.id ?? null

  // Persist every change to localStorage immediately (offline-first).
  useEffect(() => {
    saveLocal(state)
  }, [state])

  const writeCounts = useCallback((next: Counts) => {
    setState({ counts: next, updatedAt: new Date().toISOString() })
  }, [])

  const increment = useCallback((key: PrayerKey) => {
    const cur = stateRef.current.counts
    writeCounts({ ...cur, [key]: (cur[key] || 0) + 1 })
  }, [writeCounts])

  const decrement = useCallback((key: PrayerKey) => {
    const cur = stateRef.current.counts
    writeCounts({ ...cur, [key]: Math.max(0, (cur[key] || 0) - 1) })
  }, [writeCounts])

  const setCount = useCallback((key: PrayerKey, value: number) => {
    const cur = stateRef.current.counts
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    writeCounts({ ...cur, [key]: safe })
  }, [writeCounts])

  const resetAll = useCallback(() => {
    writeCounts({ ...EMPTY_COUNTS })
  }, [writeCounts])

  const pushToCloud = useCallback(async (snapshot: StoredState) => {
    if (!supabase || !userId) return
    setSyncStatus('syncing')
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, counts: snapshot.counts, updated_at: snapshot.updatedAt })
    setSyncStatus(error ? 'error' : 'synced')
  }, [userId])

  // Reconcile with the cloud whenever the signed-in user changes.
  useEffect(() => {
    if (!supabase || !userId) {
      if (isSupabaseEnabled) setSyncStatus('idle')
      return
    }

    let cancelled = false
    ;(async () => {
      setSyncStatus('syncing')
      const { data, error } = await supabase!
        .from(TABLE)
        .select('counts, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return
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
          setState({ counts: normalizeCounts(data.counts), updatedAt: cloudUpdatedAt })
          setSyncStatus('synced')
          return
        }
      }
      // No cloud row yet, or local is newer/equal — local wins, push it up.
      await pushToCloud(local)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
    syncStatus,
    increment,
    decrement,
    setCount,
    resetAll,
  }
}

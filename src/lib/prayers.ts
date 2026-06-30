export type PrayerKey = 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'witr'

export interface Prayer {
  key: PrayerKey
  name: string
  arabic: string
  /** Approximate time of day, shown as a subtle hint on the card. */
  time: string
}

export const PRAYERS: Prayer[] = [
  { key: 'fajr', name: 'Fajr', arabic: 'الفجر', time: 'Dawn' },
  { key: 'zuhr', name: 'Zuhr', arabic: 'الظهر', time: 'Midday' },
  { key: 'asr', name: 'Asr', arabic: 'العصر', time: 'Afternoon' },
  { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب', time: 'Sunset' },
  { key: 'isha', name: 'Isha', arabic: 'العشاء', time: 'Night' },
  { key: 'witr', name: 'Witr', arabic: 'الوتر', time: 'After Isha' },
]

export type Counts = Record<PrayerKey, number>

export const EMPTY_COUNTS: Counts = {
  fajr: 0,
  zuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
  witr: 0,
}

/** Coerce arbitrary stored/remote data into a valid Counts object. */
export function normalizeCounts(input: unknown): Counts {
  const result: Counts = { ...EMPTY_COUNTS }
  if (input && typeof input === 'object') {
    for (const prayer of PRAYERS) {
      const value = (input as Record<string, unknown>)[prayer.key]
      const num = typeof value === 'number' ? value : Number(value)
      if (Number.isFinite(num) && num >= 0) {
        result[prayer.key] = Math.floor(num)
      }
    }
  }
  return result
}

export function totalRemaining(counts: Counts): number {
  return PRAYERS.reduce((sum, p) => sum + (counts[p.key] || 0), 0)
}

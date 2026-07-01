import { useState } from 'react'
import { PRAYERS } from './lib/prayers'
import { useAuth } from './hooks/useAuth'
import { useQaza } from './hooks/useQaza'
import PrayerCard from './components/PrayerCard'
import AuthBar from './components/AuthBar'

export default function App() {
  const { session } = useAuth()
  const { counts, total, lastEdited, syncStatus, increment, decrement, setCount, resetAll } =
    useQaza(session)
  const [confirmingReset, setConfirmingReset] = useState(false)

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__moon" aria-hidden="true">
            ☾
          </span>
          <h1 className="topbar__title">Qaza Namaz Tracker</h1>
        </div>
        <AuthBar session={session} syncStatus={syncStatus} />
      </header>

      <main className="content">
        <section className="summary">
          <p className="summary__label">Total qaza remaining</p>
          <p className="summary__value">{total}</p>
          <p className="summary__hint">
            Tap <strong>+</strong> when you miss a prayer · tap <strong>−</strong> when you make
            one up · tap the number to set it directly.
          </p>
        </section>

        <section className="grid">
          {PRAYERS.map((prayer) => (
            <PrayerCard
              key={prayer.key}
              prayer={prayer}
              count={counts[prayer.key]}
              lastEditedAt={prayer.key === 'zuhr' ? lastEdited.zuhr : undefined}
              onIncrement={() => increment(prayer.key)}
              onDecrement={() => decrement(prayer.key)}
              onSet={(value) => setCount(prayer.key, value)}
            />
          ))}
        </section>

        <footer className="footer">
          {confirmingReset ? (
            <span className="footer__confirm">
              Reset all counts to zero?
              <button
                type="button"
                className="linkbtn linkbtn--danger"
                onClick={() => {
                  resetAll()
                  setConfirmingReset(false)
                }}
              >
                Yes, reset
              </button>
              <button
                type="button"
                className="linkbtn"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="linkbtn"
              onClick={() => setConfirmingReset(true)}
            >
              Reset all
            </button>
          )}
        </footer>
      </main>
    </div>
  )
}

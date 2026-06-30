import { useEffect, useRef, useState } from 'react'
import type { Prayer } from '../lib/prayers'

interface PrayerCardProps {
  prayer: Prayer
  count: number
  onIncrement: () => void
  onDecrement: () => void
  onSet: (value: number) => void
}

export default function PrayerCard({
  prayer,
  count,
  onIncrement,
  onDecrement,
  onSet,
}: PrayerCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(count))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEdit() {
    setDraft(String(count))
    setEditing(true)
  }

  function commit() {
    const parsed = parseInt(draft, 10)
    onSet(Number.isFinite(parsed) ? parsed : 0)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  const cleared = count === 0

  return (
    <article className={`card${cleared ? ' card--cleared' : ''}`}>
      <header className="card__head">
        <div className="card__titles">
          <h2 className="card__name">{prayer.name}</h2>
          <span className="card__time">{prayer.time}</span>
        </div>
        <span className="card__arabic" aria-hidden="true">
          {prayer.arabic}
        </span>
      </header>

      <div className="card__counter">
        <button
          type="button"
          className="btn btn--minus"
          onClick={onDecrement}
          disabled={count === 0}
          aria-label={`Mark one ${prayer.name} qaza as completed`}
        >
          &minus;
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="card__count-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') cancel()
            }}
            aria-label={`Set ${prayer.name} qaza count`}
          />
        ) : (
          <button
            type="button"
            className="card__count"
            onClick={startEdit}
            title="Tap to set an exact number"
            aria-label={`${prayer.name} qaza remaining: ${count}. Tap to edit.`}
          >
            {count}
          </button>
        )}

        <button
          type="button"
          className="btn btn--plus"
          onClick={onIncrement}
          aria-label={`Add one missed ${prayer.name}`}
        >
          +
        </button>
      </div>

      <p className="card__label">{cleared ? 'All cleared' : 'qaza remaining'}</p>
    </article>
  )
}

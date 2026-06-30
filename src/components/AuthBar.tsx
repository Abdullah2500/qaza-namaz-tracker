import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { SyncStatus } from '../hooks/useQaza'
import { isValidPhone, normalizePhone, phoneFromSession, phoneToEmail } from '../lib/auth'

interface AuthBarProps {
  session: Session | null
  syncStatus: SyncStatus
}

type Mode = 'login' | 'register'

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: 'On this device only',
  idle: 'Sign in to sync',
  syncing: 'Syncing…',
  synced: 'Synced',
  error: 'Sync error',
}

export default function AuthBar({ session, syncStatus }: AuthBarProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No cloud configured — show a quiet, local-only indicator.
  if (!supabase) {
    return (
      <div className="syncbar">
        <span className="syncdot syncdot--disabled" />
        <span className="syncbar__text">Saved on this device</span>
      </div>
    )
  }

  function resetForm() {
    setPhone('')
    setPassword('')
    setError(null)
    setBusy(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (7–15 digits).')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    setError(null)
    const email = phoneToEmail(phone)

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { phone: normalizePhone(phone) } },
      })
      setBusy(false)
      if (error) {
        setError(
          /already registered/i.test(error.message)
            ? 'That phone number is already registered — try logging in.'
            : error.message,
        )
        return
      }
      if (!data.session) {
        setError('Account made, but auto sign-in failed. Disable “Confirm email” in Supabase Auth settings, then log in.')
        return
      }
      setOpen(false)
      resetForm()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) {
        setError(
          /invalid login credentials/i.test(error.message)
            ? 'Wrong phone number or password.'
            : error.message,
        )
        return
      }
      setOpen(false)
      resetForm()
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setOpen(false)
    resetForm()
  }

  const statusClass =
    syncStatus === 'error'
      ? 'syncdot--error'
      : syncStatus === 'syncing'
        ? 'syncdot--syncing'
        : session
          ? 'syncdot--ok'
          : 'syncdot--idle'

  return (
    <div className="syncbar">
      <button
        type="button"
        className="syncbar__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`syncdot ${statusClass}`} />
        <span className="syncbar__text">
          {session ? STATUS_LABEL[syncStatus] : 'Sign in to sync'}
        </span>
      </button>

      {open && (
        <div className="authpanel">
          {session ? (
            <>
              <p className="authpanel__who">
                Signed in as<br />
                <strong>{phoneFromSession(session.user.user_metadata, session.user.email)}</strong>
              </p>
              <button type="button" className="authpanel__btn" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="authtabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={`authtab${mode === 'login' ? ' authtab--active' : ''}`}
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  className={`authtab${mode === 'register' ? ' authtab--active' : ''}`}
                  onClick={() => {
                    setMode('register')
                    setError(null)
                  }}
                >
                  Register
                </button>
              </div>

              <form onSubmit={submit} className="authpanel__form">
                <input
                  className="authpanel__input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  required
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="authpanel__input"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className="authpanel__btn" disabled={busy}>
                  {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
                </button>
                {error && <p className="authpanel__error">{error}</p>}
              </form>
              <p className="authpanel__hint">
                Use the same phone number format each time so it matches across devices.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

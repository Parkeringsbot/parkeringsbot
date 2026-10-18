'use client'

import React, { useEffect, useState } from 'react'
import { getSupabase, updatePassword, friendlyError } from '@/lib/supabase'
import { Field, ErrorText, Notice } from '../ui'

/* Lenken i «glemt passord»-e-posten åpner denne siden. Supabase logger
   brukeren inn midlertidig fra lenken, og så kan et nytt passord settes. */
export default function ResetPassword() {
  const [ready, setReady] = useState<'venter' | 'klar' | 'ugyldig'>('venter')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady('klar')
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady('klar')
      else setTimeout(() => setReady((r) => (r === 'venter' ? 'ugyldig' : r)), 2500)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 8) return setError('Passordet må ha minst 8 tegn.')
    if (pass !== pass2) return setError('Passordene er ikke like.')
    setBusy(true); setError('')
    const { error } = await updatePassword(pass)
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    setDone(true)
  }

  return (
    <main className="auth">
      <div className="auth-logo" aria-hidden="true">P</div>
      <h1>Nytt passord</h1>
      <div className="auth-card">
        {ready === 'venter' && <p role="status">Sjekker lenken …</p>}
        {ready === 'ugyldig' && (
          <>
            <ErrorText message="Lenken er ugyldig eller utløpt. Be om en ny fra innloggingssiden." />
            <a className="btn btn-primary btn-block" href="/">Til innlogging</a>
          </>
        )}
        {ready === 'klar' && (done ? (
          <>
            <Notice message="Passordet er endret. Du er logget inn." />
            <a className="btn btn-primary btn-block" href="/">Gå til Parkeringsbot</a>
          </>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
            <Field label="Nytt passord (minst 8 tegn)" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <Field label="Gjenta passord" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
            <ErrorText message={error} />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Lagrer …' : 'Lagre nytt passord'}</button>
          </form>
        ))}
      </div>
    </main>
  )
}

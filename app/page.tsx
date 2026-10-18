'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  signIn, signUp, signOut, getCurrentUser, getProfile, getVehicles, getFines, addVehicle, removeVehicle,
  updateProfile, updatePassword, sendPasswordReset, deleteOwnAccount, lookupVehicleInfo,
  isSupabaseConfigured, formatPlate, isValidPlate, friendlyError,
  type Fine, type FineStatus, type Profile, type Vehicle, type VehicleInfo,
} from '@/lib/supabase'
import { Icon, Field, ErrorText, Notice, ThemePicker, STATUS_LABEL, STATUS_ICON, fmtDate, todayIso, kr } from './ui'

type Screen = 'loading' | 'login' | 'register' | 'forgot' | 'dash'
type Tab = 'hjem' | 'boter' | 'profil'

const NOT_CONFIGURED = 'Nettsiden er ikke koblet til databasen.'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [tab, setTab] = useState<Tab>('hjem')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fines, setFines] = useState<Fine[]>([])
  const [flash, setFlash] = useState('')

  const loadUserData = useCallback(async (id: string, mail: string) => {
    const [p, v, f] = await Promise.all([getProfile(id), getVehicles(id), getFines()])
    setUserId(id); setEmail(mail); setProfile(p); setVehicles(v); setFines(f)
    setScreen('dash')
  }, [])

  // Behold innloggingen når siden lastes på nytt
  useEffect(() => {
    if (!isSupabaseConfigured()) { setScreen('login'); return }
    getCurrentUser()
      .then((u) => (u ? loadUserData(u.id, u.email || '') : setScreen('login')))
      .catch(() => setScreen('login'))
  }, [loadUserData])

  function loggedOut(message = '') {
    setUserId(''); setEmail(''); setProfile(null); setVehicles([]); setFines([])
    setFlash(message); setTab('hjem'); setScreen('login')
  }

  if (screen === 'loading') {
    return <div className="auth" role="status"><p className="lead">Laster …</p></div>
  }
  if (screen === 'login') {
    return <LoginScreen flash={flash} onDone={loadUserData} onRegister={() => { setFlash(''); setScreen('register') }} onForgot={() => { setFlash(''); setScreen('forgot') }} />
  }
  if (screen === 'register') {
    return <RegisterScreen onDone={loadUserData} onBack={() => setScreen('login')}
      onNeedsConfirm={(msg) => { setFlash(msg); setScreen('login') }} />
  }
  if (screen === 'forgot') {
    return <ForgotScreen onBack={() => setScreen('login')} />
  }

  return (
    <div className="app">
      <a href="#innhold" className="skip-link">Hopp til innhold</a>
      <main id="innhold">
        {tab === 'hjem' && <HomeTab name={profile?.full_name || email.split('@')[0]} fines={fines} onShowFines={() => setTab('boter')} />}
        {tab === 'boter' && <FinesTab fines={fines} />}
        {tab === 'profil' && (
          <ProfileTab
            userId={userId} email={email} profile={profile} vehicles={vehicles} fines={fines}
            onProfileChange={setProfile}
            onVehiclesChange={async () => { setVehicles(await getVehicles(userId)); setFines(await getFines()) }}
            onLoggedOut={loggedOut}
          />
        )}
      </main>
      <nav className="tabbar" aria-label="Hovedmeny">
        {([['hjem', 'home', 'Hjem'], ['boter', 'ticket', 'Bøter'], ['profil', 'user', 'Profil']] as const).map(([t, icon, label]) => (
          <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => { setTab(t); window.scrollTo(0, 0) }}>
            <Icon name={icon} size={24} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

/* ════════════════════ Innlogging ════════════════════ */
function AuthShell({ title, lead, children, footer }: { title: string; lead?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-logo" aria-hidden="true">P</div>
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      <div className="auth-card">{children}</div>
      {footer && <div className="auth-switch">{footer}</div>}
    </main>
  )
}

function LoginScreen({ flash, onDone, onRegister, onForgot }: {
  flash: string; onDone: (id: string, email: string) => Promise<void>; onRegister: () => void; onForgot: () => void
}) {
  const [mail, setMail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) return setError(NOT_CONFIGURED)
    if (!mail || !pass) return setError('Skriv inn e-post og passord.')
    setBusy(true); setError('')
    try {
      const { data, error } = await signIn(mail.trim(), pass)
      if (error || !data.user) return setError(friendlyError(error?.message, 'Feil e-post eller passord.'))
      await onDone(data.user.id, data.user.email || '')
    } catch {
      setError('Kunne ikke koble til. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Parkeringsbot" lead="Håndter parkeringsbøtene dine enkelt og digitalt"
      footer={<>Har du ikke konto? <button type="button" className="link-on-navy" onClick={onRegister}>Opprett konto gratis</button></>}>
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <Notice message={flash} />
        <Field label="E-post" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="din@epost.no" required />
        <Field label="Passord" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        <ErrorText message={error} />
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Logger inn …' : 'Logg inn'}</button>
        <button type="button" className="btn btn-quiet" onClick={onForgot}>Glemt passord?</button>
        <p className="fine-print">Ved å logge inn godtar du <a href="/personvern">personvernerklæringen</a>.</p>
      </form>
    </AuthShell>
  )
}

function RegisterScreen({ onDone, onBack, onNeedsConfirm }: {
  onDone: (id: string, email: string) => Promise<void>; onBack: () => void; onNeedsConfirm: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [mail, setMail] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) return setError(NOT_CONFIGURED)
    if (!name.trim() || !mail.trim() || !plate.trim() || !pass) return setError('Fyll ut navn, e-post, registreringsnummer og passord.')
    if (!isValidPlate(plate)) return setError('Ugyldig registreringsnummer. Skriv det som på skiltet, for eksempel AB 12345.')
    if (pass.length < 8) return setError('Passordet må ha minst 8 tegn.')
    setBusy(true); setError('')
    try {
      const { data, error } = await signUp(mail.trim(), pass, name.trim(), phone.trim(), plate)
      if (error) return setError(friendlyError(error.message))
      if (data.session && data.user) await onDone(data.user.id, data.user.email || '')
      else onNeedsConfirm('Kontoen er opprettet. Vi har sendt deg en e-post – trykk på lenken for å bekrefte adressen, og logg så inn.')
    } catch {
      setError('Kunne ikke koble til. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Opprett konto" lead="Kom i gang på under ett minutt"
      footer={<>Har du konto? <button type="button" className="link-on-navy" onClick={onBack}>Logg inn</button></>}>
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <Field label="Fullt navn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="E-post" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} required />
        <Field label="Telefon" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Valgfritt" />
        <Field label="Registreringsnummer" autoCapitalize="characters" autoComplete="off" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AB 12345" required />
        <Field label="Passord" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} hint="Minst 8 tegn" required />
        <ErrorText message={error} />
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Oppretter …' : 'Opprett konto'}</button>
        <p className="fine-print">Ved registrering godtar du <a href="/personvern">personvernerklæringen</a>.</p>
      </form>
    </AuthShell>
  )
}

function ForgotScreen({ onBack }: { onBack: () => void }) {
  const [mail, setMail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!mail.trim()) return setError('Skriv inn e-postadressen din.')
    setBusy(true); setError('')
    const { error } = await sendPasswordReset(mail.trim())
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    setSent(true)
  }

  return (
    <AuthShell title="Glemt passord" lead="Vi sender deg en lenke for å lage nytt passord"
      footer={<button type="button" className="link-on-navy" onClick={onBack}>Tilbake til innlogging</button>}>
      {sent ? (
        <Notice message={`Hvis det finnes en konto for ${mail.trim()}, har vi sendt en e-post med lenke. Sjekk også søppelpost.`} />
      ) : (
        <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
          <Field label="E-post" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} required />
          <ErrorText message={error} />
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Sender …' : 'Send lenke'}</button>
        </form>
      )}
    </AuthShell>
  )
}

/* ════════════════════ Hjem ════════════════════ */
function HomeTab({ name, fines, onShowFines }: { name: string; fines: Fine[]; onShowFines: () => void }) {
  const unpaid = fines.filter((f) => f.status === 'ubetalt')
  const total = unpaid.reduce((s, f) => s + f.amount, 0)
  const countText = unpaid.length === 1 ? '1 ubetalt bot' : `${unpaid.length} ubetalte bøter`
  return (
    <>
      <header className="hero">
        <p className="muted">God dag,</p>
        <h1>{name}</h1>
        <section className="summary" aria-label="Utestående bøter">
          <div>
            <p style={{ fontSize: '0.875rem' }}>Utestående bøter</p>
            <p className="amount">{kr(total)}</p>
            <p style={{ fontSize: '0.875rem' }}>{countText}</p>
          </div>
          <button type="button" className="btn-on-blue" onClick={onShowFines}>Se bøtene</button>
        </section>
      </header>
      <section className="section" aria-labelledby="mine-boter">
        <h2 id="mine-boter" className="section-title">Mine bøter</h2>
        <FineList fines={fines} />
      </section>
    </>
  )
}

/* ════════════════════ Bøter ════════════════════ */
function FinesTab({ fines }: { fines: Fine[] }) {
  const [filter, setFilter] = useState<FineStatus | 'alle'>('alle')
  const shown = filter === 'alle' ? fines : fines.filter((f) => f.status === filter)
  const count = (s: FineStatus) => fines.filter((f) => f.status === s).length
  const chips: [FineStatus | 'alle', string][] = [
    ['alle', `Alle (${fines.length})`], ['ubetalt', `Ubetalt (${count('ubetalt')})`],
    ['pending', `Under behandling (${count('pending')})`], ['betalt', `Betalt (${count('betalt')})`],
  ]
  return (
    <>
      <header className="hero">
        <h1>Mine bøter</h1>
        <div className="chips" role="group" aria-label="Filtrer bøter">
          {chips.map(([key, label]) => (
            <button key={key} type="button" className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </header>
      <section className="section" aria-live="polite">
        <FineList fines={shown} detailed emptyText={fines.length ? 'Ingen bøter med dette filteret.' : undefined} />
      </section>
    </>
  )
}

function FineList({ fines, detailed = false, emptyText }: { fines: Fine[]; detailed?: boolean; emptyText?: string }) {
  if (fines.length === 0) {
    return (
      <div className="card empty">
        <p>{emptyText || 'Du har ingen registrerte bøter.'}</p>
        {!emptyText && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Bøter på skiltene dine dukker opp her automatisk.</p>}
      </div>
    )
  }
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {fines.map((f) => <li key={f.id}><FineCard fine={f} detailed={detailed} /></li>)}
    </ul>
  )
}

function FineCard({ fine, detailed }: { fine: Fine; detailed: boolean }) {
  const s = fine.status
  const overdue = s === 'ubetalt' && fine.deadline && fine.deadline < todayIso()
  return (
    <article className="card fine" aria-label={`${STATUS_LABEL[s]}, ${fine.amount} kroner, ${fine.location || 'ukjent sted'}`}>
      <div className={`fine-icon s-${s} s-${s}-bg`}><Icon name={STATUS_ICON[s]} size={22} /></div>
      <div className="fine-main">
        <p className="fine-plate">{formatPlate(fine.plate)}</p>
        <p className="fine-meta">{[fine.location, fine.area].filter(Boolean).join(', ') || 'Ukjent sted'}</p>
        {fine.issue_date && <p className="fine-meta">{fmtDate(fine.issue_date)}</p>}
      </div>
      <div className="fine-side">
        <p className={`fine-amount s-${s}`}>{kr(fine.amount)}</p>
        <span className={`badge s-${s} s-${s}-bg`}>{STATUS_LABEL[s]}</span>
      </div>
      {detailed && (
        <div className="fine-extra">
          <span>Frist: <strong className={overdue ? 's-ubetalt' : undefined}>
            {s === 'betalt' ? 'Betalt' : s === 'pending' ? 'Under behandling' : fine.deadline ? `${fmtDate(fine.deadline)}${overdue ? ' (passert)' : ''}` : 'Ikke satt'}
          </strong></span>
          {fine.reference && <span>Referanse: <strong>{fine.reference}</strong></span>}
          {s !== 'betalt' && <span>Betaling i appen kommer snart.</span>}
        </div>
      )}
    </article>
  )
}

/* ════════════════════ Profil ════════════════════ */
function ProfileTab({ userId, email, profile, vehicles, fines, onProfileChange, onVehiclesChange, onLoggedOut }: {
  userId: string; email: string; profile: Profile | null; vehicles: Vehicle[]; fines: Fine[]
  onProfileChange: (p: Profile) => void; onVehiclesChange: () => Promise<void>; onLoggedOut: (msg?: string) => void
}) {
  const name = profile?.full_name || email.split('@')[0]
  const totalPaid = fines.filter((f) => f.status === 'betalt').reduce((s, f) => s + f.amount, 0)
  return (
    <>
      <header className="hero" style={{ textAlign: 'center' }}>
        <div className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <h1>{name}</h1>
        <p className="muted">{email}</p>
        {profile && profile.role !== 'privat' && (
          <p className="muted" style={{ marginTop: '0.25rem' }}>Konto: {profile.role === 'admin' ? 'Administrator' : 'Bedrift'}</p>
        )}
      </header>

      <div className="section">
        <div className="stats">
          <div className="card stat"><p className="value">{fines.length}</p><p className="label">Bøter totalt</p></div>
          <div className="card stat"><p className="value">{kr(totalPaid)}</p><p className="label">Betalt totalt</p></div>
        </div>
      </div>

      <VehicleSection userId={userId} vehicles={vehicles} onChange={onVehiclesChange} />
      <ContactSection userId={userId} email={email} profile={profile} onSaved={onProfileChange} />
      <SettingsSection userId={userId} profile={profile} onSaved={onProfileChange} />
      {profile?.role === 'admin' && (
        <div className="section">
          <a className="btn btn-secondary btn-block" href="/admin"><Icon name="shield" /> Åpne admin</a>
        </div>
      )}
      <SecuritySection onLoggedOut={onLoggedOut} />
      <div className="section"><a href="/personvern" className="btn btn-quiet">Personvernerklæring</a></div>
    </>
  )
}

function VehicleSection({ userId, vehicles, onChange }: { userId: string; vehicles: Vehicle[]; onChange: () => Promise<void> }) {
  const [newPlate, setNewPlate] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<VehicleInfo | null>(null)
  const [infoState, setInfoState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [infoError, setInfoError] = useState('')
  const firstPlate = vehicles[0]?.plate || ''

  useEffect(() => {
    if (!firstPlate) { setInfo(null); setInfoState('idle'); return }
    let cancelled = false
    setInfoState('loading')
    lookupVehicleInfo(firstPlate).then((res) => {
      if (cancelled) return
      if (res.vehicle) { setInfo(res.vehicle); setInfoState('done') }
      else { setInfo(null); setInfoError(res.error || 'Kunne ikke hente kjøretøyinfo.'); setInfoState('error') }
    })
    return () => { cancelled = true }
  }, [firstPlate])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPlate(newPlate)) return setError('Ugyldig registreringsnummer.')
    setBusy(true); setError('')
    const { error } = await addVehicle(userId, newPlate)
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    setNewPlate('')
    await onChange()
  }

  async function remove(v: Vehicle) {
    if (!window.confirm(`Fjerne ${formatPlate(v.plate)} fra kontoen? Bøter på dette skiltet vises da ikke lenger.`)) return
    const { error } = await removeVehicle(v.id)
    if (error) return setError(friendlyError(error.message))
    await onChange()
  }

  const overdue = info?.nextInspection && info.nextInspection < todayIso()
  const infoRows: [string, string, string, string?][] = info ? ([
    ['tag', 'Merke og modell', [info.make, info.model].filter(Boolean).join(' ')],
    ['info', 'Type', info.vehicleType || ''],
    ['palette', 'Farge', info.color || ''],
    ['fuel', 'Drivstoff', info.fuel || ''],
    ['calendar', 'Først registrert', fmtDate(info.firstRegistered)],
    [overdue ? 'warning' : 'check', overdue ? 'EU-kontroll (fristen er passert)' : 'Neste EU-kontroll', fmtDate(info.nextInspection), overdue ? 's-ubetalt' : undefined],
    ['doc', 'Status', info.registrationStatus || ''],
  ] as [string, string, string, string?][]).filter(([, , v]) => v) : []

  return (
    <section className="section" aria-labelledby="kjoretoy">
      <h2 id="kjoretoy" className="section-title">Kjøretøy</h2>
      <div className="card list">
        {vehicles.length === 0 && <p className="list-row" style={{ color: 'var(--sub)' }}>Ingen kjøretøy lagt til ennå.</p>}
        {vehicles.map((v) => (
          <div key={v.id} className="list-row">
            <span className="row-icon"><Icon name="car" size={18} /></span>
            <span className="grow" style={{ fontWeight: 600 }}>{formatPlate(v.plate)}</span>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => remove(v)} aria-label={`Fjern ${formatPlate(v.plate)}`}>
              <Icon name="trash" size={18} /> Fjern
            </button>
          </div>
        ))}
        {infoState === 'loading' && <p className="list-row" role="status" style={{ color: 'var(--sub)' }}>Henter info fra Statens vegvesen …</p>}
        {infoState === 'error' && <div className="list-row"><ErrorText message={infoError} /></div>}
        {infoRows.map(([icon, label, value, cls]) => (
          <div key={label} className="list-row">
            <span className={`row-icon ${cls || ''}`}><Icon name={icon} size={18} /></span>
            <span className={`grow ${cls || ''}`}>{label}</span>
            <span className={`value ${cls || ''}`}>{value}</span>
          </div>
        ))}
        <form onSubmit={add} className="list-row" noValidate>
          <div className="grow"><Field label="Legg til kjøretøy" autoCapitalize="characters" autoComplete="off" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} placeholder="AB 12345" /></div>
          <button className="btn btn-secondary btn-small" type="submit" disabled={busy} style={{ alignSelf: 'flex-end' }}><Icon name="plus" size={18} /> Legg til</button>
          {error && <div style={{ flexBasis: '100%' }}><ErrorText message={error} /></div>}
        </form>
      </div>
      {info && <p className="source">Kilde: Statens vegvesen ({formatPlate(firstPlate)})</p>}
    </section>
  )
}

function ContactSection({ userId, email, profile, onSaved }: { userId: string; email: string; profile: Profile | null; onSaved: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Navn kan ikke være tomt.')
    setBusy(true); setError('')
    const { error } = await updateProfile(userId, { full_name: name.trim(), phone: phone.trim() || null })
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    if (profile) onSaved({ ...profile, full_name: name.trim(), phone: phone.trim() || null })
    setEditing(false); setSaved('Kontaktinfo lagret.')
  }

  return (
    <section className="section" aria-labelledby="kontakt">
      <h2 id="kontakt" className="section-title">Kontaktinfo</h2>
      <div className="card">
        {!editing ? (
          <div className="list">
            <div className="list-row"><span className="row-icon"><Icon name="user" size={18} /></span><span className="grow">Navn</span><span className="value">{profile?.full_name || '–'}</span></div>
            <div className="list-row"><span className="row-icon"><Icon name="mail" size={18} /></span><span className="grow">E-post</span><span className="value">{email}</span></div>
            <div className="list-row"><span className="row-icon"><Icon name="phone" size={18} /></span><span className="grow">Telefon</span><span className="value">{profile?.phone || 'Ikke oppgitt'}</span></div>
            <div className="list-row">
              <Notice message={saved} />
              <button type="button" className="btn btn-secondary btn-small" onClick={() => { setSaved(''); setName(profile?.full_name || ''); setPhone(profile?.phone || ''); setEditing(true) }}>Endre</button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="card-pad" noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <Field label="Navn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Telefon" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Valgfritt" />
            <p className="hint" style={{ fontSize: '0.875rem', color: 'var(--sub)' }}>E-postadressen ({email}) kan ikke endres her.</p>
            <ErrorText message={error} />
            <div className="row">
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Lagrer …' : 'Lagre'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>Avbryt</button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

function SettingsSection({ userId, profile, onSaved }: { userId: string; profile: Profile | null; onSaved: (p: Profile) => void }) {
  const [error, setError] = useState('')
  const notify = profile?.notify_email ?? true

  async function toggleNotify(value: boolean) {
    setError('')
    const { error } = await updateProfile(userId, { notify_email: value })
    if (error) return setError(friendlyError(error.message))
    if (profile) onSaved({ ...profile, notify_email: value })
  }

  return (
    <section className="section" aria-labelledby="innstillinger">
      <h2 id="innstillinger" className="section-title">Innstillinger</h2>
      <div className="card list">
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><span className="row-icon"><Icon name="half" size={18} /></span>Utseende</span>
          <ThemePicker />
        </div>
        <div className="list-row">
          <span className="row-icon"><Icon name="bell" size={18} /></span>
          <label htmlFor="varsler" className="grow">
            E-postvarsel ved nye bøter
            <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--sub)' }}>Vi sender en e-post når en bot registreres på skiltet ditt.</span>
          </label>
          <span className="switch">
            <input id="varsler" type="checkbox" role="switch" checked={notify} onChange={(e) => toggleNotify(e.target.checked)} />
            <span className="track" aria-hidden="true" />
          </span>
        </div>
        {error && <div className="list-row"><ErrorText message={error} /></div>}
      </div>
    </section>
  )
}

function SecuritySection({ onLoggedOut }: { onLoggedOut: (msg?: string) => void }) {
  const [changing, setChanging] = useState(false)
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 8) return setError('Passordet må ha minst 8 tegn.')
    setBusy(true); setError('')
    const { error } = await updatePassword(pass)
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    setPass(''); setChanging(false); setNotice('Passordet er endret.')
  }

  async function logout(everywhere: boolean) {
    try { await signOut(everywhere) } catch {}
    onLoggedOut(everywhere ? 'Du er logget ut fra alle enheter.' : '')
  }

  async function confirmDelete() {
    if (confirmText.trim().toUpperCase() !== 'SLETT') return setDeleteError('Skriv SLETT for å bekrefte.')
    setBusy(true); setDeleteError('')
    const { error } = await deleteOwnAccount()
    setBusy(false)
    if (error) return setDeleteError(friendlyError(error.message, 'Kunne ikke slette kontoen. Prøv igjen.'))
    dialogRef.current?.close()
    onLoggedOut('Kontoen din er slettet.')
  }

  return (
    <section className="section" aria-labelledby="sikkerhet">
      <h2 id="sikkerhet" className="section-title">Konto og sikkerhet</h2>
      <Notice message={notice} />
      <div className="card list">
        {!changing ? (
          <button type="button" className="list-row btn-quiet" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setNotice(''); setChanging(true) }}>
            <span className="row-icon"><Icon name="lock" size={18} /></span><span className="grow">Endre passord</span><Icon name="arrow" size={18} />
          </button>
        ) : (
          <form onSubmit={savePassword} className="card-pad" noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <Field label="Nytt passord" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} hint="Minst 8 tegn" />
            <ErrorText message={error} />
            <div className="row">
              <button className="btn btn-primary" type="submit" disabled={busy}>Lagre passord</button>
              <button className="btn btn-secondary" type="button" onClick={() => setChanging(false)}>Avbryt</button>
            </div>
          </form>
        )}
        <button type="button" className="list-row btn-quiet" style={{ width: '100%', textAlign: 'left' }} onClick={() => logout(false)}>
          <span className="row-icon"><Icon name="logout" size={18} /></span><span className="grow">Logg ut</span>
        </button>
        <button type="button" className="list-row btn-quiet" style={{ width: '100%', textAlign: 'left' }} onClick={() => logout(true)}>
          <span className="row-icon"><Icon name="logout" size={18} /></span>
          <span className="grow">Logg ut fra alle enheter<span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--sub)' }}>Også på telefonen og andre nettlesere</span></span>
        </button>
      </div>
      <button type="button" className="btn btn-danger btn-block" onClick={() => { setConfirmText(''); setDeleteError(''); dialogRef.current?.showModal() }}>
        <Icon name="trash" size={18} /> Slett kontoen min
      </button>

      <dialog ref={dialogRef} aria-labelledby="slett-tittel" aria-describedby="slett-tekst">
        <h2 id="slett-tittel">Slette kontoen?</h2>
        <p id="slett-tekst" style={{ marginBottom: '1rem' }}>
          Profilen, kjøretøyene og innloggingen din slettes for godt. Dette kan ikke angres.
        </p>
        <Field label="Skriv SLETT for å bekrefte" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <div style={{ marginTop: '0.75rem' }}><ErrorText message={deleteError} /></div>
        <div className="row" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Sletter …' : 'Slett for godt'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()}>Avbryt</button>
        </div>
      </dialog>
    </section>
  )
}

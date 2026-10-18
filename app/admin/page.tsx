'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  getCurrentUser, getProfile, getFines, adminCreateFine, adminUpdateFine, adminDeleteFine,
  adminListUsers, adminSetRole, adminNotifyFine, formatPlate, isValidPlate, friendlyError,
  type AdminUser, type Fine, type FineInput, type FineStatus, type Role,
} from '@/lib/supabase'
import { Icon, Field, ErrorText, Notice, STATUS_LABEL, fmtDate, kr } from '../ui'

type Access = 'sjekker' | 'ikke-innlogget' | 'ingen-tilgang' | 'ok'
type Tab = 'boter' | 'brukere'

const EMPTY_FORM = { plate: '', location: '', area: '', amount: '', issue_date: '', deadline: '', status: 'ubetalt' as FineStatus, reference: '' }

export default function Admin() {
  const [access, setAccess] = useState<Access>('sjekker')
  const [myId, setMyId] = useState('')
  const [tab, setTab] = useState<Tab>('boter')

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) return setAccess('ikke-innlogget')
      const p = await getProfile(u.id)
      setMyId(u.id)
      setAccess(p?.role === 'admin' ? 'ok' : 'ingen-tilgang')
    }).catch(() => setAccess('ikke-innlogget'))
  }, [])

  if (access !== 'ok') {
    return (
      <main className="auth">
        <div className="auth-logo" aria-hidden="true">P</div>
        <h1>Admin</h1>
        <div className="auth-card">
          {access === 'sjekker' && <p role="status">Sjekker tilgang …</p>}
          {access === 'ikke-innlogget' && <><p>Du må logge inn først.</p><a className="btn btn-primary btn-block" href="/">Til innlogging</a></>}
          {access === 'ingen-tilgang' && <><ErrorText message="Kontoen din har ikke admin-tilgang." /><a className="btn btn-secondary btn-block" href="/">Tilbake</a></>}
        </div>
      </main>
    )
  }

  return (
    <div className="admin">
      <a href="#innhold" className="skip-link">Hopp til innhold</a>
      <header className="hero">
        <a href="/" className="link-on-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Icon name="back" size={18} /> Til appen</a>
        <h1 style={{ marginTop: '0.5rem' }}>Admin</h1>
        <nav className="admin-tabs" aria-label="Admin-meny" style={{ padding: '0.75rem 0 0' }}>
          <button type="button" aria-current={tab === 'boter' ? 'page' : undefined} onClick={() => setTab('boter')}>Bøter</button>
          <button type="button" aria-current={tab === 'brukere' ? 'page' : undefined} onClick={() => setTab('brukere')}>Brukere</button>
        </nav>
      </header>
      <main id="innhold">
        {tab === 'boter' ? <FinesAdmin /> : <UsersAdmin myId={myId} />}
      </main>
    </div>
  )
}

/* ════════════════════ Bøter ════════════════════ */
function FinesAdmin() {
  const [fines, setFines] = useState<Fine[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  const reload = useCallback(async () => setFines(await getFines()), [])
  useEffect(() => { reload() }, [reload])

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setNotice('')
    const amount = Number(form.amount)
    if (!isValidPlate(form.plate)) return setError('Ugyldig registreringsnummer.')
    if (!Number.isInteger(amount) || amount <= 0) return setError('Beløpet må være et helt tall over 0.')
    const input: FineInput = {
      plate: form.plate, amount, status: form.status,
      location: form.location.trim() || null, area: form.area.trim() || null,
      issue_date: form.issue_date || null, deadline: form.deadline || null, reference: form.reference.trim() || null,
    }
    setBusy(true)
    if (editingId) {
      const { error } = await adminUpdateFine(editingId, input)
      setBusy(false)
      if (error) return setError(friendlyError(error.message))
      setNotice('Boten er oppdatert.')
    } else {
      const { data, error } = await adminCreateFine(input)
      if (error || !data) { setBusy(false); return setError(friendlyError(error?.message)) }
      let msg = `Bot registrert på ${formatPlate(form.plate)}.`
      if (notify) msg += ' ' + (await adminNotifyFine(data.id)).message
      setBusy(false)
      setNotice(msg)
    }
    setForm(EMPTY_FORM); setEditingId(null)
    await reload()
  }

  function edit(f: Fine) {
    setEditingId(f.id); setError(''); setNotice('')
    setForm({
      plate: formatPlate(f.plate), location: f.location || '', area: f.area || '', amount: String(f.amount),
      issue_date: f.issue_date || '', deadline: f.deadline || '', status: f.status, reference: f.reference || '',
    })
    document.getElementById('bot-skjema')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function changeStatus(f: Fine, status: FineStatus) {
    const { error } = await adminUpdateFine(f.id, { status })
    if (error) return setError(friendlyError(error.message))
    setNotice(`Status for ${f.reference || formatPlate(f.plate)} endret til «${STATUS_LABEL[status]}».`)
    await reload()
  }

  async function remove(f: Fine) {
    if (!window.confirm(`Slette boten ${f.reference || ''} på ${formatPlate(f.plate)} (${f.amount} kr)?`)) return
    const { error } = await adminDeleteFine(f.id)
    if (error) return setError(friendlyError(error.message))
    setNotice('Boten er slettet.')
    await reload()
  }

  const q = search.trim().toUpperCase().replace(/\s/g, '')
  const shown = q ? fines.filter((f) => f.plate.includes(q) || (f.reference || '').toUpperCase().includes(q)) : fines

  return (
    <>
      <section className="section" aria-labelledby="bot-skjema">
        <h2 id="bot-skjema" className="section-title">{editingId ? 'Rediger bot' : 'Registrer ny bot'}</h2>
        <form onSubmit={submit} className="card card-pad" noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="row">
            <Field label="Registreringsnummer" value={form.plate} onChange={set('plate')} placeholder="AB 12345" autoCapitalize="characters" required />
            <Field label="Beløp (kr)" type="number" inputMode="numeric" min={1} value={form.amount} onChange={set('amount')} required />
          </div>
          <div className="row">
            <Field label="Sted" value={form.location} onChange={set('location')} placeholder="Karl Johans gt." />
            <Field label="Område" value={form.area} onChange={set('area')} placeholder="Sentrum, Oslo" />
          </div>
          <div className="row">
            <Field label="Dato" type="date" value={form.issue_date} onChange={set('issue_date')} />
            <Field label="Frist" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" className="select" value={form.status} onChange={set('status')}>
                {(['ubetalt', 'pending', 'betalt'] as FineStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <Field label="Referanse" value={form.reference} onChange={set('reference')} placeholder="PB-2026-005" hint="Valgfritt, må være unik" />
          </div>
          {!editingId && (
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minHeight: '2.75rem' }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
              Send e-postvarsel til eieren av skiltet
            </label>
          )}
          <ErrorText message={error} />
          <Notice message={notice} />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Lagrer …' : editingId ? 'Lagre endringer' : 'Registrer bot'}</button>
            {editingId && <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM) }}>Avbryt</button>}
          </div>
        </form>
      </section>

      <section className="section" aria-labelledby="alle-boter">
        <h2 id="alle-boter" className="section-title">Alle bøter ({fines.length})</h2>
        <Field label="Søk på skilt eller referanse" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="card table-wrap">
          <table>
            <caption className="visually-hidden">Alle registrerte bøter</caption>
            <thead>
              <tr><th scope="col">Skilt</th><th scope="col">Sted</th><th scope="col">Beløp</th><th scope="col">Dato</th><th scope="col">Status</th><th scope="col">Referanse</th><th scope="col"><span className="visually-hidden">Handlinger</span></th></tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="empty">Ingen bøter.</td></tr>}
              {shown.map((f) => (
                <tr key={f.id}>
                  <th scope="row">{formatPlate(f.plate)}</th>
                  <td>{[f.location, f.area].filter(Boolean).join(', ') || '–'}</td>
                  <td>{kr(f.amount)}</td>
                  <td>{fmtDate(f.issue_date) || '–'}</td>
                  <td>
                    <label className="visually-hidden" htmlFor={`status-${f.id}`}>Status for {formatPlate(f.plate)}</label>
                    <select id={`status-${f.id}`} className="select" value={f.status} onChange={(e) => changeStatus(f, e.target.value as FineStatus)}>
                      {(['ubetalt', 'pending', 'betalt'] as FineStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td>{f.reference || '–'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-quiet btn-small" onClick={() => edit(f)} aria-label={`Rediger bot på ${formatPlate(f.plate)}`}>Rediger</button>
                    <button type="button" className="btn btn-quiet btn-small s-ubetalt" onClick={() => remove(f)} aria-label={`Slett bot på ${formatPlate(f.plate)}`}><Icon name="trash" size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ════════════════════ Brukere ════════════════════ */
const ROLE_LABEL: Record<Role, string> = { privat: 'Privat', bedrift: 'Bedrift', admin: 'Administrator' }

function UsersAdmin({ myId }: { myId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const reload = useCallback(async () => {
    const res = await adminListUsers()
    setUsers(res.users); if (res.error) setError(res.error)
  }, [])
  useEffect(() => { reload() }, [reload])

  async function changeRole(u: AdminUser, role: Role) {
    setError(''); setNotice('')
    const { error } = await adminSetRole(u.id, role)
    if (error) return setError(friendlyError(error.message))
    setNotice(`${u.full_name || u.email} er nå ${ROLE_LABEL[role].toLowerCase()}.`)
    await reload()
  }

  return (
    <section className="section" aria-labelledby="brukere">
      <h2 id="brukere" className="section-title">Brukere ({users.length})</h2>
      <ErrorText message={error} />
      <Notice message={notice} />
      <div className="card table-wrap">
        <table>
          <caption className="visually-hidden">Alle brukere</caption>
          <thead><tr><th scope="col">Navn</th><th scope="col">E-post</th><th scope="col">Telefon</th><th scope="col">Skilt</th><th scope="col">Rolle</th><th scope="col">Registrert</th></tr></thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={6} className="empty">Ingen brukere ennå.</td></tr>}
            {users.map((u) => (
              <tr key={u.id}>
                <th scope="row">{u.full_name || '–'}</th>
                <td>{u.email}</td>
                <td>{u.phone || '–'}</td>
                <td>{u.plates ? u.plates.split(', ').map(formatPlate).join(', ') : '–'}</td>
                <td>
                  {u.id === myId ? ROLE_LABEL[u.role] + ' (deg)' : (
                    <>
                      <label className="visually-hidden" htmlFor={`rolle-${u.id}`}>Rolle for {u.full_name || u.email}</label>
                      <select id={`rolle-${u.id}`} className="select" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </>
                  )}
                </td>
                <td>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="source">«Bedrift» er foreløpig bare en merkelapp – egne bedriftsfunksjoner er ikke laget ennå.</p>
    </section>
  )
}

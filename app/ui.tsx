'use client'

import React, { useEffect, useId, useState } from 'react'
import type { FineStatus } from '@/lib/supabase'
import { THEME_KEY } from '@/lib/theme'

/* ── Ikoner (dekorative – skjult for skjermleser) ── */
const PATHS: Record<string, React.ReactNode> = {
  home:     <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  ticket:   <><circle cx="12" cy="12" r="9" /><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" /></>,
  user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  car:      <><path d="M5 17h14v-5l-2-5H7l-2 5z" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /></>,
  tag:      <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  info:     <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  palette:  <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16" cy="10" r="1" /></>,
  fuel:     <><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" /><path d="M7 7h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  check:    <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  warning:  <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.01" /></>,
  doc:      <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  mail:     <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone:    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  lock:     <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  logout:   <><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" /></>,
  trash:    <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  plus:     <path d="M12 5v14M5 12h14" />,
  half:     <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>,
  shield:   <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  alert:    <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.01" /></>,
  ok:       <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  arrow:    <path d="M9 6l6 6-6 6" />,
  back:     <path d="M15 6l-6 6 6 6" />,
}

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}

/* ── Status ── */
export const STATUS_LABEL: Record<FineStatus, string> = { ubetalt: 'Ubetalt', pending: 'Under behandling', betalt: 'Betalt' }
export const STATUS_ICON: Record<FineStatus, string> = { ubetalt: 'car', pending: 'doc', betalt: 'check' }

/* ── Skjemafelt med ekte <label> ── */
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Field({ label, hint, id, ...input }: FieldProps) {
  const autoId = useId()
  const fieldId = id || autoId
  const hintId = hint ? `${fieldId}-hint` : undefined
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} className="input" aria-describedby={hintId} {...input} />
      {hint && <span id={hintId} className="hint">{hint}</span>}
    </div>
  )
}

export function ErrorText({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="alert" role="alert">
      <Icon name="alert" size={18} /><span>{message}</span>
    </p>
  )
}

export function Notice({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="notice" role="status">
      <Icon name="ok" size={18} /><span>{message}</span>
    </p>
  )
}

/* ── Utseende: System / Lys / Mørk (huskes i nettleseren) ── */
export type Theme = 'system' | 'lys' | 'mork'

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'lys' || t === 'mork' ? t : 'system'
  } catch { return 'system' }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try { localStorage.setItem(THEME_KEY, theme) } catch {}
}

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>('system')
  useEffect(() => { setTheme(readTheme()) }, [])
  const name = useId()
  const options: [Theme, string][] = [['system', 'System'], ['lys', 'Lys'], ['mork', 'Mørk']]
  return (
    <fieldset style={{ border: 0 }}>
      <legend className="visually-hidden">Utseende</legend>
      <div className="segmented">
        {options.map(([value, label]) => (
          <label key={value}>
            <input type="radio" name={name} value={value} checked={theme === value}
              onChange={() => { setTheme(value); applyTheme(value) }} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/* ── Datoer ── */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function kr(amount: number): string {
  return `${amount.toLocaleString('nb-NO')} kr`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config'

/* ── Lazy client — initialiseres kun i nettleseren, ikke under SSR/build ── */
let _supabase: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase-adresse eller -nøkkel mangler')
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  return _supabase
}

/* ── Registreringsnummer ──
   Lagres normalisert i databasen («AB12345»), vises med mellomrom («AB 12345»). */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatPlate(plate: string): string {
  const p = normalizePlate(plate)
  const m = p.match(/^([A-Z]+)(\d+)$/)
  return m ? `${m[1]} ${m[2]}` : p
}

export function isValidPlate(plate: string): boolean {
  return /^[A-Z0-9]{2,8}$/.test(normalizePlate(plate))
}

/** Gjør Supabase-feil om til norsk tekst brukeren forstår. */
export function friendlyError(message: string | undefined, fallback = 'Noe gikk galt. Prøv igjen.'): string {
  if (!message) return fallback
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Feil e-post eller passord.'
  if (m.includes('email not confirmed')) return 'Du må bekrefte e-postadressen din først. Sjekk innboksen.'
  if (m.includes('user already registered')) return 'Det finnes allerede en konto med denne e-posten.'
  if (m.includes('password should be at least')) return 'Passordet må ha minst 8 tegn.'
  if (m.includes('rate limit') || m.includes('too many')) return 'For mange forsøk. Vent litt og prøv igjen.'
  if (m.includes('duplicate key') && m.includes('vehicles')) return 'Dette kjøretøyet er allerede lagt til.'
  if (m.includes('vehicles_plate_format') || m.includes('fines_plate_format')) return 'Ugyldig registreringsnummer.'
  if (m.includes('fines_reference_unique')) return 'Referansen er allerede brukt på en annen bot.'
  if (m.includes('bare admin')) return 'Du har ikke admin-tilgang.'
  if (m.includes('egen rolle')) return 'Du kan ikke endre din egen rolle.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Ingen kontakt med serveren. Sjekk internettforbindelsen.'
  return fallback
}

/* ── Types (samsvarer med supabase/migrations/002 og 003) ── */
export type Role = 'privat' | 'bedrift' | 'admin'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: Role
  notify_email: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  user_id: string
  plate: string
  nickname: string | null
  created_at: string
}

export type FineStatus = 'ubetalt' | 'pending' | 'betalt'

export interface Fine {
  id: string
  user_id: string | null
  vehicle_id: string | null
  plate: string
  location: string | null
  area: string | null
  amount: number
  issue_date: string | null
  deadline: string | null
  status: FineStatus
  reference: string | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: Role
  plates: string
  created_at: string
}

/* ── Auth ── */
export async function signUp(email: string, password: string, fullName: string, phone: string, licensePlate: string) {
  // Profil og første kjøretøy opprettes av databasen (trigger handle_new_user)
  return getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, license_plate: normalizePlate(licensePlate) },
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })
}

export async function signIn(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password })
}

/** Logger ut bare denne nettleseren, eller alle enheter med `everywhere`. */
export async function signOut(everywhere = false) {
  return getSupabase().auth.signOut({ scope: everywhere ? 'global' : 'local' })
}

export async function getCurrentUser() {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user ?? null
}

export async function sendPasswordReset(email: string) {
  return getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/tilbakestill-passord`,
  })
}

export async function updatePassword(password: string) {
  return getSupabase().auth.updateUser({ password })
}

/** Sletter kontoen for godt (profil og kjøretøy slettes også). */
export async function deleteOwnAccount() {
  const res = await getSupabase().rpc('delete_own_account')
  if (!res.error) await getSupabase().auth.signOut({ scope: 'local' })
  return res
}

/* ── Egen profil og kjøretøy ── */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) { console.error('getProfile', error); return null }
  return data as Profile | null
}

export async function updateProfile(userId: string, fields: { full_name?: string; phone?: string | null; notify_email?: boolean }) {
  return getSupabase().from('profiles').update(fields).eq('id', userId)
}

export async function getVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await getSupabase().from('vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: true })
  if (error) { console.error('getVehicles', error); return [] }
  return (data as Vehicle[]) || []
}

export async function addVehicle(userId: string, plate: string) {
  return getSupabase().from('vehicles').insert({ user_id: userId, plate: normalizePlate(plate) })
}

export async function removeVehicle(vehicleId: string) {
  return getSupabase().from('vehicles').delete().eq('id', vehicleId)
}

/** Alle bøter brukeren har tilgang til (egne + bøter på egne skilt). Filtreres av RLS i databasen. */
export async function getFines(): Promise<Fine[]> {
  const { data, error } = await getSupabase().from('fines').select('*').order('issue_date', { ascending: false, nullsFirst: false })
  if (error) { console.error('getFines', error); return [] }
  return (data as Fine[]) || []
}

/* ── Admin (krever role = 'admin'; sjekkes også i databasen) ── */
export type FineInput = Pick<Fine, 'plate' | 'location' | 'area' | 'amount' | 'issue_date' | 'deadline' | 'status' | 'reference'>

export async function adminCreateFine(input: FineInput) {
  return getSupabase().from('fines').insert({ ...input, plate: normalizePlate(input.plate) }).select('id').single()
}

export async function adminUpdateFine(id: string, input: Partial<FineInput>) {
  const patch = input.plate ? { ...input, plate: normalizePlate(input.plate) } : input
  return getSupabase().from('fines').update(patch).eq('id', id)
}

export async function adminDeleteFine(id: string) {
  return getSupabase().from('fines').delete().eq('id', id)
}

export async function adminListUsers(): Promise<{ users: AdminUser[]; error?: string }> {
  const { data, error } = await getSupabase().rpc('admin_list_users')
  if (error) return { users: [], error: friendlyError(error.message) }
  return { users: (data as AdminUser[]) || [] }
}

export async function adminSetRole(userId: string, role: Role) {
  return getSupabase().rpc('admin_set_role', { p_user_id: userId, p_role: role })
}

/** Sender e-postvarsel om en ny bot til brukere som har skiltet og har varsler på. */
export async function adminNotifyFine(fineId: string): Promise<{ sent: number; message: string }> {
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) return { sent: 0, message: 'Du må være logget inn.' }
  try {
    const res = await fetch('/api/varsler/ny-bot', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fineId }),
    })
    const body = await res.json().catch(() => ({}))
    return { sent: body.sent ?? 0, message: body.message || body.error || 'Ukjent svar fra serveren.' }
  } catch {
    return { sent: 0, message: 'Ingen kontakt med serveren.' }
  }
}

/* ── Kjøretøyinfo fra Statens vegvesen (via vår egen server, /api/kjoretoy) ── */
export interface VehicleInfo {
  plate: string
  make: string | null
  model: string | null
  vehicleType: string | null
  color: string | null
  fuel: string | null
  registrationStatus: string | null
  firstRegistered: string | null
  nextInspection: string | null
  lastInspection: string | null
}

export async function lookupVehicleInfo(plate: string): Promise<{ vehicle?: VehicleInfo; error?: string }> {
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) return { error: 'Du må være logget inn.' }
  try {
    const res = await fetch(`/api/kjoretoy?skilt=${encodeURIComponent(normalizePlate(plate))}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Kunne ikke hente kjøretøyinfo.' }
    return { vehicle: body.vehicle as VehicleInfo }
  } catch {
    return { error: 'Ingen kontakt med serveren. Sjekk internettforbindelsen.' }
  }
}

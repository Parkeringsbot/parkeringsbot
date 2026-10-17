import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config'

/* ── Lazy client — initialiseres kun i nettleseren, ikke under SSR/build ── */
let _supabase: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = SUPABASE_URL
  const key = SUPABASE_KEY
  if (!url || !key) throw new Error('Supabase-adresse eller -nøkkel mangler')
  _supabase = createClient(url, key)
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

/* ── Types (samsvarer med supabase/migrations/002_app_schema.sql) ── */
export interface Profile {
  id: string
  full_name: string
  phone: string | null
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

/* ── Auth ── */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  licensePlate: string
) {
  // Profil og første kjøretøy opprettes av databasen (trigger handle_new_user)
  return getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, license_plate: normalizePlate(licensePlate) },
    },
  })
}

export async function signIn(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return getSupabase().auth.signOut()
}

export async function getCurrentUser() {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user ?? null
}

/* ── Data ── */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) { console.error('getProfile', error); return null }
  return data as Profile | null
}

export async function getVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await getSupabase()
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getVehicles', error); return [] }
  return (data as Vehicle[]) || []
}

/** Alle bøter brukeren har tilgang til (egne + bøter på egne skilt). Filtreres av RLS i databasen. */
export async function getFines(): Promise<Fine[]> {
  const { data, error } = await getSupabase()
    .from('fines')
    .select('*')
    .order('issue_date', { ascending: false, nullsFirst: false })
  if (error) { console.error('getFines', error); return [] }
  return (data as Fine[]) || []
}

export async function addVehicle(userId: string, plate: string) {
  return getSupabase()
    .from('vehicles')
    .insert({ user_id: userId, plate: normalizePlate(plate) })
}

export async function requestAccountDeletion(userId: string, reason?: string) {
  return getSupabase().from('deletion_requests').insert({
    user_id: userId,
    reason: reason || null,
  })
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

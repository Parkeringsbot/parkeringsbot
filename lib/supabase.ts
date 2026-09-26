import { createClient, SupabaseClient } from '@supabase/supabase-js'

/* ── Lazy client — initialiseres kun i nettleseren, ikke under SSR/build ── */
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY
  if (!url || !key) throw new Error('Supabase env vars mangler')
  _supabase = createClient(url, key)
  return _supabase
}

/* ── Types ── */
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

export interface Fine {
  id: string
  user_id: string
  vehicle_id: string | null
  plate: string
  location: string | null
  area: string | null
  amount: number
  issue_date: string | null
  deadline: string | null
  status: 'ubetalt' | 'pending' | 'betalt'
  reference: string | null
  created_at: string
  updated_at: string
}

/* ── Auth ── */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string
) {
  return getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || '' },
    },
  })
}

export async function signIn(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return getSupabase().auth.signOut()
}

/* ── Data ── */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function getVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await getSupabase()
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
  if (error) return []
  return (data as Vehicle[]) || []
}

export async function getFines(userId: string): Promise<Fine[]> {
  const { data, error } = await getSupabase()
    .from('fines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data as Fine[]) || []
}

export async function updateFineStatus(
  fineId: string,
  status: 'ubetalt' | 'pending' | 'betalt'
) {
  return getSupabase()
    .from('fines')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', fineId)
}

export async function requestAccountDeletion(userId: string, reason?: string) {
  return getSupabase().from('deletion_requests').insert({
    user_id: userId,
    reason: reason || null,
  })
}

export async function addVehicle(userId: string, plate: string) {
  return getSupabase()
    .from('vehicles')
    .insert({ user_id: userId, plate: plate.toUpperCase() })
}

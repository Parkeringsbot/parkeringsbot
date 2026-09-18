import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your_supabase') &&
    !supabaseKey.includes('your_supabase'),
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null

export interface ParkingFine {
  id: number
  license_plate: string
  amount: number
  date: string
  time: string
  location: string
  municipality: string
  paid: boolean
  created_at: string
}

export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

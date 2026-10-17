/* ── Supabase-prosjekt «Parkeringsbot» ──
   Publishable-nøkkelen er laget for å være offentlig (den havner uansett i
   nettleserens kode); dataene beskyttes av RLS-reglene i databasen.
   Miljøvariablene overstyrer standardverdiene når de er satt.
   iOS-appen bruker de samme verdiene. */
const DEFAULT_SUPABASE_URL = 'https://jkvlbkjodxthdcwthszp.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_nqBF2pnFImo84VHeX4aEZA_sCYqDwmN'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || DEFAULT_SUPABASE_KEY

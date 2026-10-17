import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase-config'
import { lookupVehicle, hasVegvesenKey, normalizePlate, VegvesenError } from '@/lib/vegvesen'

export const dynamic = 'force-dynamic'

/**
 * GET /api/kjoretoy?skilt=AB12345
 * Header: Authorization: Bearer <Supabase access token>
 *
 * Brukes av både nettsiden og iOS-appen, slik at Vegvesen-nøkkelen bare
 * ligger på serveren. Bare innloggede brukere kan slå opp.
 *
 * GET /api/kjoretoy?status=1 svarer om nøkkelen er satt (uten å vise den).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)

  if (url.searchParams.has('status')) {
    return json({ vegvesenKey: hasVegvesenKey() })
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Du må være logget inn.' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData.user) return json({ error: 'Innloggingen er utløpt. Logg inn på nytt.' }, 401)

  const plate = normalizePlate(url.searchParams.get('skilt') ?? '')
  if (!/^[A-Z0-9]{2,8}$/.test(plate)) return json({ error: 'Ugyldig registreringsnummer.' }, 400)

  try {
    const vehicle = await lookupVehicle(plate)
    return json({ vehicle })
  } catch (e) {
    if (e instanceof VegvesenError) {
      const map: Record<VegvesenError['code'], [number, string]> = {
        missing_key:  [503, 'Kjøretøyoppslag er ikke satt opp på serveren ennå.'],
        not_found:    [404, 'Fant ikke kjøretøyet. Sjekk at registreringsnummeret er riktig.'],
        unauthorized: [502, 'Statens vegvesen avviste tilgangen.'],
        rate_limited: [429, 'For mange oppslag akkurat nå. Prøv igjen om litt.'],
        upstream:     [502, 'Statens vegvesen svarer ikke som forventet. Prøv igjen senere.'],
      }
      const [status, message] = map[e.code]
      return json({ error: message, code: e.code }, status)
    }
    return json({ error: 'Ingen kontakt med Statens vegvesen.' }, 502)
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

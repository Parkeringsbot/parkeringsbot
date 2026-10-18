import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase-config'

export const dynamic = 'force-dynamic'

/**
 * POST /api/varsler/ny-bot   { fineId }
 * Header: Authorization: Bearer <Supabase access token til en admin>
 *
 * Sender e-post via Resend til brukere som har skiltet på kontoen og
 * har e-postvarsler på. Admin-sjekken og mottakerlisten gjøres i databasen
 * (admin_fine_recipients), så serveren trenger ingen hemmelig Supabase-nøkkel.
 *
 * Krever RESEND_API_KEY. Avsender settes med VARSEL_FRA (domenet må være
 * verifisert i Resend), ellers brukes Resends testavsender.
 */
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Du må være logget inn.' }, 401)

  const { fineId } = await req.json().catch(() => ({ fineId: null }))
  if (typeof fineId !== 'string') return json({ error: 'Mangler fineId.' }, 400)

  // Klient som opptrer som den innloggede brukeren, slik at RLS og admin-sjekk gjelder
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: fine, error: fineError } = await supabase
    .from('fines').select('plate, location, area, amount, issue_date, deadline, reference').eq('id', fineId).maybeSingle()
  if (fineError || !fine) return json({ error: 'Fant ikke boten.' }, 404)

  const { data: recipients, error: recError } = await supabase.rpc('admin_fine_recipients', { p_fine_id: fineId })
  if (recError) return json({ error: 'Bare admin kan sende varsler.' }, 403)

  const list = (recipients as { email: string; full_name: string }[]) || []
  if (list.length === 0) return json({ sent: 0, message: 'Ingen brukere med dette skiltet har e-postvarsler på.' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return json({ sent: 0, message: 'E-postvarsler er ikke satt opp på serveren (RESEND_API_KEY mangler).' })

  const from = process.env.VARSEL_FRA || 'Parkeringsbot <onboarding@resend.dev>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://parkeringsbot.app'
  const plate = formatPlate(fine.plate)
  const where = [fine.location, fine.area].filter(Boolean).join(', ') || 'ukjent sted'

  let sent = 0
  const failures: string[] = []
  for (const r of list) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: r.email,
        subject: `Ny parkeringsbot på ${plate}`,
        text: [
          `Hei${r.full_name ? ' ' + r.full_name.split(' ')[0] : ''},`,
          '',
          `Det er registrert en ny parkeringsbot på ${plate}.`,
          `Sted: ${where}`,
          `Beløp: ${fine.amount} kr`,
          fine.issue_date ? `Dato: ${fine.issue_date}` : '',
          fine.deadline ? `Frist: ${fine.deadline}` : '',
          fine.reference ? `Referanse: ${fine.reference}` : '',
          '',
          `Se boten: ${appUrl}`,
          '',
          'Du får denne e-posten fordi du har slått på e-postvarsler i Parkeringsbot. Du kan slå dem av under Profil.',
        ].filter((l) => l !== '').join('\n'),
      }),
    })
    if (res.ok) sent++
    else failures.push(`${res.status}`)
  }

  const message = failures.length
    ? `Sendt ${sent} av ${list.length}. Resend svarte ${failures.join(', ')} – sjekk at avsenderdomenet er verifisert.`
    : `E-postvarsel sendt til ${sent} ${sent === 1 ? 'bruker' : 'brukere'}.`
  return json({ sent, message })
}

function formatPlate(plate: string) {
  const m = plate.match(/^([A-Z]+)(\d+)$/)
  return m ? `${m[1]} ${m[2]}` : plate
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

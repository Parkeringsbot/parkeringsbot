/* ── Statens vegvesen – kjøretøyopplysninger (KUN server) ──
   Nøkkelen leses fra VEGVESEN_API_KEY og når aldri nettleseren.
   Dokumentasjon: https://autosys-kjoretoy-api.atlas.vegvesen.no/api-ui/index-enkeltoppslag.html */

const BASE_URL = 'https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata'

export interface VehicleInfo {
  plate: string
  make: string | null
  model: string | null
  vehicleType: string | null
  color: string | null
  fuel: string | null
  registrationStatus: string | null
  firstRegistered: string | null  // ÅÅÅÅ-MM-DD
  nextInspection: string | null   // ÅÅÅÅ-MM-DD
  lastInspection: string | null   // ÅÅÅÅ-MM-DD
}

export type VegvesenErrorCode = 'missing_key' | 'not_found' | 'unauthorized' | 'rate_limited' | 'upstream'

export class VegvesenError extends Error {
  constructor(public code: VegvesenErrorCode, message: string) { super(message) }
}

export function hasVegvesenKey(): boolean {
  return Boolean(process.env.VEGVESEN_API_KEY)
}

/** "ab 12345" → "AB12345" */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** "TOYOTA" → "Toyota", men korte forkortelser som "BMW" beholdes */
function prettify(s: unknown): string | null {
  if (typeof s !== 'string' || !s) return null
  return s.length <= 3 ? s : s.charAt(0) + s.slice(1).toLowerCase()
}

export async function lookupVehicle(rawPlate: string): Promise<VehicleInfo> {
  const key = process.env.VEGVESEN_API_KEY
  if (!key) throw new VegvesenError('missing_key', 'VEGVESEN_API_KEY mangler på serveren')

  const plate = normalizePlate(rawPlate)
  const res = await fetch(`${BASE_URL}?kjennemerke=${encodeURIComponent(plate)}`, {
    headers: { 'SVV-Authorization': `Apikey ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (res.status === 204 || res.status === 404) throw new VegvesenError('not_found', 'Fant ikke kjøretøyet')
  if (res.status === 401 || res.status === 403) throw new VegvesenError('unauthorized', 'Vegvesen avviste nøkkelen')
  if (res.status === 429) throw new VegvesenError('rate_limited', 'For mange oppslag')
  if (!res.ok) throw new VegvesenError('upstream', `Vegvesen svarte ${res.status}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json().catch(() => null)
  const d = json?.kjoretoydataListe?.[0]
  if (!d) throw new VegvesenError('not_found', 'Fant ikke kjøretøyet')

  const data = d.godkjenning?.tekniskGodkjenning?.tekniskeData
  const fuels: string[] = []
  for (const motor of data?.motorOgDrivverk?.motor ?? []) {
    for (const ds of motor?.drivstoff ?? []) {
      const name = ds?.drivstoffKode?.kodeNavn
      if (name && !fuels.includes(name)) fuels.push(name)
    }
  }

  return {
    plate: d.kjoretoyId?.kjennemerke ?? plate,
    make: prettify(data?.generelt?.merke?.[0]?.merke),
    model: prettify(data?.generelt?.handelsbetegnelse?.[0]),
    vehicleType: data?.generelt?.tekniskKode?.kodeNavn ?? null,
    color: data?.karosseriOgLasteplan?.rFarge?.[0]?.kodeNavn ?? null,
    fuel: fuels.length ? fuels.join(' / ') : null,
    registrationStatus: d.registrering?.registreringsstatus?.kodeNavn ?? null,
    firstRegistered: d.forstegangsregistrering?.registrertForstegangNorgeDato ?? null,
    nextInspection: d.periodiskKjoretoyKontroll?.kontrollfrist ?? null,
    lastInspection: d.periodiskKjoretoyKontroll?.sistGodkjent ?? null,
  }
}

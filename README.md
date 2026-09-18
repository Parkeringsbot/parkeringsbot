# Parkeringsbot 🚗

En enkel og sikker løsning for privatpersoner til å søke etter og administrere parkingsbøter online.

## Funksjoner

- **Søk etter bøter**: Søk parkingsbøter basert på registreringsnummer
- **Se alle bøter**: Oversikt over alle registrerte parkingsbøter for kjøretøyet
- **Betaling**: Registrer betaling av utestående bøter
- **Admin-panel**: Administrer appen og se alle data i Supabase Dashboard
- **Test-brukere**: Inkludert test-data for enkel testing

## Testkjøretøyer

Bruk følgende registreringsnummer for å teste appen:

| Registreringsnummer | Navn |
|---|---|
| AB12345 | Ola Nordmann |
| CD98765 | Kari Hansen |
| EF54321 | Per Larsen |

## Admin-innlogging

Standard admin-passord: `admin123` (endre i `.env.local`)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: CSS Modules
- **Authentication**: Manual license plate search (MVP version)
- **Payments**: Vipps (future integration)

## Rask start

### Forutsetninger

- Node.js 18+ og npm
- Supabase-konto (gratis på supabase.com)
- Vercel-konto (gratis på vercel.com)
- GitHub-konto

### Installasjon lokalt

1. **Klon eller last ned prosjektet**

2. **Installer dependencies**:
```bash
npm install
```

3. **Sett opp miljøvariabler**:
   - Kopier `.env.example` til `.env.local`
   - Fyll inn Supabase-detaljer
   - Endre admin-passord hvis ønsket

4. **Kjør lokalt**:
```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Deployment på Vercel

Se [SETUP.md](SETUP.md) for detaljert veiledning om:
- Oppsett av Supabase
- Deployment til Vercel
- Miljøvariabel-konfigurasjon
- Databaseskjema-oppsett

## Filstruktur

```
parkeringsbot/
├── app/
│   ├── page.tsx              # Hovedkomponent
│   ├── page.module.css       # Styling
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styling
├── lib/
│   └── supabase.ts           # Supabase-klient
├── supabase/
│   └── schema.sql            # Databaseskjema
├── .env.example              # Miljøvariabler-template
├── .env.local                # Lokale miljøvariabler (endre denne)
├── package.json              # Dependencies
├── next.config.js            # Next.js-konfigurasjon
└── tsconfig.json             # TypeScript-konfigurasjon
```

## Sikkerhet

**Merk**: Dette er en MVP med mock-data. Før produksjon må du:
- Implementere ekte BankID-autentisering
- Integrer med Motorregisteret for kjøretøy-verifisering
- Implementer ekte Vipps-betaling
- Legg til HTTPS og sikkerhedsheaders
- Implementer rate limiting
- Legg til GDPR-samsvar

## Fremtidige utvidelser

- [ ] BankID-integrasjon
- [ ] Motorregisteret-integrasjon
- [ ] Vipps-betaling
- [ ] Email-varsler
- [ ] SMS-varsler
- [ ] Dashboard-statistikk
- [ ] Exporting av bøter (PDF/CSV)

## Kontakt & Support

For spørsmål eller problemer, opprett en issue i GitHub-repositoriet.

## Lisens

MIT

# Parkeringsbot - Fullstendig setupveiledning

Denne veiledningen vil ta deg gjennom alle stegene for å få Parkeringsbot opp og kjørende fra scratch.

## 📋 Forutsetninger

Før du starter, sørg for at du har:

1. **GitHub-konto** - For å lagre koden (gratis på github.com)
2. **Supabase-konto** - For databasen (gratis på supabase.com)
3. **Vercel-konto** - For hosting (gratis på vercel.com)
4. **Node.js 18+** - Installerbar fra nodejs.org
5. **npm eller yarn** - Kommer med Node.js

## 🚀 Steg 1: Opprett GitHub Repository

1. Gå til [github.com/new](https://github.com/new)
2. Navn på repository: `parkeringsbot`
3. Beskrivelse: `Norwegian parking fine management app`
4. Velg "Public" eller "Private"
5. Initialiser med README (opsjonelt - du har allerede en)
6. Klikk "Create repository"

## 📁 Steg 2: Last opp koden til GitHub

### Med Git CLI:

1. Åpne terminal/kommandolinje i prosjektmappen
2. Kjør disse kommandoene:

```bash
git init
git add .
git commit -m "Initial commit: Parkeringsbot MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/parkeringsbot.git
git push -u origin main
```

Erstatt `YOUR_USERNAME` med ditt GitHub-brukernavn.

## 🗄️ Steg 3: Opprett Supabase-prosjekt

1. Gå til [supabase.com](https://supabase.com) og logg inn
2. Klikk "New Project"
3. **Prosjektnavn**: `parkeringsbot`
4. **Database Password**: Lagre dette et sikkert sted!
5. **Region**: Velg europeisk region (f.eks. Frankfurt, Ireland)
6. Klikk "Create new project" og vent 2-3 minutter

### Importer databaseskjema:

1. I Supabase-dashbordet, gå til **SQL Editor** (venstre meny)
2. Klikk "New Query"
3. Kopier all innhold fra `supabase/schema.sql` fra prosjektet
4. Lim det inn i SQL-editoren
5. Klikk "Run" eller trykk `Cmd+Enter`

Du skal nå se tre tabeller opprettet: `parking_fines`, `users`, og indekser.

### Hent API-nøkler:

1. I Supabase-dashbordet, gå til **Settings** → **API**
2. Kopier disse verdiene:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public key** (NEXT_PUBLIC_SUPABASE_KEY)
3. Lagre disse - du trenger dem snart

## 🌐 Steg 4: Konfigurer lokale miljøvariabler

1. Åpne `.env.local` i prosjektmappen
2. Fyll inn verdiene du hentet fra Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGc...
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

**NB**: ALDRI commit `.env.local` til GitHub! Den er allerede i `.gitignore`.

## 🧪 Steg 5: Test lokalt

1. Åpne terminal i prosjektmappen
2. Installer dependencies:
```bash
npm install
```

3. Start utviklingsserver:
```bash
npm run dev
```

4. Åpne [http://localhost:3000](http://localhost:3000) i nettleseren
5. Test innlogging med:
   - **Søk**: Skriv `AB12345` og søk
   - **Admin**: Trykk "Logg inn som admin" og bruk passord `admin123`

Hvis alt fungerer, gå videre til Vercel-deployment!

## 🚀 Steg 6: Deploy til Vercel

### Koble til Vercel:

1. Gå til [vercel.com/new](https://vercel.com/new)
2. Logg inn med GitHub-kontoen
3. Velg "Import Git Repository"
4. Søk etter `parkeringsbot` repositoriet
5. Klikk "Import"

### Sett opp miljøvariabler på Vercel:

1. I "Configure Project"-siden som dukker opp:
2. Under "Environment Variables", legg til:

| Navn | Verdi |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | (din Supabase URL) |
| NEXT_PUBLIC_SUPABASE_KEY | (din Supabase anon key) |
| NEXT_PUBLIC_ADMIN_PASSWORD | (velg et sterkt passord) |

3. Klikk "Deploy"

Vercel vil nå bygge og deploye appen. Dette tar 2-3 minutter.

## ✅ Steg 7: Verifiser Deployment

1. Når Vercel er ferdig, får du en produktiv URL (f.eks. `https://parkeringsbot-abc123.vercel.app`)
2. Åpne URL-en
3. Test med testkjøretøyene:
   - AB12345 (Ola Nordmann)
   - CD98765 (Kari Hansen)
   - EF54321 (Per Larsen)
4. Test admin-innlogging med ditt passord

## 🔧 Fremtidsforbedringer

### Aktivere Vipps-betaling:

1. Registrer deg på [vipps.no](https://vipps.no) for Business
2. Hent dine Vipps API-detaljer
3. Legg til i `.env.local`:
```env
VIPPS_CLIENT_ID=your_id
VIPPS_CLIENT_SECRET=your_secret
VIPPS_MERCHANT_SERIAL=your_serial
```
4. Implementer Vipps-integrasjon i en senere versjon

### Aktivere BankID:

1. Registrer deg på [bankid.no](https://bankid.no) for developers
2. Følg deres integrasjonsguide
3. Implementer i en senere versjon

## 🐛 Feilsøking

### "SUPABASE_URL not configured"
- Sjekk at `.env.local` har riktige verdier
- Restart utviklingsserver (`npm run dev`)

### Databasetilkoblingsfeil
- Verifiser Supabase URL og key i `.env.local`
- Sjekk at databaseskjema er importert korrekt
- Se Supabase-dashbordet sitt SQL-editor

### Vercel deployment-feil
- Sjekk at miljøvariabler er satt korrekt på Vercel
- Se Vercel build-logs for detaljer
- Redeploy fra Vercel-dashbordet

### Innlogging fungerer ikke
- Sjekk at `supabase/schema.sql` er kjørt
- Verifiser at testkjøretøyene eksisterer i databasen
- Sjekk Supabase Query Editor for data

## 📚 Nyttige lenker

- **Next.js dokumentasjon**: https://nextjs.org/docs
- **Supabase dokumentasjon**: https://supabase.com/docs
- **Vercel dokumentasjon**: https://vercel.com/docs
- **React dokumentasjon**: https://react.dev

## 🔒 Sikkerhetsmerknad

Denne MVP-versjonen bruker mock-data og enkel passordautentisering. Før produksjon:

1. Implementer ekte autentisering (BankID)
2. Legg til HTTPS og sikkerhetsheaders
3. Implementer rate limiting
4. Legge til loggingssystem for audit trail
5. Sett opp sikker passordlagring
6. Implementer GDPR-samsvar
7. Legger til DDoS-beskyttelse

## ❓ Spørsmål?

Hvis noe er uklart eller du får feil:

1. Les feilmeldingen nøye
2. Sjekk Supabase/Vercel logger
3. Verifiser miljøvariabler
4. Redeploy eller restart lokal server

Lykke til med Parkeringsbot! 🎉

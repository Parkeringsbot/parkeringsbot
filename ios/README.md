# Parkeringsbot – iOS-app

SwiftUI-app (iOS 16+) som deler Supabase-database med nettsiden.

## Kom i gang
1. Kopier `Secrets.example.swift` til `Parkeringsbot/Secrets.swift` og legg inn Vegvesen-nøkkelen.
2. Åpne `Parkeringsbot.xcodeproj` i Xcode og kjør (⌘R).

## Innhold
- `Parkeringsbot/ContentView.swift` – alle skjermer (innlogging, Hjem, Bøter, Profil)
- `Parkeringsbot/VegvesenAPI.swift` – oppslag av kjøretøyinfo hos Statens vegvesen
- Universelt utformet (WCAG 2.1 AA): kontrast, VoiceOver, Dynamic Type, Reduser bevegelse
- Lys / mørk / system-modus under Profil → Utseende

## Innlogging og data
- Logger inn mot samme Supabase-database som nettsiden (`SupabaseService.swift`, ingen ekstra pakker).
- Innloggingen lagres i nøkkelringen (Keychain) og fornyes automatisk.
- Glemt passord sender en lenke til nettsiden (`/tilbakestill-passord`).
- Profil: endre navn/telefon, legge til/fjerne kjøretøy, e-postvarsler av/på, endre passord,
  logg ut / logg ut fra alle enheter, slett konto, personvernerklæring.

## Ikke ferdig ennå
- Vegvesen-nøkkelen ligger fortsatt i appen. Flytt oppslaget til nettsidens `/api/kjoretoy`
  når parkeringsbot.app ikke lenger er låst bak Vercel-innlogging.
- Betaling i appen («Betal alle» er merket «kommer snart»).

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

## Ikke ferdig ennå
- Appen bruker fortsatt testdata for innlogging og bøter – kobling til Supabase gjenstår.
- Vegvesen-nøkkelen ligger i appen; flytt oppslaget til en server før publisering.

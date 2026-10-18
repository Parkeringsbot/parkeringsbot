export default function Personvern() {
  return (
    <main className="doc">
      <div>
        <a href="/">← Tilbake</a>
      </div>

      <h1>Personvernerklæring</h1>
      <p className="muted">
        Sist oppdatert: 18. oktober 2026
      </p>

      <section>
        <h2>1. Behandlingsansvarlig</h2>
        <p>
          Parkeringsbot er behandlingsansvarlig for personopplysninger som behandles i denne tjenesten.
          Kontakt oss på <a href="mailto:khadar97@hotmail.no">khadar97@hotmail.no</a> ved spørsmål om personvern.
        </p>
      </section>

      <section>
        <h2>2. Hvilke opplysninger samler vi inn</h2>
        <ul>
          <li>Navn og e-postadresse (ved registrering)</li>
          <li>Telefonnummer (valgfritt)</li>
          <li>Registreringsnummer på kjøretøy</li>
          <li>Informasjon om parkeringsbøter (beløp, sted, dato, status)</li>
        </ul>
      </section>

      <section>
        <h2>3. Formål og rettslig grunnlag</h2>
        <table>
          <thead>
            <tr>
              <th>Formål</th>
              <th>Rettslig grunnlag (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kontooppretting og innlogging</td>
              <td>Art. 6(1)(b) – Avtale</td>
            </tr>
            <tr>
              <td>Administrasjon av parkeringsbøter</td>
              <td>Art. 6(1)(b) – Avtale</td>
            </tr>
            <tr>
              <td>Forbedring av tjenesten</td>
              <td>Art. 6(1)(f) – Berettiget interesse</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Lagring og sikkerhet</h2>
        <p>
          Data lagres hos <strong>Supabase</strong> (PostgreSQL-database) på servere i Irland (AWS eu-west-1), innenfor EØS.
          All data er kryptert i transit (TLS) og i hvile. Tilgang er begrenset til deg selv via innlogging.
        </p>
      </section>

      <section>
        <h2>5. Tredjeparter</h2>
        <ul>
          <li><strong>Supabase Inc.</strong> – databasetjeneste og autentisering (databehandleravtale inngått)</li>
          <li><strong>Vercel Inc.</strong> – hosting av nettsted (databehandleravtale inngått)</li>
          <li><strong>Statens vegvesen</strong> – vi slår opp registreringsnummeret ditt for å vise kjøretøyopplysninger (merke, modell, EU-kontroll). Vi sender bare registreringsnummeret.</li>
          <li><strong>Resend</strong> – utsending av e-postvarsler om nye bøter, hvis du har slått det på. Du kan slå varsler av under Profil.</li>
        </ul>
        <p>Vi deler ikke personopplysninger med andre tredjeparter.</p>
      </section>

      <section>
        <h2>6. Dine rettigheter</h2>
        <p>Du har rett til å:</p>
        <ul>
          <li><strong>Innsyn</strong> – se hvilke opplysninger vi har om deg</li>
          <li><strong>Retting</strong> – korrigere feilaktige opplysninger</li>
          <li><strong>Sletting</strong> – slette kontoen selv under Profil → «Slett kontoen min». Profil, kjøretøy og innlogging slettes da med en gang.</li>
          <li><strong>Dataportabilitet</strong> – få utlevert dine data i maskinlesbart format</li>
          <li><strong>Innsigelse</strong> – protestere mot behandling basert på berettiget interesse</li>
        </ul>
        <p>
          Send forespørsel til <a href="mailto:khadar97@hotmail.no">khadar97@hotmail.no</a>.
          Slettingsforespørsler behandles innen 30 dager.
        </p>
      </section>

      <section>
        <h2>7. Informasjonskapsler (cookies)</h2>
        <p>
          Vi bruker kun nødvendige informasjonskapsler for innlogging og sesjonshåndtering.
          Ingen sporings- eller markedsføringskapsler benyttes.
        </p>
      </section>

      <section>
        <h2>8. Oppbevaringstid</h2>
        <p>
          Personopplysninger lagres så lenge kontoen er aktiv. Sletter du kontoen selv, fjernes profil,
          kjøretøy og innlogging med en gang. Sikkerhetskopier hos databaseleverandøren slettes etter
          deres faste rutine, med unntak av det vi er lovpålagt å beholde.
        </p>
      </section>

      <section>
        <h2>9. Klage til Datatilsynet</h2>
        <p>
          Du har rett til å klage til{' '}
          <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">
            Datatilsynet
          </a>{' '}
          hvis du mener vi behandler opplysningene dine i strid med personvernregelverket.
        </p>
      </section>

      <section>
        <h2>10. Kontakt</h2>
        <p>
          <strong>Parkeringsbot</strong><br />
          E-post: <a href="mailto:khadar97@hotmail.no">khadar97@hotmail.no</a>
        </p>
      </section>

      <p>
        © 2026 Parkeringsbot. Alle rettigheter forbeholdt.
      </p>
    </main>
  )
}

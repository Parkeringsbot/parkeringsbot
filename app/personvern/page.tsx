export default function Personvern() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif', color: '#1F2937', lineHeight: 1.7 }}>
      <div style={{ marginBottom: 32 }}>
        <a href="/" style={{ color: '#254FEB', fontSize: 14, textDecoration: 'none' }}>← Tilbake</a>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Personvernerklæring</h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 40 }}>
        Sist oppdatert: 26. september 2026
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>1. Behandlingsansvarlig</h2>
        <p>
          Parkeringsbot er behandlingsansvarlig for personopplysninger som behandles i denne tjenesten.
          Kontakt oss på <a href="mailto:khadar97@hotmail.no" style={{ color: '#254FEB' }}>khadar97@hotmail.no</a> ved spørsmål om personvern.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>2. Hvilke opplysninger samler vi inn</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Navn og e-postadresse (ved registrering)</li>
          <li>Telefonnummer (valgfritt)</li>
          <li>Registreringsnummer på kjøretøy</li>
          <li>Informasjon om parkeringsbøter (beløp, sted, dato, status)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>3. Formål og rettslig grunnlag</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>Formål</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>Rettslig grunnlag (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Kontooppretting og innlogging</td>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Art. 6(1)(b) – Avtale</td>
            </tr>
            <tr style={{ background: '#F9FAFB' }}>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Administrasjon av parkeringsbøter</td>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Art. 6(1)(b) – Avtale</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Forbedring av tjenesten</td>
              <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>Art. 6(1)(f) – Berettiget interesse</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>4. Lagring og sikkerhet</h2>
        <p>
          Data lagres hos <strong>Supabase</strong> (PostgreSQL-database) på servere i Irland (AWS eu-west-1), innenfor EØS.
          All data er kryptert i transit (TLS) og i hvile. Tilgang er begrenset til deg selv via innlogging.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>5. Tredjeparter</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Supabase Inc.</strong> – databasetjeneste og autentisering (databehandleravtale inngått)</li>
          <li><strong>Vercel Inc.</strong> – hosting av nettsted (databehandleravtale inngått)</li>
        </ul>
        <p>Vi deler ikke personopplysninger med andre tredjeparter.</p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>6. Dine rettigheter</h2>
        <p>Du har rett til å:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Innsyn</strong> – se hvilke opplysninger vi har om deg</li>
          <li><strong>Retting</strong> – korrigere feilaktige opplysninger</li>
          <li><strong>Sletting</strong> – be om at kontoen og alle data slettes</li>
          <li><strong>Dataportabilitet</strong> – få utlevert dine data i maskinlesbart format</li>
          <li><strong>Innsigelse</strong> – protestere mot behandling basert på berettiget interesse</li>
        </ul>
        <p>
          Send forespørsel til <a href="mailto:khadar97@hotmail.no" style={{ color: '#254FEB' }}>khadar97@hotmail.no</a>.
          Slettingsforespørsler behandles innen 30 dager.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>7. Informasjonskapsler (cookies)</h2>
        <p>
          Vi bruker kun nødvendige informasjonskapsler for innlogging og sesjonshåndtering.
          Ingen sporings- eller markedsføringskapsler benyttes.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>8. Oppbevaringstid</h2>
        <p>
          Personopplysninger lagres så lenge kontoen er aktiv. Ved sletting av konto fjernes alle data
          innen 30 dager, med unntak av det vi er lovpålagt å beholde.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>9. Klage til Datatilsynet</h2>
        <p>
          Du har rett til å klage til{' '}
          <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" style={{ color: '#254FEB' }}>
            Datatilsynet
          </a>{' '}
          hvis du mener vi behandler opplysningene dine i strid med personvernregelverket.
        </p>
      </section>

      <section style={{ marginBottom: 60 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>10. Kontakt</h2>
        <p>
          <strong>Parkeringsbot</strong><br />
          E-post: <a href="mailto:khadar97@hotmail.no" style={{ color: '#254FEB' }}>khadar97@hotmail.no</a>
        </p>
      </section>

      <p style={{ fontSize: 12, color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        © 2026 Parkeringsbot. Alle rettigheter forbeholdt.
      </p>
    </div>
  )
}

-- Testdata: fire bøter på AB12345 (de samme som i appen).
-- Kjør etter 002_app_schema.sql. Registrer deg med skilt «AB 12345»
-- på nettsiden eller i appen for å se dem.
insert into public.fines (plate, location, area, amount, issue_date, deadline, status, reference) values
  ('AB12345', 'Karl Johans gt.', 'Sentrum, Oslo',  900, '2026-09-15', '2026-09-28', 'ubetalt', 'PB-2026-001'),
  ('AB12345', 'Grünerløkka',     'Oslo',           750, '2026-09-10', '2026-10-10', 'ubetalt', 'PB-2026-002'),
  ('AB12345', 'Vippetangen',     'Bjørvika, Oslo', 750, '2026-09-05', null,         'pending', 'PB-2026-003'),
  ('AB12345', 'Majorstuen',      'Oslo',           600, '2026-08-12', null,         'betalt',  'PB-2026-004')
on conflict (reference) do nothing;

-- ════════════════════════════════════════════════════════════════
-- Parkeringsbot – databaseskjema for nettside og iOS-app
--
-- Kjør hele filen i Supabase: SQL Editor → New query → lim inn → Run.
-- Filen kan kjøres flere ganger uten å ødelegge eksisterende data.
--
-- Registreringsnummer lagres alltid normalisert: store bokstaver,
-- uten mellomrom («AB12345»). Appen og nettsiden formaterer for visning.
-- ════════════════════════════════════════════════════════════════

-- ── Profiler (én per innlogget bruker) ──────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Kjøretøy (en bruker kan ha flere) ───────────────────────────
create table if not exists public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  plate       text not null check (plate ~ '^[A-Z0-9]{2,8}$'),
  nickname    text,
  created_at  timestamptz not null default now(),
  unique (user_id, plate)
);
create index if not exists vehicles_plate_idx on public.vehicles (plate);

-- ── Bøter ───────────────────────────────────────────────────────
-- Bøter kommer inn per registreringsnummer. En bruker ser bøtene for
-- skiltene som står på kontoen sin (se policy under).
create table if not exists public.fines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  vehicle_id  uuid references public.vehicles (id) on delete set null,
  plate       text not null check (plate ~ '^[A-Z0-9]{2,8}$'),
  location    text,
  area        text,
  amount      integer not null check (amount > 0),
  issue_date  date,
  deadline    date,
  status      text not null default 'ubetalt' check (status in ('ubetalt', 'pending', 'betalt')),
  reference   text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fines_plate_idx on public.fines (plate);
create index if not exists fines_user_idx  on public.fines (user_id);

-- ── Forespørsler om sletting av konto (personvern/GDPR) ─────────
create table if not exists public.deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ── updated_at oppdateres automatisk ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists fines_updated_at on public.fines;
create trigger fines_updated_at before update on public.fines
  for each row execute function public.set_updated_at();

-- ── Ny bruker → lag profil og første kjøretøy automatisk ────────
-- Navn, telefon og registreringsnummer sendes med som metadata ved
-- registrering. Dette virker også når e-postbekreftelse er slått på,
-- fordi det skjer i databasen og ikke krever at brukeren er innlogget.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  raw_plate text := upper(regexp_replace(coalesce(new.raw_user_meta_data ->> 'license_plate', ''), '[^A-Za-z0-9]', '', 'g'));
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  if raw_plate ~ '^[A-Z0-9]{2,8}$' then
    insert into public.vehicles (user_id, plate)
    values (new.id, raw_plate)
    on conflict (user_id, plate) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Sikkerhet: Row Level Security ───────────────────────────────
-- Uten disse reglene kan alle med anon-nøkkelen lese alt.
alter table public.profiles          enable row level security;
alter table public.vehicles          enable row level security;
alter table public.fines             enable row level security;
alter table public.deletion_requests enable row level security;

drop policy if exists "Egen profil: les"       on public.profiles;
drop policy if exists "Egen profil: oppdater"  on public.profiles;
create policy "Egen profil: les"      on public.profiles for select using (auth.uid() = id);
create policy "Egen profil: oppdater" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Egne kjøretøy: les"     on public.vehicles;
drop policy if exists "Egne kjøretøy: legg til" on public.vehicles;
drop policy if exists "Egne kjøretøy: slett"   on public.vehicles;
create policy "Egne kjøretøy: les"      on public.vehicles for select using (auth.uid() = user_id);
create policy "Egne kjøretøy: legg til" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "Egne kjøretøy: slett"    on public.vehicles for delete using (auth.uid() = user_id);

-- Brukere kan bare LESE bøter. Status endres av betalingsløsningen/admin
-- på serversiden (med service_role-nøkkelen), aldri direkte fra appen.
drop policy if exists "Bøter for egne skilt: les" on public.fines;
create policy "Bøter for egne skilt: les" on public.fines for select using (
  auth.uid() = user_id
  or plate in (select v.plate from public.vehicles v where v.user_id = auth.uid())
);

drop policy if exists "Egen sletteforespørsel: opprett" on public.deletion_requests;
create policy "Egen sletteforespørsel: opprett" on public.deletion_requests for insert with check (auth.uid() = user_id);

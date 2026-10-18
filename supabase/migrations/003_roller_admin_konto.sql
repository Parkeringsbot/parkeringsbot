-- ════════════════════════════════════════════════════════════════
-- Parkeringsbot – roller, admin, varsler og sletting av konto
--
-- Kjør etter 002_app_schema.sql. Kan kjøres flere ganger.
--
-- Etterpå: gjør deg selv til admin (bytt ut e-posten):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'din@epost.no');
-- ════════════════════════════════════════════════════════════════

-- ── Nye felter på profilen ──────────────────────────────────────
alter table public.profiles add column if not exists role         text    not null default 'privat';
alter table public.profiles add column if not exists notify_email boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('privat', 'bedrift', 'admin'));
  end if;
end $$;

-- Brukere kan bare endre navn, telefon og varslingsvalg på egen profil –
-- aldri sin egen rolle. (RLS-regelen «Egen profil: oppdater» gjelder fortsatt.)
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, phone, notify_email) on public.profiles to authenticated;

-- ── Er innlogget bruker admin? ──────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── Admin: full tilgang til bøter, lesetilgang til profiler og kjøretøy ──
drop policy if exists "Admin: bøter" on public.fines;
create policy "Admin: bøter" on public.fines for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin: les profiler" on public.profiles;
create policy "Admin: les profiler" on public.profiles for select using (public.is_admin());

drop policy if exists "Admin: les kjøretøy" on public.vehicles;
create policy "Admin: les kjøretøy" on public.vehicles for select using (public.is_admin());

drop policy if exists "Admin: les sletteforespørsler" on public.deletion_requests;
create policy "Admin: les sletteforespørsler" on public.deletion_requests for select using (public.is_admin());

-- ── Admin: liste over brukere (med e-post fra auth.users) ───────
create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, phone text, role text, plates text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Bare admin har tilgang' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role,
           coalesce((select string_agg(v.plate, ', ' order by v.plate) from public.vehicles v where v.user_id = p.id), ''),
           p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ── Admin: endre rolle (ikke sin egen) ──────────────────────────
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Bare admin har tilgang' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'Du kan ikke endre din egen rolle'; end if;
  if p_role not in ('privat', 'bedrift', 'admin') then raise exception 'Ugyldig rolle'; end if;
  update public.profiles set role = p_role where id = p_user_id;
end $$;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ── Admin: hvem skal få e-postvarsel om en bot ──────────────────
create or replace function public.admin_fine_recipients(p_fine_id uuid)
returns table (email text, full_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Bare admin har tilgang' using errcode = '42501'; end if;
  return query
    select distinct u.email::text, p.full_name
    from public.fines f
    join public.profiles p on p.notify_email
      and (p.id = f.user_id or exists (select 1 from public.vehicles v where v.user_id = p.id and v.plate = f.plate))
    join auth.users u on u.id = p.id
    where f.id = p_fine_id and u.email is not null;
end $$;
revoke all on function public.admin_fine_recipients(uuid) from public, anon;
grant execute on function public.admin_fine_recipients(uuid) to authenticated;

-- ── Bruker: slett egen konto (påkrevd av Apple for App Store) ───
-- Sletter innloggingen; profil og kjøretøy forsvinner automatisk (cascade).
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Ikke innlogget'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

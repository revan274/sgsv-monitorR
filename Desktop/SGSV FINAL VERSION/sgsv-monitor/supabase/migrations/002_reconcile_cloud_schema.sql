-- Reconcile older SGSV schemas with the current frontend contract.
-- Safe to run after either the legacy payload schema or the first column-based schema.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('operador', 'administrador');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'operador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidentes (
  id text primary key
);

alter table public.incidentes add column if not exists fecha text;
alter table public.incidentes add column if not exists timestamp bigint not null default 0;
alter table public.incidentes add column if not exists titulo text not null default '';
alter table public.incidentes add column if not exists tipo text not null default 'Otro';
alter table public.incidentes add column if not exists severidad text not null default 'Alta';
alter table public.incidentes add column if not exists descripcion text not null default '';
alter table public.incidentes add column if not exists ubicacion text not null default 'TJ01';
alter table public.incidentes add column if not exists status text not null default 'Abierto';
alter table public.incidentes add column if not exists responsable text;
alter table public.incidentes add column if not exists imagen_evidencia text;
alter table public.incidentes add column if not exists imagen_persona text;
alter table public.incidentes add column if not exists video_evidencia text;
alter table public.incidentes add column if not exists closed_at bigint;
alter table public.incidentes add column if not exists notas jsonb not null default '[]'::jsonb;
alter table public.incidentes add column if not exists turno_id text;
alter table public.incidentes add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.incidentes add column if not exists created_at timestamptz not null default now();
alter table public.incidentes add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'incidentes' and column_name = 'payload'
  ) then
    alter table public.incidentes alter column payload drop not null;
    alter table public.incidentes alter column payload set default '{}'::jsonb;
  end if;
end $$;

create table if not exists public.personas_interes (
  id text primary key
);

alter table public.personas_interes add column if not exists fecha_registro text;
alter table public.personas_interes add column if not exists nombre text not null default '';
alter table public.personas_interes add column if not exists terminos text;
alter table public.personas_interes add column if not exists descripcion text not null default '';
alter table public.personas_interes add column if not exists imagenes jsonb not null default '[]'::jsonb;
alter table public.personas_interes add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.personas_interes add column if not exists created_at timestamptz not null default now();
alter table public.personas_interes add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'personas_interes' and column_name = 'payload'
  ) then
    alter table public.personas_interes alter column payload drop not null;
    alter table public.personas_interes alter column payload set default '{}'::jsonb;
  end if;
end $$;

create table if not exists public.turnos (
  id text primary key,
  inicio bigint not null,
  fin bigint,
  operador text not null,
  ubicacion text not null,
  notas jsonb not null default '[]'::jsonb,
  incidente_ids jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_config (
  id text primary key default 'global',
  custom_locations jsonb not null default '[]'::jsonb,
  custom_incident_types jsonb not null default '[]'::jsonb,
  custom_pcp_terminos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_incidentes_ts on public.incidentes(timestamp desc);
create index if not exists idx_incidentes_status on public.incidentes(status);
create index if not exists idx_incidentes_severidad on public.incidentes(severidad);
create index if not exists idx_personas_nombre on public.personas_interes(nombre asc);
create index if not exists idx_turnos_inicio on public.turnos(inicio desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'administrador'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    coalesce(new.email, ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'administrador' then 'administrador'::public.app_role
      else 'operador'::public.app_role
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.incidentes enable row level security;
alter table public.personas_interes enable row level security;
alter table public.turnos enable row level security;
alter table public.app_config enable row level security;
alter table public.incidentes replica identity full;
alter table public.personas_interes replica identity full;
alter table public.turnos replica identity full;
alter table public.app_config replica identity full;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can select incidentes" on public.incidentes;
drop policy if exists "Authenticated users can insert incidentes" on public.incidentes;
drop policy if exists "Authenticated users can update incidentes" on public.incidentes;
drop policy if exists "Authenticated users can delete incidentes" on public.incidentes;
drop policy if exists "incidentes_insert_authenticated" on public.incidentes;
create policy "incidentes_insert_authenticated"
on public.incidentes
for insert
to authenticated
with check (coalesce(created_by, auth.uid()) = auth.uid() or public.is_admin());

drop policy if exists "incidentes_admin_select" on public.incidentes;
create policy "incidentes_admin_select"
on public.incidentes
for select
to authenticated
using (public.is_admin());

drop policy if exists "incidentes_admin_update" on public.incidentes;
create policy "incidentes_admin_update"
on public.incidentes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "incidentes_admin_delete" on public.incidentes;
create policy "incidentes_admin_delete"
on public.incidentes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can select personas" on public.personas_interes;
drop policy if exists "Authenticated users can insert personas" on public.personas_interes;
drop policy if exists "Authenticated users can update personas" on public.personas_interes;
drop policy if exists "Authenticated users can delete personas" on public.personas_interes;
drop policy if exists "pcp_admin_select" on public.personas_interes;
create policy "pcp_admin_select"
on public.personas_interes
for select
to authenticated
using (public.is_admin());

drop policy if exists "pcp_admin_insert" on public.personas_interes;
create policy "pcp_admin_insert"
on public.personas_interes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "pcp_admin_update" on public.personas_interes;
create policy "pcp_admin_update"
on public.personas_interes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pcp_admin_delete" on public.personas_interes;
create policy "pcp_admin_delete"
on public.personas_interes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can select turnos" on public.turnos;
drop policy if exists "Authenticated users can insert turnos" on public.turnos;
drop policy if exists "Authenticated users can update turnos" on public.turnos;
drop policy if exists "Authenticated users can delete turnos" on public.turnos;
drop policy if exists "turnos_admin_select" on public.turnos;
create policy "turnos_admin_select"
on public.turnos
for select
to authenticated
using (public.is_admin());

drop policy if exists "turnos_admin_insert" on public.turnos;
create policy "turnos_admin_insert"
on public.turnos
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "turnos_admin_update" on public.turnos;
create policy "turnos_admin_update"
on public.turnos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "turnos_admin_delete" on public.turnos;
create policy "turnos_admin_delete"
on public.turnos
for delete
to authenticated
using (public.is_admin());

drop policy if exists "app_config_select_authenticated" on public.app_config;
create policy "app_config_select_authenticated"
on public.app_config
for select
to authenticated
using (true);

drop policy if exists "app_config_admin_insert" on public.app_config;
create policy "app_config_admin_insert"
on public.app_config
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "app_config_admin_update" on public.app_config;
create policy "app_config_admin_update"
on public.app_config
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "app_config_admin_delete" on public.app_config;
create policy "app_config_admin_delete"
on public.app_config
for delete
to authenticated
using (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.incidentes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.personas_interes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.turnos;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.app_config;
exception
  when duplicate_object then null;
end $$;

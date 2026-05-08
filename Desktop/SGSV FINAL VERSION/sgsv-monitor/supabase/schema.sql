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
  id text primary key,
  payload jsonb not null,
  timestamp bigint not null default 0,
  severidad text not null default 'Alta',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personas_interes (
  id text primary key,
  payload jsonb not null,
  nombre text not null default '',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
      and role = 'administrador'
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
alter table public.incidentes replica identity full;
alter table public.personas_interes replica identity full;

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

drop policy if exists "incidentes_insert_authenticated" on public.incidentes;
create policy "incidentes_insert_authenticated"
on public.incidentes
for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin());

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

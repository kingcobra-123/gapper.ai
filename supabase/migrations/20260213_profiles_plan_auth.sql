-- Supabase profiles auth hardening
-- Date: 2026-02-13
-- Purpose: source-of-truth membership plan + strict RLS + signup trigger

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists plan text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  existing_fk text;
begin
  select c.conname into existing_fk
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = any(c.conkey)
  where c.conrelid = 'public.profiles'::regclass
    and c.contype = 'f'
    and c.confrelid = 'auth.users'::regclass
    and a.attname = 'id'
  limit 1;

  if existing_fk is not null then
    execute format('alter table public.profiles drop constraint %I', existing_fk);
  end if;

  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;
exception
  when duplicate_object then
    null;
end
$$;

update public.profiles
set plan = case
  when lower(coalesce(plan, '')) = 'premium' then 'premium'
  else 'free'
end;

alter table public.profiles
  alter column plan set default 'free',
  alter column plan set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_plan_allowed
      check (plan in ('free', 'premium'));
  end if;
end
$$;

-- Backfill missing profile rows for existing auth users.
insert into public.profiles (id, email, plan, created_at, updated_at)
select
  au.id,
  coalesce(au.email, au.raw_user_meta_data->>'email'),
  'free',
  now(),
  now()
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;

alter table public.profiles enable row level security;

-- Remove all old policies to prevent permissive leftovers.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_name);
  end loop;
end
$$;

-- Users can read only their own profile.
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Inserts/updates are service-role only (trigger runs as definer).
create policy profiles_insert_service_role
on public.profiles
for insert
to service_role
with check (true);

create policy profiles_update_service_role
on public.profiles
for update
to service_role
using (true)
with check (true);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_profiles_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, plan)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    'free'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user_profile();

commit;

-- Rollback guidance (manual):
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user_profile();
-- drop trigger if exists set_profiles_updated_at on public.profiles;
-- drop function if exists public.set_profiles_updated_at();
-- drop policy if exists profiles_select_own on public.profiles;
-- drop policy if exists profiles_insert_service_role on public.profiles;
-- drop policy if exists profiles_update_service_role on public.profiles;

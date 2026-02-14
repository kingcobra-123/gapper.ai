-- 1) Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  beta_access boolean not null default false,
  tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RLS enabled
alter table public.profiles enable row level security;

-- 3) Policy: authenticated users can read their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- (Intentionally no UPDATE/INSERT/DELETE policy: clients cannot toggle beta_access)

-- 4) Trigger function (SECURITY DEFINER + safe search_path)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, beta_access, tier)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    false,
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5) Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Rollback
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();

-- Verify
-- select * from pg_trigger where tgname = 'on_auth_user_created';

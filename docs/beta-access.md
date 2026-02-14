# Beta Access Gating (Option A)

This document configures profile-based gating for Web Terminal access.

## Overview
- Any authenticated user can sign up/sign in.
- Only users with `public.profiles.beta_access = true` can access Web Terminal.
- Non-approved users are blocked by frontend `<BetaGate>` and see a Beta pending experience.
- Access approval is done in Supabase Dashboard by toggling `beta_access`.

## SQL: Profiles + RLS + Trigger (copy/paste)

```sql
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
```

## Rollback SQL (safety)

If trigger behavior must be disabled quickly to unblock signups:

```sql
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
```

## Trigger verification query

```sql
select * from pg_trigger where tgname = 'on_auth_user_created';
```

## Trigger race handling in frontend

`src/data/profile.js` resolves profile with retry/backoff to absorb trigger timing lag:
- attempts: `3`
- delay: `500ms`
- jitter: `+/-100ms`

If profile is still missing after retries, status is returned as `missing` and UI provides manual retry.

## Optional profile upsert fallback (off by default)

`VITE_ALLOW_PROFILE_UPSERT_FALLBACK=false` by default.

When set to `true`, frontend can attempt a one-time upsert fallback and refetch if profile is missing after retries. This is optional and not required when trigger + RLS are correctly configured.

## Admin approval flow

1. Open Supabase Dashboard -> Table Editor -> `public.profiles`.
2. Find user row by `id` or `email`.
3. Set `beta_access=true`.
4. Save.

If Realtime is enabled for `public.profiles`, approved users can unlock without refresh. Otherwise they can use the **Check again** action in Beta pending UI.

## Troubleshooting

### Permission denied / RLS errors on profile reads
- Confirm `alter table public.profiles enable row level security;` is applied.
- Confirm policy `Users can view own profile` exists exactly as above.

### Profile missing after signup
- Confirm trigger exists via:
  - `select * from pg_trigger where tgname = 'on_auth_user_created';`
- Re-run trigger SQL block if missing.
- Use rollback only to disable broken trigger, then recreate with fixed SQL.

### Access does not update after admin approval
- Click **Check again** in Beta pending UI.
- If using realtime, verify realtime publication/subscription settings for `public.profiles`.

# Supabase Profiles Plan Migration

Migration file:
- `supabase/migrations/20260213_profiles_plan_auth.sql`

## What this migration enforces
- `public.profiles` includes `plan` with allowed values `free|premium`.
- Missing profile rows are backfilled from `auth.users` with `plan='free'`.
- `id` stays tied to `auth.users(id)` with `on delete cascade`.
- Existing FK definitions are normalized so `profiles.id -> auth.users.id` always uses `on delete cascade`.
- RLS is enabled:
  - authenticated users can `SELECT` only their own row (`id = auth.uid()`).
  - no authenticated user insert/update policy (prevents self-upgrade).
  - service role can insert/update for backend/admin operations.
- Any prior `public.profiles` policies are dropped before strict policies are recreated.
- Signup trigger auto-creates profile row with `plan='free'`.

## Apply
From the `gapper.ai` directory:

```bash
supabase db push
```

Or run SQL manually in Supabase SQL editor:

```sql
-- paste file contents from:
-- supabase/migrations/20260213_profiles_plan_auth.sql
```

## Verify
Run in Supabase SQL editor:

```sql
select relrowsecurity
from pg_class
where oid = 'public.profiles'::regclass;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

select tgname
from pg_trigger
where tgname = 'on_auth_user_created';
```

## Rollback (manual)
Rollback guidance is included at the bottom of the migration file.

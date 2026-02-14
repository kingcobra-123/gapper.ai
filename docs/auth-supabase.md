# Supabase Auth + Premium Gate Integration

## Runtime model
- Frontend signs users in with Supabase (`@supabase/supabase-js`).
- Frontend sends Supabase access token as `Authorization: Bearer ...` to backend.
- Backend validates JWT via Supabase JWKS (`/auth/v1/.well-known/jwks.json`), verifies `exp/iss/aud/sub`, and resolves plan from `public.profiles`.
- Backend returns user context from `GET /me` and uses it for terminal/channel/SSE authorization.

## Frontend env vars (`gapper.ai/.env`)
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_GAPPER_API_BASE_URL=http://localhost:8000
VITE_GAPPER_API_TIMEOUT_MS=8000
VITE_PREMIUM_GATE_ENABLED=false
NEXT_PUBLIC_PREMIUM_GATE_ENABLED=false
```

## Backend env vars (`gapper_bot/.env`)
```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PREMIUM_GATE_ENABLED=false
```

Optional backend overrides:
- `SUPABASE_JWKS_URL`
- `SUPABASE_ISSUER`
- `SUPABASE_JWT_AUDIENCE` (default: `authenticated`)
- `AUTH_SESSION_CACHE_TTL_SEC` (default: `900`)

## Security boundaries
- `SUPABASE_SERVICE_ROLE_KEY` is backend-only.
- Frontend only uses anon key (`VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Plan source of truth is Supabase `public.profiles.plan` (`free|premium`) with strict RLS.

## `/terminal` behavior
- While plan fetch is in-flight: loading skeleton only.
- Unauthenticated: sign-in prompt.
- Authenticated + free + gate enabled: paywall.
- Premium: terminal renders.

## SSE auth
- User-message stream uses `fetch()` streaming, not native `EventSource`.
- Reason: `EventSource` cannot send bearer authorization headers.
- Reconnect path re-reads current Supabase session token before each attempt.

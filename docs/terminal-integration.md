# Terminal Integration Note

## Location
- Embedded terminal source lives in `src/gapper_fe/src/`.
- Landing-to-terminal mount wrapper is `src/terminal/TerminalWorkspacePage.jsx`.
- View routing for `/` and `/terminal` is handled in `src/App.jsx`.

## Runtime architecture
- The integrated app is Vite-based (`npm run dev` / `npm run build` from repo root).
- A nested Next.js tree exists under `src/gapper_fe/app/*`, but the production-integrated runtime uses the Vite root.

## Auth and premium gate flow
- Supabase browser client signs users in.
- Terminal API calls include `Authorization: Bearer <supabase_access_token>`.
- Frontend resolves plan by calling backend `GET /me`.
- `/terminal` renders:
  - loading state while plan is being resolved,
  - sign-in prompt when unauthenticated,
  - paywall when gate is enabled and plan is `free`,
  - terminal only when allowed.

## SSE auth strategy
- User-message SSE uses `fetch()` streaming (`consumeUserMessagesStream`) instead of native `EventSource`.
- This allows sending bearer auth headers on connect and reconnect.
- On reconnect, the latest Supabase token is retrieved before each request.

## Runtime env vars
Set these in repo-root `.env` (see `.env.example`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GAPPER_API_BASE_URL`
- `VITE_GAPPER_API_TIMEOUT_MS`
- `VITE_PREMIUM_GATE_ENABLED`
- `NEXT_PUBLIC_PREMIUM_GATE_ENABLED`

Optional compatibility vars:
- `VITE_GAPPER_API_KEY` (legacy API-key fallback path)
- `VITE_AUTH_VERIFY_ENDPOINT`
- `VITE_AUTH_API_PROXY_TARGET`

## Security note
- Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend env files or `NEXT_PUBLIC_*` vars.

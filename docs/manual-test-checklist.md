# Manual Test Checklist

## Startup
1. Run backend: `npm run auth:server`.
2. Run frontend: `npm run dev`.
3. Confirm backend health: `GET http://127.0.0.1:8787/api/health` returns `ok: true`.

## Auth + Navbar
1. Confirm navbar does not flash logged-out controls during auth load.
2. Confirm `Sign in` and `Sign up` open modal overlays without route change.
3. Confirm modal shows social buttons: `Google`, `Facebook`, `X`.

## Email Signup Flow
1. Open `Sign up`.
2. Enter username (>= 2 chars), email, password (>= 6 chars).
3. Submit and verify either:
- session created and modal closes, or
- confirmation prompt appears with `Resend confirmation`.
4. Verify waitlist CTA is hidden after successful signup.
5. Verify access section shows signup-complete state and username/email.

## Social Login Flow
1. In modal, click each provider button (`Google`, `Facebook`, `X`) one at a time.
2. Verify redirect starts (or provider error is shown if provider not enabled).
3. After successful provider login, verify navbar shows logged-in state.

## Backend Token Verification
1. Authenticate (email or social).
2. Verify browser console includes backend verification success log.
3. Verify access section indicates backend token verification passed.

## Sign In / Sign Out
1. Sign in with valid credentials.
2. Verify modal closes and username/email is displayed.
3. Sign out.
4. Verify navbar and access section return to logged-out state.
5. Verify waitlist CTA is visible again only when not signed up and not authenticated.

## Beta Access Gate
1. Ensure `public.profiles.beta_access=false` for test user.
2. Click `Request Terminal Access` in hero.
3. Verify terminal is blocked by gate and Beta pending UI is shown.
4. Verify `Copy my email` and `Check again` actions work.
5. From Supabase dashboard, toggle `beta_access=true` for that user.
6. Verify terminal becomes accessible after `Check again` (or automatically if realtime is enabled).
7. Sign out and re-open terminal: verify gate now asks user to sign in.

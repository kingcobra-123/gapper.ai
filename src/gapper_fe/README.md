# gapper-ai-terminal

`gapper_fe` is the Next.js frontend for Gapper AI.

It now ships with a split UX:
- `/` is the landing page.
- `/terminal` is the full web terminal (`AppShell`) wired to the FastAPI backend.

## Current Access Model

- Terminal access is currently open for all users.
- Premium/beta access controls are planned for future rollout.
- Backend channel metadata may include premium flags, but the frontend does not hard-block terminal entry today.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Zustand (persisted client state)
- Framer Motion

## Route Map

| Route | Purpose |
| --- | --- |
| `/` | Marketing/landing page with CTA into terminal |
| `/terminal` | Main terminal experience (`src/components/shell/AppShell.tsx`) |
| `/settings` | Local UX and risk defaults (`SettingsView`) |
| `/pricing` | Static pricing placeholder |
| `/login` | Static login placeholder |

## Backend Wiring (Live Integration)

Primary transport is direct HTTP/SSE to the backend (`NEXT_PUBLIC_API_BASE_URL`).

### HTTP endpoints used

| Frontend action | Route function | Backend endpoint |
| --- | --- | --- |
| Card fetch with ETag support | `fetchCardDto` | `GET /card/{ticker}` |
| Analyze request | `postAnalyzeTickerDto` | `POST /analyze/{ticker}` |
| Pin request | `pinTickerDto` | `POST /pin/{ticker}` |
| Top movers bootstrap | `fetchTopGappersDto` | `GET /gappers/top?limit=` |
| Channel catalog hydrate | `fetchChannelsCatalogDto` | `GET /channels/catalog` |
| Channel subscriptions bootstrap | `fetchChannelsMeDto` | `GET /channels/me` |

Source: `src/api/routes.ts`.

### SSE streams used

| Stream | Client path | Backend endpoint |
| --- | --- | --- |
| Public card updates | `openCardsStream` | `GET /stream/cards` |
| Per-user channel messages | `consumeUserMessagesStream` | `GET /sse/user/messages` |

Notes:
- Card stream reconnect uses bounded retry/backoff behavior in composer flow.
- User-message stream is consumed through `fetch` stream parsing (not native `EventSource`) so auth headers can be sent.

## Terminal Command Flows

Command parsing happens in `src/lib/commands/parser.ts`, then execution is handled in `src/components/chat/ChatComposer.tsx`.

Supported patterns:
- `analyze <ticker>`
- `pin <ticker>`
- `card <ticker>`
- `<ticker>` shorthand
- slash variants like `/gap`, `/levels`, `/news`, `/scan gappers`

Typical flow:
1. Parse command and normalize ticker.
2. Call backend route(s).
3. Render adapted cards into chat/right panel widgets.
4. Track refresh state and update via SSE/card refetch.

## Data Adaptation + Missing State Policy

Frontend adapters normalize backend DTOs into renderable `AssistantCard[]` view models.

- Adapter layer: `src/api/adapters.ts`
- DTO/view-model types: `src/api/types.ts`
- Capability matrix: `src/config/backendCapabilities.ts`
- Shared missing-state UI: `src/components/common/MissingDataState.tsx`

Policy:
- Do not fabricate synthetic card data when backend fields are absent.
- Show explicit missing markers:
  - `missing_ticker_data`
  - `missing_backend_field`

Reference: `docs/module-12-frontend-backend-wiring.md`.

## State Model (Zustand)

| Store | Purpose |
| --- | --- |
| `useWorkspaceStore` | backend-driven channel catalog + active channel |
| `useWatchlistStore` | local watchlist, recents, ticker touch behavior |
| `useChatStore` | terminal message timeline and per-channel metadata |
| `useCardStore` | per-ticker adapted card cache/view models |
| `useUIStore` | theme, layout preset, command palette, overlays |

## Directory Guide

- `app/` - app-router pages (`/`, `/terminal`, `/settings`, `/pricing`, `/login`)
- `src/components/` - shell/chat/cards/widgets/modals/ui
- `src/api/` - transport, route functions, DTO adapters
- `src/lib/` - command parsing and channel helpers
- `src/stores/` - Zustand stores
- `src/types/` - shared UI and domain typing
- `tests/` - module12 frontend suites + workspace guard

## Environment Variables

Use the repo-root `.env` (single env file for integrated frontend):

```env
VITE_GAPPER_API_BASE_URL=http://localhost:8000
VITE_GAPPER_API_KEY=<optional-api-key>
VITE_GAPPER_API_TIMEOUT_MS=8000
VITE_AUTH_VERIFY_ENDPOINT=off
```

Behavior:
- `VITE_GAPPER_API_BASE_URL`: backend origin; default fallback in client is `http://localhost:8000`.
- `VITE_GAPPER_API_KEY`: sent as `X-API-Key` when present.
- `VITE_GAPPER_API_TIMEOUT_MS`: timeout for non-stream HTTP requests (streaming route uses no hard timeout).
- `VITE_AUTH_VERIFY_ENDPOINT`: auth verify route (`/api/auth/verify`) or `off`.

## Local Development

```bash
# from repo root
npm install
npm run dev
```

Open:
- `http://localhost:5173/` for landing
- `http://localhost:5173/terminal` for terminal

## Scripts

- Run scripts from repo root (`package.json` at project root).
- Standalone `src/gapper_fe` app scripts are retired in the integrated frontend setup.
- Module12 test commands under `src/gapper_fe` remain available for targeted terminal QA.

## Verification Checklist

```bash
npm run build
node --test --loader ./src/gapper_fe/tests/tsx_test_loader.mjs ./src/gapper_fe/tests/module12_frontend_backend_live.test.ts
```

Optional full module12 pass:

```bash
node --test --loader ./src/gapper_fe/tests/tsx_test_loader.mjs ./src/gapper_fe/tests/module12_frontend_backend_live.test.ts
```

## Known Limitations

- `/login` and `/pricing` are placeholders (no production auth or billing UX in this module).
- Analyze/pin/channels features still depend on backend auth policy and configured API key.
- Some advanced card fields remain backend-dependent and surface explicit missing-state UI until backend coverage is expanded.

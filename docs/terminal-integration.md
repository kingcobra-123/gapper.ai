# Terminal Integration Note

## Location
- Embedded terminal source lives in `src/gapper_fe/src/`.
- Landing-to-terminal mount wrapper is `src/terminal/TerminalWorkspacePage.jsx`.
- View switching for `/` and `/terminal` is handled in `src/App.jsx`.

## Development
- Run the combined app from repo root:
  - `npm run dev`
  - `npm run build`
- `src/gapper_fe/package.json` standalone `dev/build/start/lint` scripts are intentionally disabled.

## Runtime Env Vars
Set these in `.env` (see `.env.example`):
- `VITE_GAPPER_API_BASE_URL` (backend base URL)
- `VITE_GAPPER_API_KEY` (optional API key)
- `VITE_GAPPER_API_TIMEOUT_MS` (HTTP timeout in ms)
- `VITE_WEB_TERMINAL_MIN_TIER` (`free|basic|premium`)

Compatibility fallback vars still supported by terminal API adapters:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_KEY`
- `NEXT_PUBLIC_API_TIMEOUT_MS`

SSE/HTTP continue to connect directly to backend endpoints (no frontend proxy required for terminal APIs).

# Module 12: Frontend-Backend Wiring (No Synthetic Fallbacks)

## 1) Summary of changes

- Implemented reusable missing-state primitives:
  - `MissingField` / `MissingDataBlock` types: `gapper_fe/src/types/missing.ts:1`
  - optional card `missing` metadata + optional `data`: `gapper_fe/src/types/chat.ts:19`
  - reusable UI state component: `gapper_fe/src/components/common/MissingDataState.tsx:13`
- Added backend capability map and reason resolver (`missing_ticker_data` vs `missing_backend_field`):
  - `gapper_fe/src/config/backendCapabilities.ts:6`
- Rewrote frontend card adapter to stop generating synthetic card content and emit explicit missing markers:
  - `gapper_fe/src/api/adapters.ts:331`
- Replaced widget-only placeholders with missing-data rendering:
  - mini chart: `gapper_fe/src/components/widgets/MiniChartWidget.tsx:49`
  - gap analysis: `gapper_fe/src/components/widgets/GapAnalysisWidget.tsx:23`
  - sentiment fallback cleanup: `gapper_fe/src/components/widgets/SentimentGaugeWidget.tsx:25`
- Removed Layout B fixed sentiment fallback (`62`) and replaced with missing-state messaging:
  - `gapper_fe/src/components/shell/Layout2Board.tsx:45`
- Added compact missing-state rendering in card and right-side utility panel surfaces:
  - card renderer: `gapper_fe/src/components/cards/CardRenderer.tsx:136`
  - right panel tabs: `gapper_fe/src/components/shell/RightPanel.tsx:106`
- Added tiny, lightweight CSS animation hooks for missing-state UI:
  - `gapper_fe/app/globals.css:134`

## 2) Synthetic fields removed (with file references)

`gapper_fe/src/api/adapters.ts`

- Removed synthetic snapshot sparkline generation (`buildSparkline` path); now only backend series is used, else missing marker:
  - sparkline parse + missing: `gapper_fe/src/api/adapters.ts:384`
- Removed snapshot `highlights[]` template text synthesis:
  - now backend-only highlights + missing marker: `gapper_fe/src/api/adapters.ts:393`
- Removed levels fallback support/resistance/pivot/entry/invalidation synthesis:
  - backend-only levels mapping + missing markers: `gapper_fe/src/api/adapters.ts:438`
- Removed levels `highlights[]` template synthesis:
  - backend-only highlights + missing marker: `gapper_fe/src/api/adapters.ts:444`
- Removed fallback news item generation when backend news is absent:
  - missing marker instead of synthetic item: `gapper_fe/src/api/adapters.ts:232`
- Removed `example.com` news URL fallback:
  - URL preserved only if backend provides one: `gapper_fe/src/api/adapters.ts:250`
- Removed frontend-generated `risk_plan` heuristics/bullets:
  - now explicit missing-schema card: `gapper_fe/src/api/adapters.ts:533`
- Removed frontend-generated `trade_idea` heuristics/triggers:
  - now explicit missing-schema card: `gapper_fe/src/api/adapters.ts:546`
- Removed inferred `gap_analysis.direction`, `setupQuality`, fallback `premarketVolume`, and hardcoded `plan[]`:
  - backend-only parse + missing markers: `gapper_fe/src/api/adapters.ts:559`

`gapper_fe/src/components/widgets/MiniChartWidget.tsx`
- Removed widget placeholder sparkline path; renders missing state when series absent/invalid:
  - `gapper_fe/src/components/widgets/MiniChartWidget.tsx:49`

`gapper_fe/src/components/widgets/GapAnalysisWidget.tsx`
- Removed widget fallback gap/setup/direction inference; partial payload now renders missing state:
  - `gapper_fe/src/components/widgets/GapAnalysisWidget.tsx:33`

`gapper_fe/src/components/shell/Layout2Board.tsx`
- Removed fallback sentiment value `62`; now explicit missing-schema messaging:
  - `gapper_fe/src/components/shell/Layout2Board.tsx:45`

## 3) Missing-data behavior by card/widget

### Shared behavior

- Missing reasons are labeled as:
  - `Missing (ticker)` for supported backend fields that are absent for the current ticker.
  - `Missing (schema)` for fields/cards backend does not provide yet.
- Rendering component:
  - `gapper_fe/src/components/common/MissingDataState.tsx:13`

### Cards (chat cards and utility panel)

- `ticker_snapshot`
  - missing markers include keys like `ticker_snapshot.sparkline.series`, `ticker_snapshot.highlights`:
  - `gapper_fe/src/api/adapters.ts:384`
- `levels`
  - missing markers include `levels.pivot`, `levels.entryZone`, `levels.invalidation`, etc.:
  - `gapper_fe/src/api/adapters.ts:438`
- `news`
  - missing markers include `news.items` and `news.items.url`:
  - `gapper_fe/src/api/adapters.ts:228`
- `risk_plan`
  - always explicit missing-schema card (no fabricated plan):
  - `gapper_fe/src/api/adapters.ts:533`
- `trade_idea`
  - always explicit missing-schema card (no fabricated triggers/thesis/targets):
  - `gapper_fe/src/api/adapters.ts:546`
- `gap_analysis`
  - missing markers for `direction`, `setupQuality`, `plan` when backend omits them:
  - `gapper_fe/src/api/adapters.ts:559`

### Widgets

- Mini chart widget
  - headline: `Chart's on coffee break ☕`
  - required key shown: `ticker_snapshot.sparkline.series`
  - file: `gapper_fe/src/components/widgets/MiniChartWidget.tsx:80`
- Gap analysis widget
  - headline: `Gap report misplaced its sticky notes 🗒️`
  - required keys shown when partial: `gap_analysis.gapPercent`, `gap_analysis.direction`, `gap_analysis.setupQuality`, `gap_analysis.premarketVolume`
  - file: `gapper_fe/src/components/widgets/GapAnalysisWidget.tsx:71`
- Sentiment widget / Layout B
  - no numeric fallback; shows `--` and missing key `sentiment.value`
  - files:
    - `gapper_fe/src/components/widgets/SentimentGaugeWidget.tsx:33`
    - `gapper_fe/src/components/shell/Layout2Board.tsx:45`

## 4) Backend gap list (actionable)

Capability source of truth:
- `gapper_fe/src/config/backendCapabilities.ts:6`

### By card type

- `ticker_snapshot`
  - missing-schema today: `ticker_snapshot.sparkline.series`, `ticker_snapshot.highlights`
  - backend should provide:
    - short intraday series (3+ points)
    - optional highlight bullet array
  - refs: `gapper_fe/src/config/backendCapabilities.ts:21`, `gapper_fe/src/api/adapters.ts:390`

- `levels`
  - missing-schema today: `levels.pivot`, `levels.entryZone`, `levels.invalidation`, `levels.highlights`
  - backend should provide:
    - explicit pivot
    - explicit entry zone tuple/object
    - invalidation level
    - level commentary list
  - refs: `gapper_fe/src/config/backendCapabilities.ts:26`, `gapper_fe/src/api/adapters.ts:452`

- `news`
  - supported but ticker-optional fields: `news.items`, `news.items.url`
  - backend should provide:
    - stable news array per ticker
    - canonical URL per item where available
  - refs: `gapper_fe/src/config/backendCapabilities.ts:31`, `gapper_fe/src/api/adapters.ts:233`

- `risk_plan`
  - card unsupported (schema gap)
  - backend should provide:
    - risk profile, size, stop, targets, and plan bullets
  - refs: `gapper_fe/src/config/backendCapabilities.ts:11`, `gapper_fe/src/api/adapters.ts:539`

- `trade_idea`
  - card unsupported (schema gap)
  - backend should provide:
    - bias, thesis, entry/stop/targets, triggers, confidence
  - refs: `gapper_fe/src/config/backendCapabilities.ts:12`, `gapper_fe/src/api/adapters.ts:552`

- `gap_analysis`
  - missing-schema today: `gap_analysis.direction`, `gap_analysis.setupQuality`, `gap_analysis.plan`
  - partially ticker-dependent: `gap_analysis.gapPercent`, `gap_analysis.premarketVolume`, `gap_analysis.floatM`, `gap_analysis.catalyst`
  - backend should provide:
    - explicit direction
    - setup quality score
    - plan bullets
  - refs: `gapper_fe/src/config/backendCapabilities.ts:35`, `gapper_fe/src/api/adapters.ts:571`

## 5) Reproduction steps

1. Start frontend in `gapper_fe`:
   - `npm run dev`
2. Scenario A (fully populated backend fields for supported cards)
   - ensure backend `/card/{ticker}` includes real `raw_sources.market_snapshot.sparkline_series`, levels fields, and news URLs.
   - expected:
     - mini chart renders line (no missing block)
     - no synthetic bullets/placeholder URLs are introduced
3. Scenario B (missing/partial backend fields)
   - remove/omit fields from backend response (e.g., `sparkline_series`, `gap_analysis.direction`, news URLs, or entire card data).
   - expected:
     - `MissingDataState` appears with key list and reason labels
     - no synthetic sparkline, no fake news entry, no fake risk/trade plans
4. Quick automated checks run in this module:
   - `npm run test:module12`
   - `npm run build`

## 6) Layout change statement

No layout or panel structure changes were made. Changes are constrained to data adaptation, content fallback behavior, and in-place missing-state rendering inside existing containers.

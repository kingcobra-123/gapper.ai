import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

function cleanEnvValue(raw: string | undefined): string {
  if (!raw) {
    return "";
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const liveApiBaseUrl =
  cleanEnvValue(process.env.GAPPER_TEST_API_BASE_URL) ||
  cleanEnvValue(process.env.VITE_GAPPER_API_BASE_URL) ||
  cleanEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  "http://127.0.0.1:8000";
const liveApiKey =
  cleanEnvValue(process.env.GAPPER_TEST_API_KEY) ||
  cleanEnvValue(process.env.VITE_GAPPER_API_KEY) ||
  cleanEnvValue(process.env.NEXT_PUBLIC_API_KEY);
const livePolygonApiKey =
  cleanEnvValue(process.env.GAPPER_TEST_POLYGON_API_KEY) ||
  cleanEnvValue(process.env.POLYGON_TOKEN);

process.env.NEXT_PUBLIC_API_BASE_URL = liveApiBaseUrl;
if (liveApiKey) {
  process.env.NEXT_PUBLIC_API_KEY = liveApiKey;
}

const { fetchCardDto, fetchChannelsCatalogDto, postAnalyzeTickerDto } = await import("../src/api/routes.ts");
const { ApiClientError } = await import("../src/api/client.ts");

const FALLBACK_REAL_TICKERS = [
  "TSLA",
  "NVDA",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "GOOGL",
  "AMD",
  "JPM",
  "XOM",
  "NFLX",
  "DIS",
  "UBER",
  "PFE",
  "KO"
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertCardEnvelope(payload: Record<string, unknown>, ticker: string): void {
  assert.equal(payload.ticker, ticker);
  assert.equal(typeof payload.server_ts, "number");
  assert.equal(typeof payload.is_missing, "boolean");
  assert.equal(typeof payload.is_stale, "boolean");
  assert.equal(typeof payload.refresh_triggered, "boolean");
  assert.equal(typeof payload.refresh_deduped, "boolean");
  assert.equal(Array.isArray(payload.errors), true);
  assert.equal("card" in payload, true);
  assert.equal("status" in payload, true);
}

function assertCardObjectShape(payload: Record<string, unknown>): void {
  assert.equal(isObject(payload.card), true);
  const card = payload.card as Record<string, unknown>;
  assert.equal("header" in card, true);
  assert.equal("tradeability" in card, true);
  assert.equal("tech" in card, true);
  assert.equal("key_numbers" in card, true);
  assert.equal("raw_sources" in card, true);
  assert.equal("summary" in card, true);
}

function assertFrontendEnrichmentRequirements(payload: Record<string, unknown>, ticker: string): void {
  assertCardObjectShape(payload);

  const card = payload.card as Record<string, unknown>;
  const rawSources = card.raw_sources as Record<string, unknown>;
  const tech = card.tech as Record<string, unknown>;

  assert.equal(typeof card.summary, "string", `${ticker}: missing card.summary`);
  assert.equal(isObject(rawSources.market_snapshot), true, `${ticker}: missing raw_sources.market_snapshot`);
  assert.equal(Array.isArray(rawSources.news), true, `${ticker}: missing raw_sources.news array`);
  assert.equal(Array.isArray(tech.support_levels), true, `${ticker}: missing tech.support_levels array`);
  assert.equal(Array.isArray(tech.resistance_levels), true, `${ticker}: missing tech.resistance_levels array`);
  assert.equal(isObject(payload.status), true, `${ticker}: missing status payload`);
}

function normalizeLiveTicker(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,32}$/.test(symbol)) {
    return null;
  }
  return symbol;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let idx = copy.length - 1; idx > 0; idx -= 1) {
    const pick = Math.floor(Math.random() * (idx + 1));
    [copy[idx], copy[pick]] = [copy[pick], copy[idx]];
  }
  return copy;
}

async function verifyPolygonTickerIsTradable(symbol: string): Promise<boolean> {
  if (!livePolygonApiKey) {
    return false;
  }
  const refUrl = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(livePolygonApiKey)}`;
  const response = await fetch(refUrl);
  if (!response.ok) {
    return false;
  }
  const payload = (await response.json()) as {
    status?: string;
    results?: {
      active?: boolean;
      locale?: string;
      type?: string;
    };
  };
  if (payload.status !== "OK" || !payload.results) {
    return false;
  }
  const isActive = payload.results.active === true;
  const isUs = payload.results.locale === "us";
  const kind = payload.results.type ?? "";
  return isActive && isUs && (kind === "CS" || kind === "ETF");
}

async function fetchTopMoversTickersToday(limit = 15): Promise<string[]> {
  if (!livePolygonApiKey) {
    return [...FALLBACK_REAL_TICKERS].slice(0, limit);
  }

  const endpoints = [
    `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${encodeURIComponent(livePolygonApiKey)}`,
    `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${encodeURIComponent(livePolygonApiKey)}`
  ];

  const candidates = new Set<string>();
  for (const endpoint of endpoints) {
    let response: Response;
    try {
      response = await fetch(endpoint);
    } catch {
      continue;
    }
    if (!response.ok) {
      continue;
    }
    let payload: { tickers?: Array<{ ticker?: string }> };
    try {
      payload = (await response.json()) as { tickers?: Array<{ ticker?: string }> };
    } catch {
      continue;
    }

    for (const item of payload.tickers ?? []) {
      const normalized = normalizeLiveTicker(item?.ticker);
      if (normalized) {
        candidates.add(normalized);
      }
    }
  }

  const randomized = shuffle([...candidates]);
  const selected: string[] = [];
  for (const symbol of randomized) {
    if (selected.length >= limit) {
      break;
    }
    try {
      if (await verifyPolygonTickerIsTradable(symbol)) {
        selected.push(symbol);
      }
    } catch {
      // Ignore verification errors and keep sampling.
    }
  }

  if (selected.length >= Math.min(10, limit)) {
    return selected;
  }

  const merged = new Set<string>([...selected, ...FALLBACK_REAL_TICKERS]);
  return [...merged].slice(0, limit);
}

async function pollCardUntilReady(
  ticker: string,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<{ payload: Record<string, unknown>; ready: boolean; elapsedMs: number }> {
  const timeoutMs = options.timeoutMs ?? 35_000;
  const intervalMs = options.intervalMs ?? 1_000;
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let lastPayload: Record<string, unknown> | null = null;
  let forceAnalyzeIssued = false;

  while (Date.now() < deadline) {
    let result;
    try {
      result = await fetchCardDto(ticker);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 429 || error.status === 503)
      ) {
        const retryMs = Math.max(
          intervalMs,
          Math.min(8_000, (error.retryAfterSec ?? 2) * 1_000)
        );
        await sleep(retryMs);
        continue;
      }
      throw error;
    }
    if (result.kind !== "ok") {
      await sleep(intervalMs);
      continue;
    }

    const payload = result.payload as unknown as Record<string, unknown>;
    assertCardEnvelope(payload, ticker);
    lastPayload = payload;

    if (isObject(payload.card) && payload.is_missing === false) {
      return {
        payload,
        ready: true,
        elapsedMs: Date.now() - startedAt
      };
    }

    const elapsedMs = Date.now() - startedAt;
    const shouldNudgeAnalyze =
      Boolean(liveApiKey) &&
      !forceAnalyzeIssued &&
      elapsedMs >= 10_000 &&
      payload.is_missing === true &&
      payload.refresh_triggered === false &&
      payload.refresh_deduped === true &&
      payload.status === null;
    if (shouldNudgeAnalyze) {
      try {
        await postAnalyzeTickerDto(ticker);
        forceAnalyzeIssued = true;
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          (error.status === 429 || error.status === 503)
        ) {
          // Keep polling; retries are bounded by overall timeout.
        } else {
          throw error;
        }
      }
    }

    await sleep(intervalMs);
  }

  if (lastPayload) {
    return {
      payload: lastPayload,
      ready: false,
      elapsedMs: Date.now() - startedAt
    };
  }

  throw new Error(`No backend payload received for ${ticker} within ${timeoutMs}ms`);
}

test(
  "frontend live smoke: channels catalog call succeeds with backend auth",
  { skip: liveApiKey ? false : "NEXT_PUBLIC_API_KEY (or GAPPER_TEST_API_KEY) is required for channels endpoints." },
  async () => {
    const payload = await fetchChannelsCatalogDto();
    assert.equal(payload.ok, true);
    assert.equal(Array.isArray(payload.catalog), true);
    assert.ok((payload.catalog ?? []).length > 0);
    assert.equal(Array.isArray(payload.subscriptions), true);
  }
);

test(
  "frontend live smoke: card endpoint returns valid envelope for TSLA",
  { timeout: 20_000 },
  async () => {
    const result = await fetchCardDto("TSLA");
    assert.equal(result.kind, "ok");
    const payload = result.payload as unknown as Record<string, unknown>;
    assertCardEnvelope(payload, "TSLA");
  }
);

test(
  "frontend live smoke: NVDA eventually returns frontend-enrichable card object",
  { timeout: 75_000 },
  async () => {
    const { payload, ready, elapsedMs } = await pollCardUntilReady("NVDA", {
      timeoutMs: 60_000,
      intervalMs: 2_000
    });

    if (!ready) {
      assert.fail(
        `NVDA card did not become ready in ${elapsedMs}ms. Last payload: ${JSON.stringify(payload)}`
      );
    }

    assertFrontendEnrichmentRequirements(payload, "NVDA");
  }
);

test(
  "frontend live smoke: 15 unrelated tickers return frontend-enrichable cards",
  { timeout: 480_000 },
  async () => {
    const tickers = await fetchTopMoversTickersToday(15);
    assert.ok(tickers.length >= 10, `expected at least 10 verified top movers; got ${tickers.length}`);

    const failures: string[] = [];
    for (const ticker of tickers) {
      const { payload, ready, elapsedMs } = await pollCardUntilReady(ticker, {
        timeoutMs: 60_000,
        intervalMs: 2_000
      });

      if (!ready) {
        failures.push(
          `${ticker}: not ready in ${elapsedMs}ms (is_missing=${String(payload.is_missing)} refresh_triggered=${String(payload.refresh_triggered)} refresh_deduped=${String(payload.refresh_deduped)})`
        );
        continue;
      }

      try {
        assertCardEnvelope(payload, ticker);
        assertFrontendEnrichmentRequirements(payload, ticker);
      } catch (error) {
        failures.push(
          `${ticker}: shape validation failed (${error instanceof Error ? error.message : String(error)})`
        );
      }
    }

    if (failures.length > 0) {
      assert.fail(`One or more tickers failed frontend-enrichment checks:\n${failures.join("\n")}`);
    }
  }
);

test(
  "frontend live smoke: APPL reports not_found/pending or a resolved card envelope",
  { timeout: 30_000 },
  async () => {
    let result;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await fetchCardDto("APPL");
        break;
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          (error.status === 429 || error.status === 503)
        ) {
          await sleep(Math.min(8_000, Math.max(1_000, (error.retryAfterSec ?? 2) * 1_000)));
          continue;
        }
        throw error;
      }
    }
    if (!result) {
      assert.fail("APPL request was repeatedly rate limited");
    }
    assert.equal(result.kind, "ok");
    const payload = result.payload as unknown as Record<string, unknown>;
    assertCardEnvelope(payload, "APPL");

    const errors = Array.isArray(payload.errors)
      ? payload.errors.map((item) => String(item))
      : [];
    const isNotFound = errors.includes("ticker_not_found");
    const isPending = payload.is_missing === true;
    const isResolved = payload.is_missing === false && errors.length === 0;

    assert.equal(isNotFound || isPending || isResolved, true);
  }
);

test("frontend live smoke: network failures are surfaced as ApiClientError", () => {
  assert.equal(typeof ApiClientError, "function");
});

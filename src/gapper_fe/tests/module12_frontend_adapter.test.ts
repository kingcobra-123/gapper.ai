import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptCardResponse,
  normalizeTickerSymbol,
  parseCardUpdatedEvent,
  selectCardsForIntent
} from "../src/api/adapters.ts";

test("normalizeTickerSymbol handles frontend ticker forms", () => {
  assert.equal(normalizeTickerSymbol("$NVDA"), "NVDA");
  assert.equal(normalizeTickerSymbol(" nvda "), "NVDA");
  assert.equal(normalizeTickerSymbol("NVDA.US"), "NVDA");
  assert.equal(normalizeTickerSymbol("nvda.nasdaq"), "NVDA");
  assert.equal(normalizeTickerSymbol("BRK.B"), "BRK.B");
  assert.equal(normalizeTickerSymbol("AAPL🔥"), "AAPL");
  assert.equal(normalizeTickerSymbol(""), null);
});

test("adaptCardResponse keeps backend data and removes synthetic fallback content", () => {
  const payload = {
    ticker: "nvda",
    card: {
      header: { ticker: "NVDA", as_of: "2026-02-09T20:00:00Z" },
      summary: "Strong momentum with clean continuation setup.",
      tradeability: {
        sentiment: "BULLISH",
        confidence: 0.84,
        catalyst_type: "Earnings",
        recency_bucket: "RECENT",
        impact_score: 0.03
      },
      tech: {
        current_price: 800,
        support_levels: [790, 782],
        resistance_levels: [815, 824],
        pivot: 801.4,
        entry_zone: [799.8, 803.0],
        invalidation: 788.4,
        highlights: ["Mapped from backend technical snapshot"]
      },
      highlights: ["Backend supplied snapshot highlight"],
      news_highlights: ["Backend supplied news highlight"],
      raw_sources: {
        market_snapshot: {
          session_open_px: 780,
          volume: 1200000,
          rel_volume: 2.1,
          float_millions: 2400,
          premarket_volume: 250000,
          gap_pct: 4.5,
          sparkline_series: [790.2, 792.5, 794.1, 796.8, 799.9, 801.1],
          sparkline_points_30d: [
            { date: "2026-01-30", price: 780.4 },
            { date: "2026-01-31", price: 786.2 },
            { date: "2026-02-01", price: 790.2 }
          ]
        },
        news: [
          {
            title: "NVDA extends premarket gains",
            article_url: "https://news.example/nvda",
            source: "MarketWire",
            sentiment: "BULLISH",
            published_at: "2026-02-09T19:55:00Z"
          },
          {
            title: "Second wire item",
            source_url: "https://source.example/nvda-2",
            source: "TapeFeed",
            sentiment: "BEARISH",
            published_at: "2026-02-09T19:50:00Z"
          }
        ]
      }
    },
    status: {
      ticker: "NVDA",
      version: 7,
      last_analyzed_at: "2026-02-09T19:59:00Z",
      next_refresh_at: "2026-02-09T20:04:00Z"
    },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"NVDA:7"',
    server_ts: 1770586800,
    errors: []
  };

  const vm = adaptCardResponse(payload as never);
  assert.equal(vm.ticker, "NVDA");
  assert.equal(vm.summary.includes("Strong momentum"), true);
  assert.equal(vm.cards.length, 6);
  assert.equal(typeof vm.sentiment?.value, "number");
  assert.equal((vm.sentiment?.breakdown.length ?? 0) >= 2, true);

  const snapshot = vm.cards.find((card) => card.type === "ticker_snapshot");
  assert.ok(snapshot);
  assert.equal(snapshot.data?.ticker, "NVDA");
  assert.equal(Number((snapshot.data?.changePercent ?? 0).toFixed(2)), 2.56);
  assert.equal(snapshot.data?.relativeVolume, 2.1);
  assert.equal(Array.isArray(snapshot.data?.sparkline), true);
  assert.equal(Array.isArray(snapshot.data?.sparklinePoints30d), true);
  assert.equal(snapshot.data?.sparklinePoints30d?.[0]?.date, "2026-01-30");
  assert.equal(snapshot.missing?.fields.some((field) => field.key === "ticker_snapshot.sparkline.series") ?? false, false);

  const news = vm.cards.find((card) => card.type === "news");
  assert.ok(news);
  assert.equal(news.data?.items?.[0]?.url, "https://news.example/nvda");
  assert.equal(news.data?.items?.[1]?.url, "https://source.example/nvda-2");
  assert.equal(news.data?.items?.some((item) => item.url?.includes("example.com")) ?? false, false);

  const risk = vm.cards.find((card) => card.type === "risk_plan");
  assert.ok(risk);
  assert.equal(risk.data, undefined);
  assert.equal(risk.missing?.fields[0]?.key, "risk_plan");
  assert.equal(risk.missing?.fields[0]?.reason, "missing_backend_field");

  const tradeIdea = vm.cards.find((card) => card.type === "trade_idea");
  assert.ok(tradeIdea);
  assert.equal(tradeIdea.data, undefined);
  assert.equal(tradeIdea.missing?.fields[0]?.key, "trade_idea");
});

test("adaptCardResponse forces weekend snapshot change to zero", () => {
  const vm = adaptCardResponse({
    ticker: "msft",
    card: {
      header: { ticker: "MSFT", as_of: "2026-02-08T14:30:00Z" },
      summary: "Weekend snapshot check",
      tradeability: { sentiment: "NEUTRAL", confidence: 0.6, impact_score: 0.5 },
      tech: { current_price: 410.25, support_levels: [404], resistance_levels: [415] },
      raw_sources: {
        market_snapshot: {
          session_open_px: 401.0,
          volume: 1000,
          rel_volume: 1.1,
          float_millions: 7400
        }
      }
    },
    status: { ticker: "MSFT", version: 11 },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"MSFT:11"',
    server_ts: 1770586800,
    errors: []
  } as never);

  const snapshot = vm.cards.find((card) => card.type === "ticker_snapshot");
  assert.ok(snapshot);
  assert.equal(snapshot.data?.changePercent, 0);
  assert.equal(
    snapshot.missing?.fields.some((field) => field.key === "ticker_snapshot.changePercent") ?? false,
    false
  );
});

test("adaptCardResponse degrades safely with explicit missing markers and no fake data", () => {
  const vm = adaptCardResponse({
    ticker: "tsla",
    card: "broken-shape" as unknown as Record<string, unknown>,
    status: null,
    is_missing: true,
    is_stale: true,
    refresh_triggered: true,
    refresh_deduped: false,
    etag: null,
    server_ts: 1770586800,
    errors: ["ticker_not_found"]
  });

  assert.equal(vm.ticker, "TSLA");
  assert.equal(vm.isMissing, true);
  assert.equal(vm.isStale, true);
  assert.equal(vm.refreshTriggered, true);
  assert.equal(vm.errors.includes("ticker_not_found"), true);
  assert.equal(vm.cards.length, 6);
  assert.equal(vm.summary.includes("No backend summary available"), true);
  assert.equal(vm.sentiment?.value, undefined);
  assert.equal(vm.sentiment?.missing?.fields.some((field) => field.key === "sentiment.value"), true);

  const snapshot = vm.cards.find((card) => card.type === "ticker_snapshot");
  assert.ok(snapshot);
  assert.equal(snapshot.data?.sparkline, undefined);
  assert.equal(snapshot.missing?.fields.some((field) => field.key === "ticker_snapshot.sparkline.series"), true);

  const news = vm.cards.find((card) => card.type === "news");
  assert.ok(news);
  assert.equal(news.data?.items?.length ?? 0, 0);
  assert.equal(news.data?.items?.some((item) => item.url?.includes("example.com")) ?? false, false);

  const gap = vm.cards.find((card) => card.type === "gap_analysis");
  assert.ok(gap);
  assert.equal(gap.data?.direction, undefined);
  assert.equal(gap.data?.setupQuality, undefined);
  assert.equal(gap.data?.plan, undefined);
});

test("adaptCardResponse derives floatM from float_shares and consumes news_top5 fallback", () => {
  const vm = adaptCardResponse({
    ticker: "AMD",
    card: {
      header: { ticker: "AMD", as_of: "2026-02-10T20:00:00Z" },
      summary: "Backend summary",
      tradeability: { sentiment: "BULLISH", confidence: 0.7, impact_score: 0.05 },
      tech: { current_price: 178.2, support_levels: [176], resistance_levels: [181] },
      raw_sources: {
        market_snapshot: {
          volume: 3200000,
          rvol_full_day: 1.9,
          float_shares: 12500000
        },
        news_top5: [
          {
            title: "AMD sec filing update",
            source: "WireA",
            article_url: "https://news.example/amd-1",
            published_at: "2026-02-10T19:00:00Z"
          },
          {
            title: "AMD upgrade after data-center momentum",
            source: "WireB",
            article_url: "https://news.example/amd-2",
            published_at: "2026-02-10T18:30:00Z"
          }
        ]
      }
    },
    status: { ticker: "AMD", version: 21 },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"AMD:21"',
    server_ts: 1770586800,
    errors: []
  } as never);

  const snapshot = vm.cards.find((card) => card.type === "ticker_snapshot");
  assert.ok(snapshot);
  assert.equal(snapshot.data?.floatM, 12.5);
  assert.equal(snapshot.data?.relativeVolume, 1.9);
  assert.equal(snapshot.missing?.fields.some((field) => field.key === "ticker_snapshot.floatM") ?? false, false);

  const news = vm.cards.find((card) => card.type === "news");
  assert.ok(news);
  assert.equal(news.data?.items?.length, 2);
  assert.equal(news.data?.items?.[0]?.url, "https://news.example/amd-1");
  assert.equal((news.data?.highlights?.length ?? 0) > 0, true);
  assert.equal(news.missing?.fields.some((field) => field.key === "news.highlights") ?? false, false);
});

test("news adapter prioritizes signal headlines, keeps latest first, and caps at five", () => {
  const vm = adaptCardResponse({
    ticker: "META",
    card: {
      header: { ticker: "META", as_of: "2026-02-10T20:00:00Z" },
      summary: "Backend summary",
      tradeability: { sentiment: "BULLISH", confidence: 0.65, impact_score: 0.02 },
      tech: { current_price: 500, support_levels: [492], resistance_levels: [510] },
      raw_sources: {
        market_snapshot: { volume: 1200, rel_volume: 1.6, float_millions: 2200 },
        news: [
          {
            title: "META SEC filing updates guidance",
            source: "WireA",
            published_at: "2026-02-10T20:00:00Z"
          },
          {
            title: "Analyst upgrade follows strong ad trends",
            source: "WireB",
            published_at: "2026-02-10T19:50:00Z"
          },
          {
            title: "META breakout after earnings beat",
            source: "WireC",
            published_at: "2026-02-10T19:40:00Z"
          },
          {
            title: "Options flow turns bullish",
            source: "WireD",
            sentiment: "BULLISH",
            published_at: "2026-02-10T19:30:00Z"
          },
          {
            title: "Short-term tape turns bearish",
            source: "WireE",
            sentiment: "BEARISH",
            published_at: "2026-02-10T19:20:00Z"
          },
          {
            title: "General market wrap, no catalyst",
            source: "Noise1",
            published_at: "2026-02-10T19:10:00Z"
          },
          {
            title: "Sector commentary remains mixed",
            source: "Noise2",
            published_at: "2026-02-10T19:05:00Z"
          }
        ]
      }
    },
    status: { ticker: "META", version: 12 },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"META:12"',
    server_ts: 1770586800,
    errors: []
  } as never);

  const news = vm.cards.find((card) => card.type === "news");
  assert.ok(news);
  const headlines = news.data?.items?.map((item) => item.headline) ?? [];
  assert.equal(headlines.length, 5);
  assert.equal(headlines[0], "META SEC filing updates guidance");
  assert.equal(headlines.includes("General market wrap, no catalyst"), false);
});

test("news adapter falls back to latest noise headlines when no signals exist", () => {
  const vm = adaptCardResponse({
    ticker: "KO",
    card: {
      header: { ticker: "KO", as_of: "2026-02-10T20:00:00Z" },
      summary: "Backend summary",
      tradeability: { sentiment: "NEUTRAL", confidence: 0.5, impact_score: 0 },
      tech: { current_price: 60, support_levels: [59], resistance_levels: [61] },
      raw_sources: {
        market_snapshot: { volume: 800, rel_volume: 1.1, float_millions: 4200 },
        news: [
          { title: "KO morning wrap", source: "NoiseA", published_at: "2026-02-10T20:00:00Z" },
          { title: "KO midday chatter", source: "NoiseB", published_at: "2026-02-10T19:00:00Z" },
          { title: "KO sector tone", source: "NoiseC", published_at: "2026-02-10T18:00:00Z" },
          { title: "KO desk notes", source: "NoiseD", published_at: "2026-02-10T17:00:00Z" },
          { title: "KO flow update", source: "NoiseE", published_at: "2026-02-10T16:00:00Z" },
          { title: "KO later recap", source: "NoiseF", published_at: "2026-02-10T15:00:00Z" }
        ]
      }
    },
    status: { ticker: "KO", version: 13 },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"KO:13"',
    server_ts: 1770586800,
    errors: []
  } as never);

  const news = vm.cards.find((card) => card.type === "news");
  assert.ok(news);
  const headlines = news.data?.items?.map((item) => item.headline) ?? [];
  assert.equal(headlines.length, 5);
  assert.equal(headlines[0], "KO morning wrap");
  assert.equal(headlines.includes("KO later recap"), false);
});

test("parseCardUpdatedEvent and intent filtering handle noisy data", () => {
  const parsed = parseCardUpdatedEvent(
    JSON.stringify({ type: "CardUpdated", ticker: " aapl.us ", version: 2 })
  );
  assert.ok(parsed);
  assert.equal(parsed?.ticker, "AAPL");

  assert.equal(parseCardUpdatedEvent("{bad-json"), null);
  assert.equal(parseCardUpdatedEvent(JSON.stringify({ ticker: "🔥" })), null);

  const vm = adaptCardResponse({
    ticker: "AAPL",
    card: {
      header: { ticker: "AAPL", as_of: "2026-02-08T20:00:00Z" },
      summary: "Range expansion likely",
      tradeability: { sentiment: "NEUTRAL", confidence: 0.55, impact_score: 0.01 },
      tech: { current_price: 190, support_levels: [188], resistance_levels: [193] },
      raw_sources: { market_snapshot: { volume: 1000, relative_volume: 1.2, float_millions: 16000 } }
    },
    status: { ticker: "AAPL", version: 3 },
    is_missing: false,
    is_stale: false,
    refresh_triggered: false,
    refresh_deduped: false,
    etag: 'W/"AAPL:3"',
    server_ts: 1770586800,
    errors: []
  } as never);

  const levelsSubset = selectCardsForIntent(vm.cards, "levels");
  assert.equal(levelsSubset.every((card) => ["ticker_snapshot", "levels", "risk_plan"].includes(card.type)), true);

  const newsSubset = selectCardsForIntent(vm.cards, "news");
  assert.equal(newsSubset.every((card) => ["ticker_snapshot", "news"].includes(card.type)), true);

  const defaultSubset = selectCardsForIntent(vm.cards, "message");
  assert.equal(
    defaultSubset.every((card) => ["ticker_snapshot", "trade_idea", "gap_analysis"].includes(card.type)),
    true
  );
  assert.equal(defaultSubset.length, 3);
  assert.equal(typeof vm.sentiment?.value, "number");

  const deepDiveSubset = selectCardsForIntent(vm.cards, "deep_dive");
  assert.equal(
    deepDiveSubset.every((card) => ["ticker_snapshot", "trade_idea", "gap_analysis"].includes(card.type)),
    true
  );
  assert.equal(deepDiveSubset.length, 3);
});

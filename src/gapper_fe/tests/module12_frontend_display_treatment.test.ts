import assert from "node:assert/strict";
import test from "node:test";

import { adaptCardResponse, normalizeTickerSymbol } from "../src/api/adapters.ts";
import { selectCardDisplayTreatment } from "../src/components/chat/card_message_treatment.ts";

test("frontend ticker matrix normalizes command inputs before backend calls", () => {
  const matrix: Array<[string, string | null]> = [
    ["$NVDA", "NVDA"],
    [" nvda ", "NVDA"],
    ["NVDA.US", "NVDA"],
    ["nvda.nasdaq", "NVDA"],
    ["BRK.B", "BRK.B"],
    ["BF-B", "BF-B"],
    ["AAPL🔥", "AAPL"],
    ["🔥", null],
    ["", null]
  ];

  for (const [raw, expected] of matrix) {
    assert.equal(normalizeTickerSymbol(raw), expected);
  }
});

test("frontend renders success treatment for good backend card data", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "sm12good",
      card: {
        header: { ticker: "SM12GOOD", as_of: "2026-02-08T20:00:00Z" },
        summary: "Good payload from backend",
        tradeability: { sentiment: "BULLISH", confidence: 0.82, impact_score: 0.02 },
        tech: { current_price: 123.45, nearest_support: 120, nearest_resistance: 127 },
        raw_sources: { market_snapshot: { volume: 1000000, relative_volume: 1.8, float_millions: 55 } }
      },
      status: { ticker: "SM12GOOD", version: 101, last_analyzed_at: "2026-02-08T20:00:00Z" },
      is_missing: false,
      is_stale: false,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: 'W/"SM12GOOD:101"',
      server_ts: 1770588000,
      errors: []
    } as never)
  );

  assert.equal(treatment.kind, "ready");
  assert.equal(treatment.content, "SM12GOOD: ready.");
  assert.equal(treatment.status, "sent");
  assert.equal(treatment.refreshPending, false);
});

test("frontend degrades safely when backend sends malformed card data", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "sm12bad",
      card: "not-an-object",
      status: { ticker: "SM12BAD", version: 102 },
      is_missing: true,
      is_stale: false,
      refresh_triggered: true,
      refresh_deduped: false,
      etag: 'W/"SM12BAD:102"',
      server_ts: 1770588000,
      errors: ["card_json_invalid"]
    } as never)
  );

  assert.equal(treatment.kind, "missing");
  assert.equal(treatment.status, "sent");
  assert.equal(treatment.refreshPending, true);
  assert.equal(treatment.content.includes("$SM12BAD"), true);
});

test("frontend handles no backend card payload as pending refresh", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "sm12miss",
      card: null,
      status: { ticker: "SM12MISS", version: 103 },
      is_missing: true,
      is_stale: false,
      refresh_triggered: true,
      refresh_deduped: false,
      etag: 'W/"SM12MISS:103"',
      server_ts: 1770588000,
      errors: []
    } as never)
  );

  assert.equal(treatment.kind, "missing");
  assert.equal(treatment.status, "sent");
  assert.equal(treatment.refreshPending, true);
  assert.equal(treatment.content.includes("$SM12MISS"), true);
});

test("frontend surfaces ticker lookup misses without rendering stale cards", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "unknown1",
      card: null,
      status: null,
      is_missing: true,
      is_stale: true,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: null,
      server_ts: 1770588000,
      errors: ["ticker_not_found"]
    } as never)
  );

  assert.equal(treatment.kind, "not_found");
  assert.equal(treatment.status, "error");
  assert.equal(treatment.refreshPending, false);
  assert.equal(treatment.content.includes("$UNKNOWN1"), true);
});

test("frontend marks non-pending missing cards as error treatment", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "stillmissing",
      card: null,
      status: null,
      is_missing: true,
      is_stale: false,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: null,
      server_ts: 1770588000,
      errors: []
    } as never)
  );

  assert.equal(treatment.kind, "missing");
  assert.equal(treatment.status, "error");
  assert.equal(treatment.refreshPending, false);
  assert.equal(treatment.content.includes("$STILLMISSING"), true);
});

test("frontend keeps llm pending cards in refresh-pending state until enriched", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "llmpending",
      card: {
        header: { ticker: "LLMPENDING", as_of: "2026-02-09T14:00:00Z" },
        summary: "Partial card arrived before llm completion.",
        tradeability: { sentiment: "NEUTRAL", confidence: 0.3, impact_score: 0.0 },
        tech: { current_price: 45.2, nearest_support: 44.8, nearest_resistance: 46.1 },
        raw_sources: { llm_meta: { pending: true, failed: false } }
      },
      status: { ticker: "LLMPENDING", version: 14 },
      is_missing: false,
      is_stale: false,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: 'W/"LLMPENDING:14"',
      server_ts: 1770674400,
      errors: []
    } as never)
  );

  assert.equal(treatment.kind, "ready");
  assert.equal(treatment.refreshPending, true);
  assert.equal(treatment.content.includes("LLM enrichment pending"), true);
});

test("frontend shows clean unavailable message for generic llm_unavailable reason", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "llmunavail",
      card: {
        header: { ticker: "LLMUNAVAIL", as_of: "2026-02-11T14:00:00Z" },
        summary: "Fallback card because LLM host is unavailable.",
        tradeability: { sentiment: "NEUTRAL", confidence: 0.1, impact_score: 0.0 },
        tech: { current_price: 12.2, nearest_support: 11.9, nearest_resistance: 12.6 },
        raw_sources: { llm_meta: { pending: false, failed: true, error: "llm_unavailable" } }
      },
      status: { ticker: "LLMUNAVAIL", version: 2 },
      is_missing: false,
      is_stale: false,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: 'W/"LLMUNAVAIL:2"',
      server_ts: 1770674400,
      errors: []
    } as never)
  );

  assert.equal(treatment.kind, "ready");
  assert.equal(treatment.refreshPending, false);
  assert.equal(treatment.content, "LLMUNAVAIL: card ready; LLM enrichment unavailable");
});

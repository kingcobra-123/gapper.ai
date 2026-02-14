import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const chatComposerPath = resolve(
  process.cwd(),
  "src/components/chat/ChatComposer.tsx"
);
const chatComposerSource = readFileSync(chatComposerPath, "utf-8");

test("analyze command starts card fetch before waiting analyze response", () => {
  const marker = 'if (commandName === "analyze")';
  const start = chatComposerSource.indexOf(marker);
  assert.notEqual(start, -1);

  const block = chatComposerSource.slice(start, start + 2500);
  const cardPromiseIdx = block.indexOf("const cardPromise = fetchAndRenderCard");
  const analyzeAwaitIdx = block.indexOf(
    "await postAnalyzeTickerDto(primaryTicker)"
  );
  assert.notEqual(cardPromiseIdx, -1);
  assert.notEqual(analyzeAwaitIdx, -1);
  assert.equal(cardPromiseIdx < analyzeAwaitIdx, true);
});

test("pin command starts card fetch before waiting pin response", () => {
  const marker = 'if (commandName === "pin")';
  const start = chatComposerSource.indexOf(marker);
  assert.notEqual(start, -1);

  const block = chatComposerSource.slice(start, start + 2500);
  const cardPromiseIdx = block.indexOf("const cardPromise = fetchAndRenderCard");
  const pinAwaitIdx = block.indexOf("await pinTickerDto(primaryTicker)");
  assert.notEqual(cardPromiseIdx, -1);
  assert.notEqual(pinAwaitIdx, -1);
  assert.equal(cardPromiseIdx < pinAwaitIdx, true);
});

test("stream reconnect paths include fallback polling triggers", () => {
  assert.equal(
    chatComposerSource.includes('startFallbackPolling("reconnect_exhausted")'),
    true
  );
  assert.equal(
    chatComposerSource.includes('startFallbackPolling("too_many_streams")'),
    true
  );
  assert.equal(
    chatComposerSource.includes('startFallbackPolling("invalid_sse_content_type")'),
    true
  );
  assert.equal(
    chatComposerSource.includes('startFallbackPolling("non_retryable_api_error")'),
    true
  );
});

test("chat composer uses bounded LRU caches for card and etag state", () => {
  assert.equal(chatComposerSource.includes("const MAX_CARD_CACHE_ENTRIES = 50;"), true);
  assert.equal(chatComposerSource.includes("const MAX_ETAG_CACHE_ENTRIES = 50;"), true);
  assert.equal(chatComposerSource.includes("lruSet(\n          cardCacheRef.current"), true);
  assert.equal(chatComposerSource.includes("lruSet(\n              etagByTickerRef.current"), true);
});

test("chat composer unmount cleanup clears card and etag caches", () => {
  assert.equal(chatComposerSource.includes("cardCacheRef.current = {};"), true);
  assert.equal(chatComposerSource.includes("etagByTickerRef.current = {};"), true);
});

test("SSE channel grouping keeps live_gappers adhoc-only", () => {
  assert.equal(chatComposerSource.includes('channelKey !== "live_gappers"'), true);
  assert.equal(
    chatComposerSource.includes('payload.event_type === "entered_gapper"') &&
      chatComposerSource.includes('payload.event_type === "card_updated"'),
    true
  );
});

test("SSE channel grouping labels today and yesterday gapper buckets", () => {
  assert.equal(chatComposerSource.includes("Today's Gappers"), true);
  assert.equal(chatComposerSource.includes("Yesterday's Gappers"), true);
  assert.equal(chatComposerSource.includes("resolveGapperDaySeparator"), true);
});

import assert from "node:assert/strict";
import test from "node:test";

import { channelDisplayName, isKnownChannelName, normalizeChannelName } from "../src/lib/channels.ts";
import { appendMessageByChannel } from "../src/stores/chat_store_utils.ts";
import type { ChatMessage } from "../src/types/chat.ts";

function buildAssistantMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content,
    createdAt: "2026-02-09T00:00:00.000Z",
    intent: "message",
    tickers: [],
    mode: "paper",
    status: "sent",
    refreshPending: false
  };
}

test("channel normalization canonicalizes known names and preserves unknown raw keys", () => {
  assert.equal(normalizeChannelName("live-gappers"), "live_gappers");
  assert.equal(normalizeChannelName("small_cap"), "small_cap");
  assert.equal(isKnownChannelName("momentum"), true);
  assert.equal(isKnownChannelName("alpha_breakouts"), false);
  assert.equal(normalizeChannelName("alpha_breakouts"), "alpha_breakouts");
  assert.equal(channelDisplayName("live_gappers"), "Live Gappers");
  assert.equal(channelDisplayName("alpha_breakouts"), "Alpha Breakouts");
});

test("channel message reducer routes SSE updates to channel key and enforces cap", () => {
  const initial = {};
  const withOne = appendMessageByChannel(
    initial,
    "small_cap",
    buildAssistantMessage("m1", "SSE update"),
    2
  );

  assert.equal(Object.keys(withOne).includes("small_cap"), true);
  assert.equal(withOne.small_cap.length, 1);
  assert.equal(withOne.small_cap[0].content, "SSE update");

  const withTwo = appendMessageByChannel(
    withOne,
    "small_cap",
    buildAssistantMessage("m2", "Second"),
    2
  );
  const withThree = appendMessageByChannel(
    withTwo,
    "small_cap",
    buildAssistantMessage("m3", "Third"),
    2
  );

  assert.equal(withThree.small_cap.length, 2);
  assert.deepEqual(
    withThree.small_cap.map((message) => message.id),
    ["m2", "m3"]
  );
});

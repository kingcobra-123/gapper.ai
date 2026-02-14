import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const liveRedisUrl =
  cleanEnvValue(process.env.GAPPER_TEST_REDIS_URL) ||
  cleanEnvValue(process.env.REDIS_URL);

process.env.NEXT_PUBLIC_API_BASE_URL = liveApiBaseUrl;
if (liveApiKey) {
  process.env.NEXT_PUBLIC_API_KEY = liveApiKey;
}

const { consumeUserMessagesStream, fetchChannelsCatalogDto, postAnalyzeTickerDto } = await import("../src/api/routes.ts");
const { ApiClientError } = await import("../src/api/client.ts");

const ALL_CAP_CHANNELS = ["small_cap", "mid_cap", "large_cap"] as const;
const CAP_SEGMENT_KEY: Record<(typeof ALL_CAP_CHANNELS)[number], string> = {
  small_cap: "segment:smallcap",
  mid_cap: "segment:midcap",
  large_cap: "segment:largecap"
};

const REDIS_CLI_AVAILABLE = (() => {
  const result = spawnSync("redis-cli", ["--version"], {
    encoding: "utf-8"
  });
  return result.status === 0;
})();

const LIVE_FANOUT_SKIP_REASON =
  !liveApiKey
    ? "GAPPER_TEST_API_KEY (or NEXT_PUBLIC_API_KEY) is required."
    : !liveRedisUrl
      ? "GAPPER_TEST_REDIS_URL (or REDIS_URL) is required."
      : !REDIS_CLI_AVAILABLE
        ? "redis-cli is required for deterministic fanout injection."
        : false;

function runRedisCli(args: string[]): string {
  const command = liveRedisUrl ? ["-u", liveRedisUrl, ...args] : args;
  const result = spawnSync("redis-cli", command, {
    encoding: "utf-8"
  });
  if (result.status !== 0) {
    throw new Error(
      `redis-cli failed for args [${args.join(" ")}]: ${(result.stderr || "").trim()}`
    );
  }
  return (result.stdout || "").trim();
}

function parseFrameMessage(raw: string | null): {
  channel: string;
  event_type: string;
  ticker: string;
} | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      channel?: unknown;
      event_type?: unknown;
      ticker?: unknown;
    };
    const channel =
      typeof parsed.channel === "string" ? parsed.channel.trim() : "";
    const eventType =
      typeof parsed.event_type === "string" ? parsed.event_type.trim() : "";
    const ticker =
      typeof parsed.ticker === "string" ? parsed.ticker.trim().toUpperCase() : "";
    if (!channel || !eventType || !ticker) {
      return null;
    }
    return {
      channel,
      event_type: eventType,
      ticker
    };
  } catch {
    return null;
  }
}

function makeTicker(prefix: string): string {
  const entropy = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}${entropy}`.slice(0, 16).toUpperCase();
}

async function ensureSubscriptionsPresent(): Promise<void> {
  const payload = await fetchChannelsCatalogDto();
  assert.equal(payload.ok, true);
  const subscriptions = new Set((payload.subscriptions ?? []).map((entry) => String(entry)));
  assert.equal(subscriptions.has("all_gappers"), true, "expected all_gappers subscription");
  for (const capChannel of ALL_CAP_CHANNELS) {
    assert.equal(
      subscriptions.has(capChannel),
      true,
      `expected ${capChannel} subscription`
    );
  }
}

async function awaitEventChannels(
  ticker: string,
  eventType: "entered_gapper" | "card_updated",
  expectedChannels: readonly string[],
  timeoutMs = 20_000
): Promise<Set<string>> {
  const expected = new Set(expectedChannels);
  const observed = new Set<string>();
  let doneResolve: (() => void) | null = null;
  let doneReject: ((error: Error) => void) | null = null;
  const done = new Promise<void>((resolve, reject) => {
    doneResolve = resolve;
    doneReject = reject;
  });
  const streamAbort = new AbortController();

  const streamPromise = consumeUserMessagesStream({
    signal: streamAbort.signal,
    replay: 1,
    heartbeatSec: 5,
    onFrame: (frame) => {
      if (frame.comment) {
        return;
      }
      if (frame.event && frame.event !== "message") {
        return;
      }
      const message = parseFrameMessage(frame.data);
      if (!message) {
        return;
      }
      if (message.event_type !== eventType) {
        return;
      }
      if (message.ticker !== ticker) {
        return;
      }

      observed.add(message.channel);
      const satisfied = [...expected].every((channel) => observed.has(channel));
      if (satisfied) {
        doneResolve?.();
      }
    }
  }).catch((error: unknown) => {
    if (streamAbort.signal.aborted) {
      return;
    }
    if (
      error instanceof ApiClientError &&
      (error.status === 0 || error.status === 429 || error.status === 503)
    ) {
      doneReject?.(new Error(`sse_stream_error:${error.code}`));
      return;
    }
    doneReject?.(new Error(error instanceof Error ? error.message : String(error)));
  });

  try {
    await Promise.race([
      done,
      sleep(timeoutMs).then(() => {
        throw new Error(
          `Timed out waiting for channels ${[...expected].sort().join(",")} on ticker ${ticker}. Observed=${[...observed].sort().join(",") || "none"}`
        );
      })
    ]);
  } finally {
    streamAbort.abort();
    await streamPromise;
  }

  return observed;
}

async function runCapFanoutScenario(
  capChannel: (typeof ALL_CAP_CHANNELS)[number]
): Promise<void> {
  await ensureSubscriptionsPresent();

  const ticker = makeTicker(capChannel === "small_cap" ? "SM" : capChannel === "mid_cap" ? "MD" : "LG");
  const targetSegment = CAP_SEGMENT_KEY[capChannel];
  const segmentKeys = [
    "segment:smallcap",
    "segment:midcap",
    "segment:largecap",
    "segment:popular",
    "segment:ross"
  ];

  for (const key of segmentKeys) {
    runRedisCli(["SREM", key, ticker]);
  }
  runRedisCli(["SREM", "gappers:active", ticker]);
  runRedisCli(["SADD", targetSegment, ticker]);
  runRedisCli(["SADD", "gappers:active", ticker]);

  const waitForFanout = awaitEventChannels(
    ticker,
    "entered_gapper",
    ["all_gappers", capChannel]
  );
  await sleep(300);

  runRedisCli([
    "XADD",
    "events:gappers",
    "*",
    "type",
    "EnteredGapper",
    "ticker",
    ticker,
    "ts",
    `${Date.now() / 1000}`,
    "reason",
    "threshold_cross",
    "gap_pct",
    "8.25",
    "price",
    "12.45"
  ]);

  const observed = await waitForFanout;
  assert.equal(observed.has("all_gappers"), true);
  assert.equal(observed.has(capChannel), true);
  for (const otherCap of ALL_CAP_CHANNELS.filter((value) => value !== capChannel)) {
    assert.equal(
      observed.has(otherCap),
      false,
      `did not expect ${otherCap} for ${ticker}`
    );
  }

  for (const key of segmentKeys) {
    runRedisCli(["SREM", key, ticker]);
  }
  runRedisCli(["SREM", "gappers:active", ticker]);
}

async function runLiveGappersCardUpdatedScenario(): Promise<void> {
  await ensureSubscriptionsPresent();

  const ticker = makeTicker("LGP");
  const segmentKeys = [
    "segment:smallcap",
    "segment:midcap",
    "segment:largecap",
    "segment:popular",
    "segment:ross"
  ];
  for (const key of segmentKeys) {
    runRedisCli(["SREM", key, ticker]);
  }
  runRedisCli(["SREM", "gappers:active", ticker]);

  try {
    await postAnalyzeTickerDto(ticker);
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      (error.status === 429 || error.status === 503)
    ) {
      throw new Error(`analyze_rejected:${error.status}`);
    }
    throw error;
  }

  const waitForCardUpdated = awaitEventChannels(
    ticker,
    "card_updated",
    ["live_gappers"]
  );
  await sleep(300);

  runRedisCli([
    "XADD",
    "events:card_updated",
    "*",
    "type",
    "CardUpdated",
    "ticker",
    ticker,
    "version",
    "1",
    "ts",
    `${Date.now() / 1000}`,
    "reason",
    "integration_test"
  ]);

  const observed = await waitForCardUpdated;
  assert.equal(observed.has("live_gappers"), true);
  assert.equal(observed.has("all_gappers"), false);

  runRedisCli(["DEL", `api:requested:${ticker}`, `api:force:${ticker}`]);
  for (const key of segmentKeys) {
    runRedisCli(["SREM", key, ticker]);
  }
  runRedisCli(["SREM", "gappers:active", ticker]);
}

test(
  "frontend live fanout: entered gapper routes to all_gappers + small_cap only",
  { skip: LIVE_FANOUT_SKIP_REASON, timeout: 30_000 },
  async () => {
    await runCapFanoutScenario("small_cap");
  }
);

test(
  "frontend live fanout: entered gapper routes to all_gappers + mid_cap only",
  { skip: LIVE_FANOUT_SKIP_REASON, timeout: 30_000 },
  async () => {
    await runCapFanoutScenario("mid_cap");
  }
);

test(
  "frontend live fanout: entered gapper routes to all_gappers + large_cap only",
  { skip: LIVE_FANOUT_SKIP_REASON, timeout: 30_000 },
  async () => {
    await runCapFanoutScenario("large_cap");
  }
);

test(
  "frontend live fanout: user-requested ticker card update routes to live_gappers",
  { skip: LIVE_FANOUT_SKIP_REASON, timeout: 30_000 },
  async () => {
    await runLiveGappersCardUpdatedScenario();
  }
);

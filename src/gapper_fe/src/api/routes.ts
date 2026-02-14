import { apiRequest, getApiBaseUrl, readJson } from "@/api/client";
import type {
  AnalyzeResponseDto,
  CardFetchResult,
  CardResponseDto,
  ChannelsCatalogResponseDto,
  ChannelsMeResponseDto,
  GappersTopResponseDto,
  MeResponseDto,
  SseFrameDto
} from "@/api/types";

function normalizePathTicker(ticker: string): string {
  return encodeURIComponent(ticker.trim().toUpperCase());
}

export async function fetchCardDto(
  ticker: string,
  options: { ifNoneMatch?: string | null; signal?: AbortSignal } = {}
): Promise<CardFetchResult> {
  const response = await apiRequest(`/card/${normalizePathTicker(ticker)}`, {
    method: "GET",
    ifNoneMatch: options.ifNoneMatch,
    signal: options.signal
  });

  if (response.status === 304) {
    return {
      kind: "not_modified",
      ticker: ticker.trim().toUpperCase(),
      etag: response.headers.get("etag")
    };
  }

  const payload = await readJson<CardResponseDto>(response);
  return {
    kind: "ok",
    payload,
    etag: response.headers.get("etag") ?? payload.etag ?? null
  };
}

export async function postAnalyzeTickerDto(ticker: string): Promise<AnalyzeResponseDto> {
  const response = await apiRequest(`/analyze/${normalizePathTicker(ticker)}`, {
    method: "POST"
  });
  return readJson<AnalyzeResponseDto>(response);
}

export async function pinTickerDto(
  ticker: string,
  options: { pinTtlSec?: number } = {}
): Promise<AnalyzeResponseDto> {
  const params = new URLSearchParams();
  if (Number.isFinite(options.pinTtlSec)) {
    params.set("pin_ttl_sec", String(options.pinTtlSec));
  }
  const query = params.toString();
  const path = `/pin/${normalizePathTicker(ticker)}${query ? `?${query}` : ""}`;
  const response = await apiRequest(path, { method: "POST" });
  return readJson<AnalyzeResponseDto>(response);
}

export async function fetchTopGappersDto(limit = 20): Promise<GappersTopResponseDto> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const response = await apiRequest(`/gappers/top?limit=${safeLimit}`, {
    method: "GET"
  });
  return readJson<GappersTopResponseDto>(response);
}

export async function fetchChannelsCatalogDto(): Promise<ChannelsCatalogResponseDto> {
  const response = await apiRequest("/channels/catalog", {
    method: "GET"
  });
  return readJson<ChannelsCatalogResponseDto>(response);
}

export async function fetchChannelsMeDto(): Promise<ChannelsMeResponseDto> {
  const response = await apiRequest("/channels/me", {
    method: "GET"
  });
  return readJson<ChannelsMeResponseDto>(response);
}

export async function fetchMeDto(options: { accessToken?: string | null } = {}): Promise<MeResponseDto> {
  const response = await apiRequest("/me", {
    method: "GET",
    accessToken: options.accessToken ?? null
  });
  return readJson<MeResponseDto>(response);
}

export function buildCardsStreamUrl(
  tickers: string[],
  options: {
    heartbeatSec?: number;
    since?: string;
  } = {}
): string {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();

  const cleanTickers = tickers
    .map((ticker) => ticker.trim().toUpperCase())
    .filter((ticker) => ticker.length > 0);

  if (cleanTickers.length > 0) {
    params.set("tickers", cleanTickers.join(","));
  }

  if (Number.isFinite(options.heartbeatSec) && (options.heartbeatSec ?? 0) > 0) {
    params.set("heartbeat", String(Math.trunc(options.heartbeatSec ?? 0)));
  }

  if (options.since) {
    params.set("since", options.since);
  }

  const query = params.toString();
  return `${base}/stream/cards${query ? `?${query}` : ""}`;
}

export function openCardsStream(
  tickers: string[],
  options: {
    heartbeatSec?: number;
    since?: string;
  } = {}
): EventSource {
  return new EventSource(buildCardsStreamUrl(tickers, options));
}

function parseSseFrame(rawFrame: string): SseFrameDto | null {
  const trimmed = rawFrame.replace(/\r/g, "");
  if (!trimmed.trim()) {
    return null;
  }

  let event: string | null = null;
  let eventId: string | null = null;
  let comment: string | null = null;
  const dataLines: string[] = [];

  for (const line of trimmed.split("\n")) {
    if (line.startsWith(":")) {
      const value = line.slice(1).trim();
      comment = comment ? `${comment}\n${value}` : value;
      continue;
    }

    const firstColon = line.indexOf(":");
    const field = firstColon === -1 ? line : line.slice(0, firstColon);
    let value = firstColon === -1 ? "" : line.slice(firstColon + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "event") {
      event = value || null;
    } else if (field === "id") {
      eventId = value || null;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  return {
    event,
    id: eventId,
    data: dataLines.length ? dataLines.join("\n") : null,
    comment
  };
}

export async function consumeUserMessagesStream(options: {
  onFrame: (frame: SseFrameDto) => void;
  signal?: AbortSignal;
  replay?: number;
  heartbeatSec?: number;
  lastEventId?: string | null;
}): Promise<void> {
  const params = new URLSearchParams();
  if (Number.isFinite(options.replay) && (options.replay ?? 0) > 0) {
    params.set("replay", String(Math.trunc(options.replay ?? 0)));
  }
  if (Number.isFinite(options.heartbeatSec) && (options.heartbeatSec ?? 0) > 0) {
    params.set("heartbeat", String(Math.trunc(options.heartbeatSec ?? 0)));
  }
  const query = params.toString();
  const path = `/sse/user/messages${query ? `?${query}` : ""}`;

  const headers = options.lastEventId
    ? ({
        "Last-Event-ID": options.lastEventId
      } as const)
    : undefined;
  const response = await apiRequest(path, {
    method: "GET",
    headers,
    signal: options.signal,
    timeoutMs: null
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/event-stream")) {
    throw new Error("invalid_sse_content_type");
  }

  const body = response.body;
  if (!body) {
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const frame = parseSseFrame(rawFrame);
        if (frame) {
          options.onFrame(frame);
        }
        boundary = buffer.indexOf("\n\n");
      }
    }

    const tail = decoder.decode();
    if (tail) {
      buffer += tail.replace(/\r/g, "");
    }
    const frame = parseSseFrame(buffer);
    if (frame) {
      options.onFrame(frame);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // best-effort stream teardown on caller aborts/disconnects
    }
  }
}

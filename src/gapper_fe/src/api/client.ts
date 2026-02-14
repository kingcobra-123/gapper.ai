import type { ApiErrorModel, BackendErrorCode, ErrorResponseDto } from "@/api/types";
import { getAccessToken, notifyUnauthorized } from "@/auth/tokenProvider";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_API_TIMEOUT_MS = 8000;

const KNOWN_BACKEND_CODES = new Set<BackendErrorCode>([
  "auth_unavailable",
  "event_emit_failed",
  "invalid_ticker",
  "premium_required",
  "rate_limit_exceeded",
  "redis_unavailable",
  "system_busy",
  "ticker_not_found",
  "too_many_streams",
  "unauthorized"
]);

function normalizeBaseUrl(rawBaseUrl: string | undefined): string {
  const fallback = DEFAULT_API_BASE_URL;
  const source = (rawBaseUrl ?? fallback).trim() || fallback;
  return source.endsWith("/") ? source.slice(0, -1) : source;
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

function readApiKey(): string | null {
  const value = (process.env.NEXT_PUBLIC_API_KEY ?? "").trim();
  return value || null;
}

export function getApiIdentityTag(): string {
  const apiKey = readApiKey();
  if (!apiKey) {
    return "anonymous";
  }

  let hash = 5381;
  for (let idx = 0; idx < apiKey.length; idx += 1) {
    hash = ((hash << 5) + hash) ^ apiKey.charCodeAt(idx);
  }
  return `key-${Math.abs(hash >>> 0).toString(36)}`;
}

function defaultMessageFor(status: number, code: ApiErrorModel["code"]): string {
  if (status === 429 || code === "rate_limit_exceeded") {
    return "Backend busy/rate limited. Retry shortly.";
  }
  if (status === 503 || code === "redis_unavailable" || code === "system_busy") {
    return "Backend busy. Please retry in a few seconds.";
  }
  if (status === 401 || code === "unauthorized") {
    return "Session expired or invalid. Sign in again.";
  }
  if (status === 403 || code === "premium_required") {
    return "Premium required for this feature.";
  }
  if (status === 400 || code === "invalid_ticker") {
    return "Ticker format is invalid.";
  }
  if (code === "network_timeout") {
    return "Backend request timed out. Retry in a few seconds.";
  }
  if (code === "network_error") {
    return "Backend unreachable. Check API URL and server status.";
  }
  return "Backend request failed.";
}

function readApiTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_API_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_API_TIMEOUT_MS;
  }
  return Math.max(1000, parsed);
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const name = (error.name || "").toLowerCase();
  return name === "aborterror";
}

function composeAbortSignal(
  requestSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal
): AbortSignal {
  if (!requestSignal) {
    return timeoutSignal;
  }

  if (requestSignal.aborted) {
    return requestSignal;
  }
  if (timeoutSignal.aborted) {
    return timeoutSignal;
  }

  const controller = new AbortController();
  const abortFrom = (source: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(source.reason);
    }
  };

  requestSignal.addEventListener("abort", () => abortFrom(requestSignal), {
    once: true
  });
  timeoutSignal.addEventListener("abort", () => abortFrom(timeoutSignal), {
    once: true
  });

  return controller.signal;
}

function firstErrorCode(errors: string[]): ApiErrorModel["code"] {
  const first = errors[0]?.trim() ?? "";
  if (KNOWN_BACKEND_CODES.has(first as BackendErrorCode)) {
    return first as BackendErrorCode;
  }
  return "unknown_error";
}

function parseRetryAfterSeconds(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

async function parseErrorBody(response: Response): Promise<ErrorResponseDto | null> {
  try {
    const parsed = (await response.json()) as ErrorResponseDto;
    if (!Array.isArray(parsed.errors)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export class ApiClientError extends Error {
  readonly model: ApiErrorModel;

  constructor(model: ApiErrorModel) {
    super(model.message);
    this.name = "ApiClientError";
    this.model = model;
  }

  get status(): number {
    return this.model.status;
  }

  get code(): ApiErrorModel["code"] {
    return this.model.code;
  }

  get retryAfterSec(): number | null {
    return this.model.retryAfterSec;
  }
}

export function isRetryableError(error: unknown): error is ApiClientError {
  if (!(error instanceof ApiClientError)) {
    return false;
  }
  return error.status === 429 || error.status === 503;
}

async function normalizeHttpError(response: Response): Promise<ApiClientError> {
  const body = await parseErrorBody(response);
  const errors = body?.errors ?? [];
  const code = firstErrorCode(errors);
  const retryAfterSec = parseRetryAfterSeconds(response);
  const message = defaultMessageFor(response.status, code);

  return new ApiClientError({
    status: response.status,
    code,
    message,
    errors,
    retryAfterSec
  });
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  ifNoneMatch?: string | null;
  accessToken?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number | null;
}

export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const explicitAccessToken = options.accessToken?.trim() ?? "";
  const accessToken = explicitAccessToken || (await getAccessToken());
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const apiKey = readApiKey();
  if (!accessToken && apiKey && !headers.has("X-API-Key") && !headers.has("Authorization")) {
    headers.set("X-API-Key", apiKey);
  }

  if (options.ifNoneMatch) {
    headers.set("If-None-Match", options.ifNoneMatch);
  }

  const requestInit: RequestInit = {
    method,
    headers,
    cache: "no-store",
    signal: options.signal
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  const timeoutMs = options.timeoutMs === undefined ? readApiTimeoutMs() : options.timeoutMs;
  const timeoutController =
    timeoutMs !== null && timeoutMs > 0 ? new AbortController() : null;
  const timeoutId =
    timeoutMs !== null && timeoutMs > 0 && timeoutController !== null
      ? setTimeout(() => {
          timeoutController.abort("request_timeout");
        }, timeoutMs)
      : null;
  const signal =
    timeoutController !== null
      ? composeAbortSignal(options.signal, timeoutController.signal)
      : options.signal;
  try {
    response = await fetch(url, {
      ...requestInit,
      signal
    });
  } catch (error) {
    const timedOut =
      timeoutController !== null &&
      timeoutController.signal.aborted &&
      !(options.signal?.aborted ?? false) &&
      isAbortLikeError(error);
    if (timedOut) {
      throw new ApiClientError({
        status: 0,
        code: "network_timeout",
        message: defaultMessageFor(0, "network_timeout"),
        errors: ["network_timeout"],
        retryAfterSec: null
      });
    }
    throw new ApiClientError({
      status: 0,
      code: "network_error",
      message: defaultMessageFor(0, "network_error"),
      errors: ["network_error"],
      retryAfterSec: null
    });
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }

  if (!response.ok && response.status !== 304) {
    if (response.status === 401) {
      await notifyUnauthorized();
    }
    throw await normalizeHttpError(response);
  }

  return response;
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

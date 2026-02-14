import type { AssistantCard } from "@/types/chat";
import type { MissingDataBlock } from "@/types/missing";

export type BackendErrorCode =
  | "event_emit_failed"
  | "auth_unavailable"
  | "invalid_ticker"
  | "premium_required"
  | "rate_limit_exceeded"
  | "redis_unavailable"
  | "system_busy"
  | "ticker_not_found"
  | "too_many_streams"
  | "unauthorized"
  | "unknown_error";

export interface ErrorResponseDto {
  ok?: boolean;
  errors: string[];
  server_ts: number;
}

export interface CardResponseDto {
  ticker: string;
  card: Record<string, unknown> | null;
  status: Record<string, unknown> | null;
  is_missing: boolean;
  is_stale: boolean;
  refresh_triggered: boolean;
  refresh_deduped: boolean;
  etag: string | null;
  server_ts: number;
  errors: string[];
}

export interface AnalyzeResponseDto {
  ok: boolean;
  ticker: string;
  enqueued: boolean;
  deduped: boolean;
  server_ts: number;
  errors: string[];
}

export interface GapperTopItemDto {
  rank: number;
  ticker: string;
  score: number;
}

export interface GappersTopResponseDto {
  limit: number;
  items: GapperTopItemDto[];
  server_ts: number;
  errors: string[];
}

export interface ChannelCatalogItemDto {
  name: string;
  display_name?: string;
  is_premium?: boolean;
  sort_order?: number;
  premium?: boolean;
  order?: number;
  subscribed?: boolean;
}

export interface ChannelsCatalogResponseDto {
  ok: boolean;
  plan: string;
  subscriptions: string[];
  catalog: ChannelCatalogItemDto[];
  server_ts: number;
  errors: string[];
}

export interface ChannelsMeResponseDto {
  ok: boolean;
  plan: string;
  subscriptions: string[];
  server_ts: number;
  errors: string[];
}

export interface MeResponseDto {
  ok: boolean;
  user_id: string;
  email: string | null;
  plan: string;
  server_ts: number;
  errors: string[];
}

export interface CardUpdatedEventDto {
  type?: string;
  ticker: string;
  version?: number;
  ts?: number;
  job_id?: string;
  reason?: string;
}

export interface UserChannelMessageDto {
  schema_version?: number;
  channel: string;
  message_id: string;
  event_type: string;
  ticker?: string | null;
  card_version?: number | null;
  reason: string;
  ts: number;
  card_ref?: {
    ticker?: string;
    version?: number | null;
  } | null;
}

export interface SseFrameDto {
  event: string | null;
  id: string | null;
  data: string | null;
  comment: string | null;
}

export interface ApiErrorModel {
  status: number;
  code: BackendErrorCode | "network_error" | "network_timeout";
  message: string;
  errors: string[];
  retryAfterSec: number | null;
}

export interface AnalyzeViewModel {
  ticker: string;
  enqueued: boolean;
  deduped: boolean;
  serverTs: number;
  errors: string[];
}

export interface PinViewModel {
  ticker: string;
  enqueued: boolean;
  deduped: boolean;
  serverTs: number;
  errors: string[];
}

export interface GapperViewModel {
  rank: number;
  ticker: string;
  score: number;
}

export interface CardViewModel {
  ticker: string;
  summary: string;
  asOf: string;
  cards: AssistantCard[];
  isMissing: boolean;
  isStale: boolean;
  refreshTriggered: boolean;
  refreshDeduped: boolean;
  etag: string | null;
  serverTs: number;
  errors: string[];
  version: number | null;
  rawCard: Record<string, unknown> | null;
  rawStatus: Record<string, unknown> | null;
  llmPending: boolean;
  llmFailed: boolean;
  llmError: string | null;
  sentiment?: {
    value?: number;
    summary?: string;
    breakdown: Array<{ label: string; value: number }>;
    missing?: MissingDataBlock;
  };
}

export type CardFetchResult =
  | {
      kind: "not_modified";
      ticker: string;
      etag: string | null;
    }
  | {
      kind: "ok";
      etag: string | null;
      payload: CardResponseDto;
    };

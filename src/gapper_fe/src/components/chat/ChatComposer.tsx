"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Send } from "lucide-react";
import {
  adaptAnalyzeResponse,
  adaptCardResponse,
  adaptGappersResponse,
  adaptPinResponse,
  normalizeTickerSymbol,
  selectCardsForIntent
} from "@/api/adapters";
import { ApiClientError, getApiIdentityTag, isRetryableError } from "@/api/client";
import {
  consumeUserMessagesStream,
  fetchCardDto,
  fetchChannelsCatalogDto,
  fetchTopGappersDto,
  pinTickerDto,
  postAnalyzeTickerDto
} from "@/api/routes";
import type { CardViewModel, SseFrameDto, UserChannelMessageDto } from "@/api/types";
import {
  CommandAutocomplete,
  getCommandAutocompleteOptions
} from "@/components/chat/CommandAutocomplete";
import {
  buildCardTimeoutReply,
  buildInvalidTickerReply,
  selectCardDisplayTreatment
} from "@/components/chat/card_message_treatment";
import { formatApiError } from "@/components/chat/api_error_message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { channelDisplayName, defaultSortOrderForChannel, isKnownChannelName, normalizeChannelName } from "@/lib/channels";
import { parseComposerText } from "@/lib/commands/parser";
import { useChatStore } from "@/stores/useChatStore";
import { useCardStore } from "@/stores/useCardStore";
import { useUIStore } from "@/stores/useUIStore";
import { useWatchlistStore } from "@/stores/useWatchlistStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { AssistantCard, ChatIntent } from "@/types/chat";

type ComposerFillEvent = CustomEvent<{ text: string }>;
type WatchlistAddedEvent = CustomEvent<{ ticker: string }>;
type CardRefreshRequestEvent = CustomEvent<{
  channelId: string;
  messageId: string;
  ticker: string;
  intent?: ChatIntent;
}>;

type FetchCardOptions = {
  channelId: string;
  intent: ChatIntent;
  source: "command" | "sse" | "card_select";
  targetMessageId?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatGappersLine(items: { rank: number; ticker: string; score: number }[]): string {
  if (items.length === 0) {
    return "No active gappers returned by backend.";
  }
  return `Top gappers: ${items
    .slice(0, 8)
    .map((item) => `#${item.rank} ${item.ticker} (${item.score.toFixed(2)})`)
    .join(" | ")}`;
}

const PENDING_REFRESH_TIMEOUT_MS = 120_000;
const MAX_STREAM_RECONNECT_ATTEMPTS = 12;
const PENDING_REFRESH_POLL_INTERVAL_MS = 2_500;
const USER_STREAM_REPLAY_COUNT = 5;
const USER_STREAM_HEARTBEAT_SEC = 30;
const SSE_CARD_FETCH_COOLDOWN_MS = 3_000;
const STREAM_FALLBACK_POLL_INTERVAL_MS = 5_000;
const MAX_CARD_CACHE_ENTRIES = 50;
const MAX_ETAG_CACHE_ENTRIES = 50;
const MAX_TRACKED_MESSAGE_ENTRIES = 200;
const MAX_SSE_TRACKING_ENTRIES = 200;
const MAX_PREFETCH_CHANNEL_ENTRIES = 64;
const ET_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function commandUsageReply(commandName: string): string {
  return `Need one ticker for \`/${commandName}\`. Example: \`/${commandName} NVDA\`.`;
}

function pendingRefreshTimerKey(channelId: string, ticker: string): string {
  return `${channelId}:${ticker}`;
}

function trimObjectLru<T>(cache: Record<string, T>, maxEntries: number): void {
  if (maxEntries <= 0) {
    return;
  }
  const keys = Object.keys(cache);
  const overflow = keys.length - maxEntries;
  if (overflow <= 0) {
    return;
  }
  for (let index = 0; index < overflow; index += 1) {
    delete cache[keys[index]];
  }
}

function lruSet<T>(cache: Record<string, T>, key: string, value: T, maxEntries: number): void {
  if (Object.prototype.hasOwnProperty.call(cache, key)) {
    delete cache[key];
  }
  cache[key] = value;
  trimObjectLru(cache, maxEntries);
}

function lruGet<T>(cache: Record<string, T>, key: string): T | undefined {
  if (!Object.prototype.hasOwnProperty.call(cache, key)) {
    return undefined;
  }
  const value = cache[key];
  delete cache[key];
  cache[key] = value;
  return value;
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function isBackendRefreshPending(viewModel: CardViewModel): boolean {
  return (
    (
      (viewModel.isMissing || viewModel.isStale) &&
      (viewModel.refreshTriggered || viewModel.refreshDeduped)
    ) ||
    viewModel.llmPending
  );
}

function mergePendingSnapshotFields(
  previousViewModel: CardViewModel | null,
  nextViewModel: CardViewModel
): CardViewModel {
  if (!previousViewModel || !isBackendRefreshPending(nextViewModel)) {
    return nextViewModel;
  }

  const previousSnapshot = previousViewModel.cards.find(
    (card): card is Extract<AssistantCard, { type: "ticker_snapshot" }> =>
      card.type === "ticker_snapshot"
  );
  if (!previousSnapshot?.data) {
    return nextViewModel;
  }
  const previousSnapshotData = previousSnapshot.data;

  let didMerge = false;
  const mergedCards = nextViewModel.cards.map((card) => {
    if (card.type !== "ticker_snapshot") {
      return card;
    }

    const mergedSnapshotData = {
      ...previousSnapshotData,
      ...(card.data ?? {}),
      ticker: card.data?.ticker ?? previousSnapshotData.ticker
    } satisfies NonNullable<Extract<AssistantCard, { type: "ticker_snapshot" }>["data"]>;
    didMerge = true;
    return {
      ...card,
      data: mergedSnapshotData
    };
  });

  if (!didMerge) {
    return nextViewModel;
  }

  return {
    ...nextViewModel,
    cards: mergedCards
  };
}

function parseUserChannelMessage(rawData: string | null): UserChannelMessageDto | null {
  if (!rawData) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawData) as UserChannelMessageDto;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.channel !== "string" || typeof parsed.event_type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatSseMessageText(message: UserChannelMessageDto, normalizedTicker: string | null): string {
  const ticker = normalizedTicker ?? (typeof message.ticker === "string" ? message.ticker : null);
  const reason = message.reason?.trim() ?? "";
  if (message.event_type === "entered_gapper" && ticker) {
    if (reason === "threshold_cross") {
      return `${ticker} crossed gap threshold.`;
    }
    return `${ticker} entered gapper stream.`;
  }
  if (message.event_type === "card_updated" && ticker) {
    return `${ticker} card updated.`;
  }
  if (message.event_type === "system") {
    return reason || "System message.";
  }
  if (reason) {
    return reason;
  }
  return ticker ? `${ticker} update received.` : "Channel update received.";
}

function formatEtDateKey(date: Date): string | null {
  const parts = ET_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function parseIsoDateKeyToUtcMs(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

function formatIsoDateKeyFromUtcMs(utcMs: number): string {
  const date = new Date(utcMs);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveGapperDaySeparator(tsRaw: unknown): { key: string; label: string } | null {
  const tsSeconds = Number(tsRaw);
  if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) {
    return null;
  }

  const eventDateKey = formatEtDateKey(new Date(tsSeconds * 1000));
  const todayDateKey = formatEtDateKey(new Date());
  if (!eventDateKey || !todayDateKey) {
    return null;
  }
  const todayUtcMs = parseIsoDateKeyToUtcMs(todayDateKey);
  if (todayUtcMs === null) {
    return null;
  }

  if (eventDateKey === todayDateKey) {
    return {
      key: `day:${eventDateKey}`,
      label: "Today's Gappers"
    };
  }

  const yesterdayDateKey = formatIsoDateKeyFromUtcMs(todayUtcMs - 86_400_000);
  if (eventDateKey === yesterdayDateKey) {
    return {
      key: `day:${eventDateKey}`,
      label: "Yesterday's Gappers"
    };
  }

  return {
    key: `day:${eventDateKey}`,
    label: `Gappers ${eventDateKey}`
  };
}

export function ChatComposer() {
  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const channelsHydrated = useWorkspaceStore((state) => state.channelsHydrated);
  const setChannelsLoading = useWorkspaceStore((state) => state.setChannelsLoading);
  const setChannelsError = useWorkspaceStore((state) => state.setChannelsError);
  const setBackendChannels = useWorkspaceStore((state) => state.setBackendChannels);
  const ensureChannel = useWorkspaceStore((state) => state.ensureChannel);
  const sendUserMessage = useChatStore((state) => state.sendUserMessage);
  const receiveAssistantMessage = useChatStore((state) => state.receiveAssistantMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setChannelLoading = useChatStore((state) => state.setChannelLoading);
  const setChannelError = useChatStore((state) => state.setChannelError);
  const setLatency = useChatStore((state) => state.setLatency);
  const latencyMs = useChatStore((state) => state.latencyMs);
  const lastTickerByChannelId = useChatStore((state) => state.lastTickerByChannelId);
  const upsertCardViewModel = useCardStore((state) => state.upsertCardViewModel);

  const tradingMode = useUIStore((state) => state.tradingMode);
  const setTradingMode = useUIStore((state) => state.setTradingMode);
  const riskProfile = useUIStore((state) => state.riskProfile);
  const setUtilityTickerForChannel = useUIStore((state) => state.setUtilityTickerForChannel);
  const utilityTickerByChannelId = useUIStore((state) => state.utilityTickerByChannelId);

  const watchlistTickers = useWatchlistStore((state) => state.tickers);
  const recentTickers = useWatchlistStore((state) => state.recentTickers);
  const touchTicker = useWatchlistStore((state) => state.touchTicker);
  const mergeTickers = useWatchlistStore((state) => state.mergeTickers);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const cardCacheRef = useRef<Record<string, CardViewModel>>({});
  const etagByTickerRef = useRef<Record<string, string>>({});
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const streamReconnectExhaustedRef = useRef(false);
  const streamLastEventIdRef = useRef<string | null>(null);
  const warnedUnknownChannelsRef = useRef<Set<string>>(new Set());
  const pendingRefreshTimersRef = useRef<Record<string, number>>({});
  const pendingRefreshPollTokensRef = useRef<Record<string, number>>({});
  const pendingRefreshPollSeqRef = useRef(0);
  const fetchAndRenderCardRef = useRef<
    ((ticker: string, options: FetchCardOptions) => Promise<CardViewModel | null>) | null
  >(null);
  const pendingMessageIdByTickerRef = useRef<Record<string, string>>({});
  const cardMessageIdByTickerRef = useRef<Record<string, string>>({});
  const sseInFlightByTickerRef = useRef<Record<string, boolean>>({});
  const sseLastFetchAtRef = useRef<Record<string, number>>({});
  const lastGapperSeparatorByChannelRef = useRef<Record<string, string>>({});
  const utilityTickerByChannelRef = useLatestRef<Record<string, string>>(utilityTickerByChannelId);
  const lastTickerByChannelRef = useLatestRef<Record<string, string>>(lastTickerByChannelId);
  const latestPrefetchByChannelRef = useRef<Record<string, string>>({});
  const selectedChannelIdRef = useLatestRef<string>(selectedChannelId);
  const bootstrappedRef = useRef(false);
  const streamStorageKeyRef = useRef(`gapper:user-sse:last-event-id:${getApiIdentityTag()}`);

  const parsed = useMemo(() => parseComposerText(draft), [draft]);
  const autocompleteOptions = useMemo(
    () => getCommandAutocompleteOptions(draft, watchlistTickers, recentTickers),
    [draft, recentTickers, watchlistTickers]
  );

  const commandLookupMode = useMemo(() => {
    const trimmed = draft.trim();
    return trimmed.startsWith("/") && !trimmed.includes(" ");
  }, [draft]);

  const pushAssistantMessage = useCallback(
    (
      channelId: string,
      content: string,
      options: {
        intent?: ChatIntent;
        tickers?: string[];
        cards?: AssistantCard[];
        status?: "sending" | "sent" | "error";
        refreshPending?: boolean;
      } = {}
    ): string =>
      receiveAssistantMessage(channelId, {
        content,
        intent: options.intent ?? "message",
        tickers: options.tickers ?? [],
        mode: tradingMode,
        cards: options.cards,
        status: options.status,
        refreshPending: options.refreshPending
      }),
    [receiveAssistantMessage, tradingMode]
  );

  const patchAssistantMessage = useCallback(
    (
      channelId: string,
      messageId: string,
      patch: Partial<{
        content: string;
        intent: ChatIntent;
        tickers: string[];
        cards: AssistantCard[];
        status: "sending" | "sent" | "error";
        refreshPending: boolean;
      }>
    ): boolean => updateMessage(channelId, messageId, patch),
    [updateMessage]
  );

  const clearTrackedMessagesForTicker = useCallback((channelId: string, ticker: string) => {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    if (!normalizedTicker) {
      return;
    }

    const key = pendingRefreshTimerKey(channelId, normalizedTicker);
    delete pendingMessageIdByTickerRef.current[key];
    delete cardMessageIdByTickerRef.current[key];
  }, []);

  const getFocusedTickerForChannel = useCallback((channelId: string): string | null => {
    const utilityTicker = normalizeTickerSymbol(utilityTickerByChannelRef.current[channelId] ?? "");
    if (utilityTicker) {
      return utilityTicker;
    }
    return normalizeTickerSymbol(lastTickerByChannelRef.current[channelId] ?? "");
  }, [lastTickerByChannelRef, utilityTickerByChannelRef]);

  const upsertPendingMessageForTicker = useCallback(
    (
      channelId: string,
      ticker: string,
      payload: {
        content: string;
        intent: ChatIntent;
        status: "sending" | "sent" | "error";
        refreshPending: boolean;
      }
    ) => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return null;
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      const trackedMessageId = lruGet(pendingMessageIdByTickerRef.current, key);
      if (
        trackedMessageId &&
        patchAssistantMessage(channelId, trackedMessageId, {
          content: payload.content,
          intent: payload.intent,
          tickers: [normalizedTicker],
          status: payload.status,
          refreshPending: payload.refreshPending
        })
      ) {
        return trackedMessageId;
      }

      delete pendingMessageIdByTickerRef.current[key];

      const messageId = pushAssistantMessage(channelId, payload.content, {
        intent: payload.intent,
        tickers: [normalizedTicker],
        status: payload.status,
        refreshPending: payload.refreshPending
      });
      lruSet(
        pendingMessageIdByTickerRef.current,
        key,
        messageId,
        MAX_TRACKED_MESSAGE_ENTRIES
      );
      return messageId;
    },
    [patchAssistantMessage, pushAssistantMessage]
  );

  const upsertCardMessageForTicker = useCallback(
    (
      channelId: string,
      ticker: string,
      payload: {
        content: string;
        intent: ChatIntent;
        cards: AssistantCard[];
        refreshPending: boolean;
      }
    ) => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return null;
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      const trackedCardMessageId = lruGet(cardMessageIdByTickerRef.current, key);
      const trackedPendingMessageId = lruGet(pendingMessageIdByTickerRef.current, key);
      const trackedMessageId = trackedCardMessageId ?? trackedPendingMessageId;

      if (
        trackedMessageId &&
        patchAssistantMessage(channelId, trackedMessageId, {
          content: payload.content,
          intent: payload.intent,
          tickers: [normalizedTicker],
          cards: payload.cards,
          status: "sent",
          refreshPending: payload.refreshPending
        })
      ) {
        lruSet(
          cardMessageIdByTickerRef.current,
          key,
          trackedMessageId,
          MAX_TRACKED_MESSAGE_ENTRIES
        );
        delete pendingMessageIdByTickerRef.current[key];
        return trackedMessageId;
      }

      delete cardMessageIdByTickerRef.current[key];
      delete pendingMessageIdByTickerRef.current[key];

      const messageId = pushAssistantMessage(channelId, payload.content, {
        intent: payload.intent,
        tickers: [normalizedTicker],
        cards: payload.cards,
        refreshPending: payload.refreshPending
      });
      lruSet(
        cardMessageIdByTickerRef.current,
        key,
        messageId,
        MAX_TRACKED_MESSAGE_ENTRIES
      );
      return messageId;
    },
    [patchAssistantMessage, pushAssistantMessage]
  );

  const markTickerRefreshFailed = useCallback(
    (channelId: string, ticker: string) => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return;
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      delete pendingRefreshPollTokensRef.current[key];
      const pendingMessageId = lruGet(pendingMessageIdByTickerRef.current, key);
      if (pendingMessageId) {
        if (
          !patchAssistantMessage(channelId, pendingMessageId, {
            content: buildCardTimeoutReply(normalizedTicker),
            status: "error",
            refreshPending: false
          })
        ) {
          delete pendingMessageIdByTickerRef.current[key];
        }
        return;
      }

      const cardMessageId = lruGet(cardMessageIdByTickerRef.current, key);
      if (!cardMessageId) {
        return;
      }

      if (!patchAssistantMessage(channelId, cardMessageId, { refreshPending: false })) {
        delete cardMessageIdByTickerRef.current[key];
      }
    },
    [patchAssistantMessage]
  );

  const clearPendingRefreshTimer = useCallback((channelId: string, ticker: string) => {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    if (!normalizedTicker) {
      return;
    }

    const key = pendingRefreshTimerKey(channelId, normalizedTicker);
    const timerId = pendingRefreshTimersRef.current[key];
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      delete pendingRefreshTimersRef.current[key];
    }
  }, []);

  const clearPendingRefreshPoll = useCallback((channelId: string, ticker: string) => {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    if (!normalizedTicker) {
      return;
    }

    const key = pendingRefreshTimerKey(channelId, normalizedTicker);
    delete pendingRefreshPollTokensRef.current[key];
  }, []);

  const armPendingRefreshPoll = useCallback(
    (channelId: string, ticker: string, intent: ChatIntent) => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return;
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      if (pendingRefreshPollTokensRef.current[key] !== undefined) {
        return;
      }

      const token = (pendingRefreshPollSeqRef.current += 1);
      pendingRefreshPollTokensRef.current[key] = token;

      void (async () => {
        while (pendingRefreshPollTokensRef.current[key] === token) {
          await sleep(PENDING_REFRESH_POLL_INTERVAL_MS);
          if (pendingRefreshPollTokensRef.current[key] !== token) {
            return;
          }

          try {
            const fetcher = fetchAndRenderCardRef.current;
            if (!fetcher) {
              delete pendingRefreshPollTokensRef.current[key];
              return;
            }

            const refreshed = await fetcher(normalizedTicker, {
              channelId,
              intent,
              source: "sse"
            });

            if (!refreshed || !isBackendRefreshPending(refreshed)) {
              delete pendingRefreshPollTokensRef.current[key];
              return;
            }
          } catch (error) {
            if (error instanceof ApiClientError && !isRetryableError(error)) {
              delete pendingRefreshPollTokensRef.current[key];
              return;
            }
          }
        }
      })();
    },
    []
  );

  const armPendingRefreshTimer = useCallback(
    (channelId: string, ticker: string) => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return;
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      if (pendingRefreshTimersRef.current[key] !== undefined) {
        return;
      }

      pendingRefreshTimersRef.current[key] = window.setTimeout(() => {
        delete pendingRefreshTimersRef.current[key];
        markTickerRefreshFailed(channelId, normalizedTicker);
      }, PENDING_REFRESH_TIMEOUT_MS);
    },
    [markTickerRefreshFailed]
  );

  const settlePendingRefreshTimer = useCallback(
    (
      channelId: string,
      ticker: string,
      refreshPending: boolean,
      intent: ChatIntent
    ) => {
      if (refreshPending) {
        armPendingRefreshTimer(channelId, ticker);
        armPendingRefreshPoll(channelId, ticker, intent);
        return;
      }

      clearPendingRefreshTimer(channelId, ticker);
      clearPendingRefreshPoll(channelId, ticker);
    },
    [
      armPendingRefreshPoll,
      armPendingRefreshTimer,
      clearPendingRefreshPoll,
      clearPendingRefreshTimer
    ]
  );

  const fetchCardWithRetry = useCallback(async (ticker: string) => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await fetchCardDto(ticker, {
          ifNoneMatch: lruGet(etagByTickerRef.current, ticker) ?? null
        });
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error) || attempt === 2) {
          throw error;
        }

        const waitMs = (error.retryAfterSec ?? 1) * 1000;
        await sleep(Math.min(4000, Math.max(500, waitMs)));
      }
    }

    throw lastError;
  }, []);

  const fetchAndRenderCard = useCallback(
    async (ticker: string, options: FetchCardOptions): Promise<CardViewModel | null> => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        if (
          options.source === "card_select" &&
          options.targetMessageId &&
          patchAssistantMessage(options.channelId, options.targetMessageId, {
            content: buildInvalidTickerReply(ticker),
            intent: options.intent,
            status: "error",
            refreshPending: false
          })
        ) {
          return null;
        }
        pushAssistantMessage(options.channelId, buildInvalidTickerReply(ticker), {
          intent: options.intent,
          status: "error"
        });
        return null;
      }
      if (options.source === "command") {
        setUtilityTickerForChannel(options.channelId, normalizedTicker);
      }

      const fetchResult = await fetchCardWithRetry(normalizedTicker);
      let viewModel: CardViewModel | null = null;

      if (fetchResult.kind === "not_modified") {
        if (fetchResult.etag) {
          lruSet(
            etagByTickerRef.current,
            normalizedTicker,
            fetchResult.etag,
            MAX_ETAG_CACHE_ENTRIES
          );
        }

        viewModel = lruGet(cardCacheRef.current, normalizedTicker) ?? null;
      } else {
        if (fetchResult.etag) {
          lruSet(
            etagByTickerRef.current,
            normalizedTicker,
            fetchResult.etag,
            MAX_ETAG_CACHE_ENTRIES
          );
        }

        const previousViewModel = lruGet(cardCacheRef.current, normalizedTicker) ?? null;
        viewModel = mergePendingSnapshotFields(
          previousViewModel,
          adaptCardResponse(fetchResult.payload)
        );
        lruSet(
          cardCacheRef.current,
          normalizedTicker,
          viewModel,
          MAX_CARD_CACHE_ENTRIES
        );
      }

      if (!viewModel) {
        return null;
      }

      upsertCardViewModel(viewModel);
      const statusLabel = options.source === "sse" ? "updated." : "ready.";
      const treatment = selectCardDisplayTreatment(viewModel, statusLabel);
      const tickerKey = pendingRefreshTimerKey(options.channelId, normalizedTicker);

      if (treatment.kind === "not_found") {
        clearPendingRefreshTimer(options.channelId, normalizedTicker);
        clearPendingRefreshPoll(options.channelId, normalizedTicker);
        clearTrackedMessagesForTicker(options.channelId, normalizedTicker);
        if (
          options.source === "card_select" &&
          options.targetMessageId &&
          patchAssistantMessage(options.channelId, options.targetMessageId, {
            content: treatment.content,
            intent: options.intent,
            tickers: [normalizedTicker],
            status: treatment.status,
            refreshPending: false
          })
        ) {
          return viewModel;
        }
        pushAssistantMessage(options.channelId, treatment.content, {
          intent: options.intent,
          tickers: [normalizedTicker],
          status: treatment.status
        });
        return viewModel;
      }

      if (treatment.kind === "missing") {
        settlePendingRefreshTimer(
          options.channelId,
          normalizedTicker,
          treatment.refreshPending,
          options.intent
        );
        if (options.source === "card_select" && options.targetMessageId) {
          lruSet(
            pendingMessageIdByTickerRef.current,
            tickerKey,
            options.targetMessageId,
            MAX_TRACKED_MESSAGE_ENTRIES
          );
          lruSet(
            cardMessageIdByTickerRef.current,
            tickerKey,
            options.targetMessageId,
            MAX_TRACKED_MESSAGE_ENTRIES
          );
          patchAssistantMessage(options.channelId, options.targetMessageId, {
            content: treatment.content,
            intent: options.intent,
            tickers: [normalizedTicker],
            status: treatment.status,
            refreshPending: treatment.refreshPending
          });
          touchTicker(normalizedTicker);
          return viewModel;
        }
        upsertPendingMessageForTicker(options.channelId, normalizedTicker, {
          content: treatment.content,
          intent: options.intent,
          status: treatment.status,
          refreshPending: treatment.refreshPending
        });
        touchTicker(normalizedTicker);
        return viewModel;
      }

      const selectedCards = selectCardsForIntent(viewModel.cards, options.intent);
      settlePendingRefreshTimer(
        options.channelId,
        normalizedTicker,
        isBackendRefreshPending(viewModel),
        options.intent
      );
      if (options.source === "card_select" && options.targetMessageId) {
        lruSet(
          pendingMessageIdByTickerRef.current,
          tickerKey,
          options.targetMessageId,
          MAX_TRACKED_MESSAGE_ENTRIES
        );
        lruSet(
          cardMessageIdByTickerRef.current,
          tickerKey,
          options.targetMessageId,
          MAX_TRACKED_MESSAGE_ENTRIES
        );
        patchAssistantMessage(options.channelId, options.targetMessageId, {
          content: treatment.content,
          intent: options.intent,
          tickers: [normalizedTicker],
          cards: selectedCards.length ? selectedCards : viewModel.cards,
          status: "sent",
          refreshPending: treatment.refreshPending
        });
        touchTicker(normalizedTicker);
        return viewModel;
      }
      upsertCardMessageForTicker(options.channelId, normalizedTicker, {
        content: treatment.content,
        intent: options.intent,
        cards: selectedCards.length ? selectedCards : viewModel.cards,
        refreshPending: treatment.refreshPending
      });
      touchTicker(normalizedTicker);
      return viewModel;
    },
    [
      clearPendingRefreshTimer,
      clearPendingRefreshPoll,
      clearTrackedMessagesForTicker,
      fetchCardWithRetry,
      patchAssistantMessage,
      pushAssistantMessage,
      settlePendingRefreshTimer,
      setUtilityTickerForChannel,
      touchTicker,
      upsertCardMessageForTicker,
      upsertPendingMessageForTicker,
      upsertCardViewModel
    ]
  );
  fetchAndRenderCardRef.current = fetchAndRenderCard;

  const fetchTickerFromSse = useCallback(
    (
      channelId: string,
      ticker: string,
      intent: ChatIntent,
      options: { requireFocused?: boolean } = {}
    ): boolean => {
      const normalizedTicker = normalizeTickerSymbol(ticker);
      if (!normalizedTicker) {
        return false;
      }

      const requireFocused = options.requireFocused ?? true;
      if (requireFocused) {
        const focusedTicker = getFocusedTickerForChannel(channelId);
        if (!focusedTicker) {
          return false;
        }
        if (focusedTicker !== normalizedTicker) {
          return false;
        }
      }

      const key = pendingRefreshTimerKey(channelId, normalizedTicker);
      if (lruGet(sseInFlightByTickerRef.current, key)) {
        return true;
      }

      const nowMs = Date.now();
      const lastFetchAt = lruGet(sseLastFetchAtRef.current, key) ?? 0;
      if (nowMs - lastFetchAt < SSE_CARD_FETCH_COOLDOWN_MS) {
        return true;
      }

      lruSet(
        sseInFlightByTickerRef.current,
        key,
        true,
        MAX_SSE_TRACKING_ENTRIES
      );
      lruSet(
        sseLastFetchAtRef.current,
        key,
        nowMs,
        MAX_SSE_TRACKING_ENTRIES
      );

      void fetchAndRenderCard(normalizedTicker, {
        channelId,
        intent,
        source: "sse"
      })
        .catch(() => {
          clearPendingRefreshTimer(channelId, normalizedTicker);
          markTickerRefreshFailed(channelId, normalizedTicker);
        })
        .finally(() => {
          delete sseInFlightByTickerRef.current[key];
        });

      return true;
    },
    [
      clearPendingRefreshTimer,
      fetchAndRenderCard,
      getFocusedTickerForChannel,
      markTickerRefreshFailed
    ]
  );
  const fetchTickerFromSseRef = useLatestRef(fetchTickerFromSse);
  const pushAssistantMessageRef = useLatestRef(pushAssistantMessage);
  const setChannelErrorRef = useLatestRef(setChannelError);
  const touchTickerRef = useLatestRef(touchTicker);

  const runTerminalCommand = useCallback(
    async (params: {
      channelId: string;
      parsedDraft: ReturnType<typeof parseComposerText>;
      intent: ChatIntent;
    }) => {
      const { channelId, parsedDraft, intent } = params;
      const commandName = parsedDraft.commandName?.toLowerCase();
      const primaryTicker = normalizeTickerSymbol(
        parsedDraft.tickers[0] ?? parsedDraft.bareTickerOnly ?? ""
      );

      if (commandName === "scan" || intent === "scan") {
        const gappers = adaptGappersResponse(await fetchTopGappersDto(12));
        pushAssistantMessage(channelId, formatGappersLine(gappers), {
          intent: "scan",
          tickers: gappers.map((item) => item.ticker).slice(0, 6)
        });
        mergeTickers(gappers.map((item) => item.ticker).slice(0, 4));
        if (gappers[0]) {
          clearTrackedMessagesForTicker(channelId, gappers[0].ticker);
          await fetchAndRenderCard(gappers[0].ticker, {
            channelId,
            intent: "scan",
            source: "command"
          });
        }
        return;
      }

      if (commandName === "analyze") {
        if (!primaryTicker) {
          pushAssistantMessage(channelId, commandUsageReply("analyze"), {
            intent,
            status: "error"
          });
          return;
        }

        const startedAt = performance.now();
        clearTrackedMessagesForTicker(channelId, primaryTicker);
        const cardPromise = fetchAndRenderCard(primaryTicker, {
          channelId,
          intent: "deep_dive",
          source: "command"
        });
        const response = adaptAnalyzeResponse(await postAnalyzeTickerDto(primaryTicker));
        const queuedLabel = response.enqueued
          ? `Analysis queued for ${response.ticker}.`
          : response.deduped
            ? `${response.ticker} is already queued.`
            : `Analyze request accepted for ${response.ticker}.`;
        pushAssistantMessage(channelId, queuedLabel, {
          intent,
          tickers: [response.ticker]
        });

        if (response.ticker !== primaryTicker) {
          clearTrackedMessagesForTicker(channelId, response.ticker);
          const results = await Promise.allSettled([
            cardPromise,
            fetchAndRenderCard(response.ticker, {
              channelId,
              intent: "deep_dive",
              source: "command"
            })
          ]);
          if (results[1].status === "rejected") {
            throw results[1].reason;
          }
        } else {
          await cardPromise;
        }
        if (process.env.NODE_ENV !== "production") {
          console.info("[qa-latency] analyze parallelized", {
            ticker: response.ticker,
            elapsedMs: Math.round(performance.now() - startedAt)
          });
        }
        return;
      }

      if (commandName === "pin") {
        if (!primaryTicker) {
          pushAssistantMessage(channelId, commandUsageReply("pin"), {
            intent,
            status: "error"
          });
          return;
        }

        const startedAt = performance.now();
        clearTrackedMessagesForTicker(channelId, primaryTicker);
        const cardPromise = fetchAndRenderCard(primaryTicker, {
          channelId,
          intent,
          source: "command"
        });
        const response = adaptPinResponse(await pinTickerDto(primaryTicker));
        const queuedLabel = response.enqueued
          ? `Pinned ${response.ticker}; backend focus refresh requested.`
          : response.deduped
            ? `${response.ticker} pin request deduped.`
            : `Pin accepted for ${response.ticker}.`;
        pushAssistantMessage(channelId, queuedLabel, {
          intent,
          tickers: [response.ticker]
        });

        if (response.ticker !== primaryTicker) {
          clearTrackedMessagesForTicker(channelId, response.ticker);
          const results = await Promise.allSettled([
            cardPromise,
            fetchAndRenderCard(response.ticker, {
              channelId,
              intent,
              source: "command"
            })
          ]);
          if (results[1].status === "rejected") {
            throw results[1].reason;
          }
        } else {
          await cardPromise;
        }
        if (process.env.NODE_ENV !== "production") {
          console.info("[qa-latency] pin parallelized", {
            ticker: response.ticker,
            elapsedMs: Math.round(performance.now() - startedAt)
          });
        }
        return;
      }

      if (primaryTicker) {
        clearTrackedMessagesForTicker(channelId, primaryTicker);
        await fetchAndRenderCard(primaryTicker, {
          channelId,
          intent,
          source: "command"
        });
        return;
      }

      pushAssistantMessage(channelId, buildInvalidTickerReply(parsedDraft.normalizedMessage), {
        intent,
        status: "error"
      });
    },
    [clearTrackedMessagesForTicker, fetchAndRenderCard, mergeTickers, pushAssistantMessage]
  );

  useEffect(() => {
    let cancelled = false;
    setChannelsLoading(true);

    void (async () => {
      try {
        const catalogResponse = await fetchChannelsCatalogDto();
        if (cancelled) {
          return;
        }

        const backendChannels = (catalogResponse.catalog ?? [])
          .map((item) => {
            const channelName = normalizeChannelName(String(item.name ?? ""));
            if (!channelName) {
              return null;
            }
            const rawSortOrder = item.sort_order ?? item.order;
            const sortOrder = Number.isFinite(Number(rawSortOrder))
              ? Math.trunc(Number(rawSortOrder))
              : defaultSortOrderForChannel(channelName);
            const isPremium = Boolean(item.is_premium ?? item.premium ?? false);
            return {
              name: channelName,
              displayName: channelDisplayName(channelName, item.display_name),
              sortOrder,
              isPremium
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        setBackendChannels(backendChannels);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? formatApiError(error)
            : "Unable to load channels from backend.";
        setChannelsError(message);
        ensureChannel("live_gappers", "Live Gappers");
      } finally {
        if (!cancelled) {
          setChannelsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureChannel, setBackendChannels, setChannelsError, setChannelsLoading]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(streamStorageKeyRef.current);
      if (stored?.trim()) {
        streamLastEventIdRef.current = stored.trim();
      }
    } catch {
      streamLastEventIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!channelsHydrated || !selectedChannelId) {
      return;
    }
    const focusedTicker = getFocusedTickerForChannel(selectedChannelId);
    if (!focusedTicker) {
      return;
    }

    const previous = lruGet(latestPrefetchByChannelRef.current, selectedChannelId);
    if (previous === focusedTicker) {
      return;
    }
    lruSet(
      latestPrefetchByChannelRef.current,
      selectedChannelId,
      focusedTicker,
      MAX_PREFETCH_CHANNEL_ENTRIES
    );

    void (async () => {
      try {
        const fetchResult = await fetchCardWithRetry(focusedTicker);
        if (fetchResult.kind === "not_modified") {
          if (fetchResult.etag) {
            lruSet(
              etagByTickerRef.current,
              focusedTicker,
              fetchResult.etag,
              MAX_ETAG_CACHE_ENTRIES
            );
          }
          return;
        }
        if (fetchResult.etag) {
          lruSet(
            etagByTickerRef.current,
            focusedTicker,
            fetchResult.etag,
            MAX_ETAG_CACHE_ENTRIES
          );
        }
        const viewModel = adaptCardResponse(fetchResult.payload);
        lruSet(
          cardCacheRef.current,
          focusedTicker,
          viewModel,
          MAX_CARD_CACHE_ENTRIES
        );
        upsertCardViewModel(viewModel);
      } catch {
        // Silent prefetch only; explicit card interactions surface errors.
      }
    })();
  }, [
    channelsHydrated,
    fetchCardWithRetry,
    getFocusedTickerForChannel,
    selectedChannelId,
    upsertCardViewModel
  ]);

  useEffect(() => {
    setSelectedAutocompleteIndex(0);
  }, [draft]);

  useEffect(() => {
    const onFillComposer = (event: Event) => {
      const detail = (event as ComposerFillEvent).detail;
      if (!detail?.text) {
        return;
      }

      setDraft(detail.text);
      composerRef.current?.focus();
    };

    window.addEventListener("gapper:composer-fill", onFillComposer as EventListener);
    return () => window.removeEventListener("gapper:composer-fill", onFillComposer as EventListener);
  }, []);

  useEffect(() => {
    const onCardRefreshRequested = (event: Event) => {
      const detail = (event as CardRefreshRequestEvent).detail;
      const channelId = typeof detail?.channelId === "string" ? detail.channelId : "";
      const messageId = typeof detail?.messageId === "string" ? detail.messageId : "";
      const ticker = normalizeTickerSymbol(String(detail?.ticker ?? ""));
      const intent = detail?.intent ?? "message";
      if (!channelId || !messageId || !ticker) {
        return;
      }

      setUtilityTickerForChannel(channelId, ticker);
      const key = pendingRefreshTimerKey(channelId, ticker);
      lruSet(
        pendingMessageIdByTickerRef.current,
        key,
        messageId,
        MAX_TRACKED_MESSAGE_ENTRIES
      );
      lruSet(
        cardMessageIdByTickerRef.current,
        key,
        messageId,
        MAX_TRACKED_MESSAGE_ENTRIES
      );
      patchAssistantMessage(channelId, messageId, {
        tickers: [ticker],
        intent,
        status: "sent",
        refreshPending: true
      });

      void fetchAndRenderCard(ticker, {
        channelId,
        intent,
        source: "card_select",
        targetMessageId: messageId
      }).catch((error) => {
        clearPendingRefreshTimer(channelId, ticker);
        clearPendingRefreshPoll(channelId, ticker);
        if (error instanceof ApiClientError && !isRetryableError(error)) {
          patchAssistantMessage(channelId, messageId, {
            content: formatApiError(error),
            status: "error",
            refreshPending: false
          });
          return;
        }
        markTickerRefreshFailed(channelId, ticker);
      });
    };

    window.addEventListener(
      "gapper:card-refresh-request",
      onCardRefreshRequested as EventListener
    );
    return () =>
      window.removeEventListener(
        "gapper:card-refresh-request",
        onCardRefreshRequested as EventListener
      );
  }, [
    clearPendingRefreshPoll,
    clearPendingRefreshTimer,
    fetchAndRenderCard,
    markTickerRefreshFailed,
    patchAssistantMessage,
    setUtilityTickerForChannel
  ]);

  useEffect(() => {
    if (!selectedChannelId || bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    void (async () => {
      try {
        const gappers = adaptGappersResponse(await fetchTopGappersDto(8));
        if (gappers.length === 0) {
          return;
        }

        mergeTickers(gappers.map((item) => item.ticker).slice(0, 4));
        pushAssistantMessage(selectedChannelId, `Backend connected. ${formatGappersLine(gappers.slice(0, 6))}`, {
          intent: "scan",
          tickers: gappers.map((item) => item.ticker).slice(0, 6)
        });
      } catch (error) {
        if (error instanceof ApiClientError) {
          pushAssistantMessage(selectedChannelId, formatApiError(error), {
            intent: "message",
            status: "error"
          });
        }
      }
    })();
  }, [mergeTickers, pushAssistantMessage, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) {
      return;
    }

    const onWatchlistAdded = (event: Event) => {
      const detail = (event as WatchlistAddedEvent).detail;
      const ticker = normalizeTickerSymbol(detail?.ticker ?? "");
      if (!ticker) {
        return;
      }

      void (async () => {
        try {
          await pinTickerDto(ticker);
        } catch (error) {
          if (error instanceof ApiClientError && error.status === 401) {
            return;
          }

          if (error instanceof ApiClientError) {
            pushAssistantMessage(selectedChannelId, `${ticker}: ${formatApiError(error)}`, {
              intent: "message",
              tickers: [ticker],
              status: "error"
            });
            return;
          }
        }
      })();
    };

    window.addEventListener("gapper:watchlist-added", onWatchlistAdded as EventListener);
    return () => window.removeEventListener("gapper:watchlist-added", onWatchlistAdded as EventListener);
  }, [pushAssistantMessage, selectedChannelId]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(pendingRefreshTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      pendingRefreshTimersRef.current = {};
      pendingRefreshPollTokensRef.current = {};
      cardCacheRef.current = {};
      etagByTickerRef.current = {};
      pendingMessageIdByTickerRef.current = {};
      cardMessageIdByTickerRef.current = {};
      sseInFlightByTickerRef.current = {};
      sseLastFetchAtRef.current = {};
      lastGapperSeparatorByChannelRef.current = {};
      latestPrefetchByChannelRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!channelsHydrated) {
      return;
    }

    let disposed = false;
    let streamAbortController: AbortController | null = null;
    let fallbackPollTimer: number | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const stopStream = () => {
      if (streamAbortController) {
        streamAbortController.abort();
        streamAbortController = null;
      }
    };

    const stopFallbackPolling = () => {
      if (fallbackPollTimer !== null) {
        window.clearInterval(fallbackPollTimer);
        fallbackPollTimer = null;
      }
    };

    const startFallbackPolling = (reason: string) => {
      if (disposed || fallbackPollTimer !== null) {
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn("[qa-sse] fallback polling enabled", { reason });
      }
      fallbackPollTimer = window.setInterval(() => {
        const activeChannelId = selectedChannelIdRef.current;
        if (!activeChannelId) {
          return;
        }
        const focusedTicker = getFocusedTickerForChannel(activeChannelId);
        if (!focusedTicker) {
          return;
        }
        fetchTickerFromSseRef.current(activeChannelId, focusedTicker, "message");
      }, STREAM_FALLBACK_POLL_INTERVAL_MS);
    };

    const persistLastEventId = (eventId: string | null) => {
      if (!eventId?.trim()) {
        return;
      }
      const cleaned = eventId.trim();
      streamLastEventIdRef.current = cleaned;
      try {
        window.localStorage.setItem(streamStorageKeyRef.current, cleaned);
      } catch {
        // Best-effort persistence only.
      }
    };

    const scheduleReconnect = (failure?: unknown) => {
      if (disposed || streamReconnectExhaustedRef.current) {
        return;
      }

      stopStream();
      clearReconnectTimer();

      let delayMs = Math.min(15000, 500 * 2 ** reconnectAttemptRef.current);
      let countAttempt = true;

      if (failure instanceof ApiClientError && failure.status === 429) {
        countAttempt = false;
        const retryAfterMs = (failure.retryAfterSec ?? 5) * 1000;
        delayMs = Math.min(60000, Math.max(2000, retryAfterMs));
      }

      if (countAttempt) {
        reconnectAttemptRef.current += 1;
        if (reconnectAttemptRef.current > MAX_STREAM_RECONNECT_ATTEMPTS) {
          streamReconnectExhaustedRef.current = true;
          const activeChannelId = selectedChannelIdRef.current;
          if (activeChannelId) {
            setChannelErrorRef.current(
              activeChannelId,
              `Realtime stream paused after ${MAX_STREAM_RECONNECT_ATTEMPTS} retries.`
            );
          }
          startFallbackPolling("reconnect_exhausted");
          return;
        }
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delayMs);
    };

    const handleUserStreamFrame = (frame: SseFrameDto) => {
      reconnectAttemptRef.current = 0;
      streamReconnectExhaustedRef.current = false;
      stopFallbackPolling();
      const activeChannelId = selectedChannelIdRef.current;
      if (activeChannelId) {
        setChannelErrorRef.current(activeChannelId, null);
      }

      if (frame.id) {
        persistLastEventId(frame.id);
      }
      if (frame.comment) {
        return;
      }

      const eventName = frame.event ?? "message";
      if (eventName === "error" || eventName === "fatal_error") {
        if (activeChannelId) {
          setChannelErrorRef.current(activeChannelId, "Realtime stream interruption received.");
        }
        return;
      }
      if (eventName !== "message") {
        return;
      }

      const payload = parseUserChannelMessage(frame.data);
      if (!payload) {
        return;
      }

      const rawChannel = String(payload.channel ?? "").trim();
      const channelKey = normalizeChannelName(rawChannel);
      if (!channelKey) {
        return;
      }

      if (!isKnownChannelName(rawChannel) && process.env.NODE_ENV !== "production") {
        if (!warnedUnknownChannelsRef.current.has(rawChannel)) {
          warnedUnknownChannelsRef.current.add(rawChannel);
          // Keep unknown channels visible and keyed exactly as received.
          console.warn(`Received unknown channel from SSE: ${rawChannel}`);
        }
      }

      const channelId = ensureChannel(channelKey, channelDisplayName(rawChannel));
      if (!channelId) {
        return;
      }

      const shouldGroupGapperEvent =
        channelKey !== "live_gappers" &&
        (payload.event_type === "entered_gapper" ||
          payload.event_type === "card_updated");
      if (shouldGroupGapperEvent) {
        const separator = resolveGapperDaySeparator(payload.ts);
        if (separator) {
          const previousSeparator = lastGapperSeparatorByChannelRef.current[channelId];
          if (previousSeparator !== separator.key) {
            lastGapperSeparatorByChannelRef.current[channelId] = separator.key;
            pushAssistantMessageRef.current(channelId, separator.label, {
              intent: "message",
              status: "sent"
            });
          }
        }
      }

      const normalizedTicker = normalizeTickerSymbol(String(payload.ticker ?? ""));
      if (payload.event_type === "card_updated" && normalizedTicker) {
        fetchTickerFromSseRef.current(channelId, normalizedTicker, "message");
        return;
      }
      if (payload.event_type === "entered_gapper" && normalizedTicker) {
        fetchTickerFromSseRef.current(channelId, normalizedTicker, "quick_gap", {
          requireFocused: false
        });
        return;
      }

      const text = formatSseMessageText(payload, normalizedTicker);
      pushAssistantMessageRef.current(channelId, text, {
        intent: "message",
        tickers: normalizedTicker ? [normalizedTicker] : [],
        status: payload.event_type === "system" ? "sent" : undefined
      });
      if (normalizedTicker) {
        touchTickerRef.current(normalizedTicker);
      }
    };

    const connect = () => {
      if (disposed || streamReconnectExhaustedRef.current) {
        return;
      }

      stopStream();
      clearReconnectTimer();
      stopFallbackPolling();

      const controller = new AbortController();
      streamAbortController = controller;

      void consumeUserMessagesStream({
        signal: controller.signal,
        replay: USER_STREAM_REPLAY_COUNT,
        heartbeatSec: USER_STREAM_HEARTBEAT_SEC,
        lastEventId: streamLastEventIdRef.current,
        onFrame: handleUserStreamFrame
      })
        .then(() => {
          if (disposed || controller.signal.aborted) {
            return;
          }
          scheduleReconnect();
        })
        .catch((error: unknown) => {
          if (disposed || controller.signal.aborted) {
            return;
          }
          if (error instanceof ApiClientError) {
            const activeChannelId = selectedChannelIdRef.current;
            if (activeChannelId) {
              setChannelErrorRef.current(activeChannelId, formatApiError(error));
            }
            if (error.code === "too_many_streams") {
              startFallbackPolling("too_many_streams");
              return;
            }
            if (!isRetryableError(error)) {
              startFallbackPolling("non_retryable_api_error");
              return;
            }
          }
          if (
            error instanceof Error &&
            error.message === "invalid_sse_content_type"
          ) {
            const activeChannelId = selectedChannelIdRef.current;
            if (activeChannelId) {
              setChannelErrorRef.current(activeChannelId, "Realtime stream unavailable.");
            }
            startFallbackPolling("invalid_sse_content_type");
            return;
          }
          scheduleReconnect(error);
        });
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
       stopFallbackPolling();
      stopStream();
    };
  }, [
    channelsHydrated,
    ensureChannel,
    fetchTickerFromSseRef,
    getFocusedTickerForChannel,
    pushAssistantMessageRef,
    selectedChannelIdRef,
    setChannelErrorRef,
    touchTickerRef
  ]);

  const handleSend = useCallback(
    async (forceIntent?: ChatIntent) => {
      const trimmed = draft.trim();
      const activeChannelId =
        selectedChannelId || ensureChannel("live_gappers", "Live Gappers");
      if (!trimmed || !activeChannelId || isSending) {
        return;
      }

      const parsedDraft = parseComposerText(trimmed);
      const intent = forceIntent ?? parsedDraft.intent;

      const resolvedTickers = Array.from(
        new Set(
          [parsedDraft.tickers[0], parsedDraft.bareTickerOnly]
            .map((ticker) => normalizeTickerSymbol(ticker ?? ""))
            .filter((ticker): ticker is string => Boolean(ticker))
        )
      );

      sendUserMessage(activeChannelId, {
        content: trimmed,
        intent,
        tickers: resolvedTickers,
        mode: tradingMode
      });

      setIsSending(true);
      setDraft("");
      setChannelLoading(activeChannelId, true);
      setChannelError(activeChannelId, null);

      const start = performance.now();

      try {
        await runTerminalCommand({
          channelId: activeChannelId,
          parsedDraft,
          intent
        });
        const duration = Math.round(performance.now() - start);
        setLatency(duration);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? formatApiError(error)
            : "Request failed due to an unknown error.";
        setChannelError(activeChannelId, message);

        pushAssistantMessage(activeChannelId, message, {
          intent,
          tickers: resolvedTickers,
          status: "error"
        });
      } finally {
        setIsSending(false);
        setChannelLoading(activeChannelId, false);
      }
    },
    [
      draft,
      ensureChannel,
      isSending,
      pushAssistantMessage,
      runTerminalCommand,
      selectedChannelId,
      sendUserMessage,
      setChannelError,
      setChannelLoading,
      setDraft,
      setIsSending,
      setLatency,
      tradingMode
    ]
  );

  function applyAutocomplete(value: string) {
    if (value.startsWith("/")) {
      setDraft(value);
      return;
    }

    const tokens = draft.split(/\s+/);
    tokens[tokens.length - 1] = value;
    setDraft(tokens.join(" ").trim());
  }

  return (
    <section className="glass-panel mt-3 space-y-2 p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border/70 bg-panel-soft/40 p-1 text-xs">
          <button
            type="button"
            className={`rounded px-2 py-1 ${tradingMode === "paper" ? "bg-panel-strong" : "text-muted"}`}
            onClick={() => setTradingMode("paper")}
          >
            paper
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${tradingMode === "live" ? "bg-panel-strong" : "text-muted"}`}
            onClick={() => setTradingMode("live")}
          >
            live
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            {latencyMs ? `${latencyMs}ms` : "-- ms"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" />
            risk {riskProfile}
          </span>
        </div>
      </header>

      <Textarea
        ref={composerRef}
        value={draft}
        placeholder="Try analyze NVDA, pin $AAPL, card TSLA, or /scan gappers"
        className="min-h-[72px] resize-none font-mono"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (commandLookupMode && autocompleteOptions.length && event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedAutocompleteIndex((prev) => (prev + 1) % autocompleteOptions.length);
            return;
          }

          if (commandLookupMode && autocompleteOptions.length && event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedAutocompleteIndex((prev) =>
              prev === 0 ? autocompleteOptions.length - 1 : prev - 1
            );
            return;
          }

          if (commandLookupMode && autocompleteOptions.length && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            applyAutocomplete(autocompleteOptions[selectedAutocompleteIndex]?.value ?? "");
            return;
          }

          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            void handleSend("deep_dive");
            return;
          }

          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
      />

      {parsed.tickers.length ? (
        <div className="flex flex-wrap gap-1">
          {parsed.tickers.map((ticker) => (
            <span key={ticker} className="ticker-chip">
              {ticker}
            </span>
          ))}
        </div>
      ) : null}

      <CommandAutocomplete
        options={autocompleteOptions}
        selectedIndex={selectedAutocompleteIndex}
        onPick={applyAutocomplete}
      />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted">Enter to send, Shift+Enter for deep dive.</p>
        <Button onClick={() => void handleSend()} disabled={!draft.trim() || isSending} className="gap-1">
          <Send className="h-4 w-4" />
          {isSending ? "Sending" : "Send"}
        </Button>
      </div>
    </section>
  );
}

"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Clock3, Copy, PenSquare, Siren, Star } from "lucide-react";
import { GapAnalysisCard } from "@/components/cards/GapAnalysisCard";
import { LevelsCard } from "@/components/cards/LevelsCard";
import { NewsCard } from "@/components/cards/NewsCard";
import { RiskPlanCard } from "@/components/cards/RiskPlanCard";
import { TickerSnapshotCard } from "@/components/cards/TickerSnapshotCard";
import { TradeIdeaCard } from "@/components/cards/TradeIdeaCard";
import { MissingDataState } from "@/components/common/MissingDataState";
import { DEFAULT_FALLBACK_TICKER } from "@/config/tickers";
import { Button } from "@/components/ui/button";
import { useAlertsStore } from "@/stores/useAlertsStore";
import { useUIStore } from "@/stores/useUIStore";
import { useWatchlistStore } from "@/stores/useWatchlistStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { AssistantCard, ChatIntent } from "@/types/chat";

interface CardRendererProps {
  card: AssistantCard;
  compact?: boolean;
  showRefreshIndicator?: boolean;
  messageId?: string;
  messageIntent?: ChatIntent;
}

type CardTheme = {
  accentLabel: string;
  accentPillClassName: string;
  containerClassName: string;
  refreshClassName: string;
};

const CARD_THEMES: Record<AssistantCard["type"], CardTheme> = {
  ticker_snapshot: {
    accentLabel: "Snapshot",
    accentPillClassName: "border-cyan-300/50 bg-cyan-300/16 text-cyan-100",
    containerClassName:
      "border-cyan-300/35 bg-[linear-gradient(152deg,rgba(34,211,238,0.20),rgba(10,16,28,0.82))] hover:border-cyan-200/70",
    refreshClassName: "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
  },
  trade_idea: {
    accentLabel: "Trade Idea",
    accentPillClassName: "border-amber-300/50 bg-amber-300/18 text-amber-100",
    containerClassName:
      "border-amber-300/35 bg-[linear-gradient(152deg,rgba(251,191,36,0.20),rgba(24,14,8,0.84))] hover:border-amber-200/70",
    refreshClassName: "border-amber-300/45 bg-amber-300/12 text-amber-100"
  },
  gap_analysis: {
    accentLabel: "Gap Analysis",
    accentPillClassName: "border-emerald-300/50 bg-emerald-300/18 text-emerald-100",
    containerClassName:
      "border-emerald-300/35 bg-[linear-gradient(152deg,rgba(16,185,129,0.20),rgba(8,20,18,0.86))] hover:border-emerald-200/70",
    refreshClassName: "border-emerald-300/45 bg-emerald-300/12 text-emerald-100"
  },
  levels: {
    accentLabel: "Levels",
    accentPillClassName: "border-slate-300/35 bg-slate-300/8 text-slate-100",
    containerClassName: "border-border/80 bg-panel-strong/35 hover:border-ai/45",
    refreshClassName: "border-slate-300/30 bg-slate-300/10 text-slate-100"
  },
  news: {
    accentLabel: "News",
    accentPillClassName: "border-slate-300/35 bg-slate-300/8 text-slate-100",
    containerClassName: "border-border/80 bg-panel-strong/35 hover:border-ai/45",
    refreshClassName: "border-slate-300/30 bg-slate-300/10 text-slate-100"
  },
  risk_plan: {
    accentLabel: "Risk Plan",
    accentPillClassName: "border-slate-300/35 bg-slate-300/8 text-slate-100",
    containerClassName: "border-border/80 bg-panel-strong/35 hover:border-ai/45",
    refreshClassName: "border-slate-300/30 bg-slate-300/10 text-slate-100"
  }
};

const MISSING_HEADLINES: Record<AssistantCard["type"], string> = {
  ticker_snapshot: "Chart naps when data is gone.",
  levels: "Levels are playing hide-and-seek.",
  news: "Nothing spicy in the feed right now.",
  risk_plan: "No plan. No lies. Just vibes.",
  trade_idea: "Idea engine is in schema hibernation.",
  gap_analysis: "Gap map has blank spots today."
};

const FIXED_HEIGHT_CARD_TYPES = new Set<AssistantCard["type"]>([
  "ticker_snapshot",
  "trade_idea",
  "gap_analysis"
]);
const CARD_REFRESH_CLICK_COOLDOWN_MS = 300;

function serializeCard(card: AssistantCard): string {
  return JSON.stringify(
    {
      title: card.title,
      tickers: card.tickers,
      timestamp: card.timestamp,
      type: card.type,
      data: card.data
    },
    null,
    2
  );
}

function trackDevRender(card: AssistantCard, messageId?: string): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }
  const runtime = window as Window & {
    __gapperRenderMetrics?: Record<string, number>;
  };
  const key = `${messageId ?? "na"}:${card.type}:${card.tickers[0] ?? "ticker"}`;
  const metrics = runtime.__gapperRenderMetrics ?? {};
  metrics[key] = (metrics[key] ?? 0) + 1;
  runtime.__gapperRenderMetrics = metrics;
}

function CardRendererComponent({
  card,
  compact = false,
  showRefreshIndicator = false,
  messageId,
  messageIntent
}: CardRendererProps) {
  trackDevRender(card, messageId);
  const addTicker = useWatchlistStore((state) => state.addTicker);
  const createAlert = useAlertsStore((state) => state.createAlert);
  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const setUtilityTickerForChannel = useUIStore((state) => state.setUtilityTickerForChannel);
  const lastRefreshClickAtRef = useRef(0);
  const [clipboardState, setClipboardState] = useState<"copied" | "journaled" | null>(null);
  const primaryTicker = card.tickers[0] ?? DEFAULT_FALLBACK_TICKER;
  const theme = CARD_THEMES[card.type];
  const headline = MISSING_HEADLINES[card.type];
  const shouldLockCompactHeight = compact && FIXED_HEIGHT_CARD_TYPES.has(card.type);
  const fixedCompactHeightClass = "h-[400px] min-h-[400px] p-2.5";
  const cardSizingClass = compact
    ? shouldLockCompactHeight
      ? fixedCompactHeightClass
      : "h-full min-h-[340px] p-2.5"
    : "h-full min-h-[360px] p-3";
  const isPending = showRefreshIndicator;
  const showLlmPendingState =
    isPending &&
    !card.data &&
    (
      card.type === "trade_idea" ||
      card.type === "risk_plan" ||
      card.type === "gap_analysis"
    );

  useEffect(() => {
    if (!clipboardState) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setClipboardState(null);
    }, 1500);
    return () => window.clearTimeout(timerId);
  }, [clipboardState]);

  const onCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(serializeCard(card));
    setClipboardState("copied");
  };

  const onJournal = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const markdown = [
      `## ${card.title}`,
      `- Ticker: ${primaryTicker}`,
      `- Generated: ${new Date(card.timestamp).toLocaleString()}`,
      "",
      "```json",
      serializeCard(card),
      "```"
    ].join("\n");

    await navigator.clipboard.writeText(markdown);
    setClipboardState("journaled");
  };

  const body = (() => {
    switch (card.type) {
      case "ticker_snapshot":
        return <TickerSnapshotCard data={card.data} pending={isPending} missing={card.missing} />;
      case "levels":
        return <LevelsCard data={card.data} pending={isPending} missing={card.missing} />;
      case "news":
        return <NewsCard data={card.data} pending={isPending} missing={card.missing} />;
      case "risk_plan":
        return <RiskPlanCard data={card.data} pending={isPending} missing={card.missing} />;
      case "trade_idea":
        return <TradeIdeaCard data={card.data} pending={isPending} missing={card.missing} />;
      case "gap_analysis":
        return <GapAnalysisCard data={card.data} pending={isPending} missing={card.missing} />;
      default:
        return null;
    }
  })();

  return (
    <article
      onClick={() => {
        if (!selectedChannelId) {
          return;
        }
        setUtilityTickerForChannel(selectedChannelId, primaryTicker);
        if (!messageId || typeof window === "undefined") {
          return;
        }
        const now = Date.now();
        if (now - lastRefreshClickAtRef.current < CARD_REFRESH_CLICK_COOLDOWN_MS) {
          return;
        }
        lastRefreshClickAtRef.current = now;
        window.dispatchEvent(
          new CustomEvent("gapper:card-refresh-request", {
            detail: {
              channelId: selectedChannelId,
              messageId,
              ticker: primaryTicker,
              intent: messageIntent ?? "message"
            }
          })
        );
      }}
      className={`rounded-xl backdrop-blur-md group relative flex flex-col overflow-hidden border shadow-[0_12px_28px_rgba(0,0,0,0.30)] transition-colors transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.01] ${
        theme.containerClassName
      } ${cardSizingClass}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {card.tickers.map((ticker) => (
            <span key={ticker} className="ticker-chip">
              {ticker}
            </span>
          ))}
          <span
            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${theme.accentPillClassName}`}
          >
            {theme.accentLabel}
          </span>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted">
          <Clock3 className="h-3 w-3" />
          {new Date(card.timestamp).toLocaleTimeString()}
        </p>
      </header>

      <div className={`mt-2 flex-1 ${shouldLockCompactHeight ? "min-h-0 overflow-hidden" : ""}`}>
        {body}
        {showLlmPendingState ? (
          <div className="mt-2 rounded-md border border-border/65 bg-panel-soft/35 p-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-strong">
              <span className="data-pending-shimmer h-2.5 w-2.5 rounded-full" />
              <span>LLM response warming up</span>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Holding full card layout while enrichment is in progress.
            </p>
            <div className="mt-2 space-y-1.5">
              <span className="data-pending-shimmer block h-3.5 w-[92%] rounded-sm" />
              <span className="data-pending-shimmer block h-3.5 w-[78%] rounded-sm" />
            </div>
          </div>
        ) : null}
        {!isPending && card.missing ? (
          <div className="mt-2">
            <MissingDataState headline={headline} missing={card.missing} compact />
          </div>
        ) : null}
      </div>

      {showRefreshIndicator ? (
        <div
          className={`pointer-events-none absolute bottom-12 right-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-[0_4px_16px_rgba(0,0,0,0.4)] ${theme.refreshClassName}`}
        >
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-spin rounded-full border border-current" />
            <span className="absolute inset-[3px] animate-pulse rounded-full bg-current" />
          </span>
          Syncing
        </div>
      ) : null}

      <footer className="mt-2 grid shrink-0 grid-cols-4 gap-1 border-t border-border/60 pt-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 whitespace-nowrap px-1.5 text-[11px]"
          onClick={(event) => {
            event.stopPropagation();
            addTicker(primaryTicker);
          }}
        >
          <Star className="h-3.5 w-3.5" />
          Watchlist
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 whitespace-nowrap px-1.5 text-[11px]"
          onClick={(event) => {
            event.stopPropagation();
            createAlert({
              ticker: primaryTicker,
              condition: "Breaks opening range high",
              notes: `Created from ${card.title}`,
              enabled: true
            });
          }}
        >
          <Siren className="h-3.5 w-3.5" />
          Alert
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 whitespace-nowrap px-1.5 text-[11px]"
          onClick={(event) => {
            event.stopPropagation();
            void onCopy();
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 whitespace-nowrap px-1.5 text-[11px]"
          onClick={(event) => {
            event.stopPropagation();
            void onJournal();
          }}
        >
          <PenSquare className="h-3.5 w-3.5" />
          Journal
        </Button>
        {clipboardState ? (
          <p className="col-span-4 px-1 text-[10px] text-bullish">
            {clipboardState === "copied" ? "Card copied to clipboard." : "Journal markdown copied."}
          </p>
        ) : null}
      </footer>
    </article>
  );
}

function areCardRendererPropsEqual(prev: CardRendererProps, next: CardRendererProps): boolean {
  if (
    prev.compact !== next.compact ||
    prev.showRefreshIndicator !== next.showRefreshIndicator ||
    prev.messageId !== next.messageId ||
    prev.messageIntent !== next.messageIntent
  ) {
    return false;
  }
  if (prev.card === next.card) {
    return true;
  }
  return (
    prev.card.type === next.card.type &&
    prev.card.title === next.card.title &&
    prev.card.timestamp === next.card.timestamp &&
    prev.card.data === next.card.data &&
    prev.card.missing === next.card.missing &&
    prev.card.tickers.length === next.card.tickers.length &&
    prev.card.tickers.every((ticker, index) => ticker === next.card.tickers[index])
  );
}

export const CardRenderer = memo(CardRendererComponent, areCardRendererPropsEqual);
CardRenderer.displayName = "CardRenderer";

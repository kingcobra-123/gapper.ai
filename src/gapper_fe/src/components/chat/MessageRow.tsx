import { memo, useEffect, useMemo, useState } from "react";
import { CardRenderer } from "@/components/cards/CardRenderer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { TickerHoverCard } from "@/components/chat/TickerHoverCard";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

interface MessageRowProps {
  message: ChatMessage;
  compactCards?: boolean;
  showRefreshIndicator?: boolean;
}

const TICKER_TOKEN = /^\$([A-Za-z]{2,6})$/;
const PROCESSING_LINES = [
  "backend gremlins at work",
  "assembling card fragments",
  "arguing with market data",
  "almost there..."
] as const;

function ProcessingIndicator() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % PROCESSING_LINES.length);
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="inline-flex animate-in fade-in duration-200 items-center gap-2 rounded-md border border-ai/45 bg-ai/10 px-2 py-1 text-[11px] text-muted-strong">
      <span className="text-ai">Summoning card</span>
      <span className="inline-flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ai"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
      <span className="text-muted">{PROCESSING_LINES[lineIndex]}</span>
    </div>
  );
}

function renderMessageText(content: string) {
  const pieces = content.split(/(\$[A-Za-z]{2,6}\b)/g);

  return pieces.map((piece, index) => {
    const match = piece.match(TICKER_TOKEN);
    if (!match) {
      return <span key={`${piece}-${index}`}>{piece}</span>;
    }

    const symbol = match[1].toUpperCase();

    return (
      <TickerHoverCard key={`${symbol}-${index}`} symbol={symbol}>
        <button
          type="button"
          className="pointer-events-auto rounded px-1 font-semibold text-ai hover:bg-panel-soft/70"
        >
          {piece}
        </button>
      </TickerHoverCard>
    );
  });
}

function trackMessageRowRender(messageId: string): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }
  const runtime = window as Window & {
    __gapperMessageRowRenderMetrics?: Record<string, number>;
  };
  const metrics = runtime.__gapperMessageRowRenderMetrics ?? {};
  metrics[messageId] = (metrics[messageId] ?? 0) + 1;
  runtime.__gapperMessageRowRenderMetrics = metrics;
}

function MessageRowComponent({
  message,
  compactCards = false,
  showRefreshIndicator = false
}: MessageRowProps) {
  trackMessageRowRender(message.id);
  const renderedMessageText = useMemo(
    () => renderMessageText(message.content),
    [message.content]
  );
  const isUser = message.role === "user";
  const cardCount = message.cards?.length ?? 0;
  const cardsLayoutClass =
    cardCount >= 3
      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <article
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 duration-150 space-y-2 rounded-2xl border p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
        isUser
          ? "ml-auto w-fit max-w-[82%] border-ai/30 bg-[linear-gradient(160deg,rgba(87,196,255,0.18),rgba(87,196,255,0.06))]"
          : "mr-auto w-full border-border/75 bg-panel-strong/35"
      )}
    >
      <header className={cn("flex items-center text-[11px]", isUser ? "justify-end gap-2" : "justify-between")}>
        <p className="font-semibold uppercase tracking-wide text-muted">{message.role}</p>
        <p className="text-muted">{new Date(message.createdAt).toLocaleTimeString()}</p>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{renderedMessageText}</p>

      {showRefreshIndicator && !message.cards?.length ? <ProcessingIndicator /> : null}

      {message.cards?.length ? (
        <div className={`mt-2 grid auto-rows-fr gap-2 ${cardsLayoutClass}`}>
          {message.cards.map((card, index) => (
            <ErrorBoundary
              key={`${message.id}:${card.type}:${card.tickers[0] ?? "ticker"}:${index}`}
              title={`${card.tickers[0] ?? "Card"} card unavailable.`}
              detail="This card failed to render, but the chat stream is still healthy."
            >
              <CardRenderer
                card={card}
                compact={compactCards}
                showRefreshIndicator={showRefreshIndicator}
                messageId={message.id}
                messageIntent={message.intent}
              />
            </ErrorBoundary>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function areMessageRowPropsEqual(prev: MessageRowProps, next: MessageRowProps): boolean {
  return (
    prev.message === next.message &&
    prev.compactCards === next.compactCards &&
    prev.showRefreshIndicator === next.showRefreshIndicator
  );
}

export const MessageRow = memo(MessageRowComponent, areMessageRowPropsEqual);
MessageRow.displayName = "MessageRow";

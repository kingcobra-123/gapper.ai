import { memo } from "react";
import type { NewsData } from "@/types/cards";
import {
  PendingShimmer,
  hasPendingField,
  hasPendingFieldPrefix
} from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface NewsCardProps {
  data?: NewsData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function sentimentClass(sentiment?: "bullish" | "bearish" | "neutral") {
  if (sentiment === "bullish") {
    return "text-bullish";
  }

  if (sentiment === "bearish") {
    return "text-bearish";
  }

  return "text-muted-strong";
}

function NewsCardComponent({ data, pending = false, missing }: NewsCardProps) {
  const news = data ?? { ticker: "" };
  const items = Array.isArray(news.items) ? news.items.slice(0, 5) : [];
  const highlights = Array.isArray(news.highlights) ? news.highlights : [];
  const itemsPending = hasPendingFieldPrefix(missing, "news.items", pending);
  const itemUrlPending = hasPendingField(missing, "news.items.url", pending);
  const highlightsPending = hasPendingField(missing, "news.highlights", pending);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="space-y-2">
        {!items.length && !itemsPending ? (
          <p className="rounded-md border border-border/70 bg-panel-soft/40 p-2 text-[10px] text-muted">
            No prioritized headlines available from backend.
          </p>
        ) : null}
        {!items.length && itemsPending
          ? [0, 1].map((index) => (
              <article
                key={index}
                className="rounded-md border border-border/70 bg-panel-soft/40 p-2"
              >
                <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[92%]" : "w-[84%]"}`} />
                <div className="mt-1 flex items-center justify-between">
                  <PendingShimmer className="h-3 w-16" />
                  <PendingShimmer className="h-3 w-12" />
                </div>
                <PendingShimmer className="mt-2 h-3 w-20" />
              </article>
            ))
          : null}
        {items.map((item) => (
          <article
            key={`${item.headline}-${item.publishedAt}`}
            className="rounded-md border border-border/70 bg-panel-soft/40 p-2"
          >
            <p className="break-words font-medium leading-snug">{item.headline}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] text-muted">{item.source}</p>
              <p className={sentimentClass(item.sentiment)}>{item.sentiment ?? "--"}</p>
            </div>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block break-all text-[10px] text-ai hover:underline"
              >
                Open article
              </a>
            ) : itemUrlPending ? (
              <PendingShimmer className="mt-2 h-3 w-20" />
            ) : null}
          </article>
        ))}
      </div>

      {highlights.length ? (
        <ul className="list-disc space-y-1 pl-4 text-[10px] text-muted-strong">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : highlightsPending ? (
        <ul className="space-y-1">
          {[0, 1].map((index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted/80" />
              <PendingShimmer className={`h-3 ${index === 0 ? "w-[84%]" : "w-[62%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const NewsCard = memo(
  NewsCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
NewsCard.displayName = "NewsCard";

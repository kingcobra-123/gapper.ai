import { memo } from "react";
import type { TickerSnapshotData } from "@/types/cards";
import { PendingShimmer, hasPendingField } from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface TickerSnapshotCardProps {
  data?: TickerSnapshotData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-full rounded-md bg-panel-soft/60 p-1">
      <polyline fill="none" stroke="currentColor" strokeWidth="4" points={points} className="text-bullish" />
    </svg>
  );
}

function TickerSnapshotCardComponent({ data, pending = false, missing }: TickerSnapshotCardProps) {
  const snapshot = data ?? { ticker: "" };
  const hasSparkline = Array.isArray(snapshot.sparkline) && snapshot.sparkline.length >= 3;
  const highlights = Array.isArray(snapshot.highlights) ? snapshot.highlights : [];
  const pricePending = hasPendingField(missing, "ticker_snapshot.price", pending);
  const changePending = hasPendingField(missing, "ticker_snapshot.changePercent", pending);
  const volumePending = hasPendingField(missing, "ticker_snapshot.volume", pending);
  const relativeVolumePending = hasPendingField(missing, "ticker_snapshot.relativeVolume", pending);
  const sparklinePending = hasPendingField(missing, "ticker_snapshot.sparkline.series", pending);
  const highlightsPending = hasPendingField(missing, "ticker_snapshot.highlights", pending);

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Price</p>
          {typeof snapshot.price === "number" ? (
            <p className="font-semibold">{`$${snapshot.price.toFixed(2)}`}</p>
          ) : pricePending ? (
            <PendingShimmer className="mt-1 h-4 w-14" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Change</p>
          {typeof snapshot.changePercent === "number" ? (
            <p
              className={
                snapshot.changePercent >= 0 ? "font-semibold text-bullish" : "font-semibold text-bearish"
              }
            >
              {snapshot.changePercent.toFixed(2)}%
            </p>
          ) : changePending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Volume</p>
          {typeof snapshot.volume === "number" ? (
            <p className="font-semibold">{`${Math.round(snapshot.volume / 1000000)}M`}</p>
          ) : volumePending ? (
            <PendingShimmer className="mt-1 h-4 w-10" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Rel Vol</p>
          {typeof snapshot.relativeVolume === "number" ? (
            <p className="font-semibold">{`${snapshot.relativeVolume.toFixed(2)}x`}</p>
          ) : relativeVolumePending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
      </div>

      {hasSparkline ? (
        <Sparkline values={snapshot.sparkline as number[]} />
      ) : sparklinePending ? (
        <div className="data-pending-shimmer h-10 w-full rounded-md bg-panel-soft/60" />
      ) : (
        <p className="rounded-md border border-border/65 bg-panel-soft/35 p-1.5 text-[11px] text-muted">
          Sparkline not supplied by backend.
        </p>
      )}

      {highlights.length ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {highlights.slice(0, 3).map((item) => (
            <li key={item} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-cyan-200/90" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : highlightsPending ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {[0, 1].map((index) => (
            <li key={index} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
              <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[88%]" : "w-[70%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const TickerSnapshotCard = memo(
  TickerSnapshotCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
TickerSnapshotCard.displayName = "TickerSnapshotCard";

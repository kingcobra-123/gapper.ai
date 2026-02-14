import { memo } from "react";
import type { LevelsData } from "@/types/cards";
import { PendingShimmer, hasPendingField } from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface LevelsCardProps {
  data?: LevelsData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function joinLevels(levels?: number[]): string {
  if (!Array.isArray(levels) || !levels.length) {
    return "--";
  }
  return levels.map((level) => `$${level.toFixed(2)}`).join(" / ");
}

function LevelsCardComponent({ data, pending = false, missing }: LevelsCardProps) {
  const levels = data ?? { ticker: "" };
  const highlights = Array.isArray(levels.highlights) ? levels.highlights : [];
  const supportPending = hasPendingField(missing, "levels.support", pending);
  const resistancePending = hasPendingField(missing, "levels.resistance", pending);
  const entryZonePending = hasPendingField(missing, "levels.entryZone", pending);
  const invalidationPending = hasPendingField(missing, "levels.invalidation", pending);
  const highlightsPending = hasPendingField(missing, "levels.highlights", pending);

  return (
    <div className="space-y-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Support</p>
          {Array.isArray(levels.support) && levels.support.length ? (
            <p className="font-semibold">{joinLevels(levels.support)}</p>
          ) : supportPending ? (
            <PendingShimmer className="mt-1 h-4 w-20" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Resistance</p>
          {Array.isArray(levels.resistance) && levels.resistance.length ? (
            <p className="font-semibold">{joinLevels(levels.resistance)}</p>
          ) : resistancePending ? (
            <PendingShimmer className="mt-1 h-4 w-20" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Entry Zone</p>
          {Array.isArray(levels.entryZone) ? (
            <p className="font-semibold">{`$${levels.entryZone[0].toFixed(2)} - $${levels.entryZone[1].toFixed(2)}`}</p>
          ) : entryZonePending ? (
            <PendingShimmer className="mt-1 h-4 w-24" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Invalidation</p>
          {typeof levels.invalidation === "number" ? (
            <p className="font-semibold text-bearish">{`$${levels.invalidation.toFixed(2)}`}</p>
          ) : invalidationPending ? (
            <PendingShimmer className="mt-1 h-4 w-16" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
      </div>

      {highlights.length ? (
        <ul className="list-disc space-y-1 pl-4 text-muted-strong">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : highlightsPending ? (
        <ul className="space-y-1">
          {[0, 1].map((index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted/80" />
              <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[85%]" : "w-[72%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const LevelsCard = memo(
  LevelsCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
LevelsCard.displayName = "LevelsCard";

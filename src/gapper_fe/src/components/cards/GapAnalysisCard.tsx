import { memo } from "react";
import type { GapAnalysisData } from "@/types/cards";
import { PendingShimmer, hasPendingField } from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface GapAnalysisCardProps {
  data?: GapAnalysisData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function GapAnalysisCardComponent({ data, pending = false, missing }: GapAnalysisCardProps) {
  const gap = data ?? { ticker: "" };
  const plan = Array.isArray(gap.plan) ? gap.plan : [];
  const gapPercentPending = hasPendingField(missing, "gap_analysis.gapPercent", pending);
  const directionPending = hasPendingField(missing, "gap_analysis.direction", pending);
  const premarketVolumePending = hasPendingField(missing, "gap_analysis.premarketVolume", pending);
  const setupQualityPending = hasPendingField(missing, "gap_analysis.setupQuality", pending);
  const catalystPending = hasPendingField(missing, "gap_analysis.catalyst", pending);
  const planPending = hasPendingField(missing, "gap_analysis.plan", pending);

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Gap</p>
          {typeof gap.gapPercent === "number" ? (
            <p className={gap.gapPercent >= 0 ? "font-semibold text-bullish" : "font-semibold text-bearish"}>
              {gap.gapPercent.toFixed(2)}%
            </p>
          ) : gapPercentPending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Direction</p>
          {gap.direction ? (
            <p className="font-semibold uppercase">{gap.direction}</p>
          ) : directionPending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold uppercase text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Premarket Vol</p>
          {typeof gap.premarketVolume === "number" ? (
            <p className="font-semibold">{`${Math.round(gap.premarketVolume / 1000000)}M`}</p>
          ) : premarketVolumePending ? (
            <PendingShimmer className="mt-1 h-4 w-10" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Setup Quality</p>
          {typeof gap.setupQuality === "number" ? (
            <p className="font-semibold text-ai">{`${gap.setupQuality}/100`}</p>
          ) : setupQualityPending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
      </div>

      <p className="rounded-md border border-border/65 bg-panel-soft/35 p-2 text-[11px] text-muted-strong">
        Catalyst:{" "}
        {gap.catalyst ? (
          <span>{gap.catalyst}</span>
        ) : catalystPending ? (
          <PendingShimmer className="h-3.5 w-[52%] align-middle" />
        ) : (
          <span className="text-muted">--</span>
        )}
      </p>

      {plan.length ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {plan.slice(0, 3).map((item) => (
            <li key={item} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-200/90" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : planPending ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {[0, 1].map((index) => (
            <li key={index} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-200/70" />
              <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[86%]" : "w-[68%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const GapAnalysisCard = memo(
  GapAnalysisCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
GapAnalysisCard.displayName = "GapAnalysisCard";

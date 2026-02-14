import { memo } from "react";
import type { TradeIdeaData } from "@/types/cards";
import { PendingShimmer, hasPendingFieldPrefix } from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface TradeIdeaCardProps {
  data?: TradeIdeaData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function TradeIdeaCardComponent({ data, pending = false, missing }: TradeIdeaCardProps) {
  const idea = data ?? { ticker: "" };
  const targets = Array.isArray(idea.targets) ? idea.targets : [];
  const triggers = Array.isArray(idea.triggers) ? idea.triggers : [];
  const ideaPending = hasPendingFieldPrefix(missing, "trade_idea", pending);

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-md border border-border/65 bg-panel-soft/40 p-2">
        <p className="text-muted">Thesis</p>
        {idea.thesis ? (
          <p className="mt-1 max-h-[7.2rem] overflow-y-auto pr-1 text-sm font-medium leading-snug">
            {idea.thesis}
          </p>
        ) : ideaPending ? (
          <div className="mt-1 space-y-1">
            <PendingShimmer className="h-4 w-[92%]" />
            <PendingShimmer className="h-4 w-[78%]" />
          </div>
        ) : (
          <p className="mt-1 text-sm font-medium text-muted">--</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Bias</p>
          {idea.bias ? (
            <p className="font-semibold uppercase">{idea.bias}</p>
          ) : ideaPending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Confidence</p>
          {typeof idea.confidence === "number" ? (
            <p className="font-semibold text-ai">{`${Math.round(idea.confidence * 100)}%`}</p>
          ) : ideaPending ? (
            <PendingShimmer className="mt-1 h-4 w-14" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Entry</p>
          {Array.isArray(idea.entryRange) ? (
            <p className="font-semibold">{`$${idea.entryRange[0].toFixed(2)} - $${idea.entryRange[1].toFixed(2)}`}</p>
          ) : ideaPending ? (
            <PendingShimmer className="mt-1 h-4 w-24" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/65 bg-panel-soft/45 p-1.5">
          <p className="text-muted">Stop</p>
          {typeof idea.stop === "number" ? (
            <p className="font-semibold">{`$${idea.stop.toFixed(2)}`}</p>
          ) : ideaPending ? (
            <PendingShimmer className="mt-1 h-4 w-16" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
      </div>

      <p className="rounded-md border border-border/60 bg-panel-soft/35 px-2 py-1 text-[11px] text-muted-strong">
        Targets:{" "}
        {targets.length ? (
          targets.map((target) => `$${target.toFixed(2)}`).join(" / ")
        ) : ideaPending ? (
          <PendingShimmer className="h-3.5 w-20 align-middle" />
        ) : (
          <span className="text-muted">--</span>
        )}
      </p>

      {triggers.length ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {triggers.slice(0, 3).map((trigger) => (
            <li key={trigger} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-amber-200/90" />
              <span>{trigger}</span>
            </li>
          ))}
        </ul>
      ) : ideaPending ? (
        <ul className="space-y-1 text-[11px] text-muted-strong">
          {[0, 1].map((index) => (
            <li key={index} className="flex gap-1.5">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-amber-200/70" />
              <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[84%]" : "w-[66%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const TradeIdeaCard = memo(
  TradeIdeaCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
TradeIdeaCard.displayName = "TradeIdeaCard";

import { memo } from "react";
import type { RiskPlanData } from "@/types/cards";
import { PendingShimmer, hasPendingFieldPrefix } from "@/components/cards/CardPending";
import type { MissingDataBlock } from "@/types/missing";

interface RiskPlanCardProps {
  data?: RiskPlanData;
  pending?: boolean;
  missing?: MissingDataBlock;
}

function RiskPlanCardComponent({ data, pending = false, missing }: RiskPlanCardProps) {
  const risk = data ?? { ticker: "" };
  const takeProfit = Array.isArray(risk.takeProfit) ? risk.takeProfit : [];
  const plan = Array.isArray(risk.plan) ? risk.plan : [];
  const riskPending = hasPendingFieldPrefix(missing, "risk_plan", pending);

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Risk Profile</p>
          {risk.riskProfile ? (
            <p className="font-semibold uppercase">{risk.riskProfile}</p>
          ) : riskPending ? (
            <PendingShimmer className="mt-1 h-4 w-12" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Position Size</p>
          {typeof risk.positionSizePct === "number" ? (
            <p className="font-semibold">{`${risk.positionSizePct.toFixed(2)}%`}</p>
          ) : riskPending ? (
            <PendingShimmer className="mt-1 h-4 w-14" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Max Loss</p>
          {typeof risk.maxLoss === "number" ? (
            <p className="font-semibold text-bearish">{`$${risk.maxLoss.toFixed(2)}`}</p>
          ) : riskPending ? (
            <PendingShimmer className="mt-1 h-4 w-16" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
        <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
          <p className="text-muted">Stop Loss</p>
          {typeof risk.stopLoss === "number" ? (
            <p className="font-semibold">{`$${risk.stopLoss.toFixed(2)}`}</p>
          ) : riskPending ? (
            <PendingShimmer className="mt-1 h-4 w-16" />
          ) : (
            <p className="font-semibold text-muted">--</p>
          )}
        </div>
      </div>

      <p className="text-muted-strong">
        Targets:{" "}
        {takeProfit.length ? (
          takeProfit.map((level) => `$${level.toFixed(2)}`).join(" / ")
        ) : riskPending ? (
          <PendingShimmer className="h-3.5 w-20 align-middle" />
        ) : (
          <span className="text-muted">--</span>
        )}
      </p>

      {plan.length ? (
        <ul className="list-disc space-y-1 pl-4 text-muted-strong">
          {plan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : riskPending ? (
        <ul className="space-y-1">
          {[0, 1].map((index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted/80" />
              <PendingShimmer className={`h-3.5 ${index === 0 ? "w-[82%]" : "w-[70%]"}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const RiskPlanCard = memo(
  RiskPlanCardComponent,
  (prev, next) =>
    prev.data === next.data &&
    prev.pending === next.pending &&
    prev.missing === next.missing
);
RiskPlanCard.displayName = "RiskPlanCard";

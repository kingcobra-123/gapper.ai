import { MissingDataState } from "@/components/common/MissingDataState";
import { cn } from "@/lib/utils";
import type { MissingDataBlock, MissingField } from "@/types/missing";

interface GapAnalysisWidgetProps {
  focusTicker: string;
  gapPercent?: number;
  setupQuality?: number;
  direction?: "up" | "down";
  premarketVolume?: number;
  catalyst?: string;
  plan?: string[];
  missing?: MissingDataBlock;
  className?: string;
}

function mergeMissing(base: MissingDataBlock | undefined, required: MissingField[]): MissingDataBlock {
  return {
    title: base?.title ?? "Gap analysis payload is partial.",
    fields: [...required, ...(base?.fields ?? [])],
    hint: base?.hint ?? "Direction/setup/plan are no longer inferred in frontend."
  };
}

export function GapAnalysisWidget({
  focusTicker,
  gapPercent,
  setupQuality,
  direction,
  premarketVolume,
  catalyst,
  plan,
  missing,
  className
}: GapAnalysisWidgetProps) {
  const requiredMissing: MissingField[] = [];

  if (typeof gapPercent !== "number") {
    requiredMissing.push({
      key: "gap_analysis.gapPercent",
      reason: "missing_ticker_data",
      detail: "numeric gap value missing"
    });
  }
  if (typeof setupQuality !== "number") {
    requiredMissing.push({
      key: "gap_analysis.setupQuality",
      reason: "missing_backend_field",
      detail: "backend does not provide this field yet"
    });
  }
  if (direction !== "up" && direction !== "down") {
    requiredMissing.push({
      key: "gap_analysis.direction",
      reason: "missing_backend_field",
      detail: "backend does not provide this field yet"
    });
  }
  if (typeof premarketVolume !== "number") {
    requiredMissing.push({
      key: "gap_analysis.premarketVolume",
      reason: "missing_ticker_data",
      detail: "premarket volume missing"
    });
  }

  if (requiredMissing.length > 0) {
    return (
      <section className={cn("glass-panel flex h-full min-h-0 flex-col overflow-hidden p-3", className)}>
        <header className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Gap Analysis</h4>
          <span className="ticker-chip">{focusTicker}</span>
        </header>
        <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          <MissingDataState
            headline="Gap report misplaced its sticky notes 🗒️"
            missing={mergeMissing(missing, requiredMissing)}
            compact
          />
        </div>
      </section>
    );
  }

  const safePlan = Array.isArray(plan) ? plan : [];
  const resolvedGapPercent = gapPercent as number;
  const resolvedSetupQuality = setupQuality as number;
  const resolvedDirection = direction as "up" | "down";
  const resolvedPremarketVolume = premarketVolume as number;

  return (
    <section className={cn("glass-panel flex h-full min-h-0 flex-col overflow-hidden p-3", className)}>
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Gap Analysis</h4>
        <span className="ticker-chip">{focusTicker}</span>
      </header>
      <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
            <p className="text-muted">Gap</p>
            <p className={resolvedGapPercent >= 0 ? "font-semibold text-bullish" : "font-semibold text-bearish"}>
              {resolvedGapPercent.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
            <p className="text-muted">Direction</p>
            <p className="font-semibold uppercase">{resolvedDirection}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
            <p className="text-muted">Premarket Vol</p>
            <p className="font-semibold">{`${Math.round(resolvedPremarketVolume / 1000000)}M`}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-2">
            <p className="text-muted">Setup</p>
            <p className="font-semibold text-ai">{resolvedSetupQuality}/100</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">{catalyst ? `Catalyst: ${catalyst}` : "Catalyst not supplied by backend."}</p>
        {safePlan.length ? (
          <ul className="mt-2 space-y-1 text-[11px] text-muted">
            {safePlan.slice(0, 2).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

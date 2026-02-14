import { MissingDataState } from "@/components/common/MissingDataState";
import { cn } from "@/lib/utils";
import type { MissingDataBlock } from "@/types/missing";

interface SentimentGaugeWidgetProps {
  value?: number;
  summary?: string;
  breakdown?: Array<{ label: string; value: number }>;
  missing?: MissingDataBlock;
  className?: string;
}

function defaultMissingBlock(): MissingDataBlock {
  return {
    title: "No backend sentiment payload was provided.",
    fields: [
      {
        key: "sentiment.value",
        reason: "missing_backend_field",
        detail: "frontend fallback sentiment is disabled"
      }
    ],
    hint: "Module-12 removes fixed sentiment placeholders."
  };
}

export function SentimentGaugeWidget({ value, summary, breakdown = [], missing, className }: SentimentGaugeWidgetProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const clamped = hasValue ? Math.max(0, Math.min(100, value)) : undefined;

  return (
    <section className={cn("glass-panel flex h-full min-h-0 flex-col overflow-hidden p-3", className)}>
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Sentiment</h4>
        <span className="text-xs font-semibold text-ai">{hasValue ? `${clamped}%` : "--"}</span>
      </header>
      <div className="terminal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        <div className="h-2 overflow-hidden rounded bg-panel-soft/80">
          <div
            className="h-full rounded bg-gradient-to-r from-bearish via-ai to-bullish"
            style={{ width: `${hasValue ? clamped : 0}%` }}
          />
        </div>
        {hasValue && breakdown.length ? (
          <div className="space-y-1">
            {breakdown.slice(0, 3).map((item) => {
              const metric = Math.max(0, Math.min(100, item.value));
              return (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{item.label}</span>
                    <span>{Math.round(metric)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-panel-soft/80">
                    <div className="h-full rounded bg-ai/80" style={{ width: `${metric}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="text-[11px] text-muted">
          {summary ? summary : "Waiting for backend card context to calibrate sentiment."}
        </p>
        {!hasValue ? <MissingDataState compact headline="Sentiment meter is off duty 💤" missing={missing ?? defaultMissingBlock()} /> : null}
      </div>
    </section>
  );
}

import type { MissingDataBlock, MissingField } from "@/types/missing";

interface MissingDataStateProps {
  headline: string;
  missing: MissingDataBlock;
  compact?: boolean;
}

function reasonLabel(reason: MissingField["reason"]): string {
  return reason === "missing_ticker_data" ? "Missing (ticker)" : "Missing (schema)";
}

export function MissingDataState({ headline, missing, compact = false }: MissingDataStateProps) {
  const visibleFields = compact ? missing.fields.slice(0, 3) : missing.fields;
  const hiddenCount = missing.fields.length - visibleFields.length;

  return (
    <div className={`rounded-lg border border-border/70 bg-panel-soft/45 ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-center gap-2">
        <span className="missing-state-bob text-sm" aria-hidden>
          (o_o)
        </span>
        <div className="inline-flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="missing-state-dot h-1.5 w-1.5 rounded-full bg-ai/85" style={{ animationDelay: `${dot * 0.14}s` }} />
          ))}
        </div>
        <p className={`${compact ? "text-[11px]" : "text-xs"} font-semibold text-muted-strong`}>{headline}</p>
      </div>

      <p className={`mt-1 ${compact ? "text-[10px]" : "text-[11px]"} text-muted`}>{missing.title}</p>

      <ul className={`mt-2 space-y-1 ${compact ? "text-[10px]" : "text-[11px]"} text-muted`}>
        {visibleFields.map((field) => (
          <li key={`${field.key}-${field.reason}`} className="rounded border border-border/60 bg-panel-soft/35 px-2 py-1">
            <span className="font-semibold text-muted-strong">{reasonLabel(field.reason)}:</span>{" "}
            <code className="font-mono text-[0.95em]">{field.key}</code>
            {field.detail ? <span className="text-muted"> ({field.detail})</span> : null}
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? <p className="mt-1 text-[10px] text-muted">+{hiddenCount} more missing keys</p> : null}
      {missing.hint ? <p className="mt-1 text-[10px] text-muted">{missing.hint}</p> : null}
    </div>
  );
}

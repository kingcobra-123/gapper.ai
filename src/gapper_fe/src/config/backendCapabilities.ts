import type { MissingReason } from "@/types/missing";

export type BackendCardType = "ticker_snapshot" | "levels" | "news" | "risk_plan" | "trade_idea" | "gap_analysis";

// Capability expectations are anchored to docs/module-12-wiring/README.md (Field mismatch report).
export const backendCapabilities = {
  cards: {
    ticker_snapshot: true,
    levels: true,
    news: true,
    risk_plan: false,
    trade_idea: false,
    gap_analysis: true
  },
  fields: {
    "ticker_snapshot.price": true,
    "ticker_snapshot.changePercent": true,
    "ticker_snapshot.volume": true,
    "ticker_snapshot.relativeVolume": true,
    "ticker_snapshot.floatM": true,
    "ticker_snapshot.sparkline.series": true,
    "ticker_snapshot.highlights": false,

    "sentiment.value": true,
    "sentiment.signal": true,
    "sentiment.impact_score": true,
    "sentiment.confidence": true,

    "levels.support": true,
    "levels.resistance": true,
    "levels.pivot": false,
    "levels.entryZone": false,
    "levels.invalidation": false,
    "levels.highlights": false,

    "news.items": true,
    "news.items.url": true,
    "news.highlights": false,

    "gap_analysis.gapPercent": true,
    "gap_analysis.direction": false,
    "gap_analysis.premarketVolume": true,
    "gap_analysis.floatM": true,
    "gap_analysis.catalyst": true,
    "gap_analysis.setupQuality": false,
    "gap_analysis.plan": false,

    risk_plan: false,
    trade_idea: false
  }
} as const;

function fieldCapability(fieldKey: string): boolean | undefined {
  const fields = backendCapabilities.fields as Record<string, boolean>;
  if (fieldKey in fields) {
    return fields[fieldKey];
  }

  const segments = fieldKey.split(".");
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join(".");
    if (parent in fields) {
      return fields[parent];
    }
  }

  return undefined;
}

export function getMissingReasonForCard(cardType: BackendCardType): MissingReason {
  return backendCapabilities.cards[cardType] ? "missing_ticker_data" : "missing_backend_field";
}

export function getMissingReasonForField(fieldKey: string, fallbackCard?: BackendCardType): MissingReason {
  const supported = fieldCapability(fieldKey);
  if (supported === true) {
    return "missing_ticker_data";
  }
  if (supported === false) {
    return "missing_backend_field";
  }
  if (fallbackCard) {
    return getMissingReasonForCard(fallbackCard);
  }
  return "missing_backend_field";
}

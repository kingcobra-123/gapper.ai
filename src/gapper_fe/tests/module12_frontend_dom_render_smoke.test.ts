import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { adaptCardResponse } from "../src/api/adapters.ts";
import { MessageRow } from "../src/components/chat/MessageRow.tsx";
import { selectCardDisplayTreatment } from "../src/components/chat/card_message_treatment.ts";
import { MiniChartWidget } from "../src/components/widgets/MiniChartWidget.tsx";
import { GapAnalysisWidget } from "../src/components/widgets/GapAnalysisWidget.tsx";
import { SentimentGaugeWidget } from "../src/components/widgets/SentimentGaugeWidget.tsx";
import { CardRenderer } from "../src/components/cards/CardRenderer.tsx";
import { GapAnalysisCard } from "../src/components/cards/GapAnalysisCard.tsx";
import { LevelsCard } from "../src/components/cards/LevelsCard.tsx";
import { NewsCard } from "../src/components/cards/NewsCard.tsx";
import { RiskPlanCard } from "../src/components/cards/RiskPlanCard.tsx";
import { TickerSnapshotCard } from "../src/components/cards/TickerSnapshotCard.tsx";
import { TradeIdeaCard } from "../src/components/cards/TradeIdeaCard.tsx";
import type { AssistantCard, ChatMessage } from "../src/types/chat";

function buildAssistantMessage(
  content: string,
  refreshPending: boolean
): ChatMessage {
  return {
    id: "msg-module12-dom",
    role: "assistant",
    content,
    createdAt: "2026-02-09T00:00:00.000Z",
    intent: "message",
    tickers: [],
    mode: "paper",
    status: "sent",
    refreshPending
  };
}

function isMemoComponent(component: unknown): boolean {
  return Boolean(
    component &&
      typeof component === "object" &&
      (component as { $$typeof?: symbol }).$$typeof === Symbol.for("react.memo")
  );
}

test("terminal row render shows pending refresh indicator for missing cards", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "sm12miss",
      card: null,
      status: { ticker: "SM12MISS", version: 103 },
      is_missing: true,
      is_stale: false,
      refresh_triggered: true,
      refresh_deduped: false,
      etag: 'W/"SM12MISS:103"',
      server_ts: 1770588000,
      errors: []
    } as never)
  );

  const html = renderToStaticMarkup(
    React.createElement(MessageRow, {
      message: buildAssistantMessage(
        treatment.content,
        treatment.refreshPending
      ),
      showRefreshIndicator: treatment.refreshPending
    })
  );

  assert.equal(treatment.kind, "missing");
  assert.equal(treatment.refreshPending, true);
  assert.equal(html.includes("SM12MISS"), true);
  assert.equal(html.includes("Summoning card"), true);
});

test("terminal row render hides pending indicator for ticker-not-found replies", () => {
  const treatment = selectCardDisplayTreatment(
    adaptCardResponse({
      ticker: "unknown1",
      card: null,
      status: null,
      is_missing: true,
      is_stale: true,
      refresh_triggered: false,
      refresh_deduped: false,
      etag: null,
      server_ts: 1770588000,
      errors: ["ticker_not_found"]
    } as never)
  );

  const html = renderToStaticMarkup(
    React.createElement(MessageRow, {
      message: buildAssistantMessage(
        treatment.content,
        treatment.refreshPending
      ),
      showRefreshIndicator: treatment.refreshPending
    })
  );

  assert.equal(treatment.kind, "not_found");
  assert.equal(treatment.refreshPending, false);
  assert.equal(html.includes("UNKNOWN1"), true);
  assert.equal(html.includes("Summoning card"), false);
});

test("MiniChartWidget renders real series without placeholder missing-state", () => {
  const html = renderToStaticMarkup(
    React.createElement(MiniChartWidget, {
      symbol: "NVDA",
      sparkline: [789.2, 790.4, 791.1, 792.6, 793.8],
      price: 793.8,
      changePercent: 1.42,
      asOf: "2026-02-10T13:30:00.000Z"
    })
  );

  assert.equal(html.includes("MINICHART(30D)"), true);
  assert.equal(html.includes("Mini chart interactive plot"), true);
  assert.equal(html.includes("$793.80"), true);
  assert.equal(html.includes("1.42%"), false);
  assert.equal(html.includes("Mini chart date slider"), false);
  assert.equal(html.includes("Chart&#x27;s on coffee break"), false);
});

test("MiniChartWidget shows MissingDataState when sparkline is absent", () => {
  const html = renderToStaticMarkup(
    React.createElement(MiniChartWidget, {
      symbol: "TSLA"
    })
  );

  assert.equal(html.includes("Chart&#x27;s on coffee break"), true);
  assert.equal(html.includes("ticker_snapshot.sparkline.series"), true);
  assert.equal(html.includes("Missing (ticker)"), true);
});

test("GapAnalysisWidget shows MissingDataState when payload is partial", () => {
  const html = renderToStaticMarkup(
    React.createElement(GapAnalysisWidget, {
      focusTicker: "SMCI",
      gapPercent: 4.1
    })
  );

  assert.equal(html.includes("Gap report misplaced its sticky notes"), true);
  assert.equal(html.includes("gap_analysis.direction"), true);
  assert.equal(html.includes("Missing (schema)"), true);
});

test("SentimentGaugeWidget uses neutral dash state when value is missing", () => {
  const html = renderToStaticMarkup(
    React.createElement(SentimentGaugeWidget, {
      summary: "No sentiment card yet."
    })
  );

  assert.equal(html.includes("--"), true);
  assert.equal(html.includes("sentiment.value"), true);
});

test("NewsCard renders article links when backend URL is available", () => {
  const html = renderToStaticMarkup(
    React.createElement(NewsCard, {
      data: {
        ticker: "SPY",
        items: [
          {
            headline: "SPY headline",
            source: "Polygon",
            publishedAt: "2026-02-10T13:30:00.000Z",
            url: "https://example.com/spy"
          }
        ]
      }
    })
  );

  assert.equal(html.includes("Open article"), true);
  assert.equal(html.includes("https://example.com/spy"), true);
});

test("NewsCard caps rendered headline rows at five", () => {
  const html = renderToStaticMarkup(
    React.createElement(NewsCard, {
      data: {
        ticker: "NVDA",
        items: [
          {
            headline: "h1",
            source: "s1",
            publishedAt: "2026-02-10T13:00:00Z",
            url: "https://x/1"
          },
          {
            headline: "h2",
            source: "s2",
            publishedAt: "2026-02-10T12:00:00Z",
            url: "https://x/2"
          },
          {
            headline: "h3",
            source: "s3",
            publishedAt: "2026-02-10T11:00:00Z",
            url: "https://x/3"
          },
          {
            headline: "h4",
            source: "s4",
            publishedAt: "2026-02-10T10:00:00Z",
            url: "https://x/4"
          },
          {
            headline: "h5",
            source: "s5",
            publishedAt: "2026-02-10T09:00:00Z",
            url: "https://x/5"
          },
          {
            headline: "h6",
            source: "s6",
            publishedAt: "2026-02-10T08:00:00Z",
            url: "https://x/6"
          }
        ]
      }
    })
  );

  assert.equal((html.match(/Open article/g) ?? []).length, 5);
  assert.equal(html.includes("h6"), false);
});

test("TickerSnapshotCard shows shimmer placeholders while pending fields are unresolved", () => {
  const html = renderToStaticMarkup(
    React.createElement(TickerSnapshotCard, {
      data: { ticker: "NVDA" },
      pending: true,
      missing: {
        title: "pending",
        fields: [
          { key: "ticker_snapshot.price", reason: "missing_ticker_data" },
          { key: "ticker_snapshot.changePercent", reason: "missing_ticker_data" },
          { key: "ticker_snapshot.sparkline.series", reason: "missing_ticker_data" }
        ]
      }
    })
  );

  assert.equal(html.includes("data-pending-shimmer"), true);
  assert.equal(html.includes("Sparkline not supplied by backend."), false);
});

test("CardRenderer defers missing-data block while refresh is pending", () => {
  const card: AssistantCard = {
    id: "trade-idea-pending-test",
    type: "trade_idea",
    title: "NVDA Trade Idea",
    tickers: ["NVDA"],
    timestamp: "2026-02-10T13:30:00.000Z",
    missing: {
      title: "missing payload",
      fields: [{ key: "trade_idea", reason: "missing_backend_field" }]
    }
  };

  const pendingHtml = renderToStaticMarkup(
    React.createElement(CardRenderer, {
      card,
      compact: true,
      showRefreshIndicator: true
    })
  );

  const settledHtml = renderToStaticMarkup(
    React.createElement(CardRenderer, {
      card,
      compact: true,
      showRefreshIndicator: false
    })
  );

  assert.equal(pendingHtml.includes("Missing (schema)"), false);
  assert.equal(pendingHtml.includes("LLM response warming up"), true);
  assert.equal(pendingHtml.includes("h-[400px]"), true);
  assert.equal(pendingHtml.includes("shrink-0"), true);
  assert.equal(pendingHtml.includes("min-h-0"), true);
  assert.equal(settledHtml.includes("Missing (schema)"), true);
  assert.equal(settledHtml.includes("h-[400px]"), true);
});

test("CardRenderer locks compact height for snapshot and gap analysis cards", () => {
  const timestamp = "2026-02-10T13:30:00.000Z";
  const snapshotHtml = renderToStaticMarkup(
    React.createElement(CardRenderer, {
      compact: true,
      card: {
        id: "snapshot-height-test",
        type: "ticker_snapshot",
        title: "NVDA Snapshot",
        tickers: ["NVDA"],
        timestamp
      }
    })
  );

  const gapHtml = renderToStaticMarkup(
    React.createElement(CardRenderer, {
      compact: true,
      card: {
        id: "gap-height-test",
        type: "gap_analysis",
        title: "NVDA Gap Analysis",
        tickers: ["NVDA"],
        timestamp
      }
    })
  );

  const tradeHtml = renderToStaticMarkup(
    React.createElement(CardRenderer, {
      compact: true,
      card: {
        id: "trade-height-test",
        type: "trade_idea",
        title: "NVDA Trade Idea",
        tickers: ["NVDA"],
        timestamp
      }
    })
  );

  assert.equal(snapshotHtml.includes("h-[400px]"), true);
  assert.equal(gapHtml.includes("h-[400px]"), true);
  assert.equal(tradeHtml.includes("h-[400px]"), true);
});

test("core card rendering components are memoized", () => {
  assert.equal(isMemoComponent(CardRenderer), true);
  assert.equal(isMemoComponent(MessageRow), true);
  assert.equal(isMemoComponent(GapAnalysisCard), true);
  assert.equal(isMemoComponent(LevelsCard), true);
  assert.equal(isMemoComponent(NewsCard), true);
  assert.equal(isMemoComponent(RiskPlanCard), true);
  assert.equal(isMemoComponent(TickerSnapshotCard), true);
  assert.equal(isMemoComponent(TradeIdeaCard), true);
});

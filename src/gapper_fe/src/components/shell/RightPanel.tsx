"use client";

import { AlertTriangle, Layers2, Link2, Newspaper, Shield, Wallet } from "lucide-react";
import { MissingDataState } from "@/components/common/MissingDataState";
import { AlertModal } from "@/components/modals/AlertModal";
import { DEFAULT_FALLBACK_TICKER } from "@/config/tickers";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/useChatStore";
import { useCardStore } from "@/stores/useCardStore";
import { useUIStore } from "@/stores/useUIStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { NewsItem } from "@/types/cards";
import type { AssistantCard } from "@/types/chat";

interface RightPanelProps {
  className?: string;
}

const TABS = [
  { key: "details", label: "Details", icon: <Layers2 className="h-3.5 w-3.5" /> },
  { key: "levels", label: "Levels", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { key: "news", label: "News", icon: <Newspaper className="h-3.5 w-3.5" /> },
  { key: "risk", label: "Risk", icon: <Shield className="h-3.5 w-3.5" /> },
  { key: "positions", label: "Positions", icon: <Wallet className="h-3.5 w-3.5" /> }
] as const;

function getCardByType<T extends AssistantCard["type"]>(
  cards: AssistantCard[],
  type: T
): Extract<AssistantCard, { type: T }> | undefined {
  return cards.find((card): card is Extract<AssistantCard, { type: T }> => card.type === type);
}

function formatMoney(value?: number): string {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "--";
}

function formatMillions(value?: number): string {
  return typeof value === "number" ? `${Math.round(value / 1000000)}M` : "--";
}

function formatLevelStrip(levels?: number[]): string {
  if (!Array.isArray(levels) || !levels.length) {
    return "--";
  }
  return levels.map((level) => `$${level.toFixed(2)}`).join(" / ");
}

function normalizeHighlights(lines: string[], maxItems = 5): string[] {
  const normalized = lines
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length > 0);
  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function buildDetailsHighlights(options: {
  snapshotHighlights: string[];
  levelsHighlights: string[];
  newsHighlights: string[];
  summary: string | null;
  catalyst: string | null;
  llmSummary: string | null;
}): string[] {
  const merged = [
    ...options.snapshotHighlights,
    ...options.levelsHighlights,
    ...options.newsHighlights
  ];

  if (!merged.length) {
    if (options.catalyst) {
      merged.push(`Catalyst: ${options.catalyst}`);
    }
    if (options.summary) {
      merged.push(options.summary);
    }
    if (options.llmSummary) {
      merged.push(`LLM: ${options.llmSummary}`);
    }
  }

  return normalizeHighlights(merged);
}

function isSignalNewsItem(item: NewsItem): boolean {
  return item.sentiment === "bullish" || item.sentiment === "bearish";
}

export function RightPanel({ className }: RightPanelProps) {
  const rightPanelTab = useUIStore((state) => state.rightPanelTab);
  const setRightPanelTab = useUIStore((state) => state.setRightPanelTab);
  const utilityTickerByChannelId = useUIStore((state) => state.utilityTickerByChannelId);

  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const lastTickerByChannelId = useChatStore((state) => state.lastTickerByChannelId);
  const cardByTicker = useCardStore((state) => state.cardByTicker);

  const activeTicker =
    (selectedChannelId ? utilityTickerByChannelId[selectedChannelId] : undefined) ??
    (selectedChannelId ? lastTickerByChannelId[selectedChannelId] : undefined) ??
    DEFAULT_FALLBACK_TICKER;

  const activeCardViewModel = cardByTicker[activeTicker];
  const activeCards = activeCardViewModel?.cards ?? [];

  const snapshot = getCardByType(activeCards, "ticker_snapshot");
  const levels = getCardByType(activeCards, "levels");
  const news = getCardByType(activeCards, "news");
  const risk = getCardByType(activeCards, "risk_plan");
  const tradeIdea = getCardByType(activeCards, "trade_idea");
  const gap = getCardByType(activeCards, "gap_analysis");
  const summary =
    activeCardViewModel?.summary ?? tradeIdea?.data?.thesis ?? snapshot?.data?.highlights?.[0] ?? null;

  const detailsHighlights = buildDetailsHighlights({
    snapshotHighlights: snapshot?.data?.highlights ?? [],
    levelsHighlights: levels?.data?.highlights ?? [],
    newsHighlights: news?.data?.highlights ?? [],
    summary,
    catalyst: gap?.type === "gap_analysis" ? gap.data?.catalyst ?? null : null,
    llmSummary: activeCardViewModel?.sentiment?.summary ?? null
  });

  const newsItems = (news?.data?.items ?? []).slice(0, 5);
  const newsModeLabel = newsItems.some((item) => isSignalNewsItem(item))
    ? "signal-first · latest first"
    : "latest noise-only fallback";
  const riskPlan = risk?.data?.plan ?? [];
  const riskTargets = risk?.data?.takeProfit ?? [];
  const tradeTargets = tradeIdea?.data?.targets ?? [];
  const llmStateLabel = activeCardViewModel?.llmPending
    ? "LLM enrichment pending. Market + Polygon fields are shown now."
    : activeCardViewModel?.llmFailed
    ? `LLM enrichment unavailable${
        activeCardViewModel.llmError && activeCardViewModel.llmError !== "llm_unavailable"
          ? `: ${activeCardViewModel.llmError}`
          : "."
      }`
    : null;

  return (
    <aside className={cn("glass-panel flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3", className)}>
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Utility Panel</h2>
          <p className="text-xs text-muted">Context: {activeTicker}</p>
        </div>
        <AlertModal triggerLabel="Alert" />
      </header>

      <div className="grid grid-cols-5 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
              rightPanelTab === tab.key
                ? "border-ai/70 bg-ai/10 text-foreground"
                : "border-border/80 bg-panel-soft/45 text-muted hover:text-foreground"
            }`}
            onClick={() => setRightPanelTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="terminal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-xs break-words">
        {rightPanelTab === "details" ? (
          snapshot?.type === "ticker_snapshot" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Price</p>
                  <p className="text-lg font-semibold">{formatMoney(snapshot.data?.price)}</p>
                  {typeof snapshot.data?.changePercent === "number" ? (
                    <p className={snapshot.data.changePercent >= 0 ? "text-bullish" : "text-bearish"}>
                      {snapshot.data.changePercent.toFixed(2)}%
                    </p>
                  ) : (
                    <p className="text-muted">--</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Volume</p>
                  <p className="font-semibold">{formatMillions(snapshot.data?.volume)}</p>
                  <p className="text-muted">
                    Float {typeof snapshot.data?.floatM === "number" ? `${snapshot.data.floatM.toFixed(1)}M` : "--"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                <p className="text-muted">Relative Volume</p>
                <p className="font-semibold">
                  {typeof snapshot.data?.relativeVolume === "number" ? `${snapshot.data.relativeVolume.toFixed(2)}x` : "--"}
                </p>
                {summary ? <p className="mt-2 break-words text-muted">{summary}</p> : null}
                {llmStateLabel ? <p className="mt-2 break-words text-[11px] text-muted">{llmStateLabel}</p> : null}
              </div>
              <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                <p className="mb-1 text-muted">Highlights</p>
                {detailsHighlights.length ? (
                  <ul className="space-y-1 text-muted-strong">
                    {detailsHighlights.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No Polygon/LLM highlights are available for this ticker yet.</p>
                )}
              </div>
              {snapshot.missing ? <MissingDataState compact headline="Snapshot has a few missing wires" missing={snapshot.missing} /> : null}
            </>
          ) : (
            <p className="rounded-lg border border-border/70 bg-panel-soft/30 p-3 text-muted">
              Mention a ticker to load details.
            </p>
          )
        ) : null}

        {rightPanelTab === "levels" ? (
          levels?.type === "levels" ? (
            <>
              <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                <p className="text-muted">Support</p>
                <p className="font-semibold">{formatLevelStrip(levels.data?.support)}</p>
                <p className="mt-2 text-muted">Resistance</p>
                <p className="font-semibold">{formatLevelStrip(levels.data?.resistance)}</p>
                <p className="mt-2 text-muted">Pivot {formatMoney(levels.data?.pivot)}</p>
                <p className="text-muted">
                  Entry{" "}
                  {Array.isArray(levels.data?.entryZone)
                    ? `${formatMoney(levels.data?.entryZone[0])} - ${formatMoney(levels.data?.entryZone[1])}`
                    : "--"}
                </p>
                <p className="text-muted">Invalidation {formatMoney(levels.data?.invalidation)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                <p className="mb-1 text-muted">Level Highlights</p>
                {levels.data?.highlights?.length ? (
                  <ul className="space-y-1 text-muted-strong">
                    {levels.data.highlights.slice(0, 5).map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Backend did not provide level highlights for this ticker.</p>
                )}
              </div>
              {levels.missing ? <MissingDataState compact headline="Levels are hiding in plain sight" missing={levels.missing} /> : null}
            </>
          ) : tradeIdea?.type === "trade_idea" && tradeIdea.data ? (
            <>
              <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                <p className="text-muted">Entry</p>
                <p className="font-semibold">
                  {Array.isArray(tradeIdea.data.entryRange)
                    ? `${formatMoney(tradeIdea.data.entryRange[0])} - ${formatMoney(tradeIdea.data.entryRange[1])}`
                    : "--"}
                </p>
                <p className="mt-2 text-muted">Stop {formatMoney(tradeIdea.data.stop)}</p>
                <p className="text-muted">
                  Targets {tradeTargets.length ? tradeTargets.map((target) => formatMoney(target)).join(" / ") : "--"}
                </p>
              </div>
              {tradeIdea.missing ? <MissingDataState compact headline="Trade idea left blanks" missing={tradeIdea.missing} /> : null}
            </>
          ) : tradeIdea?.missing ? (
            <MissingDataState compact headline="Trade levels are missing from backend" missing={tradeIdea.missing} />
          ) : (
            <p className="rounded-lg border border-border/70 bg-panel-soft/30 p-3 text-muted">
              Run `/levels ${activeTicker}` to load level map.
            </p>
          )
        ) : null}

        {rightPanelTab === "news" ? (
          news?.type === "news" ? (
            <div className="space-y-2">
              {summary ? (
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3 text-[11px] text-muted">
                  {summary}
                </div>
              ) : null}
              <p className="px-1 text-[11px] text-muted">Top 5 · {newsModeLabel}</p>
              {newsItems.map((item) => (
                <article key={`${item.headline}-${item.publishedAt}`} className="rounded-lg border border-border/70 bg-panel-soft/40 p-2.5 text-[11px]">
                  <p className="break-words font-semibold leading-snug">{item.headline}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {item.source} · {item.sentiment ?? "--"}
                  </p>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-ai hover:underline"
                    >
                      Open article
                      <Link2 className="h-3 w-3" />
                    </a>
                  ) : null}
                </article>
              ))}
              {!newsItems.length ? (
                <p className="rounded-lg border border-border/70 bg-panel-soft/35 p-3 text-[11px] text-muted">
                  No prioritized news items are available yet for this ticker.
                </p>
              ) : null}
              {news.missing ? (
                <MissingDataState compact headline="Nothing spicy in the news feed" missing={news.missing} />
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-border/70 bg-panel-soft/30 p-3 text-muted">
              Run `/news ${activeTicker}` for catalyst headlines.
            </p>
          )
        ) : null}

        {rightPanelTab === "risk" ? (
          risk?.type === "risk_plan" ? (
            risk.missing ? (
              <MissingDataState compact headline="Risk module says: no fake plans today" missing={risk.missing} />
            ) : (
              <>
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Risk Profile</p>
                  <p className="font-semibold uppercase">{risk.data?.riskProfile ?? "--"}</p>
                  <p className="mt-2 text-muted">Position Size Multiplier</p>
                  <p className="font-semibold">
                    {typeof risk.data?.positionSizePct === "number" ? `${risk.data.positionSizePct.toFixed(2)}x` : "--"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Max Loss {formatMoney(risk.data?.maxLoss)}</p>
                  <p className="text-muted">Stop {formatMoney(risk.data?.stopLoss)}</p>
                  <p className="mt-2 text-muted">
                    Targets {riskTargets.length ? riskTargets.map((target) => formatMoney(target)).join(" / ") : "--"}
                  </p>
                  {riskPlan.length ? (
                    <ul className="mt-2 space-y-1 text-muted-strong">
                      {riskPlan.slice(0, 3).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            )
          ) : (
            <p className="rounded-lg border border-border/70 bg-panel-soft/30 p-3 text-muted">
              Ask for risk planning to populate this panel.
            </p>
          )
        ) : null}

        {rightPanelTab === "positions" ? (
          tradeIdea?.type === "trade_idea" ? (
            <div className="space-y-2">
              {tradeIdea.data ? (
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Idea Staging</p>
                  <p className="font-semibold uppercase">
                    {tradeIdea.data.bias ?? "--"} ({typeof tradeIdea.data.confidence === "number" ? `${Math.round(tradeIdea.data.confidence * 100)}%` : "--"})
                  </p>
                  <p className="mt-2 text-muted">
                    Entry{" "}
                    {Array.isArray(tradeIdea.data.entryRange)
                      ? `${formatMoney(tradeIdea.data.entryRange[0])} - ${formatMoney(tradeIdea.data.entryRange[1])}`
                      : "--"}
                  </p>
                  <p className="text-muted">Stop {formatMoney(tradeIdea.data.stop)}</p>
                  <p className="text-muted">
                    Targets {tradeTargets.length ? tradeTargets.map((target) => formatMoney(target)).join(" / ") : "--"}
                  </p>
                </div>
              ) : null}
              {gap?.type === "gap_analysis" && gap.data ? (
                <div className="rounded-lg border border-border/70 bg-panel-soft/40 p-3">
                  <p className="text-muted">Setup Context</p>
                  <p className="font-semibold">
                    {gap.data.direction ? `${gap.data.direction.toUpperCase()} ${typeof gap.data.gapPercent === "number" ? `${gap.data.gapPercent.toFixed(2)}%` : "--"}` : "--"}
                  </p>
                  <p className="text-muted">
                    Quality {typeof gap.data.setupQuality === "number" ? `${gap.data.setupQuality}/100` : "--"}
                  </p>
                  <p className="text-muted">Catalyst {gap.data.catalyst ?? "--"}</p>
                </div>
              ) : null}
              {tradeIdea.missing ? (
                <MissingDataState compact headline="No trade idea card from backend yet" missing={tradeIdea.missing} />
              ) : null}
              {gap?.missing ? (
                <MissingDataState compact headline="Gap context has missing pieces" missing={gap.missing} />
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-panel-soft/30 p-3 text-muted">
              No backend trade idea loaded for this ticker yet.
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}

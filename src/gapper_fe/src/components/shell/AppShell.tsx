"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutPanelTop, Settings2 } from "lucide-react";
import { GapperLogo } from "@/components/branding/GapperLogo";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatStream } from "@/components/chat/ChatStream";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { DEFAULT_FALLBACK_TICKER } from "@/config/tickers";
import { RightPanel } from "@/components/shell/RightPanel";
import { ServerStrip } from "@/components/shell/ServerStrip";
import { Sidebar } from "@/components/shell/Sidebar";
import { GapAnalysisWidget } from "@/components/widgets/GapAnalysisWidget";
import { MiniChartWidget } from "@/components/widgets/MiniChartWidget";
import { SentimentGaugeWidget } from "@/components/widgets/SentimentGaugeWidget";
import { useChatStore } from "@/stores/useChatStore";
import { useCardStore } from "@/stores/useCardStore";
import { useUIStore } from "@/stores/useUIStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { AssistantCard } from "@/types/chat";

function getCardByType<T extends AssistantCard["type"]>(
  cards: AssistantCard[],
  type: T
): Extract<AssistantCard, { type: T }> | undefined {
  return cards.find((card): card is Extract<AssistantCard, { type: T }> => card.type === type);
}

export function AppShell() {
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const bentoLayoutPreset = useUIStore((state) => state.bentoLayoutPreset);
  const setBentoLayoutPreset = useUIStore((state) => state.setBentoLayoutPreset);
  const utilityTickerByChannelId = useUIStore((state) => state.utilityTickerByChannelId);

  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const lastTickerByChannelId = useChatStore((state) => state.lastTickerByChannelId);
  const cardByTicker = useCardStore((state) => state.cardByTicker);
  const focusTicker =
    (selectedChannelId ? utilityTickerByChannelId[selectedChannelId] : undefined) ??
    (selectedChannelId ? lastTickerByChannelId[selectedChannelId] : undefined) ??
    DEFAULT_FALLBACK_TICKER;
  const focusCardViewModel = cardByTicker[focusTicker];
  const focusCards = focusCardViewModel?.cards ?? [];

  const snapshotCard = getCardByType(focusCards, "ticker_snapshot");
  const gapCard = getCardByType(focusCards, "gap_analysis");

  const sentimentScore = focusCardViewModel?.sentiment?.value;
  const sentimentBreakdown = focusCardViewModel?.sentiment?.breakdown ?? [];
  const sentimentMissing = focusCardViewModel?.sentiment?.missing;
  const sentimentSummary = focusCardViewModel?.sentiment?.summary ?? focusCardViewModel?.summary;
  const isLayoutA = bentoLayoutPreset === "layout_a";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <main className="h-screen overflow-hidden p-3">
      <header className="terminal-shell flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <GapperLogo markClassName="h-8 w-8" showWordmark={false} />
          <div>
            <h1 className="text-sm font-semibold tracking-wide">Gapper AI Terminal</h1>
            <p className="text-xs text-muted">Chat-native trading workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-panel-soft/45 px-3 py-2 text-xs hover:bg-panel-soft/70"
          >
            Home
          </Link>

          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-panel-soft/45 p-1 text-xs">
            <button
              type="button"
              className={`rounded px-2 py-1 ${bentoLayoutPreset === "layout_a" ? "bg-panel-strong" : "text-muted"}`}
              onClick={() => setBentoLayoutPreset("layout_a")}
            >
              Layout A
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${bentoLayoutPreset === "layout_b" ? "bg-panel-strong" : "text-muted"}`}
              onClick={() => setBentoLayoutPreset("layout_b")}
            >
              Layout B
            </button>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-panel-soft/45 px-3 py-2 text-xs hover:bg-panel-soft/70"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </header>

      <div className="mt-3 flex h-[calc(100%-4.75rem)] min-h-0 gap-3">
        <ServerStrip />
        <Sidebar />

        <section className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              isLayoutA
                ? "flex min-h-0 flex-1 gap-3"
                : "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(260px,0.95fr)] gap-3"
            }
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <ErrorBoundary title="Chat stream unavailable.">
                <ChatStream />
              </ErrorBoundary>
              <ErrorBoundary title="Composer unavailable.">
                <ChatComposer />
              </ErrorBoundary>
            </motion.div>

            {isLayoutA ? (
              <div className="hidden min-h-0 xl:grid xl:w-[360px] xl:grid-rows-[minmax(0,1fr)_minmax(130px,0.34fr)_minmax(150px,0.42fr)] xl:gap-3">
                <ErrorBoundary title="Right panel unavailable.">
                  <RightPanel className="h-full min-h-0 w-full" />
                </ErrorBoundary>
                <ErrorBoundary title="Mini chart unavailable.">
                  <MiniChartWidget
                    className="h-full min-h-0"
                    symbol={focusTicker}
                    sparkline={snapshotCard?.data?.sparkline}
                    sparklinePoints30d={snapshotCard?.data?.sparklinePoints30d}
                    price={snapshotCard?.data?.price}
                    asOf={focusCardViewModel?.asOf}
                    missing={snapshotCard?.missing}
                  />
                </ErrorBoundary>
                <ErrorBoundary title="Sentiment gauge unavailable.">
                  <SentimentGaugeWidget
                    className="h-full min-h-0"
                    value={sentimentScore}
                    summary={sentimentSummary}
                    breakdown={sentimentBreakdown}
                    missing={sentimentMissing}
                  />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <ErrorBoundary title="Right panel unavailable.">
                  <RightPanel className="h-full min-h-0" />
                </ErrorBoundary>
                <div className="grid min-h-0 auto-rows-[minmax(0,1fr)] gap-3 overflow-hidden sm:grid-cols-2 xl:grid-cols-3">
                  <ErrorBoundary title="Mini chart unavailable.">
                    <MiniChartWidget
                      className="h-full min-h-0"
                      symbol={focusTicker}
                      sparkline={snapshotCard?.data?.sparkline}
                      sparklinePoints30d={snapshotCard?.data?.sparklinePoints30d}
                      price={snapshotCard?.data?.price}
                      asOf={focusCardViewModel?.asOf}
                      missing={snapshotCard?.missing}
                    />
                  </ErrorBoundary>
                  <ErrorBoundary title="Sentiment gauge unavailable.">
                    <SentimentGaugeWidget
                      className="h-full min-h-0"
                      value={sentimentScore}
                      summary={sentimentSummary}
                      breakdown={sentimentBreakdown}
                      missing={sentimentMissing}
                    />
                  </ErrorBoundary>
                  <ErrorBoundary title="Gap analysis unavailable.">
                    <GapAnalysisWidget
                      className="h-full min-h-0"
                      focusTicker={focusTicker}
                      gapPercent={gapCard?.data?.gapPercent}
                      setupQuality={gapCard?.data?.setupQuality}
                      direction={gapCard?.data?.direction}
                      premarketVolume={gapCard?.data?.premarketVolume}
                      catalyst={gapCard?.data?.catalyst}
                      plan={gapCard?.data?.plan}
                      missing={gapCard?.missing}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-panel-strong/90 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.45)] xl:hidden"
      >
        <LayoutPanelTop className="h-3.5 w-3.5" />
        Utilities
      </button>
    </main>
  );
}

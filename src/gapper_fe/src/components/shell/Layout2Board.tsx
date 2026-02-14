"use client";

import { useState } from "react";
import { GripVertical, RotateCcw } from "lucide-react";
import { RightPanel } from "@/components/shell/RightPanel";
import { Button } from "@/components/ui/button";
import { GapAnalysisWidget } from "@/components/widgets/GapAnalysisWidget";
import { MiniChartWidget } from "@/components/widgets/MiniChartWidget";
import { SentimentGaugeWidget } from "@/components/widgets/SentimentGaugeWidget";
import { cn } from "@/lib/utils";
import { useUIStore, type Layout2PanelId } from "@/stores/useUIStore";

interface Layout2BoardProps {
  focusTicker: string;
}

type PanelDefinition = {
  id: Layout2PanelId;
  label: string;
  hint: string;
  className?: string;
  render: (focusTicker: string) => React.ReactNode;
};

const PANEL_DEFINITIONS: Record<Layout2PanelId, PanelDefinition> = {
  right_panel: {
    id: "right_panel",
    label: "Utility Panel",
    hint: "Tabs: Details, Levels, News, Risk, Positions",
    className: "min-h-0",
    render: () => <RightPanel className="h-full w-full" />
  },
  mini_chart: {
    id: "mini_chart",
    label: "Mini Chart",
    hint: "Fast context sparkline",
    className: "min-h-0",
    render: (focusTicker) => <MiniChartWidget symbol={focusTicker} />
  },
  sentiment: {
    id: "sentiment",
    label: "Sentiment Gauge",
    hint: "News + flow sentiment mix",
    className: "min-h-0",
    render: () => (
      <SentimentGaugeWidget
        summary="No backend sentiment card is wired for this panel yet."
        missing={{
          title: "Sentiment panel has no backend payload in Layout B.",
          fields: [
            {
              key: "sentiment.value",
              reason: "missing_backend_field",
              detail: "Layout2 previously used a fixed frontend value (removed)"
            }
          ]
        }}
      />
    )
  },
  gap_analysis: {
    id: "gap_analysis",
    label: "Gap Analysis",
    hint: "Opening setup quality",
    className: "min-h-0",
    render: (focusTicker) => <GapAnalysisWidget focusTicker={focusTicker} />
  }
};

export function Layout2Board({ focusTicker }: Layout2BoardProps) {
  const layout2Panels = useUIStore((state) => state.layout2Panels);
  const moveLayout2Panel = useUIStore((state) => state.moveLayout2Panel);
  const resetLayout2Panels = useUIStore((state) => state.resetLayout2Panels);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <section className="glass-panel flex h-full min-h-0 flex-col overflow-hidden p-3">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Layout B Workspace</h3>
          <p className="text-xs text-muted">Drag cards by the grip to customize your dashboard.</p>
        </div>

        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={resetLayout2Panels}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <div className="grid h-full min-h-0 auto-rows-fr gap-3 grid-cols-1 md:grid-cols-2">
          {layout2Panels.map((panelId, index) => {
            const panel = PANEL_DEFINITIONS[panelId];
            const dragging = dragIndex === index;
            const dropping = dropIndex === index && dragIndex !== null && dragIndex !== index;

            return (
              <article
                key={panel.id}
                draggable
                onDragStart={(event) => {
                  setDragIndex(index);
                  setDropIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) {
                    moveLayout2Panel(dragIndex, index);
                  }
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className={cn(
                  "flex min-h-0 flex-col rounded-xl border border-border/75 bg-panel-soft/25 p-2 transition",
                  panel.className,
                  dragging && "opacity-65",
                  dropping && "border-ai/65 ring-1 ring-ai/45"
                )}
              >
                <header className="mb-2 flex items-center justify-between rounded-md border border-border/70 bg-panel-soft/40 px-2 py-1">
                  <div>
                    <p className="text-xs font-semibold">{panel.label}</p>
                    <p className="text-[11px] text-muted">{panel.hint}</p>
                  </div>
                  <span className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-border/70 text-muted active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                </header>

                <div className="min-h-0 flex-1">{panel.render(focusTicker)}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

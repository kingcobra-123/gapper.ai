"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { MissingDataState } from "@/components/common/MissingDataState";
import { cn } from "@/lib/utils";
import type { SparklinePoint } from "@/types/cards";
import type { MissingDataBlock } from "@/types/missing";

interface MiniChartWidgetProps {
  symbol: string;
  sparkline?: number[];
  sparklinePoints30d?: SparklinePoint[];
  price?: number;
  asOf?: string;
  missing?: MissingDataBlock;
  className?: string;
}

interface ChartPoint {
  date: string;
  price: number;
}

const SVG_WIDTH = 1320;
const SVG_HEIGHT = 376;
const PLOT_LEFT = 36;
const PLOT_RIGHT = 10;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 26;

function pickSparklineMissing(missing?: MissingDataBlock): MissingDataBlock {
  const sparklineFields =
    missing?.fields.filter((field) => field.key.includes("sparkline")) ?? [];
  if (sparklineFields.length > 0) {
    return {
      title: missing?.title ?? "Missing sparkline payload from backend.",
      fields: sparklineFields
    };
  }

  return {
    title: "Missing sparkline payload from backend.",
    fields: [
      {
        key: "ticker_snapshot.sparkline.series",
        reason: "missing_ticker_data",
        detail: "series missing or empty"
      }
    ],
    hint: "No placeholder line is drawn in Module-12 mode."
  };
}

function formatDateLabel(rawDate: string): string {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatYAxis(value: number): string {
  return `$${value.toFixed(2)}`;
}

function synthesizePointDate(asOf: string, offsetDays: number): string {
  const endDate = new Date(asOf);
  if (Number.isNaN(endDate.getTime())) {
    return "";
  }
  const point = new Date(endDate);
  point.setUTCDate(endDate.getUTCDate() - offsetDays);
  return point.toISOString().slice(0, 10);
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(length - 1, index));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateLabelWidth(
  text: string,
  charWidth = 6.1,
  padding = 12
): number {
  return Math.max(26, text.length * charWidth + padding);
}

function toChartPoints(
  series: number[] | undefined,
  points30d: SparklinePoint[] | undefined,
  asOf: string | undefined
): ChartPoint[] {
  if (Array.isArray(points30d) && points30d.length >= 3) {
    const normalized = points30d
      .map((point) => ({
        date: point.date,
        price: point.price
      }))
      .filter(
        (point) =>
          Number.isFinite(point.price) &&
          point.price > 0 &&
          point.date.length > 0
      );
    return normalized.length > 30 ? normalized.slice(-30) : normalized;
  }

  if (!Array.isArray(series) || series.length < 3) {
    return [];
  }

  const tail = series.length > 30 ? series.slice(-30) : series;
  return tail
    .map((price, index) => ({
      date: synthesizePointDate(
        asOf ?? new Date().toISOString(),
        tail.length - 1 - index
      ),
      price
    }))
    .filter((point) => Number.isFinite(point.price) && point.price > 0);
}

function xForIndex(index: number, total: number): number {
  const span = SVG_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  if (total <= 1) {
    return PLOT_LEFT;
  }
  return PLOT_LEFT + (index / (total - 1)) * span;
}

function yForPrice(price: number, minPrice: number, maxPrice: number): number {
  const span = SVG_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const range = maxPrice - minPrice || 1;
  return PLOT_TOP + (1 - (price - minPrice) / range) * span;
}

function linePathForPoints(
  points: ChartPoint[],
  minPrice: number,
  maxPrice: number
): string {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => {
      const x = xForIndex(index, points.length);
      const y = yForPrice(point.price, minPrice, maxPrice);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaPathForPoints(
  points: ChartPoint[],
  minPrice: number,
  maxPrice: number
): string {
  if (points.length === 0) {
    return "";
  }
  const axisBottomY = SVG_HEIGHT - PLOT_BOTTOM;
  const firstX = xForIndex(0, points.length);
  const lastX = xForIndex(points.length - 1, points.length);
  const linePath = linePathForPoints(points, minPrice, maxPrice);
  return `${linePath} L${lastX.toFixed(2)} ${axisBottomY.toFixed(2)} L${firstX.toFixed(2)} ${axisBottomY.toFixed(2)} Z`;
}

export function MiniChartWidget({
  symbol,
  sparkline,
  sparklinePoints30d,
  price,
  asOf,
  missing,
  className
}: MiniChartWidgetProps) {
  const chartId = useId();
  const chartPoints = useMemo(
    () => toChartPoints(sparkline, sparklinePoints30d, asOf),
    [sparkline, sparklinePoints30d, asOf]
  );
  const hasSeries = chartPoints.length >= 3;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const pendingSelectionRef = useRef<number | null>(null);
  const selectionFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!chartPoints.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex(chartPoints.length - 1);
  }, [chartPoints]);
  const flushPendingSelection = useCallback(() => {
    selectionFrameRef.current = null;
    if (pendingSelectionRef.current === null) {
      return;
    }
    setSelectedIndex(clampIndex(pendingSelectionRef.current, chartPoints.length));
    pendingSelectionRef.current = null;
  }, [chartPoints.length]);
  const queueSelectionUpdate = useCallback(
    (index: number) => {
      pendingSelectionRef.current = index;
      if (selectionFrameRef.current !== null) {
        return;
      }
      selectionFrameRef.current = window.requestAnimationFrame(flushPendingSelection);
    },
    [flushPendingSelection]
  );
  useEffect(
    () => () => {
      if (selectionFrameRef.current !== null) {
        window.cancelAnimationFrame(selectionFrameRef.current);
      }
    },
    []
  );

  const safeIndex = clampIndex(selectedIndex, chartPoints.length);
  const selectedPoint = hasSeries ? chartPoints[safeIndex] : null;
  const headerPrice = typeof price === "number" ? price : selectedPoint?.price;

  const rawMinPrice = hasSeries
    ? Math.min(...chartPoints.map((point) => point.price))
    : 0;
  const rawMaxPrice = hasSeries
    ? Math.max(...chartPoints.map((point) => point.price))
    : 0;
  const flatRangePadding =
    rawMinPrice === rawMaxPrice ? Math.max(rawMinPrice * 0.004, 0.02) : 0;
  const minPrice = rawMinPrice - flatRangePadding;
  const maxPrice = rawMaxPrice + flatRangePadding;
  const linePath = hasSeries
    ? linePathForPoints(chartPoints, minPrice, maxPrice)
    : "";
  const areaPath = hasSeries
    ? areaPathForPoints(chartPoints, minPrice, maxPrice)
    : "";
  const selectedX = hasSeries ? xForIndex(safeIndex, chartPoints.length) : 0;
  const selectedY =
    hasSeries && selectedPoint
      ? yForPrice(selectedPoint.price, minPrice, maxPrice)
      : 0;
  const axisBottomY = SVG_HEIGHT - PLOT_BOTTOM;
  const plotWidth = SVG_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = SVG_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const selectedPriceLabel = selectedPoint
    ? formatYAxis(selectedPoint.price)
    : "--";
  const selectedPriceLabelWidth = estimateLabelWidth(
    selectedPriceLabel,
    8.2,
    20
  );
  const priceLabelY = clampNumber(
    selectedY - 12,
    PLOT_TOP + 1,
    axisBottomY - 25
  );
  const selectedDateLabel = selectedPoint
    ? formatDateLabel(selectedPoint.date)
    : "";
  const selectedDateLabelWidth = estimateLabelWidth(
    selectedDateLabel,
    7.4,
    18
  );
  const selectedDateLabelX = clampNumber(
    selectedX - selectedDateLabelWidth / 2,
    PLOT_LEFT + 1,
    PLOT_LEFT + plotWidth - selectedDateLabelWidth - 1
  );
  const leftDateLabel = formatDateLabel(chartPoints[0]?.date ?? "");
  const rightDateLabel = formatDateLabel(
    chartPoints[chartPoints.length - 1]?.date ?? ""
  );
  const rightDateLabelWidth = estimateLabelWidth(rightDateLabel, 7.4, 18);

  return (
    <section
      className={cn(
        "glass-panel flex h-full min-h-0 flex-col overflow-hidden p-3",
        className
      )}
    >
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
          MINICHART(30D)
        </h4>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="ticker-chip">{symbol}</span>
            <span className="inline-flex items-center rounded-md border border-border/70 bg-panel-strong px-2 py-0.5 text-[11px] font-semibold text-bullish">
              {typeof headerPrice === "number"
                ? `$${headerPrice.toFixed(2)}`
                : "--"}
            </span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {hasSeries ? (
          <div className="h-full">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="h-full w-full rounded-xl bg-panel-soft/60 p-1"
              role="img"
              tabIndex={0}
              aria-label="Mini chart interactive plot"
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                if (rect.width <= 0) {
                  return;
                }
                const ratio = clampNumber(
                  (event.clientX - rect.left) / rect.width,
                  0,
                  1
                );
                const index = Math.round(ratio * (chartPoints.length - 1));
                queueSelectionUpdate(clampIndex(index, chartPoints.length));
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (!touch) {
                  return;
                }
                const rect = event.currentTarget.getBoundingClientRect();
                if (rect.width <= 0) {
                  return;
                }
                const ratio = clampNumber(
                  (touch.clientX - rect.left) / rect.width,
                  0,
                  1
                );
                const index = Math.round(ratio * (chartPoints.length - 1));
                queueSelectionUpdate(clampIndex(index, chartPoints.length));
              }}
              onKeyDown={(event) => {
                if (!chartPoints.length) {
                  return;
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setSelectedIndex((current) =>
                    clampIndex(current - 1, chartPoints.length)
                  );
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setSelectedIndex((current) =>
                    clampIndex(current + 1, chartPoints.length)
                  );
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setSelectedIndex(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setSelectedIndex(chartPoints.length - 1);
                }
              }}
            >
              <defs>
                <linearGradient
                  id={`${chartId}-line`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="hsl(var(--ai))" />
                  <stop offset="100%" stopColor="hsl(var(--bullish))" />
                </linearGradient>
                <linearGradient
                  id={`${chartId}-area`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--bullish))"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--bullish))"
                    stopOpacity="0.01"
                  />
                </linearGradient>
              </defs>

              <rect
                x={PLOT_LEFT}
                y={PLOT_TOP}
                width={plotWidth}
                height={plotHeight}
                rx={11}
                className="fill-panel-soft/45 stroke-border/75"
                strokeWidth="1"
              />

              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = PLOT_TOP + plotHeight * ratio;
                return (
                  <line
                    key={ratio}
                    x1={PLOT_LEFT}
                    y1={y}
                    x2={SVG_WIDTH - PLOT_RIGHT}
                    y2={y}
                    className="stroke-border/45"
                    strokeWidth="0.7"
                    strokeDasharray="3 4"
                  />
                );
              })}

              <path d={areaPath} fill={`url(#${chartId}-area)`} />
              <path
                d={linePath}
                fill="none"
                stroke={`url(#${chartId}-line)`}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <line
                x1={selectedX}
                y1={PLOT_TOP + 1}
                x2={selectedX}
                y2={axisBottomY - 1}
                className="stroke-ai/70"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={selectedX}
                cy={selectedY}
                r="4.2"
                className="fill-ai/25"
              />
              <circle
                cx={selectedX}
                cy={selectedY}
                r="2.5"
                className="fill-ai stroke-panel-strong"
                strokeWidth="1.2"
              />

              <rect
                x={4}
                y={priceLabelY}
                width={selectedPriceLabelWidth}
                height={24}
                rx={11}
                className="fill-panel-strong/95 stroke-ai/75"
                strokeWidth="0.9"
              />
              <line
                x1={4 + selectedPriceLabelWidth}
                y1={priceLabelY + 12}
                x2={PLOT_LEFT}
                y2={priceLabelY + 12}
                className="stroke-ai/60"
                strokeWidth="0.9"
              />
              <text
                x={11}
                y={priceLabelY + 16}
                className="fill-foreground text-[11px] font-semibold"
              >
                {selectedPriceLabel}
              </text>

              <rect
                x={selectedDateLabelX}
                y={axisBottomY + 6}
                width={selectedDateLabelWidth}
                height={24}
                rx={11}
                className="fill-panel-strong/95 stroke-border/85"
                strokeWidth="0.9"
              />
              <text
                x={selectedDateLabelX + 9}
                y={axisBottomY + 22}
                className="fill-foreground text-[11px] font-semibold"
              >
                {selectedDateLabel}
              </text>

              <text
                x={4}
                y={PLOT_TOP + 13}
                className="fill-foreground text-[12px] font-semibold"
              >
                {formatYAxis(rawMaxPrice)}
              </text>
              <text
                x={4}
                y={axisBottomY - 2}
                className="fill-foreground text-[12px] font-semibold"
              >
                {formatYAxis(rawMinPrice)}
              </text>
              <text
                x={PLOT_LEFT + 4}
                y={axisBottomY - 9}
                className="fill-foreground text-[12px] font-semibold"
              >
                {leftDateLabel}
              </text>
              <text
                x={SVG_WIDTH - PLOT_RIGHT - rightDateLabelWidth - 4}
                y={axisBottomY - 9}
                className="fill-foreground text-[12px] font-semibold"
              >
                {rightDateLabel}
              </text>
            </svg>
          </div>
        ) : (
          <MissingDataState
            compact
            headline="Chart's on coffee break ☕"
            missing={pickSparklineMissing(missing)}
          />
        )}
      </div>
    </section>
  );
}

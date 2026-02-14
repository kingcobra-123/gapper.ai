import { Activity } from "lucide-react";

interface TickerHoverCardProps {
  symbol: string;
  children: React.ReactNode;
}

function quoteFromSymbol(symbol: string) {
  const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const price = Number((seed % 220 + 12 + (seed % 7) * 0.41).toFixed(2));
  const changePercent = Number((((seed % 15) - 7) * 0.45).toFixed(2));
  const volume = 1000000 + (seed % 90) * 145000;

  return {
    price,
    changePercent,
    volume,
    sparkline: [
      price - 1.4,
      price - 1,
      price - 0.7,
      price - 0.1,
      price + 0.2,
      price + changePercent / 2,
      price + changePercent
    ]
  };
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const polyline = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-full rounded-md bg-panel-soft/60 p-1">
      <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="4" className="text-ai" />
    </svg>
  );
}

export function TickerHoverCard({ symbol, children }: TickerHoverCardProps) {
  const quote = quoteFromSymbol(symbol);

  return (
    <span className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-[120%] left-1/2 z-20 hidden w-56 -translate-x-1/2 rounded-xl border border-border/80 bg-panel-strong/95 p-2 text-xs shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md group-hover:block group-focus-within:block">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{symbol}</span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Activity className="h-3 w-3" />
            Live
          </span>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-1">
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-1.5">
            <span className="text-muted">Price</span>
            <span className="block font-semibold">${quote.price.toFixed(2)}</span>
          </div>
          <div className="rounded-md border border-border/70 bg-panel-soft/50 p-1.5">
            <span className="text-muted">Change</span>
            <span
              className={
                quote.changePercent >= 0 ? "block font-semibold text-bullish" : "block font-semibold text-bearish"
              }
            >
              {quote.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <Sparkline points={quote.sparkline} />
        <span className="mt-1 block text-[11px] text-muted">Volume {Math.round(quote.volume / 1000000)}M</span>
      </div>
    </span>
  );
}

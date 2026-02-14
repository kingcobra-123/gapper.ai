export type CardSentiment = "bullish" | "bearish" | "neutral";

export interface SparklinePoint {
  date: string;
  price: number;
}

export interface TickerSnapshotData {
  ticker: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  relativeVolume?: number;
  floatM?: number;
  sparkline?: number[];
  sparklinePoints30d?: SparklinePoint[];
  highlights?: string[];
}

export interface LevelsData {
  ticker: string;
  support?: number[];
  resistance?: number[];
  pivot?: number;
  entryZone?: [number, number];
  invalidation?: number;
  highlights?: string[];
}

export interface NewsItem {
  headline: string;
  source: string;
  url?: string;
  sentiment?: CardSentiment;
  publishedAt: string;
}

export interface NewsData {
  ticker: string;
  items?: NewsItem[];
  highlights?: string[];
}

export interface RiskPlanData {
  ticker: string;
  riskProfile?: "low" | "med" | "high";
  positionSizePct?: number;
  maxLoss?: number;
  stopLoss?: number;
  takeProfit?: number[];
  plan?: string[];
}

export interface TradeIdeaData {
  ticker: string;
  bias?: "long" | "short";
  thesis?: string;
  entryRange?: [number, number];
  stop?: number;
  targets?: number[];
  confidence?: number;
  triggers?: string[];
}

export interface GapAnalysisData {
  ticker: string;
  gapPercent?: number;
  direction?: "up" | "down";
  premarketVolume?: number;
  floatM?: number;
  catalyst?: string;
  setupQuality?: number;
  plan?: string[];
}

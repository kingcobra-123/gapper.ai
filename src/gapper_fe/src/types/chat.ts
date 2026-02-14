import type {
  GapAnalysisData,
  LevelsData,
  NewsData,
  RiskPlanData,
  TickerSnapshotData,
  TradeIdeaData
} from "@/types/cards";
import type { MissingDataBlock } from "@/types/missing";

export type ChatRole = "user" | "assistant" | "system";
export type TradingMode = "paper" | "live";
export type RiskProfile = "low" | "med" | "high";

export type ChatIntent = "message" | "quick_gap" | "levels" | "news" | "deep_dive" | "scan";

export type ChatMessageStatus = "sending" | "sent" | "error";

interface BaseAssistantCard {
  id: string;
  title: string;
  timestamp: string;
  tickers: string[];
  missing?: MissingDataBlock;
}

export type AssistantCard =
  | (BaseAssistantCard & { type: "ticker_snapshot"; data?: TickerSnapshotData })
  | (BaseAssistantCard & { type: "levels"; data?: LevelsData })
  | (BaseAssistantCard & { type: "news"; data?: NewsData })
  | (BaseAssistantCard & { type: "risk_plan"; data?: RiskPlanData })
  | (BaseAssistantCard & { type: "trade_idea"; data?: TradeIdeaData })
  | (BaseAssistantCard & { type: "gap_analysis"; data?: GapAnalysisData });

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  intent: ChatIntent;
  tickers: string[];
  mode: TradingMode;
  status: ChatMessageStatus;
  refreshPending?: boolean;
  cards?: AssistantCard[];
}

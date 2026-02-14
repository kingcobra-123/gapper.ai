import type { AssistantCard, ChatIntent, RiskProfile, TradingMode } from "@/types/chat";

export interface ChatContext {
  lastTickers: string[];
  mode: TradingMode;
  userPrefs: {
    risk: RiskProfile;
  };
}

export interface ChatRequest {
  channelId: string;
  message: string;
  intent: ChatIntent;
  tickers: string[];
  context: ChatContext;
}

export interface ChatResponse {
  reply: string;
  intent: ChatIntent;
  tickers: string[];
  cards: AssistantCard[];
  timestamp: string;
  latencyMs: number;
}

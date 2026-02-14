import type { ChatRequest, ChatResponse } from "@/lib/api/contracts";
import type { AssistantCard, ChatIntent, RiskProfile } from "@/types/chat";

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function symbolSeed(symbol: string): number {
  return symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function makeQuote(symbol: string) {
  const seed = symbolSeed(symbol);
  const price = Number((seed % 200 + 20 + (seed % 10) * 0.37).toFixed(2));
  const changePercent = Number((((seed % 17) - 8) * 0.58).toFixed(2));

  return {
    ticker: symbol,
    price,
    changePercent,
    volume: 800000 + (seed % 100) * 190000,
    relativeVolume: Number((1.2 + (seed % 9) * 0.28).toFixed(2)),
    floatM: Number((18 + (seed % 70) * 0.9).toFixed(1)),
    sparkline: [
      price - 1.8,
      price - 1.1,
      price - 0.8,
      price - 0.5,
      price + 0.2,
      price + changePercent / 2,
      price + changePercent
    ]
  };
}

function snapshotCard(symbol: string): AssistantCard {
  const now = new Date().toISOString();
  const quote = makeQuote(symbol);

  return {
    id: randomId("card"),
    type: "ticker_snapshot",
    title: `${symbol} Snapshot`,
    tickers: [symbol],
    timestamp: now,
    data: {
      ...quote,
      highlights: [
        `Relative volume ${quote.relativeVolume}x`,
        `Float ${quote.floatM}M`,
        quote.changePercent >= 0 ? "Buyers defending highs" : "Sellers active into pops"
      ]
    }
  };
}

function levelsCard(symbol: string): AssistantCard {
  const quote = makeQuote(symbol);
  const now = new Date().toISOString();

  return {
    id: randomId("card"),
    type: "levels",
    title: `${symbol} Levels`,
    tickers: [symbol],
    timestamp: now,
    data: {
      ticker: symbol,
      support: [Number((quote.price * 0.97).toFixed(2)), Number((quote.price * 0.95).toFixed(2))],
      resistance: [Number((quote.price * 1.03).toFixed(2)), Number((quote.price * 1.06).toFixed(2))],
      pivot: Number(quote.price.toFixed(2)),
      entryZone: [Number((quote.price * 0.995).toFixed(2)), Number((quote.price * 1.005).toFixed(2))],
      invalidation: Number((quote.price * 0.985).toFixed(2)),
      highlights: [
        "Primary level from premarket VWAP cluster",
        "Avoid chasing above second resistance"
      ]
    }
  };
}

function newsCard(symbol: string): AssistantCard {
  const now = new Date().toISOString();

  return {
    id: randomId("card"),
    type: "news",
    title: `${symbol} News`,
    tickers: [symbol],
    timestamp: now,
    data: {
      ticker: symbol,
      items: [
        {
          headline: `${symbol} extends premarket momentum after guidance update`,
          source: "TerminalWire",
          url: "https://example.com/news/1",
          sentiment: "bullish",
          publishedAt: now
        },
        {
          headline: `Options flow spikes in ${symbol} ahead of open`,
          source: "FlowDesk",
          url: "https://example.com/news/2",
          sentiment: "neutral",
          publishedAt: now
        }
      ],
      highlights: ["Catalyst still fresh", "Newswire tone mixed but net positive"]
    }
  };
}

function riskCard(symbol: string, risk: RiskProfile): AssistantCard {
  const quote = makeQuote(symbol);
  const riskPct = risk === "low" ? 0.35 : risk === "med" ? 0.65 : 1.1;

  return {
    id: randomId("card"),
    type: "risk_plan",
    title: `${symbol} Risk Plan`,
    tickers: [symbol],
    timestamp: new Date().toISOString(),
    data: {
      ticker: symbol,
      riskProfile: risk,
      positionSizePct: Number(riskPct.toFixed(2)),
      maxLoss: Number((quote.price * 0.018 * 100).toFixed(2)),
      stopLoss: Number((quote.price * 0.983).toFixed(2)),
      takeProfit: [Number((quote.price * 1.02).toFixed(2)), Number((quote.price * 1.05).toFixed(2))],
      plan: ["Scale 40% at first target", "Move stop to break-even after first scale"]
    }
  };
}

function tradeIdeaCard(symbol: string): AssistantCard {
  const quote = makeQuote(symbol);

  return {
    id: randomId("card"),
    type: "trade_idea",
    title: `${symbol} Trade Idea`,
    tickers: [symbol],
    timestamp: new Date().toISOString(),
    data: {
      ticker: symbol,
      bias: quote.changePercent >= 0 ? "long" : "short",
      thesis:
        quote.changePercent >= 0
          ? "Momentum continuation if first pullback holds VWAP"
          : "Weak open reclaim failure can extend downside",
      entryRange: [Number((quote.price * 0.996).toFixed(2)), Number((quote.price * 1.004).toFixed(2))],
      stop: Number((quote.price * 0.987).toFixed(2)),
      targets: [Number((quote.price * 1.018).toFixed(2)), Number((quote.price * 1.037).toFixed(2))],
      confidence: Number((0.58 + (symbolSeed(symbol) % 30) / 100).toFixed(2)),
      triggers: ["Volume expansion over opening range", "Tape confirms higher lows"]
    }
  };
}

function gapCard(symbol: string): AssistantCard {
  const quote = makeQuote(symbol);
  const gapPercent = Number((quote.changePercent * 1.4).toFixed(2));

  return {
    id: randomId("card"),
    type: "gap_analysis",
    title: `${symbol} Gap Analysis`,
    tickers: [symbol],
    timestamp: new Date().toISOString(),
    data: {
      ticker: symbol,
      gapPercent,
      direction: gapPercent >= 0 ? "up" : "down",
      premarketVolume: Math.round(quote.volume * 0.28),
      floatM: quote.floatM,
      catalyst: "Earnings follow-through and sector sympathy",
      setupQuality: Number((67 + (symbolSeed(symbol) % 28)).toFixed(0)),
      plan: ["Wait for first 5-minute range", "Trade only with volume confirmation"]
    }
  };
}

function cardsForIntent(intent: ChatIntent, symbol: string, risk: RiskProfile): AssistantCard[] {
  if (intent === "levels") {
    return [levelsCard(symbol), riskCard(symbol, risk)];
  }

  if (intent === "news") {
    return [newsCard(symbol), snapshotCard(symbol)];
  }

  if (intent === "quick_gap") {
    return [gapCard(symbol), snapshotCard(symbol), tradeIdeaCard(symbol)];
  }

  if (intent === "deep_dive") {
    return [snapshotCard(symbol), levelsCard(symbol), gapCard(symbol), newsCard(symbol), riskCard(symbol, risk)];
  }

  if (intent === "scan") {
    return [gapCard(symbol), snapshotCard(symbol), gapCard("SMCI")];
  }

  return [snapshotCard(symbol), tradeIdeaCard(symbol)];
}

function replyForIntent(intent: ChatIntent, symbol: string): string {
  if (intent === "levels") {
    return `Mapped key support/resistance for ${symbol} with a clear invalidation line.`;
  }

  if (intent === "news") {
    return `Latest catalysts for ${symbol} are mixed-positive with momentum still intact.`;
  }

  if (intent === "quick_gap") {
    return `${symbol} shows a tradable opening gap setup. Wait for volume confirmation before entry.`;
  }

  if (intent === "deep_dive") {
    return `Deep dive ready for ${symbol}: structure, catalysts, and risk plan are attached in cards.`;
  }

  if (intent === "scan") {
    return "Top gappers scanned. Prioritized setups are attached in ranked cards.";
  }

  return `Quick read on ${symbol}: momentum and risk profile attached below.`;
}

export function mockChatResponse(req: ChatRequest): ChatResponse {
  const symbol = req.tickers[0] ?? req.context.lastTickers[0] ?? "TSLA";
  const cards = cardsForIntent(req.intent, symbol, req.context.userPrefs.risk);

  return {
    reply: replyForIntent(req.intent, symbol),
    intent: req.intent,
    tickers: [symbol],
    cards,
    timestamp: new Date().toISOString(),
    latencyMs: 220 + Math.round(Math.random() * 240)
  };
}

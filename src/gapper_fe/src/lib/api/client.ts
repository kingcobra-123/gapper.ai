import { adaptCardResponse, adaptGappersResponse, normalizeTickerSymbol, selectCardsForIntent } from "@/api/adapters";
import { fetchCardDto, fetchTopGappersDto, pinTickerDto, postAnalyzeTickerDto } from "@/api/routes";
import type { ChatRequest, ChatResponse } from "@/lib/api/contracts";

function nowIso(): string {
  return new Date().toISOString();
}

export async function postChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const primaryTicker = normalizeTickerSymbol(req.tickers[0] ?? req.context.lastTickers[0] ?? "");

  if (req.intent === "scan") {
    const gappers = adaptGappersResponse(await fetchTopGappersDto(12));
    const cards = [] as ChatResponse["cards"];

    if (gappers[0]) {
      const cardResult = await fetchCardDto(gappers[0].ticker);
      if (cardResult.kind === "ok") {
        cards.push(...selectCardsForIntent(adaptCardResponse(cardResult.payload).cards, "scan"));
      }
    }

    return {
      reply:
        gappers.length > 0
          ? `Top gappers: ${gappers
              .slice(0, 6)
              .map((item) => `${item.ticker}(${item.score.toFixed(2)})`)
              .join(" | ")}`
          : "No gappers returned by backend.",
      intent: req.intent,
      tickers: gappers.map((item) => item.ticker).slice(0, 6),
      cards,
      timestamp: nowIso(),
      latencyMs: Date.now() - start
    };
  }

  if (!primaryTicker) {
    return {
      reply: "Usage: card <ticker> | analyze <ticker> | pin <ticker> | /scan gappers",
      intent: req.intent,
      tickers: [],
      cards: [],
      timestamp: nowIso(),
      latencyMs: Date.now() - start
    };
  }

  if (req.message.toLowerCase().startsWith("analyze ")) {
    await postAnalyzeTickerDto(primaryTicker);
  }

  if (req.message.toLowerCase().startsWith("pin ")) {
    await pinTickerDto(primaryTicker);
  }

  const cardResult = await fetchCardDto(primaryTicker);
  if (cardResult.kind === "not_modified") {
    return {
      reply: `${primaryTicker}: no change (304).`,
      intent: req.intent,
      tickers: [primaryTicker],
      cards: [],
      timestamp: nowIso(),
      latencyMs: Date.now() - start
    };
  }

  const card = adaptCardResponse(cardResult.payload);
  const cards = selectCardsForIntent(card.cards, req.intent);

  let reply = `${primaryTicker}: card fetched.`;
  if (card.isMissing) {
    reply = `${primaryTicker}: card not ready yet; backend refresh is in progress.`;
  } else if (card.isStale) {
    reply = `${primaryTicker}: serving cached card while backend refreshes.`;
  }

  return {
    reply,
    intent: req.intent,
    tickers: [primaryTicker],
    cards,
    timestamp: nowIso(),
    latencyMs: Date.now() - start
  };
}

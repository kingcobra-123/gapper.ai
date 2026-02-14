import type { CardViewModel } from "../../api/types";

const INVALID_INPUT_REPLIES = [
  "That ticker format did a backflip and landed in a bush. Try `$AAPL` or `/card AAPL`.",
  "My parser took one look and requested paid leave. Send a clean ticker like `$TSLA`.",
  "That symbol is spicy, but not in a valid way. Try one proper ticker (example: `$NVDA`)."
] as const;

const NOT_FOUND_REPLIES = [
  "I sent a search party for ${ticker} and they returned with snacks, no stock. Try another ticker.",
  "Plot twist: ${ticker} appears to be fictional. Send a real market ticker and I'll fetch it.",
  "I checked every shelf for ${ticker}. Found vibes, found memes, found no listed stock."
] as const;

const CARD_PENDING_REPLIES = [
  "Dispatch update: three caffeine-fueled interns are wrestling ${ticker} into a readable card.",
  "${ticker} is in the volatility microwave. If it dings clean, you get fresh intel.",
  "Card goblins are forging ${ticker} behind the curtain. Please do not feed them after midnight."
] as const;

const CARD_MISSING_REPLIES = [
  "I raided every drawer for ${ticker}. Found vibes, found crumbs, found no card.",
  "${ticker} just ghosted the terminal. Run `/analyze ${ticker}` and we will summon it back.",
  "No card for ${ticker} yet. Backend is either meditating or plotting. Retry shortly."
] as const;

const CARD_TIMEOUT_REPLIES = [
  "${ticker} is still in the card oven and the timer is screaming. I aborted the wait.",
  "We waited on ${ticker} long enough for a director's cut. Refresh timed out.",
  "${ticker} is taking the scenic route through backend space-time. Timeout called."
] as const;

type MissingMessageStatus = "sent" | "error";

export type CardDisplayTreatment =
  | {
      kind: "not_found";
      content: string;
      status: "error";
      refreshPending: false;
    }
  | {
      kind: "missing";
      content: string;
      status: MissingMessageStatus;
      refreshPending: boolean;
    }
  | {
      kind: "ready";
      content: string;
      status: "sent";
      refreshPending: boolean;
    };

function pickReply(options: readonly string[], seed: string): string {
  if (!options.length) {
    return "";
  }

  const idx = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return options[idx] ?? options[0];
}

function interpolateTicker(template: string, ticker: string): string {
  return template.replaceAll("${ticker}", `$${ticker}`);
}

export function buildInvalidTickerReply(seed: string): string {
  return pickReply(INVALID_INPUT_REPLIES, seed || "invalid-input");
}

export function buildTickerNotFoundReply(ticker: string): string {
  return interpolateTicker(pickReply(NOT_FOUND_REPLIES, ticker), ticker);
}

export function buildCardPendingReply(ticker: string): string {
  return interpolateTicker(pickReply(CARD_PENDING_REPLIES, ticker), ticker);
}

export function buildCardMissingReply(ticker: string): string {
  return interpolateTicker(pickReply(CARD_MISSING_REPLIES, ticker), ticker);
}

export function buildCardTimeoutReply(ticker: string): string {
  return interpolateTicker(pickReply(CARD_TIMEOUT_REPLIES, ticker), ticker);
}

export function isCardRefreshPending(viewModel: CardViewModel): boolean {
  return (
    ((viewModel.isStale || viewModel.isMissing) && (viewModel.refreshTriggered || viewModel.refreshDeduped)) ||
    viewModel.llmPending
  );
}

function llmStatusSuffix(viewModel: CardViewModel): string | null {
  if (viewModel.llmPending) {
    return "partial card ready; LLM enrichment pending.";
  }
  if (viewModel.llmFailed) {
    const detail =
      viewModel.llmError && viewModel.llmError !== "llm_unavailable"
        ? ` (${viewModel.llmError})`
        : "";
    return `card ready; LLM enrichment unavailable${detail}`;
  }
  return null;
}

export function selectCardDisplayTreatment(
  viewModel: CardViewModel,
  statusLabel: "ready." | "updated." = "ready."
): CardDisplayTreatment {
  if (viewModel.errors.includes("ticker_not_found")) {
    return {
      kind: "not_found",
      content: buildTickerNotFoundReply(viewModel.ticker),
      status: "error",
      refreshPending: false
    };
  }

  const refreshPending = isCardRefreshPending(viewModel);

  if (viewModel.isMissing && !viewModel.rawCard) {
    return {
      kind: "missing",
      content: refreshPending
        ? buildCardPendingReply(viewModel.ticker)
        : buildCardMissingReply(viewModel.ticker),
      status: refreshPending ? "sent" : "error",
      refreshPending
    };
  }

  const llmStatus = llmStatusSuffix(viewModel);
  return {
    kind: "ready",
    content: llmStatus ? `${viewModel.ticker}: ${llmStatus}` : `${viewModel.ticker}: ${statusLabel}`,
    status: "sent",
    refreshPending
  };
}

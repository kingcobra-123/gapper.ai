import { normalizeTickerSymbol } from "@/api/adapters";
import { findCommand } from "@/lib/commands/registry";
import type { ChatIntent } from "@/types/chat";

export interface ParseComposerTextResult {
  intent: ChatIntent;
  tickers: string[];
  dollarTickers: string[];
  commandTickers: string[];
  bareTickerOnly?: string;
  normalizedMessage: string;
  commandName?: string;
}

const SLASH_COMMAND_REGEX = /^\/(\w+)\b\s*/;
const PLAIN_COMMAND_REGEX = /^(analyze|pin|card)\b\s*/i;
const DOLLAR_TICKER_REGEX = /\$([A-Za-z0-9.\-]{1,32})\b/g;

const BARE_TICKER_STOPWORDS = new Set([
  "ALERT",
  "ANALYZE",
  "CARD",
  "DEEP",
  "GAPPERS",
  "HELLO",
  "LEVELS",
  "NEWS",
  "PLEASE",
  "PIN",
  "SCAN",
  "THANKS"
]);

function uniqueTickers(tokens: Array<string | null | undefined>): string[] {
  const output: string[] = [];
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    if (output.includes(token)) {
      continue;
    }
    output.push(token);
    if (output.length >= 6) {
      break;
    }
  }
  return output;
}

function extractDollarTickers(input: string): string[] {
  const values: Array<string | null> = [];
  for (const match of input.matchAll(DOLLAR_TICKER_REGEX)) {
    values.push(normalizeTickerSymbol(match[1] ?? ""));
  }
  return uniqueTickers(values);
}

function extractCommandTicker(input: string): string[] {
  const firstToken = input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .find((token) => token.length > 0);

  const normalized = normalizeTickerSymbol(firstToken ?? "");
  return uniqueTickers([normalized]);
}

function detectBareTickerOnly(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return undefined;
  }

  const normalized = normalizeTickerSymbol(trimmed);
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 6) {
    return undefined;
  }

  if (BARE_TICKER_STOPWORDS.has(normalized)) {
    return undefined;
  }

  return normalized;
}

export function parseComposerText(input: string): ParseComposerTextResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      intent: "message",
      tickers: [],
      dollarTickers: [],
      commandTickers: [],
      normalizedMessage: ""
    };
  }

  const slashMatch = trimmed.match(SLASH_COMMAND_REGEX);
  const plainMatch = slashMatch ? null : trimmed.match(PLAIN_COMMAND_REGEX);

  const slashCommandName = slashMatch?.[1]?.toLowerCase();
  const plainCommandName = plainMatch?.[1]?.toLowerCase();

  const registryCommand = slashCommandName ? findCommand(slashCommandName) : undefined;

  const commandName = registryCommand?.name ?? plainCommandName;
  const intent: ChatIntent = registryCommand?.intent ?? "message";

  const withoutCommand = slashMatch
    ? trimmed.replace(SLASH_COMMAND_REGEX, "")
    : plainMatch
      ? trimmed.replace(PLAIN_COMMAND_REGEX, "")
      : trimmed;

  const dollarTickers = extractDollarTickers(withoutCommand || trimmed);
  const commandTickers =
    commandName && commandName !== "scan" ? extractCommandTicker(withoutCommand) : [];

  const tickers = commandName ? commandTickers : dollarTickers;
  const bareTickerOnly = !commandName ? detectBareTickerOnly(withoutCommand) : undefined;

  return {
    intent,
    tickers,
    dollarTickers,
    commandTickers,
    bareTickerOnly,
    normalizedMessage: withoutCommand,
    commandName
  };
}

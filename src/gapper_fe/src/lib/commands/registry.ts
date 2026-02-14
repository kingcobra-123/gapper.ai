import type { ChatIntent } from "@/types/chat";

export interface CommandDefinition {
  name: string;
  description: string;
  example: string;
  intent: ChatIntent;
  aliases?: string[];
}

export const COMMAND_REGISTRY: CommandDefinition[] = [
  {
    name: "gap",
    description: "Quick premarket gap context and setup quality",
    example: "/gap NVDA",
    intent: "quick_gap"
  },
  {
    name: "levels",
    description: "Map support, resistance, and invalidation",
    example: "/levels TSLA",
    intent: "levels"
  },
  {
    name: "news",
    description: "Pull catalyst headlines and sentiment",
    example: "/news TSLA",
    intent: "news"
  },
  {
    name: "scan",
    description: "Scan for active gappers",
    example: "/scan gappers",
    intent: "scan"
  },
  {
    name: "analyze",
    description: "Queue backend analysis for a ticker",
    example: "/analyze NVDA",
    intent: "message",
    aliases: ["force"]
  },
  {
    name: "pin",
    description: "Pin ticker for backend focus",
    example: "/pin AAPL",
    intent: "message"
  },
  {
    name: "card",
    description: "Fetch latest backend card",
    example: "/card TSLA",
    intent: "message"
  },
  {
    name: "float",
    description: "Estimate float pressure and squeeze risk",
    example: "/float TSLA",
    intent: "quick_gap"
  },
  {
    name: "halt",
    description: "Check halt risk and circuit profile",
    example: "/halt TSLA",
    intent: "quick_gap"
  }
];

export function findCommand(name: string): CommandDefinition | undefined {
  const key = name.toLowerCase();
  return COMMAND_REGISTRY.find((command) => {
    if (command.name === key) {
      return true;
    }

    return command.aliases?.includes(key) ?? false;
  });
}

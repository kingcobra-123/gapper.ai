import type { ChatMessage } from "@/types/chat";

export const MAX_MESSAGES_PER_CHANNEL = 1000;

export function appendMessageByChannel(
  messagesByChannelId: Record<string, ChatMessage[]>,
  channelId: string,
  message: ChatMessage,
  maxMessages = MAX_MESSAGES_PER_CHANNEL
): Record<string, ChatMessage[]> {
  const existing = messagesByChannelId[channelId] ?? [];
  const next = [...existing, message];
  const trimmed = next.length > maxMessages ? next.slice(next.length - maxMessages) : next;
  return {
    ...messagesByChannelId,
    [channelId]: trimmed
  };
}

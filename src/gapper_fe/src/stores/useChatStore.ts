"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appendMessageByChannel } from "@/stores/chat_store_utils";
import type {
  AssistantCard,
  ChatIntent,
  ChatMessage,
  ChatMessageStatus,
  TradingMode
} from "@/types/chat";

type MessagePayload = {
  content: string;
  intent: ChatIntent;
  tickers: string[];
  mode: TradingMode;
  cards?: AssistantCard[];
  status?: ChatMessageStatus;
  refreshPending?: boolean;
};

interface ChatState {
  messagesByChannelId: Record<string, ChatMessage[]>;
  lastTickerByChannelId: Record<string, string>;
  channelLoading: Record<string, boolean>;
  channelError: Record<string, string | null>;
  latencyMs: number;
  sendUserMessage: (channelId: string, payload: MessagePayload) => void;
  receiveAssistantMessage: (channelId: string, payload: MessagePayload) => string;
  updateMessage: (
    channelId: string,
    messageId: string,
    patch: Partial<
      Pick<ChatMessage, "content" | "intent" | "tickers" | "mode" | "cards" | "status" | "refreshPending">
    >
  ) => boolean;
  setChannelLoading: (channelId: string, loading: boolean) => void;
  setChannelError: (channelId: string, error: string | null) => void;
  setLatency: (latencyMs: number) => void;
  clearChannel: (channelId: string) => void;
}

function makeMessage(role: ChatMessage["role"], payload: MessagePayload): ChatMessage {
  return {
    id: `${role}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content: payload.content,
    intent: payload.intent,
    tickers: payload.tickers,
    mode: payload.mode,
    cards: payload.cards,
    status: payload.status ?? "sent",
    refreshPending: payload.refreshPending ?? false,
    createdAt: new Date().toISOString()
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messagesByChannelId: {},
      lastTickerByChannelId: {},
      channelLoading: {},
      channelError: {},
      latencyMs: 0,
      sendUserMessage: (channelId, payload) => {
        const message = makeMessage("user", payload);

        set((state) => ({
          messagesByChannelId: appendMessageByChannel(
            state.messagesByChannelId,
            channelId,
            message
          ),
          lastTickerByChannelId: payload.tickers[0]
            ? { ...state.lastTickerByChannelId, [channelId]: payload.tickers[0] }
            : state.lastTickerByChannelId,
          channelError: {
            ...state.channelError,
            [channelId]: null
          }
        }));
      },
      receiveAssistantMessage: (channelId, payload) => {
        const message = makeMessage("assistant", payload);

        set((state) => ({
          messagesByChannelId: appendMessageByChannel(
            state.messagesByChannelId,
            channelId,
            message
          ),
          lastTickerByChannelId: payload.tickers[0]
            ? { ...state.lastTickerByChannelId, [channelId]: payload.tickers[0] }
            : state.lastTickerByChannelId
        }));
        return message.id;
      },
      updateMessage: (channelId, messageId, patch) => {
        let didUpdate = false;

        set((state) => {
          const existingMessages = state.messagesByChannelId[channelId] ?? [];
          if (existingMessages.length === 0) {
            return state;
          }

          const nextMessages = existingMessages.map((message) => {
            if (message.id !== messageId) {
              return message;
            }

            didUpdate = true;
            return {
              ...message,
              content: patch.content ?? message.content,
              intent: patch.intent ?? message.intent,
              tickers: patch.tickers ?? message.tickers,
              mode: patch.mode ?? message.mode,
              cards: patch.cards ?? message.cards,
              status: patch.status ?? message.status,
              refreshPending: patch.refreshPending ?? message.refreshPending
            };
          });

          if (!didUpdate) {
            return state;
          }

          return {
            ...state,
            messagesByChannelId: {
              ...state.messagesByChannelId,
              [channelId]: nextMessages
            },
            lastTickerByChannelId: patch.tickers?.[0]
              ? { ...state.lastTickerByChannelId, [channelId]: patch.tickers[0] }
              : state.lastTickerByChannelId
          };
        });

        return didUpdate;
      },
      setChannelLoading: (channelId, loading) => {
        set((state) => ({
          channelLoading: {
            ...state.channelLoading,
            [channelId]: loading
          }
        }));
      },
      setChannelError: (channelId, error) => {
        set((state) => ({
          channelError: {
            ...state.channelError,
            [channelId]: error
          }
        }));
      },
      setLatency: (latencyMs) => {
        set({ latencyMs });
      },
      clearChannel: (channelId) => {
        set((state) => ({
          messagesByChannelId: {
            ...state.messagesByChannelId,
            [channelId]: []
          }
        }));
      }
    }),
    {
      name: "gapper-chat",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messagesByChannelId: state.messagesByChannelId,
        lastTickerByChannelId: state.lastTickerByChannelId,
        latencyMs: state.latencyMs
      })
    }
  )
);

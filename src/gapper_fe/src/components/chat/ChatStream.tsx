"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MessageRow } from "@/components/chat/MessageRow";
import { useChatStore } from "@/stores/useChatStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { ChatMessage } from "@/types/chat";

const INITIAL_VISIBLE_MESSAGES = 5;
const LOAD_MORE_STEP = 1;
const SCROLL_TOP_THRESHOLD_PX = 32;
const EMPTY_MESSAGES: ChatMessage[] = [];

export function ChatStream() {
  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const messages = useChatStore((state) => {
    if (!selectedChannelId) {
      return EMPTY_MESSAGES;
    }
    return state.messagesByChannelId[selectedChannelId] ?? EMPTY_MESSAGES;
  });
  const isLoading = useChatStore((state) =>
    selectedChannelId ? Boolean(state.channelLoading[selectedChannelId]) : false
  );
  const activeError = useChatStore((state) =>
    selectedChannelId ? (state.channelError[selectedChannelId] ?? null) : null
  );
  const [visibleCountByChannel, setVisibleCountByChannel] = useState<Record<string, number>>({});
  const visibleCount = selectedChannelId
    ? (visibleCountByChannel[selectedChannelId] ?? INITIAL_VISIBLE_MESSAGES)
    : INITIAL_VISIBLE_MESSAGES;
  const visibleMessages = useMemo(() => {
    if (messages.length <= visibleCount) {
      return messages;
    }
    return messages.slice(-visibleCount);
  }, [messages, visibleCount]);

  const containerRef = useRef<HTMLDivElement>(null);
  const initializedChannelScrollRef = useRef<Record<string, boolean>>({});
  const lastMessageCountByChannelRef = useRef<Record<string, number>>({});
  const scrollTickingRef = useRef(false);
  const prependScrollRestoreRef = useRef<{
    channelId: string;
    previousTop: number;
    previousHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedChannelId) {
      return;
    }
    setVisibleCountByChannel((state) => {
      if (state[selectedChannelId] !== undefined) {
        return state;
      }
      return {
        ...state,
        [selectedChannelId]: INITIAL_VISIBLE_MESSAGES
      };
    });
  }, [selectedChannelId]);

  const revealOlderMessages = useCallback(() => {
    if (!selectedChannelId) {
      return;
    }
    const node = containerRef.current;
    if (node) {
      prependScrollRestoreRef.current = {
        channelId: selectedChannelId,
        previousTop: node.scrollTop,
        previousHeight: node.scrollHeight
      };
    }
    setVisibleCountByChannel((state) => {
      const current = state[selectedChannelId] ?? INITIAL_VISIBLE_MESSAGES;
      if (current >= messages.length) {
        prependScrollRestoreRef.current = null;
        return state;
      }
      return {
        ...state,
        [selectedChannelId]: Math.min(messages.length, current + LOAD_MORE_STEP)
      };
    });
  }, [messages.length, selectedChannelId]);

  useLayoutEffect(() => {
    if (!selectedChannelId) {
      return;
    }
    const pendingRestore = prependScrollRestoreRef.current;
    if (!pendingRestore || pendingRestore.channelId !== selectedChannelId) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      prependScrollRestoreRef.current = null;
      return;
    }

    const heightDelta = node.scrollHeight - pendingRestore.previousHeight;
    node.scrollTop = Math.max(0, pendingRestore.previousTop + heightDelta);
    prependScrollRestoreRef.current = null;
  }, [selectedChannelId, visibleMessages.length]);

  const handleScroll = useCallback(() => {
    if (scrollTickingRef.current) {
      return;
    }
    scrollTickingRef.current = true;
    window.requestAnimationFrame(() => {
      scrollTickingRef.current = false;
      const node = containerRef.current;
      if (!node) {
        return;
      }
      if (node.scrollTop <= SCROLL_TOP_THRESHOLD_PX) {
        revealOlderMessages();
      }
    });
  }, [revealOlderMessages]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !selectedChannelId) {
      return;
    }

    const previousCount = lastMessageCountByChannelRef.current[selectedChannelId] ?? 0;
    const hasNewMessage = messages.length > previousCount;
    const isInitialLoad = !initializedChannelScrollRef.current[selectedChannelId];

    if (isInitialLoad) {
      node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      initializedChannelScrollRef.current[selectedChannelId] = true;
      lastMessageCountByChannelRef.current[selectedChannelId] = messages.length;
      return;
    }

    if (!hasNewMessage && !isLoading) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    lastMessageCountByChannelRef.current[selectedChannelId] = messages.length;
  }, [isLoading, messages.length, selectedChannelId]);

  return (
    <section className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Chat Stream</h2>
        <p className="text-xs text-muted">{selectedChannelId ? `Channel ${selectedChannelId}` : "No channel"}</p>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="terminal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
      >
        {visibleMessages.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-panel-soft/30 p-5 text-sm text-muted">
            Start with `/gap NVDA`, `/levels TSLA`, or just type a ticker to begin.
          </div>
        ) : null}

        {visibleMessages.map((message, index) => {
          const isLast = index === visibleMessages.length - 1;
          const cardCount = message.cards?.length ?? 0;
          const showRefreshIndicator = message.role === "assistant" && Boolean(message.refreshPending);

          return (
            <div key={message.id} data-last-message={isLast ? "true" : undefined}>
              <MessageRow
                message={message}
                compactCards={cardCount >= 3}
                showRefreshIndicator={showRefreshIndicator}
              />
            </div>
          );
        })}

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-panel-soft/60" />
            <div className="h-36 animate-pulse rounded-xl border border-border/70 bg-panel-soft/60" />
          </div>
        ) : null}

        {activeError ? (
          <div className="rounded-xl border border-bearish/60 bg-bearish/10 p-3 text-xs text-bearish">
            Backend unavailable or rate limited. Last error: {activeError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

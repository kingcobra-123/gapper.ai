"use client";

import { normalizeTickerSymbol } from "@/api/adapters";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WatchlistState {
  tickers: string[];
  recentTickers: string[];
  addTicker: (ticker: string) => void;
  removeTicker: (ticker: string) => void;
  touchTicker: (ticker: string) => void;
  mergeTickers: (tickers: string[]) => void;
}

function cleanTicker(input: string): string {
  return normalizeTickerSymbol(input) ?? "";
}

function emitTickerAdded(ticker: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("gapper:watchlist-added", { detail: { ticker } }));
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      tickers: ["TSLA", "NVDA", "AAPL", "SPY"],
      recentTickers: ["TSLA", "NVDA"],
      addTicker: (ticker) => {
        const symbol = cleanTicker(ticker);
        if (!symbol) {
          return;
        }

        let inserted = false;
        set((state) => {
          const exists = state.tickers.includes(symbol);
          inserted = !exists;

          return {
            tickers: exists ? state.tickers : [...state.tickers, symbol],
            recentTickers: [symbol, ...state.recentTickers.filter((item) => item !== symbol)].slice(0, 12)
          };
        });

        if (inserted) {
          emitTickerAdded(symbol);
        }
      },
      removeTicker: (ticker) => {
        const symbol = cleanTicker(ticker);

        set((state) => ({
          tickers: state.tickers.filter((item) => item !== symbol),
          recentTickers: state.recentTickers.filter((item) => item !== symbol)
        }));
      },
      touchTicker: (ticker) => {
        const symbol = cleanTicker(ticker);
        if (!symbol) {
          return;
        }

        set((state) => ({
          recentTickers: [symbol, ...state.recentTickers.filter((item) => item !== symbol)].slice(0, 12)
        }));
      },
      mergeTickers: (tickers) => {
        const normalized = tickers.map(cleanTicker).filter((ticker) => ticker.length > 0);
        if (normalized.length === 0) {
          return;
        }

        set((state) => {
          const next = [...state.tickers];
          for (const ticker of normalized) {
            if (!next.includes(ticker)) {
              next.push(ticker);
            }
          }

          return {
            tickers: next,
            recentTickers: [...normalized, ...state.recentTickers.filter((item) => !normalized.includes(item))].slice(
              0,
              12
            )
          };
        });
      }
    }),
    {
      name: "gapper-watchlist",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

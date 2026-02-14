"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RiskProfile, TradingMode } from "@/types/chat";

type RightPanelTab = "details" | "levels" | "news" | "risk" | "positions";
type BentoLayoutPreset = "layout_a" | "layout_b";
type ThemeVariant = "cinematic" | "terminal";
export type Layout2PanelId = "right_panel" | "mini_chart" | "sentiment" | "gap_analysis";

const DEFAULT_LAYOUT2_PANELS: Layout2PanelId[] = [
  "right_panel",
  "mini_chart",
  "sentiment",
  "gap_analysis"
];

interface UIState {
  rightPanelTab: RightPanelTab;
  bentoLayoutPreset: BentoLayoutPreset;
  scanlineEnabled: boolean;
  tradingMode: TradingMode;
  riskProfile: RiskProfile;
  themeVariant: ThemeVariant;
  commandPaletteOpen: boolean;
  layout2Panels: Layout2PanelId[];
  utilityTickerByChannelId: Record<string, string>;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setBentoLayoutPreset: (preset: BentoLayoutPreset) => void;
  setScanlineEnabled: (enabled: boolean) => void;
  setTradingMode: (mode: TradingMode) => void;
  setRiskProfile: (risk: RiskProfile) => void;
  setThemeVariant: (theme: ThemeVariant) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setUtilityTickerForChannel: (channelId: string, ticker: string) => void;
  clearUtilityTickerForChannel: (channelId: string) => void;
  moveLayout2Panel: (fromIndex: number, toIndex: number) => void;
  resetLayout2Panels: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      rightPanelTab: "details",
      bentoLayoutPreset: "layout_a",
      scanlineEnabled: false,
      tradingMode: "paper",
      riskProfile: "med",
      themeVariant: "cinematic",
      commandPaletteOpen: false,
      layout2Panels: DEFAULT_LAYOUT2_PANELS,
      utilityTickerByChannelId: {},
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
      setBentoLayoutPreset: (bentoLayoutPreset) => set({ bentoLayoutPreset }),
      setScanlineEnabled: (scanlineEnabled) => set({ scanlineEnabled }),
      setTradingMode: (tradingMode) => set({ tradingMode }),
      setRiskProfile: (riskProfile) => set({ riskProfile }),
      setThemeVariant: (themeVariant) => set({ themeVariant }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setUtilityTickerForChannel: (channelId, ticker) =>
        set((state) => ({
          utilityTickerByChannelId: {
            ...state.utilityTickerByChannelId,
            [channelId]: ticker
          }
        })),
      clearUtilityTickerForChannel: (channelId) =>
        set((state) => {
          if (!(channelId in state.utilityTickerByChannelId)) {
            return state;
          }
          const next = { ...state.utilityTickerByChannelId };
          delete next[channelId];
          return {
            utilityTickerByChannelId: next
          };
        }),
      moveLayout2Panel: (fromIndex, toIndex) => {
        set((state) => {
          const next = [...state.layout2Panels];

          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= next.length ||
            toIndex >= next.length ||
            fromIndex === toIndex
          ) {
            return state;
          }

          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);

          return { layout2Panels: next };
        });
      },
      resetLayout2Panels: () => set({ layout2Panels: DEFAULT_LAYOUT2_PANELS })
    }),
    {
      name: "gapper-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rightPanelTab: state.rightPanelTab,
        bentoLayoutPreset: state.bentoLayoutPreset,
        scanlineEnabled: state.scanlineEnabled,
        tradingMode: state.tradingMode,
        riskProfile: state.riskProfile,
        themeVariant: state.themeVariant,
        layout2Panels: state.layout2Panels
      })
    }
  )
);

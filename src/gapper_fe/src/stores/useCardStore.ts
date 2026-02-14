"use client";

import { create } from "zustand";
import type { CardViewModel } from "@/api/types";

interface CardStoreState {
  cardByTicker: Record<string, CardViewModel>;
  upsertCardViewModel: (viewModel: CardViewModel) => void;
}

export const useCardStore = create<CardStoreState>()((set) => ({
  cardByTicker: {},
  upsertCardViewModel: (viewModel) => {
    set((state) => ({
      cardByTicker: {
        ...state.cardByTicker,
        [viewModel.ticker]: viewModel
      }
    }));
  }
}));


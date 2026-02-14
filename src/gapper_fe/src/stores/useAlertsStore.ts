"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AlertRule } from "@/types/alerts";

interface AlertsState {
  alerts: AlertRule[];
  createAlert: (input: Omit<AlertRule, "id" | "createdAt">) => void;
  deleteAlert: (alertId: string) => void;
  toggleAlert: (alertId: string) => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      createAlert: (input) => {
        const alert: AlertRule = {
          id: `alert-${Math.random().toString(36).slice(2, 10)}`,
          createdAt: new Date().toISOString(),
          ...input
        };

        set((state) => ({ alerts: [alert, ...state.alerts] }));
      },
      deleteAlert: (alertId) => {
        set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== alertId) }));
      },
      toggleAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
          )
        }));
      }
    }),
    {
      name: "gapper-alerts",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

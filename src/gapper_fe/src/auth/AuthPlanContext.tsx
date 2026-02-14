"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError } from "@/api/client";
import { fetchMeDto } from "@/api/routes";

export type AuthPlanStatus = "idle" | "loading" | "ready" | "unauthenticated" | "error";

export interface AuthPlanSnapshot {
  status: AuthPlanStatus;
  userId: string | null;
  email: string | null;
  plan: "free" | "premium";
  gateEnabled: boolean;
  isPremium: boolean;
  terminalAllowed: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const AuthPlanContext = createContext<AuthPlanSnapshot | null>(null);

function normalizePlan(raw: string | null | undefined): "free" | "premium" {
  return String(raw || "free").trim().toLowerCase() === "premium" ? "premium" : "free";
}

interface AuthPlanProviderProps {
  children: React.ReactNode;
  sessionToken: string | null;
  gateEnabled: boolean;
}

export function AuthPlanProvider({ children, sessionToken, gateEnabled }: AuthPlanProviderProps) {
  const [status, setStatus] = useState<AuthPlanStatus>("idle");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = sessionToken?.trim() ?? "";
    if (!token) {
      setStatus("unauthenticated");
      setUserId(null);
      setEmail(null);
      setPlan("free");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const me = await fetchMeDto({ accessToken: token });
      setStatus("ready");
      setUserId(me.user_id);
      setEmail(me.email ?? null);
      setPlan(normalizePlan(me.plan));
      setError(null);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setStatus("unauthenticated");
        setUserId(null);
        setEmail(null);
        setPlan("free");
        setError(null);
        return;
      }

      setStatus("error");
      setUserId(null);
      setEmail(null);
      setPlan("free");
      setError(err instanceof Error ? err.message : "Unable to load membership plan");
    }
  }, [sessionToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthPlanSnapshot>(() => {
    const isPremium = plan === "premium";
    return {
      status,
      userId,
      email,
      plan,
      gateEnabled,
      isPremium,
      terminalAllowed: !gateEnabled || isPremium,
      error,
      refresh
    };
  }, [email, error, gateEnabled, plan, refresh, status, userId]);

  return <AuthPlanContext.Provider value={value}>{children}</AuthPlanContext.Provider>;
}

export function useAuthPlan(): AuthPlanSnapshot {
  const context = useContext(AuthPlanContext);
  if (!context) {
    throw new Error("useAuthPlan must be used within AuthPlanProvider");
  }
  return context;
}

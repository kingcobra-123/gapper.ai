"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/useUIStore";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const scanlineEnabled = useUIStore((state) => state.scanlineEnabled);
  const themeVariant = useUIStore((state) => state.themeVariant);

  useEffect(() => {
    document.body.classList.toggle("scanline-enabled", scanlineEnabled);
  }, [scanlineEnabled]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeVariant;
  }, [themeVariant]);

  return <>{children}</>;
}

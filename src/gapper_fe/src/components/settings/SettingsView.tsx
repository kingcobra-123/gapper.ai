"use client";

import Link from "next/link";
import { GapperLogo } from "@/components/branding/GapperLogo";
import { useUIStore } from "@/stores/useUIStore";

export function SettingsView() {
  const scanlineEnabled = useUIStore((state) => state.scanlineEnabled);
  const setScanlineEnabled = useUIStore((state) => state.setScanlineEnabled);
  const themeVariant = useUIStore((state) => state.themeVariant);
  const setThemeVariant = useUIStore((state) => state.setThemeVariant);
  const tradingMode = useUIStore((state) => state.tradingMode);
  const setTradingMode = useUIStore((state) => state.setTradingMode);
  const riskProfile = useUIStore((state) => state.riskProfile);
  const setRiskProfile = useUIStore((state) => state.setRiskProfile);
  const bentoLayoutPreset = useUIStore((state) => state.bentoLayoutPreset);
  const setBentoLayoutPreset = useUIStore((state) => state.setBentoLayoutPreset);

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="terminal-shell mb-4 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <GapperLogo markClassName="h-7 w-7" showWordmark={false} />
          <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-sm text-muted">Theme, UX overlays, and risk defaults.</p>
          </div>
        </div>
        <Link href="/terminal" className="rounded-md border border-border/80 bg-panel-soft/45 px-3 py-2 text-sm">
          Back to Terminal
        </Link>
      </header>

      <section className="glass-panel space-y-5 p-4">
        <div>
          <p className="section-title">Theme</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setThemeVariant("cinematic")}
              className={`rounded-md border px-3 py-2 text-sm ${
                themeVariant === "cinematic" ? "border-ai/70 bg-ai/10" : "border-border/80 bg-panel-soft/40"
              }`}
            >
              Cinematic
            </button>
            <button
              type="button"
              onClick={() => setThemeVariant("terminal")}
              className={`rounded-md border px-3 py-2 text-sm ${
                themeVariant === "terminal" ? "border-ai/70 bg-ai/10" : "border-border/80 bg-panel-soft/40"
              }`}
            >
              Terminal
            </button>
          </div>
        </div>

        <div>
          <p className="section-title">Overlay</p>
          <button
            type="button"
            onClick={() => setScanlineEnabled(!scanlineEnabled)}
            className={`mt-2 rounded-md border px-3 py-2 text-sm ${
              scanlineEnabled ? "border-ai/70 bg-ai/10" : "border-border/80 bg-panel-soft/40"
            }`}
          >
            Scanline {scanlineEnabled ? "On" : "Off"}
          </button>
        </div>

        <div>
          <p className="section-title">Workflow Defaults</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted">Mode</span>
              <select
                className="w-full rounded-md border border-border/80 bg-panel-soft/50 px-2 py-2"
                value={tradingMode}
                onChange={(event) => setTradingMode(event.target.value as "paper" | "live")}
              >
                <option value="paper">paper</option>
                <option value="live">live</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted">Risk</span>
              <select
                className="w-full rounded-md border border-border/80 bg-panel-soft/50 px-2 py-2"
                value={riskProfile}
                onChange={(event) => setRiskProfile(event.target.value as "low" | "med" | "high")}
              >
                <option value="low">low</option>
                <option value="med">med</option>
                <option value="high">high</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted">Bento Layout</span>
              <select
                className="w-full rounded-md border border-border/80 bg-panel-soft/50 px-2 py-2"
                value={bentoLayoutPreset}
                onChange={(event) =>
                  setBentoLayoutPreset(event.target.value as "layout_a" | "layout_b")
                }
              >
                <option value="layout_a">Layout A</option>
                <option value="layout_b">Layout B</option>
              </select>
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}

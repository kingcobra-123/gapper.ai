import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        panel: "hsl(var(--panel))",
        "panel-strong": "hsl(var(--panel-strong))",
        "panel-soft": "hsl(var(--panel-soft))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-strong": "hsl(var(--muted-strong))",
        bullish: "hsl(var(--bullish))",
        bearish: "hsl(var(--bearish))",
        ai: "hsl(var(--ai))"
      }
    }
  },
  plugins: []
};

export default config;

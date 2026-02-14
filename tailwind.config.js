/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "!./src/**/node_modules/**",
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
        ai: "hsl(var(--ai))",
      },
      animation: {
        'gradient-x': 'gradient-x 4s linear infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
      },
    },
  },
  plugins: [],
}

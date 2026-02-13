# Gapper.ai - Next-Gen Momentum Intelligence Platform

A cutting-edge React-based landing page and intelligence dashboard for **Gapper.ai**, a real-time trading intelligence platform that uses multi-agent AI systems to analyze market data, news, SEC filings, and social signals to deliver actionable trading briefs.

## 🎯 Overview

Gapper.ai is designed for high-volume traders who need **sub-200ms latency** intelligence processing. The platform synthesizes market data from multiple sources (news wires, SEC filings, PR releases, social media) and delivers concise "brief cards" that answer one critical question: **Tradeable or Trap?**

### Core Philosophy
> **"The Move Happens Before You Find The Reason."**

The platform eliminates information overload by condensing entire market narratives into high-conviction intelligence streams, helping traders avoid being liquidity and make informed decisions faster than the competition.

## ✨ Key Features

### 🚀 Multi-Agent AI System
- **Specialized Agents**: Multiple AI agents work in concert to cross-reference and validate signals
  - **News Agent**: Scrapes PR wires and headlines in real-time
  - **SEC Agent**: Parses EDGAR 8-K filings instantly
  - **Risk Agent**: Checks dilution risk via S-3 and ATM shelf registrations
- **Hallucination-Proofing**: Cross-referencing between agents ensures signal accuracy

### 🛡️ The Dilution Shield
- **Toxic Financing Detection**: Instantly parses active S-3 and ATM shelf registrations
- **Pre-Trap Detection**: Identifies dilution risks before they impact price action
- **Real-Time Risk Flags**: Alerts traders to unfavorable liquidity conditions

### ⚡ Ultra-Low Latency
- **Sub-200ms Processing**: From catalyst detection to full brief generation
- **Real-Time Pipeline**: Faster than human blink response time
- **Live Terminal Interface**: Animated terminal showing real-time processing status

### 📊 Intelligence Brief Cards
Each signal is synthesized into an actionable brief card featuring:
- **State Classification**: TRADEABLE, CAUTION, or SKIP
- **Catalyst Analysis**: Confirmed catalyst with confidence levels
- **Price Action Metrics**: Move percentage, last price, relative volume, float status
- **Risk Flags**: Active offering detection, liquidity warnings, halt risks
- **Key Levels**: PM High, VWAP, PDC, Support levels
- **Execution Plan**: Trigger conditions, invalidation criteria, and trade notes

### 🎨 Premium UI/UX
- **Animated Pipeline Visualization**: Real-time canvas-based telemetry showing data flow
- **3D Card Showcase**: Smooth flip animations with glitch effects
- **Particle Network Background**: Dynamic particle system with connection visualization
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile
- **Dark Theme**: Professional slate-950 base with cyan/emerald accents

## 🛠️ Technology Stack

### Core Framework
- **React 18.2.0** - Modern UI library with hooks and concurrent features
- **Vite 5.0.8** - Lightning-fast build tool and dev server
- **JavaScript (ES6+)** - Modern JavaScript with modules

### Styling & UI
- **Tailwind CSS 3.3.6** - Utility-first CSS framework
- **PostCSS 8.4.32** - CSS processing and transformation
- **Autoprefixer 10.4.16** - Automatic vendor prefixing
- **Custom Animations** - Canvas-based animations and Framer Motion transitions

### Animation Libraries
- **Framer Motion 12.24.0** - Production-ready motion library for React
- **Canvas API** - Custom particle systems and pipeline visualizations
- **CSS Animations** - Keyframe-based effects and transitions

### Icons & Assets
- **Lucide React 0.294.0** - Beautiful, consistent icon library
- **Custom SVG Graphics** - Gapper.ai logo with animated effects

### Development Tools
- **@vitejs/plugin-react 4.2.1** - Vite plugin for React
- **TypeScript Definitions** - Type safety for React and React DOM

## 📁 Project Structure

```
tradinglab/
├── public/
│   └── logos.html              # Logo showcase page
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styles and Tailwind imports
│   ├── PipelineTelemetry.jsx  # Canvas-based pipeline visualization
│   ├── BriefCardShowcaseUltra.jsx  # 3D card flip showcase component
│   └── logos.html              # Alternative logo showcase
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher (v18+ recommended)
- **npm** or **yarn** package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kingcobra-123/gapper.ai.git
   cd gapper.ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`

### Development Scripts

```bash
# Start development server with hot module replacement
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Auth + Web Terminal Workflow

- Landing page stays as the main homepage experience.
- Navbar shows `Sign in` / `Sign up` for logged-out users.
- Navbar shows `Web Terminal` + `Sign out` for logged-in users.
- `Web Terminal` is hosted directly inside the main Vite app by rendering `gapper_fe` terminal UI components.
- Direct navigation to `/terminal` is supported for the embedded terminal workspace.
- Tier model is `free | basic | premium` (default user tier is `free`).
- Terminal gating is controlled by `VITE_WEB_TERMINAL_MIN_TIER` with values `free | basic | premium`.
- Default gate value is `free` (all users can open terminal until you raise the threshold).
- If a logged-in user is below the configured tier threshold, they see the beta subscription pending modal.

### Terminal Tier Toggle

```env
# free | basic | premium
# default: free
VITE_WEB_TERMINAL_MIN_TIER=free
```

### Terminal API Environment (optional)

These map the embedded terminal's API client config in Vite:

```env
VITE_GAPPER_API_BASE_URL=http://localhost:8000
VITE_GAPPER_API_KEY=
VITE_GAPPER_API_TIMEOUT_MS=8000
```

## 🎨 Key Components

### App.jsx
The main application component featuring:
- **Landing Preserved**: Existing landing-page sections remain intact
- **Auth Navbar Controls**: Sign in/up for guests, Web Terminal + Sign out for authenticated users
- **Tier Gate**: Uses `public.profiles.tier` against `VITE_WEB_TERMINAL_MIN_TIER`
- **Path-Aware Terminal View**: Uses embedded `gapper_fe` shell components directly at `/terminal` (no separate terminal server)

### PipelineTelemetry.jsx
Advanced canvas component that visualizes the data processing pipeline:
- **Source Cubes**: 3D isometric cubes representing data sources (News, SEC, Charts, Risk)
- **Inference Stack**: Multi-layer diamond visualization showing AI processing
- **Bezier Pipes**: Animated data flow paths with particle effects
- **Brief Card Generation**: Progressive card assembly animation
- **State Machine**: 7-state animation sequence with seamless transitions

### BriefCardShowcaseUltra.jsx
Premium card showcase with sophisticated animations:
- **Step-by-Step Assembly**: Progressive reveal of card elements
- **3D Flip Transitions**: Smooth card rotation using Framer Motion
- **Glitch Effects**: Intentional visual glitches for premium feel
- **Pulse Stabilization**: Visual feedback when card is complete
- **Multiple Card States**: TRADEABLE (green), CAUTION (yellow), SKIP (red)

### TerminalAnimation.jsx
Real-time terminal interface simulation:
- **Live Processing Logs**: Simulated market scanning and agent activation
- **Ticker Rotation**: Cycles through sample tickers ($LUNR, $SPCE, $AI, $MARA, $PLTR)
- **Progress Bar**: Visual feedback of processing stages
- **Auto-Scrolling**: Terminal automatically scrolls to show latest logs

## 🎯 Customization

### Terminal Animation
Modify the terminal behavior in `App.jsx`:
```javascript
const sampleTickers = [
  { t: "$TICKER", cat: "Category Description" },
  // Add more tickers
];

const processingSteps = [
  "CUSTOM_STEP_1...",
  "CUSTOM_STEP_2...",
  // Add more steps
];
```

### Pipeline Visualization
Adjust pipeline timing and colors in `PipelineTelemetry.jsx`:
```javascript
const palette = {
  cyan: "34, 211, 238",
  emerald: "52, 211, 153",
  // Modify colors
};
```

### Brief Cards
Customize card data and timing in `BriefCardShowcaseUltra.jsx`:
```javascript
const STEP_MS = 520;          // Build speed
const COMPLETE_HOLD_MS = 1400; // Display duration
const FLIP_MS = 1150;         // Flip animation speed
```

### Styling
Modify `tailwind.config.js` to customize:
- Color palette
- Animation timings
- Spacing and typography
- Custom keyframes

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)
- **Port**: 5173 (configurable)
- **HMR**: Hot Module Replacement enabled
- **Host**: Listens on all network interfaces

### Tailwind Configuration (`tailwind.config.js`)
- **Content Paths**: Scans all JSX/TSX files
- **Custom Animations**: Gradient-x animation defined
- **Extended Theme**: Custom keyframes and animations

## 🐛 Troubleshooting

### Hot Module Replacement (HMR) Issues

If hot reloading isn't working:

1. **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. **Check Dev Server**: Ensure `npm run dev` is running
3. **External Browser**: Try opening `http://localhost:5173` in Chrome/Firefox instead of embedded browser
4. **Restart Dev Server**: Stop (`Ctrl+C`) and restart `npm run dev`
5. **Clear Browser Cache**: Use incognito mode or clear cache

### Canvas Rendering Issues

If pipeline visualization doesn't appear:
- Check browser console for errors
- Ensure canvas element has proper dimensions
- Verify device pixel ratio support

### Build Errors

If production build fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📦 Build for Production

### Create Production Build
```bash
npm run build
```

This creates an optimized build in the `dist/` directory with:
- Minified JavaScript
- Optimized CSS
- Asset optimization
- Tree-shaking of unused code

### Preview Production Build
```bash
npm run preview
```

### Deploy

The `dist/` folder can be deployed to:
- **Vercel**: Connect GitHub repo for automatic deployments
- **Netlify**: Drag and drop `dist/` folder
- **GitHub Pages**: Configure to serve from `dist/` directory
- **Any Static Host**: Upload `dist/` contents

## 🎭 Design Philosophy

### Visual Language
- **Dark Base**: Slate-950 (#030712) for professional, terminal-like aesthetic
- **Accent Colors**: Cyan (#22D3EE) and Emerald (#34D399) for highlights
- **Glass Morphism**: Backdrop blur effects with subtle borders
- **3D Elements**: Isometric cubes, depth shadows, perspective transforms

### Animation Principles
- **Smooth Easing**: Custom cubic-bezier curves for premium feel
- **Staggered Reveals**: Sequential element appearance for readability
- **Micro-Interactions**: Hover states, pulse effects, glitch moments
- **Performance**: Canvas animations use requestAnimationFrame for 60fps

### Typography
- **Headlines**: Bold, tracking-tight for impact
- **Body**: Relaxed leading for readability
- **Monospace**: Terminal logs and technical data use font-mono

## 🔐 Security Considerations

- No sensitive data stored in client-side code
- API endpoints should be secured with authentication
- Environment variables for API keys (not included in repo)
- CORS policies should be configured for production APIs

## 📝 License

This project is private and proprietary. All rights reserved.

## 🤝 Contributing

This is a private project. For access or collaboration inquiries, please contact the repository owner.

## 📧 Contact & Early Access

- **Website**: [Gapper.ai](https://github.com/kingcobra-123/gapper.ai)
- **Early Access**: Join the waitlist via the landing page
- **Repository**: https://github.com/kingcobra-123/gapper.ai

---

**Built for the next generation of traders.** 🚀

© 2026 Gapper.ai. All rights reserved.

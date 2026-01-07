# Neuraflow - Next-Gen Momentum Intelligence

A modern React landing page for Neuraflow, featuring an animated terminal interface that demonstrates real-time market intelligence processing.

## Features

- 🚀 Built with React 18 and Vite for fast development
- 🎨 Styled with Tailwind CSS for a modern, responsive design
- ⚡ Animated terminal component with real-time processing simulation
- 📱 Fully responsive design for all screen sizes
- 🎭 Smooth animations and transitions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Troubleshooting Hot Module Replacement (HMR)

If hot reloading isn't working in Cursor IDE's embedded browser:

1. **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux) to do a hard refresh
2. **Check Dev Server**: Make sure `npm run dev` is running in the terminal
3. **Open in External Browser**: Try opening `http://localhost:5173` in Chrome/Firefox/Safari instead of the embedded browser
4. **Restart Dev Server**: Stop the server (`Ctrl+C`) and run `npm run dev` again
5. **Clear Browser Cache**: The embedded browser might be caching - try clearing cache or using incognito mode

### Build for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
tradinglab/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles and Tailwind imports
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── postcss.config.js    # PostCSS configuration
```

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Customization

The terminal animation can be customized by modifying:
- `sampleTickers` array in `TerminalAnimation` component
- `processingSteps` array for different processing messages
- Animation timing in the `useEffect` interval

## License

This project is private and proprietary.

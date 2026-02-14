import React, { Suspense } from "react";
import { Activity } from "lucide-react";

const GapperTerminalShell = React.lazy(() =>
  import("../gapper_fe/src/components/shell/AppShell").then((module) => ({
    default: module.AppShell,
  }))
);

function TerminalLoadingFallback() {
  return (
    <div className="gapper-terminal-theme min-h-screen flex items-center justify-center px-6">
      <div className="inline-flex items-center gap-2 text-sm text-slate-300">
        <Activity className="h-4 w-4 animate-spin" />
        Loading terminal workspace...
      </div>
    </div>
  );
}

class TerminalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[TerminalWorkspacePage] render crash:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="gapper-terminal-theme min-h-screen flex items-center justify-center px-6">
          <div className="max-w-xl w-full rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm">
            <h2 className="text-lg font-bold text-red-400 mb-2">
              Terminal failed to load
            </h2>
            <pre className="whitespace-pre-wrap break-words text-slate-300 bg-black/30 rounded-lg p-4 overflow-auto max-h-64">
              {this.state.error?.message || String(this.state.error)}
              {"\n\n"}
              {this.state.error?.stack || ""}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function TerminalWorkspacePage() {
  return (
    <div className="gapper-terminal-theme relative min-h-screen">
      <TerminalErrorBoundary>
        <Suspense fallback={<TerminalLoadingFallback />}>
          <GapperTerminalShell />
        </Suspense>
      </TerminalErrorBoundary>
    </div>
  );
}

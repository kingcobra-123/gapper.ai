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

export default function TerminalWorkspacePage() {
  return (
    <div className="gapper-terminal-theme relative min-h-screen">
      <Suspense fallback={<TerminalLoadingFallback />}>
        <GapperTerminalShell />
      </Suspense>
    </div>
  );
}

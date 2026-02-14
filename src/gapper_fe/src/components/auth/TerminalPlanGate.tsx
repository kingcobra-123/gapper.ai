import { Activity, Lock } from "lucide-react";
import { useAuthPlan } from "@/auth/AuthPlanContext";

interface TerminalPlanGateProps {
  authenticated: boolean;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

function ShellContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="gapper-terminal-theme min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-xl border border-white/10 bg-slate-950/70 p-6 text-slate-200">
        {children}
      </div>
    </div>
  );
}

export function TerminalPlanGate({
  authenticated,
  onOpenSignIn,
  onSignOut,
  children
}: TerminalPlanGateProps) {
  const authPlan = useAuthPlan();

  if (!authenticated || authPlan.status === "unauthenticated") {
    return (
      <ShellContainer>
        <h2 className="text-lg font-semibold text-white">Sign in required</h2>
        <p className="mt-2 text-sm text-slate-300">Sign in to continue to the web terminal.</p>
        <button
          type="button"
          onClick={onOpenSignIn}
          className="mt-5 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
        >
          Open sign in
        </button>
      </ShellContainer>
    );
  }

  if (authPlan.status === "loading" || authPlan.status === "idle") {
    return (
      <ShellContainer>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Activity className="h-4 w-4 animate-spin text-cyan-400" />
          <span data-testid="terminal-gate-loading">Checking membership access...</span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-slate-800">
          <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-cyan-500/70" />
        </div>
      </ShellContainer>
    );
  }

  if (authPlan.status === "error") {
    return (
      <ShellContainer>
        <h2 className="text-lg font-semibold text-white">Unable to verify access</h2>
        <p className="mt-2 text-sm text-slate-300">{authPlan.error ?? "Membership check failed."}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              void authPlan.refresh();
            }}
            className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border border-slate-500/40 bg-slate-700/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/35"
          >
            Sign out
          </button>
        </div>
      </ShellContainer>
    );
  }

  if (authPlan.gateEnabled && !authPlan.terminalAllowed) {
    return (
      <ShellContainer>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
          <Lock className="h-3.5 w-3.5" />
          Premium required
        </div>
        <h2 className="mt-3 text-xl font-semibold text-white">Premium required</h2>
        <p className="mt-2 text-sm text-slate-300">
          Terminal access is currently available only to premium users.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="/#access"
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            Join waitlist
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border border-slate-500/40 bg-slate-700/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/35"
          >
            Sign out
          </button>
        </div>
      </ShellContainer>
    );
  }

  return <>{children}</>;
}

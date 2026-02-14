import React, { useEffect, useState } from "react";
import { Activity, Lock, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import BetaPendingModal from "./BetaPendingModal";

const DEFAULT_PLACEHOLDER_CLASS =
  "min-h-[420px] bg-slate-950 border border-slate-800 rounded-xl p-6 flex items-center justify-center";

export default function BetaGate({
  children,
  onRequestSignIn,
  placeholderClassName = DEFAULT_PLACEHOLDER_CLASS,
}) {
  const {
    loading,
    profileLoading,
    user,
    betaAccess,
    profileStatus,
    profileError,
    refreshProfile,
  } = useAuth();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user?.id && !betaAccess) {
      setPendingOpen(true);
      return;
    }

    setPendingOpen(false);
  }, [user?.id, betaAccess]);

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      await refreshProfile({
        reason: "beta-gate-manual-check",
        showLoading: true,
      });
    } finally {
      setChecking(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className={placeholderClassName} aria-busy="true">
        <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
          <Activity className="w-4 h-4 animate-spin" />
          <span>Checking terminal access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={placeholderClassName}>
        <div className="max-w-lg mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-cyan-300 text-xs px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Lock className="w-3 h-3" />
            <span>AUTH REQUIRED</span>
          </div>
          <p className="text-white font-semibold">Sign in to access Web Terminal.</p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in</span>
          </button>
        </div>
      </div>
    );
  }

  if (!betaAccess) {
    return (
      <>
        <div className={placeholderClassName}>
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-amber-300 text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-3 h-3" />
              <span>BETA APPROVAL REQUIRED</span>
            </div>
            <p className="text-white font-semibold">
              Your account is signed in but beta access is still pending.
            </p>
            <p className="text-slate-400 text-sm">
              Open the beta panel to copy your signup email and request
              activation.
            </p>
            <button
              type="button"
              onClick={() => setPendingOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-100 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Lock className="w-4 h-4" />
              <span>View beta status</span>
            </button>
          </div>
        </div>

        <BetaPendingModal
          isOpen={pendingOpen}
          onClose={() => setPendingOpen(false)}
          email={user?.email ?? ""}
          onCheckAgain={handleCheckAgain}
          checking={checking || profileLoading}
          profileStatus={profileStatus}
          profileError={profileError}
        />
      </>
    );
  }

  return <>{children}</>;
}

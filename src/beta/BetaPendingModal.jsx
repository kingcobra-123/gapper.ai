import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import Modal from "../components/Modal";

export default function BetaPendingModal({
  isOpen,
  onClose,
  email,
  onCheckAgain,
  checking = false,
  profileStatus = "idle",
  profileError = null,
  variant = "default",
}) {
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCopyState("idle");
  }, [isOpen, email]);

  const errorMessage = useMemo(() => {
    if (profileStatus !== "error") {
      return null;
    }

    return (
      profileError?.message ||
      "Access check failed - try again or contact support."
    );
  }, [profileError, profileStatus]);

  const handleCopyEmail = async () => {
    const normalizedEmail = email?.trim();
    if (!normalizedEmail || !navigator?.clipboard?.writeText) {
      setCopyState("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedEmail);
      setCopyState("copied");
    } catch (error) {
      setCopyState("failed");
    }
  };

  const handleCheckAgain = async () => {
    await onCheckAgain?.();
  };

  const subscribedVariant = variant === "subscribed";
  const title = subscribedVariant
    ? "Beta Subscription Confirmed"
    : "Beta Access Pending";
  const subtitle = subscribedVariant
    ? "You've successfully subscribed to beta. We will email you further details."
    : "Access is controlled by profile approval.";
  const headline = subscribedVariant
    ? "Subscription received."
    : "Your account is created.";
  const description = subscribedVariant
    ? "Your request has been recorded and is waiting for approval."
    : "Terminal access is in beta and requires approval.";
  const details = subscribedVariant
    ? "We will contact you by email once your account is activated."
    : "Send your signup email to Satish for activation.";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-[#0a111f] border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-slate-100 text-sm font-semibold">{headline}</p>
            <p className="text-slate-300 text-sm">{description}</p>
            <p className="text-slate-300 text-sm">{details}</p>
          </div>

          {email ? (
            <div className="text-xs text-slate-400 border border-slate-800 rounded-lg px-3 py-2">
              Signup email: <span className="text-slate-200">{email}</span>
            </div>
          ) : null}

          {profileStatus === "missing" ? (
            <p className="text-amber-300 text-xs">
              Profile not ready yet. This can happen right after signup.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-red-300 text-xs">{errorMessage}</p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-100 px-4 py-3 rounded-lg text-sm font-semibold transition"
            >
              {copyState === "copied" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copyState === "copied" ? "Email copied" : "Copy my email"}
            </button>

            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={checking}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {checking ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Check again</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}

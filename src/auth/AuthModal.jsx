import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Eye, EyeOff } from "lucide-react";
import Modal from "../components/Modal";
import { useAuth } from "./AuthProvider";
import { toAuthErrorMessage } from "./errorMap";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const OAUTH_PROVIDERS = [
  {
    id: "google",
    provider: "google",
    label: "Google",
  },
  {
    id: "facebook",
    provider: "facebook",
    label: "Facebook",
  },
  {
    id: "x",
    provider: "twitter",
    label: "X",
  },
];

export default function AuthModal({
  mode,
  isOpen,
  onClose,
  onSwitchMode,
  onSignupCompleted,
}) {
  const {
    signInWithPassword,
    signUp,
    signInWithOAuth,
    resendConfirmation,
    resetPassword,
    supabaseConfigured,
  } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [busyAction, setBusyAction] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setPendingConfirmationEmail("");
    setBusyAction(null);
  }, [isOpen, mode]);

  const trimmedEmail = email.trim();
  const trimmedUsername = username.trim();
  const emailIsValid = isValidEmail(trimmedEmail);
  const passwordIsValid = password.length >= 6;
  const usernameIsValid = mode === "signin" ? true : trimmedUsername.length >= 2;

  const title = mode === "signin" ? "Sign in" : "Create account";
  const submitLabel = mode === "signin" ? "Sign in" : "Create account";

  const submitDisabled =
    !supabaseConfigured ||
    !emailIsValid ||
    !passwordIsValid ||
    !usernameIsValid ||
    busyAction !== null;

  const canResetPassword = useMemo(
    () => supabaseConfigured && emailIsValid && busyAction === null,
    [supabaseConfigured, emailIsValid, busyAction]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setBusyAction("submit");

    try {
      if (mode === "signin") {
        const { data, error } = await signInWithPassword(trimmedEmail, password);

        if (error) {
          setErrorMessage(toAuthErrorMessage(error));
          return;
        }

        if (data?.session) {
          onClose?.();
        }

        return;
      }

      const { data, error } = await signUp(trimmedEmail, password, trimmedUsername);

      if (error) {
        setErrorMessage(toAuthErrorMessage(error));
        return;
      }

      onSignupCompleted?.({
        email: trimmedEmail,
        username: trimmedUsername,
        requiresEmailConfirmation: !data?.session && Boolean(data?.user),
      });

      if (data?.session) {
        onClose?.();
        return;
      }

      if (data?.user) {
        setPendingConfirmationEmail(trimmedEmail);
        setStatusMessage("Check your email to confirm your account.");
        return;
      }

      setStatusMessage("Account created.");
      onClose?.();
    } finally {
      setBusyAction(null);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    if (busyAction !== null || !supabaseConfigured) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setBusyAction(`oauth:${provider.id}`);

    try {
      const { error } = await signInWithOAuth(provider.provider);

      if (error) {
        setErrorMessage(toAuthErrorMessage(error));
        return;
      }

      setStatusMessage(`Redirecting to ${provider.label}...`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || busyAction !== null) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setBusyAction("resend");

    try {
      const { error } = await resendConfirmation(pendingConfirmationEmail);

      if (error) {
        setErrorMessage(toAuthErrorMessage(error));
        return;
      }

      setStatusMessage("Confirmation email resent.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleResetPassword = async () => {
    if (!canResetPassword) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setBusyAction("reset");

    try {
      const { error } = await resetPassword(trimmedEmail);

      if (error) {
        setErrorMessage(toAuthErrorMessage(error));
        return;
      }

      setStatusMessage("Password reset email sent.");
    } finally {
      setBusyAction(null);
    }
  };

  const isSubmitting = busyAction === "submit";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-[#0b1120] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/70">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your Gapper.ai account with email/password or social login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            {OAUTH_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleOAuthSignIn(provider)}
                disabled={!supabaseConfigured || busyAction !== null}
                className="w-full bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-100 px-4 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-500 uppercase tracking-wide">
              Or with email
            </span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {mode === "signup" ? (
            <div>
              <label
                className="block text-xs text-slate-400 mb-2"
                htmlFor="auth-username"
              >
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your display name"
                disabled={busyAction !== null}
                minLength={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-60"
                required
              />
            </div>
          ) : null}

          <div>
            <label className="block text-xs text-slate-400 mb-2" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={busyAction !== null}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label
              className="block text-xs text-slate-400 mb-2"
              htmlFor="auth-password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                disabled={busyAction !== null}
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 pr-11 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={busyAction !== null}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition disabled:opacity-60"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "signin" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={!canResetPassword}
                className="text-xs text-cyan-300 hover:text-cyan-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forgot password?
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-6 py-3 rounded-lg text-sm font-bold transition shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              submitLabel
            )}
          </button>

          {!supabaseConfigured ? (
            <p className="text-amber-300 text-xs">
              Supabase env vars are missing. Set VITE_SUPABASE_URL and
              VITE_SUPABASE_ANON_KEY.
            </p>
          ) : null}

          <div aria-live="polite" className="min-h-[20px] text-sm">
            {errorMessage ? <p className="text-red-400">{errorMessage}</p> : null}
            {statusMessage ? <p className="text-emerald-300">{statusMessage}</p> : null}
          </div>

          {mode === "signup" && pendingConfirmationEmail ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200 space-y-2">
              <p>Check your email to confirm your account.</p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={busyAction !== null}
                className="text-emerald-100 underline underline-offset-2 disabled:opacity-60"
              >
                Resend confirmation
              </button>
            </div>
          ) : null}

          <div className="text-sm text-slate-400 text-center pt-1">
            {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-cyan-300 hover:text-cyan-200 transition"
              onClick={() => onSwitchMode?.(mode === "signin" ? "signup" : "signin")}
              disabled={busyAction !== null}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </form>
      </motion.div>
    </Modal>
  );
}

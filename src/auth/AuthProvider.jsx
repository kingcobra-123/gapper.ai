import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import { verifyAccessTokenWithBackend } from "../lib/authVerifyApi";
import { fetchMyProfileWithRetry } from "../data/profile";
import {
  setAccessTokenProvider,
  setUnauthorizedHandler,
} from "../gapper_fe/src/auth/tokenProvider";

const AuthContext = createContext(null);

const PROFILE_FETCH_ATTEMPTS = 3;
const PROFILE_FETCH_DELAY_MS = 500;
const PROFILE_FETCH_JITTER_MS = 100;

const normalizeEmail = (email) => email.trim().toLowerCase();

const profileUpsertFallbackEnabled =
  import.meta.env.VITE_ALLOW_PROFILE_UPSERT_FALLBACK === "true";

const logAuthEvent = (event, nextSession) => {
  console.log(
    "[auth]",
    new Date().toISOString(),
    "event=",
    event,
    "user=",
    nextSession?.user?.email ?? null
  );
};

function notConfiguredError() {
  return { data: null, error: new Error("Supabase is not configured.") };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState("idle");
  const [profileError, setProfileError] = useState(null);

  const [backendVerification, setBackendVerification] = useState("idle");
  const [verifiedUser, setVerifiedUser] = useState(null);

  const betaAccess = Boolean(profile?.beta_access);

  useEffect(() => {
    setAccessTokenProvider(async () => {
      if (!supabaseConfigured || !supabase) {
        return null;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return null;
      }
      return data?.session?.access_token ?? null;
    });

    setUnauthorizedHandler(async () => {
      if (!supabaseConfigured || !supabase) {
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        return;
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileStatus("idle");
      setProfileError(null);
      setProfileLoading(false);
    });

    return () => {
      setAccessTokenProvider(null);
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSubscription;

    const loadSession = async () => {
      if (!supabaseConfigured || !supabase) {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setProfileStatus("idle");
        setProfileError(null);
        logAuthEvent("SUPABASE_NOT_CONFIGURED", null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("[auth] getSession error", error);
      }

      const nextSession = data?.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      logAuthEvent("INITIAL_SESSION", nextSession);
      setLoading(false);
    };

    loadSession();

    if (supabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!isMounted) {
          return;
        }

        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? null);

        if (!nextSession?.user) {
          setProfile(null);
          setProfileLoading(false);
          setProfileStatus("idle");
          setProfileError(null);
        }

        logAuthEvent(event, nextSession ?? null);
      });

      authSubscription = data?.subscription;
    }

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      console.log(
        "[auth] authenticated user:",
        `${user.id} (${user.email ?? "no-email"})`
      );
      return;
    }

    console.log("[auth] not authenticated");
  }, [loading, user]);

  const refreshProfile = useCallback(
    async (options = {}) => {
      const targetUser = options.user ?? user;
      const showLoading = options.showLoading ?? true;
      const reason = options.reason ?? "manual";

      if (!supabaseConfigured || !supabase || !targetUser?.id) {
        setProfile(null);
        setProfileLoading(false);
        setProfileStatus("idle");
        setProfileError(null);

        return {
          status: "idle",
          profile: null,
          error: null,
          attemptsUsed: 0,
        };
      }

      if (showLoading) {
        setProfileLoading(true);
      }
      setProfileStatus("loading");
      setProfileError(null);

      const result = await fetchMyProfileWithRetry(supabase, targetUser, {
        attempts: PROFILE_FETCH_ATTEMPTS,
        delayMs: PROFILE_FETCH_DELAY_MS,
        jitterMs: PROFILE_FETCH_JITTER_MS,
        allowUpsertFallback: profileUpsertFallbackEnabled,
      });

      const targetUserId = targetUser.id;
      if (user?.id && user.id !== targetUserId) {
        if (showLoading) {
          setProfileLoading(false);
        }

        return result;
      }

      if (result.status === "ok") {
        setProfile(result.profile);
        setProfileStatus("ready");
        setProfileError(null);
      } else if (result.status === "missing") {
        setProfile(null);
        setProfileStatus("missing");
        setProfileError(null);
      } else {
        setProfile(null);
        setProfileStatus("error");
        setProfileError(result.error ?? new Error("Profile resolution failed."));

        console.error(
          "[auth] profile resolution failed",
          `reason=${reason}`,
          result.error
        );
      }

      if (showLoading) {
        setProfileLoading(false);
      }

      return result;
    },
    [user, supabaseConfigured]
  );

  useEffect(() => {
    let isCancelled = false;

    const resolveProfile = async () => {
      if (loading) {
        return;
      }

      if (!user?.id) {
        setProfile(null);
        setProfileLoading(false);
        setProfileStatus("idle");
        setProfileError(null);
        return;
      }

      setProfileLoading(true);
      const result = await refreshProfile({
        reason: "session-refresh",
        showLoading: false,
        user,
      });

      if (!isCancelled && result.status === "missing") {
        console.warn(
          "[auth] profile row missing after retry window",
          `user_id=${user.id}`
        );
      }

      if (!isCancelled) {
        setProfileLoading(false);
      }
    };

    resolveProfile();

    return () => {
      isCancelled = true;
    };
  }, [loading, user?.id, refreshProfile]);

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user?.id) {
      return;
    }

    const channel = supabase
      .channel(`profiles:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshProfile({
            reason: "realtime",
            showLoading: false,
            user,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseConfigured, user?.id, refreshProfile]);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      setBackendVerification("idle");
      setVerifiedUser(null);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const verifyToken = async () => {
      setBackendVerification("verifying");

      const { data, error } = await verifyAccessTokenWithBackend(accessToken, {
        signal: controller.signal,
      });

      if (isCancelled) {
        return;
      }

      if (data === null && error === null) {
        setBackendVerification("idle");
        setVerifiedUser(null);
        return;
      }

      if (error) {
        if (error.name !== "AbortError") {
          console.error("[auth] backend verification failed", error);
          setBackendVerification("failed");
          setVerifiedUser(null);
        }
        return;
      }

      setBackendVerification("verified");
      setVerifiedUser(data?.user ?? null);
      console.log(
        "[auth] backend verification succeeded for",
        data?.user?.email ?? "unknown-email"
      );
    };

    verifyToken();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [session?.access_token]);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    return supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
  }, []);

  const signUp = useCallback(async (email, password, username) => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    const normalizedUsername = username?.trim();

    return supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: normalizedUsername
        ? {
            data: {
              username: normalizedUsername,
            },
          }
        : undefined,
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    return supabase.auth.signOut();
  }, []);

  const signInWithOAuth = useCallback(async (provider) => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    const normalizedProvider =
      typeof provider === "string" ? provider.trim().toLowerCase() : "";
    const supportedProviders = new Set(["google", "facebook", "twitter"]);

    if (!supportedProviders.has(normalizedProvider)) {
      return {
        data: null,
        error: new Error("Unsupported OAuth provider."),
      };
    }

    return supabase.auth.signInWithOAuth({
      provider: normalizedProvider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  }, []);

  const resendConfirmation = useCallback(async (email) => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    if (typeof supabase.auth.resend !== "function") {
      return {
        data: null,
        error: new Error("Resend confirmation is unavailable in this SDK."),
      };
    }

    return supabase.auth.resend({
      type: "signup",
      email: normalizeEmail(email),
    });
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!supabaseConfigured || !supabase) {
      return notConfiguredError();
    }

    return supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/`,
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      supabaseConfigured,
      signInWithPassword,
      signUp,
      signInWithOAuth,
      signOut,
      resendConfirmation,
      resetPassword,
      backendVerification,
      verifiedUser,
      profile,
      profileLoading,
      profileStatus,
      profileError,
      betaAccess,
      refreshProfile,
    }),
    [
      backendVerification,
      betaAccess,
      loading,
      profile,
      profileError,
      profileLoading,
      profileStatus,
      refreshProfile,
      resendConfirmation,
      resetPassword,
      session,
      signInWithPassword,
      signInWithOAuth,
      signOut,
      signUp,
      verifiedUser,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

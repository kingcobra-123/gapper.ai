const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_JITTER_MS = 100;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withJitter(delayMs, jitterMs) {
  if (!jitterMs) {
    return delayMs;
  }

  const offset = Math.floor(Math.random() * (jitterMs * 2 + 1)) - jitterMs;
  return Math.max(0, delayMs + offset);
}

async function selectProfile(supabase, userId) {
  return supabase
    .from("profiles")
    .select("id, email, beta_access, tier, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
}

async function upsertProfileFallback(supabase, user) {
  return supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
    },
    { onConflict: "id" }
  );
}

export async function fetchMyProfileWithRetry(supabase, user, opts = {}) {
  const attempts =
    Number.isInteger(opts.attempts) && opts.attempts > 0
      ? opts.attempts
      : DEFAULT_ATTEMPTS;
  const delayMs =
    Number.isInteger(opts.delayMs) && opts.delayMs >= 0
      ? opts.delayMs
      : DEFAULT_DELAY_MS;
  const jitterMs =
    Number.isInteger(opts.jitterMs) && opts.jitterMs >= 0
      ? opts.jitterMs
      : DEFAULT_JITTER_MS;
  const allowUpsertFallback = Boolean(opts.allowUpsertFallback);
  const userId = user?.id;

  if (!supabase || !userId) {
    return {
      status: "error",
      profile: null,
      error: new Error("Missing Supabase client or authenticated user."),
      attemptsUsed: 0,
    };
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await selectProfile(supabase, userId);

    if (error) {
      return {
        status: "error",
        profile: null,
        error,
        attemptsUsed: attempt,
      };
    }

    if (data) {
      return {
        status: "ok",
        profile: data,
        error: null,
        attemptsUsed: attempt,
      };
    }

    if (attempt < attempts) {
      await sleep(withJitter(delayMs, jitterMs));
    }
  }

  if (!allowUpsertFallback) {
    return {
      status: "missing",
      profile: null,
      error: null,
      attemptsUsed: attempts,
    };
  }

  const { error: upsertError } = await upsertProfileFallback(supabase, user);

  if (upsertError) {
    return {
      status: "error",
      profile: null,
      error: upsertError,
      attemptsUsed: attempts,
    };
  }

  const { data: fallbackData, error: fallbackError } = await selectProfile(
    supabase,
    userId
  );

  if (fallbackError) {
    return {
      status: "error",
      profile: null,
      error: fallbackError,
      attemptsUsed: attempts + 1,
    };
  }

  if (!fallbackData) {
    return {
      status: "missing",
      profile: null,
      error: null,
      attemptsUsed: attempts + 1,
    };
  }

  return {
    status: "ok",
    profile: fallbackData,
    error: null,
    attemptsUsed: attempts + 1,
  };
}

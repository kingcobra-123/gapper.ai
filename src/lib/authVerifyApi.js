const DEFAULT_VERIFY_ENDPOINT = "/api/auth/verify";

function readVerifyEndpointConfig() {
  const rawValue = import.meta.env.VITE_AUTH_VERIFY_ENDPOINT;
  const normalized = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!normalized) {
    return {
      endpoint: DEFAULT_VERIFY_ENDPOINT,
      disabled: false,
    };
  }

  const lowered = normalized.toLowerCase();
  if (lowered === "off" || lowered === "disabled" || lowered === "none") {
    return {
      endpoint: null,
      disabled: true,
    };
  }

  return {
    endpoint: normalized,
    disabled: false,
  };
}

const AUTH_VERIFY_CONFIG = readVerifyEndpointConfig();

export const AUTH_VERIFY_ENDPOINT = AUTH_VERIFY_CONFIG.endpoint;
export const AUTH_VERIFY_DISABLED = AUTH_VERIFY_CONFIG.disabled;

export async function verifyAccessTokenWithBackend(accessToken, options = {}) {
  if (AUTH_VERIFY_DISABLED || !AUTH_VERIFY_ENDPOINT) {
    return { data: null, error: null, skipped: true };
  }

  const normalizedToken =
    typeof accessToken === "string" ? accessToken.trim() : "";

  if (!normalizedToken) {
    return { data: null, error: new Error("Missing access token."), skipped: false };
  }

  const { signal } = options;

  let response;
  try {
    response = await fetch(AUTH_VERIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken: normalizedToken }),
      signal,
    });
  } catch (error) {
    return { data: null, error, skipped: false };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const message =
      payload?.error?.message ||
      `Token verification failed with status ${response.status}.`;
    return { data: null, error: new Error(message), skipped: false };
  }

  return { data: payload, error: null, skipped: false };
}

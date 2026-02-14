import type { ApiClientError } from "@/api/client";

export function formatApiError(error: ApiClientError): string {
  const retryHint =
    error.retryAfterSec !== null ? ` Retry in ~${error.retryAfterSec}s.` : " Retry in a few seconds.";

  if (error.status === 429) {
    return `Backend busy/rate limited.${retryHint}`;
  }

  if (error.status === 503) {
    return `Backend busy/unavailable.${retryHint}`;
  }

  if (error.status === 401) {
    return "Backend rejected request: missing/invalid API key.";
  }

  return error.message;
}

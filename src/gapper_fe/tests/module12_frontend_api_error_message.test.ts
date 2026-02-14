import assert from "node:assert/strict";
import test from "node:test";

import { ApiClientError } from "../src/api/client.ts";
import { formatApiError } from "../src/components/chat/api_error_message.ts";

test("frontend surfaces retry-after hints for 429 responses", () => {
  const error = new ApiClientError({
    status: 429,
    code: "rate_limit_exceeded",
    message: "Backend busy/rate limited. Retry shortly.",
    errors: ["rate_limit_exceeded"],
    retryAfterSec: 7
  });

  assert.equal(formatApiError(error), "Backend busy/rate limited. Retry in ~7s.");
});

test("frontend falls back to generic retry hint when retry-after is missing", () => {
  const error = new ApiClientError({
    status: 503,
    code: "redis_unavailable",
    message: "Backend busy. Please retry in a few seconds.",
    errors: ["redis_unavailable"],
    retryAfterSec: null
  });

  assert.equal(formatApiError(error), "Backend busy/unavailable. Retry in a few seconds.");
});

test("frontend preserves explicit auth guidance for unauthorized responses", () => {
  const error = new ApiClientError({
    status: 401,
    code: "unauthorized",
    message: "API key required or invalid for this endpoint.",
    errors: ["unauthorized"],
    retryAfterSec: null
  });

  assert.equal(formatApiError(error), "Backend rejected request: missing/invalid API key.");
});

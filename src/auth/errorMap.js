export const ERROR_MAP = {
  "Invalid login credentials": "Wrong email or password.",
  "Email not confirmed": "Please confirm your email first.",
  "Unsupported OAuth provider.": "This social provider is not supported.",
};

export function toAuthErrorMessage(error) {
  if (!error) {
    return null;
  }

  const message = error.message ?? String(error);

  if (ERROR_MAP[message]) {
    return ERROR_MAP[message];
  }

  const lower = message.toLowerCase();
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Check connection and try again.";
  }

  if (lower.includes("provider") && lower.includes("enabled")) {
    return "This social provider is not enabled in Supabase yet.";
  }

  return message;
}

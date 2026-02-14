export type AccessTokenProvider = () => Promise<string | null>;
export type UnauthorizedHandler = () => Promise<void> | void;

let accessTokenProvider: AccessTokenProvider | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setAccessTokenProvider(provider: AccessTokenProvider | null): void {
  accessTokenProvider = provider;
}

export async function getAccessToken(): Promise<string | null> {
  if (!accessTokenProvider) {
    return null;
  }
  try {
    const token = await accessTokenProvider();
    const value = token?.trim() ?? "";
    return value || null;
  } catch {
    return null;
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export async function notifyUnauthorized(): Promise<void> {
  if (!unauthorizedHandler) {
    return;
  }
  try {
    await unauthorizedHandler();
  } catch {
    // best-effort hook
  }
}

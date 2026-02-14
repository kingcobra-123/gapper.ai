export const KNOWN_CHANNEL_SLUGS = [
  "live_gappers",
  "all_gappers",
  "small_cap",
  "mid_cap",
  "large_cap",
  "popular",
  "momentum"
] as const;

export type KnownChannelSlug = (typeof KNOWN_CHANNEL_SLUGS)[number];

const KNOWN_CHANNEL_SET = new Set<string>(KNOWN_CHANNEL_SLUGS);

export const CHANNEL_DISPLAY_OVERRIDES: Record<KnownChannelSlug, string> = {
  live_gappers: "Live Gappers",
  all_gappers: "All Gappers",
  small_cap: "Small Cap",
  mid_cap: "Mid Cap",
  large_cap: "Large Cap",
  popular: "Popular",
  momentum: "Momentum"
};

function titleCase(raw: string): string {
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function canonicalizeKnownChannelName(raw: string): KnownChannelSlug | null {
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  if (!normalized || !KNOWN_CHANNEL_SET.has(normalized)) {
    return null;
  }
  return normalized as KnownChannelSlug;
}

export function isKnownChannelName(raw: string): boolean {
  return canonicalizeKnownChannelName(raw) !== null;
}

export function normalizeChannelName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return canonicalizeKnownChannelName(trimmed) ?? trimmed;
}

export function defaultSortOrderForChannel(raw: string): number {
  const canonical = canonicalizeKnownChannelName(raw);
  if (!canonical) {
    return 1000;
  }
  return (KNOWN_CHANNEL_SLUGS.indexOf(canonical) + 1) * 10;
}

export function channelDisplayName(
  channelName: string,
  backendDisplayName?: string | null
): string {
  const backendName = (backendDisplayName ?? "").trim();
  if (backendName) {
    return backendName;
  }
  const canonical = canonicalizeKnownChannelName(channelName);
  if (canonical) {
    return CHANNEL_DISPLAY_OVERRIDES[canonical];
  }
  return titleCase(channelName);
}

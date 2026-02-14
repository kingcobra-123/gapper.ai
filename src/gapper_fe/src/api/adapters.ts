import type {
  AnalyzeResponseDto,
  CardResponseDto,
  CardUpdatedEventDto,
  CardViewModel,
  GapperViewModel,
  GappersTopResponseDto
} from "@/api/types";
import {
  getMissingReasonForCard,
  getMissingReasonForField,
  type BackendCardType
} from "@/config/backendCapabilities";
import type { CardSentiment, NewsItem, SparklinePoint } from "@/types/cards";
import type { AssistantCard, ChatIntent } from "@/types/chat";
import type { MissingDataBlock, MissingField } from "@/types/missing";

const REMOVABLE_SUFFIXES = new Set(["US", "NASDAQ", "NYSE", "AMEX", "OTC"]);
const NEWS_LIMIT = 5;
const SIGNAL_NEWS_KEYWORDS = [
  "earnings",
  "guidance",
  "upgrade",
  "downgrade",
  "price target",
  "sec",
  "fda",
  "acquisition",
  "merger",
  "contract",
  "partnership",
  "buyback",
  "dividend",
  "lawsuit",
  "investigation",
  "halt",
  "breakout",
  "breakdown"
] as const;
const ET_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short"
});

type GenericRecord = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function asNumber(value: unknown, fallback = Number.NaN): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function toIsoTimestamp(raw: unknown, fallbackSec: number): string {
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw * 1000).toISOString();
  }
  return new Date(fallbackSec * 1000).toISOString();
}

function isWeekendInEastern(isoTimestamp: string): boolean {
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  const dayLabel = ET_WEEKDAY_FORMATTER.format(new Date(parsed)).toUpperCase();
  return dayLabel === "SAT" || dayLabel === "SUN";
}

function deriveSessionChangePercent(
  currentPrice: number | undefined,
  sessionOpenPrice: number | undefined,
  asOf: string
): number | undefined {
  if (isWeekendInEastern(asOf)) {
    return 0;
  }

  if (
    currentPrice === undefined ||
    sessionOpenPrice === undefined ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(sessionOpenPrice) ||
    sessionOpenPrice <= 0
  ) {
    return undefined;
  }

  return ((currentPrice - sessionOpenPrice) / sessionOpenPrice) * 100;
}

function mapSentiment(value: unknown): CardSentiment | undefined {
  const normalized = asString(value).toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "BULLISH") {
    return "bullish";
  }
  if (normalized === "BEARISH") {
    return "bearish";
  }
  if (normalized === "NEUTRAL") {
    return "neutral";
  }
  return undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = asFiniteNumber(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

function normalizeHighlightLines(items: string[], maxItems = 6): string[] {
  const normalized = items
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length > 0);
  return unique(normalized).slice(0, maxItems);
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function normalizeLevelPrices(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const levels: number[] = [];
  for (const item of raw) {
    if (isObject(item)) {
      const price = asFiniteNumber(item.price);
      if (price !== undefined && price > 0) {
        levels.push(price);
      }
      continue;
    }

    const fallback = asFiniteNumber(item);
    if (fallback !== undefined && fallback > 0) {
      levels.push(fallback);
    }
  }

  return unique(levels);
}

function parseEntryZone(raw: unknown): [number, number] | undefined {
  if (Array.isArray(raw) && raw.length >= 2) {
    const a = asFiniteNumber(raw[0]);
    const b = asFiniteNumber(raw[1]);
    if (a !== undefined && b !== undefined) {
      return a <= b ? [a, b] : [b, a];
    }
  }

  if (isObject(raw)) {
    const low = firstFiniteNumber(raw.low, raw.min, raw.start);
    const high = firstFiniteNumber(raw.high, raw.max, raw.end);
    if (low !== undefined && high !== undefined) {
      return low <= high ? [low, high] : [high, low];
    }
  }

  return undefined;
}

function parseSparklineSeries(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const points = raw
    .map((value) => asFiniteNumber(value))
    .filter((value): value is number => value !== undefined);

  return points.length >= 3 ? points : undefined;
}

function parseSparklinePoints(raw: unknown): SparklinePoint[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const points: SparklinePoint[] = [];
  for (const item of raw) {
    if (!isObject(item)) {
      continue;
    }
    const date = asString(item.date);
    const price = asFiniteNumber(item.price);
    if (!date || price === undefined) {
      continue;
    }
    points.push({ date, price });
  }
  return points.length >= 3 ? points : undefined;
}

function synthesizeSparklinePoints(series: number[], asOf: string): SparklinePoint[] | undefined {
  if (!Array.isArray(series) || series.length < 3) {
    return undefined;
  }
  const endDate = new Date(asOf);
  if (Number.isNaN(endDate.getTime())) {
    return undefined;
  }

  return series.map((price, index) => {
    const offsetDays = series.length - 1 - index;
    const pointDate = new Date(endDate);
    pointDate.setUTCDate(endDate.getUTCDate() - offsetDays);
    return {
      date: pointDate.toISOString().slice(0, 10),
      price
    };
  });
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function parseSentimentBreakdown(raw: unknown): Array<{ label: string; value: number }> {
  if (!Array.isArray(raw)) {
    return [];
  }

  const output: Array<{ label: string; value: number }> = [];
  for (const item of raw) {
    if (!isObject(item)) {
      continue;
    }
    const label = asString(item.label);
    const value = asFiniteNumber(item.value);
    if (!label || value === undefined) {
      continue;
    }
    output.push({
      label,
      value: clampPercent(value)
    });
  }
  return output;
}

function newsTimestampMs(value: string): number {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function hasSignalHeadline(headline: string): boolean {
  const normalized = headline.toLowerCase();
  return SIGNAL_NEWS_KEYWORDS.some((keyword) => {
    if (keyword.includes(" ")) {
      return normalized.includes(keyword);
    }
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(normalized);
  });
}

function isSignalNews(item: NewsItem): boolean {
  if (item.sentiment === "bullish" || item.sentiment === "bearish") {
    return true;
  }
  return hasSignalHeadline(item.headline);
}

function prioritizeNewsItems(items: NewsItem[]): NewsItem[] {
  const latestFirst = [...items].sort((a, b) => newsTimestampMs(b.publishedAt) - newsTimestampMs(a.publishedAt));
  const signalOnly = latestFirst.filter((item) => isSignalNews(item));
  const preferred = signalOnly.length ? signalOnly : latestFirst;
  return preferred.slice(0, NEWS_LIMIT);
}

function buildSnapshotHighlights(options: {
  rawHighlights: string[];
  summaryFromBackend: string;
  catalyst: string;
  llmContext: string;
  newsItems: NewsItem[];
}): string[] {
  if (options.rawHighlights.length) {
    return normalizeHighlightLines(options.rawHighlights);
  }

  const derived: string[] = [];
  if (options.catalyst) {
    derived.push(`Catalyst: ${options.catalyst}`);
  }
  if (options.summaryFromBackend) {
    derived.push(options.summaryFromBackend);
  }
  if (options.llmContext) {
    derived.push(`LLM: ${options.llmContext}`);
  }
  if (options.newsItems[0]?.headline) {
    derived.push(`Headline: ${options.newsItems[0].headline}`);
  }
  return normalizeHighlightLines(derived);
}

function buildLevelsHighlights(options: {
  rawHighlights: string[];
  supportLevels: number[];
  resistanceLevels: number[];
  pivot: number | undefined;
  entryZone: [number, number] | undefined;
  invalidation: number | undefined;
  llmContext: string;
}): string[] {
  if (options.rawHighlights.length) {
    return normalizeHighlightLines(options.rawHighlights);
  }

  const derived: string[] = [];
  if (options.supportLevels.length) {
    derived.push(`Support: ${options.supportLevels.slice(0, 2).map((value) => money(value)).join(" / ")}`);
  }
  if (options.resistanceLevels.length) {
    derived.push(`Resistance: ${options.resistanceLevels.slice(0, 2).map((value) => money(value)).join(" / ")}`);
  }
  if (options.entryZone) {
    derived.push(`Entry zone: ${money(options.entryZone[0])} - ${money(options.entryZone[1])}`);
  }
  if (options.invalidation !== undefined) {
    derived.push(`Invalidation: ${money(options.invalidation)}`);
  }
  if (options.pivot !== undefined) {
    derived.push(`Pivot: ${money(options.pivot)}`);
  }
  if (options.llmContext) {
    derived.push(`Context: ${options.llmContext}`);
  }
  return normalizeHighlightLines(derived);
}

function createCardId(ticker: string, type: AssistantCard["type"], asOf: string, version: number | null): string {
  const versionPart = version === null ? "na" : String(version);
  return `${ticker}-${type}-${versionPart}-${asOf}`;
}

function buildMissingField(key: string, fallbackCard: BackendCardType, detail?: string): MissingField {
  return {
    key,
    reason: getMissingReasonForField(key, fallbackCard),
    detail
  };
}

function buildCardMissingField(cardType: BackendCardType, detail?: string): MissingField {
  return {
    key: cardType,
    reason: getMissingReasonForCard(cardType),
    detail
  };
}

function dedupeMissingFields(fields: MissingField[]): MissingField[] {
  const seen = new Set<string>();
  const deduped: MissingField[] = [];

  for (const field of fields) {
    const id = `${field.key}:${field.reason}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    deduped.push(field);
  }

  return deduped;
}

function extractNewsUrl(rawItem: Record<string, unknown>): string {
  const publisher = isObject(rawItem.publisher) ? rawItem.publisher : null;
  const article = isObject(rawItem.article) ? rawItem.article : null;
  return asString(
    rawItem.url ||
      rawItem.article_url ||
      rawItem.link ||
      rawItem.source_url ||
      rawItem.amp_url ||
      (article ? article.url : undefined) ||
      (publisher ? publisher.url : undefined) ||
      (publisher ? publisher.homepage_url : undefined)
  );
}

function buildMissingDataBlock(title: string, fields: MissingField[], hint?: string): MissingDataBlock | undefined {
  const deduped = dedupeMissingFields(fields);
  if (!deduped.length) {
    return undefined;
  }
  return {
    title,
    fields: deduped,
    hint
  };
}

function collectNewsItems(rawSources: Record<string, unknown>, asOf: string): { items: NewsItem[]; missingFields: MissingField[] } {
  const newsFromPrimary = Array.isArray(rawSources.news) ? rawSources.news : [];
  const newsFromTop5 = Array.isArray(rawSources.news_top5) ? rawSources.news_top5 : [];
  const newsRaw = newsFromPrimary.length ? newsFromPrimary : newsFromTop5;
  const missingFields: MissingField[] = [];

  if (newsRaw.length === 0) {
    missingFields.push(buildMissingField("news.items", "news", "backend returned empty or none"));
    return { items: [], missingFields };
  }

  const items: NewsItem[] = [];

  for (const rawItem of newsRaw) {
    if (!isObject(rawItem)) {
      continue;
    }

    const headline = asString(rawItem.headline || rawItem.title);
    if (!headline) {
      continue;
    }

    const publisher = isObject(rawItem.publisher) ? rawItem.publisher : null;
    const source = asString(rawItem.source || rawItem.provider || (publisher ? publisher.name : undefined), "Unknown source");
    const url = extractNewsUrl(rawItem);
    const sentiment = mapSentiment(rawItem.sentiment);
    const publishedAt = toIsoTimestamp(
      rawItem.published_utc || rawItem.published_at || rawItem.publishedAt || rawItem.date,
      Date.parse(asOf) / 1000
    );

    const item: NewsItem = {
      headline,
      source,
      publishedAt
    };

    if (url) {
      item.url = url;
    } else {
      missingFields.push(buildMissingField("news.items.url", "news", `url missing for \"${headline}\"`));
    }

    if (sentiment) {
      item.sentiment = sentiment;
    }

    items.push(item);
  }

  if (!items.length) {
    missingFields.push(buildMissingField("news.items", "news", "backend items were present but unusable"));
  }

  return {
    items: prioritizeNewsItems(items),
    missingFields
  };
}

export function normalizeTickerSymbol(raw: string): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim().toUpperCase().replace(/^\$+/, "");
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, "");
  const direct = compact.replace(/[^A-Z0-9.\-]/g, "");
  if (!direct) {
    return null;
  }

  const suffixMatch = direct.match(/^([A-Z0-9\-]{1,32})\.([A-Z]{2,8})$/);
  if (suffixMatch && REMOVABLE_SUFFIXES.has(suffixMatch[2])) {
    return suffixMatch[1];
  }

  if (direct.length > 32) {
    return direct.slice(0, 32);
  }

  return direct;
}

export function parseCardUpdatedEvent(raw: string): CardUpdatedEventDto | null {
  try {
    const parsed = JSON.parse(raw) as CardUpdatedEventDto;
    const ticker = normalizeTickerSymbol(asString(parsed.ticker));
    if (!ticker) {
      return null;
    }

    return {
      ...parsed,
      ticker
    };
  } catch {
    return null;
  }
}

type AdaptCardContext = {
  ticker: string;
  rawCard: GenericRecord | null;
  rawStatus: GenericRecord | null;
  header: GenericRecord;
  tradeability: GenericRecord;
  tech: GenericRecord;
  rawSources: GenericRecord;
  llmMeta: GenericRecord;
  llmSentimentRaw: GenericRecord;
  serverTs: number;
  asOf: string;
  summaryFromBackend: string;
  summary: string;
  llmContext: string;
  versionOrNull: number | null;
  marketSnapshot: GenericRecord;
  catalyst: string;
};

type SnapshotBuildResult = {
  card: AssistantCard;
  floatM: number | undefined;
  newsItems: NewsItem[];
  newsMissingFields: MissingField[];
};

type SentimentBuildResult = {
  llmPending: boolean;
  llmFailed: boolean;
  llmError: string | null;
  sentiment: NonNullable<CardViewModel["sentiment"]>;
};

function buildAdaptCardContext(payload: CardResponseDto): AdaptCardContext {
  const ticker = normalizeTickerSymbol(payload.ticker) ?? payload.ticker.trim().toUpperCase();
  const rawCard: GenericRecord | null = isObject(payload.card) ? payload.card : null;
  const rawStatus: GenericRecord | null = isObject(payload.status) ? payload.status : null;

  const header: GenericRecord = rawCard && isObject(rawCard.header) ? rawCard.header : {};
  const tradeability: GenericRecord = rawCard && isObject(rawCard.tradeability) ? rawCard.tradeability : {};
  const tech: GenericRecord = rawCard && isObject(rawCard.tech) ? rawCard.tech : {};
  const rawSources: GenericRecord = rawCard && isObject(rawCard.raw_sources) ? rawCard.raw_sources : {};
  const llmMeta: GenericRecord = isObject(rawSources.llm_meta) ? rawSources.llm_meta : {};
  const llmSentimentRaw: GenericRecord = isObject(rawSources.llm_sentiment) ? rawSources.llm_sentiment : {};

  const serverTs = Number.isFinite(payload.server_ts) ? payload.server_ts : Date.now() / 1000;
  const asOf = toIsoTimestamp(header.as_of, serverTs);
  const summaryFromBackend = asString(rawCard?.summary);
  const summary = summaryFromBackend || `No backend summary available for ${ticker}.`;
  const llmContext = asString(tech.llm_context || llmSentimentRaw.reason || "");

  const version = rawStatus ? Math.trunc(asNumber(rawStatus.version, Number.NaN)) : Number.NaN;
  const versionOrNull = Number.isFinite(version) ? version : null;
  const marketSnapshot: GenericRecord = isObject(rawSources.market_snapshot) ? rawSources.market_snapshot : {};
  const catalyst = asString(tradeability.catalyst_type || rawCard?.catalyst);

  return {
    ticker,
    rawCard,
    rawStatus,
    header,
    tradeability,
    tech,
    rawSources,
    llmMeta,
    llmSentimentRaw,
    serverTs,
    asOf,
    summaryFromBackend,
    summary,
    llmContext,
    versionOrNull,
    marketSnapshot,
    catalyst
  };
}

function buildSnapshotCard(context: AdaptCardContext): SnapshotBuildResult {
  const currentPrice = firstFiniteNumber(context.tech.current_price, context.marketSnapshot.current_px);
  const sessionOpenPrice = firstFiniteNumber(
    context.marketSnapshot.session_open_px,
    context.marketSnapshot.session_open_price,
    context.marketSnapshot.day_open,
    context.marketSnapshot.open
  );
  const changePercent = deriveSessionChangePercent(currentPrice, sessionOpenPrice, context.asOf);
  const volume = asFiniteNumber(context.marketSnapshot.volume);
  const relativeVolume = firstFiniteNumber(
    context.marketSnapshot.relative_volume,
    context.marketSnapshot.rel_volume,
    context.marketSnapshot.rvol_full_day
  );
  const floatShares = firstFiniteNumber(
    context.marketSnapshot.float_shares,
    context.marketSnapshot.share_float,
    context.marketSnapshot.float
  );
  const floatM = firstFiniteNumber(
    context.marketSnapshot.float_millions,
    context.marketSnapshot.float_m,
    floatShares !== undefined ? floatShares / 1_000_000 : undefined
  );

  const snapshotMissingFields: MissingField[] = [];
  if (currentPrice === undefined) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.price", "ticker_snapshot"));
  }
  if (changePercent === undefined) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.changePercent", "ticker_snapshot"));
  }
  if (volume === undefined) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.volume", "ticker_snapshot"));
  }
  if (relativeVolume === undefined) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.relativeVolume", "ticker_snapshot"));
  }
  if (floatM === undefined) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.floatM", "ticker_snapshot"));
  }

  const sparkline =
    parseSparklineSeries(context.marketSnapshot.sparkline_series) ??
    parseSparklineSeries(context.marketSnapshot.sparkline_series_30d) ??
    parseSparklineSeries(context.marketSnapshot.sparkline) ??
    parseSparklineSeries(context.rawSources.sparkline);
  const sparklinePoints30d =
    parseSparklinePoints(context.marketSnapshot.sparkline_points_30d) ??
    parseSparklinePoints(context.marketSnapshot.sparkline_points) ??
    (sparkline ? synthesizeSparklinePoints(sparkline, context.asOf) : undefined);
  if (!sparkline) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.sparkline.series", "ticker_snapshot"));
  }

  const { items: newsItems, missingFields: newsMissingFields } = collectNewsItems(context.rawSources, context.asOf);
  const snapshotHighlights = buildSnapshotHighlights({
    rawHighlights: parseStringArray(context.rawCard?.highlights),
    summaryFromBackend: context.summaryFromBackend,
    catalyst: context.catalyst,
    llmContext: context.llmContext,
    newsItems
  });
  if (!snapshotHighlights.length) {
    snapshotMissingFields.push(buildMissingField("ticker_snapshot.highlights", "ticker_snapshot"));
  }

  const snapshotData: NonNullable<Extract<AssistantCard, { type: "ticker_snapshot" }>["data"]> = {
    ticker: context.ticker
  };
  if (currentPrice !== undefined) {
    snapshotData.price = currentPrice;
  }
  if (changePercent !== undefined) {
    snapshotData.changePercent = changePercent;
  }
  if (volume !== undefined) {
    snapshotData.volume = volume;
  }
  if (relativeVolume !== undefined) {
    snapshotData.relativeVolume = relativeVolume;
  }
  if (floatM !== undefined) {
    snapshotData.floatM = floatM;
  }
  if (sparkline) {
    snapshotData.sparkline = sparkline;
  }
  if (sparklinePoints30d) {
    snapshotData.sparklinePoints30d = sparklinePoints30d;
  }
  if (snapshotHighlights.length) {
    snapshotData.highlights = snapshotHighlights.slice(0, 6);
  }

  const card: AssistantCard = {
    id: createCardId(context.ticker, "ticker_snapshot", context.asOf, context.versionOrNull),
    type: "ticker_snapshot",
    title: `${context.ticker} Snapshot`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    data: snapshotData,
    missing: buildMissingDataBlock(
      "Snapshot dropped a few packets.",
      snapshotMissingFields,
      "No frontend sparkline/highlights are fabricated when backend fields are absent."
    )
  };

  return {
    card,
    floatM,
    newsItems,
    newsMissingFields
  };
}

function buildLevelsCard(context: AdaptCardContext): AssistantCard {
  const levelsMissingFields: MissingField[] = [];
  const supportLevels = normalizeLevelPrices(context.tech.support_levels);
  const resistanceLevels = normalizeLevelPrices(context.tech.resistance_levels);
  const pivot = asFiniteNumber(context.tech.pivot);
  const entryZone = parseEntryZone(context.tech.entry_zone || context.tech.entryZone);
  const invalidation = asFiniteNumber(context.tech.invalidation);
  const levelsHighlights = buildLevelsHighlights({
    rawHighlights: parseStringArray(context.tech.highlights),
    supportLevels,
    resistanceLevels,
    pivot,
    entryZone,
    invalidation,
    llmContext: context.llmContext
  });

  if (!supportLevels.length) {
    levelsMissingFields.push(buildMissingField("levels.support", "levels"));
  }
  if (!resistanceLevels.length) {
    levelsMissingFields.push(buildMissingField("levels.resistance", "levels"));
  }
  if (pivot === undefined) {
    levelsMissingFields.push(buildMissingField("levels.pivot", "levels"));
  }
  if (!entryZone) {
    levelsMissingFields.push(buildMissingField("levels.entryZone", "levels"));
  }
  if (invalidation === undefined) {
    levelsMissingFields.push(buildMissingField("levels.invalidation", "levels"));
  }
  if (!levelsHighlights.length) {
    levelsMissingFields.push(buildMissingField("levels.highlights", "levels"));
  }

  const levelsData: NonNullable<Extract<AssistantCard, { type: "levels" }>["data"]> = {
    ticker: context.ticker
  };
  if (supportLevels.length) {
    levelsData.support = supportLevels;
  }
  if (resistanceLevels.length) {
    levelsData.resistance = resistanceLevels;
  }
  if (pivot !== undefined) {
    levelsData.pivot = pivot;
  }
  if (entryZone) {
    levelsData.entryZone = entryZone;
  }
  if (invalidation !== undefined) {
    levelsData.invalidation = invalidation;
  }
  if (levelsHighlights.length) {
    levelsData.highlights = levelsHighlights.slice(0, 6);
  }

  return {
    id: createCardId(context.ticker, "levels", context.asOf, context.versionOrNull),
    type: "levels",
    title: `${context.ticker} Levels`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    data: levelsData,
    missing: buildMissingDataBlock(
      "Levels are playing hide-and-seek.",
      levelsMissingFields,
      "Support/resistance are passed through only when backend sends them."
    )
  };
}

function buildNewsCard(
  context: AdaptCardContext,
  newsItems: NewsItem[],
  newsMissingFields: MissingField[]
): AssistantCard {
  const missingFields = [...newsMissingFields];
  const rawNewsHighlights = parseStringArray(context.rawCard?.news_highlights);
  const newsHighlights = rawNewsHighlights.length
    ? normalizeHighlightLines(rawNewsHighlights)
    : normalizeHighlightLines(newsItems.map((item) => item.headline));
  if (!newsHighlights.length) {
    missingFields.push(buildMissingField("news.highlights", "news"));
  }

  const newsData: NonNullable<Extract<AssistantCard, { type: "news" }>["data"]> = {
    ticker: context.ticker
  };
  if (newsItems.length) {
    newsData.items = newsItems;
  }
  if (newsHighlights.length) {
    newsData.highlights = newsHighlights;
  }

  return {
    id: createCardId(context.ticker, "news", context.asOf, context.versionOrNull),
    type: "news",
    title: `${context.ticker} News`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    data: newsData,
    missing: buildMissingDataBlock(
      "Nothing spicy in the news - this ticker is chilling.",
      missingFields,
      "No synthetic headlines or fallback URLs are generated."
    )
  };
}

function buildGapCard(context: AdaptCardContext, floatM: number | undefined): AssistantCard {
  const gapMissingFields: MissingField[] = [];
  const gapPercent = asFiniteNumber(context.marketSnapshot.gap_pct);
  const premarketVolume = asFiniteNumber(context.marketSnapshot.premarket_volume);
  const setupQuality = asFiniteNumber(context.rawCard?.setup_quality);
  const rawDirection = asString(context.rawCard?.direction).toLowerCase();
  const direction = rawDirection === "up" || rawDirection === "down" ? rawDirection : undefined;
  const gapPlan = parseStringArray(context.rawCard?.gap_plan);

  if (gapPercent === undefined) {
    gapMissingFields.push(buildMissingField("gap_analysis.gapPercent", "gap_analysis"));
  }
  if (direction === undefined) {
    gapMissingFields.push(buildMissingField("gap_analysis.direction", "gap_analysis"));
  }
  if (premarketVolume === undefined) {
    gapMissingFields.push(buildMissingField("gap_analysis.premarketVolume", "gap_analysis"));
  }
  if (floatM === undefined) {
    gapMissingFields.push(buildMissingField("gap_analysis.floatM", "gap_analysis"));
  }
  if (!context.catalyst) {
    gapMissingFields.push(buildMissingField("gap_analysis.catalyst", "gap_analysis"));
  }
  if (setupQuality === undefined) {
    gapMissingFields.push(buildMissingField("gap_analysis.setupQuality", "gap_analysis"));
  }
  if (!gapPlan.length) {
    gapMissingFields.push(buildMissingField("gap_analysis.plan", "gap_analysis"));
  }

  const gapData: NonNullable<Extract<AssistantCard, { type: "gap_analysis" }>["data"]> = {
    ticker: context.ticker
  };
  if (gapPercent !== undefined) {
    gapData.gapPercent = gapPercent;
  }
  if (direction) {
    gapData.direction = direction;
  }
  if (premarketVolume !== undefined) {
    gapData.premarketVolume = premarketVolume;
  }
  if (floatM !== undefined) {
    gapData.floatM = floatM;
  }
  if (context.catalyst) {
    gapData.catalyst = context.catalyst;
  }
  if (setupQuality !== undefined) {
    gapData.setupQuality = setupQuality;
  }
  if (gapPlan.length) {
    gapData.plan = gapPlan.slice(0, 6);
  }

  return {
    id: createCardId(context.ticker, "gap_analysis", context.asOf, context.versionOrNull),
    type: "gap_analysis",
    title: `${context.ticker} Gap Analysis`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    data: gapData,
    missing: buildMissingDataBlock(
      "Gap card is honest about the blanks.",
      gapMissingFields,
      "Direction/setup quality/plan are never inferred on the frontend anymore."
    )
  };
}

function buildSentimentModel(context: AdaptCardContext): SentimentBuildResult {
  const llmPending = asBoolean(context.llmMeta.pending);
  const llmFailed = asBoolean(context.llmMeta.failed);
  const llmError = asString(context.llmMeta.error, "") || null;

  const sentimentMissingFields: MissingField[] = [];
  const sentimentSignal = mapSentiment(context.tradeability.sentiment ?? context.llmSentimentRaw.sentiment);
  const impactScoreRaw = asFiniteNumber(context.tradeability.impact_score);
  const confidenceRaw = asFiniteNumber(context.tradeability.confidence);

  const impactMetric = impactScoreRaw !== undefined ? clampPercent((impactScoreRaw + 1) * 50) : undefined;
  const confidenceMetric = confidenceRaw !== undefined ? clampPercent(confidenceRaw * 100) : undefined;
  const signalMetric =
    sentimentSignal === "bullish" ? 100 : sentimentSignal === "bearish" ? 0 : sentimentSignal === "neutral" ? 50 : undefined;

  const backendSentimentScore = asFiniteNumber(context.llmSentimentRaw.score_0_100);
  const weightedComponents: Array<{ value: number; weight: number }> = [];
  if (impactMetric !== undefined) {
    weightedComponents.push({ value: impactMetric, weight: 0.55 });
  }
  if (confidenceMetric !== undefined) {
    weightedComponents.push({ value: confidenceMetric, weight: 0.25 });
  }
  if (signalMetric !== undefined) {
    weightedComponents.push({ value: signalMetric, weight: 0.2 });
  }

  const sentimentScoreDerived =
    weightedComponents.length > 0
      ? clampPercent(
          weightedComponents.reduce((sum, item) => sum + item.value * item.weight, 0) /
            weightedComponents.reduce((sum, item) => sum + item.weight, 0)
        )
      : undefined;
  const sentimentScore =
    backendSentimentScore !== undefined ? clampPercent(backendSentimentScore) : sentimentScoreDerived;

  if (sentimentSignal === undefined) {
    sentimentMissingFields.push(
      buildMissingField("sentiment.signal", "ticker_snapshot", "tradeability.sentiment was not provided")
    );
  }
  if (impactScoreRaw === undefined) {
    sentimentMissingFields.push(
      buildMissingField("sentiment.impact_score", "ticker_snapshot", "tradeability.impact_score was not provided")
    );
  }
  if (confidenceRaw === undefined) {
    sentimentMissingFields.push(
      buildMissingField("sentiment.confidence", "ticker_snapshot", "tradeability.confidence was not provided")
    );
  }
  if (sentimentScore === undefined) {
    sentimentMissingFields.push(
      buildMissingField(
        "sentiment.value",
        "ticker_snapshot",
        llmPending ? "LLM analysis still pending" : llmFailed ? "LLM analysis failed" : "no backend sentiment score"
      )
    );
  }

  const backendSentimentBreakdown = parseSentimentBreakdown(context.llmSentimentRaw.breakdown);
  const sentimentBreakdown =
    backendSentimentBreakdown.length > 0
      ? backendSentimentBreakdown
      : [
          impactMetric !== undefined ? { label: "Impact", value: impactMetric } : null,
          confidenceMetric !== undefined ? { label: "Confidence", value: confidenceMetric } : null,
          signalMetric !== undefined ? { label: "Signal", value: signalMetric } : null
        ].filter((item): item is { label: string; value: number } => item !== null);

  const sentimentMissing = buildMissingDataBlock(
    "Sentiment payload is waiting on backend context.",
    sentimentMissingFields,
    llmPending
      ? "LLM enrichment is still running for this ticker."
      : llmFailed
      ? "LLM enrichment failed; inspect llm_meta.error for details."
      : undefined
  );

  const sentiment: NonNullable<CardViewModel["sentiment"]> = {
    breakdown: sentimentBreakdown
  };
  if (sentimentScore !== undefined) {
    sentiment.value = sentimentScore;
  }
  if (context.llmContext) {
    sentiment.summary = context.llmContext;
  }
  if (sentimentMissing) {
    sentiment.missing = sentimentMissing;
  }

  return {
    llmPending,
    llmFailed,
    llmError,
    sentiment
  };
}

export function adaptCardResponse(payload: CardResponseDto): CardViewModel {
  const context = buildAdaptCardContext(payload);

  const snapshot = buildSnapshotCard(context);
  const levelsCard = buildLevelsCard(context);
  const newsCard = buildNewsCard(context, snapshot.newsItems, snapshot.newsMissingFields);
  const gapCard = buildGapCard(context, snapshot.floatM);
  const sentimentModel = buildSentimentModel(context);

  const riskCard: AssistantCard = {
    id: createCardId(context.ticker, "risk_plan", context.asOf, context.versionOrNull),
    type: "risk_plan",
    title: `${context.ticker} Risk Plan`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    missing: buildMissingDataBlock(
      "No plan. No lies. Just vibes.",
      [buildCardMissingField("risk_plan", "backend does not provide this card yet")],
      "Backend should return risk profile, size guidance, and stops/targets for this ticker."
    )
  };

  const tradeIdeaCard: AssistantCard = {
    id: createCardId(context.ticker, "trade_idea", context.asOf, context.versionOrNull),
    type: "trade_idea",
    title: `${context.ticker} Trade Idea`,
    tickers: [context.ticker],
    timestamp: context.asOf,
    missing: buildMissingDataBlock(
      "Trade idea card is taking a schema vacation.",
      [buildCardMissingField("trade_idea", "backend does not provide this card yet")],
      "Backend should return thesis, entry/stop/targets, and setup triggers."
    )
  };

  return {
    ticker: context.ticker,
    summary: context.summary,
    asOf: context.asOf,
    cards: [snapshot.card, levelsCard, newsCard, riskCard, tradeIdeaCard, gapCard],
    isMissing: asBoolean(payload.is_missing),
    isStale: asBoolean(payload.is_stale),
    refreshTriggered: asBoolean(payload.refresh_triggered),
    refreshDeduped: asBoolean(payload.refresh_deduped),
    etag: payload.etag,
    serverTs: context.serverTs,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    version: context.versionOrNull,
    rawCard: context.rawCard,
    rawStatus: context.rawStatus,
    llmPending: sentimentModel.llmPending,
    llmFailed: sentimentModel.llmFailed,
    llmError: sentimentModel.llmError,
    sentiment: sentimentModel.sentiment
  };
}

export function adaptAnalyzeResponse(payload: AnalyzeResponseDto): {
  ticker: string;
  enqueued: boolean;
  deduped: boolean;
  serverTs: number;
  errors: string[];
} {
  return {
    ticker: normalizeTickerSymbol(payload.ticker) ?? payload.ticker.trim().toUpperCase(),
    enqueued: asBoolean(payload.enqueued),
    deduped: asBoolean(payload.deduped),
    serverTs: asNumber(payload.server_ts, Date.now() / 1000),
    errors: Array.isArray(payload.errors) ? payload.errors : []
  };
}

export function adaptPinResponse(payload: AnalyzeResponseDto): {
  ticker: string;
  enqueued: boolean;
  deduped: boolean;
  serverTs: number;
  errors: string[];
} {
  return adaptAnalyzeResponse(payload);
}

export function adaptGappersResponse(payload: GappersTopResponseDto): GapperViewModel[] {
  if (!Array.isArray(payload.items)) {
    return [];
  }

  return payload.items
    .map((item) => ({
      rank: Math.max(1, Math.trunc(asNumber(item.rank, 0))),
      ticker: normalizeTickerSymbol(item.ticker) ?? asString(item.ticker).toUpperCase(),
      score: asNumber(item.score, 0)
    }))
    .filter((item) => Boolean(item.ticker));
}

export function selectCardsForIntent(cards: AssistantCard[], intent: ChatIntent): AssistantCard[] {
  const primaryCards = cards.filter(
    (card) =>
      card.type === "ticker_snapshot" ||
      card.type === "trade_idea" ||
      card.type === "gap_analysis"
  );

  if (intent === "levels") {
    return cards.filter((card) => card.type === "ticker_snapshot" || card.type === "levels" || card.type === "risk_plan");
  }

  if (intent === "news") {
    return cards.filter((card) => card.type === "news" || card.type === "ticker_snapshot");
  }

  if (intent === "quick_gap") {
    return primaryCards;
  }

  if (intent === "scan") {
    return cards.filter((card) => card.type === "gap_analysis" || card.type === "ticker_snapshot");
  }

  if (intent === "deep_dive" || intent === "message") {
    return primaryCards;
  }

  return primaryCards;
}

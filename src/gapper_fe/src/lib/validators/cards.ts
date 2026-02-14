import { z } from "zod";

export const tickerSnapshotSchema = z.object({
  ticker: z.string(),
  price: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  relativeVolume: z.number(),
  floatM: z.number(),
  sparkline: z.array(z.number()),
  highlights: z.array(z.string())
});

export const levelsSchema = z.object({
  ticker: z.string(),
  support: z.array(z.number()),
  resistance: z.array(z.number()),
  pivot: z.number(),
  entryZone: z.tuple([z.number(), z.number()]),
  invalidation: z.number(),
  highlights: z.array(z.string())
});

import { z } from 'zod';
import { AttributionConfidenceSchema } from './zodTypes';

/** Bump when the persisted envelope shape changes (invalidates old cache files). */
export const ATTRIBUTION_CACHE_SCHEMA_VERSION = 1;

/** Default TTL for device-side attribution fallback (24 hours). */
export const DEFAULT_ATTRIBUTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Persisted device cache — provider-agnostic normalized snapshot + bookkeeping.
 * Stored as JSON (e.g. AsyncStorage). Not sent to Rheo servers by default.
 */
export const AttributionDeviceCacheEnvelopeSchema = z.object({
  schemaVersion: z.literal(ATTRIBUTION_CACHE_SCHEMA_VERSION),
  /** Epoch ms when this envelope was written. */
  cachedAtMs: z.number(),
  /** Snapshot identity — must match current adapter output shape. */
  snapshot: z.object({
    providerId: z.string().min(1),
    capturedAtMs: z.number(),
    attribution: z.object({
      isOrganic: z.boolean().optional(),
      matchType: z.string().optional(),
      confidence: AttributionConfidenceSchema.optional(),
      installTimestampMs: z.number().optional(),
      clickTimestampMs: z.number().optional(),
    }),
    acquisition: z.object({
      source: z.string().optional(),
      campaign: z.string().optional(),
      campaignId: z.string().optional(),
      adset: z.string().optional(),
      adsetId: z.string().optional(),
      creative: z.string().optional(),
      creativeId: z.string().optional(),
      channel: z.string().optional(),
    }),
    link: z.object({
      entry: z.string().optional(),
      params: z.record(z.string(), z.string()).optional(),
    }),
  }),
});

export type AttributionDeviceCacheEnvelope = z.infer<typeof AttributionDeviceCacheEnvelopeSchema>;

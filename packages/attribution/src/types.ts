/**
 * Provider-agnostic attribution context produced by MMP adapters before flattening to sdkAttributes.
 */

export type AttributionConfidenceLevel = 'high' | 'medium' | 'low';

/** Stable identifier for an attribution SDK integration (`appsflyer`, `adjust`, …). */
export type AttributionProviderId = string;

export interface AttributionFacet {
  /** Organic vs paid/non-organic classification when available. */
  isOrganic?: boolean;
  matchType?: string;
  confidence?: AttributionConfidenceLevel;
  /** Epoch ms when install occurred (from provider when present). */
  installTimestampMs?: number;
  /** Epoch ms for attributed click when present. */
  clickTimestampMs?: number;
}

export interface AcquisitionFacet {
  source?: string;
  campaign?: string;
  campaignId?: string;
  adset?: string;
  adsetId?: string;
  creative?: string;
  creativeId?: string;
  channel?: string;
}

/**
 * Deep links / universal links use the same branching surface as acquisition — primary route plus extensible params.
 */
export interface LinkFacet {
  /** Primary entry / route / deep-link value (harmonized across providers). */
  entry?: string;
  /** Arbitrary key/value pairs (merged into `link.ext.*` flat keys). */
  params?: Record<string, string>;
}

/**
 * Single normalized snapshot emitted by an {@link AttributionProviderId}.
 * Multiple facets may be filled from install conversion, deep link, or both.
 */
export interface NormalizedAttributionSnapshot {
  providerId: AttributionProviderId;
  /** When this snapshot was captured on-device (epoch ms). */
  capturedAtMs: number;
  attribution: AttributionFacet;
  acquisition: AcquisitionFacet;
  link: LinkFacet;
}

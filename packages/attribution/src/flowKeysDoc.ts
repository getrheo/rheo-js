import {
  ATTR_KEY_ACQ_ADSET,
  ATTR_KEY_ACQ_ADSET_ID,
  ATTR_KEY_ACQ_CAMPAIGN,
  ATTR_KEY_ACQ_CAMPAIGN_ID,
  ATTR_KEY_ACQ_CHANNEL,
  ATTR_KEY_ACQ_CREATIVE,
  ATTR_KEY_ACQ_CREATIVE_ID,
  ATTR_KEY_ACQ_SOURCE,
  ATTR_KEY_CONFIDENCE,
  ATTR_KEY_IS_ORGANIC,
  ATTR_KEY_LINK_CONTENT_ID,
  ATTR_KEY_LINK_ENTRY,
  ATTR_KEY_LINK_PROMO,
  ATTR_KEY_LINK_REFERRAL,
  ATTR_KEY_MATCH_TYPE,
  ATTR_KEY_PROVIDER,
  LINK_EXT_PREFIX,
} from './canonicalKeys';
import type { AttributionConfidenceLevel } from './types';

/** Suggested `attribution.provider` string ids for dashboard pickers (extend as we add adapters). */
export const SUGGESTED_ATTRIBUTION_PROVIDER_IDS: readonly string[] = [
  'appsflyer',
  'adjust',
  'branch',
  'meta',
  'google',
  'tiktok',
  'snapchat',
  'twitter',
];

/** Values that may appear at `attribution.confidence` after flattening. */
export const ATTRIBUTION_CONFIDENCE_LEVELS: readonly AttributionConfidenceLevel[] = [
  'high',
  'medium',
  'low',
];

/** Human-readable reference for dashboard + docs (SDK decision variables). */
export const ATTRIBUTION_SDK_KEYS_DOC: ReadonlyArray<{ key: string; description: string }> = [
  { key: ATTR_KEY_PROVIDER, description: 'Which integration produced this snapshot (e.g. appsflyer).' },
  { key: ATTR_KEY_IS_ORGANIC, description: 'Organic vs non-organic (use a Boolean compare in decisions).' },
  { key: ATTR_KEY_MATCH_TYPE, description: 'Provider match type when available.' },
  { key: ATTR_KEY_CONFIDENCE, description: 'Coarse confidence hint (high | medium | low).' },
  { key: ATTR_KEY_ACQ_SOURCE, description: 'Media / network / source (Meta, Google, etc.).' },
  { key: ATTR_KEY_ACQ_CAMPAIGN, description: 'Campaign name.' },
  { key: ATTR_KEY_ACQ_CAMPAIGN_ID, description: 'Campaign id.' },
  { key: ATTR_KEY_ACQ_ADSET, description: 'Ad set / ad group name.' },
  { key: ATTR_KEY_ACQ_ADSET_ID, description: 'Ad set id.' },
  { key: ATTR_KEY_ACQ_CREATIVE, description: 'Creative / ad name.' },
  { key: ATTR_KEY_ACQ_CREATIVE_ID, description: 'Creative id.' },
  { key: ATTR_KEY_ACQ_CHANNEL, description: 'Optional channel bucket.' },
  { key: ATTR_KEY_LINK_ENTRY, description: 'Primary deep link / route value (same decision surface as campaigns).' },
  { key: `${LINK_EXT_PREFIX}<param>`, description: 'Dynamic link parameters (e.g. link.ext.promo_code).' },
  { key: ATTR_KEY_LINK_REFERRAL, description: 'Example: mapped referral code param.' },
  { key: ATTR_KEY_LINK_PROMO, description: 'Example: mapped promo code param.' },
  { key: ATTR_KEY_LINK_CONTENT_ID, description: 'Example: mapped content id param.' },
];

/**
 * Catalog keys editors should offer for attribution / acquisition / deep-link branching
 * (excludes template rows like `link.ext.<param>` — use a custom `link.ext.*` key for those).
 */
export const ATTRIBUTION_PREDEFINED_DECISION_KEYS: ReadonlyArray<{
  key: string;
  description: string;
}> = ATTRIBUTION_SDK_KEYS_DOC.filter((row) => !row.key.includes('<'));

const ATTRIBUTION_PREDEFINED_SDK_KEY_SET: ReadonlySet<string> = new Set(
  ATTRIBUTION_PREDEFINED_DECISION_KEYS.map((row) => row.key),
);

export const isAttributionPredefinedSdkKey = (key: string): boolean =>
  ATTRIBUTION_PREDEFINED_SDK_KEY_SET.has(key);

export const attributionPredefinedKeyDescription = (key: string): string | undefined =>
  ATTRIBUTION_PREDEFINED_DECISION_KEYS.find((row) => row.key === key)?.description;

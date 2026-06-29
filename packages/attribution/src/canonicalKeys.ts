/**
 * Universal SDK attribute keys for mobile attribution / deep-link context.
 * Provider adapters (AppsFlyer, Adjust, …) map native payloads → these names.
 *
 * Host-supplied `sdkAttributes` should avoid these prefixes to prevent clashes:
 * `attribution.`, `acquisition.`, `link.`
 */

/** Metadata about which MMP / SDK produced the current snapshot (string id, e.g. `appsflyer`). */
export const ATTR_KEY_PROVIDER = 'attribution.provider' as const;

/** Whether the install/open was classified as organic (`boolean` in decision eval). */
export const ATTR_KEY_IS_ORGANIC = 'attribution.isOrganic' as const;

/** Optional coarse confidence hint from the provider (`high` | `medium` | `low`). */
export const ATTR_KEY_CONFIDENCE = 'attribution.confidence' as const;

/** Provider-specific match type string when available (probabilistic, etc.). */
export const ATTR_KEY_MATCH_TYPE = 'attribution.matchType' as const;

/** Media / network / channel — paid ads, social, search, etc. */
export const ATTR_KEY_ACQ_SOURCE = 'acquisition.source' as const;

export const ATTR_KEY_ACQ_CAMPAIGN = 'acquisition.campaign' as const;
export const ATTR_KEY_ACQ_CAMPAIGN_ID = 'acquisition.campaignId' as const;
export const ATTR_KEY_ACQ_ADSET = 'acquisition.adset' as const;
export const ATTR_KEY_ACQ_ADSET_ID = 'acquisition.adsetId' as const;
export const ATTR_KEY_ACQ_CREATIVE = 'acquisition.creative' as const;
export const ATTR_KEY_ACQ_CREATIVE_ID = 'acquisition.creativeId' as const;

/** Optional coarse channel bucket (e.g. social, search). */
export const ATTR_KEY_ACQ_CHANNEL = 'acquisition.channel' as const;

/**
 * Primary entry identifier from a universal / deep link — same decision surface as campaigns.
 * Semantic: “what route or offer this open represents”.
 */
export const ATTR_KEY_LINK_ENTRY = 'link.entry' as const;

/**
 * Flattened dynamic params from links / deferred payloads.
 * Pattern: `link.ext.<paramKey>` where paramKey is provider-normalized (alphanumeric + underscore).
 */
export const LINK_EXT_PREFIX = 'link.ext.' as const;

/** Well-known link.param keys (optional convenience aliases providers may map). */
export const ATTR_KEY_LINK_REFERRAL = 'link.ext.referral_code' as const;
export const ATTR_KEY_LINK_PROMO = 'link.ext.promo_code' as const;
export const ATTR_KEY_LINK_CONTENT_ID = 'link.ext.content_id' as const;

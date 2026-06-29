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
  ATTR_KEY_LINK_ENTRY,
  ATTR_KEY_MATCH_TYPE,
  ATTR_KEY_PROVIDER,
  LINK_EXT_PREFIX,
} from './canonicalKeys';
import type { NormalizedAttributionSnapshot } from './types';

const sanitizeExtKey = (k: string): string =>
  k.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64);

/**
 * Maps a normalized snapshot into flat `sdkAttributes` entries for decision nodes.
 * Omits undefined leaves; booleans stay booleans for boolean predicates.
 */
export const flattenAttributionSnapshotToSdkAttributes = (
  snapshot: NormalizedAttributionSnapshot,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};

  out[ATTR_KEY_PROVIDER] = snapshot.providerId;

  const { attribution, acquisition, link } = snapshot;

  if (typeof attribution.isOrganic === 'boolean') {
    out[ATTR_KEY_IS_ORGANIC] = attribution.isOrganic;
  }
  if (attribution.matchType !== undefined && attribution.matchType !== '') {
    out[ATTR_KEY_MATCH_TYPE] = attribution.matchType;
  }
  if (attribution.confidence !== undefined) {
    out[ATTR_KEY_CONFIDENCE] = attribution.confidence;
  }

  const setStr = (key: string, v?: string): void => {
    if (v !== undefined && v !== '') out[key] = v;
  };

  setStr(ATTR_KEY_ACQ_SOURCE, acquisition.source);
  setStr(ATTR_KEY_ACQ_CAMPAIGN, acquisition.campaign);
  setStr(ATTR_KEY_ACQ_CAMPAIGN_ID, acquisition.campaignId);
  setStr(ATTR_KEY_ACQ_ADSET, acquisition.adset);
  setStr(ATTR_KEY_ACQ_ADSET_ID, acquisition.adsetId);
  setStr(ATTR_KEY_ACQ_CREATIVE, acquisition.creative);
  setStr(ATTR_KEY_ACQ_CREATIVE_ID, acquisition.creativeId);
  setStr(ATTR_KEY_ACQ_CHANNEL, acquisition.channel);

  setStr(ATTR_KEY_LINK_ENTRY, link.entry);

  const params = link.params ?? {};
  for (const [rawKey, rawVal] of Object.entries(params)) {
    const sk = sanitizeExtKey(rawKey);
    if (!sk) continue;
    if (rawVal !== undefined && rawVal !== '') {
      const extKey = `${LINK_EXT_PREFIX}${sk}`;
      if (extKey in out) continue;
      out[extKey] = rawVal;
    }
  }

  return out;
};

/**
 * Returns true if the snapshot carries any branching-relevant data beyond provider id alone.
 */
export const normalizedSnapshotHasSignal = (snapshot: NormalizedAttributionSnapshot): boolean => {
  const flat = flattenAttributionSnapshotToSdkAttributes(snapshot);
  const keys = Object.keys(flat).filter((k) => k !== ATTR_KEY_PROVIDER);
  return keys.length > 0;
};

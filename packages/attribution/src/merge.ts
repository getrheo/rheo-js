import type { NormalizedAttributionSnapshot } from './types';

/**
 * Merges two snapshots from the same session/provider layer (e.g. install + deep link).
 * Later `overlay` wins on conflicting scalar facets; link params are shallow-merged with overlay winning per key.
 */
export const mergeAttributionSnapshots = (
  base: NormalizedAttributionSnapshot | null,
  overlay: NormalizedAttributionSnapshot,
): NormalizedAttributionSnapshot => {
  if (!base) return overlay;
  return {
    providerId: overlay.providerId,
    capturedAtMs: Math.max(base.capturedAtMs, overlay.capturedAtMs),
    attribution: { ...base.attribution, ...overlay.attribution },
    acquisition: { ...base.acquisition, ...overlay.acquisition },
    link: {
      entry: overlay.link.entry || base.link.entry,
      params: { ...base.link.params, ...overlay.link.params },
    },
  };
};

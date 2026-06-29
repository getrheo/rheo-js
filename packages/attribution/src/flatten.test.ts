import { describe, expect, it } from 'vitest';
import {
  ATTR_KEY_ACQ_CAMPAIGN,
  ATTR_KEY_ACQ_SOURCE,
  ATTR_KEY_IS_ORGANIC,
  ATTR_KEY_LINK_ENTRY,
  ATTR_KEY_PROVIDER,
  flattenAttributionSnapshotToSdkAttributes,
  normalizedSnapshotHasSignal,
} from './index';

describe('flattenAttributionSnapshotToSdkAttributes', () => {
  it('maps normalized facets to universal sdk keys', () => {
    const flat = flattenAttributionSnapshotToSdkAttributes({
      providerId: 'appsflyer',
      capturedAtMs: 1,
      attribution: { isOrganic: false },
      acquisition: { source: 'facebook', campaign: 'summer' },
      link: { entry: 'offer_a', params: { promo: 'SAVE10' } },
    });
    expect(flat[ATTR_KEY_PROVIDER]).toBe('appsflyer');
    expect(flat[ATTR_KEY_IS_ORGANIC]).toBe(false);
    expect(flat[ATTR_KEY_ACQ_SOURCE]).toBe('facebook');
    expect(flat[ATTR_KEY_ACQ_CAMPAIGN]).toBe('summer');
    expect(flat[ATTR_KEY_LINK_ENTRY]).toBe('offer_a');
    expect(flat['link.ext.promo']).toBe('SAVE10');
  });
});

describe('normalizedSnapshotHasSignal', () => {
  it('returns false for provider-only snapshots', () => {
    expect(
      normalizedSnapshotHasSignal({
        providerId: 'test',
        capturedAtMs: 1,
        attribution: {},
        acquisition: {},
        link: {},
      }),
    ).toBe(false);
  });

  it('returns true when organic flag is set', () => {
    expect(
      normalizedSnapshotHasSignal({
        providerId: 'test',
        capturedAtMs: 1,
        attribution: { isOrganic: true },
        acquisition: {},
        link: {},
      }),
    ).toBe(true);
  });
});

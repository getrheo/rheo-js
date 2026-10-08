import { afterEach, describe, expect, it, vi } from 'vitest';
import { ATTR_KEY_ACQ_CHANNEL, ATTR_KEY_ACQ_SOURCE, ATTR_KEY_IS_ORGANIC } from '@getrheo/attribution';
import {
  attributionForAnalyticsSession,
  captureWebAttributionFromLocation,
  clearWebAttributionStorage,
  collectWebAttributionAttributes,
} from './attribution.js';

describe('captureWebAttributionFromLocation', () => {
  it('maps utm params and marks non-organic when campaign present', () => {
    const attrs = captureWebAttributionFromLocation({
      search: '?utm_source=tiktok&utm_campaign=spring',
      referrer: 'https://t.co/x',
      href: 'https://example.com/funnel?utm_source=tiktok&utm_campaign=spring',
    });
    expect(attrs[ATTR_KEY_ACQ_SOURCE]).toBe('tiktok');
    expect(attrs[ATTR_KEY_IS_ORGANIC]).toBe(false);
    expect(attrs['link.ext.referrer']).toBe('https://t.co/x');
  });

  it('marks organic when no paid utm hints', () => {
    const attrs = captureWebAttributionFromLocation({ search: '' });
    expect(attrs[ATTR_KEY_IS_ORGANIC]).toBe(true);
  });

  it('drops a referrer on the same host', () => {
    const attrs = captureWebAttributionFromLocation({
      search: '',
      referrer: 'https://www.example.com/pricing',
      pageHost: 'example.com',
    });
    expect(attrs['link.ext.referrer']).toBeUndefined();
  });
});

describe('collectWebAttributionAttributes', () => {
  afterEach(() => {
    clearWebAttributionStorage();
    sessionStorage.clear();
  });
  it('merges optional host providers and ignores provider failures', async () => {
    const attrs = await collectWebAttributionAttributes({
      captureUrlParams: false,
      providers: [
        {
          id: 'segment',
          collect: () => ({ 'link.ext.segment_anon': 'anon_1' }),
        },
        {
          id: 'broken',
          collect: async () => {
            throw new Error('pixel blocked');
          },
        },
      ],
    });
    expect(attrs['link.ext.segment_anon']).toBe('anon_1');
  });

  it('keeps the first touch and ignores a later URL', async () => {
    vi.stubGlobal('location', {
      search: '?utm_source=tiktok',
      href: 'https://example.com/?utm_source=tiktok',
      origin: 'https://example.com',
    });
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });
    const first = await collectWebAttributionAttributes({});
    vi.stubGlobal('location', {
      search: '?session_id=cs_test_123&utm_source=stripe',
      href: 'https://example.com/?session_id=cs_test_123',
      origin: 'https://example.com',
    });
    const second = await collectWebAttributionAttributes({});
    expect(second[ATTR_KEY_ACQ_SOURCE]).toBe(first[ATTR_KEY_ACQ_SOURCE]);
    expect(second[ATTR_KEY_ACQ_SOURCE]).toBe('tiktok');
  });

  it('holds the first touch in memory until persist is allowed', async () => {
    vi.stubGlobal('location', {
      search: '?utm_source=tiktok',
      href: 'https://example.com/?utm_source=tiktok',
      origin: 'https://example.com',
    });
    Object.defineProperty(document, 'referrer', { value: 'https://t.co/x', configurable: true });
    const held = await collectWebAttributionAttributes({}, { persist: false });
    expect(sessionStorage.getItem('rheo_web_attribution_first_touch_v1')).toBeNull();
    expect(held[ATTR_KEY_ACQ_SOURCE]).toBe('tiktok');
    vi.stubGlobal('location', {
      search: '?utm_source=stripe',
      href: 'https://example.com/?utm_source=stripe',
      origin: 'https://example.com',
    });
    const persisted = await collectWebAttributionAttributes({}, { persist: true });
    expect(persisted[ATTR_KEY_ACQ_SOURCE]).toBe('tiktok');
    expect(sessionStorage.getItem('rheo_web_attribution_first_touch_v1')).toContain('tiktok');
  });

  it('keeps a session landing hit and ignores the sticky referrer on the next session', async () => {
    vi.stubGlobal('location', {
      search: '?utm_source=google&utm_medium=cpc',
      href: 'https://example.com/?utm_source=google&utm_medium=cpc',
      hostname: 'example.com',
    });
    Object.defineProperty(document, 'referrer', {
      value: 'https://www.google.com/search',
      configurable: true,
    });
    await collectWebAttributionAttributes({});
    const first = attributionForAnalyticsSession('session-a');
    expect(first[ATTR_KEY_ACQ_SOURCE]).toBe('google');
    expect(first['link.ext.referrer']).toBe('https://www.google.com/search');

    vi.stubGlobal('location', {
      search: '?utm_source=newsletter&utm_medium=email',
      href: 'https://example.com/?utm_source=newsletter&utm_medium=email',
      hostname: 'example.com',
    });
    const same = attributionForAnalyticsSession('session-a');
    expect(same[ATTR_KEY_ACQ_SOURCE]).toBe('google');

    const next = attributionForAnalyticsSession('session-b');
    expect(next[ATTR_KEY_ACQ_SOURCE]).toBe('newsletter');
    expect(next[ATTR_KEY_ACQ_CHANNEL]).toBe('email');
    expect(next['link.ext.referrer']).toBeUndefined();
  });

  it('returns empty when attribution is disabled', async () => {
    const collect = vi.fn(() => ({ 'link.ext.x': '1' }));
    const attrs = await collectWebAttributionAttributes({
      enabled: false,
      providers: [{ id: 'x', collect }],
    });
    expect(attrs).toEqual({});
    expect(collect).not.toHaveBeenCalled();
  });
});

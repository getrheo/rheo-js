import { beforeEach, describe, expect, it } from 'vitest';
import type { SdkResolveResponse } from '@getrheo/contracts';
import {
  clearManifestResolveCacheMemoryForTests,
  loadManifestResolveCache,
  manifestResolveCacheKey,
  parseManifestResolveCacheKey,
  peekManifestResolveCache,
  saveManifestResolveCache,
  shouldSendManifestConditional,
} from './manifestResolveCache.js';

const sampleBody = (): SdkResolveResponse =>
  ({
    flowId: '00000000-0000-4000-8000-000000000001',
    versionId: '00000000-0000-4000-8000-000000000002',
    versionNumber: 1,
    assignmentVersion: 1,
    environment: 'test',
    channelId: 'ch_test_1',
    experimentId: null,
    variantId: null,
    manifest: { version: 1, screens: [], theme: null },
    mediaMap: {},
    integrations: {},
  }) as unknown as SdkResolveResponse;

describe('manifestResolveCache', () => {
  beforeEach(() => {
    clearManifestResolveCacheMemoryForTests();
    localStorage.clear();
  });

  it('normalizes trailing slashes on api base url', () => {
    expect(manifestResolveCacheKey('https://api.test/', 'ob_pk_x', 'ch_abc')).toBe(
      manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc'),
    );
  });

  it('includes locale in the cache key', () => {
    const en = manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc', 'en');
    const fr = manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc', 'fr');
    expect(en).not.toBe(fr);
    expect(manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc')).toBe(
      manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc', ''),
    );
  });

  it('shouldSendManifestConditional requires etag and body', () => {
    expect(shouldSendManifestConditional({ etag: '', body: sampleBody(), cachedAt: 0 })).toBe(
      false,
    );
    expect(
      shouldSendManifestConditional({ etag: '"1-uuid"', body: sampleBody(), cachedAt: 0 }),
    ).toBe(true);
  });

  it('persists and loads from localStorage', () => {
    const key = manifestResolveCacheKey('https://api.test', 'ob_pk', 'ch_1');
    const entry = { etag: '"3-uuid"', body: sampleBody(), cachedAt: 1 };
    saveManifestResolveCache(key, entry);
    clearManifestResolveCacheMemoryForTests();
    const loaded = loadManifestResolveCache(key);
    expect(loaded?.etag).toBe('"3-uuid"');
    expect(loaded?.body.flowId).toBe(entry.body.flowId);
  });

  it('peek reads memory without touching storage', () => {
    const key = manifestResolveCacheKey('https://api.test', 'ob_pk', 'ch_peek');
    saveManifestResolveCache(key, { etag: '"1-a"', body: sampleBody(), cachedAt: 0 });
    expect(peekManifestResolveCache(key)?.etag).toBe('"1-a"');
  });

  it('parseManifestResolveCacheKey round-trips manifestResolveCacheKey', () => {
    const key = manifestResolveCacheKey('https://api.test', 'ob_pk_x', 'ch_abc', 'en');
    expect(parseManifestResolveCacheKey(key)).toEqual({
      apiBaseUrl: 'https://api.test',
      publishableKey: 'ob_pk_x',
      channelId: 'ch_abc',
      locale: 'en',
    });
  });
});

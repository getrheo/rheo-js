import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearManifestResolveCacheMemoryForTests,
  loadManifestResolveCache,
  manifestResolveCacheKey,
} from './manifestResolveCache.js';
import { clearCodeResolveCacheForTests, loadCodeResolveCache } from './channel.js';
import { resolveAllManifests } from './resolveAllManifests.js';

describe('resolveAllManifests', () => {
  beforeEach(() => {
    clearManifestResolveCacheMemoryForTests();
    clearCodeResolveCacheForTests();
    localStorage.clear();
  });

  it('caches flow and code channels from resolve-all', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        channels: [
          {
            kind: 'flow',
            flowId: '00000000-0000-4000-8000-000000000001',
            versionId: '00000000-0000-4000-8000-0000000000aa',
            versionNumber: 1,
            assignmentVersion: 3,
            environment: 'test',
            channelId: 'ch_a',
            experimentId: null,
            variantId: null,
            manifest: { version: 1, screens: [], theme: null },
            mediaMap: {},
            integrations: {},
          },
          {
            kind: 'code',
            channelId: 'ch_b',
            environment: 'test',
            assignmentVersion: 7,
            experiment: null,
            variantKey: 'control',
            parameters: { flag: true },
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const config = {
      publishableKey: 'ob_pk_test',
      apiBaseUrl: 'https://api.test',
      userId: 'user-1',
      locale: 'en',
      fetcher: fetchMock,
    };

    const flows = await resolveAllManifests({
      apiBaseUrl: 'https://api.test',
      publishableKey: 'ob_pk_test',
      config,
      fetcher: fetchMock,
    });

    expect(flows).toHaveLength(1);
    const a = loadManifestResolveCache(
      manifestResolveCacheKey('https://api.test', 'ob_pk_test', 'ch_a', 'en'),
    );
    expect(a?.etag).toBe('"3-00000000-0000-4000-8000-0000000000aa"');
    const b = loadCodeResolveCache(
      manifestResolveCacheKey('https://api.test', 'ob_pk_test', 'ch_b', 'en'),
    );
    expect(b?.body.channelId).toBe('ch_b');
  });
});

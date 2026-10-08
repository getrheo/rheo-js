import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SdkResolveResponse } from '@getrheo/contracts';
import {
  clearManifestResolveCacheMemoryForTests,
  manifestResolveCacheKey,
  saveManifestResolveCache,
} from './manifestResolveCache.js';
import { resolveManifest } from './resolve.js';

const sampleBody = (): SdkResolveResponse =>
  ({
    kind: 'flow',
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

const config = {
  apiBaseUrl: 'https://api.test',
  publishableKey: 'ob_pk_test',
  userId: 'user-1',
  locale: 'en',
} as const;

describe('resolveManifest', () => {
  beforeEach(() => {
    clearManifestResolveCacheMemoryForTests();
    localStorage.clear();
  });

  it('does not send If-None-Match without a cache entry', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(sampleBody(), {
        status: 200,
        headers: { etag: '"1-uuid"' },
      }),
    ) as unknown as typeof fetch;
    await resolveManifest({
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: 'ch_a',
      config: config as never,
      fetcher: fetchMock,
    });
    const init = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['if-none-match']).toBeUndefined();
  });

  it('sends If-None-Match and reuses body on 304', async () => {
    const key = manifestResolveCacheKey(
      config.apiBaseUrl,
      config.publishableKey,
      'ch_b',
      config.locale,
    );
    const body = sampleBody();
    saveManifestResolveCache(key, { etag: '"1-uuid"', body, cachedAt: 0 });

    const fetchMock = vi.fn(async () => new Response(null, { status: 304 })) as unknown as typeof fetch;
    const result = await resolveManifest({
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: 'ch_b',
      config: config as never,
      fetcher: fetchMock,
    });
    const init = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['if-none-match']).toBe('"1-uuid"');
    expect(result.flowId).toBe(body.flowId);
  });

  it('dedupes concurrent resolves for the same channel + locale', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await gate;
      return Response.json(sampleBody(), { status: 200, headers: { etag: '"1-dedupe"' } });
    }) as unknown as typeof fetch;

    const shared = {
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: 'ch_dedupe',
      config: config as never,
      fetcher: fetchMock,
    };
    const p1 = resolveManifest(shared);
    const p2 = resolveManifest(shared);
    release();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect((fetchMock as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(r1.flowId).toBe(r2.flowId);
  });

  it('stores etag and body on 200', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(sampleBody(), {
        status: 200,
        headers: { etag: '"2-uuid"' },
      }),
    ) as unknown as typeof fetch;
    await resolveManifest({
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: 'ch_c',
      config: config as never,
      fetcher: fetchMock,
    });
    const second = vi.fn(async () => new Response(null, { status: 304 })) as unknown as typeof fetch;
    const result = await resolveManifest({
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: 'ch_c',
      config: config as never,
      fetcher: second,
    });
    expect(result.flowId).toBe(sampleBody().flowId);
    const init = (second as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['if-none-match']).toBe('"2-uuid"');
  });
});
